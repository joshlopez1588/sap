import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { frameworks, checkCategories } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating a framework
const createFrameworkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  reviewFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']).default('QUARTERLY'),
  attestationType: z.enum(['SINGLE', 'DUAL']).default('SINGLE'),
  regulatoryScope: z.array(z.string()).optional(),
  thresholds: z.object({
    dormantDays: z.number().optional(),
    warningDays: z.number().optional(),
    criticalDays: z.number().optional(),
  }).optional(),
  isDefault: z.boolean().optional(),
  checkCategories: z.array(z.object({
    name: z.string().min(1),
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
  })).optional(),
});

// GET /api/frameworks - List all frameworks
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    // Get frameworks with application count
    const frameworkList = await db.query.frameworks.findMany({
      where: activeOnly ? eq(frameworks.isActive, true) : undefined,
      with: {
        checkCategories: {
          orderBy: (checkCategories, { asc }) => [asc(checkCategories.sortOrder)],
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(frameworks.isDefault), desc(frameworks.createdAt)],
    });

    // Get application counts for each framework
    const frameworksWithCounts = await Promise.all(
      frameworkList.map(async (framework) => {
        const appCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(require('@/lib/db/schema').applications)
          .where(eq(require('@/lib/db/schema').applications.frameworkId, framework.id));

        return {
          ...framework,
          _count: {
            applications: appCount[0]?.count || 0,
          },
        };
      })
    );

    return NextResponse.json({ data: frameworksWithCounts });
  } catch (error) {
    console.error('Error fetching frameworks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frameworks' },
      { status: 500 }
    );
  }
}

// POST /api/frameworks - Create a new framework
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators and ISOs can create frameworks
    if (!['ADMINISTRATOR', 'ISO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createFrameworkSchema.parse(body);

    // If this is being set as default, unset other defaults
    if (validatedData.isDefault) {
      await db
        .update(frameworks)
        .set({ isDefault: false })
        .where(eq(frameworks.isDefault, true));
    }

    // Create the framework
    const [newFramework] = await db
      .insert(frameworks)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        reviewFrequency: validatedData.reviewFrequency,
        attestationType: validatedData.attestationType,
        regulatoryScope: validatedData.regulatoryScope,
        thresholds: validatedData.thresholds,
        isDefault: validatedData.isDefault || false,
        createdById: session.user.id,
      })
      .returning();

    // Create check categories if provided
    if (validatedData.checkCategories && validatedData.checkCategories.length > 0) {
      await db.insert(checkCategories).values(
        validatedData.checkCategories.map((category, index) => ({
          frameworkId: newFramework.id,
          name: category.name,
          checkType: category.checkType,
          description: category.description,
          isEnabled: category.isEnabled,
          defaultSeverity: category.defaultSeverity,
          severityRules: category.severityRules,
          regulatoryReferences: category.regulatoryReferences,
          sortOrder: category.sortOrder ?? index,
        }))
      );
    }

    // Fetch the complete framework with categories
    const completeFramework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, newFramework.id),
      with: {
        checkCategories: {
          orderBy: (checkCategories, { asc }) => [asc(checkCategories.sortOrder)],
        },
      },
    });

    return NextResponse.json({ data: completeFramework }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating framework:', error);
    return NextResponse.json(
      { error: 'Failed to create framework' },
      { status: 500 }
    );
  }
}
