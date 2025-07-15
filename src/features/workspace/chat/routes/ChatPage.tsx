import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { useChat } from '../context/ChatContext';
import { Card, TextArea, Button } from '@/components/ui';
import { PlusCircleIcon, XCircleIcon } from '@/assets/icons';

export const ChatPage: React.FC = () => {
  const { workspaceId, chatId } = useParams<{ workspaceId: string, chatId: string }>();
  const { currentUser } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { state, loadMessages, sendMessage, setCurrentChatRoomById } = useChat();
  const navigate = useNavigate();

  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentRoomId = chatId ? parseInt(chatId) : null;
  const messages = currentRoomId ? (state.messages[currentRoomId] || []) : [];

  useEffect(() => {
    console.log('ChatPage useEffect 실행:', { 
      currentRoomId, 
      currentUser: currentUser?.id, 
      workspaceId,
      currentWorkspace: currentWorkspace?.id 
    });
    
    const initializeChat = async () => {
      if (!currentUser) {
        console.log('사용자 없음, 로그인 페이지로 이동');
        navigate('/login');
        return;
      }

      if (!currentWorkspace) {
        console.log('워크스페이스 로딩 중... 기다리는 중');
        return;
      }
      
      if (currentRoomId) {
        console.log('채팅방 ID로 초기화 시도:', currentRoomId);
        try {
          await setCurrentChatRoomById(currentRoomId);
          await loadMessages(currentRoomId);
          console.log('채팅 초기화 완료');
        } catch (error) {
          console.error('채팅 초기화 실패:', error);
        }
      } else {
        console.log('채팅방 ID 없음, 워크스페이스 홈으로 이동');
        if(workspaceId) navigate(`/ws/${workspaceId}`);
        else navigate('/');
      }
    };
    
    initializeChat();
  }, [currentRoomId, currentUser?.id, currentWorkspace?.id, navigate, workspaceId]); // currentWorkspace.id 추가
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!currentUser || !currentRoomId) return;
    if (newMessage.trim()) {
      try {
        await sendMessage(currentRoomId, newMessage.trim());
        setNewMessage('');
        setAttachedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        alert('메시지 전송에 실패했습니다.');
      }
    }
  }, [newMessage, currentUser, currentRoomId, sendMessage]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setAttachedFile(event.target.files[0]);
    }
  };

  // 채팅방 이름 표시 함수
  const getChatRoomDisplayName = () => {
    if (!state.currentChatRoom) return '채팅방';
    
    const room = state.currentChatRoom;
    
    // DM 채팅방인 경우 상대방 이름으로 표시
    if (room.type === 'PERSONAL') {
      console.log('🏷️ [ChatPage] DM 채팅방 제목 생성 중...', { 
        room, 
        members: room.members,
        currentUserId: currentUser?.id 
      });
      
      // 멤버 정보에서 상대방 찾기 (백엔드 이름은 무시)
      if (room.members && room.members.length > 0 && currentUser) {
        console.log('🏷️ [ChatPage] 멤버 정보 상세 분석:', {
          members: room.members,
          membersDetail: room.members.map(m => ({
            ...m,
            type: typeof m,
            keys: Object.keys(m)
          })),
          currentUserId: currentUser.id,
          currentUserIdType: typeof currentUser.id
        });
        
        const otherMember = room.members.find(member => {
          console.log('🔍 [ChatPage] 멤버 검사:', {
            member,
            memberAccountId: member.accountId,
            memberId: member.id,
            memberUserId: member.userId,
            memberKeys: Object.keys(member),
            currentUserId: currentUser.id,
            currentUserIdType: typeof currentUser.id
          });
          
          // account 필드로 비교 (백엔드 구조에 맞춤)
          return member.account !== undefined && 
                 member.account !== null && 
                 Number(member.account) !== Number(currentUser.id);
        });
        
        console.log('🏷️ [ChatPage] 상대방 멤버 찾기 결과:', {
          allMembers: room.members.map(m => ({ 
            account: m.account, 
            name: m.name,
            id: m.id,
            keys: Object.keys(m)
          })),
          currentUserId: currentUser.id,
          otherMember
        });
        
        if (otherMember) {
          // 수정된 필드명으로 이름 가져오기
          const displayName = otherMember.name || `사용자 ${otherMember.account}`;
          console.log('🏷️ [ChatPage] DM 채팅방 - 멤버 정보에서 상대방 이름 사용:', displayName);
          return displayName;
        }
      }
      
      // 멤버 정보가 없는 경우에만 백엔드 이름 확인
      if (room.name && room.name.trim() !== '' && room.name !== 'DM' && !room.name.includes('대화:')) {
        console.log('🏷️ [ChatPage] DM 채팅방 - 백엔드에서 설정된 유효한 이름 사용:', room.name);
        return room.name;
      }
      
      // 모든 방법이 실패한 경우 임시 표시
      console.log('🏷️ [ChatPage] DM 채팅방 - 정보 없음, 임시 표시');
      return `DM ${room.id}`;
    }
    
    // 그룹 채팅방은 기본 이름 사용
    return room.name || `그룹 채팅 ${room.id}`;
  };
  
  if (!currentUser) return <p className="p-6">로그인이 필요합니다.</p>;
  if (!currentWorkspace) return <div className="p-4 text-center">워크스페이스를 로딩 중...</div>;
  if (!currentRoomId) return <div className="p-4 text-center">채팅방을 불러오는 중이거나 선택된 채팅방이 없습니다...</div>;

  if (state.loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  // 에러 표시 조건을 더 엄격하게 - 현재 채팅방에 대한 에러인지 확인
  if (state.error && !state.loading && messages.length === 0) {
    return <div className="p-4 text-center text-red-500">{state.error}</div>;
  }

  return (
    <Card title={`대화: ${getChatRoomDisplayName()}`} className="flex flex-col h-[calc(100vh-8rem-4rem)]">
      <div className="flex-grow space-y-3 overflow-y-auto mb-3 pr-2 p-2 border border-neutral-200 rounded-md bg-neutral-50 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.userId === parseInt(currentUser.id.toString()) ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-2.5 rounded-lg shadow ${msg.userId === parseInt(currentUser.id.toString()) ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-800'}`}>
              {msg.attachment && (
                <div className="mb-1 p-2 border border-neutral-300 rounded bg-white/50">
                  {msg.attachment.type === 'image' ? (
                    <img src={msg.attachment.url} alt={msg.attachment.fileName} className="max-w-xs max-h-48 rounded"/>
                  ) : (
                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="text-sm underline flex items-center">
                      <PlusCircleIcon className="w-4 h-4 mr-1"/> {msg.attachment.fileName}
                    </a>
                  )}
                </div>
              )}
              {msg.text && <p className="text-sm whitespace-pre-line">{msg.text}</p>}
              <p className={`text-xs mt-1 ${msg.userId === parseInt(currentUser.id.toString()) ? 'text-blue-200 text-right' : 'text-neutral-500'}`}>
                {msg.userName || msg.senderName}, {(() => {
                  const messageDate = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp || msg.createdAt);
                  return isNaN(messageDate.getTime()) ? '시간 정보 없음' : messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {attachedFile && (
        <div className="p-2 border-t border-neutral-200 text-sm text-neutral-600 flex justify-between items-center">
          <span>첨부 파일: {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
          <button onClick={() => {setAttachedFile(null); if(fileInputRef.current) fileInputRef.current.value = "";}} className="text-red-500 hover:text-red-700">
            <XCircleIcon className="w-5 h-5"/>
          </button>
        </div>
      )}
      <div className="flex items-center space-x-2 pt-2 border-t border-neutral-200">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="chat-file-input"/>
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} title="파일 첨부">
          <PlusCircleIcon className="w-5 h-5"/>
        </Button>
        <TextArea 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
          placeholder="메시지 입력... (Shift+Enter로 줄바꿈)" 
          className="flex-grow !py-2"
          rows={1} 
          aria-label="메시지 입력창"
        />
        <Button onClick={handleSendMessage} title="전송 (Enter)" size="sm">
          <XCircleIcon className="w-5 h-5"/>
        </Button>
      </div>
    </Card>
  );
};
