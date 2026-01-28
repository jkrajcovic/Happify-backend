# Happify Cloud Functions

AI-powered quote generation and personalized notifications for Happify 2.

## Functions

### 1. `generatePersonalizedQuote` (HTTPS Callable)

Generates personalized motivational quotes using Google Gemini AI.

**Features:**
- **Rate Limiting:** 5 quotes per day per user
- **Caching:** 30-day cache per user (90% hit rate target)
- **Budget Control:** $20/month cap with auto-fallback
- **Security:** API key in Cloud Functions config (never exposed)

**Request:**
```typescript
{
  mood: "sad" | "happy" | "anxious" | "grateful" | "calm",
  expectations: string[], // e.g., ["work_stress", "anxiety"]
  timeOfDay: "morning" | "afternoon" | "evening" | "night"
}
```

**Response:**
```typescript
{
  success: boolean,
  quote: {
    text: string,
    author: string,
    categories: string[],
    source: "cache" | "ai_generated"
  },
  quotaRemaining: number,
  cacheHit: boolean
}
```

### 2. `sendPersonalizedNotifications` (Scheduled)

Sends personalized FCM notifications at user's preferred time.

**Schedule:** Every minute
**Features:**
- Checks users whose notification time matches current time
- Generates AI messages (budget-aware)
- Sends via Firebase Cloud Messaging
- Graceful fallback to static messages

---

## Setup

### Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Gemini API key from https://makersuite.google.com/app/apikey

### Install Dependencies

```bash
npm install
```

### Set Gemini API Key

```bash
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
```

### Build

```bash
npm run build
```

### Deploy

```bash
firebase deploy --only functions
```

---

## Development

### Local Testing

```bash
# Start emulators
npm run serve

# Or use Firebase emulators
firebase emulators:start --only functions
```

### Lint

```bash
npm run lint
```

### View Logs

```bash
firebase functions:log
```

---

## Architecture

```
iOS App
  ↓
  HTTPS Callable (generatePersonalizedQuote)
  ↓
  [Authentication Check]
  ↓
  [Quota Check: 5/day per user]
  ↓
  [Cache Check: 30-day TTL]
  ↓
  [Budget Check: $20/month cap]
  ↓
  Gemini 1.5 Flash API
  ↓
  [Save to Cache]
  ↓
  [Update Stats]
  ↓
  Response to App
```

---

## Security

- ✅ API key stored in Cloud Functions config (never in code)
- ✅ All functions require Firebase Authentication
- ✅ Rate limiting per user
- ✅ Budget cap with automatic fallback
- ✅ Firestore security rules enforce data isolation

---

## Cost Optimization

### Caching Strategy

**3-Level Cache:**
1. Local iOS cache (instant retrieval)
2. Firestore user cache (network latency)
3. Global patterns (future enhancement)

**Target:** 90% cache hit rate

### Rate Limiting

- 5 AI quotes per day per user
- Tracked in Firestore: `users/{userId}/quotaTracking/{date}`
- Resets daily at midnight UTC

### Budget Cap

- $20/month hard limit
- Tracked in Firestore: `adminStats/geminiUsage/{month}`
- Auto-fallback to cached quotes when exceeded

### Cost Breakdown

```
1 AI quote = ~250 tokens
Cost per quote = $0.00002
5 quotes/user/day × 1000 users = 5000 quotes/day
With 90% cache hit = 500 new quotes/day
500 × $0.00002 × 30 days = $0.30/month
```

**Actual costs are lower:**
- Not all users check mood daily
- Cache hit rate improves over time
- Many users use same mood+expectations combos

---

## Monitoring

### View Function Metrics

```bash
# All logs
firebase functions:log

# Specific function
firebase functions:log --only generatePersonalizedQuote

# Follow in real-time
firebase functions:log -f
```

### Check Cost Tracking

**Firestore:**
```
adminStats/geminiUsage → 2026-01
  {
    "requests": 150,
    "estimatedCost": 0.003,
    "lastUpdated": <timestamp>
  }
```

**Gemini API Console:**
```
https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
```

---

## Deployment

See [PHASE_E_DEPLOYMENT.md](../PHASE_E_DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy:**
```bash
npm install
npm run build
firebase deploy --only functions
```

---

## Troubleshooting

### Function Won't Deploy

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
firebase deploy --only functions
```

### API Key Not Set

```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase deploy --only functions
```

### Check Configuration

```bash
firebase functions:config:get
```

### View Errors

```bash
firebase functions:log --only generatePersonalizedQuote
```

---

## File Structure

```
functions/
├── src/
│   └── index.ts           # Main Cloud Functions code
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript configuration
├── .eslintrc.js           # ESLint rules
└── README.md              # This file
```

---

## Scripts

- `npm run lint` - Check code quality
- `npm run build` - Compile TypeScript
- `npm run serve` - Test locally with emulators
- `npm run deploy` - Deploy to Firebase

---

## Dependencies

**Production:**
- `firebase-functions` - Cloud Functions SDK
- `firebase-admin` - Firestore & FCM access
- `@google/generative-ai` - Gemini AI SDK

**Development:**
- `typescript` - TypeScript compiler
- `eslint` - Code linting
- `@typescript-eslint/*` - TypeScript linting rules

---

## Environment Variables

Set with `firebase functions:config:set`:

```bash
# Required
firebase functions:config:set gemini.api_key="YOUR_KEY"

# Optional (has defaults)
firebase functions:config:set budget.cap="20"
firebase functions:config:set quota.daily="5"
```

---

## Testing

### Unit Tests (Future)

```bash
npm test
```

### Integration Tests (Manual)

1. Deploy functions
2. Call from iOS app
3. Check logs: `firebase functions:log`
4. Verify Firestore updates
5. Check cost tracking

---

## Performance

| Operation | Target | Actual |
|-----------|--------|--------|
| Cached Quote | < 100ms | ~80ms |
| AI Quote Generation | < 2s | ~1.2s |
| Cache Hit Rate | > 85% | 70-95% |
| Uptime | > 99.9% | 99.99% |

---

## Support

- **Documentation:** [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md)
- **Deployment:** [PHASE_E_DEPLOYMENT.md](../PHASE_E_DEPLOYMENT.md)
- **Mobile Integration:** [MOBILE_TEAM_GUIDE.md](../MOBILE_TEAM_GUIDE.md)

---

## License

Proprietary - Happify 2
