import { VideoChannel, VideoMember } from '../types';
import { apiRequest } from './api';

export const videoApi = {
    getVideoChannels: async (workspaceId: string): Promise<VideoChannel[]> => {
        return apiRequest<VideoChannel[]>(
            `/workspaces/${workspaceId}/video-channels`
        );
    },
    createVideoChannel: async (
        workspaceId: string,
        channelName: string
    ): Promise<string> => {
        return await apiRequest<string>(
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
    ): Promise<string> => {
        return await apiRequest<string>(
            `/workspaces/${workspaceId}/video-channels/${channelId}/join-conference`,
            { method: 'POST' }
        );
    },
};
