# Security Analyst Platform (SAP)

AI-assisted User Access Review platform for financial institutions. Helps security teams conduct quarterly reviews of who has access to what systems, identify compliance issues, and document decisions for regulators.

## Features

- **Framework Management** - Create review frameworks with configurable check categories
- **Application Profiles** - Register apps with roles, SoD rules, and classification
- **Review Cycles** - Conduct quarterly access reviews with AI-powered analysis
- **Finding Management** - Track and resolve security findings
- **AI Assistance** - Claude-powered analysis and decision support
- **Compliance Reports** - Generate executive summaries, attestation certificates

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js (email/password)
- **AI**: Anthropic Claude API

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
│   └── ui/             # UI components
└── lib/
    ├── db/             # Drizzle schema and client
    ├── auth.ts         # NextAuth configuration
    └── utils.ts        # Utility functions
```

## License

MIT
