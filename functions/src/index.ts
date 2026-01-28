/**
 * Happify 2 Cloud Functions
 *
 * AI-powered contextual motivational messages and personalized notifications
 *
 * NEW ARCHITECTURE:
 * - Generate fresh AI message on EVERY mood entry (no cache-first logic)
 * - Richer context: long-term emotional trend, yesterday's mood/notes
 * - Cache result for 24 hours (for display purposes only)
 * - More empathetic, personal responses
 *
 * Security: Gemini API key stored in Cloud Functions config, never exposed to client
 * Cost Control: Budget cap ($20/month) with graceful fallback
 * Reliability: Graceful fallbacks to static quotes
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
 * Generate personalized motivational message via Gemini AI
 *
 * NEW LOGIC: Generates fresh message on EVERY mood entry
 * - No cache-first checking (call AI directly)
 * - Cache result for 24 hours (for display purposes only)
 * - Richer context: long-term emotional trend, yesterday's mood/notes
 * - More empathetic, personal responses
 *
 * HTTPS Callable function - secure, authenticated
 *
 * Features:
 * - Budget cap: $20/month with auto-fallback
 * - Graceful degradation: never returns errors to user
 * - Quota removed: Generate on every mood entry
 *
 * @param data.long_term_state - Long-term emotional trend (e.g., "demotivated", "stable", "improving")
 * @param data.yesterday_mood - Yesterday's mood (e.g., "very good", "good", "neutral", "bad", "very bad")
 * @param data.yesterday_notes - Yesterday's notable events (e.g., "conflict at work", "nothing special")
 * @returns Motivational message object or error with fallback instructions
 */
export const generatePersonalizedQuote = functions.https.onCall(
  async (data, context) => {
    // Step 0: Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate messages'
      );
    }

    const userId = context.auth.uid;
    const { long_term_state, yesterday_mood, yesterday_notes } = data;

    // Validate input
    if (!long_term_state || !yesterday_mood) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: long_term_state (string), yesterday_mood (string)'
      );
    }

    functions.logger.info(`Message request from user ${userId}`, {
      long_term_state,
      yesterday_mood,
      yesterday_notes: yesterday_notes ? 'provided' : 'none',
    });

    try {
      // Step 1: Check global budget cap ($20/month)
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

      // Step 2: Generate AI message via Gemini (NO CACHE CHECK - always generate fresh)
      const prompt = buildMotivationalPrompt(
        long_term_state,
        yesterday_mood,
        yesterday_notes || 'nothing special'
      );

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();

      // Response is plain text (not JSON), just clean it up
      const message = {
        text: response,
        source: 'ai_generated',
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Step 3: Save to cache (24-hour TTL for display purposes)
      const cacheKey = generateDailyCacheKey(userId);
      await saveToDailyCache(userId, cacheKey, message);

      // Step 4: Update usage stats
      await updateUsageStats(userId);
      await updateGlobalStats();

      functions.logger.info(`Generated AI message for user ${userId}`, {
        long_term_state,
        yesterday_mood,
      });

      return {
        success: true,
        message: message,
        source: 'ai_generated',
      };
    } catch (error) {
      functions.logger.error('Error generating message', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Return graceful error (client will fallback to static quotes)
      return {
        success: false,
        error: 'generation_failed',
        message:
          'Unable to generate personalized message. Please try our curated quotes.',
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
  .onRun(async (_context) => {
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
 * Build Gemini prompt for motivational message generation
 * NEW: Empathetic morning messages based on emotional context
 */
function buildMotivationalPrompt(
  long_term_state: string,
  yesterday_mood: string,
  yesterday_notes: string
): string {
  return `User emotional context:

Long-term emotional trend:
${long_term_state}
(e.g. demotivated, burned out, stable, improving, overwhelmed, confident)

Yesterday's mood:
${yesterday_mood}
(e.g. very good, good, neutral, bad, very bad)

Yesterday's notable events or notes:
${yesterday_notes}
(e.g. conflict at work, feeling ignored by boss, productive day, nothing special)

Task:
Generate a short motivational message for today that:
- Acknowledges the user's emotional context with empathy
- Offers encouragement or calm reassurance
- Optionally includes a short inspirational quote (only if it fits naturally)
- Feels personal, not generic
- Is suitable as a morning message in a mobile app

Constraints:
- Max 5 sentences
- No advice, no instructions, no diagnosis
- No repeating raw labels like "you are demotivated"
- No emojis unless very subtle (max 1)

Output only the final message text.`;
}

/**
 * Generate daily cache key (one message per day)
 * Cache key based on date only (not mood/expectations)
 */
function generateDailyCacheKey(_userId: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `daily_message_${today}`;
}

/**
 * Save message to daily cache (24-hour TTL)
 * Used for display purposes (user can see same message if they revisit today)
 */
async function saveToDailyCache(
  userId: string,
  cacheKey: string,
  message: any
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration

  await db
    .collection('users')
    .doc(userId)
    .collection('aiMessageCache')
    .doc(cacheKey)
    .set({
      ...message,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  functions.logger.info('Saved message to 24h cache', {
    userId,
    cacheKey,
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * Update user's AI usage stats
 * Track total AI messages generated (no quota limit in new logic)
 */
async function updateUsageStats(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const statsRef = db
    .collection('users')
    .doc(userId)
    .collection('aiStats')
    .doc(today);

  await statsRef.set(
    {
      messagesGenerated: admin.firestore.FieldValue.increment(1),
      lastGenerated: admin.firestore.FieldValue.serverTimestamp(),
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
