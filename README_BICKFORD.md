# Bickford: Autonomous Execution System

**A production-ready demonstration of intent-driven autonomous execution with built-in safety guarantees.**

## 🎯 Value Proposition

Bickford is an end-to-end autonomous execution system that transforms natural language intent into deployed reality without manual intervention. This repository demonstrates:

- **Automation Mastery**: Complete autonomous flow from intent → plan → apply → commit → deploy
- **Safety Engineering**: Multiple layers of protection (Canon rules, append-only ledger, automatic rollback)
- **Production Thinking**: Real deployment, real rollback, real audit trail
- **Pattern Recognition**: Solves the "approval bottleneck" problem in autonomous systems
- **Business Acumen**: Built specifically for acquisition demonstration

## 🏗️ System Architecture

### Core Capabilities

1. **Intent-Based Execution**: Natural language → Structured Plan → Deployed Code
2. **Zero-Approval Workflow**: Executes autonomously within defined safety constraints
3. **Safety Guarantees**: Canon authorization, append-only ledger, automatic rollback on failure
4. **Full Auditability**: Every decision, change, and deployment is logged immutably

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Intent (Natural Language)           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│   Claude Planner (lib/bickford/claudePlanner.ts)            │
│   • Uses Claude 3.5 Sonnet                                   │
│   • Generates deterministic JSON execution plans             │
│   • Does NOT execute - only proposes                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│   Canon Evaluator (lib/canon/core.ts)                       │
│   • Evaluates plan against safety rules                     │
│   • Returns ALLOW/DENY with rationale                       │
│   • Logs decision to append-only ledger                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼ (if ALLOW)
┌─────────────────────────────────────────────────────────────┐
│   File Applier (lib/bickford/applier.ts)                    │
│   • Applies file changes                                     │
│   • Captures git diff before/after                          │
│   • Logs to ledger                                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│   Git Operations (lib/bickford/git.ts)                      │
│   • Automated commit with sanitized message                 │
│   • Push to remote                                           │
│   • Returns commit SHA for audit trail                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│   Netlify Deploy (lib/bickford/netlify.ts)                  │
│   • Triggers Netlify build hook                             │
│   • Polls deploy status (20 attempts × 3s)                  │
│   • Automatic rollback on failure                           │
│   • Logs all deploy events                                  │
└─────────────────────────────────────────────────────────────┘
```

### Ledger System (Append-Only Memory)

All events are stored in JSONL format at `ledger/ledger.jsonl`:

- `EXECUTION_STARTED`: Intent received
- `PLAN_GENERATED`: Claude plan + Canon decision
- `FILES_APPLIED`: File changes + git diff
- `DEPLOY_TRIGGERED`: Netlify build triggered
- `DEPLOY_COMPLETE`: Deploy status
- `ROLLBACK_EXECUTED`: Automatic rollback (on failure)

### Canon Rules (Decision Authority)

Safety rules evaluated before execution:

- ✅ File-level changes required
- ❌ No direct ledger modifications (append-only)
- ❌ No node_modules modifications
- ✅ Constitutional AI rules (harmlessness, honesty, helpfulness)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Git configured with push access
- Netlify account with deploy hook (optional)
- Anthropic API key (for Claude planning)

### Installation

```bash
# Clone repository
git clone https://github.com/bickfordd-bit/anthropic-acquisition.git
cd anthropic-acquisition

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Generate database
npm run prisma:migrate

# Start development server
npm run dev
```

### Configuration

Required environment variables in `.env.local`:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key
DATABASE_URL=file:./dev.db             # Prisma SQLite

# Netlify (optional, for deploy)
NETLIFY_SITE_ID=your-site-id
NETLIFY_TOKEN=your-netlify-token
NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/...
BICKFORD_BASE_URL=https://your-site.netlify.app

# Security
DATA_ROOM_TOKEN=$(openssl rand -hex 32)
BICKFORD_API_TOKEN=$(openssl rand -hex 32)
```

## 📖 Usage

### Via UI (BickfordConsole)

1. Navigate to `http://localhost:3000`
2. Use the Bickford Console component
3. Enter natural language intent
4. Click "Execute"
5. Watch real-time execution log
6. View full ledger via execution ID

### Via API

```bash
# Execute intent
curl -X POST http://localhost:3000/api/bickford/execute \
  -H "Content-Type: application/json" \
  -d '{"intent": "Update the homepage hero text to say Welcome to Bickford"}'

# Response
{
  "success": true,
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "summary": "Update homepage hero text",
  "filesChanged": 1,
  "commitSha": "abc1234",
  "deployUrl": "https://your-site.netlify.app",
  "deployStatus": "ready"
}

# Query ledger for execution
curl http://localhost:3000/api/bickford/ledger/550e8400-e29b-41d4-a716-446655440000
```

## 🛡️ Safety System

### 1. Canon Authorization

Every plan is evaluated against Canon rules before execution:

```typescript
// Denied examples:
"Delete the ledger"              → DENY: Ledger is append-only
"Modify node_modules/react"      → DENY: No node_modules changes
"Bypass security checks"         → DENY: Constitutional AI violation
```

### 2. Append-Only Ledger

All events are immutably logged to `ledger/ledger.jsonl`. The ledger cannot be modified or deleted.

### 3. Automatic Rollback

If deployment fails:
1. System detects failure via Netlify API polling
2. Executes `git reset --hard HEAD~1`
3. Force pushes to remote
4. Logs rollback event with reason

### 4. Audit Trail

Every execution is fully auditable:
- Execution ID tracks all events
- Git commit SHA links to code changes
- Deploy URL verifies live deployment
- Timestamp on every event

## 📦 API Endpoints

### `POST /api/bickford/execute`
Execute intent autonomously

**Request:**
```json
{
  "intent": "Add a new feature to the homepage"
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "uuid",
  "summary": "Added feature",
  "filesChanged": 2,
  "commitSha": "abc1234",
  "deployUrl": "https://...",
  "deployStatus": "ready"
}
```

### `GET /api/bickford/ledger/[executionId]`
Query execution history

**Response:**
```json
{
  "executionId": "uuid",
  "eventCount": 5,
  "events": [
    {
      "type": "EXECUTION_STARTED",
      "timestamp": "2024-01-05T...",
      "intent": "..."
    },
    ...
  ]
}
```

### `POST /api/bickford/plan`
Generate plan without executing (for preview)

## 🏢 For Buyers: What This Demonstrates

### Technical Excellence
- **Full-stack TypeScript**: Next.js 15, React 19, Prisma ORM
- **Production-ready**: Error handling, rollback, monitoring
- **Secure by design**: Input validation, path traversal prevention, command injection protection
- **API-first architecture**: Clean separation of concerns

### Business Value
- **Solves real problems**: Eliminates approval bottleneck in autonomous systems
- **Defensible moat**: Multi-layered safety system is non-trivial to replicate
- **Scalable pattern**: Can be applied to any autonomous execution scenario
- **Acquisition-ready**: Clean code, documentation, deployment scripts

### Innovation
- **Intent-driven UX**: Natural language instead of complex forms
- **Zero-trust execution**: Every action requires Canon approval
- **Self-healing**: Automatic rollback prevents bad deploys
- **Provable correctness**: Immutable audit trail for compliance

## 🔧 Development

```bash
# Type checking
npm run typecheck

# Build
npm run build

# Deploy to Netlify
npm run netlify:deploy

# Export data room
npm run data-room:export

# Health check
npm run health:check
```

## 📄 License

[Your License Here]

## 🤝 Contributing

This is a demonstration repository for acquisition purposes. For questions, contact [your-email].

---

**Built with**: Next.js • React • TypeScript • Prisma • Claude AI • Netlify

**Demonstrates**: Autonomous execution • Safety engineering • Production thinking • Business acumen
