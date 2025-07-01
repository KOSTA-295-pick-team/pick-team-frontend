export interface User {
  id: string;
  email: string;
  name?: string;
  age?: number;
  mbti?: string;
  tags?: string[];
  bio?: string;
  portfolioLink?: string;
  preferredStyle?: string;
  avoidedStyle?: string;
  profilePictureUrl?: string;
  currentWorkspaceId?: string;
  currentTeamProjectId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  iconUrl?: string; 
  owner: {
    id: string;
    name: string;
    profileImage?: string;
    role: string;
  };
  passwordProtected: boolean;
  inviteCode?: string;
  memberCount: number;
  members: {
    id: string;
    name: string;
    profileImage?: string;
    role: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamProject {
  id: string;
  workspaceId: string;
  name: string;
  members: User[]; 
  memberCount?: number; 
  announcements: Announcement[];
  passwordProtected?: boolean;
  progress?: number; 
}

// Channel is now less about chat, more a generic concept if needed elsewhere.
// Chat functionality is now primarily driven by ChatRoom.
export interface Channel {
  id: string;
  teamProjectId: string; 
  name: string; 
  type: 'kanban' | 'bulletin' | 'video' | 'general'; // Type of content/feature
  description?: string;
}

export interface Announcement {
  id: string;
  content: string;
  author: string; 
  timestamp: Date;
}

// Chat Types
export interface ChatRoomMember extends Pick<User, 'id' | 'name' | 'profilePictureUrl'> {
    isBanned?: boolean; // For member management example
}

export interface ChatRoom {
  id: string;
  workspaceId: string;
  name?: string; // Optional, used for group chats
  type: 'dm' | 'group';
  members: ChatRoomMember[]; // Array of member IDs and basic info
  lastMessage?: ChatMessage; // For preview in sidebar
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
  creatorId?: string; // User ID of the creator
}

export interface ChatMessage {
  id:string;
  roomId: string; // Links to ChatRoom
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  attachment?: {
    fileName: string;
    fileUrl: string; 
    type: 'image' | 'file';
  };
}


export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: 'meeting' | 'deadline' | 'other';
  teamProjectId: string;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string; 
}

export enum TeamFormationMethod {
  AUTO_DICE = 'auto_dice',
  AUTO_LADDER = 'auto_ladder',
  VOTE_BASED = 'vote_based',
  ADMIN_MANUAL = 'admin_manual'
}

export interface TendencyTag {
  id: string;
  label: string;
}

export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: VoteOption[];
  allowMultipleVotes?: boolean;
  teamProjectId?: string; 
}

// Kanban Types
export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  assigneeIds?: string[]; 
  dueDate?: Date;
  attachments?: KanbanAttachment[];
  comments?: KanbanComment[];
  order: number; 
  isApproved?: boolean;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string; 
  cards: KanbanCard[]; 
  order: number; 
}

export interface KanbanBoard {
  id: string; 
  teamProjectId: string;
  columns: KanbanColumn[];
}

export interface KanbanAttachment {
  id: string;
  cardId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  uploaderId: string;
}

export interface KanbanComment {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

// Bulletin Board Types
export interface BulletinPost {
  id: string;
  teamProjectId: string; 
  title: string;
  content: string; 
  authorId: string;
  authorName: string; 
  createdAt: Date;
  updatedAt?: Date;
  attachments?: BulletinAttachment[];
  comments?: BulletinComment[];
  viewCount?: number;
}

export interface BulletinComment {
  id: string;
  postId: string;
  userId: string;
  userName: string; 
  text: string;
  createdAt: Date;
}

export interface BulletinAttachment {
  id: string;
  postId: string;
  fileName: string;
  fileUrl: string;
}

export interface Team extends TeamProject {}
