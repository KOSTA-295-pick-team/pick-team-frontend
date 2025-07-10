import { ChatMessage, ChatRoomMember } from '../types';
import { store } from '../store';
import { addMessage, deleteMessage } from '../store/slices/chatSlice';

type MessageCallback = (message: ChatMessage) => void;
type MessageDeletedCallback = (messageId: string) => void;
type MemberJoinedCallback = (data: { chatRoomId: string, member: ChatRoomMember }) => void;
type MemberLeftCallback = (data: { chatRoomId: string, memberId: string }) => void;

class ChatEventService {
    private eventSource: EventSource | null = null;
    private messageCallbacks: MessageCallback[] = [];
    private messageDeletedCallbacks: MessageDeletedCallback[] = [];
    private memberJoinedCallbacks: MemberJoinedCallback[] = [];
    private memberLeftCallbacks: MemberLeftCallback[] = [];

    connect(userId: string, token?: string) {
        if (this.eventSource) {
            this.eventSource.close();
        }

        // token이 전달되지 않은 경우, localStorage에서 가져옴
        const authToken = token || localStorage.getItem('token');
        if (!authToken) {
            console.error('인증 토큰이 없습니다.');
            return;
        }

        this.eventSource = new EventSource(`/api/sse/subscribe`, {
            withCredentials: true // 쿠키 기반 인증 사용
        });

        this.eventSource.onmessage = (event) => {
            console.log('SSE 일반 메시지 수신:', event.data);
        };

        // 연결 성공 이벤트
        this.eventSource.addEventListener('CONNECTED', (event) => {
            console.log('SSE 연결됨:', event.data);
        });

        // 새로운 채팅 메시지 이벤트
        this.eventSource.addEventListener('NEW_CHAT_MESSAGE', (event) => {
            try {
                const message: ChatMessage = JSON.parse(event.data);
                store.dispatch(addMessage({
                    roomId: message.roomId,
                    message: message,
                }));
                this.messageCallbacks.forEach(callback => callback(message));
            } catch (error) {
                console.error('메시지 처리 중 오류:', error);
            }
        });

        // 메시지 삭제 이벤트 
        this.eventSource.addEventListener('CHAT_MESSAGE_DELETED', (event) => {
            try {
                const { messageId, roomId } = JSON.parse(event.data);
                store.dispatch(deleteMessage({ roomId, messageId }));
                this.messageDeletedCallbacks.forEach(callback => callback(messageId));
            } catch (error) {
                console.error('메시지 삭제 처리 중 오류:', error);
            }
        });

        // 멤버 입장 이벤트
        this.eventSource.addEventListener('CHAT_MEMBER_JOINED', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.memberJoinedCallbacks.forEach(callback => callback(data));
            } catch (error) {
                console.error('멤버 입장 처리 중 오류:', error);
            }
        });

        // 멤버 퇴장 이벤트
        this.eventSource.addEventListener('CHAT_MEMBER_LEFT', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.memberLeftCallbacks.forEach(callback => callback(data));
            } catch (error) {
                console.error('멤버 퇴장 처리 중 오류:', error);
            }
        });

        this.eventSource.onerror = (error) => {
            console.error('SSE 에러:', error);
            this.reconnect(userId, authToken);
        };
    }

    private reconnect(userId: string, token: string) {
        setTimeout(() => {
            console.log('SSE 연결 재시도...');
            this.connect(userId, token);
        }, 5000);
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.clearCallbacks();
    }

    // 채팅방 구독 (페이지 진입 시 호출)
    subscribeToRoom(roomId: string) {
        console.log(`채팅방 ${roomId} 구독 시작`);
        // SSE는 서버 측에서 userId 기반으로 처리되므로
        // 클라이언트에서 추가 구독 작업 불필요
    }

    // 채팅방 구독 취소 (페이지 이탈 시 호출)
    unsubscribeFromRoom(roomId: string) {
        console.log(`채팅방 ${roomId} 구독 취소`);
        // SSE는 서버 측에서 userId 기반으로 처리되므로
        // 클라이언트에서 추가 구독 취소 작업 불필요
    }

    // 이벤트 핸들러 등록 메서드들
    onNewMessage(callback: MessageCallback) {
        this.messageCallbacks.push(callback);
    }

    onMessageDeleted(callback: MessageDeletedCallback) {
        this.messageDeletedCallbacks.push(callback);
    }

    onMemberJoined(callback: MemberJoinedCallback) {
        this.memberJoinedCallbacks.push(callback);
    }

    onMemberLeft(callback: MemberLeftCallback) {
        this.memberLeftCallbacks.push(callback);
    }

    // 모든 콜백 제거 (cleanup 시 사용)
    private clearCallbacks() {
        this.messageCallbacks = [];
        this.messageDeletedCallbacks = [];
        this.memberJoinedCallbacks = [];
        this.memberLeftCallbacks = [];
    }
}

// 싱글톤 인스턴스 생성 및 export
export const chatEvents = new ChatEventService();
