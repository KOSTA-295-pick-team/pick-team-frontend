import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Input } from '../ui';
import { ItemListSelector } from '../complex';
import { User as UserType, ChatRoomMember } from '../../types';
import { useAuth } from '../../AuthContext';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
    const { currentUser, currentWorkspace, createChatRoom, allUsersForChat, setCurrentChatRoomById } = useAuth();
    const navigate = useNavigate();
    const [chatType, setChatType] = useState<'dm' | 'group'>('dm');
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);

    const availableUsersForSelection = useMemo(() => {
        return allUsersForChat.filter(u => u.id !== currentUser?.id);
    }, [allUsersForChat, currentUser]);

    const handleUserSelect = (user: UserType) => {
        if (chatType === 'dm') {
            setSelectedUsers([user]); 
        } else {
            setSelectedUsers(prev => 
                prev.find(su => su.id === user.id) ? prev.filter(su => su.id !== user.id) : [...prev, user]
            );
        }
    };
    
    const renderUserItemForSelection = (user: UserType, isSelected: boolean) => (
        <div className="flex items-center space-x-2">
            <img src={user.profilePictureUrl || `https://picsum.photos/seed/${user.id}/30/30`} alt={user.name} className="w-6 h-6 rounded-full" />
            <span>{user.name}</span>
            {isSelected && <span className="text-primary ml-auto">✓</span>}
        </div>
    );

    const handleCreate = async () => {
        if (!currentUser || !currentWorkspace) {
            alert("사용자 또는 워크스페이스 정보를 찾을 수 없습니다.");
            return;
        }
        
        const currentUserAsMember: ChatRoomMember = {
            id: currentUser.id,
            name: currentUser.name,
            profilePictureUrl: currentUser.profilePictureUrl
        };

        const selectedUsersAsMembers: ChatRoomMember[] = selectedUsers.map(u => ({
            id: u.id,
            name: u.name,
            profilePictureUrl: u.profilePictureUrl
        }));
        
        let membersToCreateWith: ChatRoomMember[] = [];
        if (chatType === 'dm') {
            if (selectedUsersAsMembers.length !== 1) {
                alert("DM을 시작할 사용자 1명을 선택해주세요.");
                return;
            }
            membersToCreateWith = [currentUserAsMember, selectedUsersAsMembers[0]];
        } else { // Group chat
            if (groupName.trim() === '') {
                alert("그룹 채팅방 이름을 입력해주세요.");
                return;
            }
            if (selectedUsersAsMembers.length === 0) { // Check if any *additional* members are selected
                alert("그룹 멤버를 1명 이상 선택해주세요."); 
                return;
            }
             membersToCreateWith = [currentUserAsMember, ...selectedUsersAsMembers];
        }

        const newRoom = await createChatRoom(groupName, membersToCreateWith, chatType);
        if (newRoom) {
            setCurrentChatRoomById(newRoom.id);
            navigate(`/ws/${currentWorkspace.id}/chat/${newRoom.id}`);
            onCloseModal();
        } else {
            alert("채팅방 생성에 실패했습니다. 이미 DM이 존재하거나 그룹 이름/멤버 조건이 맞지 않을 수 있습니다.");
        }
    };
    
    const onCloseModal = () => {
        setGroupName('');
        setSelectedUsers([]);
        setChatType('dm');
        onClose();
    }
    
    useEffect(() => { 
      setSelectedUsers([]);
    }, [chatType]);

    return (
        <Modal isOpen={isOpen} onClose={onCloseModal} title="새로운 채팅 시작하기" footer={
            <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={onCloseModal}>취소</Button>
                <Button onClick={handleCreate}>채팅 시작</Button>
            </div>
        }>
            <div className="space-y-4">
                <div className="flex space-x-2">
                    <Button variant={chatType === 'dm' ? 'primary' : 'outline'} onClick={() => setChatType('dm')} className="flex-1">1:1 대화</Button>
                    <Button variant={chatType === 'group' ? 'primary' : 'outline'} onClick={() => setChatType('group')} className="flex-1">그룹 대화</Button>
                </div>

                {chatType === 'group' && (
                    <Input label="그룹 채팅방 이름" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="예: 프로젝트 논의방"/>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        {chatType === 'dm' ? '대화 상대 선택 (1명)' : '그룹 멤버 선택'}
                    </label>
                    <ItemListSelector
                        items={availableUsersForSelection}
                        selectedItems={selectedUsers}
                        onSelectItem={handleUserSelect}
                        renderItem={renderUserItemForSelection}
                        itemKey="id"
                    />
                </div>
            </div>
        </Modal>
    );
};

export default NewChatModal; 