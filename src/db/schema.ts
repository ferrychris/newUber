import { pgTable, uuid, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';

// Define the order status enum
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'accepted',
  'en_route',
  'arrived',
  'picked_up',
  'delivered',
  'cancelled'
]);

// Define the orders table with all necessary fields
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: orderStatusEnum('status').notNull().default('pending'),
  customerId: uuid('customer_id').notNull(),
  driverId: uuid('driver_id'),
  pickupLocation: text('pickup_location').notNull(),
  dropoffLocation: text('dropoff_location').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Define type for order status
export type OrderStatus = typeof orderStatusEnum.enumValues[number];
