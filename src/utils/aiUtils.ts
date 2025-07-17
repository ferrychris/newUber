import { supabase } from '../lib/supabaseClient';

// Define the AI response interface
interface AIResponse {
  message: string;
  success: boolean;
  error?: string;
}

/**
 * Process a message with AI and get a response
 * @param message The user's message to process
 * @param orderId The order ID for context
 * @param conversationHistory Previous messages for context
 * @returns Promise with the AI response
 */
export const getAIResponse = async (
  message: string,
  orderId: string,
  conversationHistory: Array<{sender: string, message: string}>
): Promise<AIResponse> => {
  try {
    // Check if we have an API key in environment variables
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    
    if (!apiKey) {
      console.error('No OpenAI API key found in environment variables');
      return {
        message: "I'm sorry, I can't process your request right now. Please try again later.",
        success: false,
        error: 'No API key configured'
      };
    }

    // Get order details for context
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order details:', orderError);
    }

    // Prepare the conversation context
    const orderContext = orderData ? 
      `Order #${orderId} - Pickup: ${orderData.pickup_location}, Dropoff: ${orderData.dropoff_location}, Status: ${orderData.status}` : 
      `Order #${orderId}`;

    // Format conversation history for the AI
    const formattedHistory = conversationHistory.map(msg => {
      return `${msg.sender}: ${msg.message}`;
    }).join('\n');

    // Create the prompt with context
    const prompt = `
You are an AI assistant helping a delivery driver communicate with customers.
Order Context: ${orderContext}

Previous conversation:
${formattedHistory}

Customer: ${message}

Please respond as the driver in a helpful, professional manner. Keep responses concise and focused on delivery logistics.
`;

    try {
      // Simulate API call for now (in production, replace with actual OpenAI API call)
      // This is a placeholder for the actual API integration
      console.log('Sending to AI API:', prompt);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a simple response based on the message content
      let response = '';
      
      if (message.toLowerCase().includes('where') || message.toLowerCase().includes('location')) {
        response = "I'm currently on my way to your location. I'll be there in about 10-15 minutes.";
      } else if (message.toLowerCase().includes('time') || message.toLowerCase().includes('when')) {
        response = "I expect to arrive in approximately 10-15 minutes, traffic permitting.";
      } else if (message.toLowerCase().includes('cancel')) {
        response = "I'm sorry, but to cancel your order, please contact customer support through the app.";
      } else if (message.toLowerCase().includes('thank')) {
        response = "You're welcome! Happy to help.";
      } else if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        response = "Hello! I'm your delivery driver. How can I help you today?";
      } else {
        response = "I've received your message. I'm currently focused on delivering your order safely and efficiently. Is there anything specific about the delivery you'd like to know?";
      }
      
      return {
        message: response,
        success: true
      };
      
    } catch (apiError) {
      console.error('Error calling AI API:', apiError);
      return {
        message: "I'm sorry, I couldn't process your request. Please try again later.",
        success: false,
        error: 'API error'
      };
    }
  } catch (error) {
    console.error('Error in getAIResponse:', error);
    return {
      message: "I'm sorry, something went wrong. Please try again later.",
      success: false,
      error: 'Unknown error'
    };
  }
};
