CREATE TABLE IF NOT EXISTS "workflow_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"label" text,
	CONSTRAINT "workflow_edges_source_target_unique" UNIQUE("source_node_id","target_node_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"phase_label" text,
	"position_x" integer DEFAULT 0 NOT NULL,
	"position_y" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"avatar_seed" text NOT NULL,
	"avatar_palette" text[] NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_nodes_workflow_id_avatar_seed_unique" UNIQUE("workflow_id","avatar_seed")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_source_node_id_workflow_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_target_node_id_workflow_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_user_id_updated_at_idx" ON "workflows" ("user_id","updated_at");