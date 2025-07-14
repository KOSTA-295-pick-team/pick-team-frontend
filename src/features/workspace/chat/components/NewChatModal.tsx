import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Input } from '@/components/ui';
import { ItemListSelector } from '@/components/complex';
import { User } from '@/types';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
// import { useChat } from '@/contexts/ChatContext'; // TODO: ChatContext 구현 후 사용

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth(); // currentUser만 useAuth에서 가져옴
    const { currentWorkspace } = useWorkspace(); // currentWorkspace는 useWorkspace에서 가져옴
    // const { createChatRoom, allUsersForChat, setCurrentChatRoomById } = useChat(); // TODO: ChatContext에서 가져올 것
    const navigate = useNavigate();
    const [chatType, setChatType] = useState<'dm' | 'group'>('dm');
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);

    // 임시 데이터 (ChatContext 구현 전)
    const allUsersForChat: User[] = []; 
    const createChatRoom = async (_name: string, _members: User[], _type: 'dm' | 'group'): Promise<any> => {
        alert('채팅방 생성 기능이 현재 비활성화되어 있습니다.');
        return null;
    };
    const setCurrentChatRoomById = (_id: string) => {};

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
            <img src={user.profileImageUrl || `https://picsum.photos/seed/${user.id}/30/30`} alt={user.name} className="w-6 h-6 rounded-full" />
            <span>{user.name}</span>
            {isSelected && <span className="text-primary ml-auto">✓</span>}
        </div>
    );

    const handleCreate = async () => {
        // 이 함수가 호출되는 시점에는 currentUser가 항상 존재한다고 가정 (버튼 비활성화 로직 때문)
        if (!currentUser || !currentWorkspace) {
            alert("사용자 또는 워크스페이스 정보를 찾을 수 없습니다. 다시 시도해주세요.");
            return;
        }

        const roomName = chatType === 'group' ? groupName : '';

        if (chatType === 'dm' && selectedUsers.length !== 1) {
                alert("DM을 시작할 사용자 1명을 선택해주세요.");
                return;
            }

        if (chatType === 'group' && groupName.trim() === '') {
                alert("그룹 채팅방 이름을 입력해주세요.");
                return;
            }

        if (chatType === 'group' && selectedUsers.length === 0) {
                alert("그룹 멤버를 1명 이상 선택해주세요."); 
                return;
        }

        const newRoom = await createChatRoom(roomName, [currentUser, ...selectedUsers], chatType);
        
        if (newRoom) {
            // setCurrentChatRoomById(newRoom.id); // Context 기능 구현 후 활성화
            navigate(`/ws/${currentWorkspace.id}/chat/${newRoom.id}`);
            onCloseModal();
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

    // currentUser가 로드되지 않았으면 렌더링하지 않음
    if (!currentUser) {
        return null;
    }

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onCloseModal} 
            title="새로운 채팅 시작하기" 
            footer={
            <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={onCloseModal}>취소</Button>
                    <Button onClick={handleCreate} disabled={!currentUser}>채팅 시작</Button> 
            </div>
            }
        >
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