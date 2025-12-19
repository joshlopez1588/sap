import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcryptjs';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const [adminUser] = await db
    .insert(schema.users)
    .values({
      email: 'admin@example.com',
      name: 'System Administrator',
      passwordHash,
      role: 'ADMINISTRATOR',
    })
    .returning();

  console.log('Created admin user:', adminUser.email);

  // Create Standard Review Framework
  const [standardFramework] = await db
    .insert(schema.frameworks)
    .values({
      name: 'Standard Review Framework',
      description:
        'Standard quarterly access review framework for general applications. Covers basic compliance checks aligned with FFIEC and NIST guidelines.',
      version: '1.0',
      isDefault: true,
      reviewFrequency: 'QUARTERLY',
      attestationType: 'SINGLE',
      regulatoryScope: ['FFIEC', 'NIST'],
      thresholds: { dormantDays: 90, warningDays: 60 },
      createdById: adminUser.id,
    })
    .returning();

  console.log('Created framework:', standardFramework.name);

  // Create check categories for Standard Framework
  const standardChecks = [
    {
      name: 'Employment Status Verification',
      checkType: 'EMPLOYMENT_STATUS' as const,
      description: 'Verify all users with access are currently employed and active.',
      defaultSeverity: 'CRITICAL' as const,
      regulatoryReferences: ['FFIEC AC-5'],
      sortOrder: 1,
    },
    {
      name: 'Segregation of Duties',
      checkType: 'SEGREGATION_OF_DUTIES' as const,
      description: 'Check for conflicting role combinations that violate separation of duties.',
      defaultSeverity: 'HIGH' as const,
      regulatoryReferences: ['FFIEC AC-3', 'SOX 404'],
      sortOrder: 2,
    },
    {
      name: 'Privileged Access Review',
      checkType: 'PRIVILEGED_ACCESS' as const,
      description: 'Review elevated access rights and verify business justification.',
      defaultSeverity: 'HIGH' as const,
      regulatoryReferences: ['FFIEC AC-4', 'NIST AC-6'],
      sortOrder: 3,
    },
    {
      name: 'Dormant Account Detection',
      checkType: 'DORMANT_ACCOUNT' as const,
      description: 'Identify accounts that have not been used within the threshold period.',
      defaultSeverity: 'MEDIUM' as const,
      regulatoryReferences: ['FFIEC AC-2'],
      sortOrder: 4,
    },
    {
      name: 'Access Appropriateness',
      checkType: 'ACCESS_APPROPRIATENESS' as const,
      description: 'Verify access aligns with user job function and department.',
      defaultSeverity: 'MEDIUM' as const,
      regulatoryReferences: ['NIST AC-2'],
      sortOrder: 5,
    },
    {
      name: 'Authorization Verification',
      checkType: 'ACCESS_AUTHORIZATION' as const,
      description: 'Confirm access changes have proper authorization tickets.',
      defaultSeverity: 'LOW' as const,
      regulatoryReferences: ['FFIEC AC-2'],
      sortOrder: 6,
    },
  ];

  await db.insert(schema.checkCategories).values(
    standardChecks.map((check) => ({
      ...check,
      frameworkId: standardFramework.id,
    }))
  );

  console.log('Created check categories for Standard Framework');

  // Create High-Risk Framework
  const [highRiskFramework] = await db
    .insert(schema.frameworks)
    .values({
      name: 'High-Risk Framework',
      description:
        'Enhanced review framework for high-risk applications such as wire transfer systems, trading platforms, and core banking.',
      version: '1.0',
      isDefault: false,
      reviewFrequency: 'QUARTERLY',
      attestationType: 'SINGLE',
      regulatoryScope: ['FFIEC', 'SOX', 'BSA'],
      thresholds: { dormantDays: 60, warningDays: 30 },
      createdById: adminUser.id,
    })
    .returning();

  console.log('Created framework:', highRiskFramework.name);

  // Create SOX-Critical Framework
  const [soxFramework] = await db
    .insert(schema.frameworks)
    .values({
      name: 'SOX-Critical Framework',
      description:
        'Specialized framework for SOX-critical applications requiring dual attestation and enhanced controls.',
      version: '1.0',
      isDefault: false,
      reviewFrequency: 'QUARTERLY',
      attestationType: 'DUAL',
      regulatoryScope: ['SOX', 'FFIEC'],
      thresholds: { dormantDays: 90, warningDays: 60 },
      createdById: adminUser.id,
    })
    .returning();

  console.log('Created framework:', soxFramework.name);

  // Create sample application: Wire Transfer System
  const [wireApp] = await db
    .insert(schema.applications)
    .values({
      name: 'Wire Transfer System',
      description: 'Core wire transfer processing system for domestic and international wires.',
      vendor: 'FIS Global',
      systemOwner: 'Sarah Johnson',
      businessUnit: 'Treasury Operations',
      dataClassification: 'CONFIDENTIAL',
      businessCriticality: 'CRITICAL',
      regulatoryScope: ['SOX', 'BSA'],
      purpose:
        'Process and authorize wire transfers for commercial and retail banking customers.',
      typicalUsers: 'Treasury analysts, wire operators, and supervisors',
      sensitiveFunctions: 'Wire initiation, wire approval, limit override, customer account lookup',
      profileCompleteness: 80,
      frameworkId: highRiskFramework.id,
    })
    .returning();

  console.log('Created application:', wireApp.name);

  // Create roles for Wire Transfer System
  const wireRoles = await db
    .insert(schema.applicationRoles)
    .values([
      {
        applicationId: wireApp.id,
        name: 'Wire Viewer',
        description: 'Read-only access to view wire transactions',
        isPrivileged: false,
        riskLevel: 'LOW',
      },
      {
        applicationId: wireApp.id,
        name: 'Wire Initiator',
        description: 'Can create and submit wire transfer requests',
        isPrivileged: false,
        riskLevel: 'MEDIUM',
      },
      {
        applicationId: wireApp.id,
        name: 'Wire Approver',
        description: 'Can approve wire transfers up to limit',
        isPrivileged: true,
        riskLevel: 'HIGH',
      },
      {
        applicationId: wireApp.id,
        name: 'Wire Admin',
        description: 'Full administrative access including user management',
        isPrivileged: true,
        riskLevel: 'CRITICAL',
      },
    ])
    .returning();

  console.log('Created roles for Wire Transfer System');

  // Create SoD conflict (Initiator + Approver)
  const initiatorRole = wireRoles.find((r) => r.name === 'Wire Initiator');
  const approverRole = wireRoles.find((r) => r.name === 'Wire Approver');

  if (initiatorRole && approverRole) {
    await db.insert(schema.sodConflicts).values({
      applicationId: wireApp.id,
      role1Id: initiatorRole.id,
      role2Id: approverRole.id,
      conflictReason:
        'User cannot both initiate and approve wire transfers - dual control violation',
      severity: 'CRITICAL',
    });
    console.log('Created SoD conflict: Wire Initiator + Wire Approver');
  }

  // Create system config
  await db.insert(schema.systemConfig).values([
    { key: 'data_retention_years', value: 7 },
    { key: 'ai_enabled', value: true },
    { key: 'default_dormant_days', value: 90 },
  ]);

  console.log('Created system configuration');

  console.log('Seed completed successfully!');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
