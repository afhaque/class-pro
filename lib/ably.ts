import Ably from 'ably';

// Ably configuration
const ABLY_API_KEY = 'J2Y9Eg.T4F9Lw:1Ly2ceLrSqpxNWlxg79NljxdcmS1uxFbM4BZqxA2QGg';

// Create Ably client instance
export const ablyClient = new Ably.Realtime({
  key: ABLY_API_KEY,
  clientId: `user-${Math.random().toString(36).substr(2, 9)}`, // Generate unique client ID
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
  
  await channel.publish('message', messageWithMetadata);
};

// Helper function to subscribe to messages
export const subscribeToMessages = (
  channelName: string,
  onMessage: (message: AblyMessage) => void
): Ably.RealtimeChannel => {
  const channel = ablyClient.channels.get(channelName);
  
  channel.subscribe('message', (message) => {
    onMessage(message.data as AblyMessage);
  });
  
  return channel;
};

// Helper function to unsubscribe from messages
export const unsubscribeFromMessages = (channel: Ably.RealtimeChannel): void => {
  channel.unsubscribe();
};
