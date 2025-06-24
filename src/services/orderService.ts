import { db } from '../db';
import { sql } from 'drizzle-orm';
import { orders, OrderStatus } from '../db/schema';

interface OrderStatusUpdateResponse {
  order_id: string;
  new_status: OrderStatus;
  updated_at: string;
  error?: string;
}

export class OrderService {
  static async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus
  ): Promise<OrderStatusUpdateResponse> {
    try {
      const result = await db.execute<OrderStatusUpdateResponse>(
        sql`SELECT update_order_status_v2(${orderId}::uuid, ${newStatus}::order_status) as result`
      );
      
      const response = result.rows[0]?.result;
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update order status: ${error.message}`);
      }
      throw new Error('Failed to update order status');
    }
  }

  static async getValidNextStatuses(
    currentStatus: OrderStatus
  ): Promise<OrderStatus[]> {
    try {
      const result = await db.execute<{ get_next_status_options: OrderStatus[] }>(
        sql`SELECT get_next_status_options(${currentStatus}::order_status) as result`
      );
      
      return result.rows[0]?.result || [];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get next status options: ${error.message}`);
      }
      throw new Error('Failed to get next status options');
    }
  }
}
