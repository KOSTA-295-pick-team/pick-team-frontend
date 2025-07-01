import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LinkIcon, UsersIcon, ShieldCheckIcon, ExclamationTriangleIcon, UserMinusIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../AuthContext';
import { workspaceApi } from '../../services/api';
import { User } from '../../types';

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
        deleteWorkspace,
        loading 
    } = useAuth();
    const [activeTab, setActiveTab] = useState<'invite' | 'members' | 'blacklist' | 'security' | 'danger'>('invite');
    const [workspacePassword, setWorkspacePassword] = useState('');
    const [showConfirmDelete, setShowConfirmDelete] = useState<{type: string, id: string, name: string} | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    
    // 멤버 목록 상태 추가
    const [members, setMembers] = useState<User[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    
    // 블랙리스트 상태 추가
    const [blacklistedMembers, setBlacklistedMembers] = useState<User[]>([]);
    const [blacklistLoading, setBlacklistLoading] = useState(false);
    const [blacklistError, setBlacklistError] = useState<string | null>(null);
    
    const navigate = useNavigate();

    useEffect(() => {
        if (currentWorkspace) {
            setWorkspacePassword(''); // 보안상 비밀번호는 비워둠
        }
    }, [currentWorkspace]);

    // 멤버 목록 조회
    const fetchMembers = async () => {
        if (!currentWorkspace) return;
        
        setMembersLoading(true);
        setMembersError(null);
        try {
            const memberList = await workspaceApi.getMembers(currentWorkspace.id);
            setMembers(memberList);
        } catch (error: any) {
            console.error('멤버 목록 조회 실패:', error);
            setMembersError(error.message || '멤버 목록을 불러오는데 실패했습니다.');
            // 폴백으로 currentWorkspace.members 사용 (타입 변환)
            const fallbackMembers: User[] = currentWorkspace.members?.map(member => ({
                id: member.id,
                email: `${member.name}@workspace.local`, // 임시 이메일
                name: member.name,
                profilePictureUrl: member.profileImage
            })) || [];
            setMembers(fallbackMembers);
        } finally {
            setMembersLoading(false);
        }
    };

    // 블랙리스트 조회
    const fetchBlacklistedMembers = async () => {
        if (!currentWorkspace) return;
        
        setBlacklistLoading(true);
        setBlacklistError(null);
        try {
            const blacklist = await workspaceApi.getBlacklistedMembers(currentWorkspace.id);
            setBlacklistedMembers(blacklist);
        } catch (error: any) {
            console.error('블랙리스트 조회 실패:', error);
            setBlacklistError(error.message || '블랙리스트를 불러오는데 실패했습니다.');
            setBlacklistedMembers([]);
        } finally {
            setBlacklistLoading(false);
        }
    };

    // 멤버 차단 해제
    const handleUnbanMember = async (memberId: string, memberName: string) => {
        if (!currentWorkspace || !confirm(`${memberName}님의 차단을 해제하시겠습니까?`)) return;

        setActionLoading(true);
        try {
            await workspaceApi.unbanMember(currentWorkspace.id, memberId);
            alert(`✅ ${memberName}님의 차단이 해제되었습니다.`);
            // 블랙리스트 새로고침
            await fetchBlacklistedMembers();
        } catch (error: any) {
            console.error('차단 해제 실패:', error);
            alert(`❌ 차단 해제에 실패했습니다: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    // 멤버 탭 활성화 시 멤버 목록 조회
    useEffect(() => {
        if (activeTab === 'members' && isOpen && currentWorkspace) {
            fetchMembers();
        } else if (activeTab === 'blacklist' && isOpen && currentWorkspace) {
            fetchBlacklistedMembers();
        }
    }, [activeTab, isOpen, currentWorkspace]);

    if (!currentWorkspace || !currentUser) return null;

    const handleCopyLink = () => {
        const baseUrl = window.location.origin;
        const inviteUrl = `${baseUrl}/#/${currentWorkspace.url}`;
        navigator.clipboard.writeText(inviteUrl)
            .then(() => alert('✅ 초대 링크가 복사되었습니다!\n참여를 원하는 사람에게 공유해주세요.'))
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

    // 새 초대 코드 생성 기능은 제거됨 - URL 기반 고정 초대 링크 사용

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
        
        setActionLoading(true);
        let success = false;
        const actionType = showConfirmDelete.type === 'kick' ? '내보내기' : '차단';
        
        try {
            if (showConfirmDelete.type === 'kick') {
                success = await kickMember(currentWorkspace.id, showConfirmDelete.id);
            } else if (showConfirmDelete.type === 'ban') {
                success = await banMember(currentWorkspace.id, showConfirmDelete.id);
            }
            
            if (success) {
                // 성공 메시지 표시 후 확인 모달 닫기
                alert(`✅ ${showConfirmDelete.name}님이 워크스페이스에서 ${actionType}되었습니다.\n멤버 목록이 업데이트되었습니다.`);
                setShowConfirmDelete(null);
                // 멤버 목록 새로고침
                await fetchMembers();
            } else {
                alert(`❌ ${actionType}에 실패했습니다. 다시 시도해주세요.`);
            }
        } catch (error) {
            console.error(`${actionType} 오류:`, error);
            alert(`❌ ${actionType} 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.`);
        } finally {
            setActionLoading(false);
        }
    }

    const TABS_CONFIG = [
        { id: 'invite', label: '초대', icon: <LinkIcon className="w-5 h-5 mr-2" /> },
        { id: 'members', label: '멤버 관리', icon: <UsersIcon className="w-5 h-5 mr-2" /> },
        { id: 'blacklist', label: '차단 목록', icon: <NoSymbolIcon className="w-5 h-5 mr-2" /> },
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
                        onClick={() => setActiveTab(tab.id as 'security' | 'danger' | 'invite' | 'members' | 'blacklist')}
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
                        value={`${window.location.origin}/#/${currentWorkspace.url || 'loading...'}`} 
                        readOnly 
                        Icon={LinkIcon}
                    />
                    <div className="flex space-x-2">
                        <Button onClick={handleCopyLink} className="w-full" disabled={loading}>초대 링크 복사</Button>
                    </div>
                </div>
            )}

            {activeTab === 'members' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-600">
                            {membersLoading ? '멤버 목록 로딩 중...' : 
                             membersError ? '멤버 목록 조회 실패' :
                             `${members.length}명의 멤버`}
                        </p>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={fetchMembers}
                            disabled={membersLoading}
                            title="새로고침"
                        >
                            🔄
                        </Button>
                    </div>
                    
                    {membersError && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-600">{membersError}</p>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={fetchMembers}
                                disabled={membersLoading}
                                className="mt-2"
                            >
                                다시 시도
                            </Button>
                        </div>
                    )}
                    
                    <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                    {membersLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded-md">
                            <div className="flex items-center space-x-2">
                                <img 
                                    src={member.profilePictureUrl || `https://picsum.photos/seed/${member.id}/32/32`} 
                                    alt={member.name} 
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                        {member.name} 
                                        {member.id === currentUser.id && <span className="text-xs text-primary ml-1">(나)</span>}
                                    </span>
                                    <span className="text-xs text-neutral-500">{member.email}</span>
                                </div>
                            </div>
                            {member.id !== currentUser.id && ( // Cannot kick/ban self
                                <div className="space-x-1">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-orange-600 hover:bg-orange-100" 
                                        onClick={() => handleKickMember(member.id, member.name || '해당 멤버')} 
                                        title="내보내기"
                                        disabled={loading || actionLoading || membersLoading}
                                    >
                                        <UserMinusIcon className="w-4 h-4"/>
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-red-600 hover:bg-red-100" 
                                        onClick={() => handleBanMember(member.id, member.name || '해당 멤버')} 
                                        title="차단"
                                        disabled={loading || actionLoading || membersLoading}
                                    >
                                        <NoSymbolIcon className="w-4 h-4"/>
                                    </Button>
                                </div>
                            )}
                        </div>
                        ))
                    )}
                    </div>
                </div>
            )}

            {activeTab === 'blacklist' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-600">
                            {blacklistLoading ? '차단 목록 로딩 중...' : 
                             blacklistError ? '차단 목록 조회 실패' :
                             `${blacklistedMembers.length}명의 차단된 멤버`}
                        </p>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={fetchBlacklistedMembers}
                            disabled={blacklistLoading}
                            title="새로고침"
                        >
                            🔄
                        </Button>
                    </div>
                    
                    {blacklistError && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-600">{blacklistError}</p>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={fetchBlacklistedMembers}
                                disabled={blacklistLoading}
                                className="mt-2"
                            >
                                다시 시도
                            </Button>
                        </div>
                    )}
                    
                    <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                    {blacklistLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : blacklistedMembers.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500">
                            <NoSymbolIcon className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                            <p>차단된 멤버가 없습니다.</p>
                        </div>
                    ) : (
                        blacklistedMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center space-x-2">
                                <img 
                                    src={member.profilePictureUrl || `https://picsum.photos/seed/${member.id}/32/32`} 
                                    alt={member.name} 
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-red-800">
                                        {member.name}
                                        <span className="text-xs text-red-600 ml-1">(차단됨)</span>
                                    </span>
                                    <span className="text-xs text-red-600">{member.email}</span>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-green-600 hover:bg-green-100" 
                                onClick={() => handleUnbanMember(member.id, member.name || '해당 멤버')} 
                                title="차단 해제"
                                disabled={actionLoading || blacklistLoading}
                            >
                                ✅ 차단 해제
                            </Button>
                        </div>
                        ))
                    )}
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
                        <Button variant="ghost" onClick={() => setShowConfirmDelete(null)} disabled={actionLoading}>취소</Button>
                        <Button 
                            variant={showConfirmDelete.type === 'kick' ? 'primary' : 'danger'} 
                            onClick={confirmAction}
                            disabled={actionLoading}
                        >
                            {actionLoading ? `${showConfirmDelete.type === 'kick' ? '내보내는' : '차단하는'} 중...` : (showConfirmDelete.type === 'kick' ? '내보내기' : '차단')}
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