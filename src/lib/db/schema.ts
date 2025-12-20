import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uuid,
  varchar,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMINISTRATOR', 'ISO', 'ANALYST', 'AUDITOR']);
export const reviewFrequencyEnum = pgEnum('review_frequency', [
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUAL',
  'ANNUAL',
]);
export const attestationTypeEnum = pgEnum('attestation_type', ['SINGLE', 'DUAL']);
export const dataClassificationEnum = pgEnum('data_classification', [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
]);
export const businessCriticalityEnum = pgEnum('business_criticality', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);
export const checkTypeEnum = pgEnum('check_type', [
  'EMPLOYMENT_STATUS',
  'SEGREGATION_OF_DUTIES',
  'PRIVILEGED_ACCESS',
  'DORMANT_ACCOUNT',
  'ACCESS_APPROPRIATENESS',
  'ACCESS_AUTHORIZATION',
  'CUSTOM',
]);
export const severityEnum = pgEnum('severity', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
export const reviewCycleStatusEnum = pgEnum('review_cycle_status', [
  'DRAFT',
  'DATA_COLLECTION',
  'ANALYSIS_PENDING',
  'ANALYSIS_COMPLETE',
  'IN_REVIEW',
  'PENDING_ATTESTATION',
  'COMPLETED',
  'ARCHIVED',
]);
export const findingTypeEnum = pgEnum('finding_type', [
  'TERMINATED_ACCESS',
  'ORPHANED_ACCOUNT',
  'SOD_CONFLICT',
  'PRIVILEGED_ACCESS',
  'DORMANT_ACCOUNT',
  'INAPPROPRIATE_ACCESS',
  'UNAUTHORIZED_CHANGE',
  'MISSING_AUTHORIZATION',
  'OTHER',
]);
export const findingStatusEnum = pgEnum('finding_status', [
  'OPEN',
  'IN_REVIEW',
  'PENDING_REMEDIATION',
  'REMEDIATED',
  'EXCEPTION_APPROVED',
  'DISMISSED',
  'CLOSED',
]);
export const findingDecisionEnum = pgEnum('finding_decision', [
  'REMEDIATE',
  'EXCEPTION',
  'DISMISS',
]);
export const employmentStatusEnum = pgEnum('employment_status', [
  'ACTIVE',
  'TERMINATED',
  'LEAVE',
  'CONTRACTOR',
  'UNKNOWN',
]);
export const accessRecordStatusEnum = pgEnum('access_record_status', [
  'PENDING',
  'AUTO_APPROVED',
  'NEEDS_REVIEW',
  'APPROVED',
  'REMEDIATION',
  'EXCEPTION',
]);

// ============== Users ==============
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull().default('ANALYST'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============== Frameworks ==============
export const frameworks = pgTable('frameworks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  version: varchar('version', { length: 50 }).default('1.0'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  reviewFrequency: reviewFrequencyEnum('review_frequency').notNull().default('QUARTERLY'),
  attestationType: attestationTypeEnum('attestation_type').notNull().default('SINGLE'),
  regulatoryScope: text('regulatory_scope').array(),
  thresholds: jsonb('thresholds').$type<{
    dormantDays?: number;
    warningDays?: number;
    criticalDays?: number;
  }>(),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const checkCategories = pgTable('check_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  frameworkId: uuid('framework_id')
    .notNull()
    .references(() => frameworks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  checkType: checkTypeEnum('check_type').notNull(),
  description: text('description'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  defaultSeverity: severityEnum('default_severity').notNull().default('MEDIUM'),
  severityRules: jsonb('severity_rules'),
  regulatoryReferences: text('regulatory_references').array(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============== Applications ==============
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  vendor: varchar('vendor', { length: 255 }),
  systemOwner: varchar('system_owner', { length: 255 }),
  businessUnit: varchar('business_unit', { length: 255 }),
  dataClassification: dataClassificationEnum('data_classification').default('INTERNAL'),
  businessCriticality: businessCriticalityEnum('business_criticality').default('MEDIUM'),
  regulatoryScope: text('regulatory_scope').array(),
  purpose: text('purpose'),
  typicalUsers: text('typical_users'),
  sensitiveFunctions: text('sensitive_functions'),
  accessRequestProcess: text('access_request_process'),
  profileCompleteness: integer('profile_completeness').default(0),
  frameworkId: uuid('framework_id').references(() => frameworks.id),
  lastReviewDate: timestamp('last_review_date'),
  nextReviewDate: timestamp('next_review_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const applicationRoles = pgTable('application_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isPrivileged: boolean('is_privileged').notNull().default(false),
  riskLevel: severityEnum('risk_level').default('LOW'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sodConflicts = pgTable('sod_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  role1Id: uuid('role1_id')
    .notNull()
    .references(() => applicationRoles.id, { onDelete: 'cascade' }),
  role2Id: uuid('role2_id')
    .notNull()
    .references(() => applicationRoles.id, { onDelete: 'cascade' }),
  conflictReason: text('conflict_reason'),
  severity: severityEnum('severity').notNull().default('HIGH'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============== Employees ==============
export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: varchar('employee_id', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  fullName: varchar('full_name', { length: 500 }),
  jobTitle: varchar('job_title', { length: 255 }),
  department: varchar('department', { length: 255 }),
  managerId: varchar('manager_id', { length: 100 }),
  managerName: varchar('manager_name', { length: 500 }),
  employmentStatus: employmentStatusEnum('employment_status').default('ACTIVE'),
  hireDate: timestamp('hire_date'),
  terminationDate: timestamp('termination_date'),
  rawData: jsonb('raw_data'),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============== Review Cycles ==============
export const reviewCycles = pgTable('review_cycles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id),
  frameworkId: uuid('framework_id')
    .notNull()
    .references(() => frameworks.id),
  status: reviewCycleStatusEnum('status').notNull().default('DRAFT'),
  year: integer('year').notNull(),
  quarter: integer('quarter'),
  snapshotDate: timestamp('snapshot_date'),
  dueDate: timestamp('due_date'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalFindings: integer('total_findings').default(0),
  criticalFindings: integer('critical_findings').default(0),
  highFindings: integer('high_findings').default(0),
  mediumFindings: integer('medium_findings').default(0),
  lowFindings: integer('low_findings').default(0),
  attestedById: uuid('attested_by_id').references(() => users.id),
  attestedAt: timestamp('attested_at'),
  attestationNotes: text('attestation_notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============== User Access Records ==============
export const userAccessRecords = pgTable('user_access_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewCycleId: uuid('review_cycle_id')
    .notNull()
    .references(() => reviewCycles.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  displayName: varchar('display_name', { length: 500 }),
  employeeId: uuid('employee_id').references(() => employees.id),
  roles: text('roles').array(),
  lastLoginAt: timestamp('last_login_at'),
  grantDate: timestamp('grant_date'),
  hasSodConflict: boolean('has_sod_conflict').default(false),
  hasPrivilegedAccess: boolean('has_privileged_access').default(false),
  isDormant: boolean('is_dormant').default(false),
  aiAnalysisSummary: text('ai_analysis_summary'),
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }),
  reviewStatus: accessRecordStatusEnum('review_status').default('PENDING'),
  reviewNotes: text('review_notes'),
  reviewedAt: timestamp('reviewed_at'),
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============== Findings ==============
export const findings = pgTable('findings', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewCycleId: uuid('review_cycle_id')
    .notNull()
    .references(() => reviewCycles.id, { onDelete: 'cascade' }),
  userAccessRecordId: uuid('user_access_record_id').references(() => userAccessRecords.id),
  findingType: findingTypeEnum('finding_type').notNull(),
  severity: severityEnum('severity').notNull(),
  status: findingStatusEnum('status').notNull().default('OPEN'),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  aiRationale: text('ai_rationale'),
  aiConfidenceScore: decimal('ai_confidence_score', { precision: 5, scale: 2 }),
  suggestedRemediation: text('suggested_remediation'),
  decision: findingDecisionEnum('decision'),
  decisionJustification: text('decision_justification'),
  compensatingControls: text('compensating_controls'),
  remediationDueDate: timestamp('remediation_due_date'),
  remediationTicketId: varchar('remediation_ticket_id', { length: 100 }),
  exceptionExpiryDate: timestamp('exception_expiry_date'),
  exceptionApprovedById: uuid('exception_approved_by_id').references(() => users.id),
  exceptionApprovedAt: timestamp('exception_approved_at'),
  decidedById: uuid('decided_by_id').references(() => users.id),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============== AI Conversations ==============
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  contextType: varchar('context_type', { length: 50 }).notNull(),
  contextId: uuid('context_id'),
  messages: jsonb('messages')
    .$type<
      Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
      }>
    >()
    .default([]),
  suggestedChanges: jsonb('suggested_changes'),
  appliedChanges: jsonb('applied_changes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============== Reports ==============
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewCycleId: uuid('review_cycle_id').references(() => reviewCycles.id),
  reportType: varchar('report_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  format: varchar('format', { length: 20 }).notNull(),
  fileUrl: text('file_url'),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  generatedById: uuid('generated_by_id').references(() => users.id),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  metadata: jsonb('metadata'),
});

// ============== Audit Logs ==============
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  previousValues: jsonb('previous_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============== System Config ==============
export const systemConfig = pgTable('system_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============== Relations ==============
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  frameworks: many(frameworks),
  reviewCycles: many(reviewCycles),
  findings: many(findings),
  aiConversations: many(aiConversations),
  auditLogs: many(auditLogs),
}));

export const frameworksRelations = relations(frameworks, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [frameworks.createdById],
    references: [users.id],
  }),
  checkCategories: many(checkCategories),
  applications: many(applications),
  reviewCycles: many(reviewCycles),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  framework: one(frameworks, {
    fields: [applications.frameworkId],
    references: [frameworks.id],
  }),
  roles: many(applicationRoles),
  sodConflicts: many(sodConflicts),
  reviewCycles: many(reviewCycles),
}));

export const reviewCyclesRelations = relations(reviewCycles, ({ one, many }) => ({
  application: one(applications, {
    fields: [reviewCycles.applicationId],
    references: [applications.id],
  }),
  framework: one(frameworks, {
    fields: [reviewCycles.frameworkId],
    references: [frameworks.id],
  }),
  createdBy: one(users, {
    fields: [reviewCycles.createdById],
    references: [users.id],
  }),
  attestedBy: one(users, {
    fields: [reviewCycles.attestedById],
    references: [users.id],
  }),
  userAccessRecords: many(userAccessRecords),
  findings: many(findings),
  reports: many(reports),
}));

export const findingsRelations = relations(findings, ({ one }) => ({
  reviewCycle: one(reviewCycles, {
    fields: [findings.reviewCycleId],
    references: [reviewCycles.id],
  }),
  userAccessRecord: one(userAccessRecords, {
    fields: [findings.userAccessRecordId],
    references: [userAccessRecords.id],
  }),
  decidedBy: one(users, {
    fields: [findings.decidedById],
    references: [users.id],
  }),
  exceptionApprovedBy: one(users, {
    fields: [findings.exceptionApprovedById],
    references: [users.id],
  }),
}));

export const checkCategoriesRelations = relations(checkCategories, ({ one }) => ({
  framework: one(frameworks, {
    fields: [checkCategories.frameworkId],
    references: [frameworks.id],
  }),
}));

export const applicationRolesRelations = relations(applicationRoles, ({ one }) => ({
  application: one(applications, {
    fields: [applicationRoles.applicationId],
    references: [applications.id],
  }),
}));

export const sodConflictsRelations = relations(sodConflicts, ({ one }) => ({
  application: one(applications, {
    fields: [sodConflicts.applicationId],
    references: [applications.id],
  }),
  role1: one(applicationRoles, {
    fields: [sodConflicts.role1Id],
    references: [applicationRoles.id],
    relationName: 'role1',
  }),
  role2: one(applicationRoles, {
    fields: [sodConflicts.role2Id],
    references: [applicationRoles.id],
    relationName: 'role2',
  }),
}));

export const userAccessRecordsRelations = relations(userAccessRecords, ({ one, many }) => ({
  reviewCycle: one(reviewCycles, {
    fields: [userAccessRecords.reviewCycleId],
    references: [reviewCycles.id],
  }),
  employee: one(employees, {
    fields: [userAccessRecords.employeeId],
    references: [employees.id],
  }),
  findings: many(findings),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reviewCycle: one(reviewCycles, {
    fields: [reports.reviewCycleId],
    references: [reviewCycles.id],
  }),
  generatedBy: one(users, {
    fields: [reports.generatedById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
}));
