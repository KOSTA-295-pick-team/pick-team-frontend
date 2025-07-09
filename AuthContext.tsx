import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import {
  User,
  Workspace,
  TeamProject,
  ChatRoom,
  ChatRoomMember,
} from "./types";
import { workspaceApi, ApiError } from "./services/api";
import { tokenManager } from "./services/tokenManager";
import { userControllerApi, UserApiError } from "./services/user-controller";

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>; // 새로 추가
  logout: () => void;
  isAuthenticated: boolean;
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  currentTeamProject: TeamProject | null;
  setCurrentTeamProject: (teamProject: TeamProject | null) => void;
  updateUserProfile: (updatedProfileData: Partial<User>) => void;

  // Workspace management
  workspaces: Workspace[];
  createWorkspace: (data: {
    name: string;
    iconUrl?: string;
    password?: string;
  }) => Promise<Workspace | null>;
  joinWorkspace: (data: {
    inviteCode: string;
    password?: string;
  }) => Promise<Workspace | null>;
  joinWorkspaceById: (
    workspaceId: string,
    password?: string
  ) => Promise<Workspace | null>;
  updateWorkspace: (
    id: string,
    data: { name?: string; iconUrl?: string; password?: string }
  ) => Promise<boolean>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  kickMember: (workspaceId: string, memberId: string) => Promise<boolean>;
  banMember: (workspaceId: string, memberId: string) => Promise<boolean>;

  refreshWorkspaces: () => Promise<void>;

  // Chat specific context
  chatRooms: ChatRoom[];
  currentChatRoom: ChatRoom | null;
  setCurrentChatRoomById: (roomId: string | null) => void;
  createChatRoom: (
    name: string | undefined,
    members: ChatRoomMember[],
    type: "dm" | "group"
  ) => Promise<ChatRoom | null>;
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
  {
    id: "user@example.com",
    email: "user@example.com",
    name: "테스트 사용자",
    profilePictureUrl: "https://picsum.photos/seed/user1/40/40",
  },
  {
    id: "user_kim",
    email: "kim@example.com",
    name: "김코딩",
    profilePictureUrl: "https://picsum.photos/seed/userA/40/40",
  },
  {
    id: "user_park",
    email: "park@example.com",
    name: "박해커",
    profilePictureUrl: "https://picsum.photos/seed/userB/40/40",
  },
  {
    id: "user_lee",
    email: "lee@example.com",
    name: "이디자인",
    profilePictureUrl: "https://picsum.photos/seed/userC/40/40",
  },
];

const DEMO_CHAT_ROOMS_INITIAL: ChatRoom[] = [
  {
    id: "chat_dm_user_kim",
    workspaceId: "ws_1", // 실제 생성되는 워크스페이스 ID로 변경
    type: "dm",
    members: [
      {
        id: "user@example.com",
        name: "테스트 사용자",
        profilePictureUrl: "https://picsum.photos/seed/user1/40/40",
      },
      {
        id: "user_kim",
        name: "김코딩",
        profilePictureUrl: "https://picsum.photos/seed/userA/40/40",
      },
    ],
    lastMessage: {
      id: "dm_msg1",
      roomId: "chat_dm_user_kim",
      userId: "user_kim",
      userName: "김코딩",
      text: "안녕하세요! DM입니다.",
      timestamp: new Date(Date.now() - 3600000),
    },
    createdAt: new Date(Date.now() - 2 * 86400000),
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    id: "chat_group_general",
    workspaceId: "ws_1", // 실제 생성되는 워크스페이스 ID로 변경
    name: "일반 토론방",
    type: "group",
    members: DEMO_USERS_FOR_CHAT.filter((u) => u.id !== "user_lee"), // Everyone except lee
    lastMessage: {
      id: "grp_msg1",
      roomId: "chat_group_general",
      userId: "user_park",
      userName: "박해커",
      text: "새로운 기능 아이디어 공유합니다.",
      timestamp: new Date(Date.now() - 7200000),
    },
    createdAt: new Date(Date.now() - 5 * 86400000),
    updatedAt: new Date(Date.now() - 7200000),
    creatorId: "user@example.com",
  },
  {
    id: "chat_group_project_alpha_discussion",
    workspaceId: "ws_1", // 실제 생성되는 워크스페이스 ID로 변경
    name: "알파 프로젝트 논의",
    type: "group",
    members: [
      // Specific members for this group
      DEMO_USERS_FOR_CHAT.find((u) => u.id === "user@example.com")!,
      DEMO_USERS_FOR_CHAT.find((u) => u.id === "user_kim")!,
      DEMO_USERS_FOR_CHAT.find((u) => u.id === "user_park")!,
    ],
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    creatorId: "user_kim",
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [_currentWorkspace, _setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [_currentTeamProject, _setCurrentTeamProject] =
    useState<TeamProject | null>(null);
  const [_currentChatRoom, _setCurrentChatRoom] = useState<ChatRoom | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(
    DEMO_CHAT_ROOMS_INITIAL
  );

  // 앱 시작 시 저장된 토큰으로 자동 로그인 시도
  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenManager.getAccessToken();
      const refreshToken = tokenManager.getRefreshToken();

      if (token && refreshToken) {
        try {
          // UserController API로 현재 사용자 정보 조회 (토큰 유효성 확인)
          const userData = await userControllerApi.getMyProfile();

          console.log("[DEBUG 자동로그인] getMyProfile 반환값:", userData);
          console.log(
            "[DEBUG 자동로그인] profileImageUrl:",
            userData.profileImageUrl
          );
          console.log(
            "[DEBUG 자동로그인] profileImage:",
            userData.profileImage
          );
          console.log(
            "[DEBUG 자동로그인] profilePictureUrl:",
            userData.profilePictureUrl
          );

          setCurrentUser(userData);
          console.log("자동 로그인 성공:", userData.email);

          // 로그인 성공 후 워크스페이스 목록도 함께 로드
          await refreshWorkspaces();
        } catch (error) {
          console.warn("자동 로그인 실패:", error);
          tokenManager.clearTokens();
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 워크스페이스 목록을 새로고침하는 함수
  const refreshWorkspaces = useCallback(async () => {
    console.log("[DEBUG refreshWorkspaces] 시작");
    setLoading(true);
    try {
      console.log("[DEBUG refreshWorkspaces] API 호출 시작");
      const fetchedWorkspaces = await workspaceApi.getMyWorkspaces();
      console.log(
        "[DEBUG refreshWorkspaces] 워크스페이스 목록 조회 결과:",
        fetchedWorkspaces.length,
        "개",
        fetchedWorkspaces
      );
      setWorkspaces(fetchedWorkspaces);
      setError(null);

      // 워크스페이스가 0개가 되었을 때는 상태만 업데이트하고, 리다이렉트는 NavigateToInitialView에 위임
      if (fetchedWorkspaces.length === 0) {
        console.log(
          "[DEBUG refreshWorkspaces] 워크스페이스가 없어서 상태 초기화"
        );
        _setCurrentWorkspace(null);
        _setCurrentTeamProject(null);
        _setCurrentChatRoom(null);
      }
    } catch (err) {
      console.warn(
        "[DEBUG refreshWorkspaces] 워크스페이스 로드 실패, 폴백 데이터 사용:",
        err
      );
      setWorkspaces(FALLBACK_WORKSPACES);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("워크스페이스를 불러오는데 실패했습니다.");
      }
    } finally {
      console.log("[DEBUG refreshWorkspaces] 완료, loading을 false로 설정");
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (user: User) => {
      console.log("[DEBUG AuthContext.login] 로그인 시작:", user);

      const demoUserWithPic: User = {
        ...user,
        id: user.id || "1",
        email: user.email,
        name: user.name || "Demo User",
        profilePictureUrl:
          user.profilePictureUrl ||
          `https://picsum.photos/seed/${user.email}/100/100`,
        mbti: user.mbti || "ISTP",
        tags: user.tags || ["#아침형인간", "#리더역할선호"],
      };

      console.log("[DEBUG AuthContext.login] 사용자 설정:", demoUserWithPic);
      setCurrentUser(demoUserWithPic);
      _setCurrentTeamProject(null);
      _setCurrentChatRoom(null);

      console.log("[DEBUG AuthContext.login] 워크스페이스 로드 시작");
      // 로그인 후 워크스페이스 목록 로드 (즉시 실행)
      await refreshWorkspaces();
      console.log("[DEBUG AuthContext.login] 로그인 완료");
    },
    [refreshWorkspaces]
  );

  // UserController API를 사용한 로그인 (향상된 기능 포함)
  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        // UserController API의 향상된 로그인 사용 (클라이언트 정보 포함)
        const response = await userControllerApi.loginWithClientInfo({
          email,
          password,
        });

        // 응답에서 사용자 정보 추출 및 변환
        const user: User = {
          id: response.user.id.toString(),
          email: response.user.email,
          name: response.user.name,
          age: response.user.age,
          mbti: response.user.mbti,
          disposition: response.user.disposition,
          introduction: response.user.introduction,
          portfolio: response.user.portfolio,
          preferWorkstyle: response.user.preferWorkstyle,
          dislikeWorkstyle: response.user.dislikeWorkstyle,
          profileImage: response.user.profileImageUrl || undefined, // null을 undefined로 변환
          profileImageUrl: response.user.profileImageUrl, // 🔥 핵심 필드 추가!
          tags: response.user.hashtags || response.user.tags || [],

          // 호환성을 위한 매핑
          bio: response.user.introduction,
          portfolioLink: response.user.portfolio,
          preferredStyle: response.user.preferWorkstyle,
          avoidedStyle: response.user.dislikeWorkstyle,
          profilePictureUrl:
            response.user.profileImageUrl ||
            `https://picsum.photos/seed/${response.user.email}/100/100`,
        };

        console.log(
          "[DEBUG 로그인] 서버 응답 profileImageUrl:",
          response.user.profileImageUrl
        );
        console.log(
          "[DEBUG 로그인] 최종 User 객체 profileImageUrl:",
          user.profileImageUrl
        );

        // 현재 사용자 설정
        setCurrentUser(user);
        _setCurrentTeamProject(null);
        _setCurrentChatRoom(null);

        // 로그인 후 워크스페이스 목록 로드
        await refreshWorkspaces();

        console.log("향상된 로그인 성공:", user.email);
      } catch (err) {
        console.error("로그인 오류:", err);

        if (err instanceof UserApiError) {
          switch (err.status) {
            case 401:
              setError("이메일 또는 비밀번호가 올바르지 않습니다.");
              break;
            case 0:
              setError(
                "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요."
              );
              break;
            default:
              setError(err.message || "로그인 중 오류가 발생했습니다.");
          }
        } else {
          setError("로그인 중 예상치 못한 오류가 발생했습니다.");
        }

        // 실패 시 토큰 정리
        tokenManager.clearTokens();
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshWorkspaces]
  );

  const logout = useCallback(async () => {
    try {
      // UserController API의 향상된 로그아웃 사용 (클라이언트 정보 포함)
      const logoutResult = await userControllerApi.logoutWithClientInfo();
      console.log("향상된 로그아웃 성공:", logoutResult);
    } catch (error) {
      console.warn("로그아웃 API 호출 실패:", error);
      // 로컬 토큰은 항상 정리
    } finally {
      // 로컬 상태 정리
      setCurrentUser(null);
      _setCurrentWorkspace(null);
      _setCurrentTeamProject(null);
      _setCurrentChatRoom(null);
      setWorkspaces([]);
      setError(null);

      // 토큰 정리 (userControllerApi.logoutWithClientInfo에서도 처리하지만 확실히 하기 위해)
      tokenManager.clearTokens();
    }
  }, []);

  const setCurrentWorkspaceInternal = useCallback(
    (workspace: Workspace | null) => {
      _setCurrentWorkspace(workspace);
      setCurrentUser((prevUser: User | null) =>
        prevUser ? { ...prevUser, currentWorkspaceId: workspace?.id } : null
      );
      _setCurrentTeamProject(null);
      _setCurrentChatRoom(null);
    },
    []
  );

  const setCurrentTeamProjectInternal = useCallback(
    (teamProject: TeamProject | null) => {
      _setCurrentTeamProject(teamProject);
      setCurrentUser((prevUser: User | null) =>
        prevUser ? { ...prevUser, currentTeamProjectId: teamProject?.id } : null
      );
      _setCurrentChatRoom(null);
    },
    []
  );

  const updateUserProfile = useCallback((updatedProfileData: Partial<User>) => {
    setCurrentUser((prevUser: User | null) => {
      if (!prevUser) return null;
      // 프로필 업데이트 시에는 currentWorkspaceId와 같은 워크스페이스 관련 필드는 변경하지 않음
      // 이렇게 하면 useEffect(currentUser, workspaces, _currentWorkspace, loading)에서
      // 워크스페이스 초기화 로직이 불필요하게 트리거되지 않음
      const { currentWorkspaceId, ...profileUpdate } = updatedProfileData;
      return { ...prevUser, ...profileUpdate };
    });
  }, []);

  // 워크스페이스 생성
  const createWorkspace = useCallback(
    async (data: {
      name: string;
      iconUrl?: string;
      password?: string;
    }): Promise<Workspace | null> => {
      if (!currentUser) return null;

      setLoading(true);
      setError(null);
      try {
        const newWorkspace = await workspaceApi.create(data);
        await refreshWorkspaces(); // 목록 새로고침
        _setCurrentWorkspace(newWorkspace);
        return newWorkspace;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "워크스페이스 생성에 실패했습니다.";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, refreshWorkspaces]
  );

  // 워크스페이스 참여
  const joinWorkspace = useCallback(
    async (data: {
      inviteCode: string;
      password?: string;
    }): Promise<Workspace | null> => {
      if (!currentUser) return null;

      setLoading(true);
      setError(null);
      try {
        const workspace = await workspaceApi.join(data);
        await refreshWorkspaces(); // 목록 새로고침
        _setCurrentWorkspace(workspace);
        return workspace;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "워크스페이스 참여에 실패했습니다.";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, refreshWorkspaces]
  );

  // 워크스페이스 ID로 직접 참여
  const joinWorkspaceById = useCallback(
    async (
      workspaceId: string,
      password?: string
    ): Promise<Workspace | null> => {
      if (!currentUser) return null;

      setLoading(true);
      setError(null);
      try {
        const workspace = await workspaceApi.joinById(workspaceId, password);
        await refreshWorkspaces(); // 목록 새로고침
        _setCurrentWorkspace(workspace);
        return workspace;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "워크스페이스 참여에 실패했습니다.";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, refreshWorkspaces]
  );

  // 워크스페이스 업데이트
  const updateWorkspace = useCallback(
    async (
      id: string,
      data: { name?: string; iconUrl?: string; password?: string }
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const updatedWorkspace = await workspaceApi.update(id, data);
        if (_currentWorkspace?.id === id) {
          _setCurrentWorkspace(updatedWorkspace);
        }
        await refreshWorkspaces();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "워크스페이스 업데이트에 실패했습니다.";
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [_currentWorkspace, refreshWorkspaces]
  );

  // 워크스페이스 삭제
  const deleteWorkspace = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await workspaceApi.delete(id);
        if (_currentWorkspace?.id === id) {
          _setCurrentWorkspace(null);
          _setCurrentTeamProject(null);
          _setCurrentChatRoom(null);
        }
        await refreshWorkspaces();

        // refreshWorkspaces에서 이미 처리하지만, 추가 안전장치
        // 삭제 후 워크스페이스가 0개가 되었을 때 즉시 리다이렉트
        const remainingWorkspaces = workspaces.filter((ws) => ws.id !== id);
        if (remainingWorkspaces.length === 0) {
          window.location.hash = "/empty-workspace";
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "워크스페이스 삭제에 실패했습니다.";
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [_currentWorkspace, refreshWorkspaces, workspaces]
  );

  // 멤버 내보내기
  const kickMember = useCallback(
    async (workspaceId: string, memberId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await workspaceApi.kickMember(workspaceId, memberId);

        // 현재 워크스페이스의 멤버 목록에서 해당 멤버 즉시 제거
        if (_currentWorkspace && _currentWorkspace.id === workspaceId) {
          const updatedWorkspace = {
            ..._currentWorkspace,
            members: _currentWorkspace.members.filter(
              (member) => member.id !== memberId
            ),
          };
          _setCurrentWorkspace(updatedWorkspace);

          // 워크스페이스 목록에서도 업데이트
          setWorkspaces((prev) =>
            prev.map((ws) => (ws.id === workspaceId ? updatedWorkspace : ws))
          );
        }

        await refreshWorkspaces();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "멤버 내보내기에 실패했습니다.";
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [_currentWorkspace, refreshWorkspaces]
  );

  // 멤버 밴
  const banMember = useCallback(
    async (workspaceId: string, memberId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await workspaceApi.banMember(workspaceId, memberId);

        // 현재 워크스페이스의 멤버 목록에서 해당 멤버 즉시 제거
        if (_currentWorkspace && _currentWorkspace.id === workspaceId) {
          const updatedWorkspace = {
            ..._currentWorkspace,
            members: _currentWorkspace.members.filter(
              (member) => member.id !== memberId
            ),
          };
          _setCurrentWorkspace(updatedWorkspace);

          // 워크스페이스 목록에서도 업데이트
          setWorkspaces((prev) =>
            prev.map((ws) => (ws.id === workspaceId ? updatedWorkspace : ws))
          );
        }

        await refreshWorkspaces();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError ? err.message : "멤버 차단에 실패했습니다.";
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [_currentWorkspace, refreshWorkspaces]
  );

  // 새 초대링크 생성 기능은 제거됨 - 워크스페이스 ID 기반 고정 링크 사용

  // 초기 로드 시 첫 번째 워크스페이스 설정 또는 빈 워크스페이스 페이지로 이동
  useEffect(() => {
    // 현재 위치가 /my-page 관련 경로면 워크스페이스 초기화 로직을 실행하지 않음
    const currentPath = window.location.hash.replace("#", "");
    const isMyPagePath =
      currentPath.startsWith("/my-page") || currentPath.startsWith("/users/");

    if (currentUser && !loading && !isMyPagePath) {
      if (workspaces.length > 0 && !_currentWorkspace) {
        const firstWorkspace = workspaces[0];
        _setCurrentWorkspace(firstWorkspace);
        setCurrentUser((prev: User | null) =>
          prev ? { ...prev, currentWorkspaceId: firstWorkspace.id } : null
        );
      } else if (workspaces.length === 0) {
        // 워크스페이스가 없으면 empty-workspace 페이지로 이동
        _setCurrentWorkspace(null);
        _setCurrentTeamProject(null);
        _setCurrentChatRoom(null);
        window.location.hash = "/empty-workspace";
      }
    }
  }, [currentUser, workspaces, _currentWorkspace, loading]);

  // Chat functions
  const setCurrentChatRoomById = useCallback(
    (roomId: string | null) => {
      if (!roomId) {
        _setCurrentChatRoom(null);
        // Potentially clear currentTeamProject if a chat room selection means we are not in a team project context
        // _setCurrentTeamProject(null);
        return;
      }
      const room = chatRooms.find(
        (r) => r.id === roomId && r.workspaceId === _currentWorkspace?.id
      );
      _setCurrentChatRoom(room || null);
      // If a chat room is selected, clear team project selection as they are distinct views
      // _setCurrentTeamProject(null);
    },
    [chatRooms, _currentWorkspace]
  );

  const createChatRoom = useCallback(
    async (
      name: string | undefined,
      members: ChatRoomMember[],
      type: "dm" | "group"
    ): Promise<ChatRoom | null> => {
      if (!currentUser || !_currentWorkspace) return null;

      if (type === "dm") {
        // Ensure there are exactly two members for a DM, one of whom is the current user.
        const otherMember = members.find((m) => m.id !== currentUser.id);
        if (members.length !== 2 || !otherMember) {
          console.error("DM must have exactly two distinct members.");
          return null; // Or throw error
        }
        // Check if DM already exists
        const existingDm = chatRooms.find(
          (room) =>
            room.type === "dm" &&
            room.workspaceId === _currentWorkspace.id &&
            room.members.length === 2 &&
            room.members.some((m) => m.id === currentUser.id) &&
            room.members.some((m) => m.id === otherMember.id)
        );
        if (existingDm) {
          return existingDm; // Return existing DM
        }
      } else {
        // Group chat
        if (!name || name.trim() === "") {
          console.error("Group chat must have a name.");
          return null;
        }
        if (members.length < 2) {
          // Allow group chat with self, but typically needs more. For now, require at least 2.
          console.error("Group chat must have at least 2 members.");
          return null;
        }
      }

      const newRoom: ChatRoom = {
        id: `chat_${type}_${Date.now()}`,
        workspaceId: _currentWorkspace.id,
        name: type === "group" ? name : undefined,
        type,
        members,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: currentUser.id,
      };
      setChatRooms((prev) => [...prev, newRoom]);
      return newRoom;
    },
    [currentUser, _currentWorkspace, chatRooms]
  );

  const deleteChatRoom = useCallback(
    (roomId: string) => {
      setChatRooms((prev) => prev.filter((room) => room.id !== roomId));
      if (_currentChatRoom?.id === roomId) {
        _setCurrentChatRoom(null);
      }
      // Note: This is a mock deletion. In a real app, you'd call an API.
      // Also, consider implications: if it's a DM, does it delete for both users?
      // If it's a group, are you leaving or truly deleting (if admin)?
      // For this mock, we'll just remove it from the list.
    },
    [_currentChatRoom]
  );

  const getChatRoomName = useCallback((room: ChatRoom, user: User): string => {
    if (room.type === "group") {
      return room.name || "Unnamed Group";
    }
    // For DM, find the other member's name
    const otherMember = room.members.find((m) => m.id !== user.id);
    return otherMember?.name || "DM";
  }, []);

  const isAuthenticated = !!currentUser;
  const allUsersForChat = DEMO_USERS_FOR_CHAT; // Provide all demo users for selection

  const filteredChatRooms = _currentWorkspace
    ? chatRooms.filter((room) => room.workspaceId === _currentWorkspace.id)
    : [];

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        loginWithCredentials,
        logout,
        isAuthenticated,
        currentWorkspace: _currentWorkspace,
        setCurrentWorkspace: setCurrentWorkspaceInternal,
        currentTeamProject: _currentTeamProject,
        setCurrentTeamProject: setCurrentTeamProjectInternal,
        updateUserProfile,

        // Workspace management
        workspaces,
        createWorkspace,
        joinWorkspace,
        joinWorkspaceById,
        updateWorkspace,
        deleteWorkspace,
        kickMember,
        banMember,
        refreshWorkspaces,

        chatRooms: filteredChatRooms,
        currentChatRoom: _currentChatRoom,
        setCurrentChatRoomById,
        createChatRoom,
        deleteChatRoom,
        allUsersForChat,
        getChatRoomName,

        // Loading and error states
        loading,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
