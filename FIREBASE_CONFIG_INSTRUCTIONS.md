# Firebase Configuration for Mobile Team

## 📱 GoogleService-Info.plist

**IMPORTANT: This file contains sensitive API keys and should NOT be committed to Git.**

### For Backend Team: How to Share Config File

The `GoogleService-Info.plist` file has been generated and is located in this repository, but it's in `.gitignore` to keep it secure.

**Secure sharing options:**

1. **Recommended: 1Password / LastPass / Bitwarden**
   - Upload as secure note
   - Share via team vault

2. **Alternative: Firebase Console**
   - Mobile team can download directly from Firebase Console
   - Project Settings → Your apps → iOS app → Download config file

3. **For Development Only: Direct Transfer**
   - Send via encrypted email or Slack DM
   - Delete after mobile team receives it

### For Mobile Team: How to Get Config File

**Option 1: Download from Firebase Console** (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **Happify 2 Production** (`happify-2-prod`)
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Find **Happify 2 iOS** app
6. Click **Download GoogleService-Info.plist**

**Option 2: Receive from Backend Team**

Ask backend team to share via secure method (1Password, etc.)

### Integration Steps

Once you have the file:

1. **Add to Xcode project:**
   - Drag `GoogleService-Info.plist` into project navigator
   - Ensure "Copy items if needed" is checked
   - Add to all targets (app, widgets, extensions)

2. **Add to .gitignore:**
   ```gitignore
   # Firebase
   GoogleService-Info.plist
   ```

3. **Verify integration:**
   - Build and run app
   - Check console for "✅ Firebase configured"
   - Check for anonymous auth success

### Project Details

- **Project ID:** `happify-2-prod`
- **Project Number:** `496049393735`
- **iOS Bundle ID:** `com.happify.happify2`
- **iOS App ID:** `1:496049393735:ios:e7500c84cbec05102a6162`

### Firebase Console Access

**URL:** https://console.firebase.google.com/project/happify-2-prod

**Request access from:** juraj@krajcovic.me (Project Owner)

**Permissions needed:**
- Editor (for development)
- Viewer (for read-only access)

### What's Configured

✅ **Firestore Database**
- Location: `us-east1`
- Security rules deployed
- Ready for mood entry sync

✅ **Authentication**
- Anonymous auth enabled
- Ready for user sign-in

✅ **iOS App Registered**
- Bundle ID: `com.happify.happify2`
- Configuration file generated

⏸️ **Not Yet Configured:**
- Cloud Functions (Phase E)
- Remote Config (Phase B)
- Cloud Messaging / FCM (Phase D)
- Analytics (Phase F)

### Security Notes

🔒 **API Key in GoogleService-Info.plist:**
- This is a **client API key** (safe for iOS app)
- Protected by iOS app bundle ID restrictions
- Different from **server API key** (never in app)

🔒 **Gemini API Key:**
- Will be stored in Cloud Functions (Phase E)
- Never exposed in iOS app
- Accessed only via secure proxy

### Testing the Integration

After adding `GoogleService-Info.plist`:

```swift
import FirebaseCore

FirebaseApp.configure()
print("✅ Firebase configured")
```

Expected console output:
```
✅ Firebase configured
✅ Signed in anonymously: <user_id>
```

### Troubleshooting

**Issue:** "Firebase not configured" error
- Ensure `GoogleService-Info.plist` is in project
- Verify file is added to target
- Check bundle ID matches: `com.happify.happify2`

**Issue:** Bundle ID mismatch
- Current bundle ID must be: `com.happify.happify2`
- Or contact backend team to register different bundle ID

**Issue:** Need different bundle ID
- Contact backend team with your bundle ID
- Backend team will register new iOS app
- You'll receive new `GoogleService-Info.plist`

### Next Steps

1. ✅ Get `GoogleService-Info.plist` (this step)
2. Follow [MOBILE_TEAM_GUIDE.md](./MOBILE_TEAM_GUIDE.md) Phase A
3. Integrate Firebase SDK via SPM
4. Initialize Firebase in app
5. Test authentication
6. Proceed to Phase B when backend completes it

### Support

- **Backend Issues:** Contact backend team
- **Integration Help:** See [MOBILE_TEAM_GUIDE.md](./MOBILE_TEAM_GUIDE.md)
- **Firebase Console:** https://console.firebase.google.com/

---

**Created:** 2026-01-28
**Last Updated:** 2026-01-28
**Backend Phase:** A (Firebase Setup) ✅
