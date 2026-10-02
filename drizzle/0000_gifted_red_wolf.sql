CREATE TABLE "article_link_stats" (
	"from_article_id" uuid NOT NULL,
	"to_article_id" uuid NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_link_stats_from_article_id_to_article_id_pk" PRIMARY KEY("from_article_id","to_article_id")
);
--> statement-breakpoint
CREATE TABLE "article_relations" (
	"article_id" uuid NOT NULL,
	"related_article_id" uuid NOT NULL,
	"relation_type" text DEFAULT 'related' NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_relations_article_id_related_article_id_relation_type_pk" PRIMARY KEY("article_id","related_article_id","relation_type")
);
--> statement-breakpoint
CREATE TABLE "article_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "article_sources_article_id_url_unique" UNIQUE("article_id","url"),
	CONSTRAINT "article_sources_article_id_position_unique" UNIQUE("article_id","position")
);
--> statement-breakpoint
CREATE TABLE "article_stats" (
	"article_id" uuid PRIMARY KEY NOT NULL,
	"read_count" bigint DEFAULT 0 NOT NULL,
	"engaged_read_count" bigint DEFAULT 0 NOT NULL,
	"unique_visitor_count" bigint DEFAULT 0 NOT NULL,
	"total_engaged_seconds" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_stats_daily" (
	"article_id" uuid NOT NULL,
	"date" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"engaged_reads" integer DEFAULT 0 NOT NULL,
	"total_engaged_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "article_stats_daily_article_id_date_pk" PRIMARY KEY("article_id","date")
);
--> statement-breakpoint
CREATE TABLE "article_stats_hourly" (
	"article_id" uuid NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"engaged_reads" integer DEFAULT 0 NOT NULL,
	"total_engaged_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "article_stats_hourly_article_id_bucket_start_pk" PRIMARY KEY("article_id","bucket_start")
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "article_traffic_daily" (
	"article_id" uuid NOT NULL,
	"date" date NOT NULL,
	"source" text NOT NULL,
	"medium" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"engaged_reads" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "article_traffic_daily_article_id_date_source_medium_pk" PRIMARY KEY("article_id","date","source","medium")
);
--> statement-breakpoint
CREATE TABLE "article_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"seo_title" text,
	"description" text,
	"hero_alt" text,
	"content_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_translations_article_id_locale_unique" UNIQUE("article_id","locale"),
	CONSTRAINT "article_translations_locale_slug_unique" UNIQUE("locale","slug")
);
--> statement-breakpoint
CREATE TABLE "article_visitor_reads" (
	"article_id" uuid NOT NULL,
	"visitor_hash" text NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_visitor_reads_article_id_visitor_hash_pk" PRIMARY KEY("article_id","visitor_hash")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_slug" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"category_id" uuid,
	"author" text DEFAULT 'ELEVEN' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	"first_published_at" timestamp with time zone,
	"hero_image" text,
	"featured" boolean DEFAULT false NOT NULL,
	"breaking" boolean DEFAULT false NOT NULL,
	"homepage_priority" smallint DEFAULT 50 NOT NULL,
	"reading_time" smallint,
	"trending_override" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_canonical_slug_unique" UNIQUE("canonical_slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "article_link_stats" ADD CONSTRAINT "article_link_stats_from_article_id_articles_id_fk" FOREIGN KEY ("from_article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_link_stats" ADD CONSTRAINT "article_link_stats_to_article_id_articles_id_fk" FOREIGN KEY ("to_article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_related_article_id_articles_id_fk" FOREIGN KEY ("related_article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_stats" ADD CONSTRAINT "article_stats_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_stats_daily" ADD CONSTRAINT "article_stats_daily_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_stats_hourly" ADD CONSTRAINT "article_stats_hourly_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_traffic_daily" ADD CONSTRAINT "article_traffic_daily_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_visitor_reads" ADD CONSTRAINT "article_visitor_reads_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_stats_daily_article_day_idx" ON "article_stats_daily" USING btree ("article_id","date");--> statement-breakpoint
CREATE INDEX "article_stats_hourly_article_bucket_idx" ON "article_stats_hourly" USING btree ("article_id","bucket_start");--> statement-breakpoint
CREATE INDEX "article_translations_locale_slug_idx" ON "article_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");