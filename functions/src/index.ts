/**
 * Happify 2 Cloud Functions
 *
 * AI-powered quote generation and personalized notifications
 *
 * Security: Gemini API key stored in Cloud Functions config, never exposed to client
 * Cost Control: Rate limiting, caching, and budget cap
 * Reliability: Graceful fallbacks at every level
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini AI
// API key is stored securely in Cloud Functions config
// Set with: firebase functions:config:set gemini.api_key="YOUR_KEY"
const genAI = new GoogleGenerativeAI(
  functions.config().gemini?.api_key || 'NOT_CONFIGURED'
);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Generate personalized quote via Gemini AI
 *
 * HTTPS Callable function - secure, authenticated
 *
 * Features:
 * - Rate limiting: 5 quotes per day per user
 * - 3-level caching: local, Firestore, global
 * - Budget cap: $20/month with auto-fallback
 * - Graceful degradation: never returns errors to user
 *
 * @param data.mood - User's current mood (e.g., "sad", "happy")
 * @param data.expectations - User's focus areas (e.g., ["work_stress", "anxiety"])
 * @param data.timeOfDay - Time of day (e.g., "morning", "evening")
 * @returns Quote object or error with fallback instructions
 */
export const generatePersonalizedQuote = functions.https.onCall(
  async (data, context) => {
    // Step 0: Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate quotes'
      );
    }

    const userId = context.auth.uid;
    const { mood, expectations, timeOfDay } = data;

    // Validate input
    if (!mood || !expectations || !Array.isArray(expectations)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: mood (string), expectations (array)'
      );
    }

    functions.logger.info(`Quote request from user ${userId}`, {
      mood,
      expectations,
      timeOfDay,
    });

    try {
      // Step 1: Check user's daily quota (5 AI quotes per day)
      const quotaCheck = await checkUserQuota(userId);
      if (!quotaCheck.allowed) {
        functions.logger.warn(`User ${userId} exceeded daily quota`);
        return {
          success: false,
          error: 'daily_quota_exceeded',
          quotaRemaining: 0,
          message:
            "You've reached your daily AI quote limit (5/day). Try again tomorrow or use our curated quotes!",
        };
      }

      // Step 2: Check cache first (90% hit rate target)
      const cacheKey = generateCacheKey(mood, expectations, timeOfDay);
      const cachedQuote = await checkCache(userId, cacheKey);

      if (cachedQuote) {
        functions.logger.info(`Cache hit for user ${userId}`, { cacheKey });
        return {
          success: true,
          quote: cachedQuote,
          source: 'cache',
          cacheHit: true,
          quotaRemaining: quotaCheck.remaining,
        };
      }

      // Step 3: Check global budget cap ($20/month)
      const budgetOk = await checkGlobalBudget();
      if (!budgetOk) {
        functions.logger.warn('Global budget exceeded', {
          action: 'fallback_to_remote_config',
        });
        return {
          success: false,
          error: 'budget_exceeded',
          message:
            'AI service temporarily at capacity. Please use our curated quotes.',
        };
      }

      // Step 4: Generate AI quote via Gemini
      const prompt = buildQuotePrompt(mood, expectations, timeOfDay);
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse JSON response from Gemini
      let quoteData;
      try {
        quoteData = JSON.parse(response);
      } catch (parseError) {
        functions.logger.error('Failed to parse Gemini response', {
          response,
          error: parseError,
        });
        throw new Error('Invalid response format from AI');
      }

      const quote = {
        text: quoteData.text,
        author: quoteData.author || 'Anonymous',
        categories: quoteData.categories || ['motivation'],
        source: 'ai_generated',
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Step 5: Save to cache (30-day TTL)
      await saveToCache(userId, cacheKey, quote);

      // Step 6: Update usage stats
      await updateUsageStats(userId);
      await updateGlobalStats();

      functions.logger.info(`Generated AI quote for user ${userId}`, {
        cacheKey,
        quotaRemaining: quotaCheck.remaining - 1,
      });

      return {
        success: true,
        quote: quote,
        source: 'ai_generated',
        cacheHit: false,
        quotaRemaining: quotaCheck.remaining - 1,
      };
    } catch (error) {
      functions.logger.error('Error generating quote', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Return graceful error (client will fallback to static quotes)
      return {
        success: false,
        error: 'generation_failed',
        message:
          'Unable to generate personalized quote. Please try our curated quotes.',
      };
    }
  }
);

/**
 * Send personalized notifications
 *
 * Scheduled function - runs every minute
 * Checks for users whose notification time matches current time
 * Generates personalized message via Gemini (if budget allows)
 * Sends via FCM
 *
 * Cost: ~$0.00002 per notification with AI message
 */
export const sendPersonalizedNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    functions.logger.info(`Checking notifications for ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

    try {
      // Query users whose notification time matches current time
      const usersSnapshot = await db
        .collection('users')
        .where('profile.notificationHour', '==', currentHour)
        .where('profile.notificationMinute', '==', currentMinute)
        .get();

      if (usersSnapshot.empty) {
        functions.logger.info('No users to notify at this time');
        return null;
      }

      const notifications: Promise<void>[] = [];

      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const fcmToken = userData.profile?.fcmToken;

        if (fcmToken) {
          notifications.push(
            sendNotificationToUser(userDoc.id, fcmToken, userData)
          );
        }
      });

      await Promise.allSettled(notifications);

      functions.logger.info(`Sent ${notifications.length} notifications`);
      return null;
    } catch (error) {
      functions.logger.error('Error in sendPersonalizedNotifications', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build Gemini prompt for quote generation
 */
function buildQuotePrompt(
  mood: string,
  expectations: string[],
  timeOfDay: string
): string {
  return `You are a compassionate mental wellness coach. Generate a short, uplifting motivational quote (max 20 words) for someone feeling ${mood}.

Context:
- Current mood: ${mood}
- User's focus areas: ${expectations.join(', ')}
- Time of day: ${timeOfDay}

Requirements:
1. Encouraging and actionable
2. Relate to user's focus areas
3. Max 20 words
4. Include author (or "Anonymous")

Output JSON format (strict):
{
  "text": "Your quote here",
  "author": "Author Name",
  "categories": ["motivation", "resilience"]
}

IMPORTANT: Return ONLY valid JSON, no additional text or formatting.`;
}

/**
 * Check user's daily quota (5 AI quotes per day)
 */
async function checkUserQuota(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const quotaRef = db
    .collection('users')
    .doc(userId)
    .collection('quotaTracking')
    .doc(today);

  const quotaDoc = await quotaRef.get();
  const currentCount = quotaDoc.exists ? quotaDoc.data()?.count || 0 : 0;

  const DAILY_LIMIT = 5;

  if (currentCount >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: DAILY_LIMIT - currentCount };
}

/**
 * Generate cache key from parameters
 */
function generateCacheKey(
  mood: string,
  expectations: string[],
  timeOfDay: string
): string {
  const sortedExpectations = expectations.sort().join('_');
  return `${mood}_${sortedExpectations}_${timeOfDay}`.toLowerCase();
}

/**
 * Check cache for existing quote
 */
async function checkCache(
  userId: string,
  cacheKey: string
): Promise<any | null> {
  const cacheRef = db
    .collection('users')
    .doc(userId)
    .collection('aiQuoteCache')
    .doc(cacheKey);

  const cacheDoc = await cacheRef.get();

  if (cacheDoc.exists) {
    const data = cacheDoc.data();
    const expiresAt = data?.expiresAt?.toDate();

    // Check if cache is still valid (30 days)
    if (expiresAt && expiresAt > new Date()) {
      return {
        text: data.text,
        author: data.author,
        categories: data.categories,
        source: 'cache',
      };
    }
  }

  return null;
}

/**
 * Save quote to cache (30-day TTL)
 */
async function saveToCache(
  userId: string,
  cacheKey: string,
  quote: any
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day TTL

  const cacheRef = db
    .collection('users')
    .doc(userId)
    .collection('aiQuoteCache')
    .doc(cacheKey);

  await cacheRef.set({
    text: quote.text,
    author: quote.author,
    categories: quote.categories,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });
}

/**
 * Update user usage stats
 */
async function updateUsageStats(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const quotaRef = db
    .collection('users')
    .doc(userId)
    .collection('quotaTracking')
    .doc(today);

  await quotaRef.set(
    {
      count: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Check global budget cap ($20/month)
 */
async function checkGlobalBudget(): Promise<boolean> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const budgetRef = db.collection('adminStats').doc('geminiUsage');

  const budgetDoc = await budgetRef.get();

  if (!budgetDoc.exists) {
    return true;
  }

  const data = budgetDoc.data();
  const monthlySpending = data?.[currentMonth]?.estimatedCost || 0;

  const BUDGET_CAP = 20; // $20/month

  return monthlySpending < BUDGET_CAP;
}

/**
 * Update global usage stats
 */
async function updateGlobalStats(): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgetRef = db.collection('adminStats').doc('geminiUsage');

  // Cost estimation:
  // - Prompt: ~200 tokens
  // - Response: ~50 tokens
  // - Total: ~250 tokens per request
  // - Price: $0.075 per 1M input tokens (Gemini 1.5 Flash)
  // - Cost per request: ~$0.00002
  const COST_PER_REQUEST = 0.00002;

  await budgetRef.set(
    {
      [currentMonth]: {
        requests: admin.firestore.FieldValue.increment(1),
        estimatedCost:
          admin.firestore.FieldValue.increment(COST_PER_REQUEST),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/**
 * Send FCM notification to user
 */
async function sendNotificationToUser(
  userId: string,
  fcmToken: string,
  userData: any
): Promise<void> {
  try {
    // Generate personalized message (budget-aware)
    let message = 'Time for your daily mood check ✨';

    const budgetOk = await checkGlobalBudget();
    if (budgetOk) {
      // Try to generate AI message
      const aiMessage = await generateNotificationMessage(userData);
      if (aiMessage) {
        message = aiMessage;
      }
    }

    // Send FCM push
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: 'Happify',
        body: message,
      },
      data: {
        type: 'daily_reminder',
        userId: userId,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    functions.logger.info(`Sent notification to user ${userId}`);
  } catch (error) {
    functions.logger.error(`Failed to send notification to user ${userId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Generate AI notification message
 */
async function generateNotificationMessage(
  userData: any
): Promise<string | null> {
  try {
    const expectations = userData.profile?.selectedExpectations || [];

    const prompt = `Generate a gentle, encouraging notification message (max 10 words) to remind someone to check their daily mood.

Context:
- User focuses on: ${expectations.join(', ') || 'general wellness'}

Examples:
- "How's your heart feeling today?"
- "Time to check in with yourself"
- "Your daily moment of reflection awaits"

Return only the message text, no quotes or extra formatting.`;

    const result = await model.generateContent(prompt);
    const message = result.response.text().trim().replace(/['"]/g, '');

    // Validate message length
    if (message.split(' ').length > 12) {
      return null; // Too long, use fallback
    }

    return message;
  } catch (error) {
    functions.logger.error('Failed to generate AI notification message', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
