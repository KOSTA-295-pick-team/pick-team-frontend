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
    const { joinWorkspace, joinWorkspaceById, loading, setCurrentWorkspace } = useAuth();
    const navigate = useNavigate();

    const handleCloseAndReset = () => {
        setInviteCode('');
        setPassword('');
        setError('');
        onClose();
    };

    const extractWorkspaceId = (input: string): { type: 'url' | 'code', value: string } => {
        const trimmedInput = input.trim();
        
        // URL에서 초대 코드 추출: #/abc123def 형태
        const urlMatch = trimmedInput.match(/#\/([a-zA-Z0-9_-]+)$/);
        if (urlMatch) {
            return { type: 'code', value: urlMatch[1] };
        }
        
        // 숫자만 있는 경우 (워크스페이스 ID)
        if (/^\d+$/.test(trimmedInput)) {
            return { type: 'url', value: trimmedInput };
        }
        
        // 영문자+숫자 조합 (초대 코드)
        return { type: 'code', value: trimmedInput };
    };

    const handleJoinWorkspace = async () => {
        setError('');
        
        if (!inviteCode.trim()) {
            setError('초대 코드 또는 초대 링크를 입력해주세요.');
            return;
        }

        try {
            const { type, value } = extractWorkspaceId(inviteCode);
            let workspace;

            if (type === 'url') {
                // 워크스페이스 ID로 직접 참여
                workspace = await joinWorkspaceById(value, password.trim() || undefined);
            } else {
                // 기존 초대 코드로 참여
                workspace = await joinWorkspace({
                    inviteCode: value,
                    password: password.trim() || undefined
                });
            }

            if (workspace) {
                setCurrentWorkspace(workspace);
                navigate(`/ws/${workspace.id}`);
                handleCloseAndReset();
            } else {
                setError('워크스페이스 참여에 실패했습니다.');
            }
        } catch (err: any) {
            console.error('Join workspace error:', err);
            if (err.message?.includes('차단') || err.message?.includes('블랙리스트')) {
                setError('이 워크스페이스에서 차단된 사용자입니다. 참여할 수 없습니다.');
            } else if (err.message?.includes('비밀번호')) {
                setError('워크스페이스 비밀번호가 틀렸습니다.');
            } else {
                setError(err.message || '워크스페이스 참여 중 오류가 발생했습니다.');
            }
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
                <p className="text-sm text-neutral-600">
                    워크스페이스 초대 링크 또는 초대 코드를 입력해주세요.
                </p>
                <Input
                    label="초대 링크 또는 코드"
                    placeholder="예: http://localhost:5173/#/abc123def 또는 abc123def"
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
                <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">지원하는 형식:</p>
                    <ul className="space-y-1">
                        <li>• 초대 링크: http://localhost:5173/#/abc123def</li>
                        <li>• 워크스페이스 ID: 1</li>
                        <li>• 초대 코드: abc123def</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

export default JoinWorkspaceModal; 