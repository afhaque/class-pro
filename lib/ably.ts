import Ably from 'ably';

// Ably configuration
const ABLY_API_KEY = 'J2Y9Eg.T4F9Lw:1Ly2ceLrSqpxNWlxg79NljxdcmS1uxFbM4BZqxA2QGg';

// Create a single global Ably client instance
export const ablyClient = new Ably.Realtime({
  key: ABLY_API_KEY,
  // No clientId - let Ably generate anonymous connections
});

// Single global channel for all users
export const GLOBAL_CHANNEL = 'class-pro-global-chat';

// Message types
export interface AblyMessage {
  id: string;
  text: string;
  timestamp: number;
  sender: string;
  senderType: 'teacher' | 'student';
  detectedLanguage?: {
    code: string;
    name: string;
  };
  autoTranslation?: {
    text: string;
  };
  translation?: {
    text: string;
    targetLang: string;
  };
}

// Helper function to get the global channel (same for everyone)
export const getChannelName = (): string => {
  return GLOBAL_CHANNEL;
};

// Helper function to publish a message
export const publishMessage = async (
  channelName: string,
  message: Omit<AblyMessage, 'id' | 'timestamp'>
): Promise<void> => {
  const channel = ablyClient.channels.get(channelName);
  const messageWithMetadata: AblyMessage = {
    ...message,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
  };
  
  console.log(`Publishing message to channel ${channelName}:`, messageWithMetadata);
  console.log(`Ably client connection state:`, ablyClient.connection.state);
  
  await channel.publish('message', messageWithMetadata);
  console.log('Message published successfully');
};

// Helper function to subscribe to messages
export const subscribeToMessages = (
  channelName: string,
  onMessage: (message: AblyMessage) => void
): Ably.RealtimeChannel => {
  const channel = ablyClient.channels.get(channelName);
  
  console.log(`Subscribing to channel: ${channelName}`);
  console.log(`Ably client connection state:`, ablyClient.connection.state);
  
  channel.subscribe('message', (message) => {
    console.log(`Received message on channel ${channelName}:`, message.data);
    onMessage(message.data as AblyMessage);
  });
  
  // Log when connection state changes
  ablyClient.connection.on('connected', () => {
    console.log('Ably client connected successfully');
  });
  
  ablyClient.connection.on('disconnected', () => {
    console.log('Ably client disconnected');
  });
  
  return channel;
};

// Helper function to unsubscribe from messages
export const unsubscribeFromMessages = (channel: Ably.RealtimeChannel): void => {
  channel.unsubscribe();
};
