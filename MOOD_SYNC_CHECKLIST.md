# Mood Entry Cloud Sync Checklist

Quick reference for implementing mood entry cloud sync for Happify.

## ✅ Backend Setup (Already Complete)

### 1. Firestore Database
- [x] Firestore initialized (Phase A)
- [x] Security rules deployed
- [x] Anonymous auth enabled
- [x] Database location: us-east1

### 2. Firestore Schema
```
/users/{userID}/
  └── moodEntries (subcollection)
      └── {entryID}
          ├── moodType: String
          ├── note: String
          ├── timestamp: Timestamp
          ├── quoteShown: Object
          ├── expectations: [String]
          ├── synced: Boolean
          ├── deviceID: String
          ├── createdAt: Timestamp
          └── updatedAt: Timestamp
```

### 3. Security Rules
- [x] Users can only access their own data
- [x] Read/write restricted to authenticated users
- [x] Validation rules for data types

---

## 📱 iOS Implementation (2-3 weeks)

See **MOBILE_TEAM_GUIDE.md Phase C** for complete code.

### 1. Create FirestoreSyncService (Week 1, 15 hours)

**File:** `Core/Services/FirestoreSyncService.swift`

**Key Functions:**
```swift
class FirestoreSyncService {
  // Upload local entry to Firestore
  func syncMoodEntry(_ entry: MoodEntry) async throws

  // Download entries from Firestore
  func fetchMoodEntries(since date: Date) async throws -> [MoodEntry]

  // Sync all pending entries
  func syncPendingEntries() async throws

  // Handle conflicts (last-write-wins)
  func resolveConflict(_ local: MoodEntry, _ remote: MoodEntry) -> MoodEntry
}
```

**Tasks:**
- [ ] Create service file (1 hour)
- [ ] Implement upload sync (3 hours)
- [ ] Implement download sync (3 hours)
- [ ] Add conflict resolution (2 hours)
- [ ] Add offline queue (2 hours)
- [ ] Add retry logic with exponential backoff (2 hours)
- [ ] Add sync status tracking (2 hours)

### 2. Update MoodDataService (Week 1, 3 hours)

**File:** `Core/Services/MoodDataService.swift`

**Changes:**
```swift
func createMoodEntry(...) async throws -> MoodEntry {
  // 1. Save locally (existing code)
  let entry = try saveToLocalStorage(...)

  // 2. Sync to Firestore (NEW)
  Task {
    try? await FirestoreSyncService.shared.syncMoodEntry(entry)
  }

  return entry
}
```

**Tasks:**
- [ ] Add sync call after local save (1 hour)
- [ ] Handle sync errors gracefully (1 hour)
- [ ] Add sync status callback (1 hour)

### 3. Add Sync UI (Week 2, 8 hours)

**Sync Status Indicator:**
- [ ] Add cloud icon to navigation bar (1 hour)
- [ ] Show "Syncing..." animation (1 hour)
- [ ] Show "Synced" checkmark (1 hour)
- [ ] Show "Offline" warning (1 hour)
- [ ] Show error badge for failed sync (1 hour)

**Pull-to-Refresh:**
- [ ] Add to mood history screen (2 hours)
- [ ] Fetch latest entries from Firestore
- [ ] Merge with local entries
- [ ] Show loading indicator

**Toast Notifications:**
- [ ] "Syncing X entries..." (1 hour)
- [ ] "All entries synced" success message
- [ ] "Sync failed, will retry" error message

### 4. Enable Offline Persistence (Week 2, 2 hours)

**File:** `App/Happify_2App.swift`

```swift
// Enable Firestore offline cache
let settings = FirestoreSettings()
settings.isPersistenceEnabled = true
Firestore.firestore().settings = settings
```

**Tasks:**
- [ ] Enable offline persistence (30 mins)
- [ ] Test offline mode (airplane mode) (1 hour)
- [ ] Verify cache works (30 mins)

### 5. Background Sync (Week 2, 6 hours)

**File:** `Core/Services/BackgroundSyncService.swift`

```swift
// Register background task
BGTaskScheduler.shared.register(
  forTaskWithIdentifier: "com.happify.syncMoodEntries",
  using: nil
) { task in
  await FirestoreSyncService.shared.syncPendingEntries()
  task.setTaskCompleted(success: true)
}
```

**Tasks:**
- [ ] Create BackgroundSyncService (2 hours)
- [ ] Register background task (1 hour)
- [ ] Add to Info.plist (30 mins)
- [ ] Test background sync (2 hours)
- [ ] Handle battery/network conditions (30 mins)

---

## 🧪 Testing (4-6 hours)

### Test 1: Basic Sync (30 mins)
- [ ] Create mood entry in app
- [ ] Wait 2 seconds for sync
- [ ] Check Firestore Console
- [ ] ✅ Document appears with correct data

**Firestore Console:**
```
https://console.firebase.google.com/project/happify-2-prod/firestore
→ users → {your-uid} → moodEntries
```

### Test 2: Offline Mode (1 hour)
- [ ] Enable airplane mode
- [ ] Create 3 mood entries
- [ ] Verify entries appear in local history
- [ ] Disable airplane mode
- [ ] Wait 5 seconds
- [ ] ✅ All 3 entries sync to Firestore
- [ ] ✅ Sync indicator shows success

### Test 3: Multi-Device Sync (1 hour)
- [ ] Device A: Create mood entry
- [ ] Device B: Pull to refresh
- [ ] ✅ Entry appears on Device B
- [ ] ✅ All details match (mood, note, timestamp)

### Test 4: Pull-to-Refresh (30 mins)
- [ ] Open history screen
- [ ] Pull down to refresh
- [ ] ✅ Loading spinner appears
- [ ] ✅ Fetches latest entries
- [ ] ✅ Merges with local entries
- [ ] ✅ Sorts by timestamp

### Test 5: Background Sync (1 hour)
- [ ] Create entries while offline
- [ ] Close app completely
- [ ] Wait 15 minutes (background task interval)
- [ ] Re-open app
- [ ] ✅ Entries synced in background

### Test 6: Conflict Resolution (1 hour)
- [ ] Device A: Offline, create entry
- [ ] Device B: Offline, create entry (similar time)
- [ ] Both come online
- [ ] ✅ Both entries sync
- [ ] ✅ No duplicate entries
- [ ] ✅ Sorted correctly by timestamp

### Test 7: Performance (30 mins)
- [ ] Create 100 entries manually in Firestore
- [ ] Fresh app install
- [ ] Log in
- [ ] Measure download time
- [ ] ✅ Downloads in < 5 seconds
- [ ] ✅ UI remains responsive

---

## 📊 Monitoring (Ongoing)

### Firestore Usage
```
Firebase Console → Firestore → Usage
```

**Daily checks (first week):**
- [ ] Reads per day
- [ ] Writes per day
- [ ] Storage used
- [ ] Error rate

**Weekly checks:**
- [ ] Cost (should be $0 for < 10K users)
- [ ] Average sync time
- [ ] Success rate (target: 95%+)

### iOS App Logs

**Enable debug logging:**
```bash
# In Xcode scheme arguments
-FIRDebugEnabled
```

**Look for:**
```
✅ Synced entry abc123 in 0.3s
✅ Downloaded 5 new entries
⚠️ Sync queued: Network unavailable
❌ Sync error: Permission denied
```

### Analytics Events

**Track sync performance:**
- [ ] `mood_entry_synced` - Success rate
- [ ] `sync_failed` - Error types
- [ ] `multi_device_sync` - Cross-device usage
- [ ] `offline_sync_queued` - Offline usage

---

## 🐛 Troubleshooting

### Issue: Entries Not Syncing

**Check:**
1. User authenticated? → `Auth.auth().currentUser?.uid`
2. Network available? → Try Safari
3. Firestore rules deployed? → Firebase Console
4. Sync service initialized? → Check logs

**Quick Fix:**
```swift
// Force sync
Task {
  try await FirestoreSyncService.shared.syncPendingEntries()
}
```

### Issue: Permission Denied

**Error:** "Missing or insufficient permissions"

**Fix:**
```bash
# Redeploy Firestore rules
firebase deploy --only firestore:rules

# Verify authentication
if Auth.auth().currentUser == nil {
  try await Auth.auth().signInAnonymously()
}
```

### Issue: Duplicate Entries

**Cause:** Sync retry created duplicate

**Fix:**
Add idempotency check before sync:
```swift
// Check if entry already exists in Firestore
let exists = try await checkIfExists(entryID)
if exists { return }
```

### Issue: Sync Too Slow

**Symptoms:** Sync takes > 5 seconds

**Fix:**
1. Reduce batch size (50 → 20 entries)
2. Add pagination for large histories
3. Enable offline persistence (caching)
4. Optimize Firestore query with indexes

---

## 💰 Cost Estimate

**1,000 Users:**
- Reads: 2,000/day (2 per user)
- Writes: 1,000/day (1 per user)
- **Cost:** $0/month ✅ (FREE tier: 50K reads, 20K writes/day)

**10,000 Users:**
- Reads: 20,000/day
- Writes: 10,000/day
- **Cost:** $0/month ✅ (still within FREE tier)

**100,000 Users:**
- Reads: 200,000/day (150K overage)
- Writes: 100,000/day (80K overage)
- Storage: 3GB
- **Cost:** ~$7.56/month ✅ (under $20 budget)

---

## ✅ Completion Criteria

**Backend:**
- [x] Firestore database initialized
- [x] Security rules deployed
- [x] Schema designed and documented

**iOS:**
- [ ] FirestoreSyncService implemented
- [ ] MoodDataService updated with sync
- [ ] Sync UI (status indicator, pull-to-refresh)
- [ ] Offline persistence enabled
- [ ] Background sync configured

**Testing:**
- [ ] Basic sync works
- [ ] Offline mode tested
- [ ] Multi-device sync verified
- [ ] Pull-to-refresh functional
- [ ] Background sync working
- [ ] Conflict resolution tested
- [ ] Performance acceptable (< 5s for 100 entries)

**Monitoring:**
- [ ] Firestore usage tracked
- [ ] Analytics events implemented
- [ ] Cost alerts configured
- [ ] Sync success rate > 95%

---

## 🎯 Success Indicators

**Week 1:**
✅ Mood entries syncing reliably
✅ Zero permission errors
✅ Sync completes in < 2 seconds
✅ Offline queue working

**Week 2:**
✅ Multi-device sync functional
✅ Pull-to-refresh smooth
✅ Background sync tested
✅ No duplicate entries

**Month 1:**
✅ 95%+ sync success rate
✅ Average sync time < 1 second
✅ Zero data loss incidents
✅ Cost $0/month for 1,000 users
✅ Positive user feedback

---

## 📱 Quick Links

**Firestore Console:**
https://console.firebase.google.com/project/happify-2-prod/firestore

**Full Guides:**
- Backend: PHASE_C_DEPLOYMENT.md
- iOS: MOBILE_TEAM_GUIDE.md Phase C

**Support:**
- Backend team: juraj@krajcovic.me
- GitHub Issues: Report bugs

---

## 🚀 Ready to Implement!

**Estimated Time:**
- FirestoreSyncService: 15 hours
- MoodDataService updates: 3 hours
- Sync UI: 8 hours
- Background sync: 6 hours
- Testing: 6 hours

**Total: ~38 hours (~1 week)** for experienced iOS developer

**Impact:** Cloud backup + Multi-device sync + Never lose data

Let's enable cloud sync! ☁️
