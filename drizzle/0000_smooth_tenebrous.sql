CREATE TABLE IF NOT EXISTS "github_installations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"installation_id" integer NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "installation_repos" (
	"id" serial PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"repo_id" integer NOT NULL,
	"full_name" text NOT NULL,
	"private" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installation_repos_repo_id_unique" UNIQUE("repo_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_id" integer NOT NULL,
	"login" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installation_repos" ADD CONSTRAINT "installation_repos_installation_id_github_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
