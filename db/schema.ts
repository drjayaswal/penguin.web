import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
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