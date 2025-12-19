import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { frameworks, checkCategories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating a check category
const updateCheckCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  checkType: z.enum([
    'EMPLOYMENT_STATUS',
    'SEGREGATION_OF_DUTIES',
    'PRIVILEGED_ACCESS',
    'DORMANT_ACCOUNT',
    'ACCESS_APPROPRIATENESS',
    'ACCESS_AUTHORIZATION',
    'CUSTOM',
  ]).optional(),
  description: z.string().optional().nullable(),
  isEnabled: z.boolean().optional(),
  defaultSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
  severityRules: z.record(z.string()).optional().nullable(),
  regulatoryReferences: z.array(z.string()).optional().nullable(),
  sortOrder: z.number().optional(),
});

// GET /api/frameworks/[id]/check-categories/[categoryId] - Get a single check category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, categoryId } = await params;

    const category = await db.query.checkCategories.findFirst({
      where: and(
        eq(checkCategories.id, categoryId),
        eq(checkCategories.frameworkId, id)
      ),
    });

    if (!category) {
      return NextResponse.json({ error: 'Check category not found' }, { status: 404 });
    }

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error('Error fetching check category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check category' },
      { status: 500 }
    );
  }
}

// PUT /api/frameworks/[id]/check-categories/[categoryId] - Update a check category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators and ISOs can update check categories
    if (!['ADMINISTRATOR', 'ISO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, categoryId } = await params;
    const body = await request.json();
    const validatedData = updateCheckCategorySchema.parse(body);

    // Verify the check category exists and belongs to this framework
    const existingCategory = await db.query.checkCategories.findFirst({
      where: and(
        eq(checkCategories.id, categoryId),
        eq(checkCategories.frameworkId, id)
      ),
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Check category not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Partial<typeof checkCategories.$inferInsert> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.checkType !== undefined) updateData.checkType = validatedData.checkType;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.isEnabled !== undefined) updateData.isEnabled = validatedData.isEnabled;
    if (validatedData.defaultSeverity !== undefined) updateData.defaultSeverity = validatedData.defaultSeverity;
    if (validatedData.severityRules !== undefined) updateData.severityRules = validatedData.severityRules;
    if (validatedData.regulatoryReferences !== undefined) updateData.regulatoryReferences = validatedData.regulatoryReferences;
    if (validatedData.sortOrder !== undefined) updateData.sortOrder = validatedData.sortOrder;

    // Update the check category
    const [updatedCategory] = await db
      .update(checkCategories)
      .set(updateData)
      .where(eq(checkCategories.id, categoryId))
      .returning();

    return NextResponse.json({ data: updatedCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating check category:', error);
    return NextResponse.json(
      { error: 'Failed to update check category' },
      { status: 500 }
    );
  }
}

// DELETE /api/frameworks/[id]/check-categories/[categoryId] - Delete a check category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators can delete check categories
    if (session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, categoryId } = await params;

    // Verify the check category exists and belongs to this framework
    const existingCategory = await db.query.checkCategories.findFirst({
      where: and(
        eq(checkCategories.id, categoryId),
        eq(checkCategories.frameworkId, id)
      ),
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Check category not found' }, { status: 404 });
    }

    // Delete the check category
    await db.delete(checkCategories).where(eq(checkCategories.id, categoryId));

    return NextResponse.json({ message: 'Check category deleted successfully' });
  } catch (error) {
    console.error('Error deleting check category:', error);
    return NextResponse.json(
      { error: 'Failed to delete check category' },
      { status: 500 }
    );
  }
}
