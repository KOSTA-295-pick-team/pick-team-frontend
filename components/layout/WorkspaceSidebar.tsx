import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { Workspace } from '../../types';
import { PlusCircleIcon } from '../icons';
import { LinkIcon } from '@heroicons/react/24/outline';

// TODO: 모달들을 분리한 후 import 추가 예정
// import { CreateWorkspaceModal } from '../modals/CreateWorkspaceModal';
// import { JoinWorkspaceModal } from '../modals/JoinWorkspaceModal';

export const WorkspaceSidebar: React.FC = () => {
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
    {/* TODO: 모달들을 분리한 후 활성화 예정 */}
    {/* <CreateWorkspaceModal isOpen={isCreateWorkspaceModalOpen} onClose={() => setIsCreateWorkspaceModalOpen(false)} /> */}
    {/* <JoinWorkspaceModal isOpen={isJoinWorkspaceModalOpen} onClose={() => setIsJoinWorkspaceModalOpen(false)} /> */}
    </>
  );
}; 