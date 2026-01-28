# Happify Backend

> Cloud backend for Happify-2 iOS app with Firebase and AI-powered personalized quotes

## 📚 Documentation

- **[Backend Plan](./backend-plan.md)** - Comprehensive architecture and cost analysis
- **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)** - Step-by-step instructions with GitHub workflow

## 🎯 Quick Start

### Prerequisites

1. **Install tools:**
   ```bash
   # Firebase CLI
   npm install -g firebase-tools

   # GitHub CLI (macOS)
   brew install gh

   # Node.js (for Cloud Functions)
   # Download from https://nodejs.org/ (v18+)
   ```

2. **Authenticate:**
   ```bash
   # Firebase
   firebase login

   # GitHub
   gh auth login
   ```

### Get Started

1. **Read the plan:**
   ```bash
   open backend-plan.md
   ```

2. **Follow implementation guide:**
   ```bash
   open IMPLEMENTATION_GUIDE.md
   ```

3. **Start with Phase A (Firebase Setup):**
   - Create Firebase project
   - Enable Anonymous Auth
   - Set up Firestore
   - Deploy security rules

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    iOS APP (Swift)                       │
├─────────────────────────────────────────────────────────┤
│  QuoteService  │  MoodDataService  │  NotificationService│
│       ↓               ↓                    ↓             │
│  Local Cache (UserDefaults → SwiftData)                 │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     ┌─────────────────┐   ┌──────────────────┐
     │  FIREBASE SDK   │   │ CLOUD FUNCTIONS  │
     └────────┬─────────┘   └────────┬─────────┘
              │                      │
   ┌──────────┴─────┐                │
   ▼                ▼                ▼
Firestore    Remote Config    Gemini API Proxy
  FCM         Analytics       (Rate Limit + Cache)
  Auth
```

## 🔒 Security Features

- ✅ **AI Proxy:** Gemini API key never exposed in iOS app
- ✅ **Anonymous Auth:** Secure user identification
- ✅ **Firestore Rules:** Users can only access their own data
- ✅ **Rate Limiting:** 5 AI quotes per day per user
- ✅ **Budget Cap:** $20/month hard limit

## 💰 Cost Structure

| Users   | Firebase | Gemini API | Total       |
|---------|----------|------------|-------------|
| 100     | $0       | $0         | **$0/month** |
| 1,000   | $0       | $0-1       | **$0-1/month** |
| 10,000  | $1       | $7-8       | **$8-9/month** |

**Key to low cost:** 90% cache hit rate + aggressive fallbacks

## 🚀 Implementation Status

**Current Phase:** Phase 0 - Planning Complete ✅

**Next Steps:**
1. Phase A: Firebase Setup
2. Phase E: AI Proxy (Cloud Functions)
3. Phase B: Remote Config
4. Phase C: Mood Sync
5. Phase D: FCM Notifications

See [backend-plan.md](./backend-plan.md#implementation-progress) for detailed progress tracking.

## 🔧 Technology Stack

**Backend:**
- Firebase Authentication (Anonymous)
- Cloud Firestore (NoSQL database)
- Firebase Cloud Messaging (Push notifications)
- Firebase Remote Config (Dynamic content)
- Cloud Functions (Node.js/TypeScript)
- Google Gemini 1.5 Flash (AI quotes)

**iOS App:**
- Swift / SwiftUI
- Firebase iOS SDK
- MVVM architecture
- Offline-first design

## 📖 Key Files

```
Happify-backend/
├── README.md                     # This file
├── backend-plan.md               # Complete architecture plan
├── IMPLEMENTATION_GUIDE.md       # Step-by-step instructions
├── firebase.json                 # Firebase configuration
├── firestore.rules               # Security rules
├── remoteconfig.template.json    # Remote Config template
└── functions/                    # Cloud Functions
    ├── src/
    │   └── index.ts              # AI proxy + notifications
    ├── package.json
    └── tsconfig.json
```

## 🧪 Testing

### Local Development

```bash
# Start Firebase emulators
firebase emulators:start

# Test Cloud Functions locally
cd functions
npm run serve
```

### Production Deployment

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Remote Config
firebase deploy --only remoteconfig
```

## 📊 Monitoring

**Firebase Console:**
- [Authentication](https://console.firebase.google.com/) - User stats
- [Firestore](https://console.firebase.google.com/) - Database usage
- [Functions](https://console.firebase.google.com/) - Invocations & logs
- [Analytics](https://console.firebase.google.com/) - User engagement

**Google Cloud Console:**
- [Gemini API Usage](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com)
- [Billing](https://console.cloud.google.com/billing) - Cost tracking

## 🤝 Contributing

We use **GitHub flow** for all changes:

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit
3. Push and create PR: `gh pr create`
4. After approval, merge and delete branch

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md#github-workflow) for details.

## 📝 Commit Convention

```
feat: add new feature
fix: bug fix
docs: documentation
refactor: code refactoring
test: adding tests
chore: maintenance
```

## 🆘 Support

- **Firebase Docs:** https://firebase.google.com/docs
- **Gemini API Docs:** https://ai.google.dev/docs
- **GitHub Issues:** Report bugs and request features

## 📄 License

[Your License Here]

---

**Built with ❤️ using Firebase + Google Gemini AI**
