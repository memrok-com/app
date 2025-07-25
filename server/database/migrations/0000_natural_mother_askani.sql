CREATE TABLE "assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"external_id" text,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"metadata" jsonb,
	"created_by_user" text,
	"created_by_assistant" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_user" text,
	"updated_by_assistant" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"predicate" text NOT NULL,
	"object_id" uuid NOT NULL,
	"strength" real DEFAULT 1,
	"metadata" jsonb,
	"created_by_user" text,
	"created_by_assistant" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "relations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"content" text NOT NULL,
	"source" text,
	"metadata" jsonb,
	"created_by_user" text,
	"created_by_assistant" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "observations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_created_by_assistant_assistants_id_fk" FOREIGN KEY ("created_by_assistant") REFERENCES "public"."assistants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_updated_by_assistant_assistants_id_fk" FOREIGN KEY ("updated_by_assistant") REFERENCES "public"."assistants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relations" ADD CONSTRAINT "relations_subject_id_entities_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relations" ADD CONSTRAINT "relations_object_id_entities_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relations" ADD CONSTRAINT "relations_created_by_assistant_assistants_id_fk" FOREIGN KEY ("created_by_assistant") REFERENCES "public"."assistants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_created_by_assistant_assistants_id_fk" FOREIGN KEY ("created_by_assistant") REFERENCES "public"."assistants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "assistants_user_isolation_policy" ON "assistants" AS PERMISSIVE FOR ALL TO public USING ("assistants"."user_id" = current_setting('app.current_user_id')) WITH CHECK ("assistants"."user_id" = current_setting('app.current_user_id'));--> statement-breakpoint
CREATE POLICY "entities_user_isolation_policy" ON "entities" AS PERMISSIVE FOR ALL TO public USING ("entities"."user_id" = current_setting('app.current_user_id')) WITH CHECK ("entities"."user_id" = current_setting('app.current_user_id'));--> statement-breakpoint
CREATE POLICY "relations_user_isolation_policy" ON "relations" AS PERMISSIVE FOR ALL TO public USING ("relations"."user_id" = current_setting('app.current_user_id')) WITH CHECK ("relations"."user_id" = current_setting('app.current_user_id'));--> statement-breakpoint
CREATE POLICY "observations_user_isolation_policy" ON "observations" AS PERMISSIVE FOR ALL TO public USING ("observations"."user_id" = current_setting('app.current_user_id')) WITH CHECK ("observations"."user_id" = current_setting('app.current_user_id'));