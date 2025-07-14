export interface Workspace {
  id: string;
  name: string;
  iconUrl?: string;
  owner: {
    id: number;
    name: string;
    profileImage?: string;
    role: string;
  };
  passwordProtected: boolean;
  inviteCode?: string;
  url?: string; // 초대 링크용 URL
  memberCount: number;
  members: {
    id: number;
    name: string;
    profileImage?: string;
    role: string;
  }[];
  createdAt: string;
  updatedAt: string;
} 