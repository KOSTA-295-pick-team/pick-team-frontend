// Chat Types
export interface ChatRoom {
  id: number;
  name: string;
  type: 'dm' | 'group';
  workspaceId: number;
  isPrivate: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
}

export interface ChatMember {
  id: number;
  userId: number;
  userName: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  userId: number;
  userName: string;
  text: string;
  timestamp: Date;
  createdAt: string;
  attachment?: {
    url: string;
    fileName: string;
    fileUrl?: string;
    type: 'image' | 'file';
  };
}

export interface ChatAttachment {
  url: string;
  fileName: string;
  fileUrl?: string;
  type: 'image' | 'file';
}

// API Response Types
export interface CreateChatRoomRequest {
  name: string;
  type: 'dm' | 'group';
  workspaceId: number;
  memberIds: number[];
  isPrivate?: boolean;
  description?: string;
}

export interface SendMessageRequest {
  roomId: number;
  text: string;
  attachment?: File;
}

// SSE Event Types
export interface SSEChatEvent {
  type: 'new_message' | 'room_updated' | 'member_joined' | 'member_left';
  data: any;
  roomId?: number;
}

// Legacy type for backward compatibility
export interface ChatMessageType extends ChatMessage {}

// Chat Context State Types
export interface ChatState {
  chatRooms: ChatRoom[];
  messages: { [roomId: number]: ChatMessage[] };
  currentChatRoom: ChatRoom | null;
  loading: boolean;
  error: string | null;
}

export interface ChatContextType {
  state: ChatState;
  loadChatRooms: () => Promise<void>;
  loadMessages: (roomId: number) => Promise<void>;
  sendMessage: (roomId: number, text: string) => Promise<void>;
  createChatRoom: (request: CreateChatRoomRequest) => Promise<ChatRoom>;
  setCurrentChatRoomById: (roomId: number) => void;
  joinChatRoom: (roomId: number) => Promise<void>;
  leaveChatRoom: (roomId: number) => Promise<void>;
}
