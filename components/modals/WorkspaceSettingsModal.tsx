import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LinkIcon, UsersIcon, ShieldCheckIcon, ExclamationTriangleIcon, UserMinusIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../AuthContext';

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({ isOpen, onClose }) => {
    const { 
        currentWorkspace, 
        currentUser, 
        updateWorkspace, 
        kickMember, 
        banMember, 
        generateNewInviteCode,
        deleteWorkspace,
        loading 
    } = useAuth();
    const [activeTab, setActiveTab] = useState<'invite' | 'members' | 'security' | 'danger'>('invite');
    const [workspacePassword, setWorkspacePassword] = useState('');
    const [showConfirmDelete, setShowConfirmDelete] = useState<{type: string, id: string, name: string} | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (currentWorkspace) {
            setWorkspacePassword(''); // 보안상 비밀번호는 비워둠
        }
    }, [currentWorkspace]);

    if (!currentWorkspace || !currentUser) return null;

    const handleCopyLink = () => {
        const baseUrl = window.location.origin;
        const inviteUrl = `${baseUrl}/${currentWorkspace.inviteCode}`;
        navigator.clipboard.writeText(inviteUrl)
            .then(() => alert('초대 링크가 복사되었습니다!'))
            .catch(() => alert('복사에 실패했습니다.'));
    };
    
    const handleSavePassword = async () => {
        if (!currentWorkspace) return;
        
        const success = await updateWorkspace(currentWorkspace.id, {
            password: workspacePassword.trim() || undefined
        });
        
        if (success) {
            alert('워크스페이스 비밀번호가 업데이트되었습니다.');
            onClose();
        } else {
            alert('비밀번호 업데이트에 실패했습니다.');
        }
    };

    const handleGenerateNewInviteCode = async () => {
        if (!currentWorkspace) return;
        
        const newCode = await generateNewInviteCode(currentWorkspace.id);
        if (newCode) {
            alert('새 초대 코드가 생성되었습니다.');
        } else {
            alert('초대 코드 생성에 실패했습니다.');
        }
    };

    const handleKickMember = (memberId: string, memberName: string) => {
        setShowConfirmDelete({type: 'kick', id: memberId, name: memberName});
    };
    
    const handleBanMember = (memberId: string, memberName: string) => {
         setShowConfirmDelete({type: 'ban', id: memberId, name: memberName});
    };

    const handleDeleteWorkspace = async () => {
        if (!currentWorkspace || deleteConfirmText !== currentWorkspace.name) {
            alert('워크스페이스 이름을 정확히 입력해주세요.');
            return;
        }

        const success = await deleteWorkspace(currentWorkspace.id);
        if (success) {
            alert('워크스페이스가 성공적으로 삭제되었습니다.');
            onClose();
            navigate('/');
        } else {
            alert('워크스페이스 삭제에 실패했습니다.');
        }
    };

    const confirmAction = async () => {
        if (!showConfirmDelete || !currentWorkspace) return;
        
        let success = false;
        if (showConfirmDelete.type === 'kick') {
            success = await kickMember(currentWorkspace.id, showConfirmDelete.id);
        } else if (showConfirmDelete.type === 'ban') {
            success = await banMember(currentWorkspace.id, showConfirmDelete.id);
        }
        
        if (success) {
            alert(`${showConfirmDelete.name}님을 워크스페이스에서 ${showConfirmDelete.type === 'kick' ? '추방' : '차단'}했습니다.`);
        } else {
            alert(`${showConfirmDelete.type === 'kick' ? '추방' : '차단'}에 실패했습니다.`);
        }
        setShowConfirmDelete(null);
    }

    const TABS_CONFIG = [
        { id: 'invite', label: '초대', icon: <LinkIcon className="w-5 h-5 mr-2" /> },
        { id: 'members', label: '멤버 관리', icon: <UsersIcon className="w-5 h-5 mr-2" /> },
        { id: 'security', label: '보안', icon: <ShieldCheckIcon className="w-5 h-5 mr-2" /> },
        { id: 'danger', label: '위험 구역', icon: <ExclamationTriangleIcon className="w-5 h-5 mr-2" /> },
    ];

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={`${currentWorkspace.name} 설정`}
            footer={ 
                activeTab === 'security' ? (
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={onClose}>취소</Button>
                        <Button onClick={handleSavePassword}>비밀번호 저장</Button>
                    </div>
                ) : activeTab === 'danger' ? (
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={onClose}>취소</Button>
                        <Button 
                            variant="danger" 
                            onClick={handleDeleteWorkspace}
                            disabled={deleteConfirmText !== currentWorkspace.name || loading}
                        >
                            {loading ? '삭제 중...' : '워크스페이스 삭제'}
                        </Button>
                    </div>
                ) : <Button variant="primary" onClick={onClose}>닫기</Button>
            }
        >
            <div className="mb-4 border-b border-neutral-200">
                <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                    {TABS_CONFIG.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'security' | 'danger' | 'invite' | 'members')}
                        className={`whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm flex items-center
                        ${activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'invite' && (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">워크스페이스에 팀원을 초대하세요. 아래 초대 링크를 공유해주세요.</p>
                    <Input 
                        label="초대 링크"
                        value={`${window.location.origin}/${currentWorkspace.inviteCode || 'loading...'}`} 
                        readOnly 
                        Icon={LinkIcon}
                    />
                    <div className="flex space-x-2">
                        <Button onClick={handleCopyLink} className="flex-1" disabled={loading}>링크 복사</Button>
                        <Button variant="outline" onClick={handleGenerateNewInviteCode} className="flex-1" disabled={loading}>
                            {loading ? '생성 중...' : '새 코드 생성'}
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === 'members' && (
                <div className="space-y-3">
                    <p className="text-sm text-neutral-600 mb-2">{currentWorkspace.members.length}명의 멤버</p>
                    <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                    {currentWorkspace.members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded-md">
                            <div className="flex items-center space-x-2">
                                <img src={member.profilePictureUrl || `https://picsum.photos/seed/${member.id}/32/32`} alt={member.name} className="w-8 h-8 rounded-full"/>
                                <span>{member.name} {member.id === currentUser.id && <span className="text-xs text-primary">(나)</span>}</span>
                            </div>
                            {member.id !== currentUser.id && ( // Cannot kick/ban self
                                <div className="space-x-1">
                                    <Button size="sm" variant="ghost" className="text-orange-600 hover:bg-orange-100" onClick={() => handleKickMember(member.id, member.name || '해당 멤버')} title="추방">
                                        <UserMinusIcon className="w-4 h-4"/>
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleBanMember(member.id, member.name || '해당 멤버')} title="차단">
                                        <NoSymbolIcon className="w-4 h-4"/>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="space-y-4">
                    <Input 
                        label="워크스페이스 비밀번호 설정"
                        type="password"
                        value={workspacePassword}
                        onChange={e => setWorkspacePassword(e.target.value)}
                        placeholder="비밀번호 미설정 시 공개"
                    />
                    <p className="text-xs text-neutral-500">
                        비밀번호를 설정하면, 워크스페이스에 참여하려는 사용자는 이 비밀번호를 입력해야 합니다.
                    </p>
                </div>
            )}

            {activeTab === 'danger' && (
                <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex items-center mb-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                            <h3 className="text-sm font-semibold text-red-800">워크스페이스 영구 삭제</h3>
                        </div>
                        <p className="text-sm text-red-700 mb-4">
                            이 작업은 되돌릴 수 없습니다. 워크스페이스와 관련된 모든 데이터(팀, 채팅, 파일 등)가 영구적으로 삭제됩니다.
                        </p>
                        <Input
                            label={`확인을 위해 워크스페이스 이름 "${currentWorkspace.name}"을 입력하세요`}
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder={currentWorkspace.name}
                            className="mb-3"
                        />
                        <div className="text-xs text-red-600 space-y-1">
                            <p>• 모든 팀 프로젝트가 삭제됩니다</p>
                            <p>• 채팅 기록이 모두 사라집니다</p>
                            <p>• 업로드된 파일들이 삭제됩니다</p>
                            <p>• 멤버들은 더 이상 이 워크스페이스에 접근할 수 없습니다</p>
                        </div>
                    </div>
                </div>
            )}
        </Modal>

        {showConfirmDelete && (
            <Modal
                isOpen={!!showConfirmDelete}
                onClose={() => setShowConfirmDelete(null)}
                title={`${showConfirmDelete.type === 'kick' ? '멤버 추방' : '멤버 차단'} 확인`}
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={() => setShowConfirmDelete(null)}>취소</Button>
                        <Button variant={showConfirmDelete.type === 'kick' ? 'primary' : 'danger'} onClick={confirmAction}>
                            {showConfirmDelete.type === 'kick' ? '추방' : '차단'}
                        </Button>
                    </div>
                }
            >
                <p>{showConfirmDelete.name}님을 워크스페이스에서 {showConfirmDelete.type === 'kick' ? '추방' : '차단'}하시겠습니까?</p>
            </Modal>
        )}
        </>
    );
};

export default WorkspaceSettingsModal; 