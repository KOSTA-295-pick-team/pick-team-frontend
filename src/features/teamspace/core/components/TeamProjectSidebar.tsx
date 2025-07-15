import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { teamApi } from '@/features/teamspace/team/api/teamApi';
import { Team } from '@/types';
import { 
    CogIcon,
    PlusCircleIcon, 
    UsersIcon,
    VideoCameraIcon,
    ChatBubbleIcon,
    LockClosedIcon 
} from '@/assets/icons';
import TeamCreateModal from '@/features/teamspace/team/components/TeamCreateModal';
import NewChatModal from '@/features/workspace/chat/components/NewChatModal';
import WorkspaceSettingsModal from '@/features/workspace/management/components/WorkspaceSettingsModal';

// 임시 모달 컴포넌트 - 실제 구현 시 수정 필요
const NewVideoConferenceModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
                <h2 className="text-lg font-bold mb-4">새 화상회의</h2>
                <p className="mb-4">새 화상회의 모달이 구현되지 않았습니다.</p>
                <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded">닫기</button>
            </div>
        </div>
    );
};

export const TeamProjectSidebar: React.FC = () => {
    const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
    const { workspaceId, teamId } = useParams<{ workspaceId: string; teamId: string; }>();
  const location = useLocation();    const [teamProjects, setTeamProjects] = useState<Team[]>([]);
    const [isTeamCreateModalOpen, setIsTeamCreateModalOpen] = useState(false);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [isNewVideoConferenceModalOpen, setIsNewVideoConferenceModalOpen] = useState(false);
    const [isWorkspaceSettingsModalOpen, setIsWorkspaceSettingsModalOpen] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      loadTeams();
    }
  }, [currentWorkspace]);

  // 워크스페이스 홈으로 돌아왔을 때 팀 목록 갱신
  useEffect(() => {
    if (currentWorkspace && location.pathname === `/ws/${workspaceId}`) {
      loadTeams();
    }
  }, [location.pathname, currentWorkspace, workspaceId]);

  // 팀 생성 이벤트 리스닝
  useEffect(() => {
    const handleTeamCreated = (event: CustomEvent) => {
      const newTeam = event.detail;
      setTeamProjects(prev => [...prev, newTeam]);
    };

    window.addEventListener('teamCreated', handleTeamCreated as EventListener);
    
    return () => {
      window.removeEventListener('teamCreated', handleTeamCreated as EventListener);
    };
  }, []);

  const loadTeams = () => {
    if (!currentWorkspace) return;
    
    teamApi.getTeams(currentWorkspace.id.toString())
      .then(teams => {
        setTeamProjects(teams);
      })
      .catch(error => {
        console.error("팀 목록을 불러오는데 실패했습니다:", error);
        setTeamProjects([]);
      });
  };

  const handleTeamCreated = (newTeam: Team) => {
    setTeamProjects(prev => [...prev, newTeam]);
    if (currentWorkspace) {
      navigate(`/ws/${currentWorkspace.id}/team/${newTeam.id}`);
    }
  };

    const isFeatureActive = (path: string) => location.pathname.includes(path);

    // TODO: Chat & Video 컨텍스트 구현 후 아래 임시 데이터 제거 필요
    const chatRooms: any[] = [];
    const videoRooms: any[] = [];
    const getChatRoomName = (room: any) => room.name || 'Chat Room';


  return (
        <>
        <div className="bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 w-64 p-4 fixed top-16 left-16 h-[calc(100vh-4rem)] z-30 flex flex-col">            
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {currentWorkspace?.iconUrl ? (
                            <img 
                                src={currentWorkspace.iconUrl} 
                                alt={`${currentWorkspace.name} 아이콘`} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-sm text-neutral-500">📁</span>
                        )}
                    </div>
                    <h2 className="text-lg font-bold truncate">{currentWorkspace?.name}</h2>
                </div>
                <button onClick={() => setIsWorkspaceSettingsModalOpen(true)}>
                    <CogIcon className="h-6 w-6 text-neutral-500 hover:text-neutral-800 dark:hover:text-white" />
                </button>
            </div>
      
            <nav className="flex-grow overflow-y-auto">
                {/* Team Projects */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                        <span>팀 프로젝트</span>
                        <button onClick={() => setIsTeamCreateModalOpen(true)} className="text-neutral-400 hover:text-white">
                            <PlusCircleIcon className="h-5 w-5" />
        </button>
                    </h3>
                    <ul>
                        {teamProjects.map(team => (
                            <li key={team.id}>
                                <Link 
                                    to={`/ws/${workspaceId}/team/${team.id}`} 
                                    className={`flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 ${teamId === team.id.toString() ? 'bg-neutral-200 dark:bg-neutral-600 font-semibold' : ''}`}
                                >
                                    {team.passwordProtected ? <LockClosedIcon className="h-4 w-4 text-neutral-500" /> : <UsersIcon className="h-4 w-4 text-neutral-500" />}
                                    <span className="truncate">{team.name}</span>
                                </Link>
                            </li>
          ))}
                    </ul>
      </div>
      
                {/* Chat Rooms */}
                <div className="mb-6">
                     <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                        <span>채팅</span>
                        <button onClick={() => setIsNewChatModalOpen(true)} className="text-neutral-400 hover:text-white">
                            <PlusCircleIcon className="h-5 w-5" />
                </button>
                    </h3>
                    <ul>
                        {chatRooms.map(room => (
                            <li key={room.id}>
                                <Link 
                                    to={`/ws/${workspaceId}/chat/${room.id}`}
                                    className={`flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 ${isFeatureActive(`/chat/${room.id}`) ? 'bg-neutral-200 dark:bg-neutral-600 font-semibold' : ''}`}
                >
                                    <ChatBubbleIcon className="h-4 w-4 text-neutral-500" />
                                    <span className="truncate">{getChatRoomName(room)}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
      </div>

                {/* Video Rooms */}
                <div>
                     <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                        <span>화상회의</span>
                        <button onClick={() => setIsNewVideoConferenceModalOpen(true)} className="text-neutral-400 hover:text-white">
                            <PlusCircleIcon className="h-5 w-5" />
                        </button>
                    </h3>
                     <ul>
        {videoRooms.map(room => (
                            <li key={room.id}>
                                <Link 
                                    to={`/ws/${workspaceId}/video/${room.id}`}
                                    className={`flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 ${isFeatureActive(`/video/${room.id}`) ? 'bg-neutral-200 dark:bg-neutral-600 font-semibold' : ''}`}
        >
                                    <VideoCameraIcon className="h-4 w-4 text-neutral-500" />
                                    <span className="truncate">{room.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>
        </div>
        
        <TeamCreateModal 
            isOpen={isTeamCreateModalOpen}
            onClose={() => setIsTeamCreateModalOpen(false)}
            onTeamCreated={handleTeamCreated}
        />
        <NewChatModal
            isOpen={isNewChatModalOpen}
            onClose={() => setIsNewChatModalOpen(false)}
        />        <NewVideoConferenceModal
            isOpen={isNewVideoConferenceModalOpen}
            onClose={() => setIsNewVideoConferenceModalOpen(false)}
        />
        <WorkspaceSettingsModal
            isOpen={isWorkspaceSettingsModalOpen}
            onClose={() => setIsWorkspaceSettingsModalOpen(false)}
        />
        </>
    );
}; 