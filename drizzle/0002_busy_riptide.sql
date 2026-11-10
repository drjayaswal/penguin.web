ALTER TABLE "commits" DROP CONSTRAINT "commits_repo_id_installation_repos_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commits" ADD CONSTRAINT "commits_repo_id_installation_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."installation_repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
