export interface VideoChannel {
    id: string;
    name: string;
    createAt: string;
}

export interface VideoMember {
    id: string;
    userId: number;
    email: string;
    name: string;
    mbti: string;
    disposition: string;
    introduction: string;
    preferWorkstyle: string;
    dislikeWorkstyle: string;
    profileImageUrl: string;
    joinDate: string;
}

export interface WebSocketChatMsg {
    type: string;
    senderEmail: string;
    senderName: string;
    message: string;
    logs: WebSocketChatMsg[];
}

export interface VideoConferenceMsg {
    type: string;
    userEmail?: string;
    participants: VideoMember[];
}
