import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Button, Input, Card, Modal, TextArea, VideoCameraIcon, CalendarDaysIcon, PlusCircleIcon, UserIcon, TrashIcon, XCircleIcon } from '../components'; // Removed ChatBubbleIcon
import { TeamProject, Announcement, CalendarEvent, User, KanbanBoard, KanbanColumn, KanbanCard as KanbanCardType, KanbanComment, BulletinPost, BulletinComment } from '../types';
import { useAuth } from '../AuthContext';
import { PaperClipIcon, CheckCircleIcon, Bars3Icon, TableCellsIcon, ClipboardDocumentListIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, ChatBubbleBottomCenterTextIcon, CogIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { fetchKanbanBoard, addKanbanTaskComment, updateKanbanTask, createKanbanTask, deleteKanbanTask, createKanbanList } from '../services/kanbanApi';
import { teamApi } from '../services/teamApi';

// Demo Team Data - 목업 데이터 제거, 실제 API만 사용
const DEMO_TEAM_PROJECTS_ALL_DETAIL: TeamProject[] = [];

// Sub-components for TeamSpacePage
const TeamAnnouncementBoard: React.FC<{ 
    announcements: Announcement[], 
    onAddAnnouncement: (content: string) => void,
    onDeleteAnnouncement: (announcementId: string) => void 
}> = ({ announcements, onAddAnnouncement, onDeleteAnnouncement }) => {
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleAdd = () => {
    if (newAnnouncement.trim()) {
      onAddAnnouncement(newAnnouncement.trim());
      setNewAnnouncement('');
      setShowModal(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("이 공지사항을 정말 삭제하시겠습니까?")) {
        onDeleteAnnouncement(id);
    }
  }

  return (
    <Card title="📢 팀 공지사항" actions={<Button size="sm" onClick={() => setShowModal(true)} leftIcon={<PlusCircleIcon />}>공지 추가</Button>}>
      {announcements.length === 0 ? (
        <p className="text-neutral-500">아직 공지사항이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {announcements.slice().reverse().map(anno => ( 
            <li key={anno.id} className="p-3 bg-primary-light/10 rounded-md shadow-sm group">
              <div className="flex justify-between items-start">
                <div>
                    <p className="text-neutral-700 whitespace-pre-line">{anno.content}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                        작성자: {anno.author} - {anno.timestamp.toLocaleString()}
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(anno.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="공지 삭제">
                    <TrashIcon className="w-4 h-4 text-red-500"/>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="새 공지사항 작성"
        footer={
            <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
                <Button onClick={handleAdd}>등록</Button>
            </div>
        }
      >
        <TextArea 
          value={newAnnouncement} 
          onChange={(e) => setNewAnnouncement(e.target.value)}
          placeholder="공지 내용을 입력하세요..."
          rows={4}
        />
      </Modal>
    </Card>
  );
};

// TeamVideoConference component removed from here.

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay(); 
};

const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

const TeamCalendar: React.FC<{ teamProjectId: string }> = ({ teamProjectId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ title: '', start: new Date(), end: new Date(), type: 'meeting', teamProjectId });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth(); 

  useEffect(() => {
    const baseDate = new Date(year, month, 15);
    setEvents([
      { id: 'event1', teamProjectId, title: '주간 스프린트 회의', start: new Date(new Date(baseDate).setDate(baseDate.getDate() + 2)), end: new Date(new Date(baseDate).setDate(baseDate.getDate() + 2)), type: 'meeting', description: '정기 주간 회의입니다.' },
      { id: 'event2', teamProjectId, title: '1차 프로토타입 마감', start: new Date(new Date(baseDate).setDate(baseDate.getDate() + 7)), end: new Date(new Date(baseDate).setDate(baseDate.getDate() + 7)), type: 'deadline', description: '프로토타입 제출 마감일' },
      { id: 'event3', teamProjectId, title: '워크샵', start: new Date(new Date(baseDate).setDate(baseDate.getDate() - 5)), end: new Date(new Date(baseDate).setDate(baseDate.getDate() - 3)), type: 'other', description: '팀 빌딩 워크샵 (3일간)' },
    ]);
    resetModalState(new Date(currentDisplayDate));
  }, [teamProjectId, year, month]);

  const resetModalState = (dateForNewEvent?: Date) => {
    setEditingEventId(null);
    setNewEvent({ 
        title: '', 
        start: dateForNewEvent || new Date(), 
        end: dateForNewEvent || new Date(), 
        type: 'meeting', 
        teamProjectId 
    });
  };
  
  const handleAddEvent = () => {
    if (newEvent.title && newEvent.start && newEvent.end) {
      setEvents(prev => [...prev, { ...newEvent, id: `event-${Date.now()}` } as CalendarEvent]);
      setShowAddEventModal(false);
      resetModalState(new Date(currentDisplayDate));
    }
  };

  const handleUpdateEvent = () => {
    if (editingEventId && newEvent.title && newEvent.start && newEvent.end) {
        setEvents(prevEvents => prevEvents.map(event => 
            event.id === editingEventId ? { ...event, ...newEvent, id: editingEventId } as CalendarEvent : event
        ));
        setShowAddEventModal(false);
        resetModalState(new Date(currentDisplayDate));
    }
  };

  const handleDeleteEvent = () => {
    if (editingEventId) {
        if (window.confirm("이 일정을 정말 삭제하시겠습니까?")) {
            setEvents(prevEvents => prevEvents.filter(event => event.id !== editingEventId));
            setShowAddEventModal(false);
            resetModalState(new Date(currentDisplayDate));
        }
    }
  };


  const prevMonth = () => {
    setCurrentDisplayDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDisplayDate(new Date(year, month + 1, 1));
  };
  
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    resetModalState(clickedDate);
    setShowAddEventModal(true);
  };

  const handleEventClick = (eventToEdit: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setEditingEventId(eventToEdit.id);
    setNewEvent({ 
        title: eventToEdit.title,
        start: new Date(eventToEdit.start),
        end: new Date(eventToEdit.end),
        description: eventToEdit.description || '',
        type: eventToEdit.type,
        teamProjectId: eventToEdit.teamProjectId,
    });
    setShowAddEventModal(true);
  };


  const numDaysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonthIndex = getFirstDayOfMonth(year, month);
  
  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonthIndex; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="border border-neutral-200 bg-neutral-50 h-32 sm:h-36"></div>);
  }

  for (let day = 1; day <= numDaysInMonth; day++) {
    const currentDateObj = new Date(year, month, day);
    currentDateObj.setHours(0,0,0,0); 
    const today = new Date();
    today.setHours(0,0,0,0);
    const isToday = currentDateObj.getTime() === today.getTime();

    const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start);
        eventStart.setHours(0,0,0,0);
        const eventEnd = new Date(event.end);
        eventEnd.setHours(23,59,59,999);
        return currentDateObj >= eventStart && currentDateObj <= eventEnd;
    });

    calendarCells.push(
      <div 
        key={day} 
        className={`border border-neutral-200 p-1.5 sm:p-2 h-32 sm:h-36 relative flex flex-col group hover:bg-primary-light/5 cursor-pointer transition-colors duration-150`}
        onClick={() => handleDayClick(day)}
        role="button"
        tabIndex={0}
        aria-label={`Date ${day}, ${dayEvents.length} events`}
      >
        <span className={`text-xs sm:text-sm font-medium ${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-neutral-700'}`}>
          {day}
        </span>
        <div className="mt-1 flex-grow overflow-y-auto space-y-0.5 max-h-[100px] sm:max-h-[110px] pr-1 scrollbar-thin">
          {dayEvents.slice(0,3).map(event => (
            <div 
              key={event.id} 
              className={`text-[10px] sm:text-xs p-1 rounded-sm truncate text-white cursor-pointer ${
                event.type === 'deadline' ? 'bg-red-500 hover:bg-red-600' : 
                event.type === 'meeting' ? 'bg-blue-500 hover:bg-blue-600' : 
                'bg-green-500 hover:bg-green-600'
              }`} 
              title={event.title}
              onClick={(e) => handleEventClick(event, e)}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-[10px] text-neutral-500 text-center mt-0.5">+{dayEvents.length - 3} more</div>
          )}
        </div>
      </div>
    );
  }
  
  const handleModalClose = () => {
      setShowAddEventModal(false);
      resetModalState(new Date(currentDisplayDate));
  }

  return (
    <Card title="📅 팀 공유 캘린더" actions={<Button size="sm" onClick={() => {resetModalState(new Date(currentDisplayDate)); setShowAddEventModal(true);}} leftIcon={<PlusCircleIcon />}>일정 추가</Button>}>
      <div className="mb-4 flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeftIcon className="w-5 h-5"/>
        </Button>
        <h3 className="text-lg sm:text-xl font-semibold text-neutral-800">
          {year}년 {month + 1}월
        </h3>
        <Button variant="outline" size="sm" onClick={nextMonth} aria-label="Next month">
            <ChevronRightIcon className="w-5 h-5"/>
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px border-t border-l border-neutral-200 bg-neutral-200">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center py-2 text-xs sm:text-sm font-medium text-neutral-600 bg-neutral-100 border-r border-b border-neutral-200">
            {day}
          </div>
        ))}
        {calendarCells}
      </div>
      <Modal 
        isOpen={showAddEventModal} 
        onClose={handleModalClose} 
        title={editingEventId ? "일정 수정" : "새 일정 등록"}
        footer={
          <div className="flex justify-between w-full">
            <div>
              {editingEventId && (
                <Button variant="danger" onClick={handleDeleteEvent} leftIcon={<TrashIcon className="w-4 h-4"/>}>삭제</Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="ghost" onClick={handleModalClose}>취소</Button>
              <Button onClick={editingEventId ? handleUpdateEvent : handleAddEvent}>
                {editingEventId ? "변경사항 저장" : "등록"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="일정 제목"
            value={newEvent.title || ''}
            onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <Input
            label="시작일"
            type="datetime-local"
            value={newEvent.start ? new Date(newEvent.start.getTime() - newEvent.start.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
            onChange={(e) => setNewEvent(prev => ({ ...prev, start: new Date(e.target.value) }))}
            required
          />
          <Input
            label="종료일"
            type="datetime-local"
            value={newEvent.end ? new Date(newEvent.end.getTime() - newEvent.end.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
            onChange={(e) => setNewEvent(prev => ({ ...prev, end: new Date(e.target.value) }))}
            required
          />
          <TextArea
            label="설명 (선택 사항)"
            value={newEvent.description || ''}
            onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">종류</label>
            <select
              value={newEvent.type || 'meeting'}
              onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as CalendarEvent['type'] }))}
              className="block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="meeting">회의</option>
              <option value="deadline">마감일</option>
              <option value="other">기타</option>
            </select>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

interface KanbanCardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: KanbanCardType | null;
  columnTitle: string;
  onUpdateCard: (updatedCard: KanbanCardType) => void;
  onAddComment: (cardId: string, commentText: string) => void;
  onApproveCard: (cardId: string) => void;
  currentUser: User;
  teamMembers: User[];
}

const KanbanCardDetailModal: React.FC<KanbanCardDetailModalProps> = ({
  isOpen, onClose, card, columnTitle, onUpdateCard, onAddComment, onApproveCard, currentUser, teamMembers
}) => {
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedDueDate, setEditedDueDate] = useState('');
  const [editedAssigneeIds, setEditedAssigneeIds] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [activePopover, setActivePopover] = useState<'dueDate' | 'assignees' | null>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (card) {
      setEditedTitle(card.title);
      setEditedDescription(card.description || '');
      setEditedDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
      setEditedAssigneeIds(card.assigneeIds || []);
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>, popoverType: 'dueDate' | 'assignees') => {
    setPopoverAnchorEl(event.currentTarget);
    setActivePopover(popoverType);
  };

  const handleClosePopover = () => {
    setPopoverAnchorEl(null);
    setActivePopover(null);
  };

  const handleSave = () => {
    handleClosePopover();
    onUpdateCard({ 
        ...card, 
        title: editedTitle, 
        description: editedDescription,
        dueDate: editedDueDate ? new Date(editedDueDate) : undefined,
        assigneeIds: editedAssigneeIds
    });
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(card.id, newComment.trim());
      setNewComment('');
    }
  };

  const handleAssigneeSelectionInModal = (memberId: string) => {
    setEditedAssigneeIds(prev =>
        prev.includes(memberId)
            ? prev.filter(id => id !== memberId)
            : [...prev, memberId]
    );
  };
  
  const isDoneColumn = columnTitle === 'Done'; 

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="작업 상세 정보" footer={
        <div className="flex w-full justify-between items-center">
            <div>
                {isDoneColumn && (
                    card.isApproved ? (
                    <Button size="sm" variant="ghost" disabled className="text-green-500" leftIcon={<CheckCircleIcon className="w-5 h-5"/>}>
                        승인 완료
                    </Button>
                    ) : (
                    <Button size="sm" variant="primary" onClick={() => onApproveCard(card.id)} leftIcon={<CheckCircleIcon className="w-5 h-5"/>}>
                        승인 요청
                    </Button>
                    )
                )}
            </div>
            <div className="flex space-x-2">
                <Button variant="ghost" onClick={onClose}>닫기</Button>
                <Button onClick={handleSave}>변경사항 저장</Button>
            </div>
        </div>
    }>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-neutral-700">제목</label>
                <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="text-lg font-semibold" />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700">설명</label>
                <TextArea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows={4} />
            </div>

            <div className="grid grid-cols-2 gap-x-4">
                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">마감일</label>
                    <div onClick={(e) => handleOpenPopover(e, 'dueDate')} className="flex items-center space-x-2 cursor-pointer p-1 rounded-md hover:bg-neutral-100 transition-colors">
                        <CalendarDaysIcon className="w-5 h-5 text-neutral-500" />
                        <span className={`text-sm ${editedDueDate ? 'text-neutral-800' : 'text-neutral-500'}`}>
                            {editedDueDate ? new Date(editedDueDate).toLocaleDateString() : '날짜 선택'}
                        </span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">담당자</label>
                    <div onClick={(e) => handleOpenPopover(e, 'assignees')} className="flex items-center space-x-1 cursor-pointer p-1 rounded-md hover:bg-neutral-100 min-h-[28px]">
                        {editedAssigneeIds.length > 0 ? (
                            <div className="flex space-x-1">
                                {teamMembers
                                    .filter(m => editedAssigneeIds.includes(m.id))
                                    .slice(0, 4) // Show max 4 avatars
                                    .map(member => (
                                        <div key={member.id} className="relative group">
                                            <img
                                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white"
                                                src={member.profileImage || `https://picsum.photos/seed/${member.id}/24/24`}
                                                alt={member.name}
                                            />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-neutral-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                {member.name}
                                            </div>
                                        </div>
                                    ))
                                }
                                {editedAssigneeIds.length > 4 && (
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-neutral-200 text-xs font-semibold text-neutral-600">
                                        +{editedAssigneeIds.length - 4}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-neutral-500 text-sm">담당자 선택</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="text-sm">
                <p><span className="font-medium">상태:</span> {columnTitle}</p>
            </div>

            <div>
                <h4 className="text-md font-semibold text-neutral-700 mb-2 border-t pt-3">댓글</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3 bg-neutral-50 p-2 rounded">
                    {card.comments && card.comments.length > 0 ? (
                        card.comments.map(comment => (
                            <div key={comment.id} className="text-xs p-1.5 bg-white rounded shadow-sm">
                                <p className="text-neutral-800">{comment.text}</p>
                                <p className="text-neutral-500 mt-0.5">- {comment.userName} ({new Date(comment.createdAt).toLocaleString()})</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-neutral-500 italic">댓글이 없습니다.</p>
                    )}
                </div>
                <div className="flex items-start space-x-2">
                    <TextArea 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        placeholder="댓글을 입력하세요..." 
                        rows={2} 
                        className="flex-grow"
                    />
                    <Button onClick={handleAddComment} size="sm" variant="outline" className="h-full">댓글 추가</Button>
                </div>
            </div>
        </div>
        {activePopover && (
            <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={handleClosePopover}></div>
                {/* Popover Content */}
                <div
                    style={{
                        position: 'absolute',
                        top: popoverAnchorEl ? popoverAnchorEl.getBoundingClientRect().bottom + window.scrollY + 5 : 0,
                        left: popoverAnchorEl ? popoverAnchorEl.getBoundingClientRect().left + window.scrollX : 0,
                    }}
                    className="z-50 bg-white border border-neutral-200 rounded-md shadow-xl"
                >
                    {activePopover === 'dueDate' && (
                        <div className="p-2">
                            <Input
                                type="date"
                                value={editedDueDate}
                                onChange={(e) => {
                                    setEditedDueDate(e.target.value);
                                    handleClosePopover(); // 날짜 선택 시 바로 닫기
                                }}
                                className="block w-full"
                            />
                        </div>
                    )}
                    {activePopover === 'assignees' && (
                        <div className="w-64">
                            <div className="p-3 border-b">
                                <h4 className="font-semibold text-sm text-neutral-800">담당자 변경</h4>
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                                {teamMembers.map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => handleAssigneeSelectionInModal(member.id)}
                                        className={`px-3 py-2 cursor-pointer flex justify-between items-center hover:bg-neutral-100 transition-colors duration-150 ${
                                            editedAssigneeIds.includes(member.id) ? 'bg-primary-light/30' : ''
                                        }`}
                                    >
                                        <div>
                                            <span className="font-medium text-sm text-neutral-800">{member.name}</span>
                                            <span className="text-xs text-neutral-500 ml-2">({member.email})</span>
                                        </div>
                                        {editedAssigneeIds.includes(member.id) && (
                                            <CheckCircleIcon className="w-5 h-5 text-primary" />
                                        )}
                                    </div>
                                ))}
                            </div>
                             <div className="p-2 bg-neutral-50 border-t">
                                <Button onClick={handleClosePopover} size="sm" className="w-full">닫기</Button>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
    </Modal>
  );
};

const TeamKanbanBoard: React.FC<{ teamProjectId: string, currentUser: User, team: TeamProject | null }> = ({ teamProjectId, currentUser, team }) => {
    const [board, setBoard] = useState<KanbanBoard | null>(null);
    const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
    const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);
    const [selectedCardColumnTitle, setSelectedCardColumnTitle] = useState('');
    
    // 새 태스크 추가를 위한 상태
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newDueDate, setNewDueDate] = useState<string>('');
    const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);
    const [targetColumnId, setTargetColumnId] = useState<string | null>(null);

    // 새 리스트 추가를 위한 상태
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListName, setNewListName] = useState('');

    const loadKanbanBoard = useCallback(async () => {
        try {
            const kanbanBoardData = await fetchKanbanBoard(teamProjectId);
            setBoard(kanbanBoardData);
        } catch (error) {
            console.error('칸반 보드 데이터를 불러오는 데 실패했습니다:', error);
            setBoard({ id: `kanban-${teamProjectId}`, teamProjectId, columns: [] });
        }
    }, [teamProjectId]);

    useEffect(() => {
        if (teamProjectId) {
            loadKanbanBoard();
        }
    }, [teamProjectId, loadKanbanBoard]);

    const handleOpenCreateTaskModal = (columnId: string) => {
        setTargetColumnId(columnId);
        setIsCreateTaskModalOpen(true);
    };

    // 담당자 선택 핸들러
    const handleAssigneeSelection = (memberId: string) => {
        setNewAssigneeIds(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim() || !targetColumnId) return;

        try {
            await createKanbanTask({
                subject: newTaskTitle,
                content: newTaskDescription,
                kanbanListId: targetColumnId,
                deadline: newDueDate ? new Date(newDueDate) : undefined,
                assigneeIds: newAssigneeIds,
            });
            // 성공적으로 생성 후 보드 데이터 다시 로드
            await loadKanbanBoard();
            // 모달 닫고 상태 초기화
            setIsCreateTaskModalOpen(false);
            setNewTaskTitle('');
            setNewTaskDescription('');
            setNewDueDate('');
            setNewAssigneeIds([]);
            setTargetColumnId(null);
        } catch (error) {
            console.error("태스크 생성에 실패했습니다:", error);
            // 사용자에게 에러 알림 (예: alert 또는 토스트 메시지)
            alert("태스크 생성에 실패했습니다. 다시 시도해주세요.");
        }
    };

    const handleCreateList = async () => {
        if (!newListName.trim() || !board) return;

        try {
            await createKanbanList(board.id, { kanbanListName: newListName });
            await loadKanbanBoard();
            setNewListName('');
            setIsCreatingList(false);
        } catch (error) {
            console.error("리스트 생성에 실패했습니다:", error);
            alert("리스트 생성에 실패했습니다. 다시 시도해주세요.");
        }
    };

    const handleCardClick = (card: KanbanCardType, columnTitle: string) => {
        setSelectedCard(card);
        setSelectedCardColumnTitle(columnTitle);
        setIsCardDetailModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCardDetailModalOpen(false);
        setSelectedCard(null);
        setSelectedCardColumnTitle('');
    };
    
    const handleUpdateCard = async (updatedCard: KanbanCardType) => {
        try {
            await updateKanbanTask(updatedCard.id, {
                subject: updatedCard.title,
                content: updatedCard.description,
                deadline: updatedCard.dueDate,
                assigneeIds: updatedCard.assigneeIds
            });
            // 성공적으로 업데이트 후 보드 데이터 다시 로드
            await loadKanbanBoard();
            // 모달 내의 카드 정보도 업데이트
            setSelectedCard(updatedCard); 
        } catch (error) {
            console.error("태스크 업데이트에 실패했습니다:", error);
            alert("태스크 업데이트에 실패했습니다.");
        }
    };

    const handleAddCommentToCard = async (cardId: string, commentText: string) => {
        if (!commentText.trim()) return;
        try {
            const newComment = await addKanbanTaskComment(cardId, commentText);
            
            // UI 즉시 업데이트
            const optimisticUpdate = (prevBoard: KanbanBoard | null) => {
                if (!prevBoard) return null;
                const newColumns = prevBoard.columns.map(col => ({
                    ...col,
                    cards: col.cards.map(card => {
                        if (card.id === cardId) {
                            return { ...card, comments: [...(card.comments || []), newComment] };
                        }
                        return card;
                    })
                }));
                const updatedCardFromState = newColumns.flatMap(col => col.cards).find(c => c.id === cardId);
                if (updatedCardFromState) setSelectedCard(updatedCardFromState);
                return { ...prevBoard, columns: newColumns };
            };
            setBoard(optimisticUpdate);

        } catch (error) {
            console.error("댓글 추가에 실패했습니다:", error);
            alert("댓글 추가에 실패했습니다.");
            // 실패 시 원래 데이터로 롤백 (필요 시)
            // await loadKanbanBoard(); 
        }
    };
    
    const handleApproveCard = async (cardId: string) => {
        try {
            await updateKanbanTask(cardId, { isApproved: true });
            await loadKanbanBoard();
        } catch(error) {
            console.error("태스크 승인에 실패했습니다:", error);
            alert("태스크 승인에 실패했습니다.");
        }
    };


    if (!board) return <Card title="📊 칸반 보드"><p>로딩 중...</p></Card>;

    return (
        <Card title="📊 칸반 보드" actions={
            <Button size="sm" onClick={() => setIsCreatingList(true)} leftIcon={<PlusCircleIcon/>}>새 리스트 등록</Button>
        }>
            <div className="flex space-x-4 overflow-x-auto p-2 bg-neutral-50 rounded min-h-[500px]">
                {board.columns.sort((a,b) => a.order - b.order).map(column => (
                    <div key={column.id} className="w-80 bg-neutral-100 p-3 rounded-lg shadow-sm flex-shrink-0">
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="font-semibold text-neutral-700">{column.title} ({column.cards.length})</h3>
                            <Button size="sm" variant="ghost" onClick={() => handleOpenCreateTaskModal(column.id)} aria-label="새 작업 추가">
                                <PlusCircleIcon className="w-5 h-5 text-neutral-500 hover:text-primary"/>
                            </Button>
                        </div>
                        <div className="space-y-3 min-h-[450px]">
                            {column.cards.sort((a,b) => a.order - b.order).map(card => (
                                <div 
                                    key={card.id} 
                                    className="bg-white p-3 rounded-md shadow border border-neutral-200 hover:shadow-lg hover:border-primary-light transition-all cursor-pointer group"
                                    onClick={() => handleCardClick(card, column.title)}
                                >
                                    <h4 className="font-medium text-sm text-neutral-800 group-hover:text-primary">{card.title}</h4>
                                    {card.description && <p className="text-xs text-neutral-600 mt-1 truncate group-hover:whitespace-normal">{card.description}</p>}
                                    {card.dueDate && <p className={`text-xs mt-1.5 ${new Date(card.dueDate) < new Date() && !card.isApproved ? 'text-red-600 font-medium' : 'text-neutral-500'}`}>마감: {new Date(card.dueDate).toLocaleDateString()}</p>}
                                    
                                    <div className="mt-2 pt-2 border-t border-neutral-100 flex justify-between items-center">
                                        <div className="flex -space-x-1 overflow-hidden">
                                            {card.assigneeIds && team && card.assigneeIds.slice(0,3).map(assigneeId => {
                                                const member = team.members.find(m => m.id === assigneeId);
                                                return member ? (
                                                    <img key={assigneeId} className="inline-block h-5 w-5 rounded-full ring-1 ring-white" src={member.profileImage || `https://picsum.photos/seed/${assigneeId}/20/20`} alt={member.name} title={member.name} />
                                                ) : null;
                                            })}
                                            {card.assigneeIds && card.assigneeIds.length > 3 && <span className="text-xs text-neutral-400 self-center pl-1">+{card.assigneeIds.length - 3}</span> }
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {card.comments && card.comments.length > 0 && 
                                                <span className="text-xs text-neutral-500 flex items-center"><ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 mr-0.5"/>{card.comments.length}</span>}
                                            {card.isApproved && <CheckCircleIcon className="w-4 h-4 text-green-500" title="승인 완료"/>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {column.cards.length === 0 && <p className="text-xs text-neutral-400 p-2 text-center">이 컬럼에 카드가 없습니다.</p>}
                        </div>
                    </div>
                ))}
                {isCreatingList && (
                    <div className="w-80 bg-neutral-200 p-3 rounded-lg shadow-sm flex-shrink-0 h-fit">
                        <Input
                            placeholder="새 리스트 이름..."
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            autoFocus
                            className="mb-2"
                        />
                        <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => setIsCreatingList(false)}>취소</Button>
                            <Button size="sm" onClick={handleCreateList}>추가</Button>
                        </div>
                    </div>
                )}
            </div>
            {selectedCard && (
                <KanbanCardDetailModal
                    isOpen={isCardDetailModalOpen}
                    onClose={handleCloseModal}
                    card={selectedCard}
                    columnTitle={selectedCardColumnTitle}
                    onUpdateCard={handleUpdateCard}
                    onAddComment={handleAddCommentToCard}
                    onApproveCard={handleApproveCard}
                    currentUser={currentUser}
                    teamMembers={team?.members || []}
                />
            )}

            {/* 새 태스크 추가 모달 */}
            <Modal
                isOpen={isCreateTaskModalOpen}
                onClose={() => setIsCreateTaskModalOpen(false)}
                title="새 작업 추가"
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={() => setIsCreateTaskModalOpen(false)}>취소</Button>
                        <Button onClick={handleCreateTask}>추가</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="작업 제목"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="새 작업의 제목을 입력하세요"
                        autoFocus
                    />
                    <TextArea
                        label="설명 (선택)"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        placeholder="작업에 대한 설명을 입력하세요"
                        rows={4}
                    />
                    <Input
                        label="마감일 (선택)"
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                    />
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">담당자 (선택)</label>
                        <div className="block w-full border border-neutral-300 rounded-md shadow-sm sm:text-sm h-24 overflow-y-auto">
                            {team?.members.map(member => (
                                <div
                                    key={member.id}
                                    onClick={() => handleAssigneeSelection(member.id)}
                                    className={`px-3 py-2 cursor-pointer flex justify-between items-center hover:bg-neutral-100 transition-colors duration-150 ${
                                        newAssigneeIds.includes(member.id) ? 'bg-primary-light/50' : ''
                                    }`}
                                >
                                    <div>
                                        <span className="font-medium text-neutral-800">{member.name}</span>
                                        <span className="text-sm text-neutral-500 ml-2">({member.email})</span>
                                    </div>
                                    {newAssigneeIds.includes(member.id) && (
                                        <CheckCircleIcon className="w-5 h-5 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};

interface BulletinPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BulletinPost | null;
  onAddComment: (postId: string, commentText: string) => void;
  onDeletePost: (postId: string) => void;
  currentUser: User;
}

const BulletinPostDetailModal: React.FC<BulletinPostDetailModalProps> = ({
  isOpen, onClose, post, onAddComment, onDeletePost, currentUser
}) => {
  const [newCommentText, setNewCommentText] = useState('');

  if (!isOpen || !post) return null;

  const handleAddComment = () => {
    if (newCommentText.trim()) {
      onAddComment(post.id, newCommentText.trim());
      setNewCommentText('');
    }
  };

  const handleDelete = () => {
    if (window.confirm("이 게시글을 정말 삭제하시겠습니까?")) {
        onDeletePost(post.id);
        onClose(); 
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={post.title}
      footer={
        <div className="flex justify-between w-full">
            {(currentUser.id === post.authorId) && 
                <Button variant="danger" onClick={handleDelete} size="sm">게시글 삭제</Button>
            }
            <Button variant="ghost" onClick={onClose} className="ml-auto">닫기</Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="pb-2 border-b">
          <p className="text-xs text-neutral-500">
            작성자: {post.authorName} | 작성일: {new Date(post.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-line">
          {post.content}
        </div>

        {post.attachments && post.attachments.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-neutral-600 mt-3 mb-1">첨부파일</h5>
            <ul className="list-disc list-inside text-xs">
              {post.attachments.map(att => (
                <li key={att.id}><a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{att.fileName}</a></li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-md font-semibold text-neutral-700 mb-2">댓글 ({post.comments?.length || 0})</h4>
          <div className="space-y-3 mb-3">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map(comment => (
                <div key={comment.id} className="text-xs p-2 bg-neutral-100 rounded">
                  <p className="text-neutral-800 whitespace-pre-line">{comment.text}</p>
                  <p className="text-neutral-500 mt-1">- {comment.userName} ({new Date(comment.createdAt).toLocaleString()})</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic">댓글이 없습니다.</p>
            )}
          </div>
          <div className="flex items-start space-x-2">
            <TextArea 
              value={newCommentText} 
              onChange={(e) => setNewCommentText(e.target.value)} 
              placeholder="댓글을 입력하세요..." 
              rows={2} 
              className="flex-grow text-sm"
            />
            <Button onClick={handleAddComment} size="sm" variant="outline" className="h-full">댓글 작성</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const TeamBulletinBoard: React.FC<{ teamProjectId: string, currentUser: User }> = ({ teamProjectId, currentUser }) => {
    const [posts, setPosts] = useState<BulletinPost[]>([]);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [newPostData, setNewPostData] = useState<{title: string, content: string}>({title: '', content: ''});
    
    const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);
    const [isPostDetailModalOpen, setIsPostDetailModalOpen] = useState(false);


    useEffect(()=> {
        setPosts([
            {id: 'post1', teamProjectId, title: '프로젝트 자료 공유', content: '관련 자료 링크입니다:\n- 디자인 시스템: [링크]\n- API 문서: [링크]', authorId: 'user_kim', authorName: '김코딩', createdAt: new Date(Date.now() - 2*86400000), comments: [{id: 'bp_c1', postId:'post1', userId:'user_park', userName:'박해커', text:'자료 감사합니다!', createdAt: new Date()}]},
            {id: 'post2', teamProjectId, title: '회의록 (2024-07-20)', content: '오늘 회의 내용 정리...\n1. 안건1 논의 결과\n2. 다음 주 액션 아이템', authorId: 'user_park', authorName: '박해커', createdAt: new Date(), comments:[]},
        ]);
    }, [teamProjectId]);

    const handleOpenCreatePostModal = () => {
        setNewPostData({title: '', content: ''});
        setIsCreatePostModalOpen(true);
    };

    const handleCreatePost = () => {
        if (!newPostData.title.trim() || !newPostData.content.trim()) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }
        const newPost: BulletinPost = {
            id: `post-${Date.now()}`,
            teamProjectId,
            title: newPostData.title,
            content: newPostData.content,
            authorId: currentUser.id,
            authorName: currentUser.name || '알 수 없음',
            createdAt: new Date(),
            comments: [],
        };
        setPosts(prev => [newPost, ...prev]);
        setIsCreatePostModalOpen(false);
    };
    
    const handleOpenPostDetail = (post: BulletinPost) => {
        setSelectedPost(post);
        setIsPostDetailModalOpen(true);
    };

    const handleAddBulletinComment = (postId: string, commentText: string) => {
        const newComment: BulletinComment = {
            id: `bcomment-${Date.now()}`,
            postId,
            userId: currentUser.id,
            userName: currentUser.name || "알 수 없음",
            text: commentText,
            createdAt: new Date()
        };
        setPosts(prevPosts => prevPosts.map(p => 
            p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
        ));
        if(selectedPost && selectedPost.id === postId) {
            setSelectedPost(prevSelPost => prevSelPost ? {...prevSelPost, comments: [...(prevSelPost.comments || []), newComment]} : null);
        }
    };
    
    const handleDeleteBulletinPost = (postId: string) => {
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
        if(selectedPost && selectedPost.id === postId) {
            setIsPostDetailModalOpen(false);
            setSelectedPost(null);
        }
    };


    return (
        <Card title="📋 게시판" actions={<Button size="sm" onClick={handleOpenCreatePostModal} leftIcon={<PlusCircleIcon/>}>새 글 작성</Button>}>
            <ul className="space-y-3">
                {posts.map(post => (
                    <li key={post.id} className="p-3 bg-neutral-50 rounded shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start">
                             <div className="flex-grow cursor-pointer" onClick={() => handleOpenPostDetail(post)}>
                                <h4 className="font-semibold text-primary-dark hover:underline">{post.title}</h4>
                                <p className="text-xs text-neutral-600 truncate max-w-md">{post.content}</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    작성자: {post.authorName} | {new Date(post.createdAt).toLocaleDateString()} | 댓글: {post.comments?.length || 0}
                                </p>
                            </div>
                            {currentUser.id === post.authorId && ( 
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                        if (window.confirm("이 게시글을 정말 삭제하시겠습니까?")) {
                                            handleDeleteBulletinPost(post.id);
                                        }
                                    }} 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="게시글 삭제"
                                >
                                    <TrashIcon className="w-4 h-4 text-red-500"/>
                                </Button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
             {posts.length === 0 && <p className="text-neutral-500 py-4 text-center">게시글이 없습니다.</p>}
            
            <Modal
                isOpen={isCreatePostModalOpen}
                onClose={() => setIsCreatePostModalOpen(false)}
                title="새 게시글 작성"
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={() => setIsCreatePostModalOpen(false)}>취소</Button>
                        <Button onClick={handleCreatePost}>등록</Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <Input 
                        label="제목" 
                        value={newPostData.title} 
                        onChange={e => setNewPostData(prev => ({...prev, title: e.target.value}))}
                        required
                    />
                    <TextArea 
                        label="내용" 
                        value={newPostData.content} 
                        onChange={e => setNewPostData(prev => ({...prev, content: e.target.value}))}
                        rows={8}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">첨부파일 (선택)</label>
                        <Input type="file" multiple className="text-sm"/>
                    </div>
                </div>
            </Modal>

            {selectedPost && (
                 <BulletinPostDetailModal
                    isOpen={isPostDetailModalOpen}
                    onClose={() => setIsPostDetailModalOpen(false)}
                    post={selectedPost}
                    onAddComment={handleAddBulletinComment}
                    onDeletePost={handleDeleteBulletinPost}
                    currentUser={currentUser}
                />
            )}
        </Card>
    );
};


export const TeamSpacePage: React.FC = () => {
  const { workspaceId, teamProjectId } = useParams<{ workspaceId: string, teamProjectId: string }>();
  const { currentUser, currentTeamProject, setCurrentTeamProject } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [team, setTeam] = useState<TeamProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState(''); 
  const [authError, setAuthError] = useState('');
  const [isAuthenticatedForTeam, setIsAuthenticatedForTeam] = useState(false);
  
  // 팀 설정 관련 상태
  const [showTeamSettingsDropdown, setShowTeamSettingsDropdown] = useState(false);
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [teamActionLoading, setTeamActionLoading] = useState(false);
  
  const TABS = [
      { name: '공지', id: 'announcements', icon: <ClipboardDocumentListIcon /> },
      { name: '칸반보드', id: 'kanban', icon: <TableCellsIcon /> },
      { name: '게시판', id: 'bulletin', icon: <Bars3Icon /> },
      // { name: '화상회의', id: 'video', icon: <VideoCameraIcon /> }, // Removed
      { name: '캘린더', id: 'calendar', icon: <CalendarDaysIcon /> },
  ] as const; 
  
  type TeamSpaceActiveTabType = typeof TABS[number]['id'];

  const getInitialTab = (): TeamSpaceActiveTabType => {
    const queryParams = new URLSearchParams(location.search);
    const feature = queryParams.get('feature');
    if (feature && TABS.some(tab => tab.id === feature)) {
      return feature as TeamSpaceActiveTabType;
    }
    return 'announcements';
  };
  const [activeTab, setActiveTab] = useState<TeamSpaceActiveTabType>(getInitialTab());


  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const feature = queryParams.get('feature');
    if (feature && TABS.some(tab => tab.id === feature) && feature !== activeTab) {
        setActiveTab(feature as TeamSpaceActiveTabType);
    }
  }, [location.search, activeTab]);


  // 기존의 데모 데이터 사용 로직 제거 - 실제 API 호출로 대체됨


  const handlePasswordSubmit = () => {
    if (password === 'password123' && team?.passwordProtected) { 
      setIsAuthenticatedForTeam(true);
      setAuthError('');
    } else {
      setAuthError('잘못된 비밀번호입니다.');
    }
  };

  const handleAddAnnouncement = useCallback((content: string) => {
    if (team && currentUser) {
      const newAnnouncement: Announcement = {
        id: `anno-${Date.now()}`,
        content,
        author: currentUser.name || 'Unknown User',
        timestamp: new Date()
      };
      const updatedTeam = { ...team, announcements: [newAnnouncement, ...team.announcements] };
      setTeam(updatedTeam);
      setCurrentTeamProject(updatedTeam); 
    }
  }, [team, currentUser, setCurrentTeamProject]);

  const handleDeleteAnnouncement = useCallback((announcementId: string) => {
    if (team) {
        const updatedAnnouncements = team.announcements.filter(anno => anno.id !== announcementId);
        const updatedTeam = { ...team, announcements: updatedAnnouncements };
        setTeam(updatedTeam);
        setCurrentTeamProject(updatedTeam); 
    }
  }, [team, setCurrentTeamProject]);

  // 팀 탈퇴 기능
  const handleLeaveTeam = useCallback(async () => {
    if (!team || !teamProjectId) return;
    
    try {
      setTeamActionLoading(true);
      await teamApi.leaveTeam(teamProjectId);
      setShowLeaveTeamModal(false);
      // 팀 탈퇴 성공 시 워크스페이스 홈으로 이동
      navigate(`/ws/${workspaceId}`);
    } catch (error) {
      console.error('팀 탈퇴 실패:', error);
      alert('팀 탈퇴에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setTeamActionLoading(false);
    }
  }, [team, teamProjectId, workspaceId, navigate]);

  // 팀 삭제 기능
  const handleDeleteTeam = useCallback(async () => {
    if (!team || !teamProjectId) return;
    
    try {
      setTeamActionLoading(true);
      await teamApi.deleteTeam(teamProjectId);
      setShowDeleteTeamModal(false);
      // 팀 삭제 성공 시 워크스페이스 홈으로 이동
      navigate(`/ws/${workspaceId}`);
    } catch (error) {
      console.error('팀 삭제 실패:', error);
      alert('팀 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setTeamActionLoading(false);
    }
  }, [team, teamProjectId, workspaceId, navigate]);

  // 현재 사용자가 팀장인지 확인하는 함수
  const isTeamLeader = useCallback(() => {
    if (!team || !currentUser) {
      console.log('팀장 권한 확인 실패: team 또는 currentUser 없음');
      return false;
    }
    
    // 임시로 모든 팀 멤버가 팀장 권한을 가지도록 설정 (테스트용)
    const hasLeaderPermission = team.members.some(member => member.id === currentUser.id);
    console.log('팀장 권한 확인:', { 
      currentUserId: currentUser.id, 
      teamMembers: team.members.map(m => m.id), 
      hasLeaderPermission 
    });
    
    // 테스트용: 팀 멤버라면 팀장 권한 부여
    return hasLeaderPermission;
  }, [team, currentUser]);

  // 팀 데이터 로드 함수
  const loadTeamData = async () => {
    console.log('팀 데이터 로드 시작:', teamProjectId);
    
    if (!teamProjectId) {
      console.log('팀 ID 없음');
      setTeam(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 실제 API 호출 - 백엔드에서 이미 멤버 정보도 함께 반환함
      const teamData = await teamApi.getTeam(teamProjectId);
      console.log('팀 데이터 로드 성공:', teamData);
      
      setTeam(teamData);
      setCurrentTeamProject(teamData);
      
      // 비밀번호 보호가 없다면 바로 인증 완료
      if (!teamData.passwordProtected) {
        setIsAuthenticatedForTeam(true);
      }
    } catch (error) {
      console.error('팀 데이터 로드 실패:', error);
      setError('팀 정보를 불러오는데 실패했습니다.');
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [workspaceId, teamProjectId]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTeamSettingsDropdown) {
        const target = event.target as Element;
        // 드롭다운 내부나 톱니바퀴 버튼 클릭이 아닌 경우만 닫기
        if (!target.closest('[data-dropdown="team-settings"]')) {
          setShowTeamSettingsDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTeamSettingsDropdown]);

  if (loading) return <div className="p-6 text-center">팀 정보를 불러오는 중...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!team) return <div className="p-6 text-center text-red-500">팀을 찾을 수 없습니다. <Link to={`/ws/${workspaceId || ''}`} className="text-primary hover:underline">워크스페이스 홈으로</Link></div>;
  if (!currentUser) return <p className="p-6">로그인이 필요합니다.</p>; 

  if (team.passwordProtected && !isAuthenticatedForTeam) {
    return (
      <Modal 
        isOpen={true} 
        onClose={() => navigate(`/ws/${workspaceId}`)} 
        title={`${team.name} - 비밀번호 입력`}
        footer={<Button onClick={handlePasswordSubmit}>입장</Button>}
      >
        <p className="mb-4 text-sm text-neutral-600">이 팀 스페이스는 비밀번호로 보호되어 있습니다.</p>
        <Input 
          type="password" 
          placeholder="팀 비밀번호" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          error={authError}
        />
      </Modal>
    );
  }
  
  let contentToRender;
  switch(activeTab) {
      case 'announcements': contentToRender = <TeamAnnouncementBoard announcements={team.announcements} onAddAnnouncement={handleAddAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} />; break;
      // case 'video': // Removed
      //    contentToRender = <TeamVideoConference teamMembers={team.members} currentUser={currentUser} />; 
      //    break;
      case 'calendar': contentToRender = <TeamCalendar teamProjectId={team.id} />; break;
      case 'kanban': contentToRender = <TeamKanbanBoard teamProjectId={team.id} currentUser={currentUser} team={team} />; break;
      case 'bulletin': contentToRender = <TeamBulletinBoard teamProjectId={team.id} currentUser={currentUser} />; break;
      default: contentToRender = <p>선택된 기능이 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      <Card title={`팀 스페이스: ${team.name}`} 
            actions={
              <div className="flex items-center space-x-4">
                {team.progress !== undefined && (
                  <span className="text-sm text-neutral-500">진행도: {team.progress}%</span>
                )}
                {/* 팀 설정 드롭다운 */}
                <div className="relative" data-dropdown="team-settings">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTeamSettingsDropdown(!showTeamSettingsDropdown)}
                    className="p-1"
                    data-dropdown="team-settings"
                  >
                    <CogIcon className="w-5 h-5" />
                  </Button>
                  
                  {showTeamSettingsDropdown && (
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-md shadow-lg z-20"
                      data-dropdown="team-settings"
                    >
                      <div className="py-1" data-dropdown="team-settings">
                        <button
                          onClick={() => {
                            setShowTeamSettingsDropdown(false);
                            setShowLeaveTeamModal(true);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center space-x-2"
                          data-dropdown="team-settings"
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4" />
                          <span>팀 탈퇴</span>
                        </button>
                        
                        {isTeamLeader() && (
                          <button
                            onClick={() => {
                              setShowTeamSettingsDropdown(false);
                              setShowDeleteTeamModal(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            data-dropdown="team-settings"
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span>팀 삭제</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            }>
        <div className="mb-6 border-b border-neutral-200">
          <nav className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => (
            <button
                key={tab.name}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1
                ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
            >
                {React.cloneElement(tab.icon, { className: "w-4 h-4 sm:w-5 sm:h-5"})}
                <span>{tab.name}</span>
            </button>
            ))}
          </nav>
        </div>
        {contentToRender}
      </Card>
      
      {/* 팀 탈퇴 확인 모달 */}
      <Modal
        isOpen={showLeaveTeamModal}
        onClose={() => setShowLeaveTeamModal(false)}
        title="팀 탈퇴 확인"
        footer={
          <div className="flex justify-end space-x-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowLeaveTeamModal(false)}
              disabled={teamActionLoading}
            >
              취소
            </Button>
            <Button 
              variant="danger" 
              onClick={handleLeaveTeam}
              disabled={teamActionLoading}
            >
              {teamActionLoading ? '처리 중...' : '탈퇴하기'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ArrowRightOnRectangleIcon className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-neutral-900">
                정말로 팀을 탈퇴하시겠습니까?
              </h3>
              <p className="text-sm text-neutral-500">
                팀 탈퇴 시 다시 팀에 참여하려면 팀 초대를 받아야 합니다.
              </p>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
            <p className="text-sm text-orange-700">
              ⚠️ 팀 탈퇴 후에는 다시 팀에 참여하려면 팀 가입을 다시 해야 합니다.
            </p>
          </div>
        </div>
      </Modal>
      
      {/* 팀 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteTeamModal}
        onClose={() => setShowDeleteTeamModal(false)}
        title="팀 삭제 확인"
        footer={
          <div className="flex justify-end space-x-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteTeamModal(false)}
              disabled={teamActionLoading}
            >
              취소
            </Button>
            <Button 
              variant="danger" 
              onClick={() => {
                console.log('삭제하기 버튼 클릭됨');
                handleDeleteTeam();
              }}
              disabled={teamActionLoading}
            >
              {teamActionLoading ? '처리 중...' : '삭제하기'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <TrashIcon className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-neutral-900">
                정말로 팀을 삭제하시겠습니까?
              </h3>
              <p className="text-sm text-neutral-500">
                팀 삭제는 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
              </p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">
              🚨 <strong>주의:</strong> 팀의 모든 칸반 보드, 게시글, 일정, 공지사항이 삭제됩니다.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
