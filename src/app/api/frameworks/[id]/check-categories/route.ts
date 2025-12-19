import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { frameworks, checkCategories } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating a check category
const createCheckCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  checkType: z.enum([
    'EMPLOYMENT_STATUS',
    'SEGREGATION_OF_DUTIES',
    'PRIVILEGED_ACCESS',
    'DORMANT_ACCOUNT',
    'ACCESS_APPROPRIATENESS',
    'ACCESS_AUTHORIZATION',
    'CUSTOM',
  ]),
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
  defaultSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('MEDIUM'),
  severityRules: z.record(z.string()).optional(),
  regulatoryReferences: z.array(z.string()).optional(),
  sortOrder: z.number().optional(),
});

// GET /api/frameworks/[id]/check-categories - List all check categories for a framework
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify framework exists
    const framework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, id),
    });

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    const categories = await db.query.checkCategories.findMany({
      where: eq(checkCategories.frameworkId, id),
      orderBy: [asc(checkCategories.sortOrder)],
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error fetching check categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check categories' },
      { status: 500 }
    );
  }
}

// POST /api/frameworks/[id]/check-categories - Create a new check category
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators and ISOs can create check categories
    if (!['ADMINISTRATOR', 'ISO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = createCheckCategorySchema.parse(body);

    // Verify framework exists
    const framework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, id),
    });

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    // Get the current max sort order
    const existingCategories = await db.query.checkCategories.findMany({
      where: eq(checkCategories.frameworkId, id),
      columns: { sortOrder: true },
    });
    const maxSortOrder = Math.max(0, ...existingCategories.map(c => c.sortOrder || 0));

    // Create the check category
    const [newCategory] = await db
      .insert(checkCategories)
      .values({
        frameworkId: id,
        name: validatedData.name,
        checkType: validatedData.checkType,
        description: validatedData.description,
        isEnabled: validatedData.isEnabled,
        defaultSeverity: validatedData.defaultSeverity,
        severityRules: validatedData.severityRules,
        regulatoryReferences: validatedData.regulatoryReferences,
        sortOrder: validatedData.sortOrder ?? maxSortOrder + 1,
      })
      .returning();

    return NextResponse.json({ data: newCategory }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating check category:', error);
    return NextResponse.json(
      { error: 'Failed to create check category' },
      { status: 500 }
    );
  }
}
