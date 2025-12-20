import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applicationRoles, sodConflicts } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating a role
const updateRoleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  isPrivileged: z.boolean().optional(),
  riskLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
});

// GET /api/applications/[id]/roles/[roleId] - Get a single role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, roleId } = await params;

    const role = await db.query.applicationRoles.findFirst({
      where: and(
        eq(applicationRoles.id, roleId),
        eq(applicationRoles.applicationId, id)
      ),
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id]/roles/[roleId] - Update a role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMINISTRATOR', 'ISO', 'ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, roleId } = await params;
    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    // Verify the role exists and belongs to this application
    const existingRole = await db.query.applicationRoles.findFirst({
      where: and(
        eq(applicationRoles.id, roleId),
        eq(applicationRoles.applicationId, id)
      ),
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check for duplicate name if name is being updated
    if (validatedData.name && validatedData.name !== existingRole.name) {
      const allRoles = await db.query.applicationRoles.findMany({
        where: eq(applicationRoles.applicationId, id),
      });

      if (allRoles.some(r => r.id !== roleId && r.name.toLowerCase() === validatedData.name!.toLowerCase())) {
        return NextResponse.json(
          { error: 'A role with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Partial<typeof applicationRoles.$inferInsert> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.isPrivileged !== undefined) updateData.isPrivileged = validatedData.isPrivileged;
    if (validatedData.riskLevel !== undefined) updateData.riskLevel = validatedData.riskLevel;

    // Update the role
    const [updatedRole] = await db
      .update(applicationRoles)
      .set(updateData)
      .where(eq(applicationRoles.id, roleId))
      .returning();

    return NextResponse.json({ data: updatedRole });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id]/roles/[roleId] - Delete a role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMINISTRATOR', 'ISO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, roleId } = await params;

    // Verify the role exists and belongs to this application
    const existingRole = await db.query.applicationRoles.findFirst({
      where: and(
        eq(applicationRoles.id, roleId),
        eq(applicationRoles.applicationId, id)
      ),
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if role is used in any SoD conflicts
    const conflictCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sodConflicts)
      .where(
        or(
          eq(sodConflicts.role1Id, roleId),
          eq(sodConflicts.role2Id, roleId)
        )
      );

    if ((conflictCount[0]?.count || 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is used in SoD conflict rules. Remove the conflicts first.' },
        { status: 400 }
      );
    }

    // Delete the role
    await db.delete(applicationRoles).where(eq(applicationRoles.id, roleId));

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
