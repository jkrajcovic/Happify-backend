# Phase D: FCM Push Notifications Deployment Guide

## ✅ What's Already Implemented

### Cloud Function (Phase E) ✅

**Function:** `sendPersonalizedNotifications` (Already deployed in Phase E)

**Features:**
- Scheduled to run every minute (Pub/Sub)
- Checks users whose notification time matches current time
- Generates personalized messages via Gemini AI (budget-aware)
- Sends FCM push notifications
- Falls back to static messages if AI unavailable
- Comprehensive error handling

**Location:** `functions/src/index.ts` (lines 174-229)

---

## 🎯 Phase D Goals

Enable server-driven push notifications with:
- ✅ Personalized AI-generated messages
- ✅ User-configurable notification times
- ✅ Fallback to static messages
- ✅ iOS APNs integration via FCM
- ✅ Delivery tracking and monitoring

---

## 🚀 Backend Setup (Firebase Console)

### Step 1: Enable Cloud Messaging

1. Go to Firebase Console → Cloud Messaging
   ```
   https://console.firebase.google.com/project/happify-2-prod/settings/cloudmessaging
   ```

2. FCM is automatically enabled (no action needed)
3. Note: Server key is managed by Firebase automatically

### Step 2: Upload APNs Certificate (iOS)

**For Production (App Store):**

1. **Generate APNs Certificate:**
   - Go to Apple Developer Portal
   - Certificates, Identifiers & Profiles
   - Create new certificate → Apple Push Notification service SSL (Production)
   - Download certificate (.cer file)

2. **Convert to .p12:**
   ```bash
   # Open certificate in Keychain Access
   # Export as .p12 file with password
   ```

3. **Upload to Firebase:**
   - Firebase Console → Project Settings → Cloud Messaging
   - iOS app configuration
   - Upload APNs Certificate (.p12)
   - Enter certificate password

**For Development (Testing):**

1. Create APNs Development certificate
2. Upload to Firebase Console
3. Use for testing in Xcode simulator/device

**Alternative: APNs Authentication Key (Recommended)**

1. **Generate APNs Auth Key:**
   - Apple Developer Portal → Keys
   - Create new key with APNs enabled
   - Download .p8 file
   - Note Key ID and Team ID

2. **Upload to Firebase:**
   - Firebase Console → Project Settings → Cloud Messaging
   - iOS app configuration
   - Upload APNs Authentication Key (.p8)
   - Enter Key ID and Team ID

**Benefits of Auth Key:**
- ✅ Never expires (certificates expire yearly)
- ✅ Works for all apps in team
- ✅ Easier to manage

---

## 📱 iOS App Setup

See **MOBILE_TEAM_GUIDE.md Phase D** for complete integration.

### Summary of iOS Changes

**1. Enable Push Notifications Capability**
- Xcode → Target → Signing & Capabilities
- Add "Push Notifications"
- Add "Background Modes" → Check "Remote notifications"

**2. Create AppDelegate**
- Handle APNs token registration
- Forward token to FCM
- Handle notification taps

**3. Update NotificationService**
- Register for remote notifications
- Save FCM token to Firestore
- Handle local notification fallback

**4. Save User Notification Preferences**
- Allow users to set notification time
- Save to Firestore: `users/{uid}/profile`
- Fields: `notificationHour`, `notificationMinute`

---

## 🧪 Testing Procedures

### Test 1: Send Test Notification via Console

**Steps:**
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message" (or "New notification")
3. **Notification:**
   - Title: "Happify"
   - Text: "Test notification from Firebase Console"
4. **Target:**
   - Select "Single device"
   - Paste FCM token from iOS app logs
5. **Send test message**

**Expected:**
- Notification appears on device
- Tapping opens app

### Test 2: Verify FCM Token Saved

**Check Firestore:**
1. Go to Firestore → `users/{userId}/profile`
2. Should see: `fcmToken: "..."` field
3. Token should be ~150+ characters

**Check iOS Logs:**
```
✅ APNs token registered
✅ FCM token: eSxY...abc123
✅ FCM token saved to Firestore
```

### Test 3: Schedule Notification

**Setup:**
1. Set notification time to 2 minutes from now
2. Save in Firestore: `users/{uid}/profile`
   ```json
   {
     "notificationHour": 14,
     "notificationMinute": 30,
     "fcmToken": "..."
   }
   ```

**Wait:**
- 2 minutes

**Expected:**
- Notification received at exact time
- Message is personalized (or fallback if AI unavailable)

**Check Logs:**
```bash
firebase functions:log --only sendPersonalizedNotifications
```

Look for:
```
✅ Checking notifications for 14:30
✅ Sent notification to user abc123
```

### Test 4: AI-Generated Message

**Prerequisite:**
- Gemini API key set
- Budget not exceeded

**Expected Message:**
- Personalized based on user's expectations
- Different from static fallback messages
- Max 10-12 words

**Examples:**
- "How's your heart feeling today?"
- "Time to check in with your wellness"
- "Your daily moment of self-reflection awaits"

### Test 5: Fallback Messages

**Scenario:** Budget exceeded or AI unavailable

**Expected:**
- Static fallback message used
- From Remote Config: `fallback_notification_messages`
- Default: "Time for your daily mood check ✨"

### Test 6: Offline Notification Handling

**Steps:**
1. Turn off internet on device
2. Notification should queue
3. Turn on internet
4. Notification delivered

---

## 📊 Monitoring

### Check Notification Delivery

**Firebase Console:**
```
Cloud Messaging → Reports
```

**Metrics:**
- Notifications sent
- Delivery rate
- Open rate
- Errors

### Check Function Logs

```bash
firebase functions:log --only sendPersonalizedNotifications
```

**Expected Logs:**
```
✅ Checking notifications for HH:MM
✅ Sent X notifications
✅ Sent notification to user abc123
```

**Error Logs:**
```
⚠️ No users to notify at this time
❌ Failed to send notification to user abc123: error details
```

### Check Cost (Notifications)

**FCM Cost:** $0 (unlimited free notifications)

**AI Message Generation Cost:** ~$0.00002 per notification
- Only if AI enabled and budget available
- Falls back to static messages when budget tight

---

## 🎨 Customization

### Update Fallback Messages

**Option 1: Remote Config (Recommended)**
1. Firebase Console → Remote Config
2. Edit `fallback_notification_messages`
3. Add/remove messages:
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
4. Publish changes
5. Messages update in Cloud Functions within minutes

**Option 2: Modify Cloud Functions**
```typescript
// functions/src/index.ts
let message = 'Your custom default message';
```

### Adjust Notification Frequency

**Current:** Daily (user-configured time)

**To change:**
1. Modify `sendPersonalizedNotifications` schedule:
   ```typescript
   // Current: every 1 minutes
   export const sendPersonalizedNotifications = functions.pubsub
     .schedule('every 1 minutes')

   // Hourly:
   .schedule('every 1 hours')

   // Twice daily:
   .schedule('0 9,18 * * *') // 9 AM and 6 PM
   ```

2. Update query logic to match new schedule

### Customize Notification Appearance

**iOS (MOBILE_TEAM_GUIDE.md):**
```swift
// Notification sound
apns: {
  payload: {
    aps: {
      sound: 'your_sound.wav',
      badge: 1
    }
  }
}
```

**Notification Categories:**
```swift
// Add action buttons
UNNotificationCategory(
  identifier: "MOOD_REMINDER",
  actions: [
    UNNotificationAction(identifier: "CHECK_MOOD", title: "Check Now"),
    UNNotificationAction(identifier: "SNOOZE", title: "Remind Later")
  ]
)
```

---

## 🔒 Security & Privacy

### User Control

**Users can:**
- ✅ Set notification time
- ✅ Disable notifications (iOS settings)
- ✅ Snooze temporarily
- ✅ Change preferences anytime

**Cannot:**
- ❌ Access other users' tokens
- ❌ Send notifications to others
- ❌ See delivery status of others

### Token Security

**FCM Tokens:**
- ✅ Stored in Firestore with security rules
- ✅ Only user can read/write their own token
- ✅ Cloud Functions have admin access
- ✅ Tokens auto-refresh (handled by FCM SDK)

**Token Rotation:**
- FCM automatically rotates tokens
- iOS app handles `didReceiveRegistrationToken` updates
- New token saved to Firestore automatically

---

## 🐛 Troubleshooting

### Issue: Notifications Not Received

**Check:**
1. ✅ APNs certificate/key uploaded to Firebase?
2. ✅ FCM token saved to Firestore?
3. ✅ User has notifications enabled in iOS settings?
4. ✅ Notification time matches current time?
5. ✅ Cloud Function running? (check logs)

**Solutions:**
```bash
# Check if function is deployed
firebase functions:list

# Check recent logs
firebase functions:log --only sendPersonalizedNotifications -n 50

# Verify FCM token in Firestore
# Go to Firestore Console → users/{uid}/profile → fcmToken
```

### Issue: APNs Certificate Error

**Error:** "Invalid APNs certificate"

**Solution:**
1. Verify certificate matches bundle ID
2. Check certificate hasn't expired
3. Use production certificate for production app
4. Try APNs Auth Key (.p8) instead

### Issue: Token Not Saving to Firestore

**Check iOS Logs:**
```
❌ Failed to save FCM token: permission denied
```

**Solution:**
- Verify Firestore security rules allow writes to `users/{uid}/profile`
- Check user is authenticated
- Verify FCM token is valid (not nil)

### Issue: AI Messages Not Generating

**Check:**
1. Gemini API key set?
2. Budget not exceeded?
3. Cloud Functions logs show AI generation attempts?

**Fallback:**
- Should use static messages from Remote Config
- Check `fallback_notification_messages` parameter

### Issue: Notifications Sent at Wrong Time

**Check:**
1. Timezone handling:
   ```typescript
   const now = new Date();
   const currentHour = now.getHours(); // UTC timezone
   ```

2. User's timezone stored?
3. Query matching correct hour/minute?

**Solution:**
- Store user's timezone in Firestore
- Convert to UTC for comparison
- Or use user's local time consistently

---

## 💰 Cost Breakdown

### Firebase Cloud Messaging

**Cost:** $0 (FREE)
- Unlimited notifications
- No per-message charge
- Available on all Firebase plans

### Cloud Functions Execution

**Cost:** Minimal
- Runs every minute = 43,200 invocations/month
- Free tier: 2M invocations/month
- **Cost: $0** (well within free tier)

### AI Message Generation

**Cost per notification:** ~$0.00002
- Only when AI enabled and budget available
- Falls back to static messages to control costs

**Example:**
- 1,000 users × 1 notification/day × 30 days = 30,000 notifications
- 30,000 × $0.00002 = $0.60/month
- **With budget cap:** Falls back to free static messages

**Total Phase D Cost:** $0-0.60/month (mostly free)

---

## 📈 Success Metrics

### Week 1:
- ✅ FCM enabled and configured
- ✅ APNs certificate uploaded
- ✅ Test notifications working
- ✅ FCM tokens saving to Firestore

### Week 2:
- ✅ Scheduled notifications sending
- ✅ Users receiving daily reminders
- ✅ AI messages generating (if enabled)
- ✅ Delivery rate > 95%

### Month 1:
- ✅ 1,000+ notifications sent
- ✅ Open rate tracked
- ✅ Zero cost overruns
- ✅ Positive user feedback

---

## ✅ Deployment Checklist

### Backend Configuration
- [ ] FCM enabled in Firebase Console
- [ ] APNs certificate/key uploaded
- [ ] Test notification sent successfully
- [ ] Cloud Functions deployed (from Phase E)
- [ ] `sendPersonalizedNotifications` function running

### iOS Integration (Mobile Team)
- [ ] Push Notifications capability enabled
- [ ] Background Modes capability enabled
- [ ] AppDelegate created and configured
- [ ] FCM SDK integrated
- [ ] APNs token registration working
- [ ] FCM token saving to Firestore
- [ ] Notification preferences UI implemented
- [ ] User can set notification time

### Testing
- [ ] Test notification received on device
- [ ] FCM token visible in Firestore
- [ ] Scheduled notification received at correct time
- [ ] AI messages generating (if budget available)
- [ ] Fallback messages working
- [ ] Notification tap opens app

### Monitoring
- [ ] Firebase Console shows delivery metrics
- [ ] Cloud Functions logs accessible
- [ ] Cost tracking in place
- [ ] Alerts configured for errors

---

## 🎯 Next Steps After Deployment

### Immediate
1. Monitor delivery rates daily (first week)
2. Check user feedback on notification timing
3. Verify AI message quality
4. Adjust fallback messages if needed

### This Week
1. Analyze open rates
2. A/B test notification messages
3. Optimize send times based on engagement
4. Add more fallback message variations

### Next Month
1. Implement notification preferences UI
2. Add snooze functionality
3. Track notification-to-action conversion
4. Optimize AI prompts based on feedback

---

## 📱 User Experience

### Notification Flow

**Day 1 (First Use):**
1. User opens app
2. Permission prompt appears
3. User allows notifications
4. User sets preferred notification time (e.g., 8:00 PM)

**Every Day:**
1. 8:00 PM: Notification received
   - Title: "Happify"
   - Message: AI-generated or fallback
   - Sound: Default notification sound
   - Badge: 1

2. User taps notification
   - App opens to mood entry screen
   - User logs mood
   - Receives personalized quote

**Benefits:**
- ✅ Never miss daily mood check
- ✅ Personalized reminder messages
- ✅ Consistent habit building
- ✅ Engagement increase

---

## 📚 Additional Resources

### Firebase Documentation
- **FCM Setup:** https://firebase.google.com/docs/cloud-messaging
- **iOS Integration:** https://firebase.google.com/docs/cloud-messaging/ios/client
- **APNs Certificates:** https://firebase.google.com/docs/cloud-messaging/ios/certs

### Apple Documentation
- **APNs Overview:** https://developer.apple.com/documentation/usernotifications
- **Certificate Guide:** https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server

### Guides
- **Complete iOS Integration:** MOBILE_TEAM_GUIDE.md Phase D
- **Cloud Functions:** functions/README.md
- **Architecture:** IMPLEMENTATION_GUIDE.md Phase D

---

## 🆘 Support

**Firebase Console:**
https://console.firebase.google.com/project/happify-2-prod/settings/cloudmessaging

**Common Issues:**
- Certificate/key upload errors
- Token not saving to Firestore
- Notifications not received
- Delivery rate issues

**Contact:**
- Backend team: juraj@krajcovic.me
- Firebase Support: Firebase Console → Support
- GitHub Issues: For bugs and features

---

## 🎉 Summary

Phase D enables server-driven push notifications with:

**Completed in Phase E:**
- ✅ Cloud Function for scheduled notifications
- ✅ AI message generation
- ✅ Fallback to static messages
- ✅ Cost controls

**Phase D Tasks:**
- ✅ Enable FCM in Firebase Console
- ✅ Upload APNs certificate/key
- ✅ Mobile team implements iOS integration
- ✅ Test and verify delivery

**Benefits:**
- ✅ Personalized daily reminders
- ✅ Increased user engagement
- ✅ Habit formation support
- ✅ Zero cost for FCM (unlimited free)

**Cost:** $0-0.60/month (mostly free, AI optional)

**Status:** ✅ Ready for deployment

---

**Phase D: FCM Push Notifications**
**Deployment Time:** 30-45 minutes
**Mobile Integration:** 4-6 hours
**Impact:** Increased daily active users through reminders

🤖 Built with ❤️ using Firebase Cloud Messaging
