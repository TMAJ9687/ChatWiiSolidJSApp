export interface Bot {
  id: string;
  userId: string;
  nickname: string;
  age: number;
  gender: 'male' | 'female';
  country: string;
  interests: string[];
  behaviorSettings: BotBehaviorSettings;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  avatar?: string;
  online?: boolean;
}

export interface BotBehaviorSettings {
  responseDelay: number; // milliseconds
  activityLevel: 'low' | 'medium' | 'high';
  conversationStyle: 'friendly' | 'professional' | 'casual';
  autoRespond: boolean;
  maxMessagesPerHour: number;
}

export interface CreateBotRequest {
  nickname: string;
  age: number;
  gender: 'male' | 'female';
  country: string;
  interests: string[];
  behaviorSettings?: Partial<BotBehaviorSettings>;
}

export interface UpdateBotRequest {
  nickname?: string;
  age?: number;
  gender?: 'male' | 'female';
  country?: string;
  interests?: string[];
  behaviorSettings?: Partial<BotBehaviorSettings>;
  isActive?: boolean;
}

export interface BotStats {
  totalBots: number;
  activeBots: number;
  onlineBots: number;
  messagesSentToday: number;
}