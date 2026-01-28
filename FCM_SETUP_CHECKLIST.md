# FCM Setup Checklist

Quick reference for setting up Firebase Cloud Messaging for Happify.

## ✅ Backend Setup (15 minutes)

### 1. Enable FCM
- [ ] Go to Firebase Console → Cloud Messaging
- [ ] Verify FCM is enabled (automatic)
- [ ] Note: No additional configuration needed

### 2. Get APNs Credentials

**Option A: APNs Authentication Key (Recommended)**
- [ ] Go to Apple Developer Portal → Keys
- [ ] Create new key with APNs enabled
- [ ] Download .p8 file
- [ ] Note Key ID and Team ID

**Option B: APNs Certificate**
- [ ] Go to Apple Developer Portal → Certificates
- [ ] Create APNs Production certificate
- [ ] Download .cer file
- [ ] Convert to .p12 in Keychain Access

### 3. Upload to Firebase
- [ ] Firebase Console → Project Settings → Cloud Messaging
- [ ] iOS app configuration section
- [ ] Upload .p8 key OR .p12 certificate
- [ ] Enter Key ID/Team ID (for .p8) or password (for .p12)
- [ ] Save changes

### 4. Verify Cloud Function
- [ ] Check `sendPersonalizedNotifications` is deployed
- [ ] Run: `firebase functions:list`
- [ ] Should see function with schedule trigger

---

## 📱 iOS Setup (4-6 hours)

See **MOBILE_TEAM_GUIDE.md Phase D** for complete code.

### 1. Enable Capabilities (5 mins)
- [ ] Xcode → Target → Signing & Capabilities
- [ ] Add "Push Notifications"
- [ ] Add "Background Modes" → Check "Remote notifications"

### 2. Create AppDelegate (30 mins)
```swift
class AppDelegate: UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
    // Handle APNs token registration
    // Forward token to FCM
    // Save FCM token to Firestore
    // Handle notification taps
}
```

- [ ] Create `App/AppDelegate.swift`
- [ ] Implement all required methods
- [ ] Connect to SwiftUI App via `@UIApplicationDelegateAdaptor`

### 3. Update NotificationService (1 hour)
- [ ] Add FCM token registration
- [ ] Save token to Firestore: `users/{uid}/profile/fcmToken`
- [ ] Handle token refresh
- [ ] Keep local notification fallback

### 4. Add User Preferences (2 hours)
- [ ] Create notification settings UI
- [ ] Allow user to set notification time
- [ ] Save to Firestore:
  ```json
  {
    "notificationHour": 20,
    "notificationMinute": 0
  }
  ```
- [ ] Validate input (0-23 hours, 0-59 minutes)

### 5. Handle Notification Taps (1 hour)
- [ ] Navigate to mood entry screen
- [ ] Log analytics event
- [ ] Handle app state (background/terminated)

---

## 🧪 Testing (30 minutes)

### Test 1: Console Test Message
- [ ] Firebase Console → Cloud Messaging → New notification
- [ ] Title: "Happify"
- [ ] Text: "Test message"
- [ ] Target: Single device (paste FCM token from logs)
- [ ] Send
- [ ] ✅ Notification received on device

### Test 2: Verify Token in Firestore
- [ ] Open Firestore Console
- [ ] Navigate to `users/{your-uid}/profile`
- [ ] ✅ See `fcmToken` field with long string

### Test 3: Scheduled Notification
- [ ] Set notification time to 2 minutes from now
- [ ] Save in Firestore
- [ ] Wait 2 minutes
- [ ] ✅ Notification received at exact time

### Test 4: Notification Tap
- [ ] Receive notification
- [ ] Tap it
- [ ] ✅ App opens to mood entry screen

### Test 5: Background Delivery
- [ ] Close app completely
- [ ] Wait for scheduled notification
- [ ] ✅ Notification received while app closed

---

## 🐛 Troubleshooting

### No Notifications Received

**Check:**
1. APNs certificate/key uploaded? → Firebase Console
2. Notifications enabled on device? → iOS Settings → Happify
3. FCM token saved? → Firestore Console
4. Cloud Function running? → `firebase functions:log`

**Solutions:**
```bash
# Check function status
firebase functions:list

# View recent logs
firebase functions:log --only sendPersonalizedNotifications -n 20

# Verify in Firestore
# Go to users/{uid}/profile → look for fcmToken
```

### Token Not Saving

**Error in logs:** "Failed to save FCM token"

**Fix:**
1. Check Firestore security rules allow writes
2. Verify user is authenticated
3. Check FCM token is not nil

### Wrong Time Zone

**Issue:** Notifications at wrong time

**Fix:**
- Store user timezone in profile
- Convert to UTC in Cloud Function
- Or use consistent timezone (UTC)

---

## 📊 Monitoring

### Check Delivery Metrics
```
Firebase Console → Cloud Messaging → Reports
```

**Metrics to watch:**
- Notifications sent
- Delivery rate (target: >95%)
- Open rate
- Errors

### Check Function Logs
```bash
firebase functions:log --only sendPersonalizedNotifications
```

**Healthy logs:**
```
✅ Checking notifications for 20:00
✅ Sent 15 notifications
✅ Sent notification to user abc123
```

### Check Costs
- FCM: $0 (always free)
- AI messages: ~$0.00002 per notification
- Cloud Functions: $0 (within free tier)

**Total: ~$0-0.60/month**

---

## ✅ Completion Criteria

**Backend:**
- [x] FCM enabled
- [x] APNs credentials uploaded
- [x] Test notification sent successfully
- [x] Cloud Function deployed and running

**iOS:**
- [ ] Push capabilities enabled
- [ ] AppDelegate implemented
- [ ] FCM token registration working
- [ ] Token saving to Firestore
- [ ] Notification preferences UI complete
- [ ] Tap handling implemented

**Testing:**
- [ ] Console test notification works
- [ ] Token visible in Firestore
- [ ] Scheduled notification received
- [ ] Tap opens app correctly
- [ ] Background delivery working

**Production:**
- [ ] Delivery rate >95%
- [ ] No cost overruns
- [ ] User feedback positive
- [ ] Analytics tracking

---

## 🎯 Success Indicators

**Week 1:**
✅ Notifications sending reliably
✅ Delivery rate >90%
✅ Zero crashes related to notifications

**Week 2:**
✅ Open rate tracked and improving
✅ Users engage after notification
✅ AI messages generating (if enabled)

**Month 1:**
✅ Daily active users increase
✅ Mood check frequency increase
✅ Positive user feedback
✅ Cost <$1/month

---

## 📱 Quick Links

**Firebase Console:**
https://console.firebase.google.com/project/happify-2-prod/settings/cloudmessaging

**Apple Developer:**
https://developer.apple.com/account/resources/certificates/list

**Full Guide:**
- Backend: PHASE_D_DEPLOYMENT.md
- iOS: MOBILE_TEAM_GUIDE.md Phase D

**Support:**
- Backend team: juraj@krajcovic.me
- GitHub Issues: Report bugs

---

## 🚀 Ready to Deploy!

**Estimated Time:**
- Backend setup: 15 minutes
- iOS integration: 4-6 hours
- Testing: 30 minutes

**Total: ~5-7 hours** end-to-end

**Impact:** Daily reminders → Increased engagement → Better habit formation

Let's enable push notifications! 📲
