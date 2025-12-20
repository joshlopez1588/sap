# SAP Development Guide

Technical documentation for continuing development on the Security Analyst Platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (requires DATABASE_URL)
npm run dev

# Push schema changes to database
npm run db:push

# Seed database with sample data
npm run db:seed
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Drizzle ORM schema - all 16 tables with relations |
| `src/lib/auth.ts` | NextAuth v5 configuration |
| `src/app/api/*` | All API route handlers |
| `src/app/(app)/*` | Protected pages (require auth) |
| `src/components/ui/*` | shadcn/ui components |

## Database

### Connection
```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### Schema Changes
1. Edit `src/lib/db/schema.ts`
2. Run `npm run db:push` to apply changes
3. If adding relations, add them to the `*Relations` exports

### Common Queries
```typescript
// List with relations
const items = await db.query.applications.findMany({
  with: {
    framework: true,
    roles: true,
  },
});

// Insert
const [newItem] = await db.insert(applications).values({...}).returning();

// Update
await db.update(applications).set({...}).where(eq(applications.id, id));

// Delete
await db.delete(applications).where(eq(applications.id, id));
```

## Authentication

### Session Access
```typescript
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // session.user.id, session.user.email available
}
```

### Protected Routes
All routes under `src/app/(app)/` require authentication via the layout middleware.

## API Route Pattern

Standard pattern for CRUD routes:

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { resourceTable } from '@/lib/db/schema';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  // ...other fields
});

// GET /api/[resource]
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db.query.resourceTable.findMany({
      with: { /* relations */ },
      orderBy: [desc(resourceTable.createdAt)],
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST /api/[resource]
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createSchema.parse(body);

    const [newItem] = await db.insert(resourceTable).values(validated).returning();

    return NextResponse.json({ data: newItem }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
```

## Frontend Patterns

### Data Fetching
```typescript
'use client';
import { useState, useEffect } from 'react';

export default function ListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="animate-spin" />;
  return <div>{/* render items */}</div>;
}
```

### Form Submission
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!response.ok) throw new Error('Failed');
    router.push('/items');
  } catch (err) {
    setError(err.message);
  } finally {
    setSubmitting(false);
  }
};
```

## Key Enums

### Review Cycle Status
```
DRAFT → DATA_COLLECTION → ANALYSIS_PENDING → ANALYSIS_COMPLETE → IN_REVIEW → PENDING_ATTESTATION → COMPLETED
```

### Finding Status
```
OPEN → IN_REVIEW → PENDING_REMEDIATION → REMEDIATED | EXCEPTION_APPROVED | DISMISSED
```

### Finding Decision Types
```
REMEDIATE | EXCEPTION | DISMISS
```

### Severity Levels
```
CRITICAL | HIGH | MEDIUM | LOW | INFO
```

## Pending Implementation

### 1. AI Analysis (`/api/reviews/[id]/analyze`)

Trigger Claude to analyze user access:

```typescript
// Pseudo-code for analysis flow
async function analyzeReview(reviewId: string) {
  const review = await db.query.reviewCycles.findFirst({
    where: eq(reviewCycles.id, reviewId),
    with: { application: true, framework: { with: { checkCategories: true } } },
  });

  const accessRecords = await db.query.userAccessRecords.findMany({
    where: eq(userAccessRecords.reviewCycleId, reviewId),
  });

  for (const record of accessRecords) {
    const context = buildPromptContext(record, review);
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: context }],
    });

    const findings = parseFindings(response);
    await db.insert(findings).values(findings);
  }

  await updateReviewStats(reviewId);
}
```

### 2. AI Chat (`/api/ai/conversations`)

Conversational help for findings:

```typescript
// Chat endpoint
POST /api/ai/conversations
{
  "findingId": "uuid",
  "message": "Why is this a high severity finding?"
}

// Response with <suggested_update> tags
{
  "response": "This is high severity because...",
  "suggestedUpdates": [
    { "field": "decision", "value": "REMEDIATE" },
    { "field": "remediationDue", "value": "2025-01-15" }
  ]
}
```

### 3. Report Generation

Use a library like `@react-pdf/renderer` for PDFs:

```typescript
// src/lib/reports/templates/executive-summary.tsx
import { Document, Page, Text, View } from '@react-pdf/renderer';

export function ExecutiveSummary({ review, findings }) {
  return (
    <Document>
      <Page>
        <Text>Executive Summary: {review.name}</Text>
        {/* ... */}
      </Page>
    </Document>
  );
}
```

## Deployment

### Railway Auto-Deploy
- Push to `main` branch triggers automatic deployment
- Build command: `npm run build`
- Start command: `npm start`

### Environment Variables (Railway)
Set these in Railway dashboard:
- `DATABASE_URL` - Auto-set by Railway PostgreSQL
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your Railway URL
- `ANTHROPIC_API_KEY` - From Anthropic console

### Database Migration
```bash
# Push schema changes to Railway
DATABASE_URL="postgresql://..." npm run db:push
```

## Testing

No tests implemented yet. Recommended setup:
- Vitest for unit tests
- Playwright for E2E tests

## Troubleshooting

### "Failed to fetch" errors
1. Check browser dev tools Network tab
2. Verify API route exists and is returning proper JSON
3. Check server logs for errors

### Database connection issues
1. Verify DATABASE_URL is set
2. Check if PostgreSQL is running
3. Ensure schema is pushed (`npm run db:push`)

### Build failures
1. Run `npm run build` locally to see errors
2. Check for TypeScript errors
3. Ensure all imports are valid
