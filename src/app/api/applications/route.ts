import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { applications, frameworks } from '@/lib/db/schema';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating an application
const createApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  vendor: z.string().optional(),
  systemOwner: z.string().optional(),
  businessUnit: z.string().optional(),
  dataClassification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).default('INTERNAL'),
  businessCriticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  regulatoryScope: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  typicalUsers: z.string().optional(),
  sensitiveFunctions: z.string().optional(),
  accessRequestProcess: z.string().optional(),
  frameworkId: z.string().uuid().optional(),
});

// GET /api/applications - List all applications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const classification = searchParams.get('classification');
    const frameworkId = searchParams.get('frameworkId');
    const activeOnly = searchParams.get('active') !== 'false';

    // Build where conditions
    const conditions = [];
    if (activeOnly) {
      conditions.push(eq(applications.isActive, true));
    }
    if (classification) {
      conditions.push(eq(applications.dataClassification, classification as any));
    }
    if (frameworkId) {
      conditions.push(eq(applications.frameworkId, frameworkId));
    }
    if (search) {
      conditions.push(ilike(applications.name, `%${search}%`));
    }

    const applicationList = await db.query.applications.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        framework: {
          columns: {
            id: true,
            name: true,
          },
        },
        roles: {
          columns: {
            id: true,
            name: true,
            isPrivileged: true,
          },
        },
        sodConflicts: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: [desc(applications.createdAt)],
    });

    // Transform to include counts
    const applicationsWithCounts = applicationList.map((app) => ({
      ...app,
      _count: {
        roles: app.roles.length,
        sodConflicts: app.sodConflicts.length,
      },
    }));

    return NextResponse.json({ data: applicationsWithCounts });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create a new application
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators, ISOs, and analysts can create applications
    if (!['ADMINISTRATOR', 'ISO', 'ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createApplicationSchema.parse(body);

    // If frameworkId not provided, use default framework
    let frameworkIdToUse = validatedData.frameworkId;
    if (!frameworkIdToUse) {
      const defaultFramework = await db.query.frameworks.findFirst({
        where: eq(frameworks.isDefault, true),
      });
      frameworkIdToUse = defaultFramework?.id;
    }

    // Calculate initial completeness score
    const completenessScore = calculateCompleteness(validatedData);

    // Create the application
    const [newApplication] = await db
      .insert(applications)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        vendor: validatedData.vendor,
        systemOwner: validatedData.systemOwner,
        businessUnit: validatedData.businessUnit,
        dataClassification: validatedData.dataClassification,
        businessCriticality: validatedData.businessCriticality,
        regulatoryScope: validatedData.regulatoryScope,
        purpose: validatedData.purpose,
        typicalUsers: validatedData.typicalUsers,
        sensitiveFunctions: validatedData.sensitiveFunctions,
        accessRequestProcess: validatedData.accessRequestProcess,
        frameworkId: frameworkIdToUse,
        profileCompleteness: completenessScore,
      })
      .returning();

    // Fetch the complete application with relations
    const completeApplication = await db.query.applications.findFirst({
      where: eq(applications.id, newApplication.id),
      with: {
        framework: true,
        roles: true,
        sodConflicts: true,
      },
    });

    return NextResponse.json({ data: completeApplication }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}

// Helper function to calculate profile completeness
function calculateCompleteness(data: z.infer<typeof createApplicationSchema>): number {
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
    const value = data[field as keyof typeof data];
    if (value && (typeof value !== 'string' || value.trim().length > 0)) {
      score += weight;
    }
  }

  return score;
}
