# Security Analyst Platform (SAP)

AI-assisted User Access Review platform for financial institutions. Helps security teams conduct quarterly reviews of who has access to what systems, identify compliance issues, and document decisions for regulators.

**Live Demo:** https://sap-web-production.up.railway.app

## Current Status (December 2024)

| Module | Status | Description |
|--------|--------|-------------|
| Frameworks | ✅ Complete | CRUD, check categories, severity rules |
| Applications | ✅ Complete | CRUD, roles, SoD conflicts, completeness scoring |
| Reviews | ✅ Complete | CRUD, CSV import for user access records |
| Findings | ✅ Complete | List, filter by severity, decision workflow |
| Reports | ✅ Complete | Generate and list compliance reports |
| Dashboard | ✅ Complete | Real-time statistics from database |
| AI Analysis | 🔜 Pending | Claude-powered access analysis |
| AI Chat | 🔜 Pending | Conversational finding review assistant |

## Features

- **Framework Management** - Create review frameworks with configurable check categories
- **Application Profiles** - Register apps with roles, SoD rules, and classification
- **Review Cycles** - Conduct quarterly access reviews with CSV data import
- **Finding Management** - Track and resolve security findings with decision workflow
- **AI Assistance** - Claude-powered analysis and decision support (coming soon)
- **Compliance Reports** - Generate executive summaries, attestation certificates

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL (Railway)
- **Auth**: NextAuth.js v5 (email/password with JWT)
- **AI**: Anthropic Claude API (integration pending)
- **Deployment**: Railway (auto-deploy from GitHub)

## Local Development

1. Clone the repo:
```bash
git clone https://github.com/joshlopez1588/sap.git
cd sap
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

4. Run with Docker (includes PostgreSQL):
```bash
docker-compose up -d
```

Or run PostgreSQL separately and update DATABASE_URL.

5. Push database schema:
```bash
npm run db:push
```

6. Seed initial data:
```bash
npm run db:seed
```

7. Start development server:
```bash
npm run dev
```

8. Open http://localhost:3000

## Demo Credentials

- Email: admin@example.com
- Password: admin123

## Railway Deployment

1. Login to Railway:
```bash
railway login
```

2. Run setup script:
```bash
chmod +x scripts/railway-setup.sh
./scripts/railway-setup.sh
```

3. Set ANTHROPIC_API_KEY in Railway dashboard

4. Deploy:
```bash
railway up
```

5. Push schema and seed:
```bash
railway run npm run db:push
railway run npm run db:seed
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| NEXTAUTH_SECRET | Random secret for session encryption |
| NEXTAUTH_URL | Your app URL (e.g., https://sap.railway.app) |
| ANTHROPIC_API_KEY | Anthropic API key for Claude |

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── (app)/          # Protected app routes
│   │   ├── dashboard/
│   │   ├── frameworks/
│   │   ├── applications/
│   │   ├── reviews/
│   │   ├── findings/
│   │   └── reports/
│   ├── auth/           # Auth pages
│   └── api/            # API routes
├── components/
│   ├── layout/         # App shell, sidebar, header
│   ├── applications/   # Application-specific components
│   ├── frameworks/     # Framework-specific components
│   └── ui/             # shadcn/ui components
└── lib/
    ├── db/             # Drizzle schema and client
    │   └── schema.ts   # Database schema (16 tables)
    ├── auth.ts         # NextAuth configuration
    └── utils.ts        # Utility functions
```

## API Routes

### Frameworks
- `GET/POST /api/frameworks` - List/Create frameworks
- `GET/PUT/DELETE /api/frameworks/[id]` - Single framework CRUD
- `GET/POST /api/frameworks/[id]/check-categories` - Check categories
- `PUT/DELETE /api/frameworks/[id]/check-categories/[categoryId]` - Single category

### Applications
- `GET/POST /api/applications` - List/Create applications
- `GET/PUT/DELETE /api/applications/[id]` - Single application CRUD
- `GET/POST /api/applications/[id]/roles` - Application roles
- `PUT/DELETE /api/applications/[id]/roles/[roleId]` - Single role
- `GET/POST /api/applications/[id]/sod-conflicts` - SoD conflicts
- `PUT/DELETE /api/applications/[id]/sod-conflicts/[conflictId]` - Single conflict

### Reviews
- `GET/POST /api/reviews` - List/Create review cycles
- `GET/PUT/DELETE /api/reviews/[id]` - Single review CRUD
- `POST /api/reviews/[id]/import` - Import CSV user access data
- `GET /api/reviews/[id]/access-records` - Get user access records

### Findings
- `GET /api/findings` - List findings (with filters)
- `GET/PUT /api/findings/[id]` - Single finding + decision workflow

### Reports
- `GET/POST /api/reports` - List/Generate reports

### Dashboard
- `GET /api/dashboard` - Dashboard statistics

## Database Schema

The app uses 16 PostgreSQL tables:

| Table | Purpose |
|-------|---------|
| users | User accounts |
| sessions | Auth sessions |
| frameworks | Review frameworks |
| check_categories | Framework check rules |
| applications | Systems under review |
| application_roles | App role definitions |
| sod_conflicts | Separation of duties rules |
| employees | HR employee data |
| review_cycles | Quarterly reviews |
| user_access_records | Imported access data |
| findings | Discovered issues |
| ai_conversations | AI chat history |
| reports | Generated reports |
| audit_logs | Action audit trail |

## What's Next (TODO)

1. **AI Analysis Integration**
   - `POST /api/reviews/[id]/analyze` - Trigger AI analysis
   - Claude analyzes user access against framework rules
   - Auto-generates findings with AI rationale

2. **AI Chat for Findings**
   - `POST /api/ai/conversations` - Start AI conversation
   - Discuss findings with Claude for decision help
   - Apply AI suggestions to decision form

3. **Report Generation**
   - PDF generation for executive summaries
   - Excel export for remediation tracking
   - Evidence packages for auditors

4. **Audit Logging**
   - Log all CRUD operations
   - Searchable audit trail

## License

MIT
