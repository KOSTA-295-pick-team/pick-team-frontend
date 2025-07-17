import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Input } from '@/components/ui';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { videoApi } from '../api/videoApi';

interface NewVideoConferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVideoConferenceCreated?: () => void;
}

const NewVideoConferenceModal: React.FC<NewVideoConferenceModalProps> = ({ isOpen, onClose, onVideoConferenceCreated }) => {
    const { currentWorkspace } = useWorkspace();
    const navigate = useNavigate();
    const [roomName, setRoomName] = useState('');

    const handleStartConference = async () => {
        if (!roomName.trim()) {
            alert("회의실 이름을 입력해주세요.");
            return;
        }
        if (!currentWorkspace) {
            alert("워크스페이스 정보를 찾을 수 없습니다.");
            return;
        }
        try {
            const videoChannel = await videoApi.createVideoChannel(currentWorkspace.id, roomName);
            // 화상회의 생성 후 목록 새로고침
            if (onVideoConferenceCreated) {
                onVideoConferenceCreated();
            }
            navigate(`/ws/${currentWorkspace.id}/video/live?roomId=${videoChannel.id}&roomName=${encodeURIComponent(videoChannel.name)}`);
            setRoomName('');
            onClose();
        } catch (error: any) {
            console.error("화상회의 생성 실패:", error);
            
            let errorMessage = "화상회의 채널 생성에 실패했습니다.";
            
            // 중복 이름 에러 처리
            if (error.message?.includes("Query did not return a unique result") || 
                error.response?.data?.detail?.includes("Query did not return a unique result")) {
                errorMessage = "같은 이름의 화상회의 방이 이미 존재합니다. 다른 이름을 사용해주세요.";
            } else if (error.response?.data?.detail) {
                errorMessage = `오류: ${error.response.data.detail}`;
            } else if (error.message) {
                errorMessage = `오류: ${error.message}`;
            }
            
            alert(errorMessage);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="새 화상회의 시작" footer={
            <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={onClose}>취소</Button>
                <Button onClick={handleStartConference}>화상회의 시작</Button>
            </div>
        }>
            <Input 
                label="화상회의 방 이름" 
                value={roomName} 
                onChange={e => setRoomName(e.target.value)} 
                placeholder="예: 주간 팀 회의"
                required
            />
        </Modal>
    );
};

export default NewVideoConferenceModal; 