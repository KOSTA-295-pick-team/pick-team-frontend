import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Modal, TextArea, Input } from '@/components/ui';
import { PlusCircleIcon, TrashIcon, ChatBubbleIcon, XCircleIcon } from '@/assets/icons';
import { User } from '@/features/user/types/user';
import { KanbanBoard, KanbanColumn, KanbanCard as KanbanCardType, KanbanTaskUpdateRequest } from '@/features/teamspace/kanban/types/kanban';
import { kanbanApi } from '@/features/teamspace/kanban/api/kanbanApi';

// Sub-components
interface KanbanCardProps {
  card: KanbanCardType;
  onClick: () => void;
}
const KanbanCard: React.FC<KanbanCardProps> = ({ card, onClick }) => (
    <div onClick={onClick} className="bg-white p-3 rounded-md shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-neutral-200">
        <h4 className="font-semibold text-sm mb-2">{card.title}</h4>
        <div className="flex justify-between items-center text-xs text-neutral-500">
            <div className="flex items-center space-x-1">
                <ChatBubbleIcon className="w-4 h-4" />
                <span>{card.comments?.length || 0}</span>
            </div>
            <div className="flex -space-x-2">
                {card.assignees?.slice(0, 3).map(assignee => (
                    <img key={assignee.id} src={assignee.profileImageUrl || `https://i.pravatar.cc/150?u=${assignee.id}`} alt={assignee.name} className="w-6 h-6 rounded-full border-2 border-white" title={assignee.name}/>
                ))}
                {card.assignees && card.assignees.length > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-xs font-bold">+{card.assignees.length - 3}</div>
                )}
            </div>
        </div>
    </div>
);

interface KanbanCardDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: KanbanCardType | null;
    columnTitle: string;
    onUpdateCard: (cardId: string, updatedCard: KanbanTaskUpdateRequest) => void;
    onAddComment: (cardId: string, commentData: { content: string }) => void;
    onDeleteCard: (cardId: string) => void;
    currentUser: User;
    teamMembers: User[];
}

const KanbanCardDetailModal: React.FC<KanbanCardDetailModalProps> = ({
  isOpen, onClose, card, columnTitle, onUpdateCard, onAddComment, onDeleteCard, currentUser, teamMembers
}) => {
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(undefined);
    const [editedAssigneeIds, setEditedAssigneeIds] = useState<string[]>([]); // string[]으로 변경
    const [newComment, setNewComment] = useState('');

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [showDueDatePopover, setShowDueDatePopover] = useState(false);
    const [showAssigneePopover, setShowAssigneePopover] = useState(false);
    
    const dueDateRef = useRef<HTMLDivElement>(null);
    const assigneeRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (card) {
            setEditedTitle(card.title);
            setEditedDescription(card.description || '');
            setEditedDueDate(card.dueDate ? new Date(card.dueDate) : undefined);
            setEditedAssigneeIds(card.assignees?.map(a => a.id) || []);
            setNewComment('');
        }
    }, [card]);

    useEffect(() => {
      if (isEditingTitle && titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, [isEditingTitle]);

    useEffect(() => {
        if (isEditingDescription && descriptionTextareaRef.current) {
            descriptionTextareaRef.current.focus();
        }
    }, [isEditingDescription]);

    if (!isOpen || !card) return null;

    const handleClosePopover = () => {
        setShowDueDatePopover(false);
        setShowAssigneePopover(false);
    };
    
    const handleSave = () => {
        handleClosePopover();
        const updateRequest: KanbanTaskUpdateRequest = { 
            title: editedTitle, 
            content: editedDescription,
            assigneeIds: editedAssigneeIds 
        };
        if(card) onUpdateCard(card.id, updateRequest);
        setIsEditingTitle(false);
        setIsEditingDescription(false);
    };

    const handleAddComment = () => {
        if (newComment.trim() !== '') {
            onAddComment(card.id, { content: newComment });
            setNewComment('');
        }
    };
    
    const handleDelete = () => {
        if (window.confirm("이 태스크를 정말 삭제하시겠습니까?")) {
            onDeleteCard(card.id);
            onClose();
        }
    };
    
    const toggleAssignee = (memberId: string) => {
        setEditedAssigneeIds(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="space-y-6 p-1">
                {/* Header and Title */}
                <div className="border-b pb-4">
                    {isEditingTitle ? (
                        <Input
                            ref={titleInputRef}
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={() => { setIsEditingTitle(false); handleSave(); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingTitle(false); handleSave(); }}}
                            className="text-2xl font-bold w-full"
                        />
                    ) : (
                        <h2 className="text-2xl font-bold flex items-center cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                            {editedTitle}
                        </h2>
                    )}
                    <p className="text-sm text-neutral-500 mt-1">in list <span className="font-semibold">{columnTitle}</span></p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Left side - Description, Comments */}
                    <div className="col-span-2 space-y-6">
                        {/* Description */}
                        <div>
                            <h3 className="font-semibold text-lg mb-2">설명</h3>
                            {isEditingDescription ? (
                                <TextArea
                                    ref={descriptionTextareaRef}
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    onBlur={() => { setIsEditingDescription(false); handleSave(); }}
                                    rows={5}
                                    placeholder="자세한 설명을 추가하세요..."
                                />
                            ) : (
                                <div onClick={() => setIsEditingDescription(true)} className="prose prose-sm max-w-none cursor-pointer p-2 rounded hover:bg-neutral-100 min-h-[5rem]">
                                    {editedDescription || <p className="text-neutral-400">자세한 설명을 추가하세요...</p>}
                                </div>
                            )}
                        </div>
                        {/* Comments */}
                        <div>
                            <h3 className="font-semibold text-lg mb-2">댓글</h3>
                            <div className="space-y-4">
                                {card.comments.map(comment => (
                                    <div key={comment.id} className="flex items-start space-x-3">
                                        <img src={comment.author.profileImageUrl || `https://i.pravatar.cc/150?u=${comment.author.id}`} alt={comment.author.name} className="w-8 h-8 rounded-full" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm">{comment.author.name}</p>
                                            <div className="bg-neutral-100 p-2 rounded-md text-sm">
                                                {comment.content}
                                            </div>
                                            <p className="text-xs text-neutral-500 mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-start space-x-3">
                                    <img src={currentUser.profileImageUrl || `https://i.pravatar.cc/150?u=${currentUser.id}`} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                                    <div className="flex-1">
                                        <TextArea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="댓글 추가..." rows={2} />
                                        <Button onClick={handleAddComment} size="sm" className="mt-2">저장</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Right side - Due Date, Assignees, Actions */}
                    <div className="col-span-1 space-y-4">
                        {/* Due Date */}
                        <div className="relative">
                            <h4 className="text-sm font-semibold mb-1">마감일</h4>
                            <div ref={dueDateRef} onClick={() => setShowDueDatePopover(!showDueDatePopover)} className="bg-neutral-100 p-2 rounded-md cursor-pointer hover:bg-neutral-200">
                                {editedDueDate ? new Date(editedDueDate).toLocaleDateString() : '날짜 없음'}
                            </div>
                            {showDueDatePopover && (
                                <div className="absolute z-10 top-full mt-1 bg-white p-2 rounded-lg shadow-xl border">
                                    <Input type="date"
                                        value={editedDueDate ? editedDueDate.toISOString().split('T')[0] : ''}
                                        onChange={e => setEditedDueDate(new Date(e.target.value))}
                                    />
                                    <div className="flex justify-end mt-2">
                                         <Button size="sm" onClick={handleSave}>저장</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Assignees */}
                        <div className="relative">
                            <h4 className="text-sm font-semibold mb-1">담당자</h4>
                            <div ref={assigneeRef} onClick={() => setShowAssigneePopover(!showAssigneePopover)} className="flex flex-wrap gap-1 items-center bg-neutral-100 p-2 rounded-md cursor-pointer min-h-[2.5rem] hover:bg-neutral-200">
                                {teamMembers.filter(m => editedAssigneeIds.includes(String(m.id))).map(assignee => (
                                    <img key={assignee.id} src={assignee.profileImageUrl || `https://i.pravatar.cc/150?u=${assignee.id}`} alt={assignee.name} className="w-6 h-6 rounded-full border-2 border-white" title={assignee.name} />
                                ))}
                                {editedAssigneeIds.length === 0 && <span className="text-neutral-500 text-sm">담당자 없음</span>}
                            </div>
                            {showAssigneePopover && (
                                <div className="absolute z-10 top-full mt-1 bg-white p-2 rounded-lg shadow-xl border w-full">
                                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                                        {teamMembers.map(member => (
                                            <li key={member.id} onClick={() => toggleAssignee(String(member.id))} className={`flex items-center space-x-2 p-1 rounded-md cursor-pointer ${editedAssigneeIds.includes(String(member.id)) ? 'bg-primary-light/30' : 'hover:bg-neutral-100'}`}>
                                                <img src={member.profileImageUrl || `https://i.pravatar.cc/150?u=${member.id}`} alt={member.name} className="w-6 h-6 rounded-full" />
                                                <span className="text-sm">{member.name}</span>
                                                {editedAssigneeIds.includes(member.id) && <XCircleIcon className="w-5 h-5 text-primary ml-auto" />}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex justify-end mt-2">
                                        <Button size="sm" onClick={handleSave}>저장</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Actions */}
                        <div>
                             <Button variant="danger" leftIcon={<TrashIcon />} onClick={handleDelete} className="w-full">
                                태스크 삭제
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


const TeamKanbanBoard: React.FC<{ teamProjectId: string, currentUser: User, teamMembers: User[] }> = ({ teamProjectId, currentUser, teamMembers }) => {
    const [board, setBoard] = useState<KanbanBoard | null>(null);
    const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
    const [selectedColumnTitle, setSelectedColumnTitle] = useState('');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    const [isAddingList, setIsAddingList] = useState(false);
    const [newListName, setNewListName] = useState('');

    const [isAddingCard, setIsAddingCard] = useState<string | null>(null); // column.id
    const [newCardTitle, setNewCardTitle] = useState('');
    
    const loadBoard = useCallback(async () => {
            try {
            // DTO와 프론트 타입 불일치로 인한 임시 캐스팅
            const fetchedBoard = await kanbanApi.getBoard(teamProjectId) as unknown as KanbanBoard;
                setBoard(fetchedBoard);
            } catch (error) {
                console.error("칸반 보드 로딩 실패:", error);
            }
    }, [teamProjectId]);
    
    useEffect(() => {
        loadBoard();
    }, [loadBoard]);

    const handleOpenCardDetail = (card: KanbanCardType, columnTitle: string) => {
        setSelectedCard(card);
        setSelectedColumnTitle(columnTitle);
        setIsDetailModalOpen(true);
    };

    const handleAddComment = async (_cardId: string, _data: { content: string }) => {
        try {
            // const newComment = await kanbanApi.addComment(cardId, data);
            alert("댓글 추가 기능은 현재 지원되지 않습니다.");
            // TODO: API 구현 후 상태 업데이트 로직 추가
        } catch (error) {
            console.error("댓글 추가 실패:", error);
        }
    };

    const handleUpdateCard = async (cardId: string, updatedData: KanbanTaskUpdateRequest) => {
        try {
            const response = await kanbanApi.updateCard(cardId, updatedData);
            // API 응답 타입이 프론트 타입과 일치한다고 가정하고 캐스팅 제거
            const updatedCard = response as KanbanCardType; 
            
            const updateBoard = (b: KanbanBoard | null) => {
                if (!b) return null;
                return {
                    ...b,
                    columns: b.columns.map(c => ({
                        ...c,
                        cards: c.cards.map(card => card.id === updatedCard.id ? updatedCard : card)
                    }))
                };
            };
            setBoard(updateBoard);
            setSelectedCard(updatedCard);

        } catch (error) {
            console.error("태스크 업데이트 실패:", error);
        }
    };
    
    const handleDeleteCard = async (cardId: string) => {
        if (!window.confirm("정말로 이 카드를 삭제하시겠습니까?")) return;
        try {
            await kanbanApi.deleteCard(cardId);
            setBoard(prevBoard => {
                if (!prevBoard) return null;
                const newColumns = prevBoard.columns.map(col => ({
                    ...col,
                    cards: col.cards.filter(card => card.id !== cardId)
                }));
                return { ...prevBoard, columns: newColumns };
            });
            setIsDetailModalOpen(false);
            setSelectedCard(null);
        } catch (error) {
            console.error("태스크 삭제 실패:", error);
        }
    };

    const handleCreateList = async () => {
        if (newListName.trim() && board) {
            try {
                const newList = await kanbanApi.addColumn(board.id, { title: newListName.trim() }) as unknown as KanbanColumn;
                setBoard(prevBoard => prevBoard ? { ...prevBoard, columns: [...prevBoard.columns, { ...newList, cards: [] }] } : null);
                setNewListName('');
                setIsAddingList(false);
            } catch (error) {
                console.error("리스트 생성 실패:", error);
            }
        }
    };

    const handleCreateCard = async (columnId: string) => {
        if (newCardTitle.trim()) {
            try {
                const newCard = await kanbanApi.addCard({
                    listId: columnId,
                    title: newCardTitle.trim(),
                    // description 필드는 API 명세에 따라 content로 변경될 수 있음
                }) as unknown as KanbanCardType;
                setBoard(prevBoard => {
                    if (!prevBoard) return null;
                    const newColumns = prevBoard.columns.map(col => 
                        col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
                    );
                    return { ...prevBoard, columns: newColumns };
                });
                setNewCardTitle('');
                setIsAddingCard(null);
            } catch (error) {
                console.error("카드 생성 실패:", error);
            }
        }
    };

    if (!board) return <div>칸반 보드를 불러오는 중...</div>;

    return (
        <div className="flex flex-col h-full">
            {/* Board Header */}
            <div className="p-4 bg-white/50 backdrop-blur-sm rounded-t-lg">
                <h2 className="text-xl font-bold text-neutral-800">📌 칸반 보드</h2>
            </div>

            {/* Board Columns */}
            <div className="flex-grow p-4 overflow-x-auto">
                <div className="flex space-x-4">
                {board.columns.map(column => (
                        <div key={column.id} className="w-72 bg-neutral-100 rounded-lg shadow-md flex-shrink-0">
                            <h3 className="font-semibold p-3 text-neutral-700 border-b">{column.title}</h3>
                            <div className="p-2 space-y-2">
                            {column.cards.map(card => (
                                    <KanbanCard key={card.id} card={card} onClick={() => handleOpenCardDetail(card, column.title)} />
                            ))}
                        {isAddingCard === column.id ? (
                                    <div className="p-2">
                                <TextArea 
                                    value={newCardTitle} 
                                            onChange={(e) => setNewCardTitle(e.target.value)}
                                            placeholder="카드 제목을 입력하세요..."
                                            rows={2}
                                    className="mb-2"
                                />
                                        <div className="flex items-center justify-between">
                                            <Button size="sm" onClick={() => handleCreateCard(column.id)}>카드 추가</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsAddingCard(null)}>취소</Button>
                                </div>
                            </div>
                        ) : (
                                    <Button variant="ghost" className="w-full mt-2" onClick={() => setIsAddingCard(column.id)} leftIcon={<PlusCircleIcon className="w-4 h-4"/>}>
                                        카드 추가하기
                            </Button>
                        )}
                            </div>
                    </div>
                ))}
                {isAddingList ? (
                        <div className="w-72 bg-neutral-200 rounded-lg p-2 flex-shrink-0 self-start">
                        <Input 
                            value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="리스트 제목 입력..."
                                className="mb-2"
                        />
                             <div className="flex items-center justify-between">
                            <Button size="sm" onClick={handleCreateList}>리스트 추가</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingList(false)}>취소</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-72 flex-shrink-0">
                            <Button variant="outline" className="w-full" onClick={() => setIsAddingList(true)} leftIcon={<PlusCircleIcon className="w-5 h-5"/>}>
                                리스트 추가
                            </Button>
                        </div>
                    )}
                    </div>
            </div>

            {selectedCard && (
                <KanbanCardDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    card={selectedCard}
                    columnTitle={selectedColumnTitle}
                    onUpdateCard={handleUpdateCard}
                    onAddComment={handleAddComment}
                    onDeleteCard={handleDeleteCard}
                    currentUser={currentUser}
                    teamMembers={teamMembers}
                />
            )}
        </div>
    );
};

export default TeamKanbanBoard; 