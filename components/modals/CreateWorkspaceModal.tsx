import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserGroupIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../AuthContext';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [iconUrl, setIconUrl] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { createWorkspace, loading, setCurrentWorkspace } = useAuth();
    const navigate = useNavigate();

    const handleCloseAndReset = () => {
        setName('');
        setIconUrl('');
        setPassword('');
        setError('');
        onClose();
    };

    const handleCreateWorkspace = async () => {
        setError('');
        
        if (!name.trim()) {
            setError('워크스페이스 이름을 입력해주세요.');
            return;
        }

        try {
            const workspace = await createWorkspace({
                name: name.trim(),
                iconUrl: iconUrl.trim() || undefined,
                password: password.trim() || undefined
            });

            if (workspace) {
                setCurrentWorkspace(workspace);
                navigate(`/ws/${workspace.id}`);
                handleCloseAndReset();
            } else {
                setError('워크스페이스 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error('Create workspace error:', err);
            setError('워크스페이스 생성 중 오류가 발생했습니다.');
        }
    };
    
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleCloseAndReset} 
            title="새 워크스페이스 만들기"
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={handleCloseAndReset} disabled={loading}>취소</Button>
                    <Button onClick={handleCreateWorkspace} disabled={loading}>
                        {loading ? '생성 중...' : '워크스페이스 생성'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-neutral-600">새로운 워크스페이스를 생성해보세요.</p>
                <Input
                    label="워크스페이스 이름"
                    placeholder="예: 우리 팀 프로젝트"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    Icon={UserGroupIcon}
                    disabled={loading}
                    required
                />
                <Input
                    label="아이콘 (선택사항)"
                    placeholder="예: 🚀, 💻, 팀, T"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    disabled={loading}
                />
                <Input
                    label="비밀번호 (선택사항)"
                    type="password"
                    placeholder="워크스페이스 보안을 위한 비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    Icon={LockClosedIcon}
                    disabled={loading}
                />
                <div className="text-xs text-neutral-500">
                    <p>• 워크스페이스를 생성하면 자동으로 소유자가 됩니다.</p>
                    <p>• 초대 코드가 자동 생성되어 팀원을 초대할 수 있습니다.</p>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        </Modal>
    );
};

export default CreateWorkspaceModal; 