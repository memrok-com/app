CREATE TABLE "vector_search_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"query_hash" text NOT NULL,
	"query_text" text NOT NULL,
	"results" jsonb NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"search_parameters" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entity_id" uuid,
	"observation_id" uuid,
	"embedding" text NOT NULL,
	"vector_size" integer DEFAULT 1536 NOT NULL,
	"content" text NOT NULL,
	"content_type" text NOT NULL,
	"entity_name" text,
	"entity_type" text,
	"source" text,
	"search_rank" numeric(10, 6),
	"created_by_user" text,
	"created_by_assistant_name" text,
	"created_by_assistant_type" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vectors" ADD CONSTRAINT "vectors_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vectors" ADD CONSTRAINT "vectors_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE cascade ON UPDATE no action;