import { OrderService } from '../services/orderService';
import { OrderStatus } from '../db/schema';

async function handleOrderStatusUpdate(orderId: string, newStatus: OrderStatus) {
  try {
    // Update the order status
    const response = await OrderService.updateOrderStatus(orderId, newStatus);
    console.log('Order status updated:', response);
    
    // Get valid next statuses
    const nextPossibleStatuses = await OrderService.getValidNextStatuses(newStatus);
    console.log('Next possible statuses:', nextPossibleStatuses);
    
    return response;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// Example usage
async function runExample() {
  try {
    const orderId = 'your-order-id-here';
    
    // Update to accepted
    await handleOrderStatusUpdate(orderId, 'accepted');
    
    // Update to en_route
    await handleOrderStatusUpdate(orderId, 'en_route');
    
    // Try an invalid transition (should throw an error)
    await handleOrderStatusUpdate(orderId, 'pending');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample();
}
