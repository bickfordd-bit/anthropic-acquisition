# Bickford Quick Start Guide

This guide helps you get the Bickford autonomous execution system up and running quickly.

## Prerequisites

- Node.js 18+ installed
- Git configured with push access to this repository
- Netlify account (optional, for deployment features)
- Anthropic API key (for Claude-powered planning)

## Installation (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:

```bash
# Required
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Optional but recommended for full features
NETLIFY_SITE_ID="your-netlify-site-id"
NETLIFY_TOKEN="your-netlify-token"
NETLIFY_BUILD_HOOK="https://api.netlify.com/build_hooks/your-hook"
BICKFORD_BASE_URL="https://your-site.netlify.app"

# Security tokens
DATA_ROOM_TOKEN="$(openssl rand -hex 32)"
BICKFORD_API_TOKEN="$(openssl rand -hex 32)"
```

### 3. Initialize Database

```bash
npm run prisma:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Usage

### Via UI Console

1. Navigate to the Bickford Console component on the homepage
2. Enter a natural language intent, for example:
   - "Update the README with today's date"
   - "Add a new section to the homepage"
   - "Change the color scheme to dark mode"
3. Click "Execute"
4. Watch the real-time execution log
5. Click the ledger link to see full audit trail

### Via API

#### Execute Intent

```bash
curl -X POST http://localhost:3000/api/bickford/execute \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "Add a hello world message to the homepage"
  }'
```

Response:
```json
{
  "success": true,
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "summary": "Added hello world message",
  "filesChanged": 1,
  "commitSha": "abc1234567",
  "deployUrl": "https://your-site.netlify.app",
  "deployStatus": "ready"
}
```

#### Query Execution Ledger

```bash
curl http://localhost:3000/api/bickford/ledger/550e8400-e29b-41d4-a716-446655440000
```

Response:
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "eventCount": 5,
  "events": [
    {
      "type": "EXECUTION_STARTED",
      "executionId": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2024-01-05T12:00:00.000Z",
      "intent": "Add a hello world message to the homepage"
    },
    {
      "type": "PLAN_GENERATED",
      "executionId": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2024-01-05T12:00:02.000Z",
      "canonDecision": "ALLOW",
      "canonRationale": "Plan conforms to all Canon rules"
    }
    // ... more events
  ]
}
```

## System Architecture

```
User Intent (Natural Language)
    ↓
Claude Planner (lib/bickford/claudePlanner.ts)
    ↓ Generates JSON plan
Canon Evaluator (lib/canon/core.ts)
    ↓ ALLOW/DENY
File Applier (lib/bickford/applier.ts)
    ↓ Captures diff
Git Commit (lib/bickford/git.ts)
    ↓ Returns SHA
Netlify Deploy (lib/bickford/netlify.ts)
    ↓ Polls status
Success or Rollback (lib/bickford/rollback.ts)
```

## Safety Features

### Canon Rules
The system will automatically DENY plans that:
- Attempt to modify the ledger directly
- Attempt to modify node_modules
- Violate Constitutional AI principles
- Don't include file-level changes

### Append-Only Ledger
All events are logged to `ledger/ledger.jsonl`:
- Cannot be modified
- Cannot be deleted
- Full audit trail
- Searchable by execution ID

### Automatic Rollback
If deployment fails:
1. System detects failure via Netlify polling
2. Executes `git reset --hard HEAD~1`
3. Force pushes to remote
4. Logs rollback event

## File Locations

### Core System
- `lib/ledger/` - Ledger types and operations
- `lib/canon/` - Safety rules
- `lib/bickford/` - Execution components

### API Endpoints
- `app/api/bickford/execute/` - Main execution
- `app/api/bickford/ledger/[executionId]/` - Query ledger
- `app/api/bickford/plan/` - Plan preview (optional)

### UI Components
- `app/components/BickfordConsole.tsx` - Main UI
- `app/components/ExecutionLedger.tsx` - Event viewer

### Configuration
- `.env.example` - Environment template
- `README_BICKFORD.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details

## Troubleshooting

### "ANTHROPIC_API_KEY is required"
- Add your Claude API key to `.env.local`
- The system will fall back to a simple plan if Claude is unavailable

### "NETLIFY_BUILD_HOOK environment variable is not set"
- Add Netlify configuration to `.env.local`
- Or set `requiresDeploy: false` in plans to skip deployment

### Database errors
- Run `npm run prisma:migrate` to initialize
- Check that `DATABASE_URL` is set in `.env.local`

### Build fails
- Ensure `DATABASE_URL` is set
- Run `npm install` to install all dependencies
- Check `npm run typecheck` for TypeScript errors

## Next Steps

1. **Test with simple intent**: Try updating README
2. **Check ledger**: View `ledger/ledger.jsonl`
3. **Configure Netlify**: Set up deployment
4. **Test rollback**: Simulate deploy failure
5. **Review audit trail**: Query execution events

## Support

For questions about this implementation:
- See `README_BICKFORD.md` for detailed documentation
- See `IMPLEMENTATION_SUMMARY.md` for technical details
- Check the code comments in each file

## Production Deployment

### Deploy to Netlify

1. Connect repository to Netlify
2. Set environment variables in Netlify dashboard
3. Configure build command: `npm run build`
4. Configure build hook for autonomous deployment

### Deploy to Vercel

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

## Architecture Highlights

- **Zero-approval workflow**: Executes within Canon constraints
- **Full auditability**: Every decision logged
- **Self-healing**: Automatic rollback on failure
- **AI-powered**: Claude 3.5 Sonnet planning
- **Production-ready**: Error handling, validation, monitoring

---

**Built for demonstration to potential buyers** - Showcases autonomous execution mastery with production-grade safety engineering.
