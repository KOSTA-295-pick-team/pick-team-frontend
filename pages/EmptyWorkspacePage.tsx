import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../components';
import { 
    PlusCircleIcon, 
    UserGroupIcon, 
    LockClosedIcon,
    RocketLaunchIcon,
    LinkIcon,
    UsersIcon,
    ChatBubbleLeftRightIcon,
    VideoCameraIcon
} from '@heroicons/react/24/outline';

const EmptyWorkspacePage: React.FC = () => {
    const { createWorkspace, joinWorkspace, loading, setCurrentWorkspace } = useAuth();
    const navigate = useNavigate();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [joinModalOpen, setJoinModalOpen] = useState(false);

    // 워크스페이스 생성 모달 상태
    const [createForm, setCreateForm] = useState({
        name: '',
        iconUrl: '',
        password: ''
    });
    const [createError, setCreateError] = useState('');

    // 워크스페이스 참가 모달 상태
    const [joinForm, setJoinForm] = useState({
        inviteCode: '',
        password: ''
    });
    const [joinError, setJoinError] = useState('');

    const handleCreateWorkspace = async () => {
        setCreateError('');
        
        if (!createForm.name.trim()) {
            setCreateError('워크스페이스 이름을 입력해주세요.');
            return;
        }

        try {
            const workspace = await createWorkspace({
                name: createForm.name.trim(),
                iconUrl: createForm.iconUrl.trim() || undefined,
                password: createForm.password.trim() || undefined
            });

            if (workspace) {
                setCurrentWorkspace(workspace);
                navigate(`/ws/${workspace.id}`);
                setCreateModalOpen(false);
                setCreateForm({ name: '', iconUrl: '', password: '' });
            } else {
                setCreateError('워크스페이스 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error('Create workspace error:', err);
            setCreateError('워크스페이스 생성 중 오류가 발생했습니다.');
        }
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
        setJoinError('');
        
        if (!joinForm.inviteCode.trim()) {
            setJoinError('초대 코드 또는 초대 링크를 입력해주세요.');
            return;
        }

        try {
            const { type, value } = extractWorkspaceId(joinForm.inviteCode);
            let workspace;

            if (type === 'url') {
                // 워크스페이스 ID로 직접 참여 (기존 기능 유지)
                workspace = await joinWorkspace({
                    inviteCode: value,
                    password: joinForm.password.trim() || undefined
                });
            } else {
                // 초대 코드로 참여
                workspace = await joinWorkspace({
                    inviteCode: value,
                    password: joinForm.password.trim() || undefined
                });
            }

            if (workspace) {
                setCurrentWorkspace(workspace);
                navigate(`/ws/${workspace.id}`);
                setJoinModalOpen(false);
                setJoinForm({ inviteCode: '', password: '' });
            } else {
                setJoinError('워크스페이스 참가에 실패했습니다.');
            }
        } catch (err: any) {
            console.error('Join workspace error:', err);
            if (err.message?.includes('차단') || err.message?.includes('블랙리스트')) {
                setJoinError('이 워크스페이스에서 차단된 사용자입니다. 참여할 수 없습니다.');
            } else if (err.message?.includes('비밀번호')) {
                setJoinError('워크스페이스 비밀번호가 틀렸습니다.');
            } else {
                setJoinError(err.message || '워크스페이스 참가 중 오류가 발생했습니다.');
            }
        }
    };

    const resetCreateModal = () => {
        setCreateForm({ name: '', iconUrl: '', password: '' });
        setCreateError('');
        setCreateModalOpen(false);
    };

    const resetJoinModal = () => {
        setJoinForm({ inviteCode: '', password: '' });
        setJoinError('');
        setJoinModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-light to-primary flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* 메인 컨텐츠 */}
                <div className="text-center mb-12">
                    <div className="mb-8">
                        <RocketLaunchIcon className="w-24 h-24 mx-auto text-white mb-4" />
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            PickTeam에 오신 걸 환영합니다! 🎉
                        </h1>
                        <p className="text-xl text-white/90 mb-2">
                            아직 참여한 워크스페이스가 없네요
                        </p>
                        <p className="text-lg text-white/80">
                            새로운 워크스페이스를 만들거나 기존 워크스페이스에 참가해보세요
                        </p>
                    </div>
                </div>

                {/* 액션 카드들 */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* 워크스페이스 생성 카드 */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                                <PlusCircleIcon className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                                새 워크스페이스 만들기
                            </h2>
                            <p className="text-neutral-600">
                                팀을 위한 새로운 협업 공간을 만들어보세요
                            </p>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center text-sm text-neutral-600">
                                <UserGroupIcon className="w-4 h-4 mr-2 text-primary" />
                                팀원 초대 및 관리
                            </div>
                            <div className="flex items-center text-sm text-neutral-600">
                                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2 text-primary" />
                                실시간 채팅 및 소통
                            </div>
                            <div className="flex items-center text-sm text-neutral-600">
                                <VideoCameraIcon className="w-4 h-4 mr-2 text-primary" />
                                화상회의 및 협업 도구
                            </div>
                        </div>

                        <Button 
                            onClick={() => setCreateModalOpen(true)}
                            className="w-full"
                            disabled={loading}
                        >
                            워크스페이스 만들기
                        </Button>
                    </div>

                    {/* 워크스페이스 참가 카드 */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LinkIcon className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                                워크스페이스 참가하기
                            </h2>
                            <p className="text-neutral-600">
                                초대 코드로 기존 워크스페이스에 참가하세요
                            </p>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center text-sm text-neutral-600">
                                <UsersIcon className="w-4 h-4 mr-2 text-green-600" />
                                팀원들과 즉시 협업 시작
                            </div>
                            <div className="flex items-center text-sm text-neutral-600">
                                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2 text-green-600" />
                                진행 중인 프로젝트 참여
                            </div>
                            <div className="flex items-center text-sm text-neutral-600">
                                <RocketLaunchIcon className="w-4 h-4 mr-2 text-green-600" />
                                빠른 업무 적응
                            </div>
                        </div>

                        <Button 
                            onClick={() => setJoinModalOpen(true)}
                            variant="outline"
                            className="w-full border-green-600 text-green-600 hover:bg-green-50"
                            disabled={loading}
                        >
                            워크스페이스 참가하기
                        </Button>
                    </div>
                </div>

                {/* 하단 도움말 */}
                <div className="text-center">
                    <p className="text-white/80 text-sm">
                        궁금한 점이 있으시면 언제든지 문의해주세요 • 
                        <span className="ml-1 font-medium">support@pickteam.com</span>
                    </p>
                </div>
            </div>

            {/* 워크스페이스 생성 모달 */}
            <Modal 
                isOpen={createModalOpen} 
                onClose={resetCreateModal} 
                title="새 워크스페이스 만들기"
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={resetCreateModal} disabled={loading}>
                            취소
                        </Button>
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
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                        Icon={UserGroupIcon}
                        disabled={loading}
                        required
                    />
                    <Input
                        label="아이콘 (선택사항)"
                        placeholder="예: 🚀, 💻, 팀, T"
                        value={createForm.iconUrl}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, iconUrl: e.target.value }))}
                        disabled={loading}
                    />
                    <Input
                        label="비밀번호 (선택사항)"
                        type="password"
                        placeholder="워크스페이스 보안을 위한 비밀번호"
                        value={createForm.password}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        Icon={LockClosedIcon}
                        disabled={loading}
                    />
                    <div className="text-xs text-neutral-500">
                        <p>• 워크스페이스를 생성하면 자동으로 소유자가 됩니다.</p>
                        <p>• 초대 코드가 자동 생성되어 팀원을 초대할 수 있습니다.</p>
                    </div>
                    {createError && <p className="text-sm text-red-500">{createError}</p>}
                </div>
            </Modal>

            {/* 워크스페이스 참가 모달 */}
            <Modal 
                isOpen={joinModalOpen} 
                onClose={resetJoinModal} 
                title="워크스페이스 참가하기"
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={resetJoinModal} disabled={loading}>
                            취소
                        </Button>
                        <Button onClick={handleJoinWorkspace} disabled={loading}>
                            {loading ? '참가 중...' : '워크스페이스 참가'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">초대 코드를 입력해 워크스페이스에 참가하세요.</p>
                    <Input
                        label="초대 링크 또는 코드"
                        placeholder="예: http://localhost:5173/#/BD1B4E51 또는 BD1B4E51"
                        value={joinForm.inviteCode}
                        onChange={(e) => setJoinForm(prev => ({ ...prev, inviteCode: e.target.value }))}
                        Icon={LinkIcon}
                        disabled={loading}
                        required
                    />
                    <Input
                        label="비밀번호 (선택사항)"
                        type="password"
                        placeholder="워크스페이스에 비밀번호가 설정된 경우"
                        value={joinForm.password}
                        onChange={(e) => setJoinForm(prev => ({ ...prev, password: e.target.value }))}
                        Icon={LockClosedIcon}
                        disabled={loading}
                    />
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
                        <p className="font-medium mb-1">지원하는 형식:</p>
                        <div className="space-y-1">
                            <p>• 초대 링크: http://localhost:5173/#/BD1B4E51</p>
                            <p>• 워크스페이스 ID: 1</p>
                            <p>• 초대 코드: BD1B4E51</p>
                        </div>
                    </div>
                    {joinError && <p className="text-sm text-red-500">{joinError}</p>}
                </div>
            </Modal>
        </div>
    );
};

export default EmptyWorkspacePage; 