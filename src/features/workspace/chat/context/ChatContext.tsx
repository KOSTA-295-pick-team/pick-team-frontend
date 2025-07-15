import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi } from '../api/chatApi';
import { sseService } from '../services/sseService';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';

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
      
      // 빠른 중복 검사 (ID 기반)
      const messageExists = existingMessages.some(msg => msg.id === newMessage.id);
      
      if (messageExists) {
        console.log('🚫 중복 메시지 무시:', newMessage.id, '채팅방:', action.payload.chatRoomId);
        return state;
      }
      
      console.log('✅ 새 메시지 추가:', newMessage.id, '채팅방:', action.payload.chatRoomId);
      
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
        console.log('� 시간순 정렬로 메시지 삽입, 위치:', insertIndex);
      }
      
      // 메모리 관리: 메시지가 너무 많으면 오래된 메시지 제거
      const maxMessages = 1000;
      if (updatedMessages.length > maxMessages) {
        updatedMessages = updatedMessages.slice(-maxMessages);
        console.log(`📝 메시지 수 제한으로 오래된 메시지 제거, 현재: ${updatedMessages.length}`);
      }
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatRoomId]: updatedMessages,
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

    const connectSse = async () => {
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
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // SSE 등록 및 연결
        await sseService.register();
        console.log('✅ SSE 등록 완료');
        
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

        // 새 메시지 이벤트 리스너 (성능 최적화)
        sseService.addEventListener('NEW_CHAT_MESSAGE', (data) => {
          try {
            const timestamp = Date.now();
            console.log(`🔔 [${new Date(timestamp).toISOString()}] 새 메시지 수신:`, data);
            
            // 데이터 유효성 검사 (빠른 실패)
            if (!data?.messageId || !data?.chatRoomId || !data?.content) {
              console.error('❌ 유효하지 않은 메시지 데이터:', data);
              return;
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
            console.error('❌ 새 메시지 처리 중 오류:', error);
            // 에러가 발생해도 SSE 연결을 유지
          }
        });

        // 메시지 삭제 이벤트 리스너
        sseService.addEventListener('CHAT_MESSAGE_DELETED', (data) => {
          console.log('메시지 삭제 이벤트 수신:', data);
          // TODO: 메시지 삭제 처리 구현
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
      
      if (isConnected) {
        console.log('🔌 SSE 연결 해제 중...');
        sseService.disconnect();
        dispatch({ type: 'SET_CONNECTED', payload: false });
        console.log('✅ SSE 연결 해제 완료');
      } else {
        console.log('ℹ️ SSE 연결이 없어서 해제 건너뜀');
      }
    };
  }, [currentUser?.id, currentWorkspace?.id]);

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

    const attemptSend = async (): Promise<void> => {
      try {
        const request = {
          content: content.trim(),
          senderId: parseInt(currentUser.id.toString()),
          senderName: currentUser.name,
        };

        console.log(`📤 메시지 전송 시도 (${retryCount + 1}/${maxRetries + 1}):`, request);
        
        // 메시지 전송 API 호출
        await chatApi.sendMessage(parseInt(currentWorkspace.id), chatRoomId, request);
        console.log('✅ 메시지 전송 성공 - SSE를 통해 실시간 업데이트 예정');
        
        // SSE를 통해 자동으로 새 메시지가 추가되므로 별도로 메시지 목록을 다시 로드하지 않음
      } catch (error) {
        console.error(`❌ 메시지 전송 실패 (시도 ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        // SSE 연결 상태 확인
        if (!sseService.isEventSourceConnected()) {
          console.log('🔄 SSE 연결이 끊어져서 재연결을 시도합니다.');
          try {
            await sseService.connect();
            console.log('✅ SSE 재연결 성공');
          } catch (reconnectError) {
            console.error('❌ SSE 재연결 실패:', reconnectError);
          }
        }
        
        // 네트워크 오류나 일시적 오류인 경우 재시도
        if (retryCount < maxRetries && 
            (error instanceof Error && 
             (error.message.includes('network') || 
              error.message.includes('timeout') ||
              error.message.includes('fetch')))) {
          retryCount++;
          const delay = 1000 * retryCount; // 1초, 2초, 3초 지연
          console.log(`🔄 ${delay}ms 후 메시지 전송 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptSend();
        }
        
        throw error;
      }
    };

    return attemptSend();
  }, [currentUser, currentWorkspace]);

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
