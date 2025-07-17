import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { chatApi, ChatRoomResponse } from '@/features/workspace/chat/api/chatApi';
import { videoApi } from '@/features/workspace/video/api/videoApi';
import { VideoChannel } from '@/features/workspace/video/types/video';
import { Team } from '@/types';
import { chatLogger } from '@/features/workspace/chat/utils/chatLogger';
import { 
    CogIcon,
    PlusCircleIcon, 
    VideoCameraIcon,
    LockClosedIcon,
    UserIcon,
    ChatBubbleBottomCenterTextIcon,
    UsersIcon,
    TrashIcon
} from '@/assets/icons';
import TeamCreateModal from '@/features/teamspace/team/components/TeamCreateModal';
import { NewChatModal } from '@/features/workspace/chat/components/NewChatModal';
import WorkspaceSettingsModal from '@/features/workspace/management/components/WorkspaceSettingsModal';
import NewVideoConferenceModal from '@/features/workspace/video/components/NewVideoConferenceModal';

export const TeamProjectSidebar: React.FC = () => {
    const { currentWorkspace, teams, addTeam } = useWorkspace();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { workspaceId, teamId } = useParams<{ workspaceId: string; teamId: string; }>();
    const location = useLocation();
    
    const [chatRooms, setChatRooms] = useState<ChatRoomResponse[]>([]);
    const [chatRoomMembers, setChatRoomMembers] = useState<{[roomId: number]: any[]}>({});
    const [videoChannels, setVideoChannels] = useState<VideoChannel[]>([]);
    const [isTeamCreateModalOpen, setIsTeamCreateModalOpen] = useState(false);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [isNewVideoConferenceModalOpen, setIsNewVideoConferenceModalOpen] = useState(false);
    const [isWorkspaceSettingsModalOpen, setIsWorkspaceSettingsModalOpen] = useState(false);

    // 팀 목록은 더 이상 로컬에서 로드하지 않음 - 워크스페이스 컨텍스트에서 자동으로 관리
    // useEffect(() => {
    //     if (currentWorkspace) {
    //         teamApi.getTeams(currentWorkspace.id.toString())
    //             .then(teams => {
    //                 setTeamProjects(teams);
    //             })
    //             .catch(error => {
    //                 chatLogger.ui.error("팀 목록을 불러오는데 실패했습니다:", error);
    //                 setTeamProjects([]);
    //             });
    //     }
    // }, [currentWorkspace]);

    // 화상회의 목록 로드
    useEffect(() => {
        const loadVideoChannels = async () => {
            if (!currentWorkspace) return;
            
            try {
                const channels = await videoApi.getVideoChannels(currentWorkspace.id.toString());
                setVideoChannels(channels);
            } catch (error) {
                chatLogger.ui.error("화상회의 목록을 불러오는데 실패했습니다:", error);
                setVideoChannels([]);
            }
        };
        
        loadVideoChannels();
        
        // 5초마다 화상회의 목록을 새로고침
        const interval = setInterval(loadVideoChannels, 5000);
        
        return () => clearInterval(interval);
    }, [currentWorkspace]);

    // 채팅방 목록 로드
    useEffect(() => {
        const loadChatRooms = async () => {
            if (!currentWorkspace || !currentUser) return;
            
            try {
                const response = await chatApi.getChatRooms(Number(currentWorkspace.id));
                chatLogger.ui.debug('채팅방 목록 응답:', response);
                chatLogger.ui.debug('채팅방 목록 상세:', response.content?.map(room => ({
                    id: room.id,
                    name: room.name,
                    type: room.type,
                    memberCount: room.memberCount
                })));
                
                const rooms = response.content || [];
                
                // DM 채팅방들의 멤버 정보를 먼저 모두 가져오기
                const dmRooms = rooms.filter(room => room.type === 'PERSONAL');
                const membersData: {[roomId: number]: any[]} = {};
                
                // 병렬로 모든 DM 채팅방의 멤버 정보 가져오기
                await Promise.all(
                    dmRooms.map(async (room) => {
                        try {
                            const members = await chatApi.getChatMembers(room.id);
                            membersData[room.id] = members;
                            chatLogger.ui.debug(`DM 채팅방 ${room.id} 멤버:`, members);
                        } catch (error) {
                            chatLogger.ui.error(`DM 채팅방 ${room.id}의 멤버 정보를 가져오는데 실패:`, error);
                            membersData[room.id] = [];
                        }
                    })
                );
                
                // 멤버 정보를 먼저 설정하고 나서 채팅방 목록 설정
                setChatRoomMembers(membersData);
                setChatRooms(rooms);
                
            } catch (error) {
                chatLogger.ui.error("채팅방 목록을 불러오는데 실패했습니다:", error);
                setChatRooms([]);
                setChatRoomMembers({});
            }
        };

        loadChatRooms();
    }, [currentWorkspace, currentUser]);

    const handleTeamCreated = (newTeam: Team) => {
        addTeam(newTeam);
        setIsTeamCreateModalOpen(false);
        if (currentWorkspace) {
            navigate(`/ws/${currentWorkspace.id}/team/${newTeam.id}`);
        }
    };

    const handleChatRoomCreated = async (newChatRoom: ChatRoomResponse) => {
        setChatRooms(prev => [...prev, newChatRoom]);
        
        // DM 채팅방인 경우 멤버 정보도 가져오기
        if (newChatRoom.type === 'PERSONAL') {
            try {
                const members = await chatApi.getChatMembers(newChatRoom.id);
                setChatRoomMembers(prev => ({
                    ...prev,
                    [newChatRoom.id]: members
                }));
                chatLogger.ui.debug(`새 DM 채팅방 ${newChatRoom.id} 멤버:`, members);
            } catch (error) {
                chatLogger.ui.error(`새 DM 채팅방 ${newChatRoom.id}의 멤버 정보를 가져오는데 실패:`, error);
            }
        }
    };

    const isFeatureActive = (path: string) => location.pathname.includes(path);

    // 채팅방 이름 표시 함수
    const getChatRoomDisplayName = (room: ChatRoomResponse) => {
        chatLogger.ui.debug('채팅방 이름 계산 시작:', {
            id: room.id,
            name: room.name,
            type: room.type,
            memberCount: room.memberCount
        });
        
        // DM 채팅방인 경우
        if (room.type === 'PERSONAL') {
            chatLogger.ui.debug('DM 채팅방 처리 중...');
            chatLogger.ui.debug('백엔드에서 온 채팅방 이름:', room.name);
            
            // 멤버 정보에서 상대방 이름 찾기 (우선순위 1)
            const members = chatRoomMembers[room.id];
            chatLogger.ui.debug('채팅방 멤버 정보:', {
                roomId: room.id,
                members,
                currentUserId: currentUser?.id
            });
            
            if (members && currentUser) {
                chatLogger.ui.debug('멤버 데이터 구조 상세 분석:', {
                    roomId: room.id,
                    members: members.map(m => ({
                        ...m,
                        memberKeys: Object.keys(m),
                        memberType: typeof m
                    })),
                    currentUserId: currentUser.id,
                    currentUserIdType: typeof currentUser.id
                });
                
                const otherMember = members.find(member => {
                    chatLogger.ui.debug('개별 멤버 검사:', {
                        member,
                        memberAccount: member.account,
                        memberAccountId: member.accountId,
                        memberId: member.id,
                        memberName: member.name,
                        memberAccountName: member.accountName,
                        currentUserId: currentUser.id
                    });
                    
                    // 다양한 필드로 시도
                    return (member.account && member.account !== currentUser.id) ||
                           (member.accountId && member.accountId !== currentUser.id);
                });
                
                chatLogger.ui.debug('상대방 멤버 찾기 결과:', {
                    allMembers: members.map(m => ({ 
                        account: m.account,
                        accountId: m.accountId, 
                        name: m.name,
                        accountName: m.accountName,
                        keys: Object.keys(m)
                    })),
                    currentUserId: currentUser.id,
                    otherMember
                });
                
                if (otherMember) {
                    // 다양한 필드명으로 이름 시도
                    const displayName = 
                        otherMember.name || 
                        otherMember.accountName || 
                        `사용자 ${otherMember.account || otherMember.accountId || otherMember.id}`;
                    chatLogger.ui.debug('DM 채팅방 - 멤버 정보에서 상대방 이름 사용:', displayName);
                    return displayName;
                }
            }
            
            // 백엔드에서 설정된 이름이 있고, 유효한 이름이면 사용 (우선순위 2)
            if (room.name && room.name.trim() !== '' && room.name !== 'DM' && !room.name.includes('대화:')) {
                chatLogger.ui.debug('DM 채팅방 - 백엔드에서 설정된 유효한 이름 사용:', room.name);
                return room.name;
            }
            
            // 멤버 정보가 없는 경우 임시 표시
            chatLogger.ui.debug('DM 채팅방 - 멤버 정보 없음, 임시 표시');
            return `DM ${room.id}`;
        }
        
        // 그룹 채팅방이면 이름이 있으면 사용, 없으면 기본 표시
        if (room.name && room.name.trim() !== '') {
            chatLogger.ui.debug('그룹 채팅방 - 이름 사용:', room.name);
            return room.name;
        }
        chatLogger.ui.debug('그룹 채팅방 - 기본 표시:', `그룹 채팅 ${room.id}`);
        return `그룹 채팅 ${room.id}`;
    };

    // 화상회의 생성 후 목록 새로고침
    const handleVideoConferenceCreated = () => {
        if (currentWorkspace) {
            videoApi.getVideoChannels(currentWorkspace.id.toString())
                .then(channels => {
                    setVideoChannels(channels);
                })
                .catch(error => {
                    chatLogger.ui.error("화상회의 목록 새로고침 실패:", error);
                });
        }
    };

    // 화상회의 방 삭제 핸들러
    const handleDeleteVideoChannel = async (channelId: string, channelName: string) => {
        if (!currentWorkspace) return;
        
        const confirmDelete = window.confirm(`"${channelName}" 화상회의 방을 삭제하시겠습니까?`);
        if (!confirmDelete) return;

        try {
            console.log(`화상회의 방 삭제 시도: ${channelId} - ${channelName}`);
            
            await videoApi.deleteVideoChannel(currentWorkspace.id.toString(), channelId);
            console.log(`화상회의 방 삭제 성공: ${channelId}`);
            
        } catch (error: any) {
            console.error("화상회의 방 삭제 실패:", error);
            chatLogger.ui.error("화상회의 방 삭제 실패:", error);
            
            // 더 구체적인 에러 메시지 표시
            let errorMessage = "화상회의 방 삭제에 실패했습니다.";
            if (error.response?.data?.detail) {
                errorMessage += `\n오류: ${error.response.data.detail}`;
            } else if (error.message) {
                errorMessage += `\n오류: ${error.message}`;
            }
            alert(errorMessage);
        }
        
        // 성공/실패 관계없이 목록 새로고침 (강제)
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
            const updatedChannels = await videoApi.getVideoChannels(currentWorkspace.id.toString());
            setVideoChannels(updatedChannels);
            console.log(`목록 새로고침 완료. 현재 방 수: ${updatedChannels.length}`);
        } catch (refreshError) {
            console.error("목록 새로고침 실패:", refreshError);
            // 새로고침 실패 시 로컬에서 제거
            setVideoChannels(prev => prev.filter(ch => ch.id !== channelId));
        }
    };


  return (
        <>
        <div className="bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 w-64 p-4 fixed top-16 left-16 h-[calc(100vh-4rem)] z-30 flex flex-col">            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">{currentWorkspace?.name}</h2>
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
                        {teams.map(team => (
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
      
                {/* DM 채팅 */}
                <div className="mb-6">
                     <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                        <span>DM</span>
                        <button onClick={() => setIsNewChatModalOpen(true)} className="text-neutral-400 hover:text-white">
                            <PlusCircleIcon className="h-5 w-5" />
                        </button>
                    </h3>
                    <ul>
                        {chatRooms.filter(room => room.type === 'PERSONAL').map(room => (
                            <li key={room.id}>
                                <Link 
                                    to={`/ws/${workspaceId}/chat/${room.id}`}
                                    className={`flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 ${isFeatureActive(`/chat/${room.id}`) ? 'bg-neutral-200 dark:bg-neutral-600 font-semibold' : ''}`}
                                >
                                    <UserIcon className="h-4 w-4 text-neutral-500" />
                                    <span className="truncate">{getChatRoomDisplayName(room)}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 그룹 채팅 */}
                <div className="mb-6">
                     <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                        <span>그룹 채팅</span>
                        <button onClick={() => setIsNewChatModalOpen(true)} className="text-neutral-400 hover:text-white">
                            <PlusCircleIcon className="h-5 w-5" />
                </button>
                    </h3>
                    <ul>
                        {chatRooms.filter(room => room.type === 'GROUP').map(room => (
                            <li key={room.id}>
                                <Link 
                                    to={`/ws/${workspaceId}/chat/${room.id}`}
                                    className={`flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 ${isFeatureActive(`/chat/${room.id}`) ? 'bg-neutral-200 dark:bg-neutral-600 font-semibold' : ''}`}
                >
                                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-neutral-500" />
                                    <span className="truncate">{getChatRoomDisplayName(room)}</span>
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
                        {videoChannels.map(channel => (
                            <li key={channel.id} className="group">
                                <div className="flex items-center justify-between p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                    <Link 
                                        to={`/ws/${workspaceId}/video/live?roomId=${channel.id}&roomName=${encodeURIComponent(channel.name)}`}
                                        className={`flex items-center space-x-2 flex-1 ${isFeatureActive(`/video/live`) ? 'bg-neutral-200 dark:bg-neutral-600 font-semibold' : ''}`}
                                    >
                                        <VideoCameraIcon className="h-4 w-4 text-neutral-500" />
                                        <span className="truncate">{channel.name}</span>
                                    </Link>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleDeleteVideoChannel(channel.id, channel.name);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                                        title="화상회의 방 삭제"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
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
            onChatRoomCreated={handleChatRoomCreated}
        />
        <NewVideoConferenceModal
            isOpen={isNewVideoConferenceModalOpen}
            onClose={() => setIsNewVideoConferenceModalOpen(false)}
            onVideoConferenceCreated={handleVideoConferenceCreated}
        />
        <WorkspaceSettingsModal
            isOpen={isWorkspaceSettingsModalOpen}
            onClose={() => setIsWorkspaceSettingsModalOpen(false)}
        />
        </>
    );
}; 