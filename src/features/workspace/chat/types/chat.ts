export interface ChatMessage {
    id: string;
    roomId: string; // Add roomId
    userId: string;
    userName: string;
    text: string;
    timestamp: Date; // Add timestamp
    createdAt: string;
    // Optional, as sender info might be joined from another source
    attachment?: {
        url: string;
        type: string;
        fileUrl?: string;
        fileName?: string;
    };
    senderName?: string; 
    senderProfilePictureUrl?: string; 
}

export interface ChatRoomMember {
    id: string; // ChatMember entity's ID
    userId: string;
    chatRoomId: string;
    role: 'MEMBER' | 'ADMIN';
    name?: string; // from User join
    profileImageUrl?: string; // from User join
}

export interface ChatRoom {
  id: string;
  workspaceId: string;
  name?: string; // Optional, used for group chats
  type: "dm" | "group";
  members: ChatRoomMember[]; // Array of member IDs and basic info
  lastMessage?: ChatMessage; // For preview in sidebar
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
  creatorId?: string; // User ID of the creator
} 