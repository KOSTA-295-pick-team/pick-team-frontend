import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LinkIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../AuthContext';

interface JoinWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const JoinWorkspaceModal: React.FC<JoinWorkspaceModalProps> = ({ isOpen, onClose }) => {
    const [inviteCode, setInviteCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { joinWorkspace, loading, setCurrentWorkspace } = useAuth();
    const navigate = useNavigate();

    const handleCloseAndReset = () => {
        setInviteCode('');
        setPassword('');
        setError('');
        onClose();
    };

    const handleJoinWorkspace = async () => {
        setError('');
        
        if (!inviteCode.trim()) {
            setError('초대 코드를 입력해주세요.');
            return;
        }

        try {
            const workspace = await joinWorkspace({
                inviteCode: inviteCode.trim(),
                password: password.trim() || undefined
            });

            if (workspace) {
                setCurrentWorkspace(workspace);
                navigate(`/ws/${workspace.id}`);
                handleCloseAndReset();
            } else {
                setError('워크스페이스 참여에 실패했습니다.');
            }
        } catch (err) {
            console.error('Join workspace error:', err);
            setError('워크스페이스 참여 중 오류가 발생했습니다.');
        }
    };
    
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleCloseAndReset} 
            title="워크스페이스 참여하기"
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={handleCloseAndReset} disabled={loading}>취소</Button>
                    <Button onClick={handleJoinWorkspace} disabled={loading}>
                        {loading ? '참여 중...' : '참여하기'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-neutral-600">워크스페이스 초대 코드를 입력해주세요.</p>
                <Input
                    label="초대 코드"
                    placeholder="예: abc123def"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    Icon={LinkIcon}
                    disabled={loading}
                />
                <Input
                    label="비밀번호 (선택사항)"
                    type="password"
                    placeholder="워크스페이스에 비밀번호가 설정된 경우"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        </Modal>
    );
};

export default JoinWorkspaceModal; 