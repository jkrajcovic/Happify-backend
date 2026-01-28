# Phase C: Mood Entry Cloud Sync Deployment Guide

## ✅ What's Already Implemented

### Firestore Infrastructure (Phase A) ✅

**Firestore Database:** Already initialized with security rules

**Security Rules:** `firestore.rules` (validated and deployed)
- Users can only access their own data
- Mood entries stored in subcollection: `/users/{userID}/moodEntries/{entryID}`
- Secure read/write operations

**Location:** `firestore.rules` (deployed in Phase A)

---

## 🎯 Phase C Goals

Enable cloud backup and multi-device sync with:
- ✅ Automatic background sync of mood entries
- ✅ Multi-device support (same user, multiple devices)
- ✅ Offline-first architecture (local storage first, sync later)
- ✅ Conflict resolution for concurrent edits
- ✅ Pull-to-refresh for manual sync
- ✅ Sync status indicators

---

## 📊 Firestore Schema Design

### Collection Structure

```
/users/{userID}/
  ├── profile (document)
  │   ├── userName: String
  │   ├── selectedExpectations: [String]
  │   ├── notificationHour: Number (0-23)
  │   ├── notificationMinute: Number (0-59)
  │   ├── fcmToken: String (optional)
  │   ├── createdAt: Timestamp
  │   └── lastActive: Timestamp
  │
  └── moodEntries (subcollection)
      └── {entryID} (document)
          ├── moodType: String ("happy", "sad", "anxious", etc.)
          ├── note: String (optional, user's notes)
          ├── timestamp: Timestamp (when mood was logged)
          ├── quoteShown: Object (optional)
          │   ├── text: String
          │   ├── author: String
          │   ├── source: String ("local", "remote_config", "ai_generated")
          │   └── categories: [String]
          ├── expectations: [String] (user's focus areas at time of entry)
          ├── synced: Boolean (true if synced from device)
          ├── deviceID: String (which device created this entry)
          ├── createdAt: Timestamp (server timestamp)
          └── updatedAt: Timestamp (server timestamp)
```

### Document ID Strategy

**Option 1: Client-Generated UUID (Recommended)**
```swift
// iOS generates UUID locally
let entryID = UUID().uuidString
```

**Benefits:**
- ✅ Offline support (create entries without network)
- ✅ No ID conflicts across devices
- ✅ Immediate local save + background sync
- ✅ Simple conflict resolution

**Option 2: Firestore Auto-ID**
```swift
// Firestore generates ID
let entryRef = db.collection("users").document(userID).collection("moodEntries").document()
```

**Trade-offs:**
- ❌ Requires network to get ID
- ❌ Complex offline support

**Recommendation:** Use Option 1 (Client-Generated UUID)

---

## 🔄 Sync Strategy

### Offline-First Architecture

**Flow:**
1. User creates mood entry
2. Save to local storage (SwiftData/UserDefaults) **immediately**
3. Return success to user (instant feedback)
4. Background: Sync to Firestore asynchronously
5. If offline: Queue for later sync
6. Retry sync when network available

### Sync Directions

**1. Upload (Local → Firestore)**
- Triggered: After creating new mood entry
- Triggered: On app launch (sync pending entries)
- Triggered: When network becomes available

**2. Download (Firestore → Local)**
- Triggered: Pull-to-refresh on history screen
- Triggered: On app launch (fetch new entries from other devices)
- Triggered: Every 4 hours (background refresh)

**3. Conflict Resolution**
- **Scenario:** Same entry edited on two devices while offline
- **Strategy:** Last-write-wins (use `updatedAt` timestamp)
- **Alternative:** Keep both versions, let user choose

### Sync State Machine

```
┌─────────────┐
│  NOT_SYNCED │ (Entry created locally, not yet uploaded)
└──────┬──────┘
       │
       ↓ (Network available)
┌─────────────┐
│   SYNCING   │ (Upload in progress)
└──────┬──────┘
       │
       ├─→ (Success) ┌──────────┐
       │             │  SYNCED  │
       │             └──────────┘
       │
       └─→ (Failure) ┌─────────────┐
                     │ SYNC_FAILED │ (Retry later)
                     └─────────────┘
```

---

## 📱 iOS Implementation Guide

See **MOBILE_TEAM_GUIDE.md Phase C** for complete code examples.

### Summary of iOS Changes

**1. Create FirestoreSyncService**
- Handles bidirectional sync (upload/download)
- Queue management for offline entries
- Conflict resolution
- Sync status tracking

**2. Update MoodDataService**
- Add sync call after local save
- Handle sync errors gracefully
- Don't block user on sync failures

**3. Add Sync UI**
- Sync status indicator (icon in header)
- Pull-to-refresh on history screen
- "Syncing..." toast notifications
- Error messages for sync failures

**4. Background Sync**
- Use Background Tasks (iOS 13+)
- Sync pending entries periodically
- Respect battery and network conditions

---

## 🧪 Testing Procedures

### Test 1: Basic Sync (Single Device)

**Steps:**
1. Create mood entry in iOS app
2. Verify entry saved locally (appears in history)
3. Wait 2-3 seconds for background sync
4. Check Firestore Console

**Expected:**
- Document appears in `/users/{userID}/moodEntries/`
- All fields populated correctly
- `timestamp` matches entry creation time
- `synced: true`

**Check Firestore:**
```
Firebase Console → Firestore Database
→ users → {your-uid} → moodEntries
```

### Test 2: Offline Sync

**Steps:**
1. Enable airplane mode on device
2. Create 3 mood entries
3. Verify entries appear in local history
4. Disable airplane mode
5. Wait 5 seconds

**Expected:**
- All 3 entries sync to Firestore
- Sync indicator shows "Syncing..." then "Synced"
- No errors in app logs

**Check iOS Logs:**
```
✅ Syncing 3 pending entries
✅ Entry abc123 synced successfully
✅ Entry def456 synced successfully
✅ Entry ghi789 synced successfully
```

### Test 3: Multi-Device Sync

**Prerequisites:**
- User logged in on Device A
- User logged in on Device B (same account)
- Both devices online

**Steps:**
1. On Device A: Create mood entry (mood: happy)
2. On Device B: Pull to refresh history screen
3. Verify entry appears on Device B

**Expected:**
- Entry appears on Device B within 2 seconds
- All details match (mood, note, timestamp, quote)
- Device B shows sync indicator

### Test 4: Conflict Resolution

**Steps:**
1. Device A: Enable airplane mode
2. Device A: Create entry with note "Feeling great today"
3. Device B: Create entry with same timestamp/mood
4. Device A: Disable airplane mode (both sync)

**Expected:**
- Both entries sync successfully
- Each has unique `entryID` (no conflict)
- Both appear in history
- Last entry sorted by timestamp

### Test 5: Pull-to-Refresh

**Steps:**
1. Open history screen
2. Pull down to refresh
3. Observe sync indicator

**Expected:**
- Loading spinner appears
- Fetches latest entries from Firestore
- Merges with local entries
- Sorts by timestamp (newest first)
- Loading spinner disappears

### Test 6: Large Sync (Performance)

**Steps:**
1. Create Firestore document with 100 mood entries manually
2. Fresh install app on device
3. Log in
4. Measure time to download all entries

**Expected:**
- ✅ Download completes in < 5 seconds
- ✅ UI remains responsive
- ✅ Entries load progressively (pagination)
- ✅ Memory usage < 50MB

---

## 📊 Monitoring

### Firestore Console Metrics

**Navigate to:**
```
Firebase Console → Firestore Database → Usage
```

**Key Metrics:**
- **Reads per day:** Should be ~3x number of active users
  - App launch: 1 read (fetch latest entries)
  - Pull-to-refresh: 1 read
  - Background sync: 1 read
- **Writes per day:** ~1x number of daily mood entries
- **Storage:** ~1KB per mood entry

**Cost Estimate:**
- 1,000 users × 3 reads/day = 3,000 reads/day
- 1,000 users × 1 write/day = 1,000 writes/day
- **Total:** $0/month (within free tier: 50K reads, 20K writes/day)

### Check Sync Logs

**iOS App Logs:**
```bash
# View live logs in Xcode
Product → Scheme → Edit Scheme → Run → Arguments
Add: -FIRDebugEnabled

# Look for:
✅ Synced entry abc123 in 0.3s
✅ Downloaded 5 new entries
⚠️ Sync failed: Network unavailable (will retry)
❌ Sync error: Permission denied (check auth)
```

### Firebase Analytics Events

**Track these events:**
```swift
// Entry synced successfully
Analytics.logEvent("mood_entry_synced", parameters: [
  "mood_type": moodType,
  "sync_duration": duration,
  "retry_count": retries
])

// Sync failed
Analytics.logEvent("sync_failed", parameters: [
  "error_code": error.code,
  "error_message": error.localizedDescription
])

// Multi-device sync detected
Analytics.logEvent("multi_device_sync", parameters: [
  "entries_downloaded": count
])
```

---

## 🔒 Security & Privacy

### Data Access Control

**Firestore Security Rules** (already deployed in Phase A):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User can only access their own data
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userID) {
      return isAuthenticated() && request.auth.uid == userID;
    }

    match /users/{userID} {
      allow read, write: if isOwner(userID);

      // Mood entries subcollection
      match /moodEntries/{entryID} {
        allow read, write: if isOwner(userID);

        // Validation rules
        allow create: if isOwner(userID)
                      && request.resource.data.moodType is string
                      && request.resource.data.timestamp is timestamp;

        allow update: if isOwner(userID);

        allow delete: if isOwner(userID);
      }
    }
  }
}
```

**Key Security Features:**
- ✅ User can only read/write their own mood entries
- ✅ Cannot access other users' data
- ✅ Validates data types on create
- ✅ Anonymous auth provides unique UID per device

### Privacy Considerations

**What's Synced:**
- Mood type (happy, sad, etc.)
- Optional notes
- Timestamp
- Quote shown (if any)
- User's expectations (focus areas)

**What's NOT Synced:**
- Device identifiers (only generic deviceID)
- Location data
- Personal identifiers (name, email if anonymous auth)

**User Control:**
- Users can delete entries (local + Firestore)
- Users can disable cloud sync (local-only mode)
- Users can export data (future feature)

---

## 🎨 Customization

### Sync Frequency

**Default:** Background sync every 4 hours

**To adjust:**
```swift
// In FirestoreSyncService.swift
let syncInterval: TimeInterval = 4 * 60 * 60  // 4 hours

// More aggressive (every hour):
let syncInterval: TimeInterval = 60 * 60  // 1 hour

// Less aggressive (once per day):
let syncInterval: TimeInterval = 24 * 60 * 60  // 24 hours
```

### Batch Size

**Default:** Download 50 entries per fetch

**To adjust:**
```swift
// In FirestoreSyncService.swift
let batchSize = 50

// For larger histories:
let batchSize = 100

// For performance (pagination):
let batchSize = 20
```

### Conflict Resolution Strategy

**Default:** Last-write-wins (use `updatedAt` timestamp)

**Alternative: Keep both versions**
```swift
// Create duplicate entry with suffix
let conflictedEntryID = originalEntryID + "_conflict_\(Date().timeIntervalSince1970)"
```

**Alternative: User chooses**
```swift
// Show dialog:
// "This entry was edited on another device. Which version do you want to keep?"
// [Keep Local] [Keep Cloud] [Keep Both]
```

---

## 🐛 Troubleshooting

### Issue: Entries Not Syncing

**Symptoms:**
- Mood entry created but not in Firestore
- "Syncing..." indicator stuck
- No errors in logs

**Check:**
1. ✅ User authenticated? (check `Auth.auth().currentUser`)
2. ✅ Network available? (try opening Safari)
3. ✅ Firestore rules deployed? (check Firebase Console)
4. ✅ Quota exceeded? (check Firestore usage)

**Solutions:**
```bash
# Check authentication status
print("User ID: \(Auth.auth().currentUser?.uid ?? "Not authenticated")")

# Check network
print("Network reachable: \(NetworkMonitor.shared.isConnected)")

# Force retry sync
FirestoreSyncService.shared.syncPendingEntries()
```

### Issue: Duplicate Entries

**Symptoms:**
- Same entry appears twice in history
- Different `entryID` but same timestamp/mood

**Cause:** Sync retry created duplicate

**Solution:**
```swift
// Add idempotency check in FirestoreSyncService
func syncEntry(_ entry: MoodEntry) async throws {
  // Check if already exists
  let existingDocs = try await db.collection("users/\(userID)/moodEntries")
    .whereField("timestamp", isEqualTo: entry.timestamp)
    .whereField("moodType", isEqualTo: entry.moodType)
    .getDocuments()

  if !existingDocs.isEmpty {
    print("Entry already synced, skipping")
    return
  }

  // Proceed with sync
  try await db.collection("users/\(userID)/moodEntries")
    .document(entry.id)
    .setData(entry.toFirestore())
}
```

### Issue: Permission Denied Error

**Error:** `"Missing or insufficient permissions"`

**Check:**
1. ✅ Firestore rules deployed?
2. ✅ User authenticated before sync?
3. ✅ Correct user ID in path?

**Solution:**
```bash
# Verify rules deployed
firebase deploy --only firestore:rules

# Check auth state
if Auth.auth().currentUser == nil {
  try await Auth.auth().signInAnonymously()
}
```

### Issue: Sync Too Slow

**Symptoms:**
- Sync takes > 5 seconds
- UI freezes during sync
- High battery usage

**Solutions:**

**1. Optimize Query:**
```swift
// Only fetch recent entries (last 30 days)
let thirtyDaysAgo = Calendar.current.date(byAdding: .day, value: -30, to: Date())!
let query = db.collection("users/\(userID)/moodEntries")
  .whereField("timestamp", isGreaterThan: thirtyDaysAgo)
  .order(by: "timestamp", descending: true)
  .limit(to: 50)
```

**2. Paginate Large Results:**
```swift
// Fetch in batches
var lastDocument: DocumentSnapshot?
func fetchNextBatch() async throws {
  var query = db.collection("users/\(userID)/moodEntries")
    .order(by: "timestamp", descending: true)
    .limit(to: 20)

  if let lastDoc = lastDocument {
    query = query.start(afterDocument: lastDoc)
  }

  let snapshot = try await query.getDocuments()
  lastDocument = snapshot.documents.last
  // Process documents...
}
```

**3. Background Sync:**
```swift
// Don't block UI
Task {
  await FirestoreSyncService.shared.syncPendingEntries()
}
```

### Issue: High Firestore Costs

**Check Firestore Usage:**
```
Firebase Console → Firestore → Usage Tab
```

**Common Causes:**
- Reading all entries on every app launch
- No caching (fetching same data repeatedly)
- Inefficient queries (not using indexes)

**Solutions:**

**1. Cache Locally:**
```swift
// Only fetch if cache expired (4 hours)
let lastFetchTime = UserDefaults.standard.object(forKey: "lastFirestoreFetch") as? Date
let fourHoursAgo = Date().addingTimeInterval(-4 * 60 * 60)

if let lastFetch = lastFetchTime, lastFetch > fourHoursAgo {
  print("Using cached data, skipping fetch")
  return
}

// Fetch from Firestore
try await fetchFromFirestore()
UserDefaults.standard.set(Date(), forKey: "lastFirestoreFetch")
```

**2. Use Offline Persistence:**
```swift
// Enable Firestore offline cache
let settings = FirestoreSettings()
settings.isPersistenceEnabled = true
db.settings = settings
```

**3. Optimize Queries:**
```swift
// Use composite indexes
// Create in Firebase Console → Firestore → Indexes
// Example: Index on (userID + timestamp descending)
```

---

## 💰 Cost Breakdown

### Firestore Operations

**Per User Per Day:**
- App launch: 1 read (fetch latest entries)
- Create mood entry: 1 write
- Pull-to-refresh: 1 read
- Background sync: 0 reads (uses cache)

**Total: 2 reads + 1 write per user per day**

### Cost Calculation

**1,000 Active Users:**
- Reads: 1,000 × 2 = 2,000 reads/day
- Writes: 1,000 × 1 = 1,000 writes/day
- **Cost:** $0/month (FREE tier: 50K reads, 20K writes/day) ✅

**10,000 Active Users:**
- Reads: 10,000 × 2 = 20,000 reads/day
- Writes: 10,000 × 1 = 10,000 writes/day
- **Cost:** $0/month (still within FREE tier) ✅

**Overage (if exceeded):**
- Additional reads: $0.06 per 100K reads
- Additional writes: $0.18 per 100K writes
- Storage: $0.18 per GB per month

**Worst Case (100K users):**
- Reads: 200K/day (150K overage) = $0.09/day = $2.70/month
- Writes: 100K/day (80K overage) = $0.14/day = $4.32/month
- Storage: 100K × 1KB × 30 days = 3GB = $0.54/month
- **Total:** ~$7.56/month ✅ (well under $20 budget)

---

## 📈 Success Metrics

### Week 1 (Immediate):
- ✅ Mood entries syncing to Firestore
- ✅ Zero sync errors
- ✅ Sync completes in < 2 seconds
- ✅ Offline mode works (queues for later)

### Week 2 (Validation):
- ✅ Multi-device sync working
- ✅ Conflict resolution tested
- ✅ Pull-to-refresh functional
- ✅ No duplicate entries

### Month 1 (Production):
- ✅ 95%+ sync success rate
- ✅ Average sync time < 1 second
- ✅ Zero data loss incidents
- ✅ Cost < $1/month for 1,000 users

---

## ✅ Deployment Checklist

### Backend Configuration (Already Complete)
- [x] Firestore database initialized (Phase A)
- [x] Security rules deployed (Phase A)
- [x] Anonymous authentication enabled (Phase A)

### iOS Integration (Mobile Team)
- [ ] Create `FirestoreSyncService.swift`
- [ ] Implement upload sync (local → Firestore)
- [ ] Implement download sync (Firestore → local)
- [ ] Add conflict resolution logic
- [ ] Update `MoodDataService` to call sync after save
- [ ] Add pull-to-refresh on history screen
- [ ] Add sync status indicator in UI
- [ ] Enable Firestore offline persistence
- [ ] Implement background sync (Background Tasks)
- [ ] Add sync retry logic with exponential backoff

### Testing
- [ ] Test single-device sync
- [ ] Test offline mode (airplane mode)
- [ ] Test multi-device sync
- [ ] Test conflict resolution
- [ ] Test pull-to-refresh
- [ ] Test large sync (100+ entries)
- [ ] Test sync performance (< 2 seconds)
- [ ] Test error handling (network failures)

### Monitoring
- [ ] Firebase Console access for team
- [ ] Firestore usage dashboard configured
- [ ] Analytics events implemented
- [ ] Cost alerts set up
- [ ] Sync success rate tracking

---

## 🎯 Next Steps After Deployment

### Immediate (Week 1)
1. Monitor sync success rate (target: 95%+)
2. Check Firestore costs daily
3. Verify no duplicate entries
4. Test on multiple devices

### This Week (Week 2)
1. Optimize sync frequency based on usage
2. Add pagination for large histories (100+ entries)
3. Implement selective sync (only recent entries)
4. Add data export feature (CSV/JSON)

### Next Month
1. Implement sync analytics dashboard
2. Add conflict resolution UI (user chooses)
3. Optimize batch sizes based on performance
4. Add data migration tools (if schema changes)

---

## 📱 User Experience

### Sync Flow (User Perspective)

**Day 1 (First Sync):**
1. User creates first mood entry
2. Entry appears instantly in history (local save)
3. Small cloud icon shows "Syncing..." briefly
4. Icon changes to checkmark "Synced" (< 2 seconds)

**Day 2 (Multi-Device):**
1. User logs in on iPad
2. Sees all previous entries from iPhone
3. Creates new entry on iPad
4. Switch back to iPhone
5. Pull-to-refresh → iPad entry appears

**Offline Mode:**
1. User in airplane mode
2. Creates 3 mood entries
3. All appear in local history immediately
4. Cloud icon shows "Offline - will sync later"
5. Lands, disables airplane mode
6. Icon animates: "Syncing 3 entries..."
7. All synced within 5 seconds

**Benefits:**
- ✅ Never lose mood entries (cloud backup)
- ✅ Access history from any device
- ✅ Works offline (queues for later)
- ✅ Fast and reliable
- ✅ Transparent sync status

---

## 📚 Additional Resources

### Firestore Documentation
- **iOS Setup:** https://firebase.google.com/docs/firestore/quickstart
- **Offline Data:** https://firebase.google.com/docs/firestore/manage-data/enable-offline
- **Security Rules:** https://firebase.google.com/docs/firestore/security/get-started

### Apple Documentation
- **Background Tasks:** https://developer.apple.com/documentation/backgroundtasks
- **Network Reachability:** https://developer.apple.com/documentation/network

### Guides
- **Complete iOS Integration:** MOBILE_TEAM_GUIDE.md Phase C
- **Architecture Overview:** IMPLEMENTATION_GUIDE.md Phase C
- **Firestore Setup:** PHASE_A_COMPLETE.md

---

## 🆘 Support

**Firestore Console:**
https://console.firebase.google.com/project/happify-2-prod/firestore

**Common Issues:**
- Entries not syncing
- Permission denied errors
- Duplicate entries
- Slow sync performance
- High costs

**Contact:**
- Backend team: juraj@krajcovic.me
- Firebase Support: Firebase Console → Support
- GitHub Issues: For bugs and features

---

## 🎉 Summary

Phase C enables cloud backup and multi-device sync with:

**Features:**
- ✅ Automatic background sync
- ✅ Offline-first architecture
- ✅ Multi-device support
- ✅ Conflict resolution
- ✅ Pull-to-refresh
- ✅ Sync status indicators

**Benefits:**
- ✅ Never lose mood entries (cloud backup)
- ✅ Access from multiple devices
- ✅ Works offline (queues for sync)
- ✅ Fast and reliable (< 2s sync)
- ✅ Secure (only user can access their data)

**Cost:** $0/month for 10K users (within Firestore free tier) ✅

**Status:** ✅ Ready for mobile team implementation

---

**Phase C: Mood Entry Cloud Sync**
**Implementation Time:** 1-2 weeks (iOS integration)
**Impact:** Cloud backup, multi-device sync, never lose data

🚀 Built with ❤️ using Firebase Firestore
