CREATE TABLE IF NOT EXISTS "commits" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" integer NOT NULL,
	"sha" text NOT NULL,
	"message" text NOT NULL,
	"author_name" text,
	"author_email" text,
	"author_login" text,
	"committed_at" timestamp with time zone NOT NULL,
	"parent_shas" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commits_repo_id_sha_unique" UNIQUE("repo_id","sha")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commits" ADD CONSTRAINT "commits_repo_id_installation_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."installation_repos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
