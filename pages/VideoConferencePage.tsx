import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Card, Button, Input } from '../components';
import { User, VideoMember } from '../types';
import { videoApi } from '../services/videoApi';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';


export const VideoConferencePage: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [roomName, setRoomName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState<VideoMember[]>([]);
  
  
  
  const queryParams = new URLSearchParams(location.search);
  const IdFromQuery = queryParams.get('roomId');
  const NameFromQuery = queryParams.get('roomName');
  
  useEffect(() => {
    
    if (NameFromQuery) {
      setRoomName(decodeURIComponent(NameFromQuery));
    } else {
      // If no room name, redirect, but only if a user is already authenticated and present.
      // Otherwise, the !currentUser check below will handle it.
      if (currentUser) { 
        if (workspaceId) {
          navigate(`/ws/${workspaceId}`);
        } else {
          navigate('/');
        }
      }
    }
  }, [location.search, navigate, workspaceId, currentUser]); // Added currentUser dependency
  
  useEffect(() => {
    (async()=>{
    if (currentUser) {
      try{
        await videoApi.joinVideoChannel(workspaceId!,IdFromQuery!)

        const participants = await videoApi.getChannelParticipants(workspaceId!,IdFromQuery!);
        setParticipants(participants);

      }catch(e){
        console.error(e);
        setParticipants([]);
      }
    }
     })();
  }, [currentUser]);


  if (!currentUser) {
    // ProtectedRoute should handle the actual redirection.
    // This component renders a fallback UI while that might be happening or if currentUser is loading.
    return <p>사용자 정보를 확인 중입니다. 잠시 후 다시 시도해주세요...</p>;
  }
  
  // If currentUser is loaded, but roomName is still not set (e.g., waiting for first useEffect or redirecting)
  if (!roomName) {
      return <div className="p-4 text-center">회의실 정보를 불러오는 중이거나, 유효한 회의실이 아닙니다...</div>;
  }

  return (
    <Card title={`📹 화상 회의: ${roomName}`} className="h-full flex flex-col">
      <div className="flex flex-grow min-h-[calc(100vh-16rem)]"> {/* Ensure it takes up available space */}
        <div className={`flex-grow ${showChat ? 'md:w-3/4' : 'w-full'} transition-all duration-300`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 min-h-[300px] sm:min-h-[400px] bg-neutral-800 p-3 rounded-md">
                {participants.map(member => (
                <div key={member.id} className="bg-neutral-700 rounded aspect-video flex flex-col items-center justify-center text-white relative">
                    <img 
                    src={member.profileImageUrl || `https://picsum.photos/seed/${member.id}/120/120`} 
                    alt={member.name} 
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-full mb-2 ${isCameraOff && member.id === currentUser.id ? 'opacity-50' : ''}`}
                    />
                    <p className="text-sm">{member.name} {member.id === currentUser.id && '(나)'}</p>
                    {isMuted && member.id === currentUser.id && (
                    <span className="absolute top-2 right-2 text-red-500 text-xs bg-black/50 p-0.5 rounded">음소거</span>
                    )}
                    {isCameraOff && member.id === currentUser.id && (
                    <span className="absolute top-2 left-2 text-yellow-500 text-xs bg-black/50 p-0.5 rounded">카메라 꺼짐</span>
                    )}
                </div>
                ))}
                 {participants.length === 0 && <p className="col-span-full text-center text-neutral-400">참여자가 없습니다.</p>}
            </div>
            <div className="flex justify-center items-center space-x-2 sm:space-x-3 p-3 bg-neutral-100 rounded-md">
                <Button onClick={() => setIsMuted(!isMuted)} variant={isMuted ? "danger" : "outline"} size="sm">
                {isMuted ? "음소거 해제" : "음소거"}
                </Button>
                <Button onClick={() => setIsCameraOff(!isCameraOff)} variant={isCameraOff ? "danger" : "outline"} size="sm">
                {isCameraOff ? "카메라 켜기" : "카메라 끄기"}
                </Button>
                <Button variant="outline" size="sm">화면 공유</Button>
                <Button onClick={() => setShowChat(!showChat)} variant="ghost" size="sm" title={showChat ? "채팅 숨기기" : "채팅 보기"}>
                    <ChatBubbleBottomCenterTextIcon className="w-5 h-5"/>
                </Button>
                <Button variant="danger" size="sm" onClick={() => navigate(`/ws/${workspaceId || ''}`)}>회의 종료</Button>
            </div>
        </div>
        {showChat && (
            <div className="w-full md:w-1/4 pl-0 md:pl-3 mt-4 md:mt-0 md:border-l md:border-neutral-300 flex flex-col h-auto md:h-full transition-all duration-300">
                <h4 className="text-sm font-semibold mb-2 text-neutral-700">회의 중 채팅</h4>
                <div className="flex-grow bg-neutral-50 border border-neutral-200 rounded p-2 overflow-y-auto text-xs space-y-2 mb-2 min-h-[150px] md:min-h-0">
                    {/* Demo chat messages */}
                    <p><strong>참가자1:</strong> 안녕하세요!</p>
                    <p><strong>참가자2:</strong> 화면 공유 가능할까요?</p>
                    <p><strong>{currentUser.name}:</strong> 네 잠시만요.</p>
                     <p><strong>참가자1:</strong> 잘 보입니다.</p>
                </div>
                <Input type="text" placeholder="채팅 메시지..." className="text-sm !py-1.5" />
            </div>
        )}
      </div>
    </Card>
  );
};
