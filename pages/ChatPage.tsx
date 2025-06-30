
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ChatMessage as ChatMessageType, User as UserType } from '../types';
import { Card, Input, Button, TextArea } from '../components';
import { PaperClipIcon, ArrowUpCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

// Chat messages - in a real app, fetch from backend or context based on roomId
const ALL_CHAT_MESSAGES: ChatMessageType[] = [
    // DM with user_kim
    { id: 'dm_msg1_a', roomId: 'chat_dm_user_kim', userId:'user_kim', userName:'김코딩', text: '안녕하세요! DM입니다. 잘 지내시죠?', timestamp: new Date(Date.now() - 3600000) },
    { id: 'dm_msg1_b', roomId: 'chat_dm_user_kim', userId:'user@example.com', userName:'테스트 사용자', text: '네, 안녕하세요! 잘 지냅니다. 프로젝트는 어떻게 돼가나요?', timestamp: new Date(Date.now() - 3540000) },

    // Group chat: general
    { id: 'grp_msg1_a', roomId: 'chat_group_general', userId:'user_park', userName:'박해커', text: '새로운 기능 아이디어 공유합니다: 실시간 공동 편집 기능!', timestamp: new Date(Date.now() - 7200000) },
    { id: 'grp_msg1_b', roomId: 'chat_group_general', userId:'user@example.com', userName:'테스트 사용자', text: '오, 좋은 아이디어네요. 기술 스택 검토가 필요하겠어요.', timestamp: new Date(Date.now() - 7140000) },
    { id: 'grp_msg1_c', roomId: 'chat_group_general', userId:'user_kim', userName:'김코딩', text: 'WebSockets나 CRDTs 같은 걸 고려해볼 수 있겠네요.', timestamp: new Date(Date.now() - 7080000) },

    // Group chat: 알파 프로젝트 논의
    { id: 'alpha_msg_1', roomId: 'chat_group_project_alpha_discussion', userId:'user_kim', userName:'김코딩', text: '알파 프로젝트 다음 주 목표 설정 회의 언제 할까요?', timestamp: new Date(Date.now() - 86400000*2) },
    { id: 'alpha_msg_2', roomId: 'chat_group_project_alpha_discussion', userId:'user_park', userName:'박해커', text: '저는 수요일 오후가 괜찮습니다.', timestamp: new Date(Date.now() - 86400000*2 + 60000) },
    { id: 'alpha_msg_3', roomId: 'chat_group_project_alpha_discussion', userId:'user@example.com', userName:'테스트 사용자', text: '저도 수요일 오후 좋습니다. 그때 뵙죠!', timestamp: new Date(Date.now() - 86400000*2 + 120000) },
];


export const ChatPage: React.FC = () => {
  const { workspaceId, roomId } = useParams<{ workspaceId: string, roomId: string }>();
  const { currentUser, currentChatRoom, setCurrentChatRoomById, getChatRoomName } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (roomId) {
      setCurrentChatRoomById(roomId);
        // Filter messages for the current room
  const roomMessages = ALL_CHAT_MESSAGES.filter(msg => msg.roomId === roomId);
      setMessages(roomMessages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    } else {
        // If no roomId, perhaps navigate to a default view or show an error
        if(workspaceId) navigate(`/ws/${workspaceId}`);
        else navigate('/');
    }
    return () => {
        // setCurrentChatRoomById(null); // Optionally clear when navigating away
    };
  }, [roomId, currentUser, setCurrentChatRoomById, navigate, workspaceId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSendMessage = useCallback(() => {
    if (!currentUser || !currentChatRoom) return;
    if (newMessage.trim() || attachedFile) {
      const msg: ChatMessageType = {
        id: `msg-${Date.now()}`,
        roomId: currentChatRoom.id,
        userId: currentUser.id,
        userName: currentUser.name || '나',
        text: newMessage.trim(),
        timestamp: new Date(),
      };
      if (attachedFile) {
        msg.attachment = {
            fileName: attachedFile.name,
            fileUrl: URL.createObjectURL(attachedFile), 
            type: attachedFile.type.startsWith('image/') ? 'image' : 'file',
        };
      }
          // Add to ALL_CHAT_MESSAGES for persistence
    ALL_CHAT_MESSAGES.push(msg); 
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      setAttachedFile(null);
      if(fileInputRef.current) fileInputRef.current.value = ""; 
    }
  }, [newMessage, attachedFile, currentUser, currentChatRoom]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setAttachedFile(event.target.files[0]);
    }
  };
  
  if (!currentUser) return <p>로그인이 필요합니다.</p>; // Should be handled by ProtectedRoute
  if (!currentChatRoom) return <div className="p-4 text-center">채팅방을 불러오는 중이거나 선택된 채팅방이 없습니다...</div>;

  const chatRoomDisplayName = getChatRoomName(currentChatRoom, currentUser);

  return (
    <Card title={`대화: ${chatRoomDisplayName}`} className="flex flex-col h-[calc(100vh-8rem-4rem)]"> {/* Adjust height as needed */}
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
