import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Input } from '@/components/ui';
import { ItemListSelector } from '@/components/complex';
import { User } from '@/types';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { useChat } from '../context/ChatContext';
import { ChatRoomResponse } from '../api/chatApi';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatRoomCreated?: (chatRoom: ChatRoomResponse) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatRoomCreated }) => {
    const { currentUser } = useAuth();
    const { currentWorkspace } = useWorkspace();
    const { createChatRoom } = useChat();
    const navigate = useNavigate();
    const [chatType, setChatType] = useState<'PERSONAL' | 'GROUP'>('PERSONAL');
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // 워크스페이스 멤버 목록을 채팅 가능한 사용자로 사용
    const allUsersForChat = currentWorkspace?.members?.map(member => ({
        id: member.id,
        name: member.name || `사용자 ${member.id}`, // name이 없으면 ID 기반 임시 이름 생성
        email: member.name + '@example.com', // 임시로 이메일 생성
        role: member.role,
        profileImage: member.profileImage
    })) || [];

    console.log('🗣️ [NewChatModal] 채팅 가능한 사용자 목록:', allUsersForChat);

    const availableUsersForSelection = useMemo(() => {
        return allUsersForChat.filter(u => u.id !== currentUser?.id);
    }, [allUsersForChat, currentUser]);

    const handleUserSelect = (item: Record<string, any>) => {
        const user = item as User;
        if (chatType === 'PERSONAL') {
            setSelectedUsers([user]); 
        } else {
            setSelectedUsers(prev => 
                prev.find(su => su.id === user.id) ? prev.filter(su => su.id !== user.id) : [...prev, user]
            );
        }
    };
    
    const renderUserItemForSelection = (item: Record<string, any>, isSelected: boolean) => {
        const user = item as User;
        return (
            <div className="flex items-center space-x-2">
                <img src={user.profileImageUrl || `https://picsum.photos/seed/${user.id}/30/30`} alt={user.name} className="w-6 h-6 rounded-full" />
                <span>{user.name}</span>
                {isSelected && <span className="text-primary ml-auto">✓</span>}
            </div>
        );
    };

    const handleCreate = async () => {
        if (!currentUser || !currentWorkspace) {
            alert("사용자 또는 워크스페이스 정보를 찾을 수 없습니다. 다시 시도해주세요.");
            return;
        }

        if (selectedUsers.length === 0) {
            alert("최소 1명의 사용자를 선택해주세요.");
            return;
        }

        if (chatType === 'GROUP' && !groupName.trim()) {
            alert("그룹 채팅방 이름을 입력해주세요.");
            return;
        }

        try {
            setLoading(true);
            
            let newChatRoom;
            
            if (chatType === 'PERSONAL') {
                // DM 채팅방 생성 - 현재 사용자 ID와 상대방 ID 모두 포함
                const memberIds = [currentUser.id, ...selectedUsers.map(u => u.id)];
                
                // 상대방의 정확한 이름을 DM 채팅방 이름으로 사용
                const targetUser = selectedUsers[0];
                const dmName = targetUser?.name || '알 수 없는 사용자';
                
                console.log('🏗️ [NewChatModal] DM 채팅방 생성 시작:', {
                    chatType,
                    targetUser: { id: targetUser?.id, name: targetUser?.name },
                    memberIds,
                    dmName
                });
                
                newChatRoom = await createChatRoom(
                    dmName,
                    memberIds,
                    chatType
                );
                
                console.log('🏗️ [NewChatModal] DM 채팅방 생성 완료:', newChatRoom);
            } else {
                // 그룹 채팅방 생성 - 선택된 사용자 ID 목록에 현재 사용자 ID도 포함
                const memberIds = [currentUser.id, ...selectedUsers.map(u => u.id)];
                console.log('🏗️ [NewChatModal] 그룹 채팅방 생성 시작:', {
                    chatType,
                    groupName: groupName.trim(),
                    memberIds
                });
                
                newChatRoom = await createChatRoom(
                    groupName.trim(),
                    memberIds,
                    chatType
                );
                
                console.log('🏗️ [NewChatModal] 그룹 채팅방 생성 완료:', newChatRoom);
            }

            // 콜백 호출 (사이드바 목록 업데이트용)
            if (onChatRoomCreated) {
                const chatRoomResponse: ChatRoomResponse = {
                    id: newChatRoom.id,
                    name: newChatRoom.name,
                    type: newChatRoom.type,
                    workspaceId: newChatRoom.workspaceId,
                    createdAt: newChatRoom.createdAt.toISOString(),
                    memberCount: newChatRoom.memberCount
                };
                onChatRoomCreated(chatRoomResponse);
            }

            // 생성된 채팅방으로 이동
            navigate(`/ws/${currentWorkspace.id}/chat/${newChatRoom.id}`);
            
            // 모달 초기화 및 닫기
            setGroupName('');
            setSelectedUsers([]);
            setChatType('PERSONAL');
            onClose();
            
        } catch (error) {
            console.error('채팅방 생성 실패:', error);
            alert('채팅방 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const isCreateDisabled = () => {
        if (loading) return true;
        if (selectedUsers.length === 0) return true;
        if (chatType === 'GROUP' && !groupName.trim()) return true;
        return false;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="새 채팅">
            <div className="space-y-4">
                {/* 채팅 타입 선택 */}
                <div>
                    <label className="block text-sm font-medium mb-2">채팅 유형</label>
                    <div className="flex space-x-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="PERSONAL"
                                checked={chatType === 'PERSONAL'}
                                onChange={(e) => setChatType(e.target.value as 'PERSONAL' | 'GROUP')}
                                className="mr-2"
                            />
                            1:1 대화
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="GROUP"
                                checked={chatType === 'GROUP'}
                                onChange={(e) => setChatType(e.target.value as 'PERSONAL' | 'GROUP')}
                                className="mr-2"
                            />
                            그룹 채팅
                        </label>
                    </div>
                </div>

                {/* 그룹 채팅일 경우 이름 입력 */}
                {chatType === 'GROUP' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">그룹 이름</label>
                        <Input
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="그룹 채팅방 이름을 입력하세요"
                        />
                    </div>
                )}

                {/* 사용자 선택 */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        {chatType === 'PERSONAL' ? '대화할 상대' : '참여할 멤버'} 선택
                        {chatType === 'PERSONAL' && selectedUsers.length > 0 && ` (${selectedUsers[0].name})`}
                        {chatType === 'GROUP' && ` (${selectedUsers.length}명 선택됨)`}
                    </label>
                    
                    <ItemListSelector
                        items={availableUsersForSelection}
                        selectedItems={selectedUsers}
                        onSelectItem={handleUserSelect}
                        renderItem={renderUserItemForSelection}
                        itemKey="id"
                    />
                    
                    {availableUsersForSelection.length === 0 && (
                        <p className="text-gray-500 text-sm">채팅 가능한 사용자가 없습니다.</p>
                    )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        취소
                    </Button>
                    <Button 
                        onClick={handleCreate} 
                        disabled={isCreateDisabled()}
                    >
                        {loading ? '생성 중...' : '채팅방 생성'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}; 