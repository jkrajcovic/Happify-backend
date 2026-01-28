# Analytics & Monitoring Checklist

Quick reference for implementing analytics and cost monitoring for Happify.

## ✅ Backend Setup (Already Complete)

### 1. Firebase Analytics
- [x] Firebase Analytics SDK enabled (automatic with Firebase)
- [x] Console access configured
- [x] Zero additional configuration needed
- [x] FREE unlimited events

---

## 📊 iOS Implementation (1 week)

See **MOBILE_TEAM_GUIDE.md Phase F** for complete code.

### 1. Add Analytics Events (20 hours)

**Core Events (10 events, 10 hours):**

- [ ] `mood_checked_in` - Track mood entries (2 hours)
  ```swift
  Analytics.logEvent("mood_checked_in", parameters: [
    "mood_type": moodType,
    "has_note": hasNote,
    "expectations_count": expectations.count
  ])
  ```

- [ ] `streak_milestone` - Track streaks (1 hour)
  ```swift
  Analytics.logEvent("streak_milestone", parameters: [
    "streak_days": streakDays,
    "milestone_type": milestoneType
  ])
  ```

- [ ] `quote_displayed` - Track quote views (2 hours)
  ```swift
  Analytics.logEvent("quote_displayed", parameters: [
    "quote_source": source,
    "mood_type": moodType
  ])
  ```

- [ ] `ai_quote_generated` - Track AI usage (2 hours)
  ```swift
  Analytics.logEvent("ai_quote_generated", parameters: [
    "generation_time_ms": duration * 1000,
    "cache_hit": cacheHit,
    "cost_estimate_usd": costEstimate
  ])
  ```

- [ ] `mood_entry_synced` - Track sync success (1 hour)
  ```swift
  Analytics.logEvent("mood_entry_synced", parameters: [
    "sync_duration_ms": duration * 1000,
    "retry_count": retries
  ])
  ```

- [ ] `sync_failed` - Track sync failures (1 hour)
  ```swift
  Analytics.logEvent("sync_failed", parameters: [
    "error_code": error.code,
    "error_message": error.localizedDescription
  ])
  ```

- [ ] `notification_received` - Track notifications (30 mins)
- [ ] `notification_opened` - Track notification opens (30 mins)
- [ ] Screen views - Track all major screens (30 mins)
- [ ] Error tracking - Add to all catch blocks (30 mins)

### 2. Add User Properties (4 hours)

**Set on app launch:**
- [ ] `user_cohort` - User install cohort (30 mins)
- [ ] `install_date` - First app open date (30 mins)
- [ ] `user_tier` - Free/premium status (30 mins)

**Update regularly:**
- [ ] `current_streak` - Update after mood entry (1 hour)
- [ ] `total_entries` - Update after mood entry (1 hour)
- [ ] `notifications_enabled` - Update after settings change (30 mins)

```swift
// Example: Update streak
Analytics.setUserProperty("\(streakDays)", forName: "current_streak")
```

### 3. Enable Debug View (30 mins)

**In Xcode:**
```bash
# Add to scheme arguments
-FIRDebugEnabled
```

- [ ] Add debug flag to scheme
- [ ] Test real-time event tracking
- [ ] Verify events in Firebase Console DebugView

### 4. Testing (5.5 hours)

- [ ] Test all events fire correctly (2 hours)
- [ ] Verify parameters are populated (1 hour)
- [ ] Check user properties update (1 hour)
- [ ] Test error tracking (1 hour)
- [ ] Verify DebugView shows events real-time (30 mins)

---

## 💰 Budget Alerts Setup (30 mins)

### Google Cloud Console Configuration

**Access:**
```
https://console.cloud.google.com/billing
```

### Alert 1: $5 Warning
- [ ] Create budget: $5.00
- [ ] Set threshold: 100%
- [ ] Email: juraj@krajcovic.me
- [ ] Subject: "⚠️ Happify Budget Alert: $5 Reached"

### Alert 2: $10 Warning
- [ ] Create budget: $10.00
- [ ] Set threshold: 100%
- [ ] Email: juraj@krajcovic.me
- [ ] Subject: "⚠️⚠️ Happify Budget Alert: $10 Reached"

### Alert 3: $15 Critical
- [ ] Create budget: $15.00
- [ ] Set threshold: 100%
- [ ] Email: juraj@krajcovic.me
- [ ] Subject: "🚨 Happify Budget Alert: $15 Reached - CRITICAL"

### Alert 4: $20 Hard Cap
- [ ] Create budget: $20.00
- [ ] Set threshold: 100%
- [ ] Email: juraj@krajcovic.me
- [ ] Subject: "🚨🚨 Happify Budget EXCEEDED: $20 - ACTION REQUIRED"
- [ ] Document: Disable AI features manually if reached

---

## 📈 Cost Tracking (Optional, 4 hours)

### Create Cost Tracking Cloud Function

**File:** `functions/src/costTracking.ts`

- [ ] Create Cloud Function `updateDailyCosts` (2 hours)
- [ ] Schedule daily at 2 AM (30 mins)
- [ ] Fetch Firestore costs from Billing API (1 hour)
- [ ] Fetch Gemini API costs (30 mins)
- [ ] Update `/adminStats/monthlyCosts` document (30 mins)
- [ ] Send daily cost report email (optional, 30 mins)

**Firestore Document Schema:**
```json
{
  "month": "2026-01",
  "firestoreCostUsd": 0.12,
  "geminiCostUsd": 0.09,
  "totalCostUsd": 0.21,
  "budgetRemainingUsd": 19.79,
  "lastUpdated": "2026-01-15T10:00:00Z"
}
```

---

## 📊 Cache Monitoring (Optional, 3 hours)

### Track Cache Hit Rate

**Goal:** 90%+ cache hit rate

- [ ] Create `/adminStats/cacheMetrics` document (30 mins)
- [ ] Update cache hits/misses in Cloud Function (1 hour)
- [ ] Add Analytics event for cache checks (30 mins)
- [ ] Create daily cache report email (1 hour)

**Cache Metrics Schema:**
```json
{
  "date": "2026-01-15",
  "totalQuoteRequests": 1000,
  "cacheHits": 920,
  "cacheMisses": 80,
  "cacheHitRate": 0.92
}
```

---

## 🧪 Testing (2 hours)

### Test 1: Event Verification (30 mins)
- [ ] Open Firebase Console → Analytics → Events
- [ ] Create mood entry in app
- [ ] Wait 60 seconds
- [ ] ✅ Event `mood_checked_in` appears
- [ ] ✅ Parameters populated correctly

### Test 2: User Properties (30 mins)
- [ ] Set user property in app
- [ ] Wait 24 hours OR use DebugView
- [ ] ✅ Property appears in Console
- [ ] ✅ Value matches app state

### Test 3: DebugView Real-Time (30 mins)
- [ ] Enable `-FIRDebugEnabled` flag
- [ ] Open Firebase Console → Analytics → DebugView
- [ ] Use app
- [ ] ✅ Events appear in real-time (< 10 seconds)

### Test 4: Budget Alerts (30 mins)
- [ ] Verify email address in budget alerts
- [ ] Test alert threshold (simulate high cost in test)
- [ ] ✅ Email received with correct subject
- [ ] ✅ Email body contains dashboard links

---

## 📊 Dashboard Configuration (1 hour)

### Firebase Console Dashboards

**Dashboard 1: User Engagement**
- [ ] Widget: Active users (line chart)
- [ ] Widget: Mood entries per day (bar chart)
- [ ] Widget: Average streak (number)
- [ ] Widget: Top moods (pie chart)

**Dashboard 2: AI Performance**
- [ ] Widget: Cache hit rate (gauge, target: 90%)
- [ ] Widget: AI quotes generated (line chart)
- [ ] Widget: Average generation time (line chart)
- [ ] Widget: Cost per quote (number)

**Dashboard 3: Sync Health**
- [ ] Widget: Sync success rate (gauge, target: 95%)
- [ ] Widget: Sync errors (bar chart)
- [ ] Widget: Average sync time (line chart)
- [ ] Widget: Multi-device users (number)

---

## 📋 Key Metrics to Monitor

### Daily Checks (First Month)
- [ ] Active users (DAU)
- [ ] Mood entries created
- [ ] Budget status (check email alerts)
- [ ] Error rate

### Weekly Checks
- [ ] Cache hit rate (target: > 90%)
- [ ] Sync success rate (target: > 95%)
- [ ] Notification open rate (target: > 20%)
- [ ] Cost per user (target: < $0.02)

### Monthly Checks
- [ ] Total monthly cost (target: < $20)
- [ ] User retention (D1, D7, D30)
- [ ] Feature adoption rates
- [ ] Top moods and trends

---

## 🐛 Troubleshooting

### Events Not Appearing

**Check:**
1. GoogleService-Info.plist added?
2. FirebaseAnalytics imported?
3. Wait 60 seconds? (events batched)
4. Network available?

**Fix:**
```swift
// Enable debug logging
Analytics.setAnalyticsCollectionEnabled(true)
```

### Budget Alerts Not Received

**Check:**
1. Email address correct?
2. Threshold set correctly?
3. Check spam folder
4. Billing account has payment method?

**Fix:**
```bash
# Verify budget alerts
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID
```

### Cache Hit Rate Low (< 80%)

**Fix:**
1. Increase cache TTL (30 → 60 days)
2. Pre-generate popular combinations
3. Analyze cache misses (which combinations?)

---

## 💰 Cost Estimates

**Firebase Analytics:**
- Cost: $0/month (FREE unlimited) ✅

**Cloud Functions (for cost tracking):**
- 1 daily invocation = 30/month
- Cost: $0/month (within free tier) ✅

**Total Phase F Cost:** $0/month ✅

---

## ✅ Completion Criteria

**iOS Implementation:**
- [ ] 15+ events tracking
- [ ] 5+ user properties set
- [ ] Screen views tracked
- [ ] Error tracking in all catch blocks
- [ ] DebugView tested

**Budget Monitoring:**
- [ ] 4 budget alerts configured ($5, $10, $15, $20)
- [ ] Email notifications working
- [ ] Test alert received

**Cost Tracking (Optional):**
- [ ] Cost tracking Cloud Function deployed
- [ ] Daily cost updates automated
- [ ] Cache metrics tracked

**Dashboards:**
- [ ] 3 custom dashboards created
- [ ] Team access granted
- [ ] Real-time monitoring working

**Testing:**
- [ ] All events verified in Console
- [ ] User properties confirmed
- [ ] Budget alerts tested
- [ ] DebugView working

---

## 🎯 Success Indicators

**Week 1:**
✅ Firebase Analytics integrated
✅ Core events tracking
✅ Budget alerts configured
✅ DebugView working

**Week 2:**
✅ 1,000+ events logged
✅ User properties updating
✅ Dashboards configured
✅ No budget alerts triggered

**Month 1:**
✅ Cache hit rate > 85%
✅ Total cost < $5/month
✅ DAU/MAU ratio > 20%
✅ Zero budget overruns

**Month 3:**
✅ Cache hit rate > 90%
✅ Day 7 retention > 30%
✅ Cost per user < $0.01
✅ Data-driven feature decisions

---

## 📱 Quick Links

**Firebase Analytics Console:**
https://console.firebase.google.com/project/happify-2-prod/analytics

**Google Cloud Billing:**
https://console.cloud.google.com/billing

**Full Guides:**
- Backend: PHASE_F_ANALYTICS.md
- iOS: MOBILE_TEAM_GUIDE.md Phase F

**Support:**
- Backend team: juraj@krajcovic.me
- GitHub Issues: Report bugs

---

## 🚀 Ready to Implement!

**Estimated Time:**
- iOS analytics events: 20 hours
- User properties: 4 hours
- Budget alerts: 30 mins
- Cost tracking (optional): 4 hours
- Cache monitoring (optional): 3 hours
- Testing: 2 hours
- Dashboards: 1 hour

**Total Core: ~27 hours (~3-4 days)**
**Total with Optional: ~35 hours (~1 week)**

**Impact:** Data-driven decisions + Cost control + Feature optimization

Let's enable analytics! 📊
