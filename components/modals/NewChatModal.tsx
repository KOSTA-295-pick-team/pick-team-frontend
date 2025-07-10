import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Modal, Button, Input } from '../ui';
import { ItemListSelector } from '../complex';
import { User as UserType } from '../../types';
import { useAuth } from '../../AuthContext';

import { apiRequest } from '../../services/api';
import { createGroupChatRoomThunk, createDmChatRoomThunk } from '../../store/slices/chatSlice';
import type { AppDispatch } from '../../store';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
    const { currentUser, currentWorkspace, setCurrentChatRoomById } = useAuth();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const [chatType, setChatType] = useState<'dm' | 'group'>('dm');
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);
    const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 워크스페이스 멤버 목록 로딩
    useEffect(() => {
        const loadWorkspaceMembers = async () => {
            if (!currentWorkspace?.id || !currentUser) return;
            
            try {
                setLoading(true);
                setError(null);
                const response = await apiRequest<{success: boolean; message: string; data: UserType[]}>(`/workspaces/${currentWorkspace.id}/members`);
                if (response.success && response.data) {
                    // 현재 사용자를 제외한 멤버 목록 설정
                    setAvailableUsers(response.data.filter(user => user.id !== currentUser.id));
                } else {
                    throw new Error(response.message || '멤버 목록을 불러오는데 실패했습니다.');
                }
            } catch (error: any) {
                console.error('워크스페이스 멤버 목록 로딩 실패:', error);
                setError('멤버 목록을 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadWorkspaceMembers();
        }
    }, [currentWorkspace?.id, currentUser, isOpen]);

    const handleUserSelect = (user: UserType) => {
        if (chatType === 'dm') {
            setSelectedUsers([user]); 
        } else {
            setSelectedUsers(prev => 
                prev.find(su => su.id === user.id) ? prev.filter(su => su.id !== user.id) : [...prev, user]
            );
        }
    };
    
    // 타입을 명시적으로 지정하여 renderItem 함수 수정
    const renderUserItemForSelection = (user: UserType, isSelected: boolean): React.ReactNode => (
        <div className="flex items-center space-x-2">
            <img 
                src={user.profilePictureUrl || `https://picsum.photos/seed/${user.id}/30/30`} 
                alt={user.name || ''} 
                className="w-6 h-6 rounded-full" 
            />
            <span>{user.name}</span>
            {isSelected && <span className="text-primary ml-auto">✓</span>}
        </div>
    );

    const handleCreateChatRoom = async () => {
        if (!currentWorkspace?.id || !currentUser) return;

        try {
            setLoading(true);
            setError(null);

            let newRoom;
            const memberIds = selectedUsers.map(user => user.id);

            if (chatType === 'dm') {
                if (memberIds.length !== 1) {
                    setError('DM 채팅방은 한 명의 상대만 선택할 수 있습니다.');
                    return;
                }

                // DM 채팅방 생성 (상대방 이름을 채팅방 이름으로 사용)
                const otherUser = selectedUsers[0];
                newRoom = await dispatch(createDmChatRoomThunk({
                    workspaceId: currentWorkspace.id,
                    otherUserId: otherUser.id,
                    otherUserName: otherUser.name || '알 수 없는 사용자'
                })).unwrap();
            } else {
                if (!groupName.trim()) {
                    setError('그룹 채팅방 이름을 입력해주세요.');
                    return;
                }
                if (memberIds.length === 0) {
                    setError('채팅방에 초대할 멤버를 선택해주세요.');
                    return;
                }

                // 그룹 채팅방 생성
                newRoom = await dispatch(createGroupChatRoomThunk({
                    workspaceId: currentWorkspace.id,
                    name: groupName.trim(),
                    memberIds
                })).unwrap();
            }

            // 새로 생성된 채팅방으로 이동
            if (newRoom) {
                setCurrentChatRoomById(newRoom.id);
                navigate(`/workspaces/${currentWorkspace.id}/chat/${newRoom.id}`);
                onClose();
            }
        } catch (error: any) {
            console.error('채팅방 생성 실패:', error);
            setError(error.message || '채팅방 생성에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleReset = () => {
        setChatType('dm');
        setGroupName('');
        setSelectedUsers([]);
        setError(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose}
            title="새 채팅 시작하기"
            size="lg"
        >
            <div className="p-6">
                {/* 채팅 유형 선택 */}
                <div className="mb-4 flex space-x-4">
                    <Button 
                        variant={chatType === 'dm' ? 'primary' : 'outline'}
                        onClick={() => setChatType('dm')}
                    >
                        1:1 채팅
                    </Button>
                    <Button 
                        variant={chatType === 'group' ? 'primary' : 'outline'}
                        onClick={() => setChatType('group')}
                    >
                        그룹 채팅
                    </Button>
                </div>

                {/* 그룹 채팅방 이름 입력 */}
                {chatType === 'group' && (
                    <div className="mb-4">
                        <Input
                            placeholder="채팅방 이름을 입력하세요"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full"
                        />
                    </div>
                )}

                {/* 로딩 상태 */}
                {loading && (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                {/* 에러 메시지 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
                        {error}
                    </div>
                )}

                {/* 사용자 목록 */}
                {!loading && availableUsers.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-medium mb-2">
                            {chatType === 'dm' ? '대화 상대 선택' : '그룹 멤버 선택'}
                        </h3>
                        <div className="max-h-80 overflow-y-auto border rounded-lg">
                            <ItemListSelector<UserType>
                                items={availableUsers}
                                selectedItems={selectedUsers}
                                onSelectItem={handleUserSelect}
                                renderItem={renderUserItemForSelection}
                                itemKey="id"
                                maxHeight="max-h-80"
                            />
                        </div>
                    </div>
                )}

                {/* 사용자가 없을 때 메시지 */}
                {!loading && availableUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        워크스페이스에 다른 멤버가 없습니다.
                    </div>
                )}

                {/* 버튼 */}
                <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={handleClose}>
                        취소
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateChatRoom}
                        disabled={loading || selectedUsers.length === 0 || (chatType === 'group' && !groupName.trim())}
                    >
                        {loading ? '생성 중...' : '채팅 시작하기'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default NewChatModal;