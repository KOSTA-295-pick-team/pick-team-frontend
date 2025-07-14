import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Workspace, TeamProject } from '@/types';
import { workspaceApi } from '@/features/workspace/management/api/workspaceApi';
import { useAuth } from '@/features/user/auth/context/AuthContext';

export interface WorkspaceContextType {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    currentTeamProject: any | null; // TeamProject -> any
    loadWorkspaces: () => Promise<void>;
    createWorkspace: (data: { name: string; iconUrl?: string; password?: string }) => Promise<Workspace>;
    joinWorkspace: (data: { inviteCode: string; password?: string }) => Promise<Workspace>;
    joinWorkspaceById: (workspaceId: string, password?: string) => Promise<Workspace>;
    setCurrentWorkspaceById: (workspaceId: string | null) => void;
    setCurrentTeamProject: (teamProject: any | null) => void; // TeamProject -> any
    loading: boolean;
    error: string | null;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [currentTeamProject, setCurrentTeamProject] = useState<TeamProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            loadWorkspaces();
        } else {
            setWorkspaces([]);
            setCurrentWorkspace(null);
            setCurrentTeamProject(null);
            setLoading(false);
        }
    }, [isAuthenticated]);

    const loadWorkspaces = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await workspaceApi.getMyWorkspaces();
            setWorkspaces(data);
            if (data.length > 0 && !currentWorkspace) {
                setCurrentWorkspace(data[0]);
            }
        } catch (err: any) {
            setError(err.message || '워크스페이스 목록을 불러오는데 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createWorkspace = async (data: { name: string; iconUrl?: string; password?: string }) => {
        try {
            const newWorkspace = await workspaceApi.create(data);
            setWorkspaces(prev => [...prev, newWorkspace]);
            setCurrentWorkspace(newWorkspace);
            return newWorkspace;
        } catch (err: any) {
            setError(err.message || '워크스페이스 생성에 실패했습니다.');
            console.error(err);
            throw err;
        }
    };

    const joinWorkspace = async (data: { inviteCode: string; password?: string }) => {
        try {
            const joinedWorkspace = await workspaceApi.join(data);
            if (!workspaces.some(ws => ws.id === joinedWorkspace.id)) {
            setWorkspaces(prev => [...prev, joinedWorkspace]);
            }
            setCurrentWorkspace(joinedWorkspace);
            return joinedWorkspace;
        } catch (err: any) {
            setError(err.message || '워크스페이스 참여에 실패했습니다.');
            console.error(err);
            throw err;
        }
    };

    const joinWorkspaceById = async (workspaceId: string, password?: string) => {
        try {
            const joinedWorkspace = await workspaceApi.joinById(workspaceId, password);
            if (!workspaces.some(ws => ws.id === joinedWorkspace.id)) {
                setWorkspaces(prev => [...prev, joinedWorkspace]);
            }
            setCurrentWorkspace(joinedWorkspace);
            return joinedWorkspace;
        } catch (err: any) {
            setError(err.message || 'ID로 워크스페이스 참여에 실패했습니다.');
            console.error(err);
            throw err;
        }
    };

    const setCurrentWorkspaceById = (workspaceId: string | null) => {
        if (!workspaceId) {
            setCurrentWorkspace(null);
            setCurrentTeamProject(null); // 워크스페이스 변경 시 팀도 초기화
            return;
        }
        const workspace = workspaces.find(ws => ws.id === workspaceId);
        if (workspace) {
            setCurrentWorkspace(workspace);
            setCurrentTeamProject(null); // 워크스페이스 변경 시 팀도 초기화
        }
    };

    const value: WorkspaceContextType = {
        workspaces,
        currentWorkspace,
        currentTeamProject,
        loadWorkspaces,
        createWorkspace,
        joinWorkspace,
        joinWorkspaceById,
        setCurrentWorkspaceById,
        setCurrentTeamProject,
        loading,
        error,
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = (): WorkspaceContextType => {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
}; 