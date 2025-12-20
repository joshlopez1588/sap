import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applications, applicationRoles } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating a role
const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  isPrivileged: z.boolean().default(false),
  riskLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('LOW'),
});

// GET /api/applications/[id]/roles - List all roles for an application
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

    const roles = await db.query.applicationRoles.findMany({
      where: eq(applicationRoles.applicationId, id),
      orderBy: [asc(applicationRoles.name)],
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST /api/applications/[id]/roles - Create a new role
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
    const validatedData = createRoleSchema.parse(body);

    // Verify application exists
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Check if role name already exists for this application
    const existingRole = await db.query.applicationRoles.findFirst({
      where: eq(applicationRoles.applicationId, id),
    });

    const existingRoles = await db.query.applicationRoles.findMany({
      where: eq(applicationRoles.applicationId, id),
    });

    if (existingRoles.some(r => r.name.toLowerCase() === validatedData.name.toLowerCase())) {
      return NextResponse.json(
        { error: 'A role with this name already exists' },
        { status: 400 }
      );
    }

    // Create the role
    const [newRole] = await db
      .insert(applicationRoles)
      .values({
        applicationId: id,
        name: validatedData.name,
        description: validatedData.description,
        isPrivileged: validatedData.isPrivileged,
        riskLevel: validatedData.riskLevel,
      })
      .returning();

    return NextResponse.json({ data: newRole }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
