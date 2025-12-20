import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applications, applicationRoles, sodConflicts } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating a SoD conflict
const createSodConflictSchema = z.object({
  role1Id: z.string().uuid('Invalid role ID'),
  role2Id: z.string().uuid('Invalid role ID'),
  conflictReason: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('HIGH'),
});

// GET /api/applications/[id]/sod-conflicts - List all SoD conflicts for an application
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

    // Verify application exists
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const conflicts = await db.query.sodConflicts.findMany({
      where: eq(sodConflicts.applicationId, id),
      with: {
        role1: true,
        role2: true,
      },
    });

    return NextResponse.json({ data: conflicts });
  } catch (error) {
    console.error('Error fetching SoD conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SoD conflicts' },
      { status: 500 }
    );
  }
}

// POST /api/applications/[id]/sod-conflicts - Create a new SoD conflict
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMINISTRATOR', 'ISO', 'ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = createSodConflictSchema.parse(body);

    // Verify application exists
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify both roles exist and belong to this application
    const role1 = await db.query.applicationRoles.findFirst({
      where: and(
        eq(applicationRoles.id, validatedData.role1Id),
        eq(applicationRoles.applicationId, id)
      ),
    });

    const role2 = await db.query.applicationRoles.findFirst({
      where: and(
        eq(applicationRoles.id, validatedData.role2Id),
        eq(applicationRoles.applicationId, id)
      ),
    });

    if (!role1 || !role2) {
      return NextResponse.json(
        { error: 'One or both roles not found' },
        { status: 400 }
      );
    }

    if (validatedData.role1Id === validatedData.role2Id) {
      return NextResponse.json(
        { error: 'Cannot create conflict between the same role' },
        { status: 400 }
      );
    }

    // Check if conflict already exists (in either direction)
    const existingConflict = await db.query.sodConflicts.findFirst({
      where: and(
        eq(sodConflicts.applicationId, id),
        or(
          and(
            eq(sodConflicts.role1Id, validatedData.role1Id),
            eq(sodConflicts.role2Id, validatedData.role2Id)
          ),
          and(
            eq(sodConflicts.role1Id, validatedData.role2Id),
            eq(sodConflicts.role2Id, validatedData.role1Id)
          )
        )
      ),
    });

    if (existingConflict) {
      return NextResponse.json(
        { error: 'A conflict between these roles already exists' },
        { status: 400 }
      );
    }

    // Create the SoD conflict
    const [newConflict] = await db
      .insert(sodConflicts)
      .values({
        applicationId: id,
        role1Id: validatedData.role1Id,
        role2Id: validatedData.role2Id,
        conflictReason: validatedData.conflictReason,
        severity: validatedData.severity,
      })
      .returning();

    // Fetch with relations
    const completeConflict = await db.query.sodConflicts.findFirst({
      where: eq(sodConflicts.id, newConflict.id),
      with: {
        role1: true,
        role2: true,
      },
    });

    return NextResponse.json({ data: completeConflict }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating SoD conflict:', error);
    return NextResponse.json(
      { error: 'Failed to create SoD conflict' },
      { status: 500 }
    );
  }
}
