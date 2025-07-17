import { VideoChannel, VideoMember } from '../types/video';
import { apiRequest } from '@/lib/apiClient';

export const videoApi = {
    getVideoChannels: async (workspaceId: string): Promise<VideoChannel[]> => {
        return apiRequest<VideoChannel[]>(
            `/workspaces/${workspaceId}/video-channels`
        );
    },
    
    getVideoChannel: async (workspaceId: string, videoChannelId: string): Promise<VideoChannel> => {
        return apiRequest<VideoChannel>(
            `/workspaces/${workspaceId}/video-channels/${videoChannelId}`
        );
    },
    
    createVideoChannel: async (
        workspaceId: string,
        channelName: string
    ): Promise<{id: string, name: string}> => {
        return await apiRequest<{id: string, name: string}>(
            `/workspaces/${workspaceId}/video-channels`,
            {
                method: 'POST',
                body: JSON.stringify({ name: channelName }),
            }
        );
    },
    
    joinVideoChannel: async (
        workspaceId: string,
        channelId: string
    ): Promise<string> => {
        return await apiRequest<string>(
            `/workspaces/${workspaceId}/video-channels/${channelId}`,
            { method: 'POST' }
        );
    },
    
    deleteVideoChannel: async (
        workspaceId: string,
        channelId: string
    ): Promise<string> => {
        return await apiRequest<string>(
            `/workspaces/${workspaceId}/video-channels/${channelId}`,
            { method: 'DELETE' }
        );
    },
    
    getChannelParticipants: async (
        workspaceId: string,
        channelId: string
    ): Promise<VideoMember[]> => {
        return await apiRequest<VideoMember[]>(
            `/workspaces/${workspaceId}/video-channels/${channelId}/video-members`
        );
    },
    
    leaveVideoChannel: async (
        workspaceId: string,
        channelId: string,
        memberId: string
    ): Promise<string> => {
        return await apiRequest<string>(
            `/workspaces/${workspaceId}/video-channels/${channelId}/video-members/${memberId}`,
            { method: 'DELETE' }
        );
    },
    
    leaveChannel: async (
        workspaceId: string,
        channelId: string,
        memberId: string
    ): Promise<string> => {
        return await apiRequest<string>(
            `/workspaces/${workspaceId}/video-channels/${channelId}/video-members/${memberId}`,
            { method: 'DELETE' }
        );
    },
    
    joinConference: async (
        workspaceId: string,
        channelId: string
    ): Promise<{token: string}> => {
        return await apiRequest<{token: string}>(
            `/workspaces/${workspaceId}/video-channels/${channelId}/join-conference`,
            { method: 'POST' }
        );
    }
};
