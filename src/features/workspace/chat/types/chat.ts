export interface ChatMessage {
    id: number; // API와 일치하도록 number로 변경
    roomId: number; // API와 일치하도록 number로 변경
    userId: number; // API와 일치하도록 number로 변경
    userName: string;
    text: string;
    timestamp: Date; 
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
    id: number; // API와 일치하도록 number로 변경
    userId: number; // API와 일치하도록 number로 변경
    chatRoomId: number; // API와 일치하도록 number로 변경
    role: 'MEMBER' | 'ADMIN';
    name?: string; // from User join
    profileImageUrl?: string; // from User join
}

export interface ChatRoom {
  id: number; // API와 일치하도록 number로 변경
  workspaceId: number; // API와 일치하도록 number로 변경
  name?: string; // Optional, used for group chats
  type: "PERSONAL" | "GROUP"; // API와 일치하도록 변경
  members: ChatRoomMember[]; // Array of member IDs and basic info
  lastMessage?: ChatMessage; // For preview in sidebar
  unreadCount?: number;
  createdAt: Date;
  updatedAt?: Date; // optional로 변경
  creatorId?: number; // API와 일치하도록 number로 변경
} 