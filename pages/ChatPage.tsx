import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../AuthContext';
import { ChatMessage as ChatMessageType, ChatRoomMember } from '../types';
import { Card, Input, Button, TextArea } from '../components';
import { PaperClipIcon, ArrowUpCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { 
  fetchMessagesThunk, 
  sendMessageThunk, 
  setCurrentRoom,
  clearUnreadCount 
} from '../store/slices/chatSlice';
import { AppDispatch, RootState } from '../store';
import { chatEvents } from '../services/chatEvents';

export const ChatPage: React.FC = () => {
  const { workspaceId, roomId } = useParams<{ workspaceId: string, roomId: string }>();
  const { currentUser, getChatRoomName } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Redux 상태 조회
  const currentRoom = useSelector((state: RootState) => state.chat.currentRoom);
  const messages = useSelector((state: RootState) => 
    state.chat.messages[roomId || ''] || []
  );
  const loading = useSelector((state: RootState) => state.chat.loading);
  const error = useSelector((state: RootState) => state.chat.error);

  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 채팅방 입장 시 필요한 작업들
  useEffect(() => {
    if (!currentUser || !workspaceId || !roomId) {
      navigate('/login');
      return;
    }

    // 현재 채팅방 설정
    dispatch(setCurrentRoom({ id: roomId }));
    // 메시지 목록 로딩
    dispatch(fetchMessagesThunk({ workspaceId, roomId }));
    // 읽지 않은 메시지 카운트 초기화
    dispatch(clearUnreadCount(roomId));
    
    // SSE 연결 및 이벤트 핸들러 설정
    chatEvents.connect(currentUser.id);
    chatEvents.subscribeToRoom(roomId);

    // 채팅방 입장/퇴장 이벤트 처리
    const onMemberJoined = (data: { chatRoomId: string, member: ChatRoomMember }) => {
      if (data.chatRoomId === roomId) {
        console.log(`${data.member.name}님이 입장했습니다.`);
        // TODO: 시스템 메시지 표시 또는 알림 기능 추가
      }
    };
    
    const onMemberLeft = (data: { chatRoomId: string, memberId: string }) => {
      if (data.chatRoomId === roomId) {
        console.log(`사용자가 퇴장했습니다. (ID: ${data.memberId})`);
        // TODO: 시스템 메시지 표시 또는 알림 기능 추가
      }
    };

    chatEvents.onMemberJoined(onMemberJoined);
    chatEvents.onMemberLeft(onMemberLeft);

    return () => {
      chatEvents.unsubscribeFromRoom(roomId);
      chatEvents.disconnect(); // 페이지 이탈 시 연결 해제
    };
  }, [roomId, workspaceId, currentUser, dispatch, navigate]);
  
  // 새 메시지 수신 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 메시지 전송 처리
  const handleSendMessage = useCallback(async () => {
    if (!currentUser || !workspaceId || !roomId) return;
    
    if (newMessage.trim() || attachedFile) {
      try {
        await dispatch(sendMessageThunk({
          workspaceId,
          roomId,
          text: newMessage.trim(),
          file: attachedFile || undefined
        })).unwrap();

        setNewMessage('');
        setAttachedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('메시지 전송 실패:', error);
      }
    }
  }, [newMessage, attachedFile, currentUser, workspaceId, roomId, dispatch]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAttachedFile(event.target.files[0]);
    }
  };
  
  if (!currentUser) return <p>로그인이 필요합니다.</p>;
  if (loading) return <div className="p-4 text-center">채팅 내용을 불러오는 중...</div>;
  if (error) return <div className="p-4 text-center text-red-500">오류 발생: {error}</div>;
  if (!currentRoom) return <div className="p-4 text-center">선택된 채팅방이 없습니다.</div>;

  const chatRoomDisplayName = currentRoom ? getChatRoomName(currentRoom, currentUser) : '';

  return (
    <Card title={`대화: ${chatRoomDisplayName}`} className="flex flex-col h-[calc(100vh-8rem-4rem)]">
      <div className="flex-grow space-y-3 overflow-y-auto mb-3 pr-2 p-2 border border-neutral-200 rounded-md bg-neutral-50 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-2.5 rounded-lg shadow ${msg.userId === currentUser.id ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-800'}`}>
              {msg.attachment && (
                <div className="mb-1 p-2 border border-neutral-300 rounded bg-white/50">
                  {msg.attachment.type === 'image' ? (
                    <img src={msg.attachment.fileUrl} alt={msg.attachment.fileName} className="max-w-xs max-h-48 rounded"/>
                  ) : (
                    <a href={msg.attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline flex items-center">
                      <PaperClipIcon className="w-4 h-4 mr-1"/> {msg.attachment.fileName}
                    </a>
                  )}
                </div>
              )}
              {msg.text && <p className="text-sm whitespace-pre-line">{msg.text}</p>}
              <p className={`text-xs mt-1 ${msg.userId === currentUser.id ? 'text-blue-200 text-right' : 'text-neutral-500'}`}>
                {msg.userName}, {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <PaperClipIcon className="w-5 h-5"/>
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
          <ArrowUpCircleIcon className="w-5 h-5"/>
        </Button>
      </div>
    </Card>
  );
};
