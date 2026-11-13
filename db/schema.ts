import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  unique,
  date,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  githubId: integer('github_id').notNull().unique(),
  login: text('login').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const githubInstallations = pgTable('github_installations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  installationId: integer('installation_id').notNull().unique(),
  accountLogin: text('account_login').notNull(),
  accountType: text('account_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const installationRepos = pgTable('installation_repos', {
  id: serial('id').primaryKey(),
  installationId: integer('installation_id')
    .notNull()
    .references(() => githubInstallations.id),
  repoId: integer('repo_id').notNull().unique(),
  fullName: text('full_name').notNull(),
  isPrivate: boolean('private').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const commits = pgTable(
  'commits',
  {
    id: serial('id').primaryKey(),
    repoId: integer('repo_id')
      .notNull()
      .references(() => installationRepos.id, { onDelete: 'cascade' }),
    sha: text('sha').notNull(),
    message: text('message').notNull(),
    authorName: text('author_name'),
    authorEmail: text('author_email'),
    authorLogin: text('author_login'),
    committedAt: timestamp('committed_at', { withTimezone: true }).notNull(),
    parentShas: text('parent_shas').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    repoShaUnique: unique('commits_repo_id_sha_unique').on(table.repoId, table.sha),
  })
)

export type CommitFileStatus = 'A' | 'M' | 'D' | 'E' | 'O'

export const commitFiles = pgTable(
  'commit_files',
  {
    id: serial('id').primaryKey(),
    commitId: integer('commit_id')
      .notNull()
      .references(() => commits.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    status: text('status').$type<CommitFileStatus>().notNull(),
    additions: integer('additions').notNull().default(0),
    deletions: integer('deletions').notNull().default(0),
    patch: text('patch'),
    previousFilename: text('previous_filename'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    commitFilenameUnique: unique('commit_files_commit_id_filename_unique').on(
      table.commitId,
      table.filename,
    ),
  })
)

export const userAiSettings = pgTable('user_ai_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  apiKeyLast4: text('api_key_last4').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const commitSummaries = pgTable(
  'commit_summaries',
  {
    id: serial('id').primaryKey(),
    commitId: integer('commit_id')
      .notNull()
      .references(() => commits.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    commitProviderModelUnique: unique('commit_summaries_commit_id_provider_model_unique').on(
      table.commitId,
      table.provider,
      table.model,
    ),
  })
)

export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ name: 'ai_usage_pkey', columns: [table.userId, table.day] }),
  })
)
