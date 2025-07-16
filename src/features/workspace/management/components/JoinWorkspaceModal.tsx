import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Input } from '@/components/ui';
import { LinkIcon } from '@/assets/icons';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace'; // useAuth -> useWorkspace

interface JoinWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialInviteCode?: string;
}

const JoinWorkspaceModal: React.FC<JoinWorkspaceModalProps> = ({ isOpen, onClose, initialInviteCode }) => {
    const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { joinWorkspace, loading, setCurrentWorkspaceById } = useWorkspace();
    const navigate = useNavigate();

    // initialInviteCode가 변경될 때 inviteCode 업데이트
    React.useEffect(() => {
        if (initialInviteCode) {
            setInviteCode(initialInviteCode);
        }
    }, [initialInviteCode]);

    const handleCloseAndReset = () => {
        setInviteCode('');
        setPassword('');
        setError('');
        onClose();
    };

    const extractWorkspaceId = (input: string): { type: 'url' | 'code', value: string } => {
        const trimmedInput = input.trim();
        
        // URL에서 초대 코드 추출: 다양한 URL 형태 지원
        // 예: http://localhost:5173/#/ws/tFzUtAN9, https://example.com/#/ws/abc123, #/ws/def456, /ws/ghi789
        const urlMatch = trimmedInput.match(/(?:https?:\/\/[^\/]+)?(?:\/#)?\/ws\/([a-zA-Z0-9]+)/);
        if (urlMatch) {
            return { type: 'code', value: urlMatch[1] };
        }
        
        // 해시 프래그먼트만 있는 경우: #/ws/abc123
        const hashMatch = trimmedInput.match(/#\/ws\/([a-zA-Z0-9]+)/);
        if (hashMatch) {
            return { type: 'code', value: hashMatch[1] };
        }
        
        // 숫자만 있는 경우 (워크스페이스 ID)
        if (/^\d+$/.test(trimmedInput)) {
            return { type: 'url', value: trimmedInput };
        }
        
        // 영문자+숫자 조합 (초대 코드) - 백엔드에서 생성된 6~15자리 코드
        if (/^[a-zA-Z0-9]{6,15}$/.test(trimmedInput)) {
            return { type: 'code', value: trimmedInput };
        }
        
        // 기본적으로 초대 코드로 처리
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

            // 숫자인 경우 (워크스페이스 ID)는 보안상 허용하지 않음
            if (type === 'url') {
                setError('워크스페이스 ID로는 참여할 수 없습니다. 초대 코드를 사용해주세요.');
                return;
            }

            // 초대 코드로만 참여 가능
            workspace = await joinWorkspace({
                inviteCode: value,
                password: password.trim() || undefined
            });

            if (workspace) {
                // 워크스페이스 ID로 설정하고 네비게이션
                setCurrentWorkspaceById(workspace.id);
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
                    placeholder="예: abc123def 또는 http://localhost:5173/#/ws/abc123def"
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
                        <li>• 초대 코드: abc123def (8-12자리)</li>
                        <li>• 초대 링크: http://localhost:5173/#/ws/abc123def</li>
                    </ul>
                    <p className="text-red-600 text-xs mt-2">
                        ⚠️ 보안상 워크스페이스 ID로는 참여할 수 없습니다.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default JoinWorkspaceModal; 