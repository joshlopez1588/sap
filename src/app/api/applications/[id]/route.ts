import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applications, reviewCycles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating an application
const updateApplicationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  systemOwner: z.string().optional().nullable(),
  businessUnit: z.string().optional().nullable(),
  dataClassification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).optional(),
  businessCriticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  regulatoryScope: z.array(z.string()).optional().nullable(),
  purpose: z.string().optional().nullable(),
  typicalUsers: z.string().optional().nullable(),
  sensitiveFunctions: z.string().optional().nullable(),
  accessRequestProcess: z.string().optional().nullable(),
  frameworkId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/applications/[id] - Get a single application
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

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
      with: {
        framework: {
          columns: {
            id: true,
            name: true,
            reviewFrequency: true,
          },
        },
        roles: {
          orderBy: (roles, { asc }) => [asc(roles.name)],
        },
        sodConflicts: {
          with: {
            role1: true,
            role2: true,
          },
        },
        reviewCycles: {
          orderBy: (cycles, { desc }) => [desc(cycles.createdAt)],
          limit: 5,
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get review count
    const reviewCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewCycles)
      .where(eq(reviewCycles.applicationId, id));

    return NextResponse.json({
      data: {
        ...application,
        _count: {
          roles: application.roles.length,
          sodConflicts: application.sodConflicts.length,
          reviewCycles: reviewCount[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id] - Update an application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators, ISOs, and analysts can update applications
    if (!['ADMINISTRATOR', 'ISO', 'ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateApplicationSchema.parse(body);

    // Check if application exists
    const existingApp = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!existingApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Partial<typeof applications.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.vendor !== undefined) updateData.vendor = validatedData.vendor;
    if (validatedData.systemOwner !== undefined) updateData.systemOwner = validatedData.systemOwner;
    if (validatedData.businessUnit !== undefined) updateData.businessUnit = validatedData.businessUnit;
    if (validatedData.dataClassification !== undefined) updateData.dataClassification = validatedData.dataClassification;
    if (validatedData.businessCriticality !== undefined) updateData.businessCriticality = validatedData.businessCriticality;
    if (validatedData.regulatoryScope !== undefined) updateData.regulatoryScope = validatedData.regulatoryScope;
    if (validatedData.purpose !== undefined) updateData.purpose = validatedData.purpose;
    if (validatedData.typicalUsers !== undefined) updateData.typicalUsers = validatedData.typicalUsers;
    if (validatedData.sensitiveFunctions !== undefined) updateData.sensitiveFunctions = validatedData.sensitiveFunctions;
    if (validatedData.accessRequestProcess !== undefined) updateData.accessRequestProcess = validatedData.accessRequestProcess;
    if (validatedData.frameworkId !== undefined) updateData.frameworkId = validatedData.frameworkId;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    // Recalculate completeness score
    const mergedData = { ...existingApp, ...updateData };
    updateData.profileCompleteness = calculateCompleteness(mergedData);

    // Update the application
    const [updatedApp] = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, id))
      .returning();

    // Fetch complete application with relations
    const completeApp = await db.query.applications.findFirst({
      where: eq(applications.id, id),
      with: {
        framework: true,
        roles: true,
        sodConflicts: true,
      },
    });

    return NextResponse.json({ data: completeApp });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Delete an application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators can delete applications
    if (session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if application exists
    const existingApp = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!existingApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Check for existing review cycles
    const reviewCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewCycles)
      .where(eq(reviewCycles.applicationId, id));

    if ((reviewCount[0]?.count || 0) > 0) {
      // Soft delete - mark as inactive
      await db
        .update(applications)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(applications.id, id));

      return NextResponse.json({
        message: 'Application marked as inactive (has review history)',
        softDeleted: true
      });
    }

    // Hard delete if no reviews
    await db.delete(applications).where(eq(applications.id, id));

    return NextResponse.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}

// Helper function to calculate profile completeness
function calculateCompleteness(data: any): number {
  const fields = [
    { field: 'name', weight: 10 },
    { field: 'description', weight: 10 },
    { field: 'vendor', weight: 10 },
    { field: 'systemOwner', weight: 10 },
    { field: 'businessUnit', weight: 10 },
    { field: 'purpose', weight: 15 },
    { field: 'typicalUsers', weight: 10 },
    { field: 'sensitiveFunctions', weight: 10 },
    { field: 'accessRequestProcess', weight: 5 },
    { field: 'frameworkId', weight: 10 },
  ];

  let score = 0;
  for (const { field, weight } of fields) {
    const value = data[field];
    if (value && (typeof value !== 'string' || value.trim().length > 0)) {
      score += weight;
    }
  }

  return score;
}
