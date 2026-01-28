# Phase B: Remote Config Deployment Guide

## ✅ What's Been Prepared

### Quotes Database (Complete)

**File:** `quotes-database.json` (200 quotes)

**Organization:**
- **200 unique motivational quotes**
- Organized by mood (sad, happy, anxious, grateful, calm, etc.)
- Categorized (resilience, mindfulness, courage, self-care, etc.)
- Authors included (famous figures + anonymous)
- Diverse themes covering all user needs

### Remote Config Template

**File:** `remoteconfig.template.json`

**Parameters:**
- `quotes_database` - 200 quotes (JSON array)
- `fallback_notification_messages` - Static messages
- `feature_ai_quotes_enabled` - AI on/off toggle
- `ai_daily_quota_per_user` - Rate limit (default: 5)
- `cache_ttl_days` - Cache duration (default: 30)
- `maintenance_mode` - Emergency kill switch

---

## 🚀 Deployment Steps

### Option 1: Firebase Console (Recommended for First Time)

#### Step 1: Go to Remote Config

```
https://console.firebase.google.com/project/happify-2-prod/config
```

#### Step 2: Add Parameters

**Parameter 1: quotes_database**
1. Click "Add parameter"
2. Key: `quotes_database`
3. Data type: JSON
4. Default value: Copy entire content from `quotes-database.json`
5. Description: "200+ motivational quotes organized by categories and moods"
6. Click "Save"

**Parameter 2: fallback_notification_messages**
1. Click "Add parameter"
2. Key: `fallback_notification_messages`
3. Data type: JSON
4. Default value:
   ```json
   [
     "Time for your daily mood check ✨",
     "How's your heart feeling today?",
     "Your daily moment of reflection awaits",
     "Time to check in with yourself",
     "Ready to track your mood?",
     "Let's check in on your wellness"
   ]
   ```
5. Description: "Fallback notification messages when AI is unavailable"
6. Click "Save"

**Parameter 3: feature_ai_quotes_enabled**
1. Click "Add parameter"
2. Key: `feature_ai_quotes_enabled`
3. Data type: Boolean
4. Default value: `true`
5. Description: "Feature flag to enable/disable AI quote generation globally"
6. Click "Save"

**Parameter 4: ai_daily_quota_per_user**
1. Click "Add parameter"
2. Key: `ai_daily_quota_per_user`
3. Data type: Number
4. Default value: `5`
5. Description: "Number of AI quotes per day per user"
6. Click "Save"

**Parameter 5: cache_ttl_days**
1. Click "Add parameter"
2. Key: `cache_ttl_days`
3. Data type: Number
4. Default value: `30`
5. Description: "Cache time-to-live in days for AI-generated quotes"
6. Click "Save"

**Parameter 6: maintenance_mode**
1. Click "Add parameter"
2. Key: `maintenance_mode`
3. Data type: Boolean
4. Default value: `false`
5. Description: "Enable maintenance mode (disables AI features)"
6. Click "Save"

#### Step 3: Publish Changes

1. Review all parameters
2. Click "Publish changes"
3. Add description: "Initial deployment - 200 quotes database"
4. Click "Publish"

---

### Option 2: Firebase CLI (Automated)

#### Step 1: Prepare Upload Script

**File: `deploy-remote-config.sh`**
```bash
#!/bin/bash

echo "🚀 Deploying Remote Config for Happify..."

# Get quotes database
QUOTES=$(cat quotes-database.json | jq -c .)

# Create temporary config file
cat > temp-remote-config.json <<EOF
{
  "parameters": {
    "quotes_database": {
      "defaultValue": {
        "value": "$QUOTES"
      },
      "description": "200+ motivational quotes organized by categories and moods",
      "valueType": "JSON"
    },
    "fallback_notification_messages": {
      "defaultValue": {
        "value": "[\"Time for your daily mood check ✨\", \"How's your heart feeling today?\", \"Your daily moment of reflection awaits\", \"Time to check in with yourself\"]"
      },
      "description": "Fallback notification messages when AI is unavailable",
      "valueType": "JSON"
    },
    "feature_ai_quotes_enabled": {
      "defaultValue": {
        "value": "true"
      },
      "description": "Feature flag to enable/disable AI quote generation globally",
      "valueType": "BOOLEAN"
    },
    "ai_daily_quota_per_user": {
      "defaultValue": {
        "value": "5"
      },
      "description": "Number of AI quotes per day per user (default: 5)",
      "valueType": "NUMBER"
    },
    "cache_ttl_days": {
      "defaultValue": {
        "value": "30"
      },
      "description": "Cache time-to-live in days for AI-generated quotes (default: 30)",
      "valueType": "NUMBER"
    },
    "maintenance_mode": {
      "defaultValue": {
        "value": "false"
      },
      "description": "Enable maintenance mode (disables AI features, shows fallback quotes)",
      "valueType": "BOOLEAN"
    }
  }
}
EOF

# Deploy
firebase deploy --only remoteconfig

# Cleanup
rm temp-remote-config.json

echo "✅ Remote Config deployed successfully!"
```

#### Step 2: Make Script Executable

```bash
chmod +x deploy-remote-config.sh
```

#### Step 3: Run Deployment

```bash
./deploy-remote-config.sh
```

---

## 🧪 Testing Remote Config

### Test 1: Verify in Firebase Console

1. Go to Remote Config
2. Check all 6 parameters are present
3. Verify `quotes_database` has 200 entries
4. Check default values are correct

### Test 2: Fetch in iOS App

See `MOBILE_TEAM_GUIDE.md` Phase B for iOS integration.

**Expected behavior:**
```swift
// Fetch Remote Config
try await RemoteConfigService.shared.fetchAndActivate()

// Should see 200 quotes
print("Loaded \(RemoteConfigService.shared.quotesDatabase.count) quotes")
// Output: Loaded 200 quotes from Remote Config
```

### Test 3: Update Without App Release

1. Go to Firebase Console → Remote Config
2. Edit `fallback_notification_messages`
3. Add new message: "Your wellness matters today"
4. Publish changes
5. Wait 12 hours (cache refresh interval)
6. iOS app should receive new message automatically

---

## 📊 Quotes Database Overview

### Total Quotes: 200

**By Mood:**
- Sad / Depressed: ~50 quotes
- Anxious / Stressed: ~40 quotes
- Happy / Grateful: ~30 quotes
- Uncertain / Lost: ~25 quotes
- Overwhelmed / Tired: ~20 quotes
- Other moods: ~35 quotes

**By Category:**
- Resilience & Perseverance: ~35 quotes
- Motivation & Action: ~30 quotes
- Self-Care & Self-Love: ~25 quotes
- Mindfulness & Presence: ~20 quotes
- Courage & Bravery: ~20 quotes
- Hope & New Starts: ~18 quotes
- Confidence & Self-Worth: ~15 quotes
- Gratitude & Contentment: ~12 quotes
- Healing & Growth: ~25 quotes

**Authors:**
- Famous quotes: ~120 (Buddha, Einstein, Roosevelt, etc.)
- Anonymous wisdom: ~80

**Examples:**

**For Sad Mood:**
> "The only way out is through." - Robert Frost
>
> "In the midst of winter, I found there was, within me, an invincible summer." - Albert Camus

**For Anxious Mood:**
> "Peace comes from within. Do not seek it without." - Buddha
>
> "Calm mind brings inner strength and self-confidence." - Dalai Lama

**For Self-Care:**
> "You can't pour from an empty cup. Take care of yourself first." - Anonymous
>
> "Self-care is how you take your power back." - Lalah Delia

---

## 🎨 Customization

### Adding New Quotes

1. Edit `quotes-database.json`
2. Add quote in this format:
   ```json
   {
     "text": "Your quote here",
     "author": "Author Name",
     "categories": ["category1", "category2"],
     "moods": ["mood1", "mood2"]
   }
   ```
3. Deploy updates:
   ```bash
   ./deploy-remote-config.sh
   ```
   Or upload manually via Firebase Console

### Updating Feature Flags

**Disable AI quotes globally:**
1. Firebase Console → Remote Config
2. Edit `feature_ai_quotes_enabled`
3. Change to `false`
4. Publish changes
5. All iOS apps will stop calling AI (use Remote Config quotes only)

**Adjust user quota:**
1. Edit `ai_daily_quota_per_user`
2. Change from `5` to desired value (e.g., `3` to reduce costs)
3. Publish changes

**Enable maintenance mode:**
1. Edit `maintenance_mode`
2. Change to `true`
3. Publish changes
4. Disables AI features, shows fallback quotes only

---

## 📱 Mobile Team Integration

### iOS Integration Steps

See **MOBILE_TEAM_GUIDE.md Phase B** for complete integration.

**Summary:**
1. Create `RemoteConfigService.swift`
2. Fetch Remote Config on app launch
3. Parse `quotes_database` JSON
4. Update `QuoteService` to use Remote Config quotes
5. Fallback to local `quotes.json` if offline

**Code Example:**
```swift
// Fetch on app launch
Task {
    try? await RemoteConfigService.shared.fetchAndActivate()
}

// Use quotes
let quotes = remoteConfigService.getQuotes(for: "sad", expectations: ["resilience"])
```

---

## 🔄 Update Strategy

### Cache Behavior

**iOS App:**
- Fetches Remote Config on launch
- Cache duration: 12 hours (production)
- Falls back to local quotes if offline
-

**Updating Quotes:**
1. Update `quotes-database.json`
2. Deploy to Remote Config
3. iOS apps fetch new quotes within 12 hours
4. No app update required!

### Versioning

**Track changes:**
1. Firebase Console shows version history
2. Can rollback to previous versions
3. Each publish creates new version
4. Description helps track changes

---

## 💰 Cost

**Remote Config:** FREE
- Unlimited fetches
- Unlimited parameters
- Unlimited updates

**Benefits:**
- Update quotes without app release
- A/B testing capability (future)
- Dynamic feature flags
- No infrastructure costs

---

## 🐛 Troubleshooting

### Issue: Quotes Not Showing in App

**Check:**
1. Remote Config published? (Firebase Console)
2. iOS app fetching? (Check logs)
3. JSON format valid? (Use JSON validator)
4. Network available? (Offline = local quotes used)

**Solution:**
```swift
// Force fetch (debug only)
let settings = RemoteConfigSettings()
settings.minimumFetchInterval = 0
remoteConfig.configSettings = settings
try await remoteConfig.fetchAndActivate()
```

### Issue: JSON Parse Error

**Check:**
- Valid JSON format (use jsonlint.com)
- Proper escaping of quotes
- No trailing commas
- Matching brackets

**Solution:**
Validate JSON before upload:
```bash
cat quotes-database.json | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
```

### Issue: Changes Not Appearing

**Reasons:**
- Cache interval not expired (12 hours)
- App not fetching on launch
- Network error during fetch

**Solution:**
```bash
# Clear app data (iOS simulator)
xcrun simctl uninstall booted com.happify.happify2

# Or wait 12 hours for cache expiration
```

---

## 📊 Success Metrics

### Week 1:
- ✅ Remote Config deployed
- ✅ 200 quotes available
- ✅ iOS app fetching successfully
- ✅ Users see diverse quotes

### Week 2:
- ✅ Zero quotes repeated (with 200 quotes)
- ✅ Update quotes without app release (test)
- ✅ Feature flags working
- ✅ Mobile team can manage content

### Month 1:
- ✅ 500+ mood checks with diverse quotes
- ✅ Users report variety
- ✅ Can update quotes anytime
- ✅ A/B test capability demonstrated

---

## ✅ Deployment Checklist

**Preparation:**
- [x] Quotes database created (200 quotes)
- [x] Remote Config template prepared
- [x] Deployment script ready

**Deployment:**
- [ ] Go to Firebase Console
- [ ] Add all 6 parameters
- [ ] Upload quotes database
- [ ] Verify JSON is valid
- [ ] Publish changes
- [ ] Test fetch in iOS app

**Validation:**
- [ ] All parameters visible in console
- [ ] Quotes count = 200
- [ ] iOS app can fetch
- [ ] Quotes display correctly
- [ ] Offline fallback works

---

## 🎯 Next Steps After Deployment

1. **Notify Mobile Team:**
   - Remote Config is live
   - Share MOBILE_TEAM_GUIDE.md Phase B
   - They can start integration

2. **Monitor Usage:**
   - Check Firebase Analytics
   - Track quote diversity
   - Monitor fetch success rate

3. **Plan Updates:**
   - Collect user feedback
   - Add seasonal quotes
   - Update based on popular moods

4. **Proceed to Phase C:**
   - Mood entry sync
   - Multi-device support
   - Cloud backup

---

## 📞 Support

**Firebase Console:**
https://console.firebase.google.com/project/happify-2-prod/config

**Documentation:**
- Firebase Remote Config: https://firebase.google.com/docs/remote-config
- iOS Integration: MOBILE_TEAM_GUIDE.md Phase B

**Contact:**
- Backend team: juraj@krajcovic.me
- Issues: GitHub Issues

---

**Phase B Status:** ✅ READY FOR DEPLOYMENT
**Database:** ✅ 200 quotes prepared
**Template:** ✅ Complete
**Next:** Deploy to Firebase Console

**Deployment Time:** 10-15 minutes
**Impact:** Instant quote variety + no app updates needed!

🤖 Built with ❤️ using Firebase Remote Config
