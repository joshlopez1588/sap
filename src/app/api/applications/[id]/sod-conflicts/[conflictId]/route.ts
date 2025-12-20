import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sodConflicts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating a SoD conflict
const updateSodConflictSchema = z.object({
  conflictReason: z.string().optional().nullable(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
});

// GET /api/applications/[id]/sod-conflicts/[conflictId] - Get a single SoD conflict
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conflictId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, conflictId } = await params;

    const conflict = await db.query.sodConflicts.findFirst({
      where: and(
        eq(sodConflicts.id, conflictId),
        eq(sodConflicts.applicationId, id)
      ),
      with: {
        role1: true,
        role2: true,
      },
    });

    if (!conflict) {
      return NextResponse.json({ error: 'SoD conflict not found' }, { status: 404 });
    }

    return NextResponse.json({ data: conflict });
  } catch (error) {
    console.error('Error fetching SoD conflict:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SoD conflict' },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id]/sod-conflicts/[conflictId] - Update a SoD conflict
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conflictId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMINISTRATOR', 'ISO', 'ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, conflictId } = await params;
    const body = await request.json();
    const validatedData = updateSodConflictSchema.parse(body);

    // Verify the conflict exists and belongs to this application
    const existingConflict = await db.query.sodConflicts.findFirst({
      where: and(
        eq(sodConflicts.id, conflictId),
        eq(sodConflicts.applicationId, id)
      ),
    });

    if (!existingConflict) {
      return NextResponse.json({ error: 'SoD conflict not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Partial<typeof sodConflicts.$inferInsert> = {};

    if (validatedData.conflictReason !== undefined) updateData.conflictReason = validatedData.conflictReason;
    if (validatedData.severity !== undefined) updateData.severity = validatedData.severity;

    // Update the conflict
    const [updatedConflict] = await db
      .update(sodConflicts)
      .set(updateData)
      .where(eq(sodConflicts.id, conflictId))
      .returning();

    // Fetch with relations
    const completeConflict = await db.query.sodConflicts.findFirst({
      where: eq(sodConflicts.id, conflictId),
      with: {
        role1: true,
        role2: true,
      },
    });

    return NextResponse.json({ data: completeConflict });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating SoD conflict:', error);
    return NextResponse.json(
      { error: 'Failed to update SoD conflict' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id]/sod-conflicts/[conflictId] - Delete a SoD conflict
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conflictId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMINISTRATOR', 'ISO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, conflictId } = await params;

    // Verify the conflict exists and belongs to this application
    const existingConflict = await db.query.sodConflicts.findFirst({
      where: and(
        eq(sodConflicts.id, conflictId),
        eq(sodConflicts.applicationId, id)
      ),
    });

    if (!existingConflict) {
      return NextResponse.json({ error: 'SoD conflict not found' }, { status: 404 });
    }

    // Delete the conflict
    await db.delete(sodConflicts).where(eq(sodConflicts.id, conflictId));

    return NextResponse.json({ message: 'SoD conflict deleted successfully' });
  } catch (error) {
    console.error('Error deleting SoD conflict:', error);
    return NextResponse.json(
      { error: 'Failed to delete SoD conflict' },
      { status: 500 }
    );
  }
}
