import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi } from '../api/chatApi';
import { sseService } from '../services/sseService';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { chatLogger } from '../utils/chatLogger';

// 타입 정의
export interface ChatMessage {
  id: number;
  roomId: number;
  userId: number;
  userName: string;
  text: string;
  timestamp: Date;
  createdAt: string;
  senderName: string;
  senderProfilePictureUrl?: string;
  attachment?: {
    type: string;
    url: string;
    fileName: string;
  };
}

export interface ChatRoom {
  id: number;
  workspaceId: number;
  name?: string;
  type: 'PERSONAL' | 'GROUP';
  members: any[];
  createdAt: Date;
  memberCount: number;
}

interface ChatState {
  chatRooms: ChatRoom[];
  currentChatRoom: ChatRoom | null;
  messages: { [chatRoomId: number]: ChatMessage[] };
  loading: boolean;
  error: string | null;
  connected: boolean;
}

type ChatAction =
  | { type: 'SET_CHAT_ROOMS'; payload: ChatRoom[] }
  | { type: 'SET_CURRENT_CHAT_ROOM'; payload: ChatRoom | null }
  | { type: 'SET_MESSAGES'; payload: { chatRoomId: number; messages: ChatMessage[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatRoomId: number; message: ChatMessage } }
  | { type: 'DELETE_MESSAGE'; payload: { chatRoomId: number; messageId: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'ADD_CHAT_ROOM'; payload: ChatRoom };

interface ChatContextType {
  state: ChatState;
  loadChatRooms: () => Promise<void>;
  setCurrentChatRoom: (chatRoom: ChatRoom | null) => void;
  setCurrentChatRoomById: (roomId: number) => Promise<void>;
  loadMessages: (chatRoomId: number) => Promise<void>;
  sendMessage: (chatRoomId: number, content: string) => Promise<void>;
  deleteMessage: (chatRoomId: number, messageId: number) => Promise<void>;
  createChatRoom: (name: string, memberIds: number[], type: 'PERSONAL' | 'GROUP') => Promise<ChatRoom>;
  createDmChatRoom: (targetUserId: number) => Promise<ChatRoom>;
}

const initialState: ChatState = {
  chatRooms: [],
  currentChatRoom: null,
  messages: {},
  loading: false,
  error: null,
  connected: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHAT_ROOMS':
      return { ...state, chatRooms: action.payload };
    case 'SET_CURRENT_CHAT_ROOM':
      return { ...state, currentChatRoom: action.payload };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatRoomId]: action.payload.messages,
        },
      };
    case 'ADD_MESSAGE':
      const existingMessages = state.messages[action.payload.chatRoomId] || [];
      const newMessage = action.payload.message;
      
      // 임시 메시지 처리: 음수 ID는 임시 메시지, 양수 ID는 실제 메시지
      const isTemporaryMessage = newMessage.id < 0;
      const isRealMessage = newMessage.id > 0;
      
      // 실제 메시지가 오면 임시 메시지들을 제거
      if (isRealMessage) {
        // 같은 내용의 임시 메시지가 있는지 확인 (최근 10초 이내)
        const recentTempMessages = existingMessages.filter(msg => 
          msg.id < 0 && 
          msg.text === newMessage.text &&
          msg.userId === newMessage.userId &&
          (Date.now() - msg.timestamp.getTime()) < 10000 // 10초 이내
        );
        
        if (recentTempMessages.length > 0) {
          chatLogger.context.debug('실제 메시지 수신으로 임시 메시지 제거', recentTempMessages.map(m => m.id));
          // 임시 메시지들 제거
          const withoutTempMessages = existingMessages.filter(msg => 
            !recentTempMessages.some(temp => temp.id === msg.id)
          );
          existingMessages.splice(0, existingMessages.length, ...withoutTempMessages);
        }
      }
      
      // 빠른 중복 검사 (ID 기반) - 실제 메시지만 체크
      if (isRealMessage) {
        const messageExists = existingMessages.some(msg => msg.id === newMessage.id);
        
        if (messageExists) {
          chatLogger.context.debug('중복 메시지 무시', { messageId: newMessage.id, chatRoomId: action.payload.chatRoomId });
          return state;
        }
      }
      
      chatLogger.context.debug('새 메시지 추가', { 
        messageId: newMessage.id, 
        chatRoomId: action.payload.chatRoomId, 
        isTemporary: isTemporaryMessage 
      });
      
      // 성능 최적화: 새 메시지가 최신인 경우 끝에 바로 추가
      const lastMessage = existingMessages[existingMessages.length - 1];
      let updatedMessages: ChatMessage[];
      
      if (!lastMessage || newMessage.timestamp.getTime() >= lastMessage.timestamp.getTime()) {
        // 새 메시지가 가장 최신인 경우 - 단순 추가
        updatedMessages = [...existingMessages, newMessage];
        console.log('⚡ 최신 메시지로 빠른 추가');
      } else {
        // 시간순 정렬이 필요한 경우 - 이진 검색으로 위치 찾기
        updatedMessages = [...existingMessages];
        let insertIndex = updatedMessages.length;
        
        // 뒤에서부터 검색 (최근 메시지일 가능성이 높음)
        for (let i = updatedMessages.length - 1; i >= 0; i--) {
          if (updatedMessages[i].timestamp.getTime() <= newMessage.timestamp.getTime()) {
            insertIndex = i + 1;
            break;
          }
          insertIndex = i;
        }
        
        updatedMessages.splice(insertIndex, 0, newMessage);
        console.log('🔀 시간순 정렬로 메시지 삽입, 위치:', insertIndex);
      }
      
      // 메모리 관리: 메시지가 너무 많으면 오래된 메시지 제거 (임시 메시지 제외)
      const maxMessages = 1000;
      if (updatedMessages.length > maxMessages) {
        // 임시 메시지는 보존하고 오래된 실제 메시지만 제거
        const realMessages = updatedMessages.filter(msg => msg.id > 0);
        const tempMessages = updatedMessages.filter(msg => msg.id < 0);
        
        if (realMessages.length > maxMessages - tempMessages.length) {
          const trimmedRealMessages = realMessages.slice(-(maxMessages - tempMessages.length));
          updatedMessages = [...trimmedRealMessages, ...tempMessages]
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          console.log(`📝 메시지 수 제한으로 오래된 메시지 제거, 현재: ${updatedMessages.length}`);
        }
      }
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatRoomId]: updatedMessages,
        },
      };
    case 'DELETE_MESSAGE':
      const chatRoomMessages = state.messages[action.payload.chatRoomId] || [];
      const filteredMessages = chatRoomMessages.filter(msg => msg.id !== action.payload.messageId);
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatRoomId]: filteredMessages,
        },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'ADD_CHAT_ROOM':
      return { ...state, chatRooms: [...state.chatRooms, action.payload] };
    default:
      return state;
  }
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { currentUser } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // SSE 연결 및 이벤트 처리
  useEffect(() => {
    console.log('🔄 ChatProvider useEffect 실행 - currentUser:', currentUser?.id, 'currentWorkspace:', currentWorkspace?.id);
    
    if (!currentUser) {
      console.log('❌ currentUser 없음, SSE 연결 건너뜀');
      return;
    }

    if (!currentWorkspace) {
      console.log('❌ currentWorkspace 없음, SSE 연결 건너뜀');
      return;
    }

    let isConnected = false;
    let isConnecting = false;
    let connectionRetryCount = 0;
    const maxRetries = 5; // 재시도 횟수 증가
    let connectionStabilityTimer: NodeJS.Timeout | null = null;
    let fallbackSyncTimer: NodeJS.Timeout | null = null; // 504 에러 대응용 주기적 동기화

    // 504 에러 환경을 위한 주기적 메시지 동기화
    const startFallbackSync = () => {
      if (fallbackSyncTimer) {
        clearInterval(fallbackSyncTimer);
      }
      
      fallbackSyncTimer = setInterval(async () => {
        // SSE 연결이 불안정하거나 끊어진 경우에만 동작
        if (!sseService.isEventSourceConnected()) {
          console.log('🔄 [FallbackSync] SSE 연결 불안정, 주기적 메시지 동기화 실행');
          
          // 현재 활성화된 채팅방이 있으면 메시지 동기화
          if (state.currentChatRoom) {
            try {
              const latestMessages = await chatApi.getChatMessages(parseInt(currentWorkspace.id), state.currentChatRoom.id, 0, 30);
              const currentMessages = state.messages[state.currentChatRoom.id] || [];
              const latestRealMessages = latestMessages.messages || [];
              
              const newMessages = latestRealMessages.filter(apiMsg => 
                !currentMessages.some(localMsg => localMsg.id === apiMsg.id && localMsg.id > 0)
              );
              
              if (newMessages.length > 0) {
                console.log(`🔄 [FallbackSync] ${newMessages.length}개의 누락된 메시지 동기화`);
                
                newMessages.forEach(apiMsg => {
                  let correctedSenderName = apiMsg.senderName;
                  if ((!apiMsg.senderName || apiMsg.senderName === '알 수 없는 사용자') && currentWorkspace?.members) {
                    const member = currentWorkspace.members.find(m => m.id === apiMsg.senderId);
                    if (member?.name) {
                      correctedSenderName = member.name;
                    }
                  }
                  
                  const syncMessage: ChatMessage = {
                    id: apiMsg.id,
                    roomId: apiMsg.chatRoomId,
                    userId: apiMsg.senderId,
                    userName: correctedSenderName,
                    text: apiMsg.content,
                    timestamp: apiMsg.sentAt ? new Date(apiMsg.sentAt) : 
                              apiMsg.createdAt ? new Date(apiMsg.createdAt) : new Date(),
                    createdAt: apiMsg.sentAt || apiMsg.createdAt || new Date().toISOString(),
                    senderName: correctedSenderName,
                    senderProfilePictureUrl: apiMsg.senderProfileImageUrl,
                  };
                  
                  dispatch({ 
                    type: 'ADD_MESSAGE', 
                    payload: { chatRoomId: state.currentChatRoom!.id, message: syncMessage }
                  });
                });
              }
            } catch (syncError) {
              console.error('❌ [FallbackSync] 주기적 동기화 실패:', syncError);
            }
          }
        }
      }, 12000); // 12초마다 동기화 체크 (백엔드 타임아웃 대응)
    };    const connectSse = async () => {
      if (isConnecting) {
        console.log('⚠️ 이미 SSE 연결 중입니다.');
        return;
      }
      
      if (connectionRetryCount >= maxRetries) {
        console.error('🚫 SSE 연결 최대 재시도 횟수 초과');
        return;
      }
      
      isConnecting = true;
      connectionRetryCount++;
      
      try {
        console.log(`🔌 SSE 연결 시작... (재시도: ${connectionRetryCount}/${maxRetries}, 사용자: ${currentUser.id})`);
        
        // 기존 연결 확인 및 정리
        if (sseService.isEventSourceConnected()) {
          console.log('⚠️ 기존 SSE 연결이 활성 상태입니다. 연결을 종료합니다.');
          sseService.disconnect();
          // 잠시 대기 후 새 연결 시도
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // SSE 등록 및 연결 - 순차적으로 처리
        console.log('🔐 SSE 등록 시작...');
        await sseService.register();
        console.log('✅ SSE 등록 완료');
        
        // 등록 후 추가 대기 (Redis 반영 시간 확보)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('🔌 SSE 연결 시작...');
        await sseService.connect();
        console.log('✅ SSE 연결 완료');
        
        isConnected = true;
        isConnecting = false;
        connectionRetryCount = 0; // 성공시 재시도 카운트 리셋
        
        console.log('✅ SSE 연결 성공 - 이벤트 리스너 등록');
        dispatch({ type: 'SET_CONNECTED', payload: true });

        // 연결 안정성 모니터링 타이머 설정
        connectionStabilityTimer = setInterval(() => {
          if (!sseService.isEventSourceConnected()) {
            console.log('⚠️ 연결 안정성 체크에서 문제 감지, 재연결 시도');
            if (connectionStabilityTimer) {
              clearInterval(connectionStabilityTimer);
              connectionStabilityTimer = null;
            }
            connectSse();
          }
        }, 10000); // 10초마다 연결 상태 체크

        // 504 에러 대응: 주기적 폴백 동기화 시작
        startFallbackSync();

        // 새 메시지 이벤트 리스너 (성능 최적화)
        sseService.addEventListener('NEW_CHAT_MESSAGE', (data) => {
          try {
            const timestamp = Date.now();
            console.log(`🔔 [${new Date(timestamp).toISOString()}] 새 메시지 SSE 수신:`, data);
            
            // 데이터 유효성 검사 (빠른 실패)
            if (!data?.messageId || !data?.chatRoomId || !data?.content) {
              console.error('❌ 유효하지 않은 SSE 메시지 데이터:', data);
              return;
            }
            
            // 현재 사용자가 보낸 메시지인지 확인
            const isOwnMessage = data.senderId === parseInt(currentUser.id.toString());
            
            // 자신이 보낸 메시지의 경우 임시 메시지가 이미 있을 수 있으므로 신중하게 처리
            if (isOwnMessage) {
              console.log('🔄 자신이 보낸 메시지 SSE 수신, 임시 메시지 확인 중...');
              const currentMessages = state.messages[data.chatRoomId] || [];
              
              // 같은 내용의 임시 메시지가 최근에 있는지 확인 (최근 30초 이내)
              const recentTempMessage = currentMessages.find(msg => 
                msg.id < 0 && 
                msg.text === data.content &&
                msg.userId === data.senderId &&
                (timestamp - msg.timestamp.getTime()) < 30000 // 30초 이내
              );
              
              if (recentTempMessage) {
                console.log('🔄 임시 메시지를 실제 메시지로 교체:', {
                  tempId: recentTempMessage.id,
                  realId: data.messageId
                });
              }
            }
            
            // 워크스페이스 멤버 정보에서 발신자 이름 찾기 (캐시된 데이터 사용)
            let correctedSenderName = data.senderName || '알 수 없는 사용자';
            if ((!data.senderName || data.senderName === '알 수 없는 사용자') && currentWorkspace?.members) {
              const member = currentWorkspace.members.find(m => m.id === data.senderId);
              if (member?.name) {
                correctedSenderName = member.name;
              }
            }
            
            // 타임스탬프 처리 (성능 최적화)
            const messageTimestamp = data.sentAt ? new Date(data.sentAt) :
                                    data.createdAt ? new Date(data.createdAt) : 
                                    new Date(timestamp);
            
            const newMessage: ChatMessage = {
              id: data.messageId,
              roomId: data.chatRoomId,
              userId: data.senderId,
              userName: correctedSenderName,
              text: data.content,
              timestamp: messageTimestamp,
              createdAt: data.sentAt || data.createdAt || new Date(timestamp).toISOString(),
              senderName: correctedSenderName,
              senderProfilePictureUrl: undefined,
            };

            // 비동기로 디스패치하여 UI 블로킹 방지
            requestAnimationFrame(() => {
              dispatch({ 
                type: 'ADD_MESSAGE', 
                payload: { chatRoomId: data.chatRoomId, message: newMessage }
              });
            });
            
          } catch (error) {
            console.error('❌ 새 메시지 SSE 처리 중 오류:', error);
            // 에러가 발생해도 SSE 연결을 유지
          }
        });

        // 메시지 삭제 이벤트 리스너
        sseService.addEventListener('CHAT_MESSAGE_DELETED', (data) => {
          console.log('🗑️ 메시지 삭제 이벤트 수신:', data);
          
          try {
            // data 구조는 백엔드에서 정의된 형태에 따라 달라질 수 있습니다
            // 예상 구조: { chatRoomId: number, messageId: number }
            const { chatRoomId, messageId } = data;
            
            if (chatRoomId && messageId) {
              dispatch({ 
                type: 'DELETE_MESSAGE', 
                payload: { chatRoomId, messageId }
              });
              console.log('✅ 메시지 삭제 이벤트 처리 완료:', { chatRoomId, messageId });
            } else {
              console.warn('⚠️ 메시지 삭제 이벤트 데이터 불완전:', data);
            }
          } catch (error) {
            console.error('❌ 메시지 삭제 이벤트 처리 중 오류:', error);
          }
        });

        // 멤버 참여/퇴장 이벤트 리스너들도 필요시 추가
        sseService.addEventListener('CHAT_MEMBER_JOINED', (data) => {
          console.log('멤버 참여 이벤트:', data);
          // TODO: 멤버 참여 처리 구현
        });

        sseService.addEventListener('CHAT_MEMBER_LEFT', (data) => {
          console.log('멤버 퇴장 이벤트:', data);
          // TODO: 멤버 퇴장 처리 구현
        });

      } catch (error) {
        console.error(`❌ SSE 연결 실패 (${connectionRetryCount}/${maxRetries}):`, error);
        isConnecting = false;
        dispatch({ type: 'SET_CONNECTED', payload: false });
        
        // 재시도
        if (connectionRetryCount < maxRetries) {
          const retryDelay = 2000 * connectionRetryCount; // 점진적 백오프
          console.log(`🔄 ${retryDelay}ms 후 SSE 연결 재시도...`);
          setTimeout(connectSse, retryDelay);
        }
      }
    };

    connectSse();

    // 컴포넌트 언마운트시 SSE 연결 해제
    return () => {
      console.log('🧹 ChatProvider cleanup 실행 - 연결 상태:', isConnected);
      
      // 연결 안정성 타이머 정리
      if (connectionStabilityTimer) {
        clearInterval(connectionStabilityTimer);
        connectionStabilityTimer = null;
      }
      
      // 폴백 동기화 타이머 정리
      if (fallbackSyncTimer) {
        clearInterval(fallbackSyncTimer);
        fallbackSyncTimer = null;
      }
      
      if (isConnected) {
        console.log('🔌 SSE 연결 해제 중...');
        sseService.disconnect();
        dispatch({ type: 'SET_CONNECTED', payload: false });
        console.log('✅ SSE 연결 해제 완료');
      } else {
        console.log('ℹ️ SSE 연결이 없어서 해제 건너뜀');
      }
    };
  }, [currentUser?.id, currentWorkspace?.id, state.currentChatRoom]);

  // 채팅방 목록 로드
  const loadChatRooms = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await chatApi.getChatRooms(parseInt(currentWorkspace.id));
      
      // DM 채팅방들의 멤버 정보도 함께 로드
      const chatRooms: ChatRoom[] = await Promise.all(
        response.content.map(async roomData => {
          let members: any[] = [];
          
          // DM 채팅방인 경우 멤버 정보도 함께 로드
          if (roomData.type === 'PERSONAL') {
            try {
              members = await chatApi.getChatMembers(roomData.id);
              console.log(`🏠 [loadChatRooms] DM 채팅방 ${roomData.id} 멤버:`, members);
            } catch (error) {
              console.error(`DM 채팅방 ${roomData.id}의 멤버 정보를 가져오는데 실패:`, error);
              members = [];
            }
          }
          
          return {
            id: roomData.id,
            workspaceId: roomData.workspaceId,
            name: roomData.name,
            type: roomData.type as 'PERSONAL' | 'GROUP',
            members,
            createdAt: new Date(roomData.createdAt),
            memberCount: roomData.memberCount,
          };
        })
      );
      
      dispatch({ type: 'SET_CHAT_ROOMS', payload: chatRooms });
    } catch (error) {
      console.error('채팅방 목록 로드 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '채팅방 목록을 불러오지 못했습니다.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWorkspace]);

  // 현재 채팅방 설정
  const setCurrentChatRoom = useCallback((chatRoom: ChatRoom | null) => {
    // 새로운 채팅방으로 변경할 때 에러 상태 초기화
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: chatRoom });
  }, []);

  // ID로 현재 채팅방 설정
  const setCurrentChatRoomById = useCallback(async (roomId: number) => {
    console.log('setCurrentChatRoomById 호출:', roomId);
    
    // 새로운 채팅방으로 이동할 때 에러 상태 초기화
    dispatch({ type: 'SET_ERROR', payload: null });
    
    let room = state.chatRooms.find(r => r.id === roomId);
    
    if (!room && currentWorkspace) {
      console.log('채팅방을 찾을 수 없어서 목록을 다시 로드합니다.');
      try {
        const response = await chatApi.getChatRooms(parseInt(currentWorkspace.id));
        const chatRooms: ChatRoom[] = await Promise.all(
          response.content.map(async roomData => {
            let members: any[] = [];
            
            // DM 채팅방인 경우 멤버 정보도 함께 로드
            if (roomData.type === 'PERSONAL') {
              try {
                members = await chatApi.getChatMembers(roomData.id);
                console.log(`채팅방 ${roomData.id} 멤버 정보 로드:`, members);
              } catch (error) {
                console.error(`채팅방 ${roomData.id} 멤버 정보 로드 실패:`, error);
              }
            }
            
            return {
              id: roomData.id,
              workspaceId: roomData.workspaceId,
              name: roomData.name,
              type: roomData.type as 'PERSONAL' | 'GROUP',
              members,
              createdAt: new Date(roomData.createdAt),
              memberCount: roomData.memberCount,
            };
          })
        );
        
        dispatch({ type: 'SET_CHAT_ROOMS', payload: chatRooms });
        room = chatRooms.find(r => r.id === roomId);
      } catch (error) {
        console.error('채팅방 목록 다시 로드 실패:', error);
      }
    }
    
    if (room) {
      console.log('채팅방 설정:', room);
      setCurrentChatRoom(room);
    } else {
      console.log('채팅방을 찾을 수 없습니다:', roomId);
    }
  }, [state.chatRooms, setCurrentChatRoom, currentWorkspace]);

  // 메시지 로드
  const loadMessages = useCallback(async (chatRoomId: number) => {
    console.log('loadMessages 호출:', chatRoomId);
    
    if (!currentWorkspace) {
      console.log('워크스페이스가 없어서 메시지 로드를 건너뜀');
      return;
    }
    
    try {
      // 메시지 로드 시작 시 에러 상태 초기화
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('메시지 로드 API 호출:', parseInt(currentWorkspace.id), chatRoomId);
      const response = await chatApi.getChatMessages(parseInt(currentWorkspace.id), chatRoomId);
      console.log('🔍 백엔드 원본 메시지 응답:', response);
      
      if (response.messages && response.messages.length > 0) {
        console.log('🔍 백엔드 첫 번째 메시지 구조:', response.messages[0]);
      }
      
      const messages: ChatMessage[] = response.messages.map((msg, index) => {
        // 워크스페이스 멤버 정보에서 발신자 이름 찾기
        let correctedSenderName = msg.senderName;
        if ((!msg.senderName || msg.senderName === '알 수 없는 사용자') && currentWorkspace?.members) {
          const member = currentWorkspace.members.find(m => m.id === msg.senderId);
          if (member && member.name) {
            correctedSenderName = member.name;
            console.log(`🔧 [ChatContext] 발신자 이름 보정: ${msg.senderId} -> ${correctedSenderName}`);
          }
        }
        
        // 각 메시지마다 독립적인 timestamp 생성
        const messageTimestamp = msg.sentAt ? new Date(msg.sentAt) : 
                                msg.createdAt ? new Date(msg.createdAt) : new Date();
        console.log(`🕐 [${index}] 메시지 ${msg.id} 타임스탬프 처리:`, {
          originalSentAt: msg.sentAt,
          originalCreatedAt: msg.createdAt,
          parsedTimestamp: messageTimestamp.toISOString(),
          timeValue: messageTimestamp.getTime()
        });
        
        return {
          id: msg.id,
          roomId: msg.chatRoomId,
          userId: msg.senderId,
          userName: correctedSenderName,
          text: msg.content,
          timestamp: messageTimestamp,
          createdAt: msg.sentAt || msg.createdAt || new Date().toISOString(),
          senderName: correctedSenderName,
          senderProfilePictureUrl: msg.senderProfileImageUrl,
        };
      });

      console.log('📋 백엔드에서 받은 메시지들:', messages.map(m => ({
        id: m.id,
        text: m.text.substring(0, 20) + '...',
        timestamp: m.timestamp.toLocaleString()
      })));
      
      // 안전을 위해 타임스탬프 기준으로 정렬 (ASC)
      const sortedMessages = messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      console.log('📋 정렬 후 메시지 순서:', sortedMessages.map(m => ({
        id: m.id,
        text: m.text.substring(0, 20) + '...',
        timestamp: m.timestamp.toLocaleString()
      })));
      
      dispatch({ type: 'SET_MESSAGES', payload: { chatRoomId, messages: sortedMessages } });
    } catch (error) {
      console.error('메시지 로드 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '메시지를 불러오지 못했습니다.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWorkspace]);

  // 메시지 전송
  const sendMessage = useCallback(async (chatRoomId: number, content: string) => {
    if (!currentUser || !currentWorkspace) return;

    // 빈 메시지 체크
    if (!content.trim()) {
      console.log('⚠️ 빈 메시지는 전송하지 않습니다.');
      return;
    }

    const maxRetries = 3;
    let retryCount = 0;

    // 임시 메시지 ID 생성 (실제 메시지가 오면 대체됨)
    const tempMessageId = -Math.abs(Date.now() + Math.floor(Math.random() * 1000)); // 음수로 임시 ID 생성
    
    // 즉시 UI 업데이트를 위한 임시 메시지 생성
    const tempMessage: ChatMessage = {
      id: tempMessageId, // 음수 임시 ID 사용
      roomId: chatRoomId,
      userId: parseInt(currentUser.id.toString()),
      userName: currentUser.name,
      text: content.trim(),
      timestamp: new Date(),
      createdAt: new Date().toISOString(),
      senderName: currentUser.name,
      senderProfilePictureUrl: undefined,
    };

    // 즉시 UI에 임시 메시지 추가 (낙관적 업데이트)
    console.log('📱 임시 메시지 즉시 UI 추가:', tempMessage);
    dispatch({ 
      type: 'ADD_MESSAGE', 
      payload: { chatRoomId, message: tempMessage }
    });

    const attemptSend = async (): Promise<void> => {
      try {
        const request = {
          content: content.trim(),
          senderId: parseInt(currentUser.id.toString()),
          senderName: currentUser.name,
        };

        console.log(`📤 메시지 전송 시도 (${retryCount + 1}/${maxRetries + 1}):`, request);
        
        // 메시지 전송 API 호출
        const response = await chatApi.sendMessage(parseInt(currentWorkspace.id), chatRoomId, request);
        console.log('✅ 메시지 전송 성공 - 응답:', response);
        
        // API 응답이 있는 경우 임시 메시지를 실제 메시지로 교체
        if (response && response.id) {
          const realMessage: ChatMessage = {
            id: response.id,
            roomId: response.chatRoomId || chatRoomId,
            userId: response.senderId || parseInt(currentUser.id.toString()),
            userName: response.senderName || currentUser.name,
            text: response.content || content.trim(),
            timestamp: response.sentAt ? new Date(response.sentAt) : 
                      response.createdAt ? new Date(response.createdAt) : new Date(),
            createdAt: response.sentAt || response.createdAt || new Date().toISOString(),
            senderName: response.senderName || currentUser.name,
            senderProfilePictureUrl: response.senderProfileImageUrl,
          };

          // 임시 메시지를 실제 메시지로 교체
          console.log('🔄 임시 메시지를 실제 메시지로 교체:', { tempMessageId, realMessage });
          
          dispatch({ 
            type: 'ADD_MESSAGE', 
            payload: { chatRoomId, message: realMessage }
          });
        } else {
          // API 응답이 없으면 임시 메시지를 실제 메시지로 간주
          console.log('⚠️ API 응답 없음, 임시 메시지를 유지');
          const permanentMessage: ChatMessage = {
            ...tempMessage,
            id: Date.now(), // 양수 ID로 변환
          };
          
          const currentMessages = state.messages[chatRoomId] || [];
          const updatedMessages = currentMessages
            .filter(msg => msg.id !== tempMessageId) // 임시 메시지 제거
            .concat([permanentMessage]) // 영구 메시지 추가
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // 시간순 정렬
          
          dispatch({ 
            type: 'SET_MESSAGES', 
            payload: { chatRoomId, messages: updatedMessages }
          });
        }
        
        // SSE 연결 상태 확인 및 재연결 시도
        if (!sseService.isEventSourceConnected()) {
          console.log('⚠️ SSE 연결이 끊어진 상태, 재연결 시도');
          try {
            await sseService.connect();
            console.log('✅ SSE 재연결 성공');
          } catch (reconnectError) {
            console.error('❌ SSE 재연결 실패:', reconnectError);
            // SSE 재연결에 실패해도 메시지 전송은 성공했으므로 계속 진행
          }
        }
        
        // SSE 연결이 불안정한 경우를 대비한 폴백 메커니즘
        // 504 에러가 빈번한 환경에서는 더 짧은 간격으로 폴백 체크
        setTimeout(async () => {
          try {
            console.log('🔄 SSE 폴백: 메시지 목록 재로드 확인 (1차)');
            const latestMessages = await chatApi.getChatMessages(parseInt(currentWorkspace.id), chatRoomId, 0, 20);
            
            // 최신 메시지들과 현재 메시지들 비교
            const currentMessagesState = state.messages[chatRoomId] || [];
            const latestRealMessages = latestMessages.messages || [];
            
            // 새로운 실제 메시지가 있는지 확인
            const newRealMessages = latestRealMessages.filter(apiMsg => 
              !currentMessagesState.some(localMsg => 
                localMsg.id === apiMsg.id && localMsg.id > 0 // 실제 메시지만 비교
              )
            );
            
            if (newRealMessages.length > 0) {
              console.log(`🔄 폴백으로 ${newRealMessages.length}개의 누락된 메시지 발견`);
              
              newRealMessages.forEach(apiMsg => {
                let correctedSenderName = apiMsg.senderName;
                if ((!apiMsg.senderName || apiMsg.senderName === '알 수 없는 사용자') && currentWorkspace?.members) {
                  const member = currentWorkspace.members.find(m => m.id === apiMsg.senderId);
                  if (member?.name) {
                    correctedSenderName = member.name;
                  }
                }
                
                const fallbackMessage: ChatMessage = {
                  id: apiMsg.id,
                  roomId: apiMsg.chatRoomId,
                  userId: apiMsg.senderId,
                  userName: correctedSenderName,
                  text: apiMsg.content,
                  timestamp: apiMsg.sentAt ? new Date(apiMsg.sentAt) : 
                            apiMsg.createdAt ? new Date(apiMsg.createdAt) : new Date(),
                  createdAt: apiMsg.sentAt || apiMsg.createdAt || new Date().toISOString(),
                  senderName: correctedSenderName,
                  senderProfilePictureUrl: apiMsg.senderProfileImageUrl,
                };
                
                dispatch({ 
                  type: 'ADD_MESSAGE', 
                  payload: { chatRoomId, message: fallbackMessage }
                });
              });
            }
          } catch (fallbackError) {
            console.error('❌ 1차 폴백 메시지 로드 실패:', fallbackError);
          }
        }, 1000); // 1초 후 1차 폴백 (백엔드 타임아웃 대응)
        
        // 백엔드 타임아웃 환경을 위한 2차 폴백 (더 짧은 간격)
        setTimeout(async () => {
          try {
            // SSE 연결 상태 재확인
            if (!sseService.isEventSourceConnected()) {
              console.log('🔄 SSE 폴백: 2차 메시지 동기화 확인');
              const latestMessages = await chatApi.getChatMessages(parseInt(currentWorkspace.id), chatRoomId, 0, 50);
              
              const currentMessagesState = state.messages[chatRoomId] || [];
              const latestRealMessages = latestMessages.messages || [];
              
              // 더 넓은 범위로 누락된 메시지 확인
              const newRealMessages = latestRealMessages.filter(apiMsg => 
                !currentMessagesState.some(localMsg => 
                  localMsg.id === apiMsg.id && localMsg.id > 0
                )
              );
              
              if (newRealMessages.length > 0) {
                console.log(`🔄 2차 폴백으로 ${newRealMessages.length}개의 추가 누락 메시지 발견`);
                
                newRealMessages.forEach(apiMsg => {
                  let correctedSenderName = apiMsg.senderName;
                  if ((!apiMsg.senderName || apiMsg.senderName === '알 수 없는 사용자') && currentWorkspace?.members) {
                    const member = currentWorkspace.members.find(m => m.id === apiMsg.senderId);
                    if (member?.name) {
                      correctedSenderName = member.name;
                    }
                  }
                  
                  const fallbackMessage: ChatMessage = {
                    id: apiMsg.id,
                    roomId: apiMsg.chatRoomId,
                    userId: apiMsg.senderId,
                    userName: correctedSenderName,
                    text: apiMsg.content,
                    timestamp: apiMsg.sentAt ? new Date(apiMsg.sentAt) : 
                              apiMsg.createdAt ? new Date(apiMsg.createdAt) : new Date(),
                    createdAt: apiMsg.sentAt || apiMsg.createdAt || new Date().toISOString(),
                    senderName: correctedSenderName,
                    senderProfilePictureUrl: apiMsg.senderProfileImageUrl,
                  };
                  
                  dispatch({ 
                    type: 'ADD_MESSAGE', 
                    payload: { chatRoomId, message: fallbackMessage }
                  });
                });
              }
            }
          } catch (fallbackError) {
            console.error('❌ 2차 폴백 메시지 로드 실패:', fallbackError);
          }
        }, 5000); // 5초 후 2차 폴백 (백엔드 타임아웃 대응)
        
      } catch (error) {
        console.error(`❌ 메시지 전송 실패 (시도 ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        // 전송 실패 시 임시 메시지를 오류 표시로 변경하되, 사용자에게 더 친화적인 메시지 제공
        const errorMessage: ChatMessage = {
          ...tempMessage,
          text: `⚠️ 메시지 전송 실패: "${tempMessage.text.substring(0, 50)}${tempMessage.text.length > 50 ? '...' : ''}"`,
          senderName: `${currentUser.name} (전송 실패 - 다시 시도하세요)`,
        };
        
        const currentMessages = state.messages[chatRoomId] || [];
        const updatedMessages = currentMessages
          .map(msg => msg.id === tempMessageId ? errorMessage : msg);
        
        dispatch({ 
          type: 'SET_MESSAGES', 
          payload: { chatRoomId, messages: updatedMessages }
        });
        
        // 네트워크 오류나 일시적 오류인 경우에만 재시도
        const isRetryableError = error instanceof Error && 
          (error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('fetch') ||
           error.message.includes('Failed to fetch') ||
           error.message.includes('NetworkError'));
        
        if (retryCount < maxRetries && isRetryableError) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // 지수적 백오프, 최대 5초
          console.log(`🔄 재시도 가능한 오류 감지, ${delay}ms 후 메시지 전송 재시도... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptSend();
        }
        
        // 재시도 불가능한 오류 또는 최대 재시도 횟수 도달
        console.error(`❌ 메시지 전송 최종 실패 (${retryCount + 1}/${maxRetries + 1} 시도)`, error);
        throw error;
      }
    };

    return attemptSend();
  }, [currentUser, currentWorkspace, state.messages]);

  // 메시지 삭제
  const deleteMessage = useCallback(async (chatRoomId: number, messageId: number): Promise<void> => {
    if (!currentWorkspace) throw new Error('워크스페이스가 없습니다.');
    if (!currentUser) throw new Error('사용자 정보가 없습니다.');

    try {
      console.log('🗑️ 메시지 삭제 시도:', { chatRoomId, messageId });
      
      // 먼저 UI에서 즉시 제거 (낙관적 업데이트)
      dispatch({ 
        type: 'DELETE_MESSAGE', 
        payload: { chatRoomId, messageId }
      });

      // API 호출
      await chatApi.deleteMessage(parseInt(currentWorkspace.id), chatRoomId, messageId);
      console.log('✅ 메시지 삭제 완료:', messageId);
      
    } catch (error) {
      console.error('❌ 메시지 삭제 실패:', error);
      
      // 삭제 실패 시 메시지 복원 (API에서 다시 로드)
      try {
        await loadMessages(chatRoomId);
      } catch (reloadError) {
        console.error('❌ 메시지 목록 재로드 실패:', reloadError);
      }
      
      throw error;
    }
  }, [currentUser, currentWorkspace, loadMessages]);

  // 채팅방 생성
  const createChatRoom = useCallback(async (name: string, memberIds: number[], type: 'PERSONAL' | 'GROUP'): Promise<ChatRoom> => {
    if (!currentWorkspace) throw new Error('워크스페이스가 없습니다.');

    console.log('🏗️ [ChatContext] createChatRoom 호출:', {
      name,
      memberIds,
      type,
      workspaceId: currentWorkspace.id
    });

    try {
      let response;
      
      if (type === 'PERSONAL') {
        // DM 채팅방 생성 - memberIds는 현재 사용자와 상대방 ID 모두 포함
        console.log('🏗️ [ChatContext] DM 채팅방 생성 API 호출 시작');
        response = await chatApi.createDmChatRoom(parseInt(currentWorkspace.id), {
          name: name, // NewChatModal에서 전달받은 상대방 이름 사용
          type: 'PERSONAL',
          chatMemberIdList: memberIds,
          workspaceId: parseInt(currentWorkspace.id),
        });
        console.log('🏗️ [ChatContext] DM 채팅방 생성 API 응답:', response);
      } else {
        // 그룹 채팅방 생성
        console.log('🏗️ [ChatContext] 그룹 채팅방 생성 API 호출 시작');
        response = await chatApi.createChatRoom(parseInt(currentWorkspace.id), {
          name,
          type: 'GROUP',
          chatMemberIdList: memberIds,
          workspaceId: parseInt(currentWorkspace.id),
        });
        console.log('🏗️ [ChatContext] 그룹 채팅방 생성 API 응답:', response);
      }

      const newRoom: ChatRoom = {
        id: response.id,
        workspaceId: response.workspaceId,
        name: response.name,
        type: response.type as 'PERSONAL' | 'GROUP',
        members: [],
        createdAt: new Date(response.createdAt),
        memberCount: response.memberCount,
      };

      console.log('🏗️ [ChatContext] 생성된 채팅방 객체:', newRoom);

      // DM 채팅방인 경우 자동으로 채팅방 참여
      if (type === 'PERSONAL') {
        try {
          console.log('🏗️ [ChatContext] DM 채팅방 자동 참여 시도:', newRoom.id);
          await chatApi.joinChatRoom(parseInt(currentWorkspace.id), newRoom.id);
          console.log('🏗️ [ChatContext] DM 채팅방 자동 참여 완료');
        } catch (joinError) {
          console.warn('🏗️ [ChatContext] DM 채팅방 자동 참여 실패 (이미 참여했을 수도 있음):', joinError);
          // 자동 참여 실패는 치명적이지 않으므로 계속 진행
        }
      }

      dispatch({ type: 'ADD_CHAT_ROOM', payload: newRoom });
      return newRoom;
    } catch (error) {
      console.error('🚨 [ChatContext] 채팅방 생성 실패:', error);
      throw error;
    }
  }, [currentWorkspace]);

  // DM 채팅방 생성
  const createDmChatRoom = useCallback(async (targetUserId: number): Promise<ChatRoom> => {
    if (!currentWorkspace) throw new Error('워크스페이스가 없습니다.');

    // 상대방 사용자 이름 찾기
    const targetUser = currentWorkspace.members?.find(m => m.id === targetUserId);
    const dmName = targetUser?.name || `사용자 ${targetUserId}`;

    try {
      const response = await chatApi.createDmChatRoom(parseInt(currentWorkspace.id), {
        name: dmName, // 상대방 이름 사용
        type: 'PERSONAL',
        chatMemberIdList: [targetUserId],
        workspaceId: parseInt(currentWorkspace.id),
      });

      const newRoom: ChatRoom = {
        id: response.id,
        workspaceId: response.workspaceId,
        name: response.name,
        type: response.type as 'PERSONAL' | 'GROUP',
        members: [],
        createdAt: new Date(response.createdAt),
        memberCount: response.memberCount,
      };

      dispatch({ type: 'ADD_CHAT_ROOM', payload: newRoom });
      return newRoom;
    } catch (error) {
      console.error('DM 채팅방 생성 실패:', error);
      throw error;
    }
  }, [currentWorkspace]);

  return (
    <ChatContext.Provider
      value={{
        state,
        loadChatRooms,
        setCurrentChatRoom,
        setCurrentChatRoomById,
        loadMessages,
        sendMessage,
        deleteMessage,
        createChatRoom,
        createDmChatRoom,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat는 ChatProvider 내에서 사용되어야 합니다');
  }
  return context;
};

// 기본 내보내기도 추가
export default useChat;

// End of file
