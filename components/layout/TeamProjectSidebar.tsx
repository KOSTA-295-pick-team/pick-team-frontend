import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { TeamProject } from '../../types';
import { PlusCircleIcon, VideoCameraIcon, ComponentTrashIcon } from '../icons';
import { Modal, Button } from '../ui';
import { HashtagIcon, UserGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { teamApi } from '../../services/api';
import TeamActionModal from '../modals/TeamActionModal';

// TODO: 모달들을 분리한 후 import 추가 예정
// import { NewChatModal } from '../modals/NewChatModal';
// import { NewVideoConferenceModal } from '../modals/NewVideoConferenceModal';
// import { WorkspaceSettingsModal } from '../modals/WorkspaceSettingsModal';

export const TeamProjectSidebar: React.FC = () => {
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

  // 팀 목록 상태 관리
  const [teams, setTeams] = useState<TeamProject[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  // 워크스페이스의 팀 목록 로드
  const loadTeams = async () => {
    if (!currentWorkspace) return;
    
    setIsLoadingTeams(true);
    setTeamsError(null);
    
    try {
      const teamList = await teamApi.getTeamsByWorkspace(currentWorkspace.id);
      setTeams(teamList);
    } catch (error: any) {
      console.error('사이드바 팀 목록 로드 실패:', error);
      setTeamsError(error.message || '팀 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingTeams(false);
    }
  };

  // 워크스페이스가 변경될 때마다 팀 목록 로드
  useEffect(() => {
    if (currentWorkspace) {
      loadTeams();
    }
  }, [currentWorkspace]);

  if (!currentWorkspace || !currentUser) return null;

  // 실제 API에서 가져온 팀 목록 사용
  const teamsForCurrentWorkspace = teams;
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

  const renderTeamList = () => {
    if (isLoadingTeams) {
      return <div className="px-3 py-2 text-xs text-neutral-500">팀 목록 로딩 중...</div>;
    }
    
    if (teamsError) {
      return <div className="px-3 py-2 text-xs text-red-500">팀 로드 실패</div>;
    }
    
    if (teamsForCurrentWorkspace.length === 0) {
      return <div className="px-3 py-2 text-xs text-neutral-500">팀이 없습니다</div>;
    }
    
    return teamsForCurrentWorkspace.map(tp => (
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
    ));
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
        {renderTeamList()}
        <button 
          className="w-full mt-1 text-sm text-primary hover:underline py-2 border border-primary-light rounded-md hover:bg-primary-light/10"
          onClick={() => setIsTeamActionModalOpen(true)}
        >
          팀 생성 또는 참여하기
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
           {(directMessages.length === 0 && groupChats.length === 0) && (
             <p className="text-xs text-neutral-500 px-3 py-2">채팅방이 없습니다. '새로운 채팅' 버튼으로 시작해보세요.</p>
           )}
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

      {/* TODO: 모달들을 분리한 후 활성화 예정 */}
      {/* <NewChatModal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} /> */}
      {/* <NewVideoConferenceModal isOpen={isNewVideoConferenceModalOpen} onClose={() => setIsNewVideoConferenceModalOpen(false)} /> */}
      <TeamActionModal isOpen={isTeamActionModalOpen} onClose={() => setIsTeamActionModalOpen(false)} />
      {/* <WorkspaceSettingsModal isOpen={isWorkspaceSettingsModalOpen} onClose={() => setIsWorkspaceSettingsModalOpen(false)} /> */}

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