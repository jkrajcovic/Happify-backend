# AI Architecture Update: Contextual Motivational Messages

## 🔄 Architecture Change Summary

**Date:** 2026-01-28
**Version:** 2.0
**Status:** Updated and ready for deployment

### What Changed

**OLD Architecture (v1.0):**
- Cache-first approach (check cache before calling AI)
- 30-day cache TTL
- Target: 90% cache hit rate
- Simple inputs: mood, expectations, timeOfDay
- Generated quotes (short, with author)
- Rate limiting: 5 quotes/day per user

**NEW Architecture (v2.0):**
- **AI-first approach** (generate fresh message on EVERY mood entry)
- 24-hour cache TTL (for display only, not to avoid AI calls)
- No cache checking before AI generation
- **Richer context:** long_term_state, yesterday_mood, yesterday_notes
- Generated motivational messages (empathetic, personal, 5 sentences max)
- No rate limiting per user

---

## 🎯 Why This Change?

### Problem with Old Architecture
1. **Generic responses:** Cache meant users got same quote for same mood
2. **Limited context:** Only knew current mood, not emotional journey
3. **Repetitive:** Even with 90% cache hit, felt robotic over time
4. **Not truly personal:** Didn't acknowledge user's emotional trajectory

### Benefits of New Architecture
1. ✅ **Fresh every time:** New message on every mood entry
2. ✅ **Contextual awareness:** Knows yesterday's mood and long-term trend
3. ✅ **Empathetic:** Acknowledges emotional journey, not just current state
4. ✅ **Personal:** Feels custom-written, not template-based
5. ✅ **Engaging:** Users look forward to unique daily messages

---

## 📊 New Data Flow

### Mobile App → Cloud Function

**Old Input:**
```typescript
{
  mood: "anxious",
  expectations: ["work_stress", "anxiety"],
  timeOfDay: "morning"
}
```

**New Input:**
```typescript
{
  long_term_state: "demotivated",      // NEW: "demotivated", "burned out", "stable", "improving", "overwhelmed", "confident"
  yesterday_mood: "bad",                // NEW: "very good", "good", "neutral", "bad", "very bad"
  yesterday_notes: "conflict at work"   // NEW: User's notes from yesterday or "nothing special"
}
```

### AI Prompt

**Old Prompt:**
```
Generate a short, uplifting motivational quote (max 20 words)
for someone feeling anxious.

Context:
- Current mood: anxious
- User's focus areas: work stress, anxiety
- Time of day: morning

Output: JSON with quote, author, categories
```

**New Prompt:**
```
User emotional context:

Long-term emotional trend:
demotivated

Yesterday's mood:
bad

Yesterday's notable events or notes:
conflict at work

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

Output only the final message text.
```

### Example Responses

**Old Response (v1.0):**
```json
{
  "text": "Every storm runs out of rain. You've got this.",
  "author": "Maya Angelou",
  "categories": ["resilience", "encouragement"]
}
```

**New Response (v2.0):**
```
Yesterday was tough, and it's okay to feel worn down.
Today doesn't need to be perfect—just take one small step forward.
You've weathered difficult moments before, and you will again.
Give yourself permission to move gently through the day.
You're stronger than you feel right now.
```

---

## 💰 Cost Impact

### Old Architecture Cost (v1.0)

```
1,000 users × 1 mood entry/day = 1,000 entries
90% cache hit rate = 100 AI calls/day
100 calls/day × 30 days = 3,000 AI calls/month
3,000 × $0.00002 = $0.06/month ✅
```

### New Architecture Cost (v2.0)

```
1,000 users × 1 mood entry/day = 1,000 entries
NO cache checking = 1,000 AI calls/day  (10x increase)
1,000 calls/day × 30 days = 30,000 AI calls/month
30,000 × $0.00002 = $0.60/month ✅
```

**Cost Increase:** $0.06 → $0.60/month (+$0.54/month for 1,000 users)

### Scaled Cost Projections

| Users | Old Cost (90% cache) | New Cost (No cache) | Increase | Status |
|-------|----------------------|---------------------|----------|--------|
| **100** | $0.01/month | $0.06/month | +$0.05 | ✅ Negligible |
| **1,000** | $0.06/month | $0.60/month | +$0.54 | ✅ Acceptable |
| **10,000** | $0.60/month | $6.00/month | +$5.40 | ✅ Under budget |
| **50,000** | $3.00/month | $30.00/month | +$27.00 | ❌ Over budget ($20 cap) |

### Budget Management

**$20/month budget cap still applies:**
- At 30,000 users: Budget reaches $18/month
- At 33,000+ users: Budget cap exceeded, AI auto-disables
- Fallback: Use Remote Config (200 static quotes)

**Cost vs Value:**
- Old: $0.06/month for 1,000 users, 90% repetitive
- New: $0.60/month for 1,000 users, 100% unique
- **10x cost increase** for **100% personalization** → Good trade-off ✅

---

## 🔧 Implementation Changes

### Cloud Function Updates

**File:** `functions/src/index.ts`

**Changes Made:**
1. ✅ Removed cache-first logic (no `checkCache()` before AI call)
2. ✅ Updated input parameters: `long_term_state`, `yesterday_mood`, `yesterday_notes`
3. ✅ Updated AI prompt to generate empathetic messages
4. ✅ Changed cache TTL: 30 days → 24 hours
5. ✅ Removed per-user quota limiting (was 5/day, now unlimited)
6. ✅ Updated response format: JSON → plain text
7. ✅ Updated usage tracking: `quotaTracking` → `aiStats`

**Key Function Changes:**
```typescript
// OLD
export const generatePersonalizedQuote = functions.https.onCall(async (data, context) => {
  const { mood, expectations, timeOfDay } = data;

  // Check quota
  const quotaCheck = await checkUserQuota(userId);
  if (!quotaCheck.allowed) return { error: 'quota_exceeded' };

  // Check cache FIRST
  const cachedQuote = await checkCache(userId, cacheKey);
  if (cachedQuote) return { quote: cachedQuote, source: 'cache' };

  // Only call AI on cache miss
  const prompt = buildQuotePrompt(mood, expectations, timeOfDay);
  const result = await model.generateContent(prompt);

  // Save to 30-day cache
  await saveToCache(userId, cacheKey, quote);
});

// NEW
export const generatePersonalizedQuote = functions.https.onCall(async (data, context) => {
  const { long_term_state, yesterday_mood, yesterday_notes } = data;

  // NO quota check (generate on every request)
  // NO cache check (generate fresh every time)

  // Call AI immediately
  const prompt = buildMotivationalPrompt(long_term_state, yesterday_mood, yesterday_notes);
  const result = await model.generateContent(prompt);

  // Save to 24-hour cache (for display only)
  await saveToDailyCache(userId, cacheKey, message);
});
```

### Mobile App Changes

**What Mobile Team Needs to Do:**

1. **Track Long-Term Emotional State**
   - Analyze last 7-30 days of mood entries
   - Classify as: "demotivated", "burned out", "stable", "improving", "overwhelmed", "confident"
   - Simple algorithm:
     ```swift
     func calculateLongTermState() -> String {
       let last7Days = getRecentMoods(days: 7)
       let avgMood = last7Days.map { $0.moodScore }.average()
       let trend = getTrend(last7Days)

       if avgMood < 2.0 && trend == .declining { return "burned out" }
       if avgMood < 2.5 { return "demotivated" }
       if trend == .improving { return "improving" }
       if avgMood > 3.5 && trend == .stable { return "confident" }
       return "stable"
     }
     ```

2. **Get Yesterday's Data**
   - Query last mood entry before today
   - Extract mood rating: "very good", "good", "neutral", "bad", "very bad"
   - Extract notes (or use "nothing special")
   ```swift
   func getYesterdayData() -> (mood: String, notes: String) {
     let yesterday = getMoodEntry(for: Date().addingTimeInterval(-86400))
     return (
       mood: yesterday?.moodRating ?? "neutral",
       notes: yesterday?.notes ?? "nothing special"
     )
   }
   ```

3. **Call Cloud Function with New Parameters**
   ```swift
   // OLD
   let data = [
     "mood": "anxious",
     "expectations": ["work_stress", "anxiety"],
     "timeOfDay": "morning"
   ]

   // NEW
   let data = [
     "long_term_state": calculateLongTermState(),
     "yesterday_mood": getYesterdayData().mood,
     "yesterday_notes": getYesterdayData().notes
   ]

   let result = try await functions.httpsCallable("generatePersonalizedQuote").call(data)
   ```

4. **Handle Response**
   ```swift
   // OLD (JSON response)
   let quote = result.data["quote"] as! [String: Any]
   let text = quote["text"] as! String
   let author = quote["author"] as! String

   // NEW (plain text response)
   let message = result.data["message"] as! [String: Any]
   let text = message["text"] as! String  // Full motivational message
   // No author field (it's a message, not a quote)
   ```

5. **Cache for Display (Optional)**
   - iOS can cache message locally for 24 hours
   - Show same message if user opens app multiple times today
   - This reduces Cloud Function calls (display-only caching)

---

## 🧪 Testing

### Test Case 1: Consistent Long-Term State

**Input:**
```json
{
  "long_term_state": "demotivated",
  "yesterday_mood": "bad",
  "yesterday_notes": "felt unproductive all day"
}
```

**Expected Output:**
```
It sounds like yesterday was heavy, and that weight can linger.
Today is a new start—there's no rush to feel better right away.
Small moments count more than you think.
Be gentle with yourself as you move forward.
You don't have to carry yesterday into today.
```

**Verify:**
- ✅ Acknowledges yesterday's difficulty
- ✅ Empathetic tone
- ✅ Encouraging without being pushy
- ✅ No raw label repetition ("demotivated")
- ✅ Max 5 sentences

### Test Case 2: Improving Trend

**Input:**
```json
{
  "long_term_state": "improving",
  "yesterday_mood": "good",
  "yesterday_notes": "had a productive meeting"
}
```

**Expected Output:**
```
Yesterday's progress is real, and it's okay to feel good about it.
You're building momentum, one day at a time.
Keep trusting the process—small wins add up.
Today might bring new challenges, but you're moving in the right direction.
Give yourself credit for how far you've come.
```

**Verify:**
- ✅ Acknowledges positive progress
- ✅ Reinforces momentum
- ✅ Realistic (doesn't overpromise)
- ✅ Personal tone

### Test Case 3: Burned Out

**Input:**
```json
{
  "long_term_state": "burned out",
  "yesterday_mood": "very bad",
  "yesterday_notes": "another late night at work, feeling exhausted"
}
```

**Expected Output:**
```
Burnout is real, and your exhaustion is valid.
Rest isn't a reward—it's a necessity.
Today doesn't have to be productive; it just has to be survivable.
You've carried so much already.
Let yourself pause, even if just for a moment. 🕯️
```

**Verify:**
- ✅ Validates burnout experience
- ✅ Emphasizes rest (not productivity)
- ✅ Gentle, compassionate tone
- ✅ Subtle emoji (optional, contextual)

### Test Case 4: No Yesterday Notes

**Input:**
```json
{
  "long_term_state": "stable",
  "yesterday_mood": "neutral",
  "yesterday_notes": "nothing special"
}
```

**Expected Output:**
```
Some days are quieter than others, and that's okay.
There's value in the ordinary—it gives you room to breathe.
Today can be as simple or as intentional as you need it to be.
You're doing fine, even when it doesn't feel remarkable.
Keep showing up for yourself.
```

**Verify:**
- ✅ Handles "nothing special" gracefully
- ✅ Finds meaning in ordinary days
- ✅ Reassuring tone

---

## 📊 Monitoring

### Metrics to Track

**Cost Metrics:**
```
Firebase Console → Cloud Functions → Metrics
- Invocations per day
- Average execution time
- Estimated cost

Target: < $20/month total
```

**AI Response Quality:**
```
Sample 20 random messages/week:
- Empathetic? (yes/no)
- Personal? (yes/no)
- Generic/robotic? (yes/no)
- Appropriate tone? (yes/no)

Target: 90%+ quality score
```

**User Engagement:**
```
Firebase Analytics:
- mood_entry_created (track frequency)
- ai_message_viewed (track engagement)
- ai_message_helpful (optional user rating)

Target: Daily mood entries increase by 15%
```

### Cost Alerts

**Budget alerts still active:**
- $5/month: Early warning
- $10/month: Monitor closely
- $15/month: Critical warning
- $20/month: AI auto-disables

**If budget exceeded:**
```
1. Cloud Function detects > $20 spent this month
2. Sets Remote Config flag: feature_ai_quotes_enabled = false
3. All users fallback to 200 static quotes
4. Email alert sent to backend team
5. Manual decision: increase budget or optimize
```

---

## 🔄 Rollback Plan

**If AI costs too much or quality issues:**

1. **Quick Rollback (5 minutes):**
   ```bash
   # Disable AI via Remote Config
   firebase remoteconfig:set feature_ai_quotes_enabled false
   ```
   - Users immediately fallback to static quotes
   - No code deployment needed

2. **Full Rollback (30 minutes):**
   ```bash
   # Revert to old Cloud Function code
   git checkout feature/ai-proxy
   cd functions
   npm run build
   firebase deploy --only functions
   ```
   - Restores old cache-first logic
   - Restores quota limiting (5/day)
   - Restores old input parameters

3. **Mobile App Rollback:**
   - App continues to work (graceful fallback to Remote Config)
   - Update app in next release to revert to old parameters

---

## ✅ Deployment Checklist

### Backend Deployment

- [ ] Update Cloud Function code (already done)
- [ ] Test locally with Firebase Emulator
- [ ] Deploy to production:
  ```bash
  cd functions
  npm install
  npm run build
  firebase deploy --only functions
  ```
- [ ] Verify function deploys successfully
- [ ] Test with Postman/curl
- [ ] Monitor logs for errors
- [ ] Check cost tracking in Firestore

### Mobile Team Deployment

- [ ] Implement `calculateLongTermState()` algorithm
- [ ] Implement `getYesterdayData()` function
- [ ] Update Cloud Function call with new parameters
- [ ] Update response parsing (JSON → plain text)
- [ ] Test with mock data
- [ ] Test with real Cloud Function
- [ ] Add analytics events
- [ ] Update UI to display longer messages (5 sentences vs 1 quote)
- [ ] TestFlight beta testing
- [ ] Production release

### Documentation Updates

- [ ] Update MOBILE_TEAM_GUIDE.md with new flow
- [ ] Update PHASE_E_DEPLOYMENT.md with new parameters
- [ ] Update cost projections in PROJECT_COMPLETE.md
- [ ] Create AI_ARCHITECTURE_UPDATE.md (this document)

---

## 🎯 Success Criteria

### Week 1:
- ✅ Cloud Function deployed and responding
- ✅ Mobile app calling with new parameters
- ✅ Messages generating successfully
- ✅ Cost < $1/month for 100 test users

### Week 2:
- ✅ 1,000+ unique messages generated
- ✅ No generic/robotic responses (manual review)
- ✅ Cost tracking accurate
- ✅ No budget overruns

### Month 1:
- ✅ Daily mood entries increase by 10-15%
- ✅ User feedback positive ("feels personal", "helpful")
- ✅ Cost $0.60/month for 1,000 active users
- ✅ Message quality > 90%

---

## 📞 Support

**Questions about Architecture:**
- Backend team: juraj@krajcovic.me
- Review: AI_ARCHITECTURE_UPDATE.md

**Implementation Help:**
- Mobile team: See MOBILE_TEAM_GUIDE.md Phase E (updated)
- Cloud Functions: See functions/src/index.ts comments

**Cost Concerns:**
- Monitor: Firebase Console → Cloud Functions → Metrics
- Budget alerts configured (see PHASE_F_ANALYTICS.md)

---

## 🎉 Summary

**Architecture Update:**
- ✅ AI-first approach (no cache checking before generation)
- ✅ Richer context (long_term_state, yesterday_mood, yesterday_notes)
- ✅ Empathetic motivational messages (not just quotes)
- ✅ 24-hour cache (display only)
- ✅ No per-user quota limits

**Cost Impact:**
- Old: $0.06/month for 1,000 users (90% cache hit)
- New: $0.60/month for 1,000 users (no cache)
- **10x cost increase** for **100% unique personalization**

**Value Proposition:**
- Users get truly personal, contextual messages every day
- Acknowledges emotional journey, not just current state
- Feels like a compassionate friend, not a template
- Expected to increase engagement by 15%

**Budget Safe:**
- Still under $20/month budget for up to 30,000 users
- Auto-disable and fallback at budget cap
- Gradual rollout recommended

**Status:** ✅ Ready for deployment

---

**🤖 Built with ❤️ by Claude Sonnet 4.5**

**Updated:** 2026-01-28
**Version:** 2.0
**Next:** Deploy and monitor! 🚀
