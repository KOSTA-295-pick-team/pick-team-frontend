// 🔧 기존 코드 기반에서 "RoomEvent로 트랙 자동 구독" 기능만 추가한 버전이다냥!

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Card, Button, Input } from '../components';
import { User, VideoMember, WebSocketChatMsg, ChatMessage, VideoConferenceMsg } from '../types';
import { videoApi } from '../services/videoApi';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalVideoTrack,createLocalVideoTrack,
  LocalAudioTrack,
  createLocalAudioTrack
} from 'livekit-client';

const WebSocketChatMessage: React.FC<WebSocketChatMsg> = ({ senderName, senderEmail, message }) => {
  return <p><strong>{senderName + '(' + senderEmail + ') : '}</strong>{message}</p>;
}
const VideoTrackView: React.FC< {
  track: Track;
  identity: string;
  metaData?: string;
}> = ({ track,identity,metaData}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && 'attach' in track && typeof track.attach === 'function') {
      
      const mediaEl = track.attach() as HTMLVideoElement;
      el.srcObject = mediaEl.srcObject;

      return () => {
        track.detach().forEach((detachedEl) => {
          if (detachedEl instanceof HTMLVideoElement) {
            detachedEl.srcObject = null;
          }
        });
      };
    }
  }, [track]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={track?.isLocal ?? false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '0.5rem' }}
      />
      {(identity || metaData) && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem', 
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
          }}
        >
          <p>{identity}</p>
          <p style={{ fontSize: '0.65rem', color: '#ccc' }}>{metaData && JSON.parse(metaData).userName}</p>
        </div>
      )}
    </div>
  );
};

export const VideoConferencePage: React.FC<{ setReloadState: React.Dispatch<React.SetStateAction<boolean>> }> = ({ setReloadState }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  
  const [roomName, setRoomName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
 
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState<VideoMember[]>([]);
  const [chatMessage, setChatMessage] = useState<WebSocketChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<{track:Track,identity:string,metaData?:string}|null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack,setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [screenTrack, setScreenTrack] = useState<LocalVideoTrack | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);




  const participantsRef = useRef<VideoMember[]>([]);
  const queryParams = new URLSearchParams(location.search);
  const IdFromQuery = queryParams.get('roomId');
  const NameFromQuery = queryParams.get('roomName');

  const stompClientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const subscriptionVideoRef = useRef<StompSubscription | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (NameFromQuery) {
      setRoomName(decodeURIComponent(NameFromQuery));
    }
  }, [location.search, navigate, workspaceId, currentUser]);

  useEffect(() => {
    if (!IdFromQuery || !workspaceId || !currentUser) return;
    (async () => {
      try {

        await videoApi.joinVideoChannel(workspaceId!, IdFromQuery!);
        const participants = await videoApi.getChannelParticipants(workspaceId!, IdFromQuery!);
        participantsRef.current = participants;
        setParticipants(participants);

        // 🐾 LiveKit Room 연결
        const room = new Room();
        setRoom(room);
        roomRef.current = room;

        const livekitUrl = 'ws://localhost:7880';
        const liveKitToken =await getToken();

        await room.connect(livekitUrl, liveKitToken);

        room.on(RoomEvent.TrackSubscribed, (track: Track, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === 'video') {
            console.log("여긴 오니??")
            setRemoteVideoTrack({track,identity:participant.identity,metaData:participant.metadata});
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          if (track.kind === 'video') {
            setRemoteVideoTrack(null);
          }
        });

       
        const wsUrl = `ws://localhost:8081/ws?token=${localStorage.getItem("auth_token")}`;
        const stompClient = new Client({ brokerURL: wsUrl, reconnectDelay: 5000, debug: (str) => console.log(str) });

        stompClient.onConnect = () => {
          console.log("✅ STOMP 연결 성공");
          const subscription = stompClient.subscribe(
            `/sub/chat/${IdFromQuery}`,
            (message: IMessage) => {
              const payload: WebSocketChatMsg = JSON.parse(message.body);
              if (payload.type === 'init') setChatMessage(payload.logs);
              else if (payload.type === 'chat') setChatMessage(prev => [...prev, payload]);
            }
          );
          const subscriptionVideo = stompClient.subscribe(
            `/sub/video/${IdFromQuery}`,
            (message: IMessage) => {
              const payload: VideoConferenceMsg = JSON.parse(message.body);
              if(payload.type==="GET_PARTICIPANTS_CONFIRMED"){
                setParticipants(payload.participants);
              }else if(payload.type==="SHOULD_OUT_CHANNEL"){
                navigate("/ws/"+workspaceId);
              }
              
            }
          );
          subscriptionRef.current = subscription;
          subscriptionVideoRef.current = subscriptionVideo;
          stompClient.publish({ destination: `/pub/chat/${IdFromQuery}`, body: JSON.stringify({ type: "init" }) });
        };

        stompClient.onStompError = (frame) => {
          console.error("❌ STOMP 오류", frame);
        };

        stompClient.activate();
        stompClientRef.current = stompClient;

       
      } catch (e) {
        console.error(e);
        setParticipants([]);
      }
    })();

    return () => {
      (async () => {
        try {
          const currentParticipant = participantsRef.current.find((participant) => participant.userId === parseInt(currentUser!.id));
          if (currentParticipant) {
            await videoApi.leaveChannel(workspaceId!, IdFromQuery!, currentParticipant?.id!);
          }
          
        } catch (error: any) {
          console.error(error);
        }
           setReloadState(state => !state);
           if(stompClientRef.current?.connected){
            subscriptionRef.current?.unsubscribe();
            subscriptionVideoRef.current?.unsubscribe();
            stompClientRef.current?.deactivate();
            roomRef.current?.disconnect();
          }
          setRoom(null);
          setLocalVideoTrack(null);
          setScreenTrack(null);
          setLocalAudioTrack(null);
          setIsCameraOn(false);
          setIsSharingScreen(false);
        
      })();
    };
  }, [IdFromQuery]);

  //실시간 채팅 관련 채팅 쌓일때마다 스크롤링 해주는 기능
  useEffect(() => {
    if (chatEndRef.current) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [chatMessage]);

  //실시간 채팅 메시지 전송
  const sendMessage = (message: string) => {
    stompClientRef?.current?.publish({
      destination: `/pub/chat/${IdFromQuery}`,
      body: JSON.stringify({ type: "chat", message })
    });
    setChatInput('');
  };
  //LIVEKIT 서버(화상회의) 접속 토큰 발급
  async function getToken() {
      const response = await fetch(`http://localhost:8081/api/workspaces/${workspaceId}/video-channels/${IdFromQuery}/join-conference`, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization":"Bearer "+ localStorage.getItem("auth_token")
          },
      });

      if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to get token: ${error.errorMessage}`);
      }

      const token = await response.json();
      return token.token;
  }
  const publishCameraTrack = async () => {
    if(checkExistsPublishing()){
      alert("다른 누군가가 이미 방송 중입니다.")
      return;
    }
    if (!room) return;
    if(localVideoTrack || screenTrack) return;

    const videoTrack = await createLocalVideoTrack();
    const audioTrack = await createLocalAudioTrack();
    setLocalVideoTrack(videoTrack);
    setLocalAudioTrack(audioTrack);
    await room.localParticipant.publishTrack(videoTrack);
    await room.localParticipant.publishTrack(audioTrack);
    setIsCameraOn(true);
    setIsMuted(false);
  };

  const unPublishCameraTrack = async () => {
   
    if (!room) return;
    const videoTrack = localVideoTrack;
    const audioTrack = localAudioTrack;
    if (videoTrack) {
      room.localParticipant.unpublishTrack(videoTrack);
      videoTrack.stop();
      if(audioTrack){
        room.localParticipant.unpublishTrack(audioTrack);
        audioTrack.stop();
      }
      setIsCameraOn(false);
      setIsMuted(true);
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
    }else{
      alert("현재 카메라 공유 중이 아닙니다.")
    }
  };

  const publishScreenTrack = async () => {
    if(checkExistsPublishing()){
       alert("다른 누군가가 이미 방송 중입니다.")
      return;
    }
    if (!room) return;
    if (screenTrack || localVideoTrack) return;

    const [newScreenTrack,newAudioTrack] = await createScreenShareTrack();
    setScreenTrack(newScreenTrack);
    if(newAudioTrack){
      setLocalAudioTrack(newAudioTrack);
    }
    
    await room.localParticipant.publishTrack(newScreenTrack);
    if(newAudioTrack){
      await room.localParticipant.publishTrack(newAudioTrack);
    }
    setIsSharingScreen(true);
    if(newAudioTrack){
      setIsMuted(false);
    }else{
      setIsMuted(true);
    }
    newScreenTrack.on('ended', () => unpublishScreenTrack());
  };

  const unpublishScreenTrack = async () => {
   
    if (!room || !screenTrack){
      alert("현재 화면 공유 중이 아닙니다")
    } else{
      await room.localParticipant.unpublishTrack(screenTrack);
      if(localAudioTrack){
        await room.localParticipant.unpublishTrack(localAudioTrack);
        localAudioTrack.stop();
      }
      
      screenTrack.stop();
      setScreenTrack(null);
      setLocalAudioTrack(null);
      setIsSharingScreen(false);
      setIsMuted(true);
    }
  };

  const publishAudioTrack = async ()=>{
    if(!room || checkExistsPublishing()){
       alert("다른 누군가가 이미 방송 중입니다.")
       return;
    } 
    

    if(localAudioTrack) return;

    if(!localAudioTrack){
      const audioTrack = await createLocalAudioTrack();
      setLocalAudioTrack(audioTrack);
      setIsMuted(false);
      await room.localParticipant.publishTrack(audioTrack);      
    }
  }
  const unPublishAudioTrack = async() =>{
    if(!room) return;
    if(localAudioTrack){
      await room.localParticipant.unpublishTrack(localAudioTrack);
      localAudioTrack.stop();
      setLocalAudioTrack(null);
      setIsMuted(true);
    }
  }

  const createScreenShareTrack = async (): Promise<[LocalVideoTrack,LocalAudioTrack|undefined]> => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: 1280,
        height: 720,
        frameRate: 15
      },
      audio: true
    });

    const [videoTrack] = stream.getVideoTracks();
    const [audioTrack] = stream.getAudioTracks();

    console.log("videoTrack : "+videoTrack);
    console.log("audioTrack :"+audioTrack);
    
    
    return [new LocalVideoTrack(videoTrack),audioTrack ? new LocalAudioTrack(audioTrack):audioTrack];
  };

  const checkExistsPublishing = ()=>{
    if(room){
    for(let remoteParticipant of room.remoteParticipants.values()){
      if(remoteParticipant.trackPublications.size > 0)
        return true;
    }
  }
}


  return (
    <Card title={`📹 화상 회의: ${roomName}`} className="h-full flex flex-col">
      <div className="flex flex-grow min-h-[calc(100vh-16rem)]">
        <div className={`flex-grow ${showChat ? 'md:w-3/4' : 'w-full'} transition-all duration-300`}>
          <div className="relative min-h-[300px] sm:min-h-[400px] bg-neutral-800 p-3 rounded-md">
            {remoteVideoTrack && <VideoTrackView {...remoteVideoTrack} />}
            {!remoteVideoTrack && screenTrack && <VideoTrackView track={screenTrack} identity='내 화면 공유'/>}
            {!remoteVideoTrack && localVideoTrack && <VideoTrackView track={localVideoTrack} identity='내 카메라 공유'/>}
            <div className="absolute top-3 right-3 flex flex-col items-end space-y-2 z-10">
              {participants.map((member) => (
                <div key={member.id} className="bg-neutral-700 rounded-lg flex items-center px-2 py-1 text-white text-xs shadow w-36">
                  <img
                    src={member.profileImageUrl || `https://picsum.photos/seed/${member.id}/60/60`}
                    alt={member.name}
                    className={`w-8 h-8 rounded-full mr-2 ${!isCameraOn && member.id === currentUser!.id ? 'opacity-50' : ''}`}
                  />
                  <div className="flex-1 truncate">
                    <p>{member.email}</p>
                    {/* {isMuted && ''+member.userId === currentUser!.id && <p className="text-red-400 text-[10px]">음소거</p>} */}
                    {/* {!isCameraOn && ''+member.userId === currentUser!.id && <p className="text-yellow-400 text-[10px]">카메라 꺼짐</p>} */}
                    <p>{member.name}{''+member.userId === currentUser!.id && '(나)'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center items-center space-x-2 sm:space-x-3 p-3 bg-neutral-100 rounded-md">
            <Button onClick={() => {
              if(isMuted) publishAudioTrack();
              else unPublishAudioTrack();
            }} variant={isMuted ? "danger" : "outline"} size="sm">
              {isMuted ? "음소거 해제" : "음소거"}
            </Button>
            <Button onClick={() => {if(!isCameraOn)publishCameraTrack()
              else unPublishCameraTrack()
            }} variant={isCameraOn ?"outline": "danger" } size="sm">
              {isCameraOn ? "카메라 끄기" : "카메라 켜기"}
            </Button>
            <Button onClick={() => {if(!isSharingScreen)publishScreenTrack()
              else unpublishScreenTrack()
            }} variant={isSharingScreen ?"outline": "danger" } size="sm">{isSharingScreen ? "화면 공유 끄기" : "화면 공유"}</Button>
            <Button onClick={() => setShowChat(!showChat)} variant="ghost" size="sm" title={showChat ? "채팅 숨기기" : "채팅 보기"}>
              <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
            </Button>
            <Button variant="danger" size="sm" onClick={() => navigate(`/ws/${workspaceId || ''}`)}>회의 종료</Button>
          </div>
        </div>

        {showChat && (
          <div className="w-full md:w-1/4 pl-0 md:pl-3 mt-4 md:mt-0 md:border-l md:border-neutral-300 flex flex-col h-auto md:h-full transition-all duration-300">
            <h4 className="text-sm font-semibold mb-2 text-neutral-700">회의 중 채팅</h4>
            <div className="bg-neutral-50 border border-neutral-200 rounded p-2 overflow-y-auto text-xs space-y-2 mb-2" style={{ height: '300px' }}>
              {chatMessage.map((msg, index) => (<WebSocketChatMessage key={index} {...msg} />))}
              <div ref={chatEndRef} />
            </div>
            <Input
              type="text"
              placeholder="채팅 메시지..."
              className="text-sm !py-1.5"
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  sendMessage(chatInput);
                }
              }}
              value={chatInput}
            />
          </div>
        )}
      </div>
    </Card>
  );
};