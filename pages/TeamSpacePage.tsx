import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  Button,
  Input,
  Card,
  Modal,
  TextArea,
  Pagination,
  VideoCameraIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  UserIcon,
  TrashIcon,
  XCircleIcon,
} from "../components";
import {
  TeamProject,
  Announcement,
  CalendarEvent,
  User,
  KanbanBoard,
  KanbanColumn,
  KanbanCard as KanbanCardType,
  KanbanComment,
  BulletinPost,
  BulletinComment,
} from "../types";
import { useAuth } from "../AuthContext";
import {
  PaperClipIcon,
  CheckCircleIcon,
  Bars3Icon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  ChatBubbleBottomCenterTextIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

import { teamApi } from "../services/teamApi";
import { bulletinApi } from "../services/bulletinApi";
import {
  fetchKanbanBoard,
  addKanbanTaskComment,
  updateKanbanTask,
  createKanbanTask,
  deleteKanbanTask,
  createKanbanList,
} from "../services/kanbanApi";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchAnnouncementsWithPaging,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../store/slices/announcementSlice";
import {
  fetchSchedulesByDateRange,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../store/slices/scheduleSlice";
import {
  fetchPosts,
  fetchPost,
  createPost,
  updatePost,
  deletePost,
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
  deleteAttachment,
  clearCurrentPost,
  setCurrentPost,
  resetBulletinState,
  addAttachments,
} from "../store/slices/bulletinSlice";

// Sub-components for TeamSpacePage
const TeamAnnouncementBoard: React.FC<{
  teamProjectId: string;
}> = ({ teamProjectId }) => {
  const dispatch = useAppDispatch();
  const { currentUser, currentWorkspace } = useAuth();
  const {
    announcements,
    loading,
    error,
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    hasNext,
    hasPrevious,
  } = useAppSelector((state) => state.announcements);

  // 공지사항 생성/수정을 위한 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(
    null
  );

  // 페이징 상태
  const [currentPageState, setCurrentPageState] = useState(0);

  // 컴포넌트 마운트 시 및 페이지 변경 시 공지사항 목록 조회
  useEffect(() => {
    if (teamProjectId && currentWorkspace?.id && currentUser?.id) {
      dispatch(
        fetchAnnouncementsWithPaging({
          teamId: teamProjectId,
          workspaceId: currentWorkspace.id,
          page: currentPageState,
          size: 5,
        })
      );
    }
  }, [
    dispatch,
    teamProjectId,
    currentWorkspace?.id,
    currentUser?.id,
    currentPageState,
  ]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPageState(page);
  };

  // 공지사항 생성/수정 후 현재 페이지 새로고침
  const refreshCurrentPage = () => {
    if (teamProjectId && currentWorkspace?.id && currentUser?.id) {
      dispatch(
        fetchAnnouncementsWithPaging({
          teamId: teamProjectId,
          workspaceId: currentWorkspace.id,
          page: currentPageState,
          size: 5,
        })
      );
    }
  };

  const resetModal = () => {
    setTitle("");
    setContent("");
    setEditingAnnouncement(null);
    setShowModal(false);
  };

  const openCreateModal = () => {
    resetModal();
    setShowModal(true);
  };

  const openEditModal = (announcement: any) => {
    setTitle(announcement.title || "");
    setContent(announcement.content || "");
    setEditingAnnouncement(announcement.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    if (!currentUser?.id || !currentWorkspace?.id) {
      alert("사용자 정보를 확인할 수 없습니다.");
      return;
    }

    try {
      if (editingAnnouncement) {
        // 수정
        await dispatch(
          updateAnnouncement({
            teamId: teamProjectId,
            announcementId: editingAnnouncement,
            title: title.trim(),
            content: content.trim(),
            workspaceId: currentWorkspace.id,
            accountId: currentUser.id,
          })
        ).unwrap();
      } else {
        // 생성 - 첫 번째 페이지로 이동
        await dispatch(
          createAnnouncement({
            teamId: teamProjectId,
            title: title.trim(),
            content: content.trim(),
            workspaceId: currentWorkspace.id,
            accountId: currentUser.id,
          })
        ).unwrap();
        // 새 공지사항이 첫 번째 페이지에 나타나도록 페이지를 0으로 설정
        setCurrentPageState(0);
      }
      resetModal();
      // 현재 페이지 새로고침
      setTimeout(() => refreshCurrentPage(), 100);
    } catch (error) {
      console.error("공지사항 처리 실패:", error);
      alert(
        `공지사항 ${editingAnnouncement ? "수정" : "생성"}에 실패했습니다.`
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm("이 공지사항을 정말 삭제하시겠습니까?") &&
      currentUser?.id &&
      currentWorkspace?.id
    ) {
      try {
        await dispatch(
          deleteAnnouncement({
            teamId: teamProjectId,
            announcementId: id,
            workspaceId: currentWorkspace.id,
            accountId: currentUser.id,
          })
        ).unwrap();
        // 삭제 후 현재 페이지 새로고침
        setTimeout(() => refreshCurrentPage(), 100);
      } catch (error) {
        console.error("공지사항 삭제 실패:", error);
        alert("공지사항 삭제에 실패했습니다.");
      }
    }
  };

  // 수정 권한 확인 (작성자 본인만 수정 가능)
  const canEdit = (announcement: any) => {
    return announcement.accountId === currentUser?.id;
  };

  return (
    <Card
      title="📢 팀 공지사항"
      actions={
        <Button
          size="sm"
          onClick={openCreateModal}
          leftIcon={<PlusCircleIcon />}
        >
          공지 추가
        </Button>
      }
    >
      {loading && <p className="text-neutral-500">공지사항을 불러오는 중...</p>}
      {error && <p className="text-red-500">오류: {error}</p>}
      {!loading && !error && announcements.length === 0 ? (
        <p className="text-neutral-500">아직 공지사항이 없습니다.</p>
      ) : (
        <div>
          <ul className="space-y-3">
            {announcements.map((anno) => (
              <li
                key={anno.id}
                className="p-3 bg-primary-light/10 rounded-md shadow-sm group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-neutral-800">
                      {anno.title}
                    </h4>
                    <p className="text-neutral-700 whitespace-pre-line mt-1">
                      {anno.content}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      작성자: {anno.authorName} -{" "}
                      {new Date(anno.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {canEdit(anno) && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(anno)}
                        aria-label="공지 수정"
                      >
                        <PencilIcon className="w-4 h-4 text-neutral-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(anno.id)}
                        aria-label="공지 삭제"
                      >
                        <TrashIcon className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              maxVisiblePages={5}
            />
          </div>
        </div>
      )}
      <Modal
        isOpen={showModal}
        onClose={resetModal}
        title={editingAnnouncement ? "공지사항 수정" : "새 공지사항 작성"}
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={resetModal}>
              취소
            </Button>
            <Button onClick={handleSubmit}>
              {editingAnnouncement ? "수정 완료" : "등록"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목을 입력하세요..."
          />
          <TextArea
            label="내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요..."
            rows={6}
          />
        </div>
      </Modal>
    </Card>
  );
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

const TeamCalendar: React.FC<{ teamProjectId: string }> = ({
  teamProjectId,
}) => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAuth();
  const { events } = useAppSelector((state) => state.schedules);

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    start: new Date(),
    end: new Date(),
    type: "MEETING",
    teamProjectId,
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();

  // 월별 일정 조회
  useEffect(() => {
    if (teamProjectId) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      dispatch(
        fetchSchedulesByDateRange({
          teamId: teamProjectId,
          startDate,
          endDate,
        })
      );
    }
  }, [dispatch, teamProjectId, year, month]);

  const resetModalState = (dateForNewEvent?: Date) => {
    setEditingEventId(null);
    setNewEvent({
      title: "",
      start: dateForNewEvent || new Date(),
      end: dateForNewEvent || new Date(),
      type: "MEETING",
      teamProjectId,
    });
  };

  const handleAddEvent = async () => {
    if (newEvent.title && newEvent.start && newEvent.end && currentUser) {
      try {
        await dispatch(
          createSchedule({
            teamId: teamProjectId,
            accountId: currentUser.id,
            event: newEvent,
          })
        ).unwrap();

        setShowAddEventModal(false);
        resetModalState(new Date(currentDisplayDate));

        // 현재 월의 일정 다시 로드
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        dispatch(
          fetchSchedulesByDateRange({
            teamId: teamProjectId,
            startDate,
            endDate,
          })
        );
      } catch (error) {
        console.error("일정 생성 실패:", error);
        alert("일정 생성에 실패했습니다.");
      }
    }
  };

  const handleUpdateEvent = async () => {
    if (
      editingEventId &&
      newEvent.title &&
      newEvent.start &&
      newEvent.end &&
      currentUser
    ) {
      try {
        await dispatch(
          updateSchedule({
            teamId: teamProjectId,
            scheduleId: editingEventId,
            accountId: currentUser.id,
            event: newEvent,
          })
        ).unwrap();

        setShowAddEventModal(false);
        resetModalState(new Date(currentDisplayDate));

        // 현재 월의 일정 다시 로드
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        dispatch(
          fetchSchedulesByDateRange({
            teamId: teamProjectId,
            startDate,
            endDate,
          })
        );
      } catch (error) {
        console.error("일정 수정 실패:", error);
        alert("일정 수정에 실패했습니다.");
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (editingEventId && currentUser) {
      if (window.confirm("이 일정을 정말 삭제하시겠습니까?")) {
        try {
          await dispatch(
            deleteSchedule({
              teamId: teamProjectId,
              scheduleId: editingEventId,
              accountId: currentUser.id,
            })
          ).unwrap();

          setShowAddEventModal(false);
          resetModalState(new Date(currentDisplayDate));

          // 현재 월의 일정 다시 로드
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);
          dispatch(
            fetchSchedulesByDateRange({
              teamId: teamProjectId,
              startDate,
              endDate,
            })
          );
        } catch (error) {
          console.error("일정 삭제 실패:", error);
          alert("일정 삭제에 실패했습니다.");
        }
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

  const handleEventClick = (
    eventToEdit: CalendarEvent,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingEventId(eventToEdit.id);
    setNewEvent({
      title: eventToEdit.title,
      start: new Date(eventToEdit.start),
      end: new Date(eventToEdit.end),
      description: eventToEdit.description || "",
      type: eventToEdit.type,
      teamProjectId: eventToEdit.teamProjectId,
    });
    setShowAddEventModal(true);
  };

  const numDaysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonthIndex = getFirstDayOfMonth(year, month);

  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonthIndex; i++) {
    calendarCells.push(
      <div
        key={`empty-${i}`}
        className="border border-neutral-200 bg-neutral-50 h-32 sm:h-36"
      ></div>
    );
  }

  for (let day = 1; day <= numDaysInMonth; day++) {
    const currentDateObj = new Date(year, month, day);
    currentDateObj.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = currentDateObj.getTime() === today.getTime();

    const dayEvents = events.filter((event) => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = new Date(event.end);
      eventEnd.setHours(23, 59, 59, 999);
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
        <span
          className={`text-xs sm:text-sm font-medium ${
            isToday
              ? "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center"
              : "text-neutral-700"
          }`}
        >
          {day}
        </span>
        <div className="mt-1 flex-grow overflow-y-auto space-y-0.5 max-h-[100px] sm:max-h-[110px] pr-1 scrollbar-thin">
          {dayEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className={`text-[10px] sm:text-xs p-1 rounded-sm truncate text-white cursor-pointer ${
                event.type === "DEADLINE"
                  ? "bg-red-500 hover:bg-red-600"
                  : event.type === "MEETING"
                  ? "bg-blue-500 hover:bg-blue-600"
                  : event.type === "WORKSHOP"
                  ? "bg-purple-500 hover:bg-purple-600"
                  : event.type === "VACATION"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
              title={event.title}
              onClick={(e) => handleEventClick(event, e)}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-[10px] text-neutral-500 text-center mt-0.5">
              +{dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleModalClose = () => {
    setShowAddEventModal(false);
    resetModalState(new Date(currentDisplayDate));
  };

  return (
    <Card
      title="📅 팀 공유 캘린더"
      actions={
        <Button
          size="sm"
          onClick={() => {
            resetModalState(new Date(currentDisplayDate));
            setShowAddEventModal(true);
          }}
          leftIcon={<PlusCircleIcon />}
        >
          일정 추가
        </Button>
      }
    >
      <div className="mb-4 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Button>
        <h3 className="text-lg sm:text-xl font-semibold text-neutral-800">
          {year}년 {month + 1}월
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={nextMonth}
          aria-label="Next month"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px border-t border-l border-neutral-200 bg-neutral-200">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-xs sm:text-sm font-medium text-neutral-600 bg-neutral-100 border-r border-b border-neutral-200"
          >
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
                <Button
                  variant="danger"
                  onClick={handleDeleteEvent}
                  leftIcon={<TrashIcon className="w-4 h-4" />}
                >
                  삭제
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="ghost" onClick={handleModalClose}>
                취소
              </Button>
              <Button
                onClick={editingEventId ? handleUpdateEvent : handleAddEvent}
              >
                {editingEventId ? "변경사항 저장" : "등록"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="일정 제목"
            value={newEvent.title || ""}
            onChange={(e) =>
              setNewEvent((prev) => ({ ...prev, title: e.target.value }))
            }
            required
          />
          <Input
            label="시작일"
            type="datetime-local"
            value={
              newEvent.start
                ? new Date(
                    newEvent.start.getTime() -
                      newEvent.start.getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) =>
              setNewEvent((prev) => ({
                ...prev,
                start: new Date(e.target.value),
              }))
            }
            required
          />
          <Input
            label="종료일"
            type="datetime-local"
            value={
              newEvent.end
                ? new Date(
                    newEvent.end.getTime() -
                      newEvent.end.getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) =>
              setNewEvent((prev) => ({
                ...prev,
                end: new Date(e.target.value),
              }))
            }
            required
          />
          <TextArea
            label="설명 (선택 사항)"
            value={newEvent.description || ""}
            onChange={(e) =>
              setNewEvent((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              종류
            </label>
            <select
              value={newEvent.type || "MEETING"}
              onChange={(e) =>
                setNewEvent((prev) => ({
                  ...prev,
                  type: e.target.value as CalendarEvent["type"],
                }))
              }
              className="block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="MEETING">회의</option>
              <option value="DEADLINE">마감일</option>
              <option value="WORKSHOP">워크샵</option>
              <option value="VACATION">휴가</option>
              <option value="OTHER">기타</option>
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
  isOpen,
  onClose,
  card,
  columnTitle,
  onUpdateCard,
  onAddComment,
  onApproveCard,
  currentUser,
  teamMembers,
}) => {
  const [editingCard, setEditingCard] = useState<KanbanCardType | null>(null);
  const [newComment, setNewComment] = useState("");
  const [activePopover, setActivePopover] = useState<"dueDate" | "assignees" | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (card) {
      setEditingCard({ ...card });
    } else {
      setEditingCard(null);
    }
  }, [card]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        handleClosePopover();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>, popoverType: 'dueDate' | 'assignees') => {
    event.stopPropagation();
    setActivePopover(popoverType);
  };

  const handleClosePopover = () => {
    setActivePopover(null);
  };

  const handleSave = () => {
    if (editingCard) {
      onUpdateCard(editingCard);
      onClose();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (editingCard) {
      setEditingCard({ ...editingCard, [e.target.name]: e.target.value });
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && card) {
      onAddComment(card.id, newComment.trim());
      setNewComment("");
    }
  };

  const handleAssigneeSelectionInModal = (memberId: string) => {
    if (editingCard) {
        const currentAssignees = editingCard.assignees || [];
        const isAssigned = currentAssignees.some(a => a.id === memberId);
        
        let updatedAssignees;
        if (isAssigned) {
            updatedAssignees = currentAssignees.filter(a => a.id !== memberId);
        } else {
            const memberToAdd = teamMembers.find(m => m.id === memberId);
            if(memberToAdd) {
              updatedAssignees = [...currentAssignees, memberToAdd];
            } else {
              updatedAssignees = currentAssignees;
            }
        }
        setEditingCard({ ...editingCard, assignees: updatedAssignees });
    }
  };

  if (!isOpen || !card || !editingCard) return null;

  const getAssigneeDetails = (assigneeIds: string[] | undefined) => {
    if (!assigneeIds) return [];
    return assigneeIds
      .map((id) => teamMembers.find((m) => m.id === id))
      .filter((m): m is User => !!m);
  };

  const currentAssignees = editingCard.assignees || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center">
          <ClipboardDocumentListIcon className="w-6 h-6 mr-2 text-primary" />
          <span className="text-xl font-semibold text-neutral-800">
            {editingCard.title}
          </span>
        </div>
      }
      size="2xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div>
            <Button
              onClick={() => onApproveCard(card.id)}
              disabled={card.approved}
              leftIcon={
                <CheckCircleIcon
                  className={`w-5 h-5 ${
                    card.approved ? "text-green-500" : "text-neutral-500"
                  }`}
                />
              }
            >
              {card.approved ? "승인 완료" : "업무 승인"}
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
            <Button onClick={handleSave}>저장</Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-neutral-600 mb-1"
            >
              설명
            </label>
            <TextArea
              id="description"
              name="description"
              value={editingCard.description || ""}
              onChange={handleChange}
              placeholder="업무에 대한 설명을 추가하세요..."
              rows={5}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">
              댓글
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {card.comments?.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-bold text-neutral-600">
                    {comment.author.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{comment.author.name}</span>
                      <span className="text-xs text-neutral-500 ml-2">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-neutral-700 text-sm bg-neutral-100 p-2 rounded-md">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 추가하세요..."
                className="flex-grow"
              />
              <Button onClick={handleAddComment} className="ml-2">
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-4">
          <div className="bg-neutral-50 p-3 rounded-lg">
            <p className="text-xs text-neutral-500">현재 상태</p>
            <p className="font-semibold text-neutral-800">{columnTitle}</p>
          </div>

          <div className="relative">
            <h4 className="text-sm font-medium text-neutral-600 mb-1">담당자</h4>
            <div className="flex flex-wrap gap-1">
              {currentAssignees.length > 0 ? (
                currentAssignees.map(assignee => (
                    <div key={assignee.id} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                        {assignee.name}
                    </div>
                ))
              ) : (
                <p className="text-sm text-neutral-500">없음</p>
              )}
            </div>
            <Button size="sm" variant="outline" className="w-full mt-2" onClick={(e) => handleOpenPopover(e, 'assignees')}>
                담당자 변경
            </Button>

            {activePopover === 'assignees' && (
              <div ref={popoverRef} className="absolute z-20 w-56 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg">
                <div className="p-2 font-semibold text-center border-b">팀원 목록</div>
                <ul className="py-1 max-h-48 overflow-y-auto">
                    {teamMembers.map(member => (
                        <li key={member.id}
                            className="px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center justify-between"
                            onClick={() => handleAssigneeSelectionInModal(member.id)}>
                            {member.name}
                            {currentAssignees.some(a => a.id === member.id) && <CheckCircleIcon className="w-5 h-5 text-primary"/>}
                        </li>
                    ))}
                </ul>
                <div className="p-2 border-t text-right">
                    <Button size="sm" onClick={handleClosePopover}>닫기</Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
             <h4 className="text-sm font-medium text-neutral-600 mb-1">마감일</h4>
             <Button size="sm" variant="outline" className="w-full text-left justify-start" onClick={(e) => handleOpenPopover(e, 'dueDate')}>
                {editingCard.dueDate ? new Date(editingCard.dueDate).toLocaleDateString() : '날짜 선택'}
             </Button>
             
            {activePopover === 'dueDate' && (
              <div ref={popoverRef} className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg p-2">
                <Input
                    type="date"
                    value={editingCard.dueDate ? editingCard.dueDate.split('T')[0] : ''}
                    onChange={(e) => {
                      if (editingCard) {
                        setEditingCard({ ...editingCard, dueDate: e.target.value });
                      }
                    }}
                />
                 <div className="mt-2 text-right">
                    <Button size="sm" onClick={handleClosePopover}>설정</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

const TeamKanbanBoard: React.FC<{
  teamProjectId: string;
  currentUser: User;
  team: TeamProject | null;
}> = ({ teamProjectId, currentUser, team }) => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");

  const [isCreateListModalOpen, setCreateListModalOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [selectedCardColumnTitle, setSelectedCardColumnTitle] = useState("");

  const { currentWorkspace } = useAuth();
  const teamMembers = team?.members || [];

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      if (currentWorkspace?.id) {
        const boardData = await fetchKanbanBoard(
          currentWorkspace.id,
          teamProjectId
        );
        setBoard(boardData);
      }
    } catch (err: any) {
      setError(
        err.message || "칸반 보드를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [teamProjectId, currentWorkspace?.id]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

    const handleOpenCreateTaskModal = (columnId: string) => {
        setSelectedColumnId(columnId);
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskAssignees([]);
        setNewTaskDueDate("");
        setCreateTaskModalOpen(true);
    };

    const handleAssigneeSelection = (memberId: string) => {
        setNewTaskAssignees(prev => 
            prev.includes(memberId) 
            ? prev.filter(id => id !== memberId) 
            : [...prev, memberId]
        );
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim() || !selectedColumnId || !currentWorkspace?.id || !currentUser?.id) return;

        try {
            const newTask = await createKanbanTask(currentWorkspace.id, teamProjectId, selectedColumnId, {
                title: newTaskTitle,
                description: newTaskDescription,
                assigneeIds: newTaskAssignees,
                dueDate: newTaskDueDate || null,
            }, currentUser.id);

            setBoard(prevBoard => {
                if (!prevBoard) return null;
                const newColumns = prevBoard.columns.map(col => {
                    if (col.id === selectedColumnId) {
                        return { ...col, cards: [...col.cards, newTask] };
                    }
                    return col;
                });
                return { ...prevBoard, columns: newColumns };
            });
            setCreateTaskModalOpen(false);
        } catch (error) {
            console.error("Failed to create task:", error);
            alert("업무 생성에 실패했습니다.");
        }
    };

    const handleCreateList = async () => {
        if (!newListTitle.trim() || !currentWorkspace?.id || !currentUser?.id) return;

        try {
            const newList = await createKanbanList(currentWorkspace.id, teamProjectId, newListTitle);
            setBoard(prevBoard => prevBoard ? { ...prevBoard, columns: [...prevBoard.columns, { ...newList, cards: [] }] } : prevBoard);
            setCreateListModalOpen(false);
            setNewListTitle("");
        } catch (error) {
            console.error("Failed to create list:", error);
            alert("리스트 생성에 실패했습니다.");
        }
    };

    const handleCardClick = (card: KanbanCardType, columnTitle: string) => {
        setSelectedCard(card);
        setSelectedCardColumnTitle(columnTitle);
    };

    const handleCloseModal = () => {
        setSelectedCard(null);
        setSelectedCardColumnTitle("");
    };

    const handleUpdateCard = async (updatedCard: KanbanCardType) => {
        if (!currentWorkspace?.id) return;
        try {
            const result = await updateKanbanTask(currentWorkspace.id, teamProjectId, updatedCard.id, updatedCard);
            
            setBoard(prevBoard => {
                if (!prevBoard) return null;
                const newColumns = prevBoard.columns.map(col => ({
                    ...col,
                    cards: col.cards.map(c => c.id === result.id ? result : c)
                }));
                return { ...prevBoard, columns: newColumns };
            });
            handleCloseModal(); // 모달 닫기
        } catch (error) {
            console.error("Failed to update card:", error);
            alert("업무 업데이트에 실패했습니다.");
        }
    };

    const handleAddCommentToCard = async (cardId: string, commentText: string) => {
        if (!currentWorkspace?.id || !currentUser?.id) return;
        
        try {
            const newComment = await addKanbanTaskComment(currentWorkspace.id, teamProjectId, cardId, commentText, currentUser.id);
            
            const optimisticUpdate = (prevBoard: KanbanBoard | null) => {
                if (!prevBoard) return null;
                const newColumns = prevBoard.columns.map(col => ({
                    ...col,
                    cards: col.cards.map(c => {
                        if (c.id === cardId) {
                            return { ...c, comments: [...(c.comments || []), newComment] };
                        }
                        return c;
                    })
                }));
                return { ...prevBoard, columns: newColumns };
            };

            setBoard(optimisticUpdate);
            
            // 모달이 열려있는 카드와 일치하면 모달 상태도 업데이트
            if (selectedCard && selectedCard.id === cardId) {
              setSelectedCard(prev => prev ? {...prev, comments: [...(prev.comments || []), newComment]} : null);
            }

        } catch (error) {
            console.error("Failed to add comment:", error);
            alert("댓글 추가에 실패했습니다.");
        }
    };

    const handleApproveCard = async (cardId: string) => {
        // This is a placeholder. Approval logic needs to be implemented.
        console.log("Approving card:", cardId);
        // Example optimistic update
        setBoard(prevBoard => {
            if (!prevBoard) return null;
            const newColumns = prevBoard.columns.map(col => ({
                ...col,
                cards: col.cards.map(c => c.id === cardId ? { ...c, approved: true } : c)
            }));
            return { ...prevBoard, columns: newColumns };
        });

        if (selectedCard && selectedCard.id === cardId) {
            setSelectedCard(prev => prev ? {...prev, approved: true} : null);
        }
    };


  if (loading) return <p>칸반 보드 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!board) return <p>칸반 보드를 찾을 수 없습니다.</p>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-xl font-bold text-neutral-800">칸반 보드</h2>
        <Button
          size="sm"
          onClick={() => setCreateListModalOpen(true)}
          leftIcon={<PlusCircleIcon />}
        >
          리스트 추가
        </Button>
      </div>

      <div className="flex-grow overflow-x-auto pb-4">
        <div className="inline-flex space-x-4 h-full">
          {board.columns.map((column) => (
            <div
              key={column.id}
              className="w-72 bg-neutral-100 rounded-lg shadow-sm flex flex-col"
            >
              <h3 className="font-semibold p-3 text-neutral-700 border-b">
                {column.title}
              </h3>
              <div className="p-2 space-y-3 overflow-y-auto">
                {column.cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card, column.title)}
                    className="bg-white rounded-md shadow p-3 cursor-pointer hover:bg-neutral-50"
                  >
                    <p className="font-semibold text-sm text-neutral-800">
                      {card.title}
                    </p>
                    {card.description && (
                        <p className="text-xs text-neutral-500 mt-1 truncate">{card.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          {card.comments && card.comments.length > 0 && (
                            <span className="flex items-center text-neutral-500">
                              <ChatBubbleBottomCenterTextIcon className="w-4 h-4 mr-0.5"/> {card.comments.length}
                            </span>
                          )}
                          {card.approved && (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" title="승인됨"/>
                          )}
                        </div>
                        <div className="flex -space-x-2">
                          {card.assignees && card.assignees.slice(0, 3).map(assignee => (
                              <div key={assignee.id} title={assignee.name} className="w-6 h-6 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-800">
                                  {assignee.name.charAt(0)}
                              </div>
                          ))}
                           {card.assignees && card.assignees.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-xs font-bold text-neutral-600">
                                +{card.assignees.length - 3}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 mt-auto">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleOpenCreateTaskModal(column.id)}
                  leftIcon={<PlusCircleIcon />}
                >
                  업무 추가
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
       {/* Create List Modal */}
        <Modal 
            isOpen={isCreateListModalOpen} 
            onClose={() => setCreateListModalOpen(false)}
            title="새 리스트 추가"
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={() => setCreateListModalOpen(false)}>취소</Button>
                    <Button onClick={handleCreateList}>생성</Button>
                </div>
            }
        >
            <Input 
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="리스트 제목을 입력하세요"
                autoFocus
            />
        </Modal>

        {/* Create Task Modal */}
        <Modal
            isOpen={isCreateTaskModalOpen}
            onClose={() => setCreateTaskModalOpen(false)}
            title="새 업무 추가"
            size="lg"
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={() => setCreateTaskModalOpen(false)}>취소</Button>
                    <Button onClick={handleCreateTask}>추가</Button>
                </div>
            }
        >
            <div className="space-y-4">
                <Input
                    label="업무 제목"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="업무의 제목을 입력하세요"
                    autoFocus
                />
                <TextArea
                    label="설명 (선택 사항)"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="업무에 대한 설명을 입력하세요"
                    rows={3}
                />
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">담당자 (선택 사항)</label>
                    <div className="flex flex-wrap gap-2">
                        {teamMembers.map(member => (
                            <button
                                key={member.id}
                                onClick={() => handleAssigneeSelection(member.id)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                    newTaskAssignees.includes(member.id) 
                                    ? 'bg-primary text-white' 
                                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                                }`}
                            >
                                {member.name}
                            </button>
                        ))}
                    </div>
                </div>
                 <Input
                    type="date"
                    label="마감일 (선택 사항)"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
            </div>
        </Modal>

      {selectedCard && (
        <KanbanCardDetailModal
          isOpen={!!selectedCard}
          onClose={handleCloseModal}
          card={selectedCard}
          columnTitle={selectedCardColumnTitle}
          onUpdateCard={handleUpdateCard}
          onAddComment={handleAddCommentToCard}
          onApproveCard={handleApproveCard}
          currentUser={currentUser}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
};

interface BulletinPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BulletinPost | null;
  onAddComment: (postId: string, commentText: string) => void;
  onDeletePost: (postId: string) => void;
  onUpdatePost: (postId: string, title: string, content: string) => void;
  currentUser: User;
}

const BulletinPostDetailModal: React.FC<BulletinPostDetailModalProps> = ({
  isOpen,
  onClose,
  post,
  onAddComment,
  onDeletePost,
  onUpdatePost,
  currentUser,
}) => {
  const dispatch = useAppDispatch();

  // Redux 상태를 구체적으로 분리하여 변경 감지 개선
  const comments = useAppSelector((state) => state.bulletin.comments);
  const currentPost = useAppSelector((state) => state.bulletin.currentPost);
  const posts = useAppSelector((state) => state.bulletin.posts);

  // 추가: currentPost의 attachments만 별도로 추적
  const currentPostAttachments = useAppSelector(
    (state) => state.bulletin.currentPost?.attachments || []
  );

  // currentPost 변경 감지를 위한 강제 의존성 추가
  useEffect(() => {
    console.log(
      "[BulletinPostDetailModal] currentPost attachments 변경 감지:",
      {
        count: currentPostAttachments.length,
        ids: currentPostAttachments.map((a) => a.id),
      }
    );
  }, [currentPostAttachments]);
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingFiles, setEditingFiles] = useState<File[]>([]);
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<
    Set<string>
  >(new Set());
  const [forceRender, setForceRender] = useState(0); // 강제 리렌더링용

  // 현재 표시할 게시글 - Redux currentPost 우선 사용
  const displayPost = useMemo(() => {
    console.log("[displayPost] useMemo 계산 시작:", {
      currentPost: currentPost
        ? { id: currentPost.id, attachments: currentPost.attachments?.length }
        : null,
      post: post
        ? { id: post.id, attachments: post.attachments?.length }
        : null,
      deletingCount: deletingAttachmentIds.size,
      forceRender,
    });

    // Redux currentPost가 있고 post와 ID가 일치하면 Redux 상태 사용 (가장 최신)
    if (currentPost && post && currentPost.id === post.id) {
      console.log("[displayPost] Redux currentPost 사용 (ID 일치):", {
        id: currentPost.id,
        attachments: currentPost.attachments?.map((a) => ({
          id: a.id,
          fileName: a.fileName,
        })),
      });
      return currentPost;
    }
    // Redux currentPost가 있고 post가 없으면 Redux 상태 사용
    if (currentPost && !post) {
      console.log("[displayPost] Redux currentPost 사용 (post 없음):", {
        id: currentPost.id,
        attachments: currentPost.attachments?.map((a) => ({
          id: a.id,
          fileName: a.fileName,
        })),
      });
      return currentPost;
    }
    // post가 있으면서 currentPost가 없거나 ID가 다른 경우
    // Redux posts 배열에서 해당 게시글을 찾아서 사용 (더 최신일 수 있음)
    if (post) {
      const reduxPost = posts.find((p) => p.id === post.id);
      if (reduxPost) {
        console.log("[displayPost] Redux posts 배열에서 찾은 게시글 사용:", {
          id: reduxPost.id,
          attachments: reduxPost.attachments?.map((a) => ({
            id: a.id,
            fileName: a.fileName,
          })),
        });
        return reduxPost;
      }
    }
    // 마지막으로 props post 사용
    console.log("[displayPost] props post 사용 (fallback):", {
      id: post?.id,
      attachments: post?.attachments?.map((a) => ({
        id: a.id,
        fileName: a.fileName,
      })),
    });
    return post;
  }, [
    currentPost,
    post,
    posts,
    // Redux 상태 변경을 감지하기 위해 첨부파일 배열 길이도 dependency에 포함
    currentPost?.attachments?.length,
    posts.find((p) => post && p.id === post.id)?.attachments?.length,
    // 삭제 중 상태도 dependency에 포함하여 UI 즉시 업데이트
    deletingAttachmentIds.size,
    // 강제 리렌더링 트리거
    forceRender,
  ]);

  // 모달이 열릴 때 삭제 중 상태 초기화, 닫힐 때 Redux currentPost 초기화
  useEffect(() => {
    if (isOpen) {
      console.log("[BulletinPostDetailModal] 모달 열림 - 삭제 중 상태 초기화");
      setDeletingAttachmentIds(new Set());
    } else if (!isOpen && (currentPost || deletingAttachmentIds.size > 0)) {
      // 모달이 닫힐 때 상태 완전 초기화
      console.log(
        "[BulletinPostDetailModal] 모달 닫힘 - Redux 상태 및 로컬 상태 초기화"
      );
      dispatch(clearCurrentPost());
      setDeletingAttachmentIds(new Set());
      setForceRender(0);
    }
  }, [isOpen, dispatch, currentPost, deletingAttachmentIds.size]);

  // 모달이 열릴 때 서버에서 최신 게시글 정보 확인
  useEffect(() => {
    if (isOpen && post?.id) {
      // Redux에 해당 게시글이 없거나 첨부파일 정보가 없는 경우에만 서버에서 가져오기
      const existingReduxPost = posts.find((p) => p.id === post.id);
      const hasReduxCurrentPost = currentPost?.id === post.id;

      console.log("[BulletinPostDetailModal] 모달 열림, 서버 호출 여부 판단:", {
        postId: post.id,
        hasExistingReduxPost: !!existingReduxPost,
        hasReduxCurrentPost,
        existingAttachments: existingReduxPost?.attachments?.length || 0,
        currentPostAttachments: currentPost?.attachments?.length || 0,
      });

      // Redux에 게시글이 없거나 첨부파일 정보가 없는 경우에만 서버에서 가져오기
      if (
        !existingReduxPost ||
        (!hasReduxCurrentPost &&
          (!existingReduxPost.attachments ||
            existingReduxPost.attachments.length === 0))
      ) {
        console.log("[BulletinPostDetailModal] 서버에서 게시글 정보 가져오기");
        dispatch(fetchPost(post.id));
      } else {
        console.log(
          "[BulletinPostDetailModal] Redux 상태 사용, 서버 호출 생략"
        );
        // 이미 Redux에 데이터가 있으면 currentPost로 설정
        if (!hasReduxCurrentPost && existingReduxPost) {
          // currentPost가 없으면 posts 배열의 데이터를 currentPost로 복사
          dispatch(setCurrentPost(existingReduxPost));
        }
      }
    }
  }, [dispatch, isOpen, post?.id, posts, currentPost]);

  // 댓글 목록 로드
  useEffect(() => {
    if (isOpen && displayPost) {
      dispatch(fetchComments({ postId: displayPost.id, page: 0 }));
    }
  }, [dispatch, isOpen, displayPost]);

  // 게시글 편집 모드 초기화
  useEffect(() => {
    if (displayPost && isEditingPost) {
      setEditTitle(displayPost.title);
      setEditContent(displayPost.content);
    }
  }, [displayPost, isEditingPost]);

  if (!isOpen || !displayPost) return null;

  // 현재 표시할 첨부파일 목록 (삭제 중인 파일 제외)
  const visibleAttachments = useMemo(() => {
    const attachments =
      displayPost.attachments?.filter(
        (att) => !deletingAttachmentIds.has(att.id)
      ) || [];
    console.log("[visibleAttachments] useMemo 계산:", {
      totalAttachments: displayPost.attachments?.length || 0,
      deletingIds: Array.from(deletingAttachmentIds),
      visibleCount: attachments.length,
      visibleIds: attachments.map((a) => a.id),
      // displayPost 소스 확인
      displayPostSource:
        displayPost === currentPost ? "currentPost" : "fallback",
    });
    return attachments;
  }, [
    displayPost.attachments,
    deletingAttachmentIds,
    // currentPost attachments 직접 의존성으로 추가하여 Redux 변경 확실히 감지
    currentPostAttachments.length,
    JSON.stringify(currentPostAttachments.map((a) => a.id)),
  ]);

  // Redux 상태 변경 모니터링을 위한 useEffect들
  useEffect(() => {
    console.log("[Redux Monitor] currentPost 변경:", {
      id: currentPost?.id,
      attachments:
        currentPost?.attachments?.map((a) => ({
          id: a.id,
          fileName: a.fileName,
        })) || [],
    });
  }, [currentPost]);

  useEffect(() => {
    console.log("[Redux Monitor] posts 배열 변경, 현재 게시글:", {
      totalPosts: posts.length,
      currentPostInArray: displayPost
        ? posts
            .find((p) => p.id === displayPost.id)
            ?.attachments?.map((a) => ({ id: a.id, fileName: a.fileName }))
        : null,
    });
  }, [posts, displayPost?.id]);

  // 디버깅을 위한 로그
  console.log("[BulletinPostDetailModal] 렌더링:", {
    postId: displayPost.id,
    totalAttachments: displayPost.attachments?.length || 0,
    visibleAttachments: visibleAttachments.length,
    deletingIds: Array.from(deletingAttachmentIds),
    currentPostFromRedux: currentPost?.attachments?.length || 0,
    visibleAttachmentIds: visibleAttachments.map((att) => att.id),
  });

  // visibleAttachments 변경 감지를 위한 useEffect
  useEffect(() => {
    console.log("[BulletinPostDetailModal] visibleAttachments 변경:", {
      length: visibleAttachments.length,
      attachments: visibleAttachments.map((att) => ({
        id: att.id,
        fileName: att.fileName,
      })),
    });
  }, [
    visibleAttachments.length,
    JSON.stringify(visibleAttachments.map((att) => att.id)),
  ]);

  const handleAddComment = async () => {
    if (newCommentText.trim()) {
      try {
        await onAddComment(displayPost.id, newCommentText.trim());
        setNewCommentText("");
      } catch (error) {
        console.error("댓글 추가 실패:", error);
      }
    }
  };

  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      await dispatch(
        updateComment({
          commentId,
          accountId: currentUser.id,
          content: editingCommentText.trim(),
        })
      ).unwrap();

      // 댓글 목록 새로고침
      dispatch(fetchComments({ postId: displayPost.id, page: 0 }));
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      alert("댓글 수정에 실패했습니다.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("이 댓글을 정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await dispatch(
        deleteComment({
          commentId,
          accountId: currentUser.id,
        })
      ).unwrap();

      // 댓글 목록 새로고침
      dispatch(fetchComments({ postId: displayPost.id, page: 0 }));
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleDelete = () => {
    if (window.confirm("이 게시글을 정말 삭제하시겠습니까?")) {
      onDeletePost(displayPost.id);
      onClose();
    }
  };

  const handleEditPost = () => {
    setIsEditingPost(true);
  };

  const handleCancelEditPost = () => {
    setIsEditingPost(false);
    setEditTitle("");
    setEditContent("");
    setEditingFiles([]);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEditingFiles(Array.from(e.target.files));
    }
  };

  const removeEditingFile = (index: number) => {
    setEditingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    console.log("[handleDeleteAttachment] 시작:", {
      attachmentId,
      postId: displayPost?.id,
    });

    if (!displayPost || deletingAttachmentIds.has(attachmentId)) {
      console.log("[handleDeleteAttachment] 조기 반환:", {
        displayPost: !!displayPost,
        isDeleting: deletingAttachmentIds.has(attachmentId),
      });
      return; // 이미 삭제 중이거나 게시글이 없으면 무시
    }

    // Redux 상태에서 해당 첨부파일이 존재하는지 확인
    const currentAttachment = displayPost.attachments?.find(
      (att) => att.id === attachmentId
    );

    if (!currentAttachment) {
      console.log("[handleDeleteAttachment] 첨부파일 없음:", { attachmentId });
      alert("이미 삭제된 첨부파일입니다.");
      return;
    }

    if (!window.confirm("이 첨부파일을 정말 삭제하시겠습니까?")) {
      return;
    }

    console.log("[handleDeleteAttachment] 삭제 시작:", {
      attachmentId,
      fileName: currentAttachment.fileName,
    });

    // 삭제 중 상태로 설정 (즉시 UI에서 해당 첨부파일 숨김)
    setDeletingAttachmentIds((prev) => {
      const newSet = new Set(prev).add(attachmentId);
      console.log(
        "[handleDeleteAttachment] 삭제 중 상태 설정:",
        Array.from(newSet)
      );
      return newSet;
    });

    // Redux 액션을 통해 첨부파일 삭제 (unwrap() 없이 호출)
    const result = await dispatch(
      deleteAttachment({
        postId: displayPost.id,
        attachId: attachmentId,
        accountId: currentUser.id,
      })
    );

    console.log("[handleDeleteAttachment] Redux 액션 결과:", {
      isFulfilled: deleteAttachment.fulfilled.match(result),
      isRejected: deleteAttachment.rejected.match(result),
      payload: result.payload,
    });

    // fulfilled와 rejected 모두 처리
    if (deleteAttachment.fulfilled.match(result)) {
      console.log(
        "[handleDeleteAttachment] 삭제 API 성공 - 서버 상태 검증 시작"
      );

      // 삭제 성공 후 서버에서 실제로 삭제되었는지 확인
      try {
        console.log(
          "[handleDeleteAttachment] 서버 상태 검증을 위해 게시글 다시 조회"
        );
        const verifyResult = await dispatch(fetchPost(displayPost.id));

        if (fetchPost.fulfilled.match(verifyResult)) {
          const serverPost = verifyResult.payload;
          const stillExists = serverPost.attachments?.some(
            (att) => att.id === attachmentId
          );

          console.log("[handleDeleteAttachment] 서버 검증 결과:", {
            serverAttachmentCount: serverPost.attachments?.length || 0,
            deletedAttachmentStillExists: stillExists,
            serverAttachmentIds: serverPost.attachments?.map((a) => a.id) || [],
          });

          if (stillExists) {
            console.warn(
              "[handleDeleteAttachment] 경고: 삭제 API는 성공했지만 서버에 파일이 여전히 존재함"
            );
            alert(
              "삭제 요청은 성공했지만 서버에서 파일이 완전히 제거되지 않았을 수 있습니다. 백엔드를 확인해주세요."
            );
          } else {
            console.log(
              "[handleDeleteAttachment] 검증 완료: 서버에서도 삭제됨"
            );
            alert("첨부파일 삭제가 완료되었습니다.");
          }
        }
      } catch (verifyError) {
        console.error("[handleDeleteAttachment] 서버 검증 실패:", verifyError);
        alert("첨부파일 삭제는 완료되었지만 상태 확인에 실패했습니다.");
      }
    } else if (deleteAttachment.rejected.match(result)) {
      // rejected 케이스에서도 Redux slice에서 이미 UI 상태를 업데이트했음
      const errorInfo = result.payload as { message: string; status?: number };
      console.log("[handleDeleteAttachment] 실패:", errorInfo);

      const is404or400 =
        errorInfo.status === 404 ||
        errorInfo.status === 400 ||
        errorInfo.message?.includes("첨부파일을 찾을 수 없습니다") ||
        errorInfo.message?.includes("400") ||
        errorInfo.message?.includes("Bad Request");

      if (is404or400) {
        console.log(
          "[handleDeleteAttachment] 404/400 에러 - 이미 삭제된 것으로 간주"
        );
        alert("첨부파일이 이미 삭제되었습니다.");
      } else {
        console.log("[handleDeleteAttachment] 기타 에러 - 서버 재조회 실행");
        alert(`첨부파일 삭제에 실패했습니다: ${errorInfo.message}`);
        // 400/404가 아닌 다른 에러인 경우에만 서버 상태 확인
        try {
          console.log(
            "[handleDeleteAttachment] 게시글 새로고침 시작 (에러 케이스)"
          );
          await dispatch(fetchPost(displayPost.id));
          console.log(
            "[handleDeleteAttachment] 게시글 새로고침 완료 (에러 케이스)"
          );
        } catch (fetchError) {
          console.error("게시글 새로고침 실패:", fetchError);
        }
      }
    }

    // Redux 상태 변경 완료 후 강제 리렌더링 트리거
    // 약간의 지연을 두어 Redux 상태 변경이 완전히 적용된 후 리렌더링
    setTimeout(() => {
      setForceRender((prev) => prev + 1);
    }, 50);

    // 삭제 중 상태 해제 (Redux 액션 완료 후)
    setDeletingAttachmentIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(attachmentId);
      console.log(
        "[handleDeleteAttachment] 삭제 중 상태 해제:",
        Array.from(newSet)
      );
      return newSet;
    });
  };

  const handleSavePost = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      // 게시글 업데이트
      await onUpdatePost(displayPost.id, editTitle.trim(), editContent.trim());

      // 새 첨부파일이 있으면 업로드
      if (editingFiles.length > 0) {
        console.log(
          "[handleSavePost] 새 첨부파일 업로드 시작:",
          editingFiles.length
        );

        const uploadPromises = editingFiles.map((file) =>
          bulletinApi.uploadAttachment(displayPost.id, currentUser.id, file)
        );
        const uploadResults = await Promise.all(uploadPromises);

        console.log("[handleSavePost] 첨부파일 업로드 완료:", uploadResults);

        // 업로드된 첨부파일을 Redux 상태에 추가
        const newAttachments = uploadResults.map((result) => ({
          id: result.id.toString(),
          postId: displayPost.id,
          fileName: result.originalFileName,
          fileUrl: result.downloadUrl,
        }));

        dispatch(
          addAttachments({
            postId: displayPost.id,
            attachments: newAttachments,
          })
        );

        console.log("[handleSavePost] Redux 상태에 새 첨부파일 추가 완료");
      }

      setIsEditingPost(false);
      setEditingFiles([]);
      alert("게시글이 수정되었습니다.");
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      alert("게시글 수정에 실패했습니다.");
    }
  };

  const handleAttachmentDownload = async (
    fileUrl: string,
    fileName: string
  ) => {
    try {
      await bulletinApi.downloadAttachment(fileUrl, fileName);
    } catch (error) {
      console.error("첨부파일 다운로드 실패:", error);
      alert("첨부파일 다운로드에 실패했습니다.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditingPost ? "게시글 수정" : displayPost.title}
      footer={
        <div className="flex justify-between w-full">
          <div className="flex space-x-2">
            {currentUser.id === displayPost.authorId && !isEditingPost && (
              <>
                <Button variant="outline" onClick={handleEditPost} size="sm">
                  게시글 수정
                </Button>
                <Button variant="danger" onClick={handleDelete} size="sm">
                  게시글 삭제
                </Button>
              </>
            )}
            {isEditingPost && (
              <>
                <Button variant="primary" onClick={handleSavePost} size="sm">
                  저장
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEditPost}
                  size="sm"
                >
                  취소
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" onClick={onClose} className="ml-auto">
            닫기
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="pb-2 border-b">
          <p className="text-xs text-neutral-500">
            작성자: {displayPost.authorName} | 작성일:{" "}
            {new Date(displayPost.createdAt).toLocaleString()}
          </p>
        </div>

        {isEditingPost ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                제목
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="게시글 제목을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                내용
              </label>
              <TextArea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="게시글 내용을 입력하세요"
                rows={8}
              />
            </div>

            {/* 기존 첨부파일 관리 */}
            {visibleAttachments.length > 0 && (
              <div
                key={`edit-attachments-${displayPost.id}-${visibleAttachments.length}`}
              >
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  기존 첨부파일 ({visibleAttachments.length})
                </label>
                <div className="space-y-2">
                  {visibleAttachments.map((att) => (
                    <div
                      key={`edit-${att.id}-${
                        deletingAttachmentIds.has(att.id)
                          ? "deleting"
                          : "normal"
                      }`}
                      className="flex items-center justify-between bg-neutral-100 p-2 rounded text-xs"
                    >
                      <span className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleAttachmentDownload(att.fileUrl, att.fileName)
                          }
                          className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
                        >
                          {att.fileName}
                        </button>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttachment(att.id)}
                        disabled={deletingAttachmentIds.has(att.id)}
                        className={`text-red-500 hover:text-red-700 ${
                          deletingAttachmentIds.has(att.id)
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        type="button"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 새 첨부파일 추가 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                새 첨부파일 추가 (선택)
              </label>
              <Input
                type="file"
                multiple
                className="text-sm"
                onChange={handleEditFileChange}
                accept="*/*"
              />
              {editingFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-neutral-600">추가될 파일:</p>
                  {editingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-green-50 p-2 rounded text-xs"
                    >
                      <span>
                        {file.name} ({Math.round(file.size / 1024)}KB)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEditingFile(index)}
                        className="text-red-500 hover:text-red-700"
                        type="button"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-line">
            {displayPost.content}
          </div>
        )}

        {visibleAttachments.length > 0 && !isEditingPost && (
          <div
            key={`attachments-${displayPost.id}-${visibleAttachments.length}-${
              currentPostAttachments.length
            }-${Date.now()}`}
          >
            <h5 className="text-sm font-semibold text-neutral-600 mt-3 mb-1">
              첨부파일 ({visibleAttachments.length})
              <span className="text-xs text-red-500 ml-2">
                [디버그: total={displayPost.attachments?.length || 0}, deleting=
                {deletingAttachmentIds.size}, redux=
                {currentPostAttachments.length}]
              </span>
            </h5>
            <div className="space-y-1">
              {visibleAttachments.map((att, index) => (
                <div
                  key={`att-${att.id}-${index}-${
                    currentPostAttachments.length
                  }-${
                    deletingAttachmentIds.has(att.id) ? "deleting" : "normal"
                  }`}
                  className="flex items-center justify-between bg-neutral-50 p-2 rounded text-xs"
                >
                  <button
                    onClick={() =>
                      handleAttachmentDownload(att.fileUrl, att.fileName)
                    }
                    className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left flex-grow"
                  >
                    {att.fileName}{" "}
                    <span className="text-red-500">[ID: {att.id}]</span>
                  </button>
                  {currentUser.id === displayPost.authorId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAttachment(att.id)}
                      disabled={deletingAttachmentIds.has(att.id)}
                      className={`text-red-500 hover:text-red-700 ml-2 ${
                        deletingAttachmentIds.has(att.id)
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      type="button"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isEditingPost && (
          <div className="pt-4 border-t">
            <h4 className="text-md font-semibold text-neutral-700 mb-2">
              댓글 ({comments?.length || 0})
            </h4>
            <div className="space-y-3 mb-3">
              {comments && comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="text-xs p-2 bg-neutral-100 rounded"
                  >
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <TextArea
                          value={editingCommentText}
                          onChange={(e) =>
                            setEditingCommentText(e.target.value)
                          }
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateComment(comment.id)}
                            className="text-xs px-2 py-1"
                          >
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="text-xs px-2 py-1"
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-neutral-800 whitespace-pre-line">
                          {comment.text}
                        </p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-neutral-500">
                            - {comment.userName} (
                            {new Date(comment.createdAt).toLocaleString()})
                          </p>
                          {currentUser.id === comment.userId && (
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleEditComment(comment.id, comment.text)
                                }
                                className="text-blue-500 hover:text-blue-700 text-xs px-1 py-0"
                              >
                                수정
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-500 hover:text-red-700 text-xs px-1 py-0"
                              >
                                삭제
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 text-xs">
                  아직 댓글이 없습니다.
                </p>
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
              <Button
                onClick={handleAddComment}
                size="sm"
                variant="outline"
                className="h-full"
              >
                댓글 작성
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const TeamBulletinBoard: React.FC<{
  teamProjectId: string;
  currentUser: User;
}> = ({ teamProjectId, currentUser }) => {
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAuth();
  const { posts, status, error, pagination } = useAppSelector(
    (state) => state.bulletin
  );
  const currentPost = useAppSelector((state) => state.bulletin.currentPost);

  // 게시글 생성 관련 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // 게시글 상세 관련 상태
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"title" | "content" | "author">(
    "title"
  );

  useEffect(() => {
    // 컴포넌트 언마운트 시 상태 초기화
    return () => {
      dispatch(resetBulletinState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (teamProjectId && currentWorkspace?.id) {
      dispatch(
        fetchPosts({
          workspaceId: currentWorkspace.id,
          teamId: teamProjectId,
          page: pagination.page,
          size: pagination.size,
          sort: "createdAt,desc",
        })
      );
    }
  }, [
    dispatch,
    teamProjectId,
    currentWorkspace?.id,
    pagination.page,
    pagination.size,
  ]);

  const handlePageChange = (page: number) => {
    if (teamProjectId && currentWorkspace?.id) {
      const searchParams: {
        [key: string]: string | undefined;
      } = {};
      if (searchTerm) {
        searchParams[searchType] = searchTerm;
      }

      dispatch(
        fetchPosts({
          workspaceId: currentWorkspace.id,
          teamId: teamProjectId,
          page: page,
          size: pagination.size,
          sort: "createdAt,desc",
          ...searchParams,
        })
      );
    }
  };

  const handleSearch = () => {
    handlePageChange(0); // 검색 시 첫 페이지부터 조회
  };

  const handleOpenCreatePostModal = () => {
    setTitle("");
    setContent("");
    setAttachments([]);
    setShowCreateModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (
      !title.trim() ||
      !content.trim() ||
      !currentWorkspace?.id ||
      !currentUser?.id
    ) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append(
      "bulletinPostRequest",
      new Blob(
        [
          JSON.stringify({
            workspaceId: currentWorkspace.id,
            teamId: teamProjectId,
            accountId: currentUser.id,
            title: title.trim(),
            content: content.trim(),
          }),
        ],
        { type: "application/json" }
      )
    );

    attachments.forEach((file) => {
      formData.append("files", file);
    });

    try {
      await dispatch(createPost(formData)).unwrap();
      setShowCreateModal(false);
      // 성공 후 첫 페이지로 이동하여 새로고침
      handlePageChange(0);
    } catch (err) {
      console.error("게시글 생성 실패:", err);
      alert("게시글 생성에 실패했습니다.");
    }
  };

  const handleOpenPostDetail = async (post: BulletinPost) => {
    if (currentWorkspace?.id && teamProjectId && post.id) {
      dispatch(
        fetchPost({
          workspaceId: currentWorkspace.id,
          teamId: teamProjectId,
          postId: post.id,
        })
      );
      setShowDetailModal(true);
    }
  };

  const handleAddBulletinComment = async (
    postId: string,
    commentText: string
  ) => {
    if (!currentWorkspace?.id || !currentUser?.id) {
      alert("댓글을 작성할 수 없습니다.");
      return;
    }

    await dispatch(
      createComment({
        workspaceId: currentWorkspace.id,
        teamId: teamProjectId,
        postId,
        accountId: currentUser.id,
        content: commentText,
      })
    );
  };

  const handleDeleteBulletinPost = async (postId: string) => {
    if (!currentWorkspace?.id || !currentUser?.id) {
      alert("게시글을 삭제할 수 없습니다.");
      return;
    }

    if (window.confirm("정말 게시글을 삭제하시겠습니까?")) {
      await dispatch(
        deletePost({
          workspaceId: currentWorkspace.id,
          teamId: teamProjectId,
          postId,
          accountId: currentUser.id,
        })
      ).unwrap();
      setShowDetailModal(false);
      handlePageChange(pagination.page); // 현재 페이지 새로고침
    }
  };

  const handleUpdateBulletinPost = async (
    postId: string,
    updatedTitle: string,
    updatedContent: string
  ) => {
    if (!currentWorkspace?.id || !currentUser?.id) {
      alert("게시글을 수정할 수 없습니다.");
      return;
    }
    // 이 함수는 BulletinPostDetailModal에서 호출되므로,
    // 여기서는 dispatch 로직만 처리합니다.
    // 실제 파일 첨부 등은 모달 내부에서 관리됩니다.
    await dispatch(
      updatePost({
        workspaceId: currentWorkspace.id,
        teamId: teamProjectId,
        postId,
        accountId: currentUser.id,
        title: updatedTitle,
        content: updatedContent,
      })
    );
  };

  return (
    <Card
      title="📋 자유 게시판"
      actions={
        <Button
          size="sm"
          onClick={handleOpenCreatePostModal}
          leftIcon={<PlusCircleIcon />}
        >
          글쓰기
        </Button>
      }
    >
      <div className="mb-4 flex items-center space-x-2">
        <select
          value={searchType}
          onChange={(e) =>
            setSearchType(e.target.value as "title" | "content" | "author")
          }
          className="p-2 border rounded-md bg-white text-sm"
        >
          <option value="title">제목</option>
          <option value="content">내용</option>
          <option value="author">작성자</option>
        </select>
        <Input
          type="text"
          placeholder="검색어를 입력하세요..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-grow"
        />
        <Button onClick={handleSearch}>검색</Button>
      </div>
      {status === "loading" && <p>게시물을 불러오는 중...</p>}
      {status === "failed" && <p className="text-red-500">오류: {error}</p>}
      {status === "succeeded" && posts.length === 0 ? (
        <p className="text-center text-neutral-500 py-8">
          아직 게시물이 없습니다.
        </p>
      ) : (
        <div>
          <table className="w-full text-sm text-left text-neutral-500">
            <thead className="text-xs text-neutral-700 uppercase bg-neutral-50">
              <tr>
                <th scope="col" className="px-6 py-3 w-[10%]">
                  번호
                </th>
                <th scope="col" className="px-6 py-3 w-[50%]">
                  제목
                </th>
                <th scope="col" className="px-6 py-3 w-[15%]">
                  작성자
                </th>
                <th scope="col" className="px-6 py-3 w-[15%]">
                  작성일
                </th>
                <th scope="col" className="px-6 py-3 w-[10%]">
                  조회수
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, index) => (
                <tr
                  key={post.id}
                  className="bg-white border-b hover:bg-neutral-50 cursor-pointer"
                  onClick={() => handleOpenPostDetail(post)}
                >
                  <td className="px-6 py-4">
                    {pagination.totalElements -
                      pagination.page * pagination.size -
                      index}
                  </td>
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {post.title}
                    {post.commentCount > 0 && (
                      <span className="ml-2 text-primary font-bold">
                        [{post.commentCount}]
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{post.authorName}</td>
                  <td className="px-6 py-4">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">{post.viewCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              maxVisiblePages={5}
            />
          </div>
        </div>
      )}

      {/* 게시글 생성 모달 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="새 게시글 작성"
        size="2xl"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
            >
              취소
            </Button>
            <Button onClick={handleCreatePost}>등록</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요."
          />
          <TextArea
            label="내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요."
            rows={10}
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              파일 첨부
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-light/80"
            />
            <div className="mt-2 space-y-1">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm bg-neutral-100 p-2 rounded"
                >
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XCircleIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* 게시글 상세 모달 */}
      {currentPost && (
        <BulletinPostDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            dispatch(clearCurrentPost());
          }}
          post={currentPost}
          onAddComment={handleAddBulletinComment}
          onDeletePost={handleDeleteBulletinPost}
          onUpdatePost={handleUpdateBulletinPost}
          currentUser={currentUser as User}
        />
      )}
    </Card>
  );
};

export const TeamSpacePage: React.FC = () => {
  const { workspaceId, teamProjectId } = useParams<{
    workspaceId: string;
    teamProjectId: string;
  }>();
  const { currentUser, setCurrentTeamProject } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const [team, setTeam] = useState<TeamProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticatedForTeam, setIsAuthenticatedForTeam] = useState(false);

  // 팀 설정 관련 상태
  const [showTeamSettingsDropdown, setShowTeamSettingsDropdown] =
    useState(false);
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [teamActionLoading, setTeamActionLoading] = useState(false);

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const TABS = useMemo(
    () => [
      { id: "announcements", label: "공지사항", icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />, component: <TeamAnnouncementBoard teamProjectId={teamProjectId as string} /> },
      { id: "calendar", label: "캘린더", icon: <CalendarDaysIcon className="w-5 h-5" />, component: <TeamCalendar teamProjectId={teamProjectId as string} /> },
      { id: "kanban", label: "칸반보드", icon: <TableCellsIcon className="w-5 h-5" />, component: <TeamKanbanBoard teamProjectId={teamProjectId as string} currentUser={currentUser as User} team={team} /> },
      { id: "bulletin", label: "게시판", icon: <ClipboardDocumentListIcon className="w-5 h-5" />, component: <TeamBulletinBoard teamProjectId={teamProjectId as string} currentUser={currentUser as User} /> },
    ],
    [teamProjectId, currentUser, team]
  );
  
  type TeamSpaceActiveTabType = (typeof TABS)[number]["id"];

  const getInitialTab = (): TeamSpaceActiveTabType => {
    const queryParams = new URLSearchParams(location.search);
    const feature = queryParams.get("feature");
    if (feature && TABS.some((tab) => tab.id === feature)) {
      return feature as TeamSpaceActiveTabType;
    }
    return "announcements";
  };

  const [activeTab, setActiveTab] = useState<TeamSpaceActiveTabType>(getInitialTab());

  // Check for password requirement
  useEffect(() => {
    if (location.state?.requiresPassword) {
      setNeedsPassword(true);
    }
  }, [location.state]);

  const handlePasswordSubmit = () => {
    // This is a dummy check. In a real app, you'd verify this with the backend.
    if (team?.password && password === team.password) {
      setNeedsPassword(false);
      sessionStorage.setItem(`team-auth-${teamProjectId}`, "true");
    } else {
      alert("비밀번호가 올바르지 않습니다.");
    }
  };

  useEffect(() => {
    const isAuthed = sessionStorage.getItem(`team-auth-${teamProjectId}`);
    if (isAuthed) {
      setNeedsPassword(false);
    }
  }, [teamProjectId]);


  // Load team details
  const loadTeamData = async () => {
    if (currentWorkspace?.id && teamProjectId && currentUser?.id) {
        setLoading(true);
        setError(null);
        try {
            const teamData = await teamApi.getTeamDetails(currentWorkspace.id, teamProjectId, currentUser.id);
            setTeam(teamData);
            // Check if user is a member
            const isMember = teamData.members.some(member => member.id === currentUser.id);
            if (!isMember) {
                // if there's a password and user is not a member, prompt for it
                if (teamData.password) {
                    setNeedsPassword(true);
                } else {
                   // if no password, maybe add them automatically or show a 'join' button
                   // for now, we'll just let them view
                }
            }
        } catch (error: any) {
            setError(error.message || "팀 정보를 불러오는데 실패했습니다.");
            if (error.response?.status === 403) {
                 // Potentially private team, might need password
                 setNeedsPassword(true);
            }
        } finally {
            setLoading(false);
        }
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [currentWorkspace?.id, teamProjectId, currentUser?.id]);


  // Navigation and sidebar logic
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };
  
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentWorkspace?.id || !teamProjectId) {
      alert("초대할 사람의 이메일을 입력하세요.");
      return;
    }
    setIsInviting(true);
    try {
      await teamApi.inviteUserToTeam(currentWorkspace.id, teamProjectId, inviteEmail);
      alert(`${inviteEmail} 님을 성공적으로 초대했습니다.`);
      setShowInviteModal(false);
      setInviteEmail('');
      // Optionally, reload team data to show new member
      loadTeamData(); 
    } catch (error: any) {
      console.error("초대 실패:", error);
      alert(error.response?.data?.message || "초대에 실패했습니다.");
    } finally {
      setIsInviting(false);
    }
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        const toggleButton = document.getElementById("sidebar-toggle");
        if (toggleButton && toggleButton.contains(event.target as Node)) {
          return;
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen]);

  // Render logic
  if (loading)
    return (
      <div className="flex justify-center items-center h-full">
        <p>팀 스페이스 정보를 불러오는 중...</p>
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">오류: {error}</p>
      </div>
    );
  if (!team)
    return (
      <div className="flex justify-center items-center h-full">
        <p>팀을 찾을 수 없습니다.</p>
      </div>
    );

  if (needsPassword) {
    return (
      <div className="flex justify-center items-center h-screen bg-neutral-100">
        <Card title="비밀번호 입력" className="w-full max-w-md">
          <p className="mb-4 text-neutral-600">
            이 팀 스페이스에 접근하려면 비밀번호가 필요합니다.
          </p>
          <div className="space-y-4">
            <Input
              type="password"
              label="팀 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <Button onClick={handlePasswordSubmit} className="w-full">
              입장
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`bg-white border-r border-neutral-200 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold truncate" title={team.name}>
            {team.name}
          </h2>
          <p className="text-sm text-neutral-500 truncate" title={team.description}>
            {team.description}
          </p>
        </div>
        <nav className="flex-grow p-2 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-primary-light text-primary"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {tab.icon}
              <span className="ml-3">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-2 border-t">
            <div className="p-2">
                <h3 className="font-semibold text-sm mb-2 px-1">팀원 ({team.members.length})</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {team.members.map(member => (
                        <div key={member.id} className="flex items-center space-x-2 px-1">
                            <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold">
                                {member.name.charAt(0)}
                            </div>
                            <span className="text-sm text-neutral-700">{member.name}</span>
                        </div>
                    ))}
                </div>
                 <Button 
                    variant="outline" size="sm" 
                    className="w-full mt-2"
                    onClick={() => setShowInviteModal(true)} 
                    leftIcon={<UserIcon className="w-4 h-4" />}>
                    팀원 초대하기
                </Button>
            </div>
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-100">
            <CogIcon className="w-5 h-5" />
            <span className="ml-3">팀 설정</span>
          </button>
          <button
            onClick={() => navigate(`/workspace/${currentWorkspace?.id}`)}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="ml-3">워크스페이스로 돌아가기</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-neutral-200 flex items-center p-2">
          <Button
            id="sidebar-toggle"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2"
          >
            <Bars3Icon className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-semibold">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h1>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {TABS.find((t) => t.id === activeTab)?.component}
        </main>
      </div>

       {/* Invite Member Modal */}
        <Modal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            title="팀에 멤버 초대"
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={() => setShowInviteModal(false)}>취소</Button>
                    <Button onClick={handleInvite} disabled={isInviting}>
                        {isInviting ? "초대 중..." : "초대 보내기"}
                    </Button>
                </div>
            }
        >
            <Input
                type="email"
                label="이메일 주소"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="초대할 사람의 이메일을 입력하세요"
                autoFocus
            />
        </Modal>
    </div>
  );
};
