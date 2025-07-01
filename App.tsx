import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginPage, SignupPage } from './pages/AuthPage';
import { MyPage, ProfileEditPage, AccountSettingsPage } from './pages/MyPageStack';
import { UserProfileViewPage } from './pages/UserProfilePage';
import { AutoTeamPage, VoteTeamPage, AdminTeamPage, TeamFormationHubPage } from './pages/TeamFormationStack';
import { TeamSpacePage } from './pages/TeamSpacePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { VideoConferencePage } from './pages/VideoConferencePage';
import EmptyWorkspacePage from './pages/EmptyWorkspacePage';
import { 
    UserIcon, UsersIcon, BellIcon, LogoutIcon, CogIcon, PlusCircleIcon,
    ChatBubbleIcon, VideoCameraIcon, CalendarDaysIcon, Modal, Input, Button, ItemListSelector,
    ComponentTrashIcon, TextArea,
    CreateWorkspaceModal, JoinWorkspaceModal, NewChatModal, 
    NewVideoConferenceModal, TeamActionModal, WorkspaceSettingsModal
} from './components';
import { Workspace, TeamProject, User as UserType, ChatRoom, ChatRoomMember } from './types';
import { MagnifyingGlassIcon, HashtagIcon, LockClosedIcon, UserGroupIcon, ArrowLeftIcon, Cog6ToothIcon, LinkIcon, ShieldCheckIcon, UserMinusIcon, NoSymbolIcon, CheckCircleIcon, XMarkIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';


// Mock Data for non-chat related entities
// const MOCK_WORKSPACES_APP: Workspace[] = [];
// const MOCK_TEAM_PROJECTS_APP: TeamProject[] = [];

const ProtectedRoute: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children ? <>{children}</> : <AppLayout />; 
};

const GlobalHeader: React.FC = () => {
  const { currentUser, logout, currentWorkspace } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <header className="bg-primary text-white shadow-md h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 fixed top-0 left-0 right-0 z-50">
      <Link to={`/ws/${currentWorkspace?.id || 'ws_default'}`} className="text-xl font-bold">
        PickTeam
      </Link>
      <div className="flex items-center space-x-4">
        {/* 팀 구성 버튼 삭제됨 */}
        <Link to="/notifications" className="p-1 rounded-full hover:bg-primary-dark relative">
          <BellIcon className="h-6 w-6" />
        </Link>
        <div className="relative">
          <button 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark focus:ring-white"
          >
            <img className="h-8 w-8 rounded-full object-cover" src={currentUser.profilePictureUrl || `https://picsum.photos/seed/${currentUser.id}/32/32`} alt="User Profile" />
          </button>
          {profileDropdownOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none text-neutral-700">
              <Link to="/my-page" className="block px-4 py-2 text-sm hover:bg-neutral-100" onClick={() => setProfileDropdownOpen(false)}>마이페이지</Link>
              <button 
                onClick={() => { 
                  logout(); 
                  setProfileDropdownOpen(false);
                  navigate('/login'); 
                }} 
                className="w-full text-left block px-4 py-2 text-sm hover:bg-neutral-100"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};






const WorkspaceSidebar: React.FC = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace, currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [isJoinWorkspaceModalOpen, setIsJoinWorkspaceModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);

  const selectWorkspace = (ws: Workspace) => {
    if (currentUser) {
      setCurrentWorkspace(ws);
      navigate(`/ws/${ws.id}`);
    }
  };
  
  return (
    <>
    <nav className="bg-neutral-800 text-neutral-300 w-16 flex flex-col items-center py-4 space-y-3 fixed top-16 left-0 h-[calc(100vh-4rem)] z-40">
      {loading ? (
        <div className="w-10 h-10 rounded-lg bg-neutral-700 animate-pulse"></div>
      ) : (
        workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => selectWorkspace(ws)}
            title={ws.name}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold transition-all
              ${currentWorkspace?.id === ws.id ? 'bg-primary text-white scale-110 ring-2 ring-white' : 'bg-neutral-700 hover:bg-neutral-600 focus:bg-neutral-600'}
              focus:outline-none`}
          >
            {ws.iconUrl || ws.name.charAt(0).toUpperCase()}
          </button>
        ))
      )}
      <div className="mt-auto space-y-2">
        <button 
          title="새 워크스페이스 생성"
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 focus:outline-none text-white"
          onClick={() => setIsCreateWorkspaceModalOpen(true)}
        >
          <PlusCircleIcon className="w-6 h-6"/>
        </button>
        <button 
          title="워크스페이스 참여"
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 focus:bg-neutral-600 focus:outline-none"
          onClick={() => setIsJoinWorkspaceModalOpen(true)}
        >
          <LinkIcon className="w-6 h-6"/>
        </button>
      </div>
    </nav>
    <CreateWorkspaceModal isOpen={isCreateWorkspaceModalOpen} onClose={() => setIsCreateWorkspaceModalOpen(false)} />
    <JoinWorkspaceModal isOpen={isJoinWorkspaceModalOpen} onClose={() => setIsJoinWorkspaceModalOpen(false)} />
    </>
  );
};








const TeamProjectSidebar: React.FC = () => {
  const { 
    currentWorkspace, currentTeamProject, setCurrentTeamProject, 
    currentUser, chatRooms, currentChatRoom, setCurrentChatRoomById, getChatRoomName, deleteChatRoom
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewVideoConferenceModalOpen, setIsNewVideoConferenceModalOpen] = useState(false);
  const [isTeamActionModalOpen, setIsTeamActionModalOpen] = useState(false);
  const [isWorkspaceSettingsModalOpen, setIsWorkspaceSettingsModalOpen] = useState(false);
  
  const [confirmDeleteInfo, setConfirmDeleteInfo] = useState<{type: 'chat' | 'video', id: string, name: string} | null>(null);

  const initialVideoRooms: { id: string; name: string }[] = [];
  const [videoRooms, setVideoRooms] = useState(initialVideoRooms);


  if (!currentWorkspace || !currentUser) return null;

  // 목업 데이터 제거 - 실제 API에서 팀 프로젝트 목록을 가져와야 함
  const teamsForCurrentWorkspace: TeamProject[] = []; // MOCK_TEAM_PROJECTS_APP 대신 빈 배열
  const groupChats = chatRooms.filter(cr => cr.type === 'group');
  const directMessages = chatRooms.filter(cr => cr.type === 'dm');

  const selectTeamProject = (tp: TeamProject, feature?: string) => {
    setCurrentTeamProject(tp);
    setCurrentChatRoomById(null); 
    let path = `/ws/${currentWorkspace.id}/team/${tp.id}`;
    if (feature) {
        path += `?feature=${feature}`;
    }
    navigate(path);
  };
  
  const selectChatRoom = (roomId: string) => {
    setCurrentChatRoomById(roomId);
    setCurrentTeamProject(null); 
    navigate(`/ws/${currentWorkspace.id}/chat/${roomId}`);
  };

  const selectVideoRoom = (roomName: string) => {
    if (currentWorkspace) {
        navigate(`/ws/${currentWorkspace.id}/video/live?room=${encodeURIComponent(roomName)}`);
    }
  };

  const handleDeleteChatRoom = (roomId: string, roomName: string) => {
    setConfirmDeleteInfo({ type: 'chat', id: roomId, name: roomName });
  };
  
  const handleDeleteVideoRoom = (roomId: string, roomName: string) => {
    setConfirmDeleteInfo({ type: 'video', id: roomId, name: roomName });
  };

  const confirmDeletion = () => {
    if (confirmDeleteInfo) {
      if (confirmDeleteInfo.type === 'chat') {
        deleteChatRoom(confirmDeleteInfo.id);
        alert(`'${confirmDeleteInfo.name}' 채팅방이 삭제(퇴장)되었습니다. (목업)`);
      } else if (confirmDeleteInfo.type === 'video') {
        setVideoRooms(prev => prev.filter(room => room.id !== confirmDeleteInfo.id));
        alert(`'${confirmDeleteInfo.name}' 화상회의 채널이 삭제되었습니다. (목업)`);
      }
    }
    setConfirmDeleteInfo(null);
  };


  return (
    <aside className="bg-neutral-100 border-r border-neutral-300 w-64 p-4 space-y-1 fixed top-16 left-16 h-[calc(100vh-4rem)] z-30 overflow-y-auto">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg font-semibold text-neutral-800 truncate" title={currentWorkspace.name}>{currentWorkspace.name}</h2>
        <button 
          onClick={() => setIsWorkspaceSettingsModalOpen(true)}
          className="p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 rounded"
          title="워크스페이스 설정"
          aria-label="워크스페이스 설정"
        >
          <Cog6ToothIcon className="w-5 h-5"/>
        </button>
      </div>
      
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 px-2">팀 프로젝트 & 기능</h3>
        {teamsForCurrentWorkspace.map(tp => (
          <button
            key={tp.id}
            onClick={() => selectTeamProject(tp)}
            className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium flex items-center justify-between group
              ${currentTeamProject?.id === tp.id && !currentChatRoom ? 'bg-primary-light text-primary-dark' : 'text-neutral-700 hover:bg-neutral-200'}`}
          >
            <span className="truncate flex items-center">
              <HashtagIcon className="w-4 h-4 mr-1 text-neutral-400 group-hover:text-neutral-600"/>
              {tp.name}
            </span>
          </button>
        ))}
         <button 
            className="w-full mt-1 text-sm text-primary hover:underline py-2 border border-primary-light rounded-md hover:bg-primary-light/10"
            onClick={() => setIsTeamActionModalOpen(true)}
        >
            새로운 팀 만들기/참여
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex justify-between items-center px-2 mb-0.5">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">그룹 채팅</h3>
            <button onClick={() => setIsNewChatModalOpen(true)} className="text-primary-dark hover:text-primary" title="새로운 채팅">
                <PlusCircleIcon className="w-4 h-4"/>
            </button>
          </div>
          {groupChats.map(room => (
             <div key={room.id} className="flex items-center group">
                <button
                    onClick={() => selectChatRoom(room.id)}
                    className={`flex-grow text-left px-3 py-1.5 rounded-l-md text-sm flex items-center truncate
                    ${currentChatRoom?.id === room.id ? 'bg-primary-light text-primary-dark font-semibold' : 'text-neutral-600 hover:bg-neutral-200'}`}
                >
                    <UserGroupIcon className="w-4 h-4 mr-1.5 text-neutral-400 group-hover:text-neutral-600"/>
                    {getChatRoomName(room, currentUser)}
                </button>
                <button 
                    onClick={() => handleDeleteChatRoom(room.id, getChatRoomName(room,currentUser))}
                    className={`p-1.5 rounded-r-md opacity-0 group-hover:opacity-100 hover:bg-red-100
                                ${currentChatRoom?.id === room.id ? 'bg-primary-light text-primary-dark' : 'text-neutral-600 hover:bg-neutral-200'}`}
                    title="채팅방 삭제/나가기"
                >
                    <ComponentTrashIcon className="w-3.5 h-3.5 text-red-500"/>
                </button>
            </div>
          ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex justify-between items-center px-2 mb-0.5">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">개인 메시지</h3>
          </div>
          {directMessages.map(room => (
             <div key={room.id} className="flex items-center group">
                <button
                    onClick={() => selectChatRoom(room.id)}
                    className={`flex-grow text-left px-3 py-1.5 rounded-l-md text-sm flex items-center truncate
                    ${currentChatRoom?.id === room.id ? 'bg-primary-light text-primary-dark font-semibold' : 'text-neutral-600 hover:bg-neutral-200'}`}
                >
                <img 
                    src={room.members.find(m => m.id !== currentUser.id)?.profilePictureUrl || `https://picsum.photos/seed/${room.members.find(m => m.id !== currentUser.id)?.id}/20/20`}
                    alt="dm partner"
                    className="w-4 h-4 rounded-full mr-1.5"
                />
                    {getChatRoomName(room, currentUser)}
                </button>
                <button 
                    onClick={() => handleDeleteChatRoom(room.id, getChatRoomName(room,currentUser))}
                     className={`p-1.5 rounded-r-md opacity-0 group-hover:opacity-100 hover:bg-red-100
                                ${currentChatRoom?.id === room.id ? 'bg-primary-light text-primary-dark' : 'text-neutral-600 hover:bg-neutral-200'}`}
                    title="대화 나가기"
                >
                    <ComponentTrashIcon className="w-3.5 h-3.5 text-red-500"/>
                </button>
            </div>
          ))}
           {(directMessages.length === 0 && groupChats.length === 0 && (
             <p className="text-xs text-neutral-500 px-3 py-2">채팅방이 없습니다. '새로운 채팅' 버튼으로 시작해보세요.</p>
           ))}
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-200">
        <div className="flex justify-between items-center px-2 mb-0.5">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">화상회의 채널</h3>
        </div>
        {videoRooms.map(room => (
            <div key={room.id} className="flex items-center group">
                <button
                    onClick={() => selectVideoRoom(room.name)}
                    className="flex-grow text-left px-3 py-1.5 rounded-l-md text-sm flex items-center truncate text-neutral-600 hover:bg-neutral-200"
                >
                    <VideoCameraIcon className="w-4 h-4 mr-1.5 text-neutral-400 group-hover:text-neutral-600"/>
                    {room.name}
                </button>
                 <button 
                    onClick={() => handleDeleteVideoRoom(room.id, room.name)}
                    className="p-1.5 rounded-r-md opacity-0 group-hover:opacity-100 hover:bg-red-100 text-neutral-600 hover:bg-neutral-200"
                    title="화상회의 채널 삭제"
                >
                    <ComponentTrashIcon className="w-3.5 h-3.5 text-red-500"/>
                </button>
            </div>
        ))}
        <Button 
            onClick={() => setIsNewVideoConferenceModalOpen(true)}
            variant="outline"
            className="w-full text-sm py-1.5 flex items-center justify-center space-x-1.5 mt-1"
        >
            <VideoCameraIcon className="w-4 h-4"/>
            <span>새 화상회의 시작</span>
        </Button>
      </div>

      <NewChatModal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} />
      <NewVideoConferenceModal isOpen={isNewVideoConferenceModalOpen} onClose={() => setIsNewVideoConferenceModalOpen(false)} />
      <TeamActionModal isOpen={isTeamActionModalOpen} onClose={() => setIsTeamActionModalOpen(false)} />
      <WorkspaceSettingsModal isOpen={isWorkspaceSettingsModalOpen} onClose={() => setIsWorkspaceSettingsModalOpen(false)} />

      {confirmDeleteInfo && (
        <Modal
            isOpen={!!confirmDeleteInfo}
            onClose={() => setConfirmDeleteInfo(null)}
            title={`${confirmDeleteInfo.type === 'chat' ? '채팅방' : '화상회의 채널'} 삭제 확인`}
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={() => setConfirmDeleteInfo(null)}>취소</Button>
                    <Button variant="danger" onClick={confirmDeletion}>삭제</Button>
                </div>
            }
        >
            <p>정말로 <strong className="font-semibold">{confirmDeleteInfo.name}</strong> 
            {confirmDeleteInfo.type === 'chat' ? ' 채팅방을 삭제(퇴장)하시겠습니까?' : ' 화상회의 채널을 삭제하시겠습니까?'}
            <br/>이 작업은 되돌릴 수 없습니다. (목업)</p>
        </Modal>
      )}
    </aside>
  );
};


const AppLayout: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const showSidebars = !!currentWorkspace;

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalHeader />
      <div className="flex flex-grow pt-16"> 
        {showSidebars && <WorkspaceSidebar />}
        {showSidebars && <TeamProjectSidebar />}
        <main className={`flex-grow transition-all duration-300 ${showSidebars ? 'ml-16 md:ml-80' : 'ml-0'}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};


function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/empty-workspace" element={<EmptyWorkspacePage />} />
            <Route path="/ws/:workspaceId" element={<HomePage />} />
            <Route path="/ws/:workspaceId/team/:teamProjectId" element={<TeamSpacePage />} />
            <Route path="/ws/:workspaceId/chat/:roomId" element={<ChatPage />} />
            <Route path="/ws/:workspaceId/video/live" element={<VideoConferencePage />} />
            
            <Route path="/my-page" element={<MyPage />} />
            <Route path="/my-page/profile-edit" element={<ProfileEditPage />} />
            <Route path="/my-page/account-settings" element={<AccountSettingsPage />} />
            <Route path="/users/:userId" element={<UserProfileViewPage />} />
            
            <Route path="/team-formation" element={<TeamFormationHubPage />} />
            <Route path="/team-formation/auto-dice" element={<AutoTeamPage mode="dice" />} />
            <Route path="/team-formation/auto-ladder" element={<AutoTeamPage mode="ladder" />} />
            <Route path="/team-formation/vote" element={<VoteTeamPage />} />
            <Route path="/team-formation/admin" element={<AdminTeamPage />} />
            
            <Route path="/notifications" element={<NotificationsPage />} />
            
            <Route path="/" element={<NavigateToInitialView />} />
          </Route>
          
          {/* 초대코드 직접 접속 라우트 - 가장 마지막에 배치하여 다른 라우트와 충돌 방지 */}
          <Route path="/:inviteCode" element={<InviteCodeHandler />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

const NavigateToInitialView: React.FC = () => {
    const { isAuthenticated, currentUser, workspaces, loading } = useAuth();
    
    console.log('🧭 NavigateToInitialView 실행');
    console.log('🔑 isAuthenticated:', isAuthenticated);
    console.log('👤 currentUser:', currentUser);
    console.log('🏢 workspaces:', workspaces);
    console.log('📦 workspaces 길이:', workspaces?.length);
    console.log('⏳ loading:', loading);
    
    if (!isAuthenticated) {
        console.log('❌ 인증되지 않음 -> /login으로 이동');
        return <Navigate to="/login" replace />;
    }
    
    // 로딩 중일 때는 로딩 화면 표시
    if (loading) {
        console.log('⏳ 로딩 중 -> 로딩 화면 표시');
        return <div className="p-4">워크스페이스 정보를 불러오는 중...</div>;
    }
    
    // 워크스페이스가 없으면 EmptyWorkspacePage로 이동
    if (!workspaces || workspaces.length === 0) {
        console.log('🚫 워크스페이스 없음 -> /empty-workspace로 이동');
        console.log('   - workspaces:', workspaces);
        console.log('   - 타입:', typeof workspaces);
        console.log('   - 길이:', workspaces?.length);
        return <Navigate to="/empty-workspace" replace />;
    }
    
    // 워크스페이스가 있으면 기본 워크스페이스로 이동
    const defaultWorkspaceId = currentUser?.currentWorkspaceId || workspaces[0]?.id;
    console.log('✅ 워크스페이스 있음 -> /ws/' + defaultWorkspaceId + '로 이동');
    console.log('   - 첫 번째 워크스페이스:', workspaces[0]);
    return <Navigate to={`/ws/${defaultWorkspaceId}`} replace />;
};

// 초대코드로 직접 접속 처리하는 컴포넌트
const InviteCodeHandler: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { joinWorkspace, setCurrentWorkspace, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // 로그인이 안 되어 있으면 로그인 페이지로 이동하면서 초대코드 저장
      navigate(`/login?inviteCode=${inviteCode}`, { replace: true });
      return;
    }

    if (inviteCode) {
      handleAutoJoin();
    }
  }, [inviteCode, isAuthenticated]);

  const handleAutoJoin = async () => {
    if (!inviteCode) return;
    
    setLoading(true);
    setError('');

    try {
      const workspace = await joinWorkspace({
        inviteCode: inviteCode,
        password: password || undefined
      });

      if (workspace) {
        setCurrentWorkspace(workspace);
        navigate(`/ws/${workspace.id}`, { replace: true });
      } else {
        setError('워크스페이스 참여에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Auto join error:', err);
      if (err.message?.includes('비밀번호')) {
        setNeedsPassword(true);
        setError('이 워크스페이스는 비밀번호가 필요합니다.');
      } else {
        setError('워크스페이스 참여 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (password.trim()) {
      handleAutoJoin();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-neutral-700">워크스페이스 참여 중...</p>
          <p className="text-sm text-neutral-500 mt-2">초대코드: {inviteCode}</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6">워크스페이스 참여</h2>
          <p className="text-sm text-neutral-600 mb-4">
            이 워크스페이스는 비밀번호로 보호되어 있습니다.
          </p>
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="워크스페이스 비밀번호를 입력하세요"
            Icon={LockClosedIcon}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
          />
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <div className="flex space-x-2 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="flex-1"
            >
              취소
            </Button>
            <Button 
              onClick={handlePasswordSubmit} 
              disabled={!password.trim() || loading}
              className="flex-1"
            >
              참여하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !needsPassword) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">참여 실패</h2>
          <p className="text-sm text-neutral-600 mb-4">{error}</p>
          <p className="text-xs text-neutral-500 mb-6">초대코드: {inviteCode}</p>
          <Button onClick={() => navigate('/')} className="w-full">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
