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

// 임시 모달 컴포넌트들 - 실제 구현 시 수정 필요
const TeamCreateModal: React.FC<{ isOpen: boolean; onClose: () => void; onTeamCreated: (team: Team) => void }> = ({ isOpen, onClose, onTeamCreated }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
                <h2 className="text-lg font-bold mb-4">팀 생성</h2>
                <p className="mb-4">팀 생성 모달이 구현되지 않았습니다.</p>
                <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded">닫기</button>
            </div>
        </div>
    );
};

const NewChatModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
                <h2 className="text-lg font-bold mb-4">새 채팅방</h2>
                <p className="mb-4">새 채팅방 모달이 구현되지 않았습니다.</p>
                <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded">닫기</button>
            </div>
        </div>
    );
};

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
  const location = useLocation();

    const [teamProjects, setTeamProjects] = useState<Team[]>([]);
    const [isTeamCreateModalOpen, setIsTeamCreateModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewVideoConferenceModalOpen, setIsNewVideoConferenceModalOpen] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      teamApi.getTeams(currentWorkspace.id.toString())
        .then(teams => {
          setTeamProjects(teams);
        })
        .catch(error => {
          console.error("팀 목록을 불러오는데 실패했습니다:", error);
          setTeamProjects([]);
        });
    }
  }, [currentWorkspace]);    const handleTeamCreated = (newTeam: Team) => {
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
                <h2 className="text-lg font-bold">{currentWorkspace?.name}</h2>
                <Link to={`/ws/${workspaceId}/settings`}>
                    <CogIcon className="h-6 w-6 text-neutral-500 hover:text-neutral-800 dark:hover:text-white" />
                </Link>
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
        />
        <NewVideoConferenceModal
            isOpen={isNewVideoConferenceModalOpen}
            onClose={() => setIsNewVideoConferenceModalOpen(false)}
        />
        </>
  );
}; 