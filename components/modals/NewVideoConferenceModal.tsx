import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../AuthContext';

interface NewVideoConferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewVideoConferenceModal: React.FC<NewVideoConferenceModalProps> = ({ isOpen, onClose }) => {
    const { currentWorkspace } = useAuth();
    const navigate = useNavigate();
    const [roomName, setRoomName] = useState('');

    const handleStartConference = () => {
        if (!roomName.trim()) {
            alert("회의실 이름을 입력해주세요.");
            return;
        }
        if (!currentWorkspace) {
            alert("워크스페이스 정보를 찾을 수 없습니다.");
            return;
        }
        navigate(`/ws/${currentWorkspace.id}/video/live?room=${encodeURIComponent(roomName.trim())}`);
        setRoomName('');
        onClose();
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