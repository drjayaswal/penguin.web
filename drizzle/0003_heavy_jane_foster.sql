CREATE TABLE IF NOT EXISTS "commit_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"commit_id" integer NOT NULL,
	"filename" text NOT NULL,
	"status" text NOT NULL,
	"additions" integer DEFAULT 0 NOT NULL,
	"deletions" integer DEFAULT 0 NOT NULL,
	"patch" text,
	"previous_filename" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commit_files_commit_id_filename_unique" UNIQUE("commit_id","filename")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commit_files" ADD CONSTRAINT "commit_files_commit_id_commits_id_fk" FOREIGN KEY ("commit_id") REFERENCES "public"."commits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
