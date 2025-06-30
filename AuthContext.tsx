import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { User, Workspace, TeamProject, ChatRoom, ChatRoomMember } from './types';
import { workspaceApi, ApiError } from './services/api';

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  currentTeamProject: TeamProject | null;
  setCurrentTeamProject: (teamProject: TeamProject | null) => void;
  updateUserProfile: (updatedProfileData: Partial<User>) => void;
  
  // Workspace management
  workspaces: Workspace[];
  createWorkspace: (data: { name: string; iconUrl?: string; password?: string }) => Promise<Workspace | null>;
  joinWorkspace: (data: { inviteCode: string; password?: string }) => Promise<Workspace | null>;
  updateWorkspace: (id: string, data: { name?: string; iconUrl?: string; password?: string }) => Promise<boolean>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  kickMember: (workspaceId: string, memberId: string) => Promise<boolean>;
  banMember: (workspaceId: string, memberId: string) => Promise<boolean>;
  generateNewInviteCode: (workspaceId: string) => Promise<string | null>;
  refreshWorkspaces: () => Promise<void>;
  
  // Chat specific context
  chatRooms: ChatRoom[];
  currentChatRoom: ChatRoom | null;
  setCurrentChatRoomById: (roomId: string | null) => void;
  createChatRoom: (name: string | undefined, members: ChatRoomMember[], type: 'dm' | 'group') => Promise<ChatRoom | null>;
  deleteChatRoom: (roomId: string) => void; // Added for chat room deletion
  allUsersForChat: User[]; // For selecting users in chat creation
  getChatRoomName: (room: ChatRoom, currentUser: User) => string;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock data는 백엔드가 준비되기 전까지 폴백으로 사용
const FALLBACK_WORKSPACES: Workspace[] = [
  // 빈 배열로 변경 - 실제 API 응답이 없을 때 EmptyWorkspacePage 표시
];

export const DEMO_USERS_FOR_CHAT: User[] = [
    { id: 'user@example.com', email: 'user@example.com', name: '테스트 사용자', profilePictureUrl: 'https://picsum.photos/seed/user1/40/40' },
    { id: 'user_kim', email: 'kim@example.com', name: '김코딩', profilePictureUrl: 'https://picsum.photos/seed/userA/40/40' },
    { id: 'user_park', email: 'park@example.com', name: '박해커', profilePictureUrl: 'https://picsum.photos/seed/userB/40/40' },
    { id: 'user_lee', email: 'lee@example.com', name: '이디자인', profilePictureUrl: 'https://picsum.photos/seed/userC/40/40' },
];


const DEMO_CHAT_ROOMS_INITIAL: ChatRoom[] = [
    {
        id: 'chat_dm_user_kim',
        workspaceId: 'ws_1', // 실제 생성되는 워크스페이스 ID로 변경
        type: 'dm',
        members: [
            { id: 'user@example.com', name: '테스트 사용자', profilePictureUrl: 'https://picsum.photos/seed/user1/40/40' },
            { id: 'user_kim', name: '김코딩', profilePictureUrl: 'https://picsum.photos/seed/userA/40/40' },
        ],
        lastMessage: {id: 'dm_msg1', roomId: 'chat_dm_user_kim', userId:'user_kim', userName:'김코딩', text: '안녕하세요! DM입니다.', timestamp: new Date(Date.now() - 3600000)},
        createdAt: new Date(Date.now() - 2 * 86400000),
        updatedAt: new Date(Date.now() - 3600000),
    },
    {
        id: 'chat_group_general',
        workspaceId: 'ws_1', // 실제 생성되는 워크스페이스 ID로 변경
        name: '일반 토론방',
        type: 'group',
        members: DEMO_USERS_FOR_CHAT.filter(u => u.id !== 'user_lee'), // Everyone except lee
        lastMessage: {id: 'grp_msg1', roomId: 'chat_group_general', userId:'user_park', userName:'박해커', text: '새로운 기능 아이디어 공유합니다.', timestamp: new Date(Date.now() - 7200000)},
        createdAt: new Date(Date.now() - 5 * 86400000),
        updatedAt: new Date(Date.now() - 7200000),
        creatorId: 'user@example.com'
    },
     {
        id: 'chat_group_project_alpha_discussion',
        workspaceId: 'ws_1', // 실제 생성되는 워크스페이스 ID로 변경
        name: '알파 프로젝트 논의',
        type: 'group',
        members: [ // Specific members for this group
            DEMO_USERS_FOR_CHAT.find(u => u.id === 'user@example.com')!,
            DEMO_USERS_FOR_CHAT.find(u => u.id === 'user_kim')!,
            DEMO_USERS_FOR_CHAT.find(u => u.id === 'user_park')!,
        ],
        createdAt: new Date(Date.now() - 3 * 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        creatorId: 'user_kim'
    },
];


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentWorkspace, _setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentTeamProject, _setCurrentTeamProject] = useState<TeamProject | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(FALLBACK_WORKSPACES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(DEMO_CHAT_ROOMS_INITIAL);
  const [currentChatRoom, _setCurrentChatRoom] = useState<ChatRoom | null>(null);

  // 워크스페이스 목록을 새로고침하는 함수
  const refreshWorkspaces = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const fetchedWorkspaces = await workspaceApi.getMyWorkspaces();
      setWorkspaces(fetchedWorkspaces);
      setError(null);
    } catch (err) {
      console.warn('워크스페이스 로드 실패, 폴백 데이터 사용:', err);
      setWorkspaces(FALLBACK_WORKSPACES);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('워크스페이스를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const login = useCallback(async (user: User) => {
    const demoUserWithPic: User = {
      ...user,
      id: user.id || '1',
      email: user.email,
      name: user.name || 'Demo User',
      profilePictureUrl: user.profilePictureUrl || `https://picsum.photos/seed/${user.email}/100/100`,
      mbti: user.mbti || 'ISTP',
      tags: user.tags || ['#아침형인간', '#리더역할선호'],
    };
    setCurrentUser(demoUserWithPic);
    _setCurrentTeamProject(null);
    _setCurrentChatRoom(null);
    
    // 로그인 후 워크스페이스 목록 로드
    setTimeout(() => refreshWorkspaces(), 100);
  }, [refreshWorkspaces]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    _setCurrentWorkspace(null);
    _setCurrentTeamProject(null);
    _setCurrentChatRoom(null);
    setWorkspaces([]);
    setError(null);
  }, []);

  const setCurrentWorkspaceInternal = useCallback((workspace: Workspace | null) => {
    _setCurrentWorkspace(workspace);
    setCurrentUser((prevUser: User | null) => prevUser ? { ...prevUser, currentWorkspaceId: workspace?.id } : null);
    _setCurrentTeamProject(null); 
    _setCurrentChatRoom(null);
  }, []);

  const setCurrentTeamProjectInternal = useCallback((teamProject: TeamProject | null) => {
    _setCurrentTeamProject(teamProject);
    setCurrentUser((prevUser: User | null) => prevUser ? { ...prevUser, currentTeamProjectId: teamProject?.id } : null);
    _setCurrentChatRoom(null);
  }, []);
  
  const updateUserProfile = useCallback((updatedProfileData: Partial<User>) => {
    setCurrentUser((prevUser: User | null) => {
      if (!prevUser) return null;
      return { ...prevUser, ...updatedProfileData };
    });
  }, []);

  // 워크스페이스 생성
  const createWorkspace = useCallback(async (data: { name: string; iconUrl?: string; password?: string }): Promise<Workspace | null> => {
    if (!currentUser) return null;
    
    setLoading(true);
    setError(null);
    try {
      const newWorkspace = await workspaceApi.create(data);
      await refreshWorkspaces(); // 목록 새로고침
      _setCurrentWorkspace(newWorkspace);
      return newWorkspace;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '워크스페이스 생성에 실패했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, refreshWorkspaces]);

  // 워크스페이스 참여
  const joinWorkspace = useCallback(async (data: { inviteCode: string; password?: string }): Promise<Workspace | null> => {
    if (!currentUser) return null;
    
    setLoading(true);
    setError(null);
    try {
      const workspace = await workspaceApi.join(data);
      await refreshWorkspaces(); // 목록 새로고침
      _setCurrentWorkspace(workspace);
      return workspace;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '워크스페이스 참여에 실패했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, refreshWorkspaces]);

  // 워크스페이스 업데이트
  const updateWorkspace = useCallback(async (id: string, data: { name?: string; iconUrl?: string; password?: string }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const updatedWorkspace = await workspaceApi.update(id, data);
      if (currentWorkspace?.id === id) {
        _setCurrentWorkspace(updatedWorkspace);
      }
      await refreshWorkspaces();
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '워크스페이스 업데이트에 실패했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, refreshWorkspaces]);

  // 워크스페이스 삭제
  const deleteWorkspace = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await workspaceApi.delete(id);
      if (currentWorkspace?.id === id) {
        _setCurrentWorkspace(null);
      }
      await refreshWorkspaces();
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '워크스페이스 삭제에 실패했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, refreshWorkspaces]);

  // 멤버 내보내기
  const kickMember = useCallback(async (workspaceId: string, memberId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await workspaceApi.kickMember(workspaceId, memberId);
      await refreshWorkspaces();
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '멤버 내보내기에 실패했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshWorkspaces]);

  // 멤버 밴
  const banMember = useCallback(async (workspaceId: string, memberId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await workspaceApi.banMember(workspaceId, memberId);
      await refreshWorkspaces();
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '멤버 차단에 실패했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshWorkspaces]);

  // 새 초대링크 생성
  const generateNewInviteCode = useCallback(async (workspaceId: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const newInviteCode = await workspaceApi.generateInviteCode(workspaceId);
      await refreshWorkspaces();
      return newInviteCode;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '초대링크 생성에 실패했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshWorkspaces]);

  // 초기 로드 시 첫 번째 워크스페이스 설정
  useEffect(() => {
    if (currentUser && workspaces.length > 0 && !currentWorkspace) {
      const firstWorkspace = workspaces[0];
      _setCurrentWorkspace(firstWorkspace);
      setCurrentUser((prev: User | null) => prev ? {...prev, currentWorkspaceId: firstWorkspace.id} : null);
    }
  }, [currentUser, workspaces, currentWorkspace]);

  // Chat functions
  const setCurrentChatRoomById = useCallback((roomId: string | null) => {
    if (!roomId) {
      _setCurrentChatRoom(null);
      // Potentially clear currentTeamProject if a chat room selection means we are not in a team project context
      // _setCurrentTeamProject(null); 
      return;
    }
    const room = chatRooms.find(r => r.id === roomId && r.workspaceId === currentWorkspace?.id);
    _setCurrentChatRoom(room || null);
    // If a chat room is selected, clear team project selection as they are distinct views
    // _setCurrentTeamProject(null); 
  }, [chatRooms, currentWorkspace]);

  const createChatRoom = useCallback(async (name: string | undefined, members: ChatRoomMember[], type: 'dm' | 'group'): Promise<ChatRoom | null> => {
    if (!currentUser || !currentWorkspace) return null;

    if (type === 'dm') {
        // Ensure there are exactly two members for a DM, one of whom is the current user.
        const otherMember = members.find(m => m.id !== currentUser.id);
        if (members.length !== 2 || !otherMember) {
            console.error("DM must have exactly two distinct members.");
            return null; // Or throw error
        }
        // Check if DM already exists
        const existingDm = chatRooms.find(room => 
            room.type === 'dm' &&
            room.workspaceId === currentWorkspace.id &&
            room.members.length === 2 &&
            room.members.some(m => m.id === currentUser.id) &&
            room.members.some(m => m.id === otherMember.id)
        );
        if (existingDm) {
            return existingDm; // Return existing DM
        }
    } else { // Group chat
        if (!name || name.trim() === '') {
            console.error("Group chat must have a name.");
            return null;
        }
        if (members.length < 2) { // Allow group chat with self, but typically needs more. For now, require at least 2.
             console.error("Group chat must have at least 2 members.");
             return null;
        }
    }


    const newRoom: ChatRoom = {
        id: `chat_${type}_${Date.now()}`,
        workspaceId: currentWorkspace.id,
        name: type === 'group' ? name : undefined,
        type,
        members,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: currentUser.id,
    };
    setChatRooms(prev => [...prev, newRoom]);
    return newRoom;
  }, [currentUser, currentWorkspace, chatRooms]);

  const deleteChatRoom = useCallback((roomId: string) => {
    setChatRooms(prev => prev.filter(room => room.id !== roomId));
    if (currentChatRoom?.id === roomId) {
        _setCurrentChatRoom(null);
    }
    // Note: This is a mock deletion. In a real app, you'd call an API.
    // Also, consider implications: if it's a DM, does it delete for both users?
    // If it's a group, are you leaving or truly deleting (if admin)?
    // For this mock, we'll just remove it from the list.
  }, [currentChatRoom]);


  const getChatRoomName = useCallback((room: ChatRoom, user: User): string => {
    if (room.type === 'group') {
        return room.name || 'Unnamed Group';
    }
    // For DM, find the other member's name
    const otherMember = room.members.find(m => m.id !== user.id);
    return otherMember?.name || 'DM';
  }, []);


  const isAuthenticated = !!currentUser;
  const allUsersForChat = DEMO_USERS_FOR_CHAT; // Provide all demo users for selection

  const filteredChatRooms = currentWorkspace 
    ? chatRooms.filter(room => room.workspaceId === currentWorkspace.id)
    : [];

  return (
    <AuthContext.Provider value={{ 
        currentUser, login, logout, isAuthenticated, 
        currentWorkspace, setCurrentWorkspace: setCurrentWorkspaceInternal, 
        currentTeamProject, setCurrentTeamProject: setCurrentTeamProjectInternal, 
        updateUserProfile,
        
        // Workspace management
        workspaces,
        createWorkspace,
        joinWorkspace,
        updateWorkspace,
        deleteWorkspace,
        kickMember,
        banMember,
        generateNewInviteCode,
        refreshWorkspaces,
        
        chatRooms: filteredChatRooms, 
        currentChatRoom, 
        setCurrentChatRoomById,
        createChatRoom,
        deleteChatRoom,
        allUsersForChat,
        getChatRoomName,
        
        // Loading and error states
        loading,
        error,
        setError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
