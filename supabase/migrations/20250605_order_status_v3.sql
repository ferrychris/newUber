CREATE TYPE "public"."order_status" AS ENUM('pending', 'accepted', 'en_route', 'arrived', 'picked_up', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"customer_id" uuid NOT NULL,
	"driver_id" uuid,
	"pickup_location" text NOT NULL,
	"dropoff_location" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
