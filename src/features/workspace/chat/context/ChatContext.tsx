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
      const messageExists = existingMessages.some(msg => msg.id === action.payload.message.id);
      
      if (messageExists) {
        console.log('🚫 중복 메시지 무시:', action.payload.message.id, '채팅방:', action.payload.chatRoomId);
        console.log('🚫 기존 메시지 개수:', existingMessages.length);
        return state;
      }
      
      console.log('✅ 새 메시지 추가:', action.payload.message.id, '채팅방:', action.payload.chatRoomId);
      console.log('✅ 기존 메시지 개수:', existingMessages.length, '→ 새 개수:', existingMessages.length + 1);
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatRoomId]: [
            ...existingMessages,
            action.payload.message,
          ],
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

    const connectSse = async () => {
      if (isConnecting) {
        console.log('⚠️ 이미 SSE 연결 중입니다.');
        return;
      }
      
      isConnecting = true;
      
      try {
        console.log('🔌 SSE 연결 시작... (사용자:', currentUser.id, ')');
        
        // 기존 연결 확인
        if (sseService.isEventSourceConnected()) {
          console.log('⚠️ 기존 SSE 연결이 활성 상태입니다. 연결을 종료합니다.');
          sseService.disconnect();
        }
        
        // SSE 등록 및 연결
        await sseService.register();
        console.log('✅ SSE 등록 완료');
        
        await sseService.connect();
        console.log('✅ SSE 연결 완료');
        
        isConnected = true;
        isConnecting = false;
        
        console.log('✅ SSE 연결 성공 - 이벤트 리스너 등록');
        dispatch({ type: 'SET_CONNECTED', payload: true });

        // 새 메시지 이벤트 리스너
        sseService.addEventListener('NEW_CHAT_MESSAGE', (data) => {
          const timestamp = new Date().toISOString();
          console.log(`🔔 [${timestamp}] 새 메시지 수신:`, data);
          console.log('🔔 SSE 연결 상태:', sseService.isEventSourceConnected());
          
          // 워크스페이스 멤버 정보에서 발신자 이름 찾기
          let correctedSenderName = data.senderName || '알 수 없는 사용자';
          if ((!data.senderName || data.senderName === '알 수 없는 사용자') && currentWorkspace?.members) {
            const member = currentWorkspace.members.find(m => m.id === data.senderId);
            if (member && member.name) {
              correctedSenderName = member.name;
              console.log(`🔧 [SSE] 발신자 이름 보정: ${data.senderId} -> ${correctedSenderName}`);
            }
          }
          
          const newMessage: ChatMessage = {
            id: data.messageId,
            roomId: data.chatRoomId,
            userId: data.senderId,
            userName: correctedSenderName,
            text: data.content,
            timestamp: data.createdAt ? new Date(data.createdAt) : new Date(),
            createdAt: data.createdAt || new Date().toISOString(),
            senderName: correctedSenderName,
            senderProfilePictureUrl: undefined,
          };

          console.log(`🔔 [${timestamp}] 변환된 메시지:`, newMessage);
          console.log(`🔔 [${timestamp}] 현재 메시지 상태:`, state.messages);

          dispatch({ 
            type: 'ADD_MESSAGE', 
            payload: { chatRoomId: data.chatRoomId, message: newMessage }
          });
          
          console.log(`🔔 [${timestamp}] 메시지 추가 dispatch 완료`);
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
        console.error('SSE 연결 실패:', error);
        dispatch({ type: 'SET_CONNECTED', payload: false });
      }
    };

    connectSse();

    // 컴포넌트 언마운트시 SSE 연결 해제
    return () => {
      console.log('🧹 ChatProvider cleanup 실행 - 연결 상태:', isConnected);
      if (isConnected) {
        console.log('🔌 SSE 연결 해제 중...');
        sseService.disconnect();
        dispatch({ type: 'SET_CONNECTED', payload: false });
        console.log('✅ SSE 연결 해제 완료');
      } else {
        console.log('ℹ️ SSE 연결이 없어서 해제 건너뜀');
      }
    };
  }, [currentUser?.id, currentWorkspace?.id]); // currentWorkspace.id도 추가하여 워크스페이스 변경시에도 재연결

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
      console.log('메시지 로드 응답:', response);
      
      const messages: ChatMessage[] = response.messages.map(msg => {
        // 워크스페이스 멤버 정보에서 발신자 이름 찾기
        let correctedSenderName = msg.senderName;
        if ((!msg.senderName || msg.senderName === '알 수 없는 사용자') && currentWorkspace?.members) {
          const member = currentWorkspace.members.find(m => m.id === msg.senderId);
          if (member && member.name) {
            correctedSenderName = member.name;
            console.log(`🔧 [ChatContext] 발신자 이름 보정: ${msg.senderId} -> ${correctedSenderName}`);
          }
        }
        
        return {
          id: msg.id,
          roomId: msg.chatRoomId,
          userId: msg.senderId,
          userName: correctedSenderName,
          text: msg.content,
          timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
          createdAt: msg.createdAt || new Date().toISOString(),
          senderName: correctedSenderName,
          senderProfilePictureUrl: msg.senderProfileImageUrl,
        };
      });

      console.log('변환된 메시지:', messages);
      dispatch({ type: 'SET_MESSAGES', payload: { chatRoomId, messages } });
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

    try {
      const request = {
        content,
        senderId: parseInt(currentUser.id.toString()),
        senderName: currentUser.name,
      };

      console.log('메시지 전송 요청:', request);
      await chatApi.sendMessage(parseInt(currentWorkspace.id), chatRoomId, request);
      console.log('메시지 전송 성공 - SSE를 통해 실시간 업데이트 예정');
      
      // SSE를 통해 자동으로 새 메시지가 추가되므로 별도로 메시지 목록을 다시 로드하지 않음
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      throw error;
    }
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
