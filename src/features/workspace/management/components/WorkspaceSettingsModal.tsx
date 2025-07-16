import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsersIcon, LinkIcon, NoSymbolIcon, ShieldCheckIcon, ExclamationTriangleIcon, UserMinusIcon, PhotoIcon } from '@/assets/icons';
import { Modal, Button, Input } from '@/components/ui';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { workspaceApi } from '@/features/workspace/management/api/workspaceApi';
import { User } from '@/features/user/types/user';

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const { 
        currentWorkspace, 
        loadWorkspaces,
        loading 
    } = useWorkspace();
    const [activeTab, setActiveTab] = useState<'invite' | 'members' | 'blacklist' | 'security' | 'danger' | 'settings'>('invite');
    const [workspacePassword, setWorkspacePassword] = useState('');
    const [showConfirmDelete, setShowConfirmDelete] = useState<{type: string, id: string, name: string} | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    
    // 워크스페이스 설정 상태 추가
    const [workspaceName, setWorkspaceName] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // 현재 사용자의 워크스페이스 내 역할 확인
    const isOwner = String(currentWorkspace?.owner?.id) === String(currentUser?.id);
    const isAdmin = currentWorkspace?.members?.find(m => String(m.id) === String(currentUser?.id))?.role === 'ADMIN';
    const canManageWorkspace = isOwner || isAdmin;
    
    // 멤버 목록 상태 추가
    const [members, setMembers] = useState<User[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    
    // 블랙리스트 상태 추가
    const [blacklistedMembers, setBlacklistedMembers] = useState<User[]>([]);
    const [blacklistLoading, setBlacklistLoading] = useState(false);
    const [blacklistError, setBlacklistError] = useState<string | null>(null);
    
    // 초대코드 상태 추가
    const [inviteCode, setInviteCode] = useState<string>('');
    
    const navigate = useNavigate();

    useEffect(() => {
        if (currentWorkspace) {
            setWorkspacePassword(''); // 보안상 비밀번호는 비워둠
            setWorkspaceName(currentWorkspace.name || '');
            setImagePreview(currentWorkspace.iconUrl || null);
            setInviteCode(currentWorkspace.inviteCode || currentWorkspace.url || ''); // 초대코드 설정
            
            // 권한이 없는 사용자가 기본적으로 권한이 필요한 탭에 접근하지 못하도록 조정
            if (!canManageWorkspace && (activeTab === 'members' || activeTab === 'blacklist')) {
                setActiveTab('invite');
            }
            if (!isOwner && (activeTab === 'security' || activeTab === 'danger')) {
                setActiveTab('invite');
            }
        }
    }, [currentWorkspace, canManageWorkspace, isOwner, activeTab]);

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
            setMembers([]); // 에러 시 비워둠
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
        try {
            await workspaceApi.unbanMember(currentWorkspace.id, memberId);
            alert(`✅ ${memberName}님의 차단이 해제되었습니다.`);
            await fetchBlacklistedMembers();
        } catch (error) {
            alert(`❌ 차단 해제에 실패했습니다.`);
            console.error(error);
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

    // 초대 코드 복사
    const handleCopyInviteCode = () => {
        if (!inviteCode) {
            alert('초대 코드를 찾을 수 없습니다.');
            return;
        }
        
        const inviteUrl = `${window.location.origin}/#/ws/${inviteCode}`;
        navigator.clipboard.writeText(inviteUrl)
            .then(() => alert('✅ 초대 링크가 복사되었습니다!\n참여를 원하는 사람에게 공유해주세요.'))
            .catch(() => alert('복사에 실패했습니다.'));
    };

    const handleSavePassword = async () => {
        if (!currentWorkspace) return;
        
        try {
            await workspaceApi.update(currentWorkspace.id, {
                name: currentWorkspace.name, // 필수 필드인 이름 전송
                password: workspacePassword.trim() || undefined
            });
            alert('워크스페이스 비밀번호가 업데이트되었습니다.');
            onClose();
        } catch(e) {
            alert('비밀번호 업데이트에 실패했습니다.');
            console.error(e);
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

        try {
            await workspaceApi.delete(currentWorkspace.id);
            alert('워크스페이스가 성공적으로 삭제되었습니다.');
            onClose();
            await loadWorkspaces(); // 워크스페이스 목록 갱신
            navigate('/');
        } catch(e) {
            alert('워크스페이스 삭제에 실패했습니다.');
        }
    };

    const confirmAction = async () => {
        if (!showConfirmDelete || !currentWorkspace) return;
        
        setActionLoading(true);
        const actionType = showConfirmDelete.type === 'kick' ? '내보내기' : '차단';
        
        try {
            if (showConfirmDelete.type === 'kick') {
                await workspaceApi.kickMember(currentWorkspace.id, String(showConfirmDelete.id));
            } else if (showConfirmDelete.type === 'ban') {
                await workspaceApi.banMember(currentWorkspace.id, String(showConfirmDelete.id));
            }
            
            alert(`✅ ${showConfirmDelete.name}님이 워크스페이스에서 ${actionType}되었습니다.\n멤버 목록이 업데이트되었습니다.`);
            setShowConfirmDelete(null);
            await fetchMembers();

        } catch (error) {
            console.error(`${actionType} 오류:`, error);
            alert(`❌ ${actionType} 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.`);
        } finally {
            setActionLoading(false);
        }
    }

    // 이미지 선택 처리
    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // 파일 크기 검증 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기는 5MB 이하여야 합니다.');
                return;
            }

            // 파일 형식 검증
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }

            setSelectedImage(file);
            
            // 미리보기 생성
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // 이미지 제거
    const handleImageRemove = () => {
        setSelectedImage(null);
        setImagePreview(currentWorkspace?.iconUrl || null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 워크스페이스 설정 저장
    const handleSaveWorkspaceSettings = async () => {
        if (!currentWorkspace) return;

        setActionLoading(true);
        try {
            let iconUrl = currentWorkspace.iconUrl;

            // 이미지가 선택되었다면 업로드
            if (selectedImage) {
                const formData = new FormData();
                formData.append('file', selectedImage);

                const uploadResponse = await workspaceApi.uploadIcon(currentWorkspace.id, formData);
                iconUrl = uploadResponse.iconUrl;
            }

            // 워크스페이스 정보 업데이트
            await workspaceApi.updateWorkspace(currentWorkspace.id, {
                name: workspaceName.trim(),
                iconUrl: iconUrl
            });

            // 워크스페이스 목록 갱신
            await loadWorkspaces();

            alert('워크스페이스 설정이 업데이트되었습니다.');
            onClose();
        } catch (error: any) {
            console.error('워크스페이스 설정 업데이트 실패:', error);
            if (error.status === 401) {
                alert('인증이 만료되었습니다. 페이지를 새로고침하거나 다시 로그인해주세요.');
                // 자동으로 로그인 페이지로 리다이렉트
                window.location.href = '/login';
            } else {
                alert(error.message || '워크스페이스 설정 업데이트에 실패했습니다.');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const TABS_CONFIG = [
        { id: 'invite', label: '초대', icon: <LinkIcon className="w-4 h-4 mr-1" /> },
        ...(canManageWorkspace ? [{ id: 'settings', label: '서버 프로필', icon: <PhotoIcon className="w-4 h-4 mr-1" /> }] : []),
        ...(canManageWorkspace ? [{ id: 'members', label: '멤버 관리', icon: <UsersIcon className="w-4 h-4 mr-1" /> }] : []),
        ...(canManageWorkspace ? [{ id: 'blacklist', label: '차단 목록', icon: <NoSymbolIcon className="w-4 h-4 mr-1" /> }] : []),
        ...(isOwner ? [{ id: 'security', label: '보안', icon: <ShieldCheckIcon className="w-4 h-4 mr-1" /> }] : []),
        ...(isOwner ? [{ id: 'danger', label: '위험 구역', icon: <ExclamationTriangleIcon className="w-4 h-4 mr-1" /> }] : []),
    ];

    return (
        <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`${currentWorkspace.name} 설정`}
            size="lg"
            footer={ 
                activeTab === 'settings' ? (
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={onClose}>취소</Button>
                        <Button onClick={handleSaveWorkspaceSettings} disabled={actionLoading || !workspaceName.trim()}>
                            {actionLoading ? '저장 중...' : '설정 저장'}
                        </Button>
                    </div>
                ) : activeTab === 'security' ? (
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
                <nav className="-mb-px flex gap-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100" aria-label="Tabs">
                    {TABS_CONFIG.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'security' | 'danger' | 'invite' | 'members' | 'blacklist')}
                        className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-xs flex items-center flex-shrink-0
                        ${activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
                        ${tab.id === 'danger' ? (activeTab === tab.id ? 'border-red-500 text-red-600' : 'text-red-600 hover:text-red-700 hover:border-red-300') : ''}`}
                    >
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                    </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'invite' && (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600">
                        워크스페이스의 영구 초대 링크입니다. 이 링크는 워크스페이스가 삭제되기 전까지 계속 사용할 수 있습니다.
                    </p>

                    {/* 초대 링크 표시 */}
                    <div>
                        <Input 
                            label="초대 링크"
                            value={inviteCode ? `${window.location.origin}/#/ws/${inviteCode}` : '초대 링크를 불러오는 중...'} 
                            readOnly 
                            Icon={LinkIcon}
                        />
                    </div>

                    <div className="flex space-x-2">
                        <Button 
                            onClick={handleCopyInviteCode} 
                            className="w-full" 
                            disabled={loading || !inviteCode}
                        >
                            초대 링크 복사
                        </Button>
                    </div>
                    
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
                        <p className="font-medium mb-1">💡 참고사항:</p>
                        <ul className="space-y-1">
                            <li>• 이 초대 링크는 워크스페이스 생성 시 자동으로 생성됩니다</li>
                            <li>• 링크는 영구적이며 변경되지 않습니다</li>
                            <li>• 워크스페이스에 비밀번호가 설정된 경우 참여 시 비밀번호가 필요합니다</li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && canManageWorkspace && (
                <div className="space-y-6">
                    {/* 워크스페이스 이름 */}
                    <div>
                        <Input
                            label="워크스페이스 이름"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            placeholder="워크스페이스 이름을 입력하세요"
                            maxLength={100}
                            required
                        />
                    </div>

                    {/* 워크스페이스 아이콘 */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            워크스페이스 아이콘
                        </label>
                        
                        <div className="flex items-center space-x-4">
                            {/* 현재 아이콘 또는 미리보기 */}
                            <div className="w-16 h-16 bg-neutral-100 rounded-lg flex items-center justify-center overflow-hidden">
                                {imagePreview ? (
                                    <img 
                                        src={imagePreview} 
                                        alt="워크스페이스 아이콘" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <PhotoIcon className="w-8 h-8 text-neutral-400" />
                                )}
                            </div>

                            {/* 업로드 버튼 */}
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={actionLoading}
                                    >
                                        이미지 선택
                                    </Button>
                                    {imagePreview && (
                                        <Button
                                            variant="ghost"
                                            onClick={handleImageRemove}
                                            disabled={actionLoading}
                                        >
                                            제거
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    JPG, PNG, GIF 파일 (최대 5MB)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'members' && canManageWorkspace && (
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
                                    src={member.profileImageUrl || `https://picsum.photos/seed/${member.id}/32/32`} 
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
                                        onClick={() => handleKickMember(String(member.id), member.name || '해당 멤버')} 
                                        title="내보내기"
                                        disabled={loading || actionLoading || membersLoading}
                                    >
                                        <UserMinusIcon className="w-4 h-4"/>
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-red-600 hover:bg-red-100" 
                                        onClick={() => handleBanMember(String(member.id), member.name || '해당 멤버')} 
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

            {activeTab === 'blacklist' && canManageWorkspace && (
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
                                    src={member.profileImageUrl || `https://picsum.photos/seed/${member.id}/32/32`} 
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
                                onClick={() => handleUnbanMember(String(member.id), member.name || '해당 멤버')} 
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

            {activeTab === 'security' && isOwner && (
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

            {activeTab === 'danger' && isOwner && (
                <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex items-center mb-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3" />
                            <div>
                                <h3 className="text-lg font-semibold text-red-800">워크스페이스 영구 삭제</h3>
                                <p className="text-sm text-red-600 mt-1">이 작업은 되돌릴 수 없습니다!</p>
                            </div>
                        </div>
                        
                        <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-4">
                            <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ 삭제될 데이터:</h4>
                            <div className="text-xs text-red-700 space-y-1">
                                <p>• 모든 팀 프로젝트와 칸반보드</p>
                                <p>• 채팅 기록과 업로드된 파일들</p>
                                <p>• 워크스페이스 멤버 정보</p>
                                <p>• 모든 설정과 권한</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <Input
                                label={`확인을 위해 워크스페이스 이름을 정확히 입력하세요:`}
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                placeholder={currentWorkspace.name}
                                className="mb-2"
                            />
                            <div className="text-xs text-neutral-600">
                                입력해야 할 이름: <span className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{currentWorkspace.name}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="confirmDelete"
                                    checked={deleteConfirmText === currentWorkspace.name}
                                    readOnly
                                    className="mr-2"
                                />
                                <label htmlFor="confirmDelete" className="text-sm text-neutral-700">
                                    위험성을 이해하고 워크스페이스를 삭제하겠습니다.
                                </label>
                            </div>
                            {deleteConfirmText === currentWorkspace.name && (
                                <span className="text-xs text-green-600 font-semibold">✓ 확인됨</span>
                            )}
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