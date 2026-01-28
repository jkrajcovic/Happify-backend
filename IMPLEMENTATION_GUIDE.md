# Happify Backend Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing the Happify backend with Firebase and Gemini AI proxy. We'll use **GitHub flow** (feature branches + pull requests) and track progress in `backend-plan.md`.

## Prerequisites

### Required Tools
- **Firebase CLI**: `npm install -g firebase-tools`
- **GitHub CLI**: `brew install gh` (or download from https://cli.github.com/)
- **Node.js**: v18 or higher (for Cloud Functions)
- **Xcode**: Latest version with Swift Package Manager

### Firebase MCP Server Configuration
The Firebase MCP server is already available. We'll use it for all Firebase operations.

### GitHub Workflow
We'll follow this pattern for each feature:

```bash
# 1. Create feature branch
git checkout -b feature/firebase-setup

# 2. Make changes and commit
git add .
git commit -m "feat: add Firebase authentication service"

# 3. Push and create PR
git push -u origin feature/firebase-setup
gh pr create --title "Add Firebase Authentication" --body "Implements Phase A: Firebase setup with anonymous auth"

# 4. After approval, merge and delete branch
gh pr merge --squash
git checkout main
git pull
git branch -d feature/firebase-setup
```

---

## Phase A: Firebase Setup & Authentication

### Branch: `feature/firebase-setup`

### Step 1: Create Firebase Project

**Using Firebase MCP:**

```markdown
Request: "Use Firebase MCP to check environment and login status"
```

**Expected Actions:**
1. Check Firebase environment with `firebase_get_environment`
2. If not logged in, use `firebase_login` to authenticate
3. Create new Firebase project with `firebase_create_project`:
   - Project ID: `happify-2-prod` (or your preference)
   - Display name: "Happify 2 Production"

### Step 2: Initialize Firebase in Project Directory

**Using Firebase MCP:**

```markdown
Request: "Initialize Firebase with Firestore, Authentication, Remote Config, Storage, and FCM"
```

**Expected Actions:**
1. Set project directory with `firebase_update_environment`
2. Initialize Firebase features with `firebase_init`:
   ```json
   {
     "features": {
       "firestore": {
         "location_id": "us-east1",
         "database_id": "(default)",
         "rules_filename": "firestore.rules"
       }
     }
   }
   ```

### Step 3: Create Firebase Configuration Files

**File: `firebase.json`** (created by init)
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint"
    ]
  },
  "remoteconfig": {
    "template": "remoteconfig.template.json"
  }
}
```

**File: `.firebaserc`**
```json
{
  "projects": {
    "default": "happify-2-prod"
  }
}
```

### Step 4: Set Up Firestore Security Rules

**File: `firestore.rules`**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function: Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function: Check if user owns the document
    function isOwner(userID) {
      return isAuthenticated() && request.auth.uid == userID;
    }

    // User data - only accessible by the user themselves
    match /users/{userID} {
      allow read, write: if isOwner(userID);

      // Mood entries subcollection
      match /moodEntries/{entryID} {
        allow read, write: if isOwner(userID);
      }

      // AI quote cache (read by user, written by Cloud Functions)
      match /aiQuoteCache/{cacheKey} {
        allow read: if isOwner(userID);
        allow write: if false; // Only Cloud Functions can write
      }
    }

    // Global configuration (read-only for authenticated users)
    match /globalConfig/{document} {
      allow read: if isAuthenticated();
      allow write: if false; // Only admins via console
    }

    // Admin stats (read-only for Cloud Functions)
    match /adminStats/{document} {
      allow read, write: if false; // Only Cloud Functions
    }
  }
}
```

### Step 5: Create iOS Firebase Service Files

**File: `Core/Services/FirebaseAuthService.swift`**
```swift
import Foundation
import FirebaseAuth

@MainActor
class FirebaseAuthService: ObservableObject {
    static let shared = FirebaseAuthService()

    @Published var currentUser: User?
    @Published var isAuthenticated = false

    private init() {
        // Listen for auth state changes
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.currentUser = user
                self?.isAuthenticated = user != nil
            }
        }
    }

    /// Sign in anonymously (happens automatically on first app launch)
    func signInAnonymously() async throws {
        let result = try await Auth.auth().signInAnonymously()
        print("✅ Signed in anonymously with UID: \(result.user.uid)")
    }

    /// Get current user ID (nil if not authenticated)
    var currentUserID: String? {
        return currentUser?.uid
    }

    /// Sign out (mainly for testing)
    func signOut() throws {
        try Auth.auth().signOut()
        print("✅ Signed out successfully")
    }
}
```

**File: `App/Happify_2App.swift` (modifications)**
```swift
import SwiftUI
import FirebaseCore

@main
struct Happify_2App: App {

    init() {
        // Configure Firebase
        FirebaseApp.configure()

        // Sign in anonymously on first launch
        Task {
            do {
                try await FirebaseAuthService.shared.signInAnonymously()
            } catch {
                print("❌ Firebase auth error: \(error.localizedDescription)")
            }
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

### Step 6: Update .gitignore

Add Firebase-specific files to `.gitignore`:
```gitignore
# Firebase
GoogleService-Info.plist
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Cloud Functions
functions/node_modules/
functions/.env
functions/lib/

# Secrets
*.plist
.env
```

### Step 7: Track Progress

Update `backend-plan.md`:
```markdown
### Phase A: Firebase Setup (Week 1)
**Goal:** Infrastructure without breaking changes

- [x] Create Firebase project in console
- [x] Add Firebase SDK via SPM
- [x] Download `GoogleService-Info.plist` (add to .gitignore)
- [x] Initialize Firebase in `Happify_2App.swift`
- [x] Enable Anonymous Auth
- [x] Create Firestore database with security rules
- [x] Test: Write test document to Firestore
```

### Step 8: Create Pull Request

```bash
git add .
git commit -m "feat: add Firebase authentication and Firestore setup

- Initialize Firebase with anonymous auth
- Create Firestore security rules
- Add FirebaseAuthService for user management
- Configure project for Firebase SDK

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push -u origin feature/firebase-setup

gh pr create --title "Phase A: Firebase Setup & Authentication" --body "$(cat <<'EOF'
## Summary
- Initialize Firebase project with Firestore and Authentication
- Add anonymous authentication service
- Configure security rules for user data protection
- Set up .gitignore for Firebase files

## Changes
- Added `FirebaseAuthService.swift` for anonymous authentication
- Modified `Happify_2App.swift` to initialize Firebase on launch
- Created `firestore.rules` with security rules
- Updated `.gitignore` for Firebase files

## Testing
- [ ] Verify Firebase initializes on app launch
- [ ] Confirm anonymous auth creates user UID
- [ ] Test Firestore security rules in Firebase Console

## Phase A Checklist
- [x] Create Firebase project in console
- [x] Add Firebase SDK via SPM
- [x] Initialize Firebase in app
- [x] Enable Anonymous Auth
- [x] Create Firestore database with security rules

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase B: Cloud Functions AI Proxy

### Branch: `feature/ai-proxy`

This is the **critical component** for secure AI access. The iOS app will NEVER call Gemini API directly.

### Architecture

```
iOS App → HTTPS Callable Function → Gemini API
         (with rate limiting & caching)
```

### Step 1: Initialize Cloud Functions

```bash
cd functions
npm init -y
npm install firebase-functions@latest firebase-admin@latest @google/generative-ai
npm install --save-dev typescript @types/node
```

**File: `functions/package.json`**
```json
{
  "name": "happify-cloud-functions",
  "version": "1.0.0",
  "engines": {
    "node": "18"
  },
  "scripts": {
    "lint": "eslint .",
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-functions": "^5.0.0",
    "firebase-admin": "^12.0.0",
    "@google/generative-ai": "^0.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0"
  }
}
```

**File: `functions/tsconfig.json`**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "lib",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### Step 2: Create Gemini AI Proxy Function

**File: `functions/src/index.ts`**
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Generate personalized quote via Gemini AI
 * HTTPS Callable function (secure, authenticated)
 */
export const generatePersonalizedQuote = functions.https.onCall(
  async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const userId = context.auth.uid;
    const { mood, expectations, timeOfDay } = data;

    // Validate input
    if (!mood || !expectations || !Array.isArray(expectations)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: mood, expectations'
      );
    }

    try {
      // Step 1: Check user's daily quota (5 AI quotes per day)
      const quotaCheck = await checkUserQuota(userId);
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: 'daily_quota_exceeded',
          quotaRemaining: 0,
          message: 'You\'ve reached your daily AI quote limit. Try again tomorrow!'
        };
      }

      // Step 2: Check cache first (90% hit rate target)
      const cacheKey = generateCacheKey(mood, expectations, timeOfDay);
      const cachedQuote = await checkCache(userId, cacheKey);

      if (cachedQuote) {
        console.log('✅ Cache hit for user:', userId);
        return {
          success: true,
          quote: cachedQuote,
          source: 'cache',
          quotaRemaining: quotaCheck.remaining
        };
      }

      // Step 3: Check global budget cap ($20/month)
      const budgetOk = await checkGlobalBudget();
      if (!budgetOk) {
        console.warn('⚠️ Global budget exceeded, using fallback');
        return {
          success: false,
          error: 'budget_exceeded',
          message: 'AI service temporarily unavailable. Please try static quotes.'
        };
      }

      // Step 4: Generate AI quote via Gemini
      const prompt = buildQuotePrompt(mood, expectations, timeOfDay);
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse JSON response from Gemini
      const quoteData = JSON.parse(response);

      const quote = {
        text: quoteData.text,
        author: quoteData.author || 'Anonymous',
        categories: quoteData.categories || ['motivation'],
        source: 'ai_generated',
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Step 5: Save to cache (30-day TTL)
      await saveToCache(userId, cacheKey, quote);

      // Step 6: Update usage stats
      await updateUsageStats(userId);
      await updateGlobalStats();

      console.log('✅ Generated AI quote for user:', userId);

      return {
        success: true,
        quote: quote,
        source: 'ai_generated',
        cacheHit: false,
        quotaRemaining: quotaCheck.remaining - 1
      };

    } catch (error) {
      console.error('❌ Error generating quote:', error);

      // Return graceful error (client will fallback to static quotes)
      return {
        success: false,
        error: 'generation_failed',
        message: 'AI service temporarily unavailable'
      };
    }
  }
);

/**
 * Helper: Build Gemini prompt
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

IMPORTANT: Return ONLY valid JSON, no additional text.`;
}

/**
 * Helper: Check user's daily quota (5 AI quotes per day)
 */
async function checkUserQuota(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const quotaRef = db.collection('users').doc(userId).collection('quotaTracking').doc(today);

  const quotaDoc = await quotaRef.get();
  const currentCount = quotaDoc.exists ? quotaDoc.data()?.count || 0 : 0;

  const DAILY_LIMIT = 5;

  if (currentCount >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: DAILY_LIMIT - currentCount };
}

/**
 * Helper: Generate cache key from parameters
 */
function generateCacheKey(mood: string, expectations: string[], timeOfDay: string): string {
  const sortedExpectations = expectations.sort().join('_');
  return `${mood}_${sortedExpectations}_${timeOfDay}`.toLowerCase();
}

/**
 * Helper: Check cache for existing quote
 */
async function checkCache(userId: string, cacheKey: string): Promise<any | null> {
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
        source: 'cache'
      };
    }
  }

  return null;
}

/**
 * Helper: Save quote to cache
 */
async function saveToCache(userId: string, cacheKey: string, quote: any): Promise<void> {
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
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
  });
}

/**
 * Helper: Update user usage stats
 */
async function updateUsageStats(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const quotaRef = db.collection('users').doc(userId).collection('quotaTracking').doc(today);

  await quotaRef.set(
    {
      count: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

/**
 * Helper: Check global budget cap ($20/month)
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
 * Helper: Update global usage stats
 */
async function updateGlobalStats(): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgetRef = db.collection('adminStats').doc('geminiUsage');

  const COST_PER_REQUEST = 0.00002; // ~$0.00002 per quote (250 tokens)

  await budgetRef.set(
    {
      [currentMonth]: {
        requests: admin.firestore.FieldValue.increment(1),
        estimatedCost: admin.firestore.FieldValue.increment(COST_PER_REQUEST),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }
    },
    { merge: true }
  );
}

/**
 * Scheduled function: Send personalized notifications
 * Runs every minute to check for users whose notification time matches
 */
export const sendPersonalizedNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(`🔔 Checking notifications for ${currentHour}:${currentMinute}`);

    // Query users whose notification time matches current time
    const usersSnapshot = await db.collection('users')
      .where('profile.notificationHour', '==', currentHour)
      .where('profile.notificationMinute', '==', currentMinute)
      .get();

    if (usersSnapshot.empty) {
      console.log('No users to notify at this time');
      return null;
    }

    const notifications: Promise<void>[] = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const fcmToken = userData.profile?.fcmToken;

      if (fcmToken) {
        notifications.push(sendNotificationToUser(userDoc.id, fcmToken, userData));
      }
    });

    await Promise.allSettled(notifications);

    console.log(`✅ Sent ${notifications.length} notifications`);
    return null;
  });

/**
 * Helper: Send FCM notification to user
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
        body: message
      },
      data: {
        type: 'daily_reminder',
        userId: userId
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    });

    console.log(`✅ Sent notification to user: ${userId}`);

  } catch (error) {
    console.error(`❌ Failed to send notification to user ${userId}:`, error);
  }
}

/**
 * Helper: Generate AI notification message
 */
async function generateNotificationMessage(userData: any): Promise<string | null> {
  try {
    const expectations = userData.profile?.selectedExpectations || [];

    const prompt = `Generate a gentle, encouraging notification message (max 10 words) to remind someone to check their daily mood.

Context:
- User focuses on: ${expectations.join(', ')}

Examples:
- "How's your heart feeling today?"
- "Time to check in with yourself"
- "Your daily moment of reflection awaits"

Return only the message text, no quotes or extra formatting.`;

    const result = await model.generateContent(prompt);
    const message = result.response.text().trim().replace(/['"]/g, '');

    return message;

  } catch (error) {
    console.error('Failed to generate AI notification message:', error);
    return null;
  }
}
```

### Step 3: Configure Gemini API Key

```bash
# Set Gemini API key (get from Google AI Studio)
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

### Step 4: Create iOS Service to Call Cloud Functions

**File: `Core/Services/GeminiService.swift`**
```swift
import Foundation
import FirebaseFunctions

@MainActor
class GeminiService: ObservableObject {
    static let shared = GeminiService()
    private let functions = Functions.functions()

    private init() {}

    /// Generate personalized quote via Cloud Function (AI proxy)
    func generatePersonalizedQuote(
        mood: String,
        expectations: [String],
        timeOfDay: String
    ) async throws -> Quote? {

        let callable = functions.httpsCallable("generatePersonalizedQuote")

        let data: [String: Any] = [
            "mood": mood,
            "expectations": expectations,
            "timeOfDay": timeOfDay
        ]

        do {
            let result = try await callable.call(data)

            guard let response = result.data as? [String: Any],
                  let success = response["success"] as? Bool,
                  success == true,
                  let quoteData = response["quote"] as? [String: Any],
                  let text = quoteData["text"] as? String,
                  let author = quoteData["author"] as? String else {

                // Handle quota exceeded or other errors
                if let error = response["error"] as? String {
                    print("⚠️ AI quote generation failed: \(error)")
                }
                return nil
            }

            let categories = quoteData["categories"] as? [String] ?? ["motivation"]
            let source = quoteData["source"] as? String ?? "ai_generated"

            let quote = Quote(
                text: text,
                author: author,
                categories: categories,
                source: source
            )

            print("✅ Received AI quote (source: \(source))")
            return quote

        } catch {
            print("❌ Cloud Function error: \(error.localizedDescription)")
            throw error
        }
    }
}

struct Quote: Codable {
    let text: String
    let author: String
    let categories: [String]
    let source: String
}
```

### Step 5: Deploy Cloud Functions

```bash
# Test locally first
cd functions
npm run serve

# Deploy to production
firebase deploy --only functions
```

### Step 6: Track Progress

Update `backend-plan.md`:
```markdown
### Phase E: Gemini AI Integration (Week 6-7)
**Goal:** AI-generated quotes

- [x] Enable Gemini API in Google Cloud Console
- [x] Create API key (restrict to Cloud Functions)
- [x] Deploy Cloud Function `generatePersonalizedQuote`
- [x] Implement 3-level caching
- [x] Add rate limiting and budget tracking
- [ ] Modify `QuoteService` to call Gemini as last resort
- [ ] Test: Generate AI quote, verify caching works
- [ ] Monitor costs daily
```

### Step 7: Create Pull Request

```bash
git add .
git commit -m "feat: add Gemini AI proxy via Cloud Functions

- Create Cloud Functions as secure AI proxy
- Implement rate limiting (5 quotes/day per user)
- Add 3-level caching strategy (90% hit rate target)
- Configure budget cap ($20/month)
- Add GeminiService for iOS to call Cloud Functions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push -u origin feature/ai-proxy

gh pr create --title "Phase E: Gemini AI Proxy via Cloud Functions" --body "$(cat <<'EOF'
## Summary
- Implement secure AI proxy using Cloud Functions
- Add rate limiting and budget controls
- Implement caching strategy for cost optimization

## Changes
- Created `functions/src/index.ts` with Gemini AI proxy
- Added `GeminiService.swift` for iOS integration
- Configured rate limiting (5 AI quotes/day per user)
- Implemented 3-level cache (local, Firestore, global)
- Added budget cap ($20/month) with graceful fallbacks

## Security
- ✅ API key stored in Cloud Functions config (not in iOS app)
- ✅ Authenticated HTTPS callable functions
- ✅ User can only access their own cache
- ✅ Rate limiting prevents abuse

## Cost Optimization
- ✅ Target 90% cache hit rate
- ✅ 5 AI quotes/day per user maximum
- ✅ $20/month hard cap with auto-fallback
- ✅ Estimated cost: $0-1/month for 1,000 users

## Testing
- [ ] Test AI quote generation
- [ ] Verify caching works (same parameters return cached quote)
- [ ] Test quota limits (exceed 5/day)
- [ ] Test budget cap (simulate $20 exceeded)
- [ ] Monitor costs in Firebase Console

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase C: Remote Config for Quotes

### Branch: `feature/remote-config`

### Step 1: Prepare Remote Config Template

**File: `remoteconfig.template.json`**
```json
{
  "parameters": {
    "quotes_database": {
      "defaultValue": {
        "value": "[]"
      },
      "description": "200+ motivational quotes organized by categories"
    },
    "fallback_notification_messages": {
      "defaultValue": {
        "value": "[\"Time for your daily mood check ✨\", \"How's your heart feeling today?\"]"
      },
      "description": "Fallback notification messages when AI is unavailable"
    },
    "feature_ai_quotes_enabled": {
      "defaultValue": {
        "value": "true"
      },
      "description": "Feature flag to enable/disable AI quote generation"
    }
  }
}
```

### Step 2: Upload Quotes to Remote Config

Use Firebase Console or CLI to upload 200+ quotes. Example structure:

```json
[
  {
    "text": "The only way out is through.",
    "author": "Robert Frost",
    "categories": ["resilience", "courage"],
    "moods": ["sad", "anxious"]
  },
  {
    "text": "Joy is not in things; it is in us.",
    "author": "Richard Wagner",
    "categories": ["happiness", "gratitude"],
    "moods": ["happy", "grateful"]
  }
]
```

### Step 3: Create Remote Config Service

**File: `Core/Services/RemoteConfigService.swift`**
```swift
import Foundation
import FirebaseRemoteConfig

@MainActor
class RemoteConfigService: ObservableObject {
    static let shared = RemoteConfigService()
    private let remoteConfig = RemoteConfig.remoteConfig()

    @Published var quotesDatabase: [Quote] = []
    @Published var aiQuotesEnabled: Bool = true

    private init() {
        configureRemoteConfig()
    }

    private func configureRemoteConfig() {
        let settings = RemoteConfigSettings()
        settings.minimumFetchInterval = 43200 // 12 hours
        remoteConfig.configSettings = settings

        // Set default values
        remoteConfig.setDefaults([
            "quotes_database": "[]" as NSString,
            "feature_ai_quotes_enabled": true as NSNumber
        ])
    }

    /// Fetch latest Remote Config values
    func fetchAndActivate() async throws {
        let status = try await remoteConfig.fetchAndActivate()

        switch status {
        case .successFetchedFromRemote:
            print("✅ Remote Config fetched from server")
        case .successUsingPreFetchedData:
            print("✅ Remote Config using cached data")
        default:
            print("⚠️ Remote Config status: \(status)")
        }

        // Parse quotes
        if let quotesJSON = remoteConfig["quotes_database"].stringValue,
           let data = quotesJSON.data(using: .utf8) {
            let decoder = JSONDecoder()
            quotesDatabase = try decoder.decode([Quote].self, from: data)
            print("✅ Loaded \(quotesDatabase.count) quotes from Remote Config")
        }

        // Update feature flags
        aiQuotesEnabled = remoteConfig["feature_ai_quotes_enabled"].boolValue
    }

    /// Get quotes matching mood and expectations
    func getQuotes(for mood: String, expectations: [String]) -> [Quote] {
        return quotesDatabase.filter { quote in
            // Match mood
            let moodMatch = quote.moods?.contains(mood.lowercased()) ?? false

            // Match expectations (categories)
            let categoryMatch = !Set(quote.categories).isDisjoint(with: Set(expectations))

            return moodMatch || categoryMatch
        }
    }
}
```

### Step 4: Track Progress & Create PR

Update `backend-plan.md` and create pull request following the same pattern as above.

---

## Progress Tracking System

### Update backend-plan.md After Each Phase

After completing each phase, update the checkboxes in `backend-plan.md`:

```markdown
### Phase A: Firebase Setup (Week 1)
- [x] Create Firebase project in console
- [x] Add Firebase SDK via SPM
...
```

### Commit Message Format

Use conventional commits:
```
feat: add new feature
fix: bug fix
docs: documentation
refactor: code refactoring
test: adding tests
chore: maintenance
```

### Pull Request Template

Every PR should include:
1. **Summary**: What was built
2. **Changes**: Technical details
3. **Testing**: How to verify
4. **Phase Checklist**: Updated checkboxes
5. **Cost Impact**: If applicable

---

## Testing Strategy

### Local Testing with Firebase Emulators

```bash
# Start emulators
firebase emulators:start

# In iOS app, point to emulators (add to FirebaseAuthService)
#if DEBUG
Auth.auth().useEmulator(withHost: "localhost", port: 9099)
Firestore.firestore().useEmulator(withHost: "localhost", port: 8080)
Functions.functions().useEmulator(withHost: "localhost", port: 5001)
#endif
```

### Testing Checklist for Each Phase

**Phase A (Firebase Setup):**
- [ ] App launches without crashes
- [ ] Anonymous auth creates user UID
- [ ] Can write test document to Firestore
- [ ] Firestore Console shows user document

**Phase E (AI Proxy):**
- [ ] Generate AI quote with valid parameters
- [ ] Second call with same parameters returns cached quote
- [ ] Exceed 5 quotes/day triggers quota error
- [ ] Budget cap simulation falls back to static quotes
- [ ] Monitor Firebase Console for cost tracking

---

## Cost Monitoring

### Daily Cost Check

```bash
# Check Firestore usage
firebase firestore:usage

# Check Cloud Functions invocations
firebase functions:log

# Check Gemini API usage in Google Cloud Console
# https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com
```

### Set Up Budget Alerts

In Google Cloud Console:
1. Go to Billing → Budgets & Alerts
2. Create budget: $20/month
3. Set alerts at 50%, 75%, 90%, 100%

---

## Rollback Plan

If anything goes wrong:

```bash
# Rollback Cloud Functions
firebase functions:delete functionName

# Rollback to previous commit
git revert HEAD
git push

# Close PR without merging
gh pr close PR_NUMBER
```

---

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Gemini API Docs**: https://ai.google.dev/docs
- **GitHub CLI**: https://cli.github.com/manual/
- **Swift Package Manager**: https://swift.org/package-manager/

---

## Next Steps

1. **Create GitHub repository** (if not already done)
2. **Enable Firebase MCP server** (already available)
3. **Start with Phase A** (Firebase Setup)
4. **Follow GitHub flow** for each feature
5. **Update progress** in backend-plan.md
6. **Monitor costs** daily during initial rollout

---

## Questions?

If you need clarification on any step:
1. Check the backend-plan.md for detailed architecture
2. Review Firebase MCP tool documentation
3. Ask Claude for specific implementation help

Happy building! 🚀
