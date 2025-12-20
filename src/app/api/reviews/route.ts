import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reviewCycles, applications, frameworks } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating a review cycle
const createReviewSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  applicationId: z.string().uuid('Invalid application ID'),
  frameworkId: z.string().uuid('Invalid framework ID'),
  year: z.number().int().min(2020).max(2100),
  quarter: z.number().int().min(1).max(4).optional(),
  dueDate: z.string().optional(),
});

// GET /api/reviews - List all review cycles
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const status = searchParams.get('status');

    // Build where conditions
    const conditions = [];
    if (applicationId) {
      conditions.push(eq(reviewCycles.applicationId, applicationId));
    }
    if (status) {
      conditions.push(eq(reviewCycles.status, status as any));
    }

    const reviews = await db.query.reviewCycles.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        application: {
          columns: {
            id: true,
            name: true,
          },
        },
        framework: {
          columns: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(reviewCycles.createdAt)],
    });

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review cycle
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators, ISOs, and analysts can create reviews
    if (!['ADMINISTRATOR', 'ISO', 'ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);

    // Verify application exists
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, validatedData.applicationId),
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 400 });
    }

    // Verify framework exists
    const framework = await db.query.frameworks.findFirst({
      where: eq(frameworks.id, validatedData.frameworkId),
    });

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 400 });
    }

    // Create the review cycle
    const [newReview] = await db
      .insert(reviewCycles)
      .values({
        name: validatedData.name,
        applicationId: validatedData.applicationId,
        frameworkId: validatedData.frameworkId,
        year: validatedData.year,
        quarter: validatedData.quarter,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        status: 'DRAFT',
        createdById: session.user.id,
      })
      .returning();

    // Fetch complete review with relations
    const completeReview = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, newReview.id),
      with: {
        application: true,
        framework: true,
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ data: completeReview }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
