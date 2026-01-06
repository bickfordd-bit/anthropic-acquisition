# Sentry Monitoring Setup Guide

## 🎯 What is Sentry and Why We Use It

Sentry is an automated error and performance monitoring platform that watches your application 24/7. Once configured, it **automatically** captures errors, tracks performance, and notifies you when issues occur—**no manual intervention required**.

### What Gets Tracked Automatically

1. **Client-Side Errors** (Browser/React)
   - Unhandled JavaScript errors
   - React component errors
   - Network request failures
   - Console errors

2. **Server-Side Errors** (API Routes, Server Components)
   - API route exceptions
   - Server component rendering errors
   - Database errors
   - External API failures

3. **Performance Metrics**
   - Page load times
   - API response times
   - Database query performance
   - Browser rendering metrics

4. **User Sessions** (Optional Replays)
   - Session recordings for debugging
   - User interaction replay
   - Console logs and network activity

## 📁 Configuration Files Explained

### `sentry.client.config.ts` - Client-Side Monitoring

**What it does:** Monitors everything that happens in the user's browser.

**Key features:**
- Captures React errors and unhandled exceptions
- Tracks page load performance
- Records user sessions (with privacy controls)
- Monitors network requests

**Configuration:**
- `tracesSampleRate: 1.0` - Track 100% of performance traces (adjust in production to 0.1 for 10%)
- `replaysSessionSampleRate: 0.1` - Record 10% of normal sessions
- `replaysOnErrorSampleRate: 1.0` - Record 100% of sessions with errors
- `maskAllText: true` - Hides sensitive text in replays
- `blockAllMedia: true` - Blocks images/videos in replays for privacy

### `sentry.server.config.ts` - Server-Side Monitoring

**What it does:** Monitors your Next.js API routes and server components.

**Key features:**
- Captures API route errors
- Tracks server component errors
- Monitors server performance
- Records database errors

**Configuration:**
- `tracesSampleRate: 1.0` - Track all server operations (adjust to 0.1 in production)
- Uses `NEXT_PUBLIC_SENTRY_DSN` environment variable for configuration

### `sentry.edge.config.ts` - Edge Runtime Monitoring

**What it does:** Monitors Next.js middleware and edge functions.

**Key features:**
- Captures middleware errors
- Tracks edge function performance
- Monitors request routing issues

**Configuration:**
- Same sampling rates as server config
- Lightweight configuration for edge runtime

### `next.config.ts` - Sentry Integration

**What it does:** Integrates Sentry into your Next.js build process.

**Key features:**
- Automatically uploads source maps during builds
- Enables readable stack traces in production
- Creates release tracking for deployments
- Adds monitoring tunnel to bypass ad-blockers

**Configuration:**
- `widenClientFileUpload: true` - Upload more source maps for better stack traces
- `sourcemaps.disable: true` - Keep production bundles secure
- `tunnelRoute: "/monitoring"` - Route Sentry requests through your domain
- `automaticVercelMonitors: true` - Enable cron job monitoring

## 🔧 Environment Variables Configuration

Add these to your `.env` file (see `.env.example` for reference):

```bash
# Required: Your Sentry DSN (Data Source Name)
# Get this from: https://sentry.io/settings/[org]/projects/[project]/keys/
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]

# Optional: For source map uploads (needed for readable stack traces)
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
```

### Getting Your Configuration Values

1. **Sign up at [sentry.io](https://sentry.io)** (free tier available)
2. **Create a new project** and select "Next.js"
3. **Get your DSN**: Settings → Projects → [Your Project] → Client Keys (DSN)
4. **Get your auth token** (for source maps): Settings → Account → Auth Tokens → Create New Token
   - Scopes needed: `project:read`, `project:releases`, `org:read`

## 🚀 How Automated Monitoring Works

### 1. Error Detection (Zero Manual Intervention)

Once configured, Sentry automatically:
- Catches all unhandled errors across your application
- Captures stack traces with original TypeScript code (thanks to source maps)
- Records the user's session context (browser, OS, previous actions)
- Groups similar errors together for easier management

**You get notified via:**
- Email alerts (configurable)
- Slack/Discord webhooks (optional)
- Sentry dashboard

### 2. Performance Monitoring

Automatically tracks:
- **Slow pages**: Which routes take longest to load
- **Slow APIs**: Which endpoints have high response times
- **Database queries**: Which queries are bottlenecks
- **Trends over time**: Performance degradation alerts

### 3. Release Tracking

Every deployment is tracked as a "release" in Sentry:
- Know exactly which code version introduced a bug
- See error trends per release
- Compare performance across deployments

**How it works:**
1. During build, Sentry uploads source maps tagged with release version
2. Release version is set via `SENTRY_RELEASE` environment variable
3. Errors link directly to the release that introduced them

## 📊 How to View and Respond to Errors

### Viewing Errors in Sentry Dashboard

1. **Go to [sentry.io](https://sentry.io)** and log in
2. **Navigate to Issues** to see all errors
3. **Click on an issue** to see:
   - Full stack trace with TypeScript code
   - User context (browser, OS, etc.)
   - Breadcrumbs (user actions before error)
   - Session replay (if enabled)
   - Frequency and affected user count

### Responding to Errors

1. **Triage**: Mark as resolved, ignored, or assigned
2. **Debug**: Use stack traces and replays to understand root cause
3. **Fix**: Make code changes
4. **Deploy**: New release automatically tracked
5. **Verify**: Sentry shows if error stops occurring

### Error Notifications

Configure alerts in Sentry:
- **Settings → Alerts → Create Alert Rule**
- Choose notification method (email, Slack, etc.)
- Set conditions (e.g., "When error occurs >10 times in 1 hour")

## 🔄 Integration with Deployment Scripts

### `scripts/netlify-auto-deploy.sh`

**Current behavior:** Builds and deploys to Netlify

**Sentry enhancement:** Add release tracking

```bash
# Add before build step:
export SENTRY_RELEASE="$(git rev-parse HEAD)"

# Add after successful deploy:
if command -v sentry-cli &> /dev/null; then
  sentry-cli releases new "$SENTRY_RELEASE"
  sentry-cli releases set-commits "$SENTRY_RELEASE" --auto
  sentry-cli releases finalize "$SENTRY_RELEASE"
fi
```

### `scripts/auto-heal.sh`

**Current behavior:** Monitors health endpoint and restarts server

**Sentry integration:** Reference error data for intelligent healing

```bash
# Check Sentry for recent errors before restarting
# If errors are external (3rd party API down), wait instead of restart
# If errors are internal (code bug), restart and alert
```

**Note:** Full integration with auto-heal requires Sentry CLI and API access

## 🧪 Testing Your Setup

### 1. Test Error Endpoint

We've created a test endpoint at `/api/sentry-test` that intentionally throws an error:

```bash
curl http://localhost:3000/api/sentry-test
```

**Expected result:**
- Returns 500 error response
- Error appears in Sentry dashboard within 1-2 minutes

### 2. Test Client Error

Add this to any page component temporarily:

```typescript
<button onClick={() => { throw new Error("Test client error"); }}>
  Test Sentry
</button>
```

Click the button and check Sentry dashboard.

### 3. Test Performance Monitoring

Navigate through your app normally. Within a few minutes, you should see:
- Page load times in Sentry → Performance
- Transaction traces for each route

## 🔒 Privacy and Security

### Data Sensitivity

Sentry configuration includes privacy protections:
- `maskAllText: true` - Hides all text in session replays
- `blockAllMedia: true` - Blocks images/videos in replays
- Stack traces never include sensitive data (passwords, tokens)

### Source Maps Security

- Source maps are uploaded to Sentry (not public)
- `sourcemaps.disable: true` prevents maps from being included in production bundles
- Only your Sentry organization can access maps

### PII Scrubbing

Sentry automatically scrubs common PII:
- Credit card numbers
- Social security numbers
- Passwords and auth tokens in URLs

Configure additional scrubbing in Sentry → Settings → Security & Privacy

## 🎓 What This Setup Enables

### 1. Proactive Issue Detection
- Get notified of errors before users report them
- Understand which errors affect the most users
- Prioritize fixes based on impact

### 2. Faster Debugging
- Click on error → see exact TypeScript line that failed
- View user session replay to see what led to error
- See all context: browser, OS, network conditions

### 3. Performance Insights
- Identify slow pages without manual testing
- Track API response times automatically
- Get alerted when performance degrades

### 4. Release Confidence
- Know immediately if new deployment introduces errors
- Compare error rates across releases
- Roll back confidently when needed

### 5. No Manual Monitoring Required
- Once set up, everything is automatic
- No need to check logs manually
- No need to ask users for error details

## 🛠️ Advanced Configuration

### Adjusting Sample Rates for Production

Edit config files to reduce data volume in production:

**Client config:**
```typescript
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
```

**Server config:**
```typescript
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
```

### Custom Tags and Context

Add business context to errors:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.setTag("feature", "checkout");
Sentry.setContext("order", { orderId: "12345", total: 99.99 });
```

### Filtering Sensitive Data

Add to config files:

```typescript
beforeSend(event, hint) {
  // Remove sensitive data
  if (event.request?.headers) {
    delete event.request.headers.authorization;
  }
  return event;
}
```

## ❓ Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN is set**: `echo $NEXT_PUBLIC_SENTRY_DSN`
2. **Check network**: Sentry requires outbound HTTPS access
3. **Check sampling**: If rate is 0.1, only 10% of errors are sent
4. **Wait 2-3 minutes**: Processing has slight delay

### Source Maps Not Working

1. **Check auth token is set**: `SENTRY_AUTH_TOKEN`
2. **Check org/project match**: `SENTRY_ORG` and `SENTRY_PROJECT`
3. **Rebuild**: `npm run build` uploads maps
4. **Check Sentry dashboard**: Settings → Projects → Source Maps

### Build Failures

If build fails with Sentry:
1. **Set `silent: true`** in `next.config.ts` Sentry options
2. **Check auth token scopes**: Needs `project:releases`
3. **Disable uploads temporarily**: Comment out `withSentryConfig` wrapper

## 📚 Additional Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Session Replay](https://docs.sentry.io/product/session-replay/)
- [Sentry CLI Documentation](https://docs.sentry.io/cli/)

## 🎯 Success Checklist

- [x] Sentry SDK installed (`@sentry/nextjs`)
- [x] Client config created (`sentry.client.config.ts`)
- [x] Server config created (`sentry.server.config.ts`)
- [x] Edge config created (`sentry.edge.config.ts`)
- [x] Next.js config updated with Sentry integration
- [x] Environment variables documented in `.env.example`
- [x] Test endpoint created at `/api/sentry-test`
- [ ] DSN configured in `.env` (do this after creating Sentry project)
- [ ] Test endpoint verified (after DSN is set)
- [ ] First error captured in Sentry dashboard

**Next steps:**
1. Sign up at sentry.io and create a Next.js project
2. Copy DSN to `.env` as `NEXT_PUBLIC_SENTRY_DSN`
3. Run `npm run build` to upload source maps
4. Test with `curl http://localhost:3000/api/sentry-test`
5. Check Sentry dashboard for your first error!
