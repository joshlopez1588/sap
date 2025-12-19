import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { frameworks, checkCategories, applications } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating a framework
const updateFrameworkSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  reviewFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']).optional(),
  attestationType: z.enum(['SINGLE', 'DUAL']).optional(),
  regulatoryScope: z.array(z.string()).optional().nullable(),
  thresholds: z.object({
    dormantDays: z.number().optional(),
    warningDays: z.number().optional(),
    criticalDays: z.number().optional(),
  }).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/frameworks/[id] - Get a single framework
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

    const framework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, id),
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
    });

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    // Get application count
    const appCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .where(eq(applications.frameworkId, id));

    return NextResponse.json({
      data: {
        ...framework,
        _count: {
          applications: appCount[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching framework:', error);
    return NextResponse.json(
      { error: 'Failed to fetch framework' },
      { status: 500 }
    );
  }
}

// PUT /api/frameworks/[id] - Update a framework
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators and ISOs can update frameworks
    if (!['ADMINISTRATOR', 'ISO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateFrameworkSchema.parse(body);

    // Check if framework exists
    const existingFramework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, id),
    });

    if (!existingFramework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    // If this is being set as default, unset other defaults
    if (validatedData.isDefault) {
      await db
        .update(frameworks)
        .set({ isDefault: false })
        .where(eq(frameworks.isDefault, true));
    }

    // Build update object (only include fields that were provided)
    const updateData: Partial<typeof frameworks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.reviewFrequency !== undefined) updateData.reviewFrequency = validatedData.reviewFrequency;
    if (validatedData.attestationType !== undefined) updateData.attestationType = validatedData.attestationType;
    if (validatedData.regulatoryScope !== undefined) updateData.regulatoryScope = validatedData.regulatoryScope;
    if (validatedData.thresholds !== undefined) updateData.thresholds = validatedData.thresholds;
    if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    // Update the framework
    const [updatedFramework] = await db
      .update(frameworks)
      .set(updateData)
      .where(eq(frameworks.id, id))
      .returning();

    // Fetch complete framework with categories
    const completeFramework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, id),
      with: {
        checkCategories: {
          orderBy: (checkCategories, { asc }) => [asc(checkCategories.sortOrder)],
        },
      },
    });

    return NextResponse.json({ data: completeFramework });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating framework:', error);
    return NextResponse.json(
      { error: 'Failed to update framework' },
      { status: 500 }
    );
  }
}

// DELETE /api/frameworks/[id] - Delete a framework
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators can delete frameworks
    if (session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if framework exists
    const existingFramework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, id),
    });

    if (!existingFramework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    // Check if any applications are using this framework
    const appCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .where(eq(applications.frameworkId, id));

    if ((appCount[0]?.count || 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete framework that is assigned to applications. Reassign applications first.' },
        { status: 400 }
      );
    }

    // Delete the framework (check categories will be cascade deleted)
    await db.delete(frameworks).where(eq(frameworks.id, id));

    return NextResponse.json({ message: 'Framework deleted successfully' });
  } catch (error) {
    console.error('Error deleting framework:', error);
    return NextResponse.json(
      { error: 'Failed to delete framework' },
      { status: 500 }
    );
  }
}
