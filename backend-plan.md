# Happify-2 Backend & AI Integration Plan

## 📋 Implementation Status

**Current Phase:** Planning Complete ✅
**Next Phase:** Phase A - Firebase Setup
**Implementation Guide:** See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for step-by-step instructions

### Quick Links
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Detailed step-by-step instructions
- [GitHub Workflow](#github-workflow) - Branch and PR strategy
- [Progress Tracking](#implementation-progress) - Current status of all phases

---

## Executive Summary

Transform Happify-2 from local-only to cloud-powered with **Firebase + Google AI (Gemini)** while maintaining minimal cost ($0-20/month budget) and offline-first architecture.

**Target Capabilities:**
- ✅ Server-driven push notifications with personalized messages
- ✅ AI-generated motivational quotes tailored to mood + user needs
- ✅ Cloud backup and multi-device sync (future)
- ✅ Real-time analytics and insights
- ✅ Dynamic content updates without app releases

**Cost Projections:**
- 100 users: **$0/month** (free tiers)
- 1,000 users: **$0-1/month**
- 10,000 users: **$8-9/month** (well under $20 budget)

---

## Current Architecture Analysis

### Existing Services (All Local)

**QuoteService** (`Core/Services/QuoteService.swift`)
- 50 static quotes in `quotes.json`
- Smart selection algorithm (mood + 15 user expectations)
- 30-day recency tracking in UserDefaults
- **Limitation:** Static content, will repeat after 50 check-ins

**NotificationService** (`Core/Services/NotificationService.swift`)
- Local UNUserNotificationCenter
- Single daily repeating notification
- Hardcoded message: "Time for your daily mood check ✨"
- **Limitation:** No personalization, no dynamic content

**MoodDataService** (`Core/Services/MoodDataService.swift`)
- Coordinates mood entry creation
- Calls QuoteService for quote assignment
- **Limitation:** No cloud backup, no cross-device sync

**PersistenceController** (`Core/Services/PersistenceController.swift`)
- Temporary UserDefaults storage (planned SwiftData migration)
- **Limitation:** Inefficient, size-limited, no encryption

### Architecture Patterns
- Singleton services with `@MainActor`
- MVVM architecture
- Offline-first design (works without network)
- Clean service separation

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    iOS APP (Swift)                       │
├─────────────────────────────────────────────────────────┤
│  QuoteService  │  MoodDataService  │  NotificationService│
│       ↓               ↓                    ↓             │
│  Local Cache (UserDefaults → SwiftData)                 │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     ┌─────────────────┐   ┌──────────────────┐
     │  FIREBASE SDK   │   │  GOOGLE AI SDK   │
     └────────┬─────────┘   └────────┬─────────┘
              │                      │
   ┌──────────┴─────┐                │
   ▼                ▼                ▼
Firestore    Remote Config    Gemini 1.5 Flash
  FCM         Analytics         (AI Quotes)
  Auth
              │
┌─────────────┴──────────────────────────────┐
│      FIREBASE BACKEND (Google Cloud)       │
│  - Cloud Functions (Node.js)               │
│  - Anonymous Authentication                │
│  - Firestore Database                      │
│  - Remote Config (200+ quotes)             │
│  - Cloud Messaging (FCM)                   │
│  - Analytics Dashboard                     │
└────────────────────────────────────────────┘
```

**Key Principles:**
1. **Offline-first:** All features work without network
2. **Cache-aggressive:** 90% cache hit rate target for AI calls
3. **Graceful degradation:** Local quotes → Remote Config → AI → Hardcoded
4. **Cost-optimized:** Maximize free tiers, smart rate limiting

---

## Firebase Services Integration

### 1. Firebase Authentication (Anonymous)
**Purpose:** User identity for secure data access

**Implementation:**
- Anonymous sign-in on first app launch (no friction)
- Each device gets unique UID
- Future: Link to email/social for multi-device sync

**Cost:** FREE (unlimited users)

**Files to Create:**
- `Core/Services/FirebaseAuthService.swift`

### 2. Cloud Firestore
**Purpose:** Cloud sync for mood entries and user settings

**Schema:**
```
/users/{userID}/
  ├── profile (document)
  │   ├── userName: String
  │   ├── selectedExpectations: [String]
  │   ├── notificationTime: Timestamp
  │   └── fcmToken: String
  │
  ├── moodEntries (subcollection)
  │   └── {entryID}
  │       ├── moodType: String
  │       ├── note: String
  │       ├── timestamp: Timestamp
  │       └── quoteShown: Object
  │
  └── aiQuoteCache (subcollection)
      └── {cacheKey}
          ├── quoteText: String
          ├── generatedAt: Timestamp
          └── expiresAt: Timestamp (30 day TTL)
```

**Cost for 1,000 users:** $0 (within free tier)
- Reads: 3K/day (FREE up to 50K/day)
- Writes: 1K/day (FREE up to 20K/day)

**Files to Create:**
- `Core/Services/FirestoreSyncService.swift`

**Files to Modify:**
- `MoodDataService.swift` - Add background sync after local save

### 3. Firebase Remote Config
**Purpose:** Dynamic quote database (no app update required)

**Configuration:**
- 200+ quotes organized by categories
- Feature flags for A/B testing
- Fallback notification messages

**Update Strategy:**
- Fetch on app launch (cached 12 hours)
- Fallback to local `quotes.json` if offline

**Cost:** FREE (unlimited fetches)

**Files to Create:**
- `Core/Services/RemoteConfigService.swift`

**Files to Modify:**
- `QuoteService.swift` - Fetch from Remote Config, fallback to local

### 4. Firebase Cloud Messaging (FCM)
**Purpose:** Server-driven push notifications

**Migration from Local Notifications:**
- Keep local notifications as fallback
- FCM adds: Personalized messages, delivery tracking

**Flow:**
1. Register device token on app launch
2. Store in Firestore `/users/{userID}/profile/fcmToken`
3. Cloud Function runs at user's notification time
4. Function generates personalized message via Gemini
5. Send via FCM Admin SDK

**Cost:** FREE (unlimited messages)

**Files to Modify:**
- `NotificationService.swift` - Add FCM token registration

**Cloud Functions to Create:**
- `sendPersonalizedNotification` - Scheduled trigger

### 5. Firebase Analytics
**Purpose:** Track engagement, optimize features

**Key Events:**
- `mood_checked_in` (mood type)
- `quote_displayed` (source: local/remote/ai)
- `ai_quote_generated` (mood + expectations)
- `notification_opened`
- `streak_milestone` (days)

**Cost:** FREE (unlimited events)

**Files to Modify:**
- Add `Analytics.logEvent()` calls in ViewModels

---

## Google AI (Gemini) Integration

### Model: Gemini 1.5 Flash

**Why This Model?**
- **FREE TIER:** 1,500 requests/day (enough for 1,000 users)
- **Cheap paid tier:** $0.075 per 1M input tokens
- Fast response time (< 1 second)
- Perfect for short quote generation (50-100 tokens)

### Integration Strategy: Cloud Functions (Server-Side)

**Why Server-Side?**
- ✅ Protects API key (not in iOS binary)
- ✅ Centralized rate limiting
- ✅ Easier cost monitoring
- ✅ Server-level caching

**Architecture:**
```
iOS App → HTTPS Request → Cloud Function → Gemini API → Cache → Response
```

### Use Case 1: Personalized Quote Generation

**Prompt Template:**
```
You are a compassionate mental wellness coach. Generate a short,
uplifting motivational quote (max 20 words) for someone feeling {moodType}.

Context:
- Current mood: {moodType} (e.g., "sad", "happy")
- User's focus areas: {userExpectations} (e.g., "work stress, anxiety")
- Time of day: {timeOfDay} (e.g., "morning", "evening")

Requirements:
1. Encouraging and actionable
2. Relate to user's focus areas
3. Max 20 words
4. Include author (or "Anonymous")

Output JSON:
{
  "text": "Your quote here",
  "author": "Author Name",
  "categories": ["motivation", "resilience"]
}
```

**Token Cost:** ~250 tokens per request (~$0.00002)

### Use Case 2: Notification Message Generation

**Prompt Template:**
```
Generate a gentle notification message (max 10 words) to remind
someone to check their daily mood.

Context:
- Focus areas: {userExpectations}
- Recent mood: {recentAverage}
- Time: {notificationTime}

Examples:
- "How's your heart feeling today?"
- "Time to check in with yourself"
```

**Token Cost:** ~170 tokens per request

### Caching Strategy (Critical for Budget)

**3-Level Cache:**

1. **Local iOS Cache** (UserDefaults/SwiftData)
   - Last 50 AI-generated quotes
   - TTL: 30 days
   - Instant retrieval

2. **Firestore Cache** (per-user)
   - AI quotes with metadata
   - Shared across user's devices
   - TTL: 30 days (auto-cleanup)

3. **Global Cache** (future, optional)
   - Popular mood+expectation combos
   - Reusable across all users

**Cache Hit Target:** 90% (reduces AI calls by 90%)

**Quote Selection Flow:**
```swift
1. Check local cache (instant) → Return if found
2. Check Firestore cache (network) → Return if found
3. Check local quotes.json (fallback) → Return if suitable
4. Check AI quota (5/day per user) → Call Gemini if available
5. Return hardcoded fallback (never fail)
```

### Rate Limiting & Budget Control

**Per-User Limits:**
- 5 AI quotes per day per user
- 50 AI quotes per month per user

**Global Budget Cap:**
- $20/month hard limit in Cloud Function
- Tracks spending in Firestore `/adminStats/geminiUsage`
- Auto-fallback to static quotes if exceeded

**Fallback Behavior:**
```
User exceeds quota → Use cached AI quotes (even if expired)
                   → Use Remote Config quotes
                   → Use local quotes.json
                   → Use hardcoded fallback
```

**User never sees error, just less personalization**

### Cloud Functions API

**Function 1: `generatePersonalizedQuote`**
```typescript
// HTTPS Callable
{
  request: {
    mood: "sad",
    expectations: ["work_stress", "anxiety"],
    timeOfDay: "evening"
  },
  response: {
    success: true,
    quote: {
      text: "Tough days build strength...",
      author: "Anonymous",
      source: "ai_generated"
    },
    cacheHit: false,
    quotaRemaining: 4
  }
}
```

**Function 2: `sendPersonalizedNotification`**
- Pub/Sub scheduled (every minute)
- Checks users whose notification time matches current time
- Generates personalized message via Gemini (if budget allows)
- Sends FCM push notification

**Files to Create:**
- `Core/Services/GeminiService.swift` (calls Cloud Function)
- `/functions/generatePersonalizedQuote.js` (Node.js)
- `/functions/sendPersonalizedNotification.js` (Node.js)

---

## Cost Projections

### Scenario 1: 100 Users (Early Stage)

**Firebase:** $0 (all free tier)
- Firestore: 2K reads/day, 100 writes/day ✅
- FCM: 100 notifications/day ✅
- Remote Config: Unlimited ✅

**Gemini 1.5 Flash:** $0 (within free tier)
- Free tier: 1,500 requests/day
- Usage with 80% cache hit: 200 requests/day
- ✅ Well within limit

**Total: $0/month**

---

### Scenario 2: 1,000 Users (Growth Stage)

**Firebase:** $0 (within free tier)
- Firestore: 3K reads/day ✅, 1K writes/day ✅
- All other services: FREE ✅

**Gemini 1.5 Flash:** $0-1/month
- Free tier: 1,500 requests/day
- Usage with 85% cache hit: 1,500 requests/day
- ✅ Exactly at free tier limit
- Risk: If cache hit drops to 80%, cost = ~$0.85/month

**Total: $0-1/month**

---

### Scenario 3: 10,000 Users (Scale Stage)

**Firebase:** $1.01/month
- Firestore reads overage: $0.51/month
- Firestore writes overage: $0.50/month
- All other services: FREE ✅

**Gemini 1.5 Flash:** $7.66/month
- Free tier: 1,500 requests/day
- Usage with 90% cache hit: 10K requests/day
- Overage: 8,500 requests/day × 250 tokens = 63.75M tokens/month
- Cost: $7.66/month

**Total: $8.67/month** ✅ (under $20 budget)

**Worst case (70% cache hit):** $9.03/month ✅ (still under budget)

---

## Implementation Plan

### Phase A: Firebase Setup (Week 1)
**Goal:** Infrastructure without breaking changes

- [ ] Create Firebase project in console
- [ ] Add Firebase SDK via SPM
- [ ] Download `GoogleService-Info.plist` (add to .gitignore)
- [ ] Initialize Firebase in `Happify_2App.swift`
- [ ] Enable Anonymous Auth
- [ ] Create Firestore database with security rules
- [ ] Test: Write test document to Firestore

**Critical Files:**
- `App/Happify_2App.swift` - Add `FirebaseApp.configure()`
- `Core/Services/FirebaseAuthService.swift` - NEW
- `GoogleService-Info.plist` - NEW (root of Xcode project)

---

### Phase B: Remote Config Quotes (Week 2)
**Goal:** Dynamic quote updates

- [ ] Upload 200 quotes to Remote Config
- [ ] Create `RemoteConfigService.swift`
- [ ] Modify `QuoteService.swift` to fetch Remote Config
- [ ] Keep local `quotes.json` as fallback
- [ ] Test: Update quote in console, verify app receives update

**Files to Modify:**
- `Core/Services/QuoteService.swift` - Fetch from Remote Config first

**Files to Create:**
- `Core/Services/RemoteConfigService.swift`

---

### Phase C: Mood Entry Sync (Week 3)
**Goal:** Cloud backup

- [ ] Create `FirestoreSyncService.swift`
- [ ] Modify `MoodDataService` to sync after local save
- [ ] Add pull-to-refresh on history screen (fetch from Firestore)
- [ ] Test: Create mood entry, verify Firestore document

**Files to Modify:**
- `Core/Services/MoodDataService.swift` - Add `firestoreSyncService.syncMoodEntry()`

**Files to Create:**
- `Core/Services/FirestoreSyncService.swift`

---

### Phase D: FCM Push Notifications (Week 4-5)
**Goal:** Server-driven notifications

- [ ] Register for APNs token in `AppDelegate`
- [ ] Get FCM token, save to Firestore
- [ ] Deploy Cloud Function `sendPersonalizedNotification`
- [ ] Test: Receive push at scheduled time
- [ ] Keep local notifications as fallback

**Files to Modify:**
- `Core/Services/NotificationService.swift` - Add FCM token registration

**Cloud Functions to Create:**
- `functions/sendPersonalizedNotification.js`

---

### Phase E: Gemini AI Integration (Week 6-7)
**Goal:** AI-generated quotes

- [ ] Enable Gemini API in Google Cloud Console
- [ ] Create API key (restrict to Cloud Functions)
- [ ] Deploy Cloud Function `generatePersonalizedQuote`
- [ ] Implement 3-level caching
- [ ] Add rate limiting and budget tracking
- [ ] Modify `QuoteService` to call Gemini as last resort
- [ ] Test: Generate AI quote, verify caching works
- [ ] Monitor costs daily

**Files to Modify:**
- `Core/Services/QuoteService.swift` - Add Gemini as option 4 in selection flow

**Files to Create:**
- `Core/Services/GeminiService.swift` - Calls Cloud Function
- `functions/generatePersonalizedQuote.js`

---

### Phase F: Analytics & Monitoring (Week 8)
**Goal:** Usage insights and cost tracking

- [ ] Add Firebase Analytics events throughout app
- [ ] Create admin dashboard in Firebase Console
- [ ] Set up budget alerts ($5, $10, $15)
- [ ] Monitor cache hit rate daily
- [ ] Test: Verify events appear in Analytics

**Files to Modify:**
- All ViewModels - Add `Analytics.logEvent()` calls

---

### Phase G: Testing & Launch (Week 9-10)
**Goal:** Production-ready

- [ ] Test offline mode (airplane mode)
- [ ] Test quota limits (exceed 5 quotes/day)
- [ ] Test network failures
- [ ] Test budget cap simulation
- [ ] Update privacy policy
- [ ] Submit app update to App Store
- [ ] Monitor costs and crashes

---

## New Feature Suggestions

Based on Firebase + AI architecture, here are cost-effective features to consider:

### 1. Weekly AI Insights ⭐
**Description:** Every Sunday, AI analyzes your week and provides 2-3 insights

**Example:**
- "You tend to feel better on Tuesdays after morning workouts"
- "Work stress was highest on Mondays - consider breaks"
- "You had 4 happy days this week - great progress!"

**Implementation:**
- Cloud Function triggered weekly
- Call Gemini with 7 days of mood data
- Display in app as "Your Week in Review"

**Cost:** ~$0.005 per user per week = $5/month for 1,000 users

---

### 2. iOS Home Screen Widget
**Description:** Widget showing today's mood + personalized quote

**Implementation:**
- WidgetKit (iOS 14+)
- Fetch from local cache (no network needed)
- Update via Background App Refresh

**Cost:** $0 (no API calls, uses cached data)

---

### 3. Streaks & Achievements
**Description:** Celebrate milestones (7-day, 30-day, 100-day streaks)

**Implementation:**
- Cloud Function detects milestones
- Send celebratory FCM push with AI-generated message
- Display badges in app

**Cost:** ~$0.002 per milestone

---

### 4. Voice Mood Check-In (Siri Shortcut)
**Description:** "Hey Siri, I'm feeling happy today"

**Implementation:**
- SiriKit intent for mood logging
- Parse voice input → Save mood entry
- No AI needed

**Cost:** $0

---

### 5. Community Insights (Anonymous)
**Description:** "70% of users felt happy this week"

**Implementation:**
- Aggregate anonymized Firestore data
- Display global trends
- No individual data exposed

**Cost:** $0 (Firestore query, cached daily)

---

### 6. Export to Apple Health (HealthKit)
**Description:** Sync mood data to Health app

**Implementation:**
- HealthKit API
- Write mood as "Mindful Minutes" category
- Local-only, no network

**Cost:** $0

---

### 7. Mood Prediction (Future)
**Description:** "How will you feel tomorrow?" based on patterns

**Implementation:**
- Collect 30 days of data
- Call Gemini with pattern analysis
- Show prediction with confidence level

**Cost:** ~$0.01 per prediction

---

## Security & Privacy

### Data Collection Transparency

**Privacy Policy Update:**
```
What We Collect:
- Mood entries (mood type, notes, timestamp)
- Wellness focus areas (e.g., "work stress")
- Device notification token
- Anonymous usage analytics

How We Use AI:
- Google Gemini generates personalized quotes
- All AI interactions are anonymized
- Quotes cached to minimize data transmission

Your Data Rights:
- All data stored locally first
- Cloud backup optional (can disable)
- Export data anytime (CSV/JSON)
- Delete account permanently

Security:
- Anonymous authentication
- Firestore security rules
- API keys never exposed in app
- HTTPS encryption
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User can only access their own data
    match /users/{userID} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userID;

      // Mood entries subcollection
      match /moodEntries/{entryID} {
        allow read, write: if request.auth.uid == userID;
      }

      // AI cache (read-only, written by Cloud Functions)
      match /aiQuoteCache/{cacheKey} {
        allow read: if request.auth.uid == userID;
        allow write: if false;  // Only Cloud Functions
      }
    }

    // Global config (read-only for all authenticated users)
    match /globalConfig/{document} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## Critical Files Reference

### Files to Modify

1. **App/Happify_2App.swift**
   - Add Firebase initialization
   - Impact: Foundation for all Firebase services

2. **Core/Services/QuoteService.swift**
   - Add Remote Config fetch
   - Add Gemini AI as fallback option
   - Impact: Core personalization feature

3. **Core/Services/NotificationService.swift**
   - Add FCM token registration
   - Keep local notifications as fallback
   - Impact: Notification system

4. **Core/Services/MoodDataService.swift**
   - Add Firestore sync after local save
   - Impact: Cloud backup

### Files to Create

1. **Core/Services/FirebaseAuthService.swift**
   - Anonymous authentication wrapper
   - Provides `currentUserID` for Firestore

2. **Core/Services/FirestoreSyncService.swift**
   - Sync mood entries to Firestore
   - Conflict resolution for multi-device (future)

3. **Core/Services/RemoteConfigService.swift**
   - Fetch quotes from Remote Config
   - 12-hour cache with fallback

4. **Core/Services/GeminiService.swift**
   - Call Cloud Function for AI quotes
   - Not Gemini API directly (security)

5. **GoogleService-Info.plist**
   - Firebase configuration file
   - **IMPORTANT:** Add to .gitignore immediately

### Cloud Functions to Create

1. **functions/generatePersonalizedQuote.js**
   - HTTPS callable from iOS app
   - Calls Gemini API with caching
   - Rate limiting and budget tracking

2. **functions/sendPersonalizedNotification.js**
   - Pub/Sub scheduled trigger
   - Runs every minute
   - Generates personalized notification via Gemini
   - Sends FCM push

---

## Success Metrics

### Week 1 (Firebase Setup)
- ✅ Firebase connected
- ✅ Anonymous auth working
- ✅ Can write to Firestore

### Week 2 (Remote Config)
- ✅ 200 quotes in Remote Config
- ✅ App fetches quotes on launch
- ✅ Local fallback working

### Week 4 (Mood Sync)
- ✅ Mood entries syncing to Firestore
- ✅ Offline mode works (airplane mode test)
- ✅ Pull-to-refresh fetches from cloud

### Week 6 (FCM Notifications)
- ✅ Push notifications working
- ✅ Local fallback still works
- ✅ Device token saved to Firestore

### Week 8 (AI Integration)
- ✅ AI quotes generating
- ✅ Cache hit rate > 70%
- ✅ Cost < $5/month for 1,000 users

### Week 10 (Production Launch)
- ✅ All features tested
- ✅ Privacy policy updated
- ✅ App Store approved
- ✅ Monitoring dashboard active

---

## Risk Mitigation

### Technical Risks

**Risk 1: Gemini API Budget Overrun**
- **Mitigation:** Hard $20 cap in Cloud Function
- **Fallback:** Auto-switch to static quotes if exceeded
- **Monitoring:** Daily cost checks, alerts at $5/$10/$15

**Risk 2: Firestore/Gemini Downtime**
- **Mitigation:** Offline-first architecture
- **Fallback:** Local quotes.json always available
- **Impact:** User never sees errors, just less personalization

**Risk 3: Cache Hit Rate Below Target**
- **Mitigation:** Pre-generate popular combinations
- **Fallback:** Increase per-user quota to 10/day if budget allows
- **Monitoring:** Track cache hit rate in Analytics

**Risk 4: Security - API Key Exposure**
- **Mitigation:** Never put API key in iOS app
- **Mitigation:** Use Cloud Functions (server-side only)
- **Mitigation:** Add GoogleService-Info.plist to .gitignore

### Business Risks

**Risk 1: Low User Engagement with AI Quotes**
- **Mitigation:** A/B test AI vs static quotes
- **Measurement:** Track quote sharing rates
- **Fallback:** Keep static quotes if no engagement lift

**Risk 2: Privacy Concerns**
- **Mitigation:** Clear privacy policy explaining AI usage
- **Mitigation:** Option to disable cloud sync (local-only mode)
- **Mitigation:** Anonymous auth (no personal identifiers)

---

## Cost Optimization Checklist

- [x] **Use Gemini 1.5 Flash** (not Pro) - 80% cheaper
- [x] **Aggressive caching** - 90% cache hit rate target
- [x] **Rate limiting** - 5 AI quotes/day per user
- [x] **Budget cap** - $20/month hard limit in Cloud Function
- [x] **Free tier maximization** - All Firebase services within free tier for 1K users
- [x] **Fallback strategy** - 4 levels (cache → Remote Config → AI → hardcoded)
- [x] **Batch operations** - Sync mood entries in batches
- [x] **Analytics** - Track which features drive costs
- [x] **Alerts** - Notify at $5, $10, $15 thresholds

---

## Next Steps (After Approval)

1. **Set up Firebase project** (Day 1)
   - Create in console
   - Download GoogleService-Info.plist
   - Enable Anonymous Auth

2. **Add Firebase SDK** (Day 2)
   - SPM integration
   - Initialize in Happify_2App.swift
   - Test connection

3. **Implement Anonymous Auth** (Days 3-4)
   - Create FirebaseAuthService.swift
   - Silent sign-in on launch
   - Verify UID in Firestore Console

4. **Continue with phases** (Weeks 2-10)
   - Follow implementation plan above
   - Test each phase thoroughly
   - Monitor costs daily

---

## Conclusion

This plan provides a **comprehensive, cost-effective** path to transform Happify-2 into a cloud-powered app with AI capabilities while:

✅ Staying within $0-20/month budget
✅ Maintaining offline-first architecture
✅ Minimal changes to existing code
✅ Graceful fallbacks at every level
✅ Production-ready security

**Key to success:** Aggressive caching (90% hit rate) and smart fallbacks (local → Remote Config → AI → hardcoded).

With proper implementation, you can serve:
- **1,000 users for ~$1/month**
- **10,000 users for ~$9/month**

Start with Phase A (Firebase setup) and iterate. The architecture supports gradual rollout - validate each component before advancing.

---

## Implementation Progress

### GitHub Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `feature/*` - Feature branches for each phase
- Follow standard GitHub flow: branch → commit → PR → review → merge

**Current Branches:**
- [ ] `feature/firebase-setup` - Phase A: Firebase Setup
- [ ] `feature/ai-proxy` - Phase E: AI Proxy (Cloud Functions)
- [ ] `feature/remote-config` - Phase B: Remote Config
- [ ] `feature/mood-sync` - Phase C: Mood Entry Sync
- [ ] `feature/fcm-notifications` - Phase D: FCM Notifications
- [ ] `feature/analytics` - Phase F: Analytics & Monitoring

### Phase Tracking

#### Phase 0: Planning & Documentation ✅
- [x] Create comprehensive backend plan
- [x] Create implementation guide with GitHub workflow
- [x] Set up task tracking system
- [x] Define AI proxy architecture
- [x] Plan security and cost optimization

#### Phase A: Firebase Setup (Week 1) 🚧
**Branch:** `feature/firebase-setup`
**Goal:** Infrastructure without breaking changes

- [ ] Create Firebase project in console
- [ ] Configure Firebase MCP server
- [ ] Add Firebase SDK via SPM
- [ ] Download `GoogleService-Info.plist` (add to .gitignore)
- [ ] Initialize Firebase in `Happify_2App.swift`
- [ ] Enable Anonymous Auth
- [ ] Create Firestore database with security rules
- [ ] Test: Write test document to Firestore
- [ ] Create PR and merge to main

**Critical Files:**
- `App/Happify_2App.swift` - Add `FirebaseApp.configure()`
- `Core/Services/FirebaseAuthService.swift` - NEW
- `GoogleService-Info.plist` - NEW (root of Xcode project)
- `firestore.rules` - NEW
- `.gitignore` - Updated

---

#### Phase B: Remote Config Quotes (Week 2) ⏸️
**Branch:** `feature/remote-config`
**Goal:** Dynamic quote updates

- [ ] Upload 200 quotes to Remote Config
- [ ] Create `RemoteConfigService.swift`
- [ ] Modify `QuoteService.swift` to fetch Remote Config
- [ ] Keep local `quotes.json` as fallback
- [ ] Test: Update quote in console, verify app receives update
- [ ] Create PR and merge to main

**Files to Modify:**
- `Core/Services/QuoteService.swift` - Fetch from Remote Config first

**Files to Create:**
- `Core/Services/RemoteConfigService.swift`
- `remoteconfig.template.json`

---

#### Phase C: Mood Entry Sync (Week 3) ⏸️
**Branch:** `feature/mood-sync`
**Goal:** Cloud backup

- [ ] Create `FirestoreSyncService.swift`
- [ ] Modify `MoodDataService` to sync after local save
- [ ] Add pull-to-refresh on history screen (fetch from Firestore)
- [ ] Test: Create mood entry, verify Firestore document
- [ ] Create PR and merge to main

**Files to Modify:**
- `Core/Services/MoodDataService.swift` - Add `firestoreSyncService.syncMoodEntry()`

**Files to Create:**
- `Core/Services/FirestoreSyncService.swift`

---

#### Phase D: FCM Push Notifications (Week 4-5) ⏸️
**Branch:** `feature/fcm-notifications`
**Goal:** Server-driven notifications

- [ ] Register for APNs token in `AppDelegate`
- [ ] Get FCM token, save to Firestore
- [ ] Deploy Cloud Function `sendPersonalizedNotification`
- [ ] Test: Receive push at scheduled time
- [ ] Keep local notifications as fallback
- [ ] Create PR and merge to main

**Files to Modify:**
- `Core/Services/NotificationService.swift` - Add FCM token registration

**Cloud Functions to Create:**
- `functions/src/notifications.ts` - sendPersonalizedNotifications

---

#### Phase E: Gemini AI Integration (Week 6-7) ⏸️
**Branch:** `feature/ai-proxy`
**Goal:** AI-generated quotes via secure proxy

- [ ] Enable Gemini API in Google Cloud Console
- [ ] Create API key (restrict to Cloud Functions)
- [ ] Set up Cloud Functions project (TypeScript)
- [ ] Deploy Cloud Function `generatePersonalizedQuote`
- [ ] Implement 3-level caching (local, Firestore, global)
- [ ] Add rate limiting (5 quotes/day per user)
- [ ] Add budget tracking ($20/month cap)
- [ ] Modify `QuoteService` to call Gemini as last resort
- [ ] Create `GeminiService.swift` for Cloud Function calls
- [ ] Test: Generate AI quote, verify caching works
- [ ] Monitor costs daily
- [ ] Create PR and merge to main

**Files to Modify:**
- `Core/Services/QuoteService.swift` - Add Gemini as option 4 in selection flow

**Files to Create:**
- `Core/Services/GeminiService.swift` - Calls Cloud Function
- `functions/src/index.ts` - AI proxy with rate limiting & caching
- `functions/package.json`
- `functions/tsconfig.json`

**Key Architecture:**
```
iOS App → GeminiService → Cloud Function → Gemini API
                          (rate limit, cache, budget cap)
```

---

#### Phase F: Analytics & Monitoring (Week 8) ⏸️
**Branch:** `feature/analytics`
**Goal:** Usage insights and cost tracking

- [ ] Add Firebase Analytics events throughout app
- [ ] Create admin dashboard in Firebase Console
- [ ] Set up budget alerts ($5, $10, $15)
- [ ] Monitor cache hit rate daily
- [ ] Test: Verify events appear in Analytics
- [ ] Create PR and merge to main

**Files to Modify:**
- All ViewModels - Add `Analytics.logEvent()` calls

---

#### Phase G: Testing & Launch (Week 9-10) ⏸️
**Goal:** Production-ready

- [ ] Test offline mode (airplane mode)
- [ ] Test quota limits (exceed 5 quotes/day)
- [ ] Test network failures
- [ ] Test budget cap simulation
- [ ] Update privacy policy
- [ ] Submit app update to App Store
- [ ] Monitor costs and crashes

---

### Pull Requests

**Completed:**
- None yet

**In Progress:**
- None yet

**Planned:**
1. Phase A: Firebase Setup & Authentication
2. Phase E: Gemini AI Proxy via Cloud Functions
3. Phase B: Remote Config for Dynamic Quotes
4. Phase C: Mood Entry Cloud Sync
5. Phase D: FCM Push Notifications
6. Phase F: Analytics & Monitoring
7. Phase G: Production Launch

---

### Cost Tracking

**Target:** $0-20/month
**Current:** $0/month (not yet deployed)

**Monitoring:**
- [ ] Set up Google Cloud billing alerts
- [ ] Daily cost checks during first month
- [ ] Track cache hit rate (target: 90%)
- [ ] Monitor Gemini API usage

**Alerts:**
- Alert at $5/month
- Alert at $10/month
- Alert at $15/month
- Hard cap at $20/month (auto-fallback to static quotes)

---

### Security Checklist

- [ ] Firebase API key in .gitignore
- [ ] Gemini API key stored in Cloud Functions config (never in iOS app)
- [ ] Firestore security rules deployed
- [ ] Anonymous authentication enabled
- [ ] HTTPS-only Cloud Functions
- [ ] Rate limiting on AI proxy
- [ ] User data isolation (can only access own data)

---

## Legend

- ✅ Complete
- 🚧 In Progress
- ⏸️ Not Started
- ⚠️ Blocked
