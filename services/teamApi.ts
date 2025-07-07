import { TeamProject, User } from '../types';
import { apiRequest, ApiError } from './api';

// 팀 응답 데이터 변환 헬퍼 함수
const transformTeamResponse = (team: { 
  id: number; 
  workspaceId: number; 
  name: string; 
  members?: any[]; 
  memberCount?: number; 
}): TeamProject => {
  return {
    id: team.id.toString(),
    workspaceId: team.workspaceId.toString(),
    name: team.name,
    members: team.members ? team.members.map((member: any) => ({
      id: member.accountId.toString(), // accountId를 사용
      email: member.email,
      name: member.name,
      profileImage: member.profileImage,
      profilePictureUrl: member.profileImage || `https://picsum.photos/seed/${member.email}/100/100`,
      tags: [], // TeamMemberResponse에는 tags가 없으므로 빈 배열
      age: member.age,
      mbti: member.mbti,
      disposition: member.disposition,
      introduction: member.introduction,
      portfolio: member.portfolio,
      preferWorkstyle: member.preferWorkstyle,
      dislikeWorkstyle: member.dislikeWorkstyle,
      likes: member.likes,
      dislikes: member.dislikes,
      bio: member.introduction,
      portfolioLink: member.portfolio,
      preferredStyle: member.preferWorkstyle,
      avoidedStyle: member.dislikeWorkstyle,
    })) : [],
    memberCount: team.memberCount || 0,
    announcements: [],
    passwordProtected: false,
    progress: 0,
  };
};

// 팀 멤버 응답 데이터 변환 헬퍼 함수
const transformTeamMemberResponse = (member: {
  id: number;
  email: string;
  name: string;
  age?: number;
  mbti?: string;
  disposition?: string;
  introduction?: string;
  portfolio?: string;
  preferWorkstyle?: string;
  dislikeWorkstyle?: string;
  likes?: string;
  dislikes?: string;
  profileImage?: string;
  tags?: string[];
}): User => {
  return {
    id: member.id.toString(),
    email: member.email,
    name: member.name,
    age: member.age,
    mbti: member.mbti,
    disposition: member.disposition,
    introduction: member.introduction,
    portfolio: member.portfolio,
    preferWorkstyle: member.preferWorkstyle,
    dislikeWorkstyle: member.dislikeWorkstyle,
    likes: member.likes,
    dislikes: member.dislikes,
    profileImage: member.profileImage,
    tags: member.tags || [],
    bio: member.introduction,
    portfolioLink: member.portfolio,
    preferredStyle: member.preferWorkstyle,
    avoidedStyle: member.dislikeWorkstyle,
    profilePictureUrl: member.profileImage || `https://picsum.photos/seed/${member.email}/100/100`,
  };
};

export const teamApi = {
  // 워크스페이스의 팀 목록 조회
  getTeamsByWorkspace: async (workspaceId: string): Promise<TeamProject[]> => {
    const response = await apiRequest<{success: boolean; message: string; data: any[]}>(`/teams/workspace/${workspaceId}`);
    
    if (response.success && response.data) {
      return response.data.map(team => transformTeamResponse(team));
    }
    
    throw new ApiError(400, response.message || '팀 목록 조회에 실패했습니다.');
  },

  // 팀 상세 조회
  getTeam: async (teamId: string): Promise<TeamProject> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>(`/teams/${teamId}`);
    
    if (response.success && response.data) {
      return transformTeamResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '팀 조회에 실패했습니다.');
  },

  // 팀 생성
  createTeam: async (data: { name: string; workspaceId: string }): Promise<TeamProject> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      return transformTeamResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '팀 생성에 실패했습니다.');
  },

  // 팀 수정
  updateTeam: async (teamId: string, data: { name?: string }): Promise<TeamProject> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      return transformTeamResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '팀 수정에 실패했습니다.');
  },

  // 팀 삭제
  deleteTeam: async (teamId: string): Promise<void> => {
    const response = await apiRequest<{success: boolean; message: string; data: null}>(`/teams/${teamId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new ApiError(400, response.message || '팀 삭제에 실패했습니다.');
    }
  },

  // 팀 참여
  joinTeam: async (teamId: string): Promise<void> => {
    const response = await apiRequest<{success: boolean; message: string; data: null}>(`/teams/${teamId}/join`, {
      method: 'POST',
    });
    
    if (!response.success) {
      throw new ApiError(400, response.message || '팀 참여에 실패했습니다.');
    }
  },

  // 팀 탈퇴
  leaveTeam: async (teamId: string): Promise<void> => {
    const response = await apiRequest<{success: boolean; message: string; data: null}>(`/teams/${teamId}/leave`, {
      method: 'POST',
    });
    
    if (!response.success) {
      throw new ApiError(400, response.message || '팀 탈퇴에 실패했습니다.');
    }
  },

  // 팀 멤버 목록 조회
  getTeamMembers: async (teamId: string): Promise<User[]> => {
    const response = await apiRequest<{success: boolean; message: string; data: any[]}>(`/teams/${teamId}/members`);
    
    if (response.success && response.data) {
      return response.data.map(member => transformTeamMemberResponse(member));
    }
    
    throw new ApiError(400, response.message || '팀 멤버 조회에 실패했습니다.');
  },
}; 