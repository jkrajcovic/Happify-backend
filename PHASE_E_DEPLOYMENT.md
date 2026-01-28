# Phase E: AI Proxy Deployment Guide

## ✅ What's Been Implemented

### Cloud Functions (Complete)

**File:** `functions/src/index.ts` (518 lines)

**Functions:**
1. **`generatePersonalizedQuote`** - HTTPS Callable
   - Rate limiting: 5 quotes/day per user
   - 3-level caching (local, Firestore, global)
   - Budget cap: $20/month with auto-fallback
   - Graceful error handling

2. **`sendPersonalizedNotifications`** - Pub/Sub Scheduled
   - Runs every minute
   - Checks user notification times
   - Generates AI messages (budget-aware)
   - Sends via FCM

### Security Features

- ✅ **API Key Protected:** Gemini API key stored in Cloud Functions config (never in code)
- ✅ **Authentication Required:** All functions require Firebase Auth
- ✅ **Rate Limiting:** Per-user quota tracking
- ✅ **Budget Control:** Global spending cap with auto-fallback

### Cost Optimization

- ✅ **Caching:** 30-day cache per user (target: 90% hit rate)
- ✅ **Quota System:** 5 AI quotes per day per user
- ✅ **Budget Monitoring:** Real-time cost tracking in Firestore
- ✅ **Graceful Fallbacks:** Never fails, always returns something

---

## 🚀 Deployment Steps

### Step 1: Get Gemini API Key

1. **Go to Google AI Studio:**
   ```
   https://makersuite.google.com/app/apikey
   ```

2. **Create API Key:**
   - Click "Create API Key"
   - Select your Google Cloud project (or create new)
   - Copy the API key (starts with `AIzaSy...`)

3. **Important:** Keep this key secure! Never commit to Git.

### Step 2: Install Dependencies

```bash
cd functions
npm install
```

**Expected output:**
```
added 450 packages in 15s
```

### Step 3: Set Gemini API Key in Cloud Functions Config

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

**Example:**
```bash
firebase functions:config:set gemini.api_key="AIzaSyDq4uxEL4t1YCm54_wf33Axa7YldHVKQeU"
```

**Verify it's set:**
```bash
firebase functions:config:get
```

**Expected output:**
```json
{
  "gemini": {
    "api_key": "AIzaSy..."
  }
}
```

### Step 4: Build TypeScript

```bash
cd functions
npm run build
```

**Expected output:**
```
> build
> tsc

✓ Compiled successfully
```

### Step 5: Deploy to Firebase

```bash
# Deploy only functions (faster)
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

**Expected output:**
```
✔  Deploy complete!

Functions:
  generatePersonalizedQuote: https://us-central1-happify-2-prod.cloudfunctions.net/generatePersonalizedQuote
  sendPersonalizedNotifications: [scheduled function]
```

**Deployment time:** ~2-3 minutes

---

## 🧪 Testing the Functions

### Test 1: Generate Personalized Quote

**Using Firebase Console:**

1. Go to Firebase Console → Functions
2. Find `generatePersonalizedQuote`
3. Click "Test function" (or use logs to see invocations)

**Using iOS App (Recommended):**

Follow `MOBILE_TEAM_GUIDE.md` Phase E to integrate `GeminiService.swift`

**Expected Behavior:**
- First call: Generates new quote via Gemini (~1-2 seconds)
- Second call with same parameters: Returns cached quote (< 100ms)
- After 5 calls: Returns quota exceeded message

### Test 2: Check Logs

```bash
firebase functions:log
```

**Look for:**
```
✅ Quote request from user <user_id>
✅ Generated AI quote for user <user_id>
✅ Cache hit for user <user_id>
```

### Test 3: Verify Cost Tracking

**Check Firestore:**

1. Go to Firebase Console → Firestore
2. Navigate to `adminStats/geminiUsage`
3. Should see:
   ```
   {
     "2026-01": {
       "requests": 5,
       "estimatedCost": 0.0001,
       "lastUpdated": <timestamp>
     }
   }
   ```

### Test 4: Test Quota Limiting

**Using Postman or similar:**

```javascript
// Call 6 times with same user
// 6th call should return:
{
  "success": false,
  "error": "daily_quota_exceeded",
  "quotaRemaining": 0,
  "message": "You've reached your daily AI quote limit (5/day)..."
}
```

### Test 5: Test Budget Cap

**Manually set budget exceeded:**

1. Go to Firestore → `adminStats/geminiUsage`
2. Set current month's `estimatedCost` to `25` (exceeds $20 cap)
3. Try generating quote
4. Should return:
   ```json
   {
     "success": false,
     "error": "budget_exceeded",
     "message": "AI service temporarily at capacity..."
   }
   ```

---

## 📊 Monitoring & Debugging

### View Function Logs

```bash
# All logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --only generatePersonalizedQuote

# Last 100 lines
firebase functions:log -n 100
```

### Check Function Status

```bash
firebase functions:list
```

### View Cost Dashboard

**Firestore Console:**
```
adminStats/geminiUsage → 2026-01
```

**Gemini API Usage:**
```
https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
```

### Common Log Messages

**✅ Success:**
```
Quote request from user abc123
Cache hit for user abc123
Generated AI quote for user abc123
Sent notification to user abc123
```

**⚠️ Warnings:**
```
User abc123 exceeded daily quota
Global budget exceeded
```

**❌ Errors:**
```
Failed to parse Gemini response
Error generating quote
Failed to send notification to user
```

---

## 🔐 Security Verification

### Verify API Key is NOT in Code

```bash
cd functions
grep -r "AIzaSy" .
```

**Expected:** No results (API key should only be in Cloud Functions config)

### Verify API Key is in Config

```bash
firebase functions:config:get gemini.api_key
```

**Expected:** Your API key

### Test Unauthenticated Request

Should fail with authentication error (test from web or Postman without auth token)

---

## 💰 Cost Monitoring Setup

### Step 1: Set Up Budget Alerts

1. Go to Google Cloud Console
2. Billing → Budgets & Alerts
3. Create budget: $20/month
4. Set alerts at: $5, $10, $15, $20

### Step 2: Monitor Daily

**First Week:**
- Check `adminStats/geminiUsage` daily
- Verify cache hit rate is increasing
- Target: 70%+ cache hits by end of week

**After Week 1:**
- Check weekly
- Should see 85-90% cache hits
- Cost should be < $1/month for 100-1000 users

### Step 3: Calculate Actual Costs

**Formula:**
```
Daily Requests × $0.00002 × 30 days = Monthly Cost
```

**Example for 1,000 users:**
- 1,000 users × 1 mood check/day = 1,000 quotes/day
- 90% cache hit = 100 new AI quotes/day
- 100 × $0.00002 × 30 = $0.06/month

**Actual cost will be even lower due to:**
- Not all users check mood daily
- Cache hit rate improves over time
- Budget cap prevents overruns

---

## 🐛 Troubleshooting

### Issue: Functions Won't Deploy

**Error:** "Missing dependencies"

**Solution:**
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
firebase deploy --only functions
```

### Issue: API Key Not Set

**Error:** "NOT_CONFIGURED"

**Solution:**
```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase deploy --only functions
```

### Issue: TypeScript Compilation Errors

**Error:** Type errors during build

**Solution:**
```bash
cd functions
npm run build
# Fix any reported errors
```

### Issue: Gemini API Quota Exceeded

**Error:** "429 Too Many Requests"

**Solution:**
- Check Gemini API quota: https://console.cloud.google.com/
- Free tier: 1,500 requests/day
- If exceeded, wait 24 hours or upgrade to paid tier
- Budget cap will automatically fallback to cached quotes

### Issue: High Costs

**If costs exceed expectations:**

1. **Check cache hit rate:**
   ```
   adminStats/geminiUsage → requests
   ```
   Should see declining daily requests as cache builds up

2. **Reduce quota if needed:**
   Edit `functions/src/index.ts`:
   ```typescript
   const DAILY_LIMIT = 3; // Reduce from 5 to 3
   ```

3. **Lower budget cap:**
   ```typescript
   const BUDGET_CAP = 10; // Reduce from $20 to $10
   ```

---

## 📱 Next Step: Mobile Team Integration

Once deployed and tested, mobile team can integrate:

1. **Follow:** `MOBILE_TEAM_GUIDE.md` Phase E
2. **Implement:** `GeminiService.swift`
3. **Update:** `QuoteService.swift` to call Cloud Functions
4. **Test:** Generate AI quotes in app

**Expected iOS behavior:**
```
User opens app → Mood check → AI quote generated →
Cached for 30 days → 4 more quotes available today
```

---

## ✅ Deployment Checklist

- [ ] Gemini API key obtained
- [ ] Dependencies installed (`npm install`)
- [ ] API key set in Cloud Functions config
- [ ] TypeScript compiled successfully
- [ ] Functions deployed to Firebase
- [ ] `generatePersonalizedQuote` callable from iOS
- [ ] `sendPersonalizedNotifications` scheduled
- [ ] Logs show successful invocations
- [ ] Cost tracking in Firestore working
- [ ] Budget alerts configured in Google Cloud
- [ ] Mobile team notified to integrate

---

## 📊 Success Metrics

**Week 1:**
- ✅ Functions deployed successfully
- ✅ Can generate AI quotes
- ✅ Caching working (cache hits visible in logs)
- ✅ Cost < $1

**Week 2:**
- ✅ Cache hit rate > 70%
- ✅ Mobile team integrated
- ✅ Users receiving AI quotes
- ✅ Cost < $2

**Month 1:**
- ✅ Cache hit rate > 85%
- ✅ 100+ users generating quotes
- ✅ Cost < $5
- ✅ No quota exceeded errors

---

## 🎯 Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| Response Time (cached) | < 100ms | Function logs |
| Response Time (AI) | < 2s | Function logs |
| Cache Hit Rate | > 85% | Firestore `adminStats` |
| Cost per 1K users | < $1/month | Billing dashboard |
| Quota Exceeded Rate | < 1% | Function logs |
| Uptime | > 99.9% | Firebase Console |

---

## 🚀 Post-Deployment

After successful deployment:

1. **Update backend-plan.md:** Mark Phase E complete ✅
2. **Create PR:** Merge feature/ai-proxy to main
3. **Notify Mobile Team:** Share MOBILE_TEAM_GUIDE.md Phase E
4. **Monitor Daily:** Check costs and logs for first week
5. **Proceed to Phase B:** Remote Config (or Phase C/D)

---

## 📞 Support

**Firebase Functions Issues:**
- Logs: `firebase functions:log`
- Console: https://console.firebase.google.com/project/happify-2-prod/functions

**Gemini API Issues:**
- Quota: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com
- Docs: https://ai.google.dev/docs

**Cost Concerns:**
- Check Firestore: `adminStats/geminiUsage`
- Adjust `BUDGET_CAP` or `DAILY_LIMIT` in code
- Contact: juraj@krajcovic.me

---

**Phase E Status:** ✅ CODE COMPLETE
**Ready for Deployment:** ✅ YES
**Next Step:** Deploy to Firebase

**Built with ❤️ using Firebase + Google Gemini AI**
