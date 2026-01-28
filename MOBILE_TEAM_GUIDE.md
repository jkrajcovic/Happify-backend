# Mobile Team Integration Guide - Happify Backend

> Complete guide for iOS developers to integrate Firebase backend and AI features into Happify-2

## 📱 Overview

This guide shows how to integrate the cloud backend into your existing Happify-2 iOS app. The backend provides:

- ✅ **Cloud sync** for mood entries
- ✅ **AI-powered quotes** personalized to user's mood and needs
- ✅ **Push notifications** with dynamic messages
- ✅ **Remote Config** for updating quotes without app releases
- ✅ **Analytics** for user engagement tracking

## 🎯 Integration Phases

We'll integrate backend features in phases that match backend development:

| Phase | Feature | iOS Work Required | Backend Dependency |
|-------|---------|-------------------|-------------------|
| A | Firebase Setup & Auth | Medium | Phase A Complete |
| B | Remote Config Quotes | Low | Phase B Complete |
| C | Mood Entry Sync | Medium | Phase C Complete |
| D | Push Notifications | Medium | Phase D Complete |
| E | AI-Generated Quotes | Low | Phase E Complete |
| F | Analytics Events | Low | Phase F Complete |

---

## Prerequisites

### Required Tools

```bash
# Xcode 15+ with Swift 5.9+
xcode-select --install

# CocoaPods (if using, though SPM is preferred)
sudo gem install cocoapods
```

### Firebase Configuration File

**You'll receive from backend team:**
- `GoogleService-Info.plist` - Firebase configuration file

**IMPORTANT:**
- Add to your Xcode project root
- Add to `.gitignore` (don't commit to Git)
- Add to all build targets

---

## Phase A: Firebase Setup & Authentication

### Backend Prerequisite: Phase A Complete ✅

### Step 1: Add Firebase SDK via Swift Package Manager

**In Xcode:**

1. **File → Add Package Dependencies**
2. **Enter URL:** `https://github.com/firebase/firebase-ios-sdk`
3. **Version:** Latest (11.0.0+)
4. **Select packages:**
   - ✅ FirebaseAuth
   - ✅ FirebaseFirestore
   - ✅ FirebaseMessaging
   - ✅ FirebaseRemoteConfig
   - ✅ FirebaseAnalytics
   - ✅ FirebaseFunctions

### Step 2: Add GoogleService-Info.plist

**Receive from backend team, then:**

1. Drag `GoogleService-Info.plist` into Xcode project navigator
2. Ensure "Copy items if needed" is checked
3. Add to all targets (Happify-2, widgets, extensions)
4. **Add to `.gitignore`:**

```gitignore
# Firebase
GoogleService-Info.plist
```

### Step 3: Initialize Firebase in App

**File: `App/Happify_2App.swift`**

```swift
import SwiftUI
import FirebaseCore

@main
struct Happify_2App: App {

    // Initialize Firebase on app launch
    init() {
        FirebaseApp.configure()
        print("✅ Firebase configured")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

### Step 4: Create FirebaseAuthService

**Create new file: `Core/Services/FirebaseAuthService.swift`**

```swift
import Foundation
import FirebaseAuth

/// Manages Firebase anonymous authentication
/// Users are automatically authenticated on first app launch
@MainActor
class FirebaseAuthService: ObservableObject {
    static let shared = FirebaseAuthService()

    @Published var currentUser: User?
    @Published var isAuthenticated = false

    private init() {
        // Listen for auth state changes
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.currentUser = user
                self?.isAuthenticated = user != nil

                if let uid = user?.uid {
                    print("✅ User authenticated: \(uid)")
                }
            }
        }

        // Auto sign-in on first launch
        Task {
            await signInIfNeeded()
        }
    }

    /// Sign in anonymously if not already authenticated
    func signInIfNeeded() async {
        guard !isAuthenticated else { return }

        do {
            let result = try await Auth.auth().signInAnonymously()
            print("✅ Signed in anonymously: \(result.user.uid)")
        } catch {
            print("❌ Firebase auth error: \(error.localizedDescription)")
        }
    }

    /// Get current user ID (nil if not authenticated)
    var currentUserID: String? {
        return currentUser?.uid
    }

    /// Sign out (mainly for testing)
    func signOut() throws {
        try Auth.auth().signOut()
        print("✅ Signed out successfully")
    }
}
```

### Step 5: Update App Launch

**Modify: `App/Happify_2App.swift`**

```swift
import SwiftUI
import FirebaseCore

@main
struct Happify_2App: App {

    // Inject Firebase auth service
    @StateObject private var authService = FirebaseAuthService.shared

    init() {
        // Configure Firebase
        FirebaseApp.configure()

        #if DEBUG
        // Optional: Use emulators in debug mode
        // Auth.auth().useEmulator(withHost: "localhost", port: 9099)
        // let settings = Firestore.firestore().settings
        // settings.host = "localhost:8080"
        // settings.isSSLEnabled = false
        // Firestore.firestore().settings = settings
        #endif
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
        }
    }
}
```

### Step 6: Test Firebase Integration

**Add to any view for testing:**

```swift
struct DebugFirebaseView: View {
    @EnvironmentObject var authService: FirebaseAuthService

    var body: some View {
        VStack(spacing: 20) {
            Text("Firebase Status")
                .font(.headline)

            if authService.isAuthenticated {
                Text("✅ Authenticated")
                    .foregroundColor(.green)

                if let uid = authService.currentUserID {
                    Text("User ID: \(uid)")
                        .font(.caption)
                        .monospaced()
                }
            } else {
                Text("⏳ Signing in...")
                    .foregroundColor(.orange)
            }

            Button("Test Sign Out") {
                try? authService.signOut()
            }
        }
        .padding()
    }
}
```

### Testing Checklist for Phase A

- [ ] App launches without crashes
- [ ] Firebase initialization logs appear in console
- [ ] User is automatically authenticated
- [ ] User ID appears in debug view
- [ ] Sign out works

**Expected Console Output:**
```
✅ Firebase configured
✅ Signed in anonymously: Abc123XyZ...
✅ User authenticated: Abc123XyZ...
```

---

## Phase B: Remote Config for Dynamic Quotes

### Backend Prerequisite: Phase B Complete ✅

### Step 1: Create RemoteConfigService

**Create new file: `Core/Services/RemoteConfigService.swift`**

```swift
import Foundation
import FirebaseRemoteConfig

/// Manages Firebase Remote Config for dynamic quote database
@MainActor
class RemoteConfigService: ObservableObject {
    static let shared = RemoteConfigService()

    private let remoteConfig = RemoteConfig.remoteConfig()

    @Published var quotesDatabase: [RemoteQuote] = []
    @Published var aiQuotesEnabled: Bool = true
    @Published var lastFetchTime: Date?

    private init() {
        configureRemoteConfig()
    }

    private func configureRemoteConfig() {
        let settings = RemoteConfigSettings()
        settings.minimumFetchInterval = 43200 // 12 hours (production)

        #if DEBUG
        settings.minimumFetchInterval = 0 // No throttling in debug
        #endif

        remoteConfig.configSettings = settings

        // Set default values
        remoteConfig.setDefaults([
            "quotes_database": "[]" as NSString,
            "feature_ai_quotes_enabled": true as NSNumber
        ])
    }

    /// Fetch and activate latest Remote Config values
    func fetchAndActivate() async throws {
        let status = try await remoteConfig.fetchAndActivate()

        switch status {
        case .successFetchedFromRemote:
            print("✅ Remote Config fetched from server")
        case .successUsingPreFetchedData:
            print("✅ Remote Config using cached data")
        default:
            print("⚠️ Remote Config status: \(status)")
        }

        // Parse quotes
        if let quotesJSON = remoteConfig["quotes_database"].stringValue,
           let data = quotesJSON.data(using: .utf8) {
            let decoder = JSONDecoder()
            quotesDatabase = try decoder.decode([RemoteQuote].self, from: data)
            print("✅ Loaded \(quotesDatabase.count) quotes from Remote Config")
        }

        // Update feature flags
        aiQuotesEnabled = remoteConfig["feature_ai_quotes_enabled"].boolValue
        lastFetchTime = Date()
    }

    /// Get quotes matching mood and expectations
    func getQuotes(for mood: String, expectations: [String]) -> [RemoteQuote] {
        return quotesDatabase.filter { quote in
            // Match mood
            let moodMatch = quote.moods?.contains(mood.lowercased()) ?? false

            // Match expectations (categories)
            let categoryMatch = !Set(quote.categories).isDisjoint(with: Set(expectations))

            return moodMatch || categoryMatch
        }
    }
}

/// Remote quote model
struct RemoteQuote: Codable, Identifiable {
    let id = UUID()
    let text: String
    let author: String
    let categories: [String]
    let moods: [String]?

    enum CodingKeys: String, CodingKey {
        case text, author, categories, moods
    }
}
```

### Step 2: Update QuoteService

**Modify: `Core/Services/QuoteService.swift`**

```swift
import Foundation

@MainActor
class QuoteService: ObservableObject {
    static let shared = QuoteService()

    private let remoteConfigService = RemoteConfigService.shared
    private var localQuotes: [Quote] = [] // Your existing local quotes

    private init() {
        loadLocalQuotes() // Your existing method

        // Fetch Remote Config on initialization
        Task {
            try? await remoteConfigService.fetchAndActivate()
        }
    }

    /// Get personalized quote with fallback strategy:
    /// 1. Try Remote Config quotes (200+)
    /// 2. Fall back to local quotes (50)
    /// 3. Fall back to hardcoded quote
    func getQuote(for mood: String, expectations: [String]) -> Quote {

        // Step 1: Try Remote Config first
        let remoteQuotes = remoteConfigService.getQuotes(
            for: mood,
            expectations: expectations
        )

        if !remoteQuotes.isEmpty {
            let selectedRemote = remoteQuotes.randomElement()!
            print("✅ Using Remote Config quote")
            return Quote(
                text: selectedRemote.text,
                author: selectedRemote.author,
                categories: selectedRemote.categories,
                source: "remote_config"
            )
        }

        // Step 2: Fall back to local quotes
        let localMatches = localQuotes.filter { quote in
            // Your existing matching logic
            return true // Simplified
        }

        if !localMatches.isEmpty {
            print("⚠️ Falling back to local quotes")
            return localMatches.randomElement()!
        }

        // Step 3: Hardcoded fallback
        print("⚠️ Using hardcoded fallback quote")
        return Quote(
            text: "Every moment is a fresh beginning.",
            author: "T.S. Eliot",
            categories: ["motivation"],
            source: "fallback"
        )
    }
}
```

### Step 3: Fetch Remote Config on App Launch

**Modify: `App/Happify_2App.swift`**

```swift
init() {
    FirebaseApp.configure()

    // Fetch Remote Config in background
    Task {
        try? await RemoteConfigService.shared.fetchAndActivate()
    }
}
```

### Testing Checklist for Phase B

- [ ] Remote Config fetches on app launch
- [ ] Console shows "Loaded X quotes from Remote Config"
- [ ] Quotes from Remote Config appear in app
- [ ] Offline mode falls back to local quotes
- [ ] Can update quotes in Firebase Console and see changes

---

## Phase C: Mood Entry Cloud Sync

### Backend Prerequisite: Phase C Complete ✅

### Step 1: Create FirestoreSyncService

**Create new file: `Core/Services/FirestoreSyncService.swift`**

```swift
import Foundation
import FirebaseFirestore

/// Manages syncing mood entries to Firestore
@MainActor
class FirestoreSyncService: ObservableObject {
    static let shared = FirestoreSyncService()

    private let db = Firestore.firestore()
    private let authService = FirebaseAuthService.shared

    @Published var isSyncing = false
    @Published var lastSyncTime: Date?

    private init() {}

    /// Sync mood entry to Firestore (background sync after local save)
    func syncMoodEntry(_ entry: MoodEntry) async throws {
        guard let userId = authService.currentUserID else {
            throw SyncError.notAuthenticated
        }

        isSyncing = true
        defer { isSyncing = false }

        let docRef = db
            .collection("users")
            .document(userId)
            .collection("moodEntries")
            .document(entry.id.uuidString)

        let data: [String: Any] = [
            "moodType": entry.moodType,
            "note": entry.note ?? "",
            "timestamp": Timestamp(date: entry.timestamp),
            "quoteShown": [
                "text": entry.quoteShown?.text ?? "",
                "author": entry.quoteShown?.author ?? ""
            ]
        ]

        try await docRef.setData(data, merge: true)
        lastSyncTime = Date()

        print("✅ Synced mood entry: \(entry.id)")
    }

    /// Fetch mood entries from Firestore (for multi-device sync)
    func fetchMoodEntries() async throws -> [MoodEntry] {
        guard let userId = authService.currentUserID else {
            throw SyncError.notAuthenticated
        }

        let snapshot = try await db
            .collection("users")
            .document(userId)
            .collection("moodEntries")
            .order(by: "timestamp", descending: true)
            .limit(to: 100)
            .getDocuments()

        let entries: [MoodEntry] = snapshot.documents.compactMap { doc in
            let data = doc.data()

            guard let moodType = data["moodType"] as? String,
                  let timestamp = (data["timestamp"] as? Timestamp)?.dateValue() else {
                return nil
            }

            let note = data["note"] as? String
            let quoteData = data["quoteShown"] as? [String: String]

            return MoodEntry(
                id: UUID(uuidString: doc.documentID) ?? UUID(),
                moodType: moodType,
                note: note,
                timestamp: timestamp,
                quoteShown: quoteData.map { Quote(text: $0["text"] ?? "", author: $0["author"] ?? "") }
            )
        }

        print("✅ Fetched \(entries.count) mood entries from Firestore")
        return entries
    }
}

enum SyncError: LocalizedError {
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "User is not authenticated"
        }
    }
}
```

### Step 2: Update MoodDataService

**Modify: `Core/Services/MoodDataService.swift`**

```swift
import Foundation

@MainActor
class MoodDataService: ObservableObject {
    static let shared = MoodDataService()

    private let syncService = FirestoreSyncService.shared

    @Published var moodEntries: [MoodEntry] = []

    private init() {
        loadLocalEntries() // Your existing method
    }

    /// Save mood entry (local first, then cloud sync)
    func saveMoodEntry(_ entry: MoodEntry) async {
        // Step 1: Save locally (your existing logic)
        saveLocally(entry)

        // Step 2: Sync to Firestore in background
        Task {
            do {
                try await syncService.syncMoodEntry(entry)
                print("✅ Mood entry synced to cloud")
            } catch {
                print("⚠️ Cloud sync failed (will retry): \(error.localizedDescription)")
                // Local entry is saved, sync will retry later
            }
        }
    }

    /// Fetch entries from cloud (for pull-to-refresh)
    func refreshFromCloud() async throws {
        let cloudEntries = try await syncService.fetchMoodEntries()

        // Merge with local entries (your existing merge logic)
        mergeEntries(cloudEntries)

        print("✅ Refreshed from cloud")
    }

    private func saveLocally(_ entry: MoodEntry) {
        // Your existing local save logic
    }

    private func loadLocalEntries() {
        // Your existing load logic
    }

    private func mergeEntries(_ cloudEntries: [MoodEntry]) {
        // Your existing merge logic
        // Typically: use latest timestamp, avoid duplicates by ID
    }
}
```

### Step 3: Add Pull-to-Refresh in History View

**Modify your history view:**

```swift
struct HistoryView: View {
    @StateObject private var moodService = MoodDataService.shared
    @State private var isRefreshing = false

    var body: some View {
        List {
            ForEach(moodService.moodEntries) { entry in
                MoodEntryRow(entry: entry)
            }
        }
        .refreshable {
            do {
                try await moodService.refreshFromCloud()
            } catch {
                print("Refresh failed: \(error)")
            }
        }
    }
}
```

### Testing Checklist for Phase C

- [ ] Mood entries sync to Firestore after creation
- [ ] Can see entries in Firebase Console
- [ ] Pull-to-refresh fetches from cloud
- [ ] Offline mode saves locally, syncs when back online
- [ ] Multiple devices show same entries (after refresh)

---

## Phase D: Push Notifications (FCM)

### Backend Prerequisite: Phase D Complete ✅

### Step 1: Enable Push Notifications in Xcode

1. **Select your target → Signing & Capabilities**
2. **Click "+ Capability"**
3. **Add "Push Notifications"**
4. **Add "Background Modes"**
   - Check "Remote notifications"

### Step 2: Create AppDelegate for Notifications

**Create new file: `App/AppDelegate.swift`**

```swift
import UIKit
import FirebaseCore
import FirebaseMessaging
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
    ) -> Bool {

        // Configure Firebase (if not already done in SwiftUI App)
        // FirebaseApp.configure()

        // Set up notification delegates
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        // Request notification permission
        requestNotificationPermission()

        // Register for remote notifications
        application.registerForRemoteNotifications()

        return true
    }

    // MARK: - Notification Permission

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            if granted {
                print("✅ Notification permission granted")
            } else if let error = error {
                print("❌ Notification permission error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - APNs Token

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Forward APNs token to Firebase
        Messaging.messaging().apnsToken = deviceToken
        print("✅ APNs token registered")
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - FCM Token

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }

        print("✅ FCM token: \(fcmToken)")

        // Save FCM token to Firestore
        Task {
            await saveFCMToken(fcmToken)
        }
    }

    private func saveFCMToken(_ token: String) async {
        guard let userId = FirebaseAuthService.shared.currentUserID else {
            print("⚠️ Cannot save FCM token: User not authenticated")
            return
        }

        let db = Firestore.firestore()
        let userRef = db.collection("users").document(userId)

        do {
            try await userRef.setData([
                "profile": [
                    "fcmToken": token,
                    "lastTokenUpdate": FieldValue.serverTimestamp()
                ]
            ], merge: true)

            print("✅ FCM token saved to Firestore")
        } catch {
            print("❌ Failed to save FCM token: \(error.localizedDescription)")
        }
    }

    // MARK: - Handle Notifications

    // Notification received while app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is open
        completionHandler([.banner, .sound, .badge])
    }

    // Notification tapped
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        // Handle notification tap
        if let type = userInfo["type"] as? String {
            switch type {
            case "daily_reminder":
                // Navigate to mood entry screen
                NotificationCenter.default.post(name: .openMoodEntry, object: nil)
            default:
                break
            }
        }

        completionHandler()
    }
}

// Notification name for navigation
extension Notification.Name {
    static let openMoodEntry = Notification.Name("openMoodEntry")
}
```

### Step 3: Connect AppDelegate to SwiftUI App

**Modify: `App/Happify_2App.swift`**

```swift
import SwiftUI
import FirebaseCore

@main
struct Happify_2App: App {

    // Connect AppDelegate
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    @StateObject private var authService = FirebaseAuthService.shared

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .onReceive(NotificationCenter.default.publisher(for: .openMoodEntry)) { _ in
                    // Navigate to mood entry screen
                    print("📱 Opening mood entry from notification")
                }
        }
    }
}
```

### Step 4: Create NotificationService

**Create new file: `Core/Services/NotificationService.swift`**

```swift
import Foundation
import UserNotifications
import FirebaseFirestore

@MainActor
class NotificationService: ObservableObject {
    static let shared = NotificationService()

    private let db = Firestore.firestore()
    private let authService = FirebaseAuthService.shared

    @Published var notificationTime: Date = Calendar.current.date(
        from: DateComponents(hour: 20, minute: 0)
    ) ?? Date()

    private init() {
        loadNotificationPreferences()
    }

    /// Save notification preferences to Firestore
    func saveNotificationTime(_ time: Date) async throws {
        guard let userId = authService.currentUserID else {
            throw NSError(domain: "NotificationService", code: 401)
        }

        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: time)
        let minute = calendar.component(.minute, from: time)

        let userRef = db.collection("users").document(userId)

        try await userRef.setData([
            "profile": [
                "notificationHour": hour,
                "notificationMinute": minute
            ]
        ], merge: true)

        notificationTime = time
        print("✅ Notification time saved: \(hour):\(minute)")
    }

    private func loadNotificationPreferences() {
        // Load from Firestore or UserDefaults
    }
}
```

### Testing Checklist for Phase D

- [ ] FCM token generated and printed in console
- [ ] FCM token saved to Firestore (check Firebase Console)
- [ ] Can send test notification from Firebase Console
- [ ] Notification appears on device
- [ ] Tapping notification opens app
- [ ] Notification permission requested on first launch

**Test Notification from Firebase Console:**
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter test message
4. Select your app
5. Paste FCM token from console

---

## Phase E: AI-Generated Quotes

### Backend Prerequisite: Phase E Complete ✅

### Step 1: Create GeminiService

**Create new file: `Core/Services/GeminiService.swift`**

```swift
import Foundation
import FirebaseFunctions

/// Calls Cloud Functions for AI-generated quotes
/// Never calls Gemini API directly (security)
@MainActor
class GeminiService: ObservableObject {
    static let shared = GeminiService()

    private let functions = Functions.functions()

    @Published var isGenerating = false
    @Published var quotaRemaining: Int = 5

    private init() {}

    /// Generate personalized quote via Cloud Function (AI proxy)
    func generatePersonalizedQuote(
        mood: String,
        expectations: [String],
        timeOfDay: String
    ) async throws -> Quote? {

        isGenerating = true
        defer { isGenerating = false }

        let callable = functions.httpsCallable("generatePersonalizedQuote")

        let data: [String: Any] = [
            "mood": mood,
            "expectations": expectations,
            "timeOfDay": timeOfDay
        ]

        do {
            let result = try await callable.call(data)

            guard let response = result.data as? [String: Any],
                  let success = response["success"] as? Bool else {
                print("❌ Invalid response from Cloud Function")
                return nil
            }

            // Update quota
            if let remaining = response["quotaRemaining"] as? Int {
                quotaRemaining = remaining
            }

            // Handle quota exceeded
            if !success {
                if let error = response["error"] as? String {
                    print("⚠️ AI quote generation: \(error)")

                    if error == "daily_quota_exceeded" {
                        print("⚠️ Daily quota exceeded (5/day limit)")
                    }
                }
                return nil
            }

            // Parse quote
            guard let quoteData = response["quote"] as? [String: Any],
                  let text = quoteData["text"] as? String,
                  let author = quoteData["author"] as? String else {
                print("❌ Failed to parse quote data")
                return nil
            }

            let categories = quoteData["categories"] as? [String] ?? ["motivation"]
            let source = quoteData["source"] as? String ?? "ai_generated"

            let quote = Quote(
                text: text,
                author: author,
                categories: categories,
                source: source
            )

            print("✅ Received AI quote (source: \(source))")
            return quote

        } catch {
            print("❌ Cloud Function error: \(error.localizedDescription)")
            throw error
        }
    }

    /// Get time of day string
    func getCurrentTimeOfDay() -> String {
        let hour = Calendar.current.component(.hour, from: Date())

        switch hour {
        case 5..<12:
            return "morning"
        case 12..<17:
            return "afternoon"
        case 17..<21:
            return "evening"
        default:
            return "night"
        }
    }
}
```

### Step 2: Update QuoteService with AI Integration

**Modify: `Core/Services/QuoteService.swift`**

```swift
import Foundation

@MainActor
class QuoteService: ObservableObject {
    static let shared = QuoteService()

    private let remoteConfigService = RemoteConfigService.shared
    private let geminiService = GeminiService.shared

    /// Get personalized quote with 4-level fallback:
    /// 1. Try Remote Config quotes (200+)
    /// 2. Try AI-generated quote (if quota available)
    /// 3. Fall back to local quotes (50)
    /// 4. Fall back to hardcoded quote
    func getQuote(
        for mood: String,
        expectations: [String],
        useAI: Bool = true
    ) async -> Quote {

        // Step 1: Try Remote Config first (fastest, free)
        let remoteQuotes = remoteConfigService.getQuotes(
            for: mood,
            expectations: expectations
        )

        if !remoteQuotes.isEmpty {
            let selectedRemote = remoteQuotes.randomElement()!
            print("✅ Using Remote Config quote")
            return Quote(
                text: selectedRemote.text,
                author: selectedRemote.author,
                categories: selectedRemote.categories,
                source: "remote_config"
            )
        }

        // Step 2: Try AI if enabled and quota available
        if useAI && remoteConfigService.aiQuotesEnabled && geminiService.quotaRemaining > 0 {
            do {
                let timeOfDay = geminiService.getCurrentTimeOfDay()

                if let aiQuote = try await geminiService.generatePersonalizedQuote(
                    mood: mood,
                    expectations: expectations,
                    timeOfDay: timeOfDay
                ) {
                    print("✅ Using AI-generated quote")
                    return aiQuote
                }
            } catch {
                print("⚠️ AI quote generation failed: \(error.localizedDescription)")
            }
        }

        // Step 3: Fall back to local quotes
        let localMatches = localQuotes.filter { quote in
            // Your existing matching logic
            return true
        }

        if !localMatches.isEmpty {
            print("⚠️ Falling back to local quotes")
            return localMatches.randomElement()!
        }

        // Step 4: Hardcoded fallback (never fail)
        print("⚠️ Using hardcoded fallback quote")
        return Quote(
            text: "Every moment is a fresh beginning.",
            author: "T.S. Eliot",
            categories: ["motivation"],
            source: "fallback"
        )
    }
}
```

### Step 3: Display AI Quote Status (Optional)

**Add to your mood entry view:**

```swift
struct MoodEntryView: View {
    @StateObject private var geminiService = GeminiService.shared

    var body: some View {
        VStack {
            // Your existing mood entry UI

            // Show AI quota status
            if geminiService.quotaRemaining < 5 {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                    Text("\(geminiService.quotaRemaining) AI quotes remaining today")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)
            }
        }
    }
}
```

### Testing Checklist for Phase E

- [ ] AI quotes generate successfully
- [ ] Console shows "Using AI-generated quote"
- [ ] Quota counter decreases (5 → 4 → 3...)
- [ ] After 5 quotes, fallback to Remote Config
- [ ] Can see source type in quote display
- [ ] Offline mode falls back to local quotes

---

## Phase F: Analytics Events

### Backend Prerequisite: Phase F Complete ✅

### Step 1: Add Analytics Tracking

**Throughout your app, add:**

```swift
import FirebaseAnalytics

// Track mood check-in
Analytics.logEvent("mood_checked_in", parameters: [
    "mood_type": moodType,
    "has_note": note != nil,
    "timestamp": Date().timeIntervalSince1970
])

// Track quote displayed
Analytics.logEvent("quote_displayed", parameters: [
    "quote_source": quoteSource, // "remote_config", "ai_generated", "local", "fallback"
    "mood_type": moodType,
    "categories": categories.joined(separator: ",")
])

// Track AI quote generation
Analytics.logEvent("ai_quote_generated", parameters: [
    "mood": mood,
    "expectations": expectations.joined(separator: ","),
    "time_of_day": timeOfDay,
    "quota_remaining": quotaRemaining
])

// Track notification opened
Analytics.logEvent("notification_opened", parameters: [
    "notification_type": "daily_reminder"
])

// Track streak milestone
Analytics.logEvent("streak_milestone", parameters: [
    "days": streakDays,
    "milestone": streakDays // 7, 30, 100, etc.
])
```

### Step 2: Track User Properties

```swift
import FirebaseAnalytics

// Set user expectations
Analytics.setUserProperty(
    expectations.joined(separator: ","),
    forName: "user_expectations"
)

// Track app version
Analytics.setUserProperty(
    Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
    forName: "app_version"
)
```

---

## 🔒 Security Best Practices

### Never Do This ❌

```swift
// ❌ NEVER call Gemini API directly
let apiKey = "AIzaSy..." // NEVER hardcode API keys
let url = "https://generativelanguage.googleapis.com/..."

// ❌ NEVER commit GoogleService-Info.plist
// ❌ NEVER commit API keys
// ❌ NEVER bypass rate limiting
```

### Always Do This ✅

```swift
// ✅ Call Cloud Functions (AI proxy)
let result = try await functions.httpsCallable("generatePersonalizedQuote").call(data)

// ✅ Add GoogleService-Info.plist to .gitignore
// ✅ Respect rate limits and quotas
// ✅ Handle errors gracefully with fallbacks
// ✅ Use offline-first architecture
```

---

## 🧪 Testing Guide

### Local Testing with Emulators

```swift
#if DEBUG
// Use Firebase Emulators
Auth.auth().useEmulator(withHost: "localhost", port: 9099)

let settings = Firestore.firestore().settings
settings.host = "localhost:8080"
settings.isSSLEnabled = false
Firestore.firestore().settings = settings

Functions.functions().useEmulator(withHost: "localhost", port: 5001)
#endif
```

### Test Checklist

**Phase A: Firebase Setup**
- [ ] Firebase initializes without errors
- [ ] Anonymous auth works
- [ ] User ID appears in Firebase Console

**Phase B: Remote Config**
- [ ] Remote Config fetches on app launch
- [ ] Quotes appear from Remote Config
- [ ] Offline fallback works

**Phase C: Mood Sync**
- [ ] Mood entries sync to Firestore
- [ ] Entries visible in Firebase Console
- [ ] Pull-to-refresh works

**Phase D: Push Notifications**
- [ ] FCM token registered
- [ ] Token saved to Firestore
- [ ] Test notification received
- [ ] Notification tap opens app

**Phase E: AI Quotes**
- [ ] AI quotes generate successfully
- [ ] Quota tracking works
- [ ] Fallback to Remote Config after quota
- [ ] Cache hit rate >70%

**Phase F: Analytics**
- [ ] Events appear in Firebase Console
- [ ] User properties set correctly
- [ ] Debug view shows events (Firebase DebugView)

---

## 📊 Monitoring & Debugging

### Enable Debug Logging

```swift
// In App init
#if DEBUG
FirebaseConfiguration.shared.setLoggerLevel(.debug)
#endif
```

### View Firebase Console

- **Authentication**: See all anonymous users
- **Firestore**: Browse user data and mood entries
- **Remote Config**: Update quotes without app release
- **Cloud Messaging**: Send test notifications
- **Analytics**: View events in real-time (DebugView)
- **Crashlytics**: Monitor crashes (if added)

### Common Issues

**Issue**: Firebase not initializing
**Solution**: Ensure `GoogleService-Info.plist` is in project and added to target

**Issue**: Auth fails
**Solution**: Enable Anonymous Auth in Firebase Console

**Issue**: FCM token not generating
**Solution**: Enable "Push Notifications" capability in Xcode

**Issue**: AI quotes failing
**Solution**: Check Cloud Functions logs in Firebase Console

**Issue**: Quota exceeded immediately
**Solution**: Check Firestore for user quota documents

---

## 📦 Deliverables from Backend Team

You should receive from the backend team:

1. **GoogleService-Info.plist** - Firebase configuration
2. **Firebase Project ID** - For console access
3. **Cloud Functions endpoints** - Should be auto-configured
4. **Remote Config structure** - Documentation of quote format
5. **Firestore security rules** - Already deployed
6. **API documentation** - Cloud Functions API reference

---

## 🚀 Deployment Checklist

Before App Store submission:

- [ ] Remove all debug logging
- [ ] Test on physical device (not just simulator)
- [ ] Test offline mode thoroughly
- [ ] Test push notifications on real device
- [ ] Update Privacy Policy with Firebase data collection
- [ ] Test all fallback scenarios
- [ ] Verify analytics events
- [ ] Test quota limits (exceed 5 quotes/day)
- [ ] Verify all sensitive files in .gitignore
- [ ] Code review all Firebase integration

---

## 📝 Privacy Policy Updates

Add to your Privacy Policy:

```markdown
### Data Collection

We use Firebase services provided by Google to power cloud features:

**Authentication**
- Anonymous user ID for secure data access
- No personal information collected

**Cloud Firestore**
- Mood entries and notes
- User preferences (notification time, expectations)
- Stored securely with encryption

**Cloud Messaging**
- Device notification token
- Used only for sending daily reminders

**Analytics**
- App usage statistics
- Feature engagement metrics
- Anonymized and aggregated

**AI Features**
- Mood and expectation data sent to generate personalized quotes
- Processed securely via Google Gemini AI
- Not stored or used for training

### Your Rights

- Export all your data anytime
- Delete your account and data
- Disable cloud sync (use local-only mode)
- Opt out of analytics

For more information, see Firebase Privacy Policy: https://firebase.google.com/support/privacy
```

---

## 🆘 Support & Resources

### Documentation
- [Firebase iOS SDK](https://firebase.google.com/docs/ios/setup)
- [Cloud Functions Client SDK](https://firebase.google.com/docs/functions/callable)
- [Remote Config iOS](https://firebase.google.com/docs/remote-config/ios)
- [FCM iOS](https://firebase.google.com/docs/cloud-messaging/ios)

### Contact Backend Team
- For Cloud Functions issues
- For Firestore schema questions
- For quota/budget concerns
- For security rule updates

### Common Questions

**Q: Why anonymous auth instead of email?**
A: Reduces friction, no privacy concerns, sufficient for single-device usage. Can upgrade to email/social later for multi-device sync.

**Q: Why not call Gemini API directly?**
A: Security (API key exposure), cost control (no rate limiting), and monitoring (centralized tracking).

**Q: What happens if budget is exceeded?**
A: Cloud Functions auto-fallback to Remote Config quotes. User experience unchanged, just less personalization.

**Q: How often should we sync to Firestore?**
A: After every mood entry. Background sync is cheap (<1KB per entry).

**Q: Can users use app offline?**
A: Yes! Offline-first architecture. All features work without network. Sync happens when back online.

---

## 🎉 Summary

This guide covers all Firebase and AI backend integration for Happify-2. Follow phases A through F sequentially, coordinating with backend team completion of each phase.

**Key Principles:**
- ✅ Offline-first (all features work without network)
- ✅ Security-first (never expose API keys)
- ✅ Graceful fallbacks (never show errors to users)
- ✅ Cost-conscious (respect quotas and rate limits)

**Questions?** Contact backend team or refer to implementation guides in the backend repository.

---

**Built with ❤️ using Firebase + Google Gemini AI**
