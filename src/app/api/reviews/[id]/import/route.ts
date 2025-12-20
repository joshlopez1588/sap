import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reviewCycles, userAccessRecords, employees, applicationRoles } from '@/lib/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for importing access records
const importSchema = z.object({
  records: z.array(z.object({
    username: z.string().min(1),
    email: z.string().email().optional(),
    displayName: z.string().optional(),
    roles: z.array(z.string()).optional(),
    lastLoginAt: z.string().optional(),
    grantDate: z.string().optional(),
  })),
  columnMapping: z.object({
    username: z.string(),
    email: z.string().optional(),
    displayName: z.string().optional(),
    roles: z.string().optional(),
    lastLoginAt: z.string().optional(),
    grantDate: z.string().optional(),
  }).optional(),
});

// POST /api/reviews/[id]/import - Import user access records
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

    // Verify review exists and is in correct status
    const review = await db.query.reviewCycles.findFirst({
      where: eq(reviewCycles.id, id),
      with: {
        application: {
          with: {
            roles: true,
            sodConflicts: {
              with: {
                role1: true,
                role2: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (!['DRAFT', 'DATA_COLLECTION'].includes(review.status)) {
      return NextResponse.json(
        { error: 'Cannot import data - review is not in draft or data collection status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = importSchema.parse(body);

    // Get all employees for matching
    const allEmployees = await db.query.employees.findMany();
    const employeeMap = new Map<string, typeof allEmployees[0]>();
    allEmployees.forEach((emp) => {
      if (emp.email) employeeMap.set(emp.email.toLowerCase(), emp);
      if (emp.employeeId) employeeMap.set(emp.employeeId.toLowerCase(), emp);
    });

    // Get application roles for SoD checking
    const appRoles = review.application?.roles || [];
    const roleNameMap = new Map<string, typeof appRoles[0]>();
    appRoles.forEach((role) => {
      roleNameMap.set(role.name.toLowerCase(), role);
    });

    // Get SoD conflicts
    const sodConflicts = review.application?.sodConflicts || [];

    // Process each record
    const importedRecords = [];
    const errors = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const record of validatedData.records) {
      try {
        // Try to match to an employee
        let employeeId = null;
        let matchedEmployee = null;

        // Match by email first
        if (record.email) {
          matchedEmployee = employeeMap.get(record.email.toLowerCase());
        }

        // Match by username if no email match
        if (!matchedEmployee) {
          matchedEmployee = employeeMap.get(record.username.toLowerCase());
        }

        if (matchedEmployee) {
          employeeId = matchedEmployee.id;
          matchedCount++;
        } else {
          unmatchedCount++;
        }

        // Check for privileged access
        const userRoles = record.roles || [];
        let hasPrivilegedAccess = false;
        let hasSodConflict = false;
        const matchedRoleIds: string[] = [];

        for (const roleName of userRoles) {
          const appRole = roleNameMap.get(roleName.toLowerCase());
          if (appRole) {
            matchedRoleIds.push(appRole.id);
            if (appRole.isPrivileged) {
              hasPrivilegedAccess = true;
            }
          }
        }

        // Check for SoD conflicts
        for (const conflict of sodConflicts) {
          const hasRole1 = matchedRoleIds.includes(conflict.role1Id);
          const hasRole2 = matchedRoleIds.includes(conflict.role2Id);
          if (hasRole1 && hasRole2) {
            hasSodConflict = true;
            break;
          }
        }

        // Check for dormant account (no login in 90+ days)
        let isDormant = false;
        if (record.lastLoginAt) {
          const lastLogin = new Date(record.lastLoginAt);
          const daysSinceLogin = Math.floor(
            (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
          );
          isDormant = daysSinceLogin >= 90;
        }

        // Create the user access record
        const [newRecord] = await db
          .insert(userAccessRecords)
          .values({
            reviewCycleId: id,
            username: record.username,
            email: record.email,
            displayName: record.displayName,
            employeeId: employeeId,
            roles: userRoles,
            lastLoginAt: record.lastLoginAt ? new Date(record.lastLoginAt) : null,
            grantDate: record.grantDate ? new Date(record.grantDate) : null,
            hasPrivilegedAccess,
            hasSodConflict,
            isDormant,
            reviewStatus: 'PENDING',
            rawData: record as any,
          })
          .returning();

        importedRecords.push(newRecord);
      } catch (err) {
        errors.push({
          record: record.username,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update review status to DATA_COLLECTION if it was DRAFT
    if (review.status === 'DRAFT') {
      await db
        .update(reviewCycles)
        .set({
          status: 'DATA_COLLECTION',
          startedAt: new Date(),
          snapshotDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reviewCycles.id, id));
    }

    return NextResponse.json({
      data: {
        imported: importedRecords.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        errors: errors.length,
        errorDetails: errors.slice(0, 10), // Return first 10 errors
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error importing records:', error);
    return NextResponse.json(
      { error: 'Failed to import records' },
      { status: 500 }
    );
  }
}
