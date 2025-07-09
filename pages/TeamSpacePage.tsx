import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  Button,
  Input,
  Card,
  Modal,
  TextArea,
  Pagination,
  CalendarDaysIcon,
  PlusCircleIcon,
  TrashIcon,
} from "../components";
import {
  TeamProject,
  CalendarEvent,
  User,
  KanbanBoard,
  KanbanCard as KanbanCardType,
  KanbanComment,
  BulletinPost,
} from "../types";
import { useAuth } from "../AuthContext";
import {
  CheckCircleIcon,
  Bars3Icon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleBottomCenterTextIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { teamApi } from "../services/teamApi";
import { bulletinApi } from "../services/bulletinApi";
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
                  <div className="flex-1">
                    {/* 제목 */}
                    <h4 className="font-semibold text-neutral-800 mb-1">
                      {anno.title}
                    </h4>
                    {/* 내용 */}
                    <p className="text-neutral-700 whitespace-pre-line mb-2">
                      {anno.content}
                    </p>
                    {/* 메타 정보 */}
                    <p className="text-xs text-neutral-500">
                      작성자: {anno.author} -{" "}
                      {new Date(anno.timestamp).toLocaleString()}
                      {anno.updatedAt && anno.updatedAt !== anno.createdAt && (
                        <span className="ml-2">(수정됨)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* 수정 버튼 (작성자만) */}
                    {canEdit(anno) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(anno)}
                        className="text-blue-500 hover:text-blue-700"
                        aria-label="공지 수정"
                      >
                        <CogIcon className="w-4 h-4" />
                      </Button>
                    )}
                    {/* 삭제 버튼 (작성자만) */}
                    {canEdit(anno) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(anno.id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="공지 삭제"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* 페이징 컴포넌트 */}
          {totalElements > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              onPageChange={handlePageChange}
              loading={loading}
            />
          )}
        </div>
      )}

      {/* 공지사항 생성/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={resetModal}
        title={editingAnnouncement ? "공지사항 수정" : "새 공지사항 작성"}
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={resetModal}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "처리 중..." : editingAnnouncement ? "수정" : "등록"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 제목 입력 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              제목 *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요..."
              maxLength={255}
            />
          </div>
          {/* 내용 입력 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              내용 *
            </label>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요..."
              rows={6}
            />
          </div>
        </div>
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
}

const KanbanCardDetailModal: React.FC<KanbanCardDetailModalProps> = ({
  isOpen,
  onClose,
  card,
  columnTitle,
  onUpdateCard,
  onAddComment,
  onApproveCard,
}) => {
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (card) {
      setEditedTitle(card.title);
      setEditedDescription(card.description || "");
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleSave = () => {
    onUpdateCard({
      ...card,
      title: editedTitle,
      description: editedDescription,
    });
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(card.id, newComment.trim());
      setNewComment("");
    }
  };

  const isDoneColumn = columnTitle === "Done";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="작업 상세 정보"
      footer={
        <div className="flex justify-between w-full">
          <div>
            {isDoneColumn &&
              (card.isApproved ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                  className="text-green-500"
                  leftIcon={<CheckCircleIcon className="w-5 h-5" />}
                >
                  승인 완료
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onApproveCard(card.id)}
                  leftIcon={<CheckCircleIcon className="w-5 h-5" />}
                >
                  승인 요청
                </Button>
              ))}
          </div>
          <div className="space-x-2">
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button onClick={handleSave}>변경사항 저장</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            제목
          </label>
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="text-lg font-semibold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            설명
          </label>
          <TextArea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="text-sm">
          <p>
            <span className="font-medium">상태:</span> {columnTitle}
          </p>
          {card.dueDate && (
            <p>
              <span className="font-medium">마감일:</span>{" "}
              {new Date(card.dueDate).toLocaleDateString()}
            </p>
          )}
          {card.assigneeIds && card.assigneeIds.length > 0 && (
            <p>
              <span className="font-medium">담당자:</span>{" "}
              {card.assigneeIds.join(", ")} (ID)
            </p>
          )}
        </div>

        <div>
          <h4 className="text-md font-semibold text-neutral-700 mb-2 border-t pt-3">
            댓글
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3 bg-neutral-50 p-2 rounded">
            {card.comments && card.comments.length > 0 ? (
              card.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="text-xs p-1.5 bg-white rounded shadow-sm"
                >
                  <p className="text-neutral-800">{comment.text}</p>
                  <p className="text-neutral-500 mt-0.5">
                    - {comment.userName} (
                    {new Date(comment.createdAt).toLocaleString()})
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic">
                댓글이 없습니다.
              </p>
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
            <Button
              onClick={handleAddComment}
              size="sm"
              variant="outline"
              className="h-full"
            >
              댓글 추가
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const TeamKanbanBoard: React.FC<{
  teamProjectId: string;
  currentUser: User;
}> = ({ teamProjectId, currentUser }) => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);
  const [selectedCardColumnTitle, setSelectedCardColumnTitle] = useState("");

  useEffect(() => {
    // TODO: 실제 API 연동 (현재는 목업 데이터 사용)
    // const loadKanbanBoard = async () => {
    //     try {
    //         const kanbanBoard = await fetchKanbanBoard(teamProjectId);
    //         setBoard(kanbanBoard);
    //     } catch (error) {
    //         console.error('Failed to load kanban board:', error);
    //     }
    // };
    // loadKanbanBoard();

    // 임시 목업 데이터 (API 연동 후 제거 예정)
    const demoCards: KanbanCardType[] = [
      {
        id: "card1",
        title: "로그인 페이지 디자인",
        description: "사용자 인증 UI 구현",
        columnId: "col1",
        order: 0,
        assigneeIds: [currentUser.id],
        dueDate: new Date(Date.now() + 2 * 86400000),
      },
      {
        id: "card2",
        title: "API 문서 작성",
        description: "REST API 명세서 작성",
        columnId: "col2",
        order: 0,
        assigneeIds: [currentUser.id],
        dueDate: new Date(Date.now() + 5 * 86400000),
      },
      {
        id: "card3",
        columnId: "col3",
        title: "1차 QA 완료",
        description: "회원가입 및 로그인 플로우 QA 완료.",
        order: 0,
        isApproved: true,
      },
    ];
    setBoard({
      id: `kanban-${teamProjectId}`,
      teamProjectId,
      columns: [
        {
          id: "col1",
          boardId: `kanban-${teamProjectId}`,
          title: "To Do",
          cards: demoCards.filter((c) => c.columnId === "col1"),
          order: 0,
        },
        {
          id: "col2",
          boardId: `kanban-${teamProjectId}`,
          title: "In Progress",
          cards: demoCards.filter((c) => c.columnId === "col2"),
          order: 1,
        },
        {
          id: "col3",
          boardId: `kanban-${teamProjectId}`,
          title: "Done",
          cards: demoCards.filter((c) => c.columnId === "col3"),
          order: 2,
        },
      ],
    });
  }, [teamProjectId]);

  const handleCardClick = (card: KanbanCardType, columnTitle: string) => {
    setSelectedCard(card);
    setSelectedCardColumnTitle(columnTitle);
    setIsCardDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCardDetailModalOpen(false);
    setSelectedCard(null);
    setSelectedCardColumnTitle("");
  };

  const handleUpdateCard = (updatedCard: KanbanCardType) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return null;
      return {
        ...prevBoard,
        columns: prevBoard.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.id === updatedCard.id ? updatedCard : card
          ),
        })),
      };
    });
    setSelectedCard(updatedCard);
  };

  const handleAddCommentToCard = (cardId: string, commentText: string) => {
    const newComment: KanbanComment = {
      id: `comment-${Date.now()}`,
      cardId,
      userId: currentUser.id,
      userName: currentUser.name || "Current User",
      text: commentText,
      createdAt: new Date(),
    };
    setBoard((prevBoard) => {
      if (!prevBoard) return null;
      const newColumns = prevBoard.columns.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              comments: [...(card.comments || []), newComment],
            };
          }
          return card;
        }),
      }));
      const updatedCardFromState = newColumns
        .flatMap((col) => col.cards)
        .find((c) => c.id === cardId);
      if (updatedCardFromState) setSelectedCard(updatedCardFromState);
      return { ...prevBoard, columns: newColumns };
    });
  };

  const handleApproveCard = (cardId: string) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return null;
      const newColumns = prevBoard.columns.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id === cardId) {
            return { ...card, isApproved: true };
          }
          return card;
        }),
      }));
      const updatedCardFromState = newColumns
        .flatMap((col) => col.cards)
        .find((c) => c.id === cardId);
      if (updatedCardFromState) setSelectedCard(updatedCardFromState);
      return { ...prevBoard, columns: newColumns };
    });
  };

  if (!board)
    return (
      <Card title="📊 칸반 보드">
        <p>로딩 중...</p>
      </Card>
    );

  return (
    <Card
      title="📊 칸반 보드"
      actions={
        <Button size="sm" leftIcon={<PlusCircleIcon />}>
          새 작업 추가
        </Button>
      }
    >
      <div className="flex space-x-4 overflow-x-auto p-2 bg-neutral-50 rounded min-h-[500px]">
        {board.columns
          .sort((a, b) => a.order - b.order)
          .map((column) => (
            <div
              key={column.id}
              className="w-80 bg-neutral-100 p-3 rounded-lg shadow-sm flex-shrink-0"
            >
              <h3 className="font-semibold text-neutral-700 mb-3 px-1">
                {column.title} ({column.cards.length})
              </h3>
              <div className="space-y-3 min-h-[450px]">
                {column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white p-3 rounded-md shadow border border-neutral-200 hover:shadow-lg hover:border-primary-light transition-all cursor-pointer group"
                    onClick={() => handleCardClick(card, column.title)}
                  >
                    <h4 className="font-medium text-sm text-neutral-800 group-hover:text-primary">
                      {card.title}
                    </h4>
                    {card.description && (
                      <p className="text-xs text-neutral-600 mt-1 truncate group-hover:whitespace-normal">
                        {card.description}
                      </p>
                    )}
                    {card.dueDate && (
                      <p
                        className={`text-xs mt-1.5 ${
                          new Date(card.dueDate) < new Date() &&
                          column.id !== "col3"
                            ? "text-red-600 font-medium"
                            : "text-neutral-500"
                        }`}
                      >
                        마감: {new Date(card.dueDate).toLocaleDateString()}
                      </p>
                    )}

                    <div className="mt-2 pt-2 border-t border-neutral-100 flex justify-between items-center">
                      <div className="flex -space-x-1 overflow-hidden">
                        {card.assigneeIds &&
                          card.assigneeIds
                            .slice(0, 3)
                            .map((assigneeId) => (
                              <img
                                key={assigneeId}
                                className="inline-block h-5 w-5 rounded-full ring-1 ring-white"
                                src={`https://picsum.photos/seed/${assigneeId}/20/20`}
                                alt={`Assignee ${assigneeId}`}
                                title={assigneeId}
                              />
                            ))}
                        {card.assigneeIds && card.assigneeIds.length > 3 && (
                          <span className="text-xs text-neutral-400 self-center pl-1">
                            +{card.assigneeIds.length - 3}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {card.comments && card.comments.length > 0 && (
                          <span className="text-xs text-neutral-500 flex items-center">
                            <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 mr-0.5" />
                            {card.comments.length}
                          </span>
                        )}
                        {card.isApproved && column.id === "col3" && (
                          <CheckCircleIcon
                            className="w-4 h-4 text-green-500"
                            title="승인 완료"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {column.cards.length === 0 && (
                  <p className="text-xs text-neutral-400 p-2 text-center">
                    이 컬럼에 카드가 없습니다.
                  </p>
                )}
              </div>
            </div>
          ))}
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
        />
      )}
    </Card>
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
  const {
    posts,
    loading,
    error,
    currentPage,
    totalPages,
    totalElements,
    hasNext,
    hasPrevious,
  } = useAppSelector((state) => state.bulletin);

  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [newPostData, setNewPostData] = useState<{
    title: string;
    content: string;
  }>({ title: "", content: "" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);
  const [isPostDetailModalOpen, setIsPostDetailModalOpen] = useState(false);

  // 임시로 boardId를 1로 설정 (실제로는 팀별 기본 게시판 ID를 가져와야 함)
  const BOARD_ID = "1";

  // 게시글 목록 조회
  useEffect(() => {
    if (teamProjectId) {
      dispatch(
        fetchPosts({
          teamId: teamProjectId,
          boardId: BOARD_ID,
          page: currentPage,
        })
      );
    }
  }, [dispatch, teamProjectId, currentPage]);

  const handleOpenCreatePostModal = () => {
    setNewPostData({ title: "", content: "" });
    setSelectedFiles([]);
    setIsCreatePostModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!newPostData.title.trim() || !newPostData.content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      // 게시글 생성
      const createdPost = await dispatch(
        createPost({
          teamId: teamProjectId,
          accountId: currentUser.id,
          post: {
            title: newPostData.title,
            content: newPostData.content,
            boardId: BOARD_ID,
          },
        })
      ).unwrap();

      // 첨부파일이 있으면 업로드
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map((file) =>
          bulletinApi.uploadAttachment(createdPost.id, currentUser.id, file)
        );
        await Promise.all(uploadPromises);
      }

      setIsCreatePostModalOpen(false);
      setNewPostData({ title: "", content: "" });
      setSelectedFiles([]);

      // 게시글 목록 새로고침
      dispatch(
        fetchPosts({
          teamId: teamProjectId,
          boardId: BOARD_ID,
          page: 0,
        })
      );
    } catch (error) {
      console.error("게시글 생성 실패:", error);
      alert("게시글 생성에 실패했습니다.");
    }
  };

  const handleOpenPostDetail = async (post: BulletinPost) => {
    try {
      // 항상 서버에서 최신 게시글 데이터를 가져와서 Redux currentPost에 설정
      await Promise.all([
        dispatch(fetchPost(post.id)).unwrap(),
        dispatch(fetchComments({ postId: post.id, page: 0 })).unwrap(),
      ]);

      // selectedPost는 Redux currentPost를 참조하도록 설정
      setSelectedPost(post); // 기본 post 정보만 설정 (실제로는 displayPost가 Redux 상태를 사용)
      setIsPostDetailModalOpen(true);
    } catch (error) {
      console.error("게시글 상세 조회 실패:", error);
      alert("게시글을 불러오는데 실패했습니다.");
    }
  };

  const handleAddBulletinComment = async (
    postId: string,
    commentText: string
  ) => {
    try {
      await dispatch(
        createComment({
          postId,
          accountId: currentUser.id,
          content: commentText,
        })
      ).unwrap();

      // 댓글 목록 새로고침
      dispatch(fetchComments({ postId, page: 0 }));
    } catch (error) {
      console.error("댓글 생성 실패:", error);
      alert("댓글 생성에 실패했습니다.");
    }
  };

  const handleDeleteBulletinPost = async (postId: string) => {
    if (window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
      try {
        await dispatch(
          deletePost({
            postId,
            accountId: currentUser.id,
          })
        ).unwrap();

        setIsPostDetailModalOpen(false);

        // 게시글 목록 새로고침
        dispatch(
          fetchPosts({
            teamId: teamProjectId,
            boardId: BOARD_ID,
            page: currentPage,
          })
        );
      } catch (error) {
        console.error("게시글 삭제 실패:", error);
        alert("게시글 삭제에 실패했습니다.");
      }
    }
  };

  const handleUpdateBulletinPost = async (
    postId: string,
    title: string,
    content: string
  ) => {
    try {
      console.log(
        "[handleUpdateBulletinPost] 게시글 업데이트 시작, postId:",
        postId
      );

      await dispatch(
        updatePost({
          postId,
          accountId: currentUser.id,
          post: { title, content },
        })
      ).unwrap();

      console.log(
        "[handleUpdateBulletinPost] 게시글 업데이트 완료, fetchPost 호출 안 함"
      );

      // fetchPost를 호출하지 않음 - 첨부파일 상태를 유지하기 위해
      // 현재 Redux 상태의 currentPost를 그대로 사용

      // 게시글 목록만 새로고침 (제목/내용 변경사항 반영)
      dispatch(
        fetchPosts({
          teamId: teamProjectId,
          boardId: BOARD_ID,
          page: currentPage,
        })
      );
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      throw error;
    }
  };

  // 첨부파일 변경 후 게시글 새로고침
  // 첨부파일 변경 후 게시글 새로고침
  return (
    <Card
      title="📋 게시판"
      actions={
        <Button
          size="sm"
          onClick={handleOpenCreatePostModal}
          leftIcon={<PlusCircleIcon />}
        >
          새 글 작성
        </Button>
      }
    >
      {loading && <div className="text-center py-4">로딩 중...</div>}
      {error && <div className="text-red-500 text-center py-4">{error}</div>}

      <ul className="space-y-3">
        {posts.map((post) => (
          <li
            key={post.id}
            className="p-3 bg-neutral-50 rounded shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start">
              <div
                className="flex-grow cursor-pointer"
                onClick={() => handleOpenPostDetail(post)}
              >
                <h4 className="font-semibold text-primary-dark hover:underline">
                  {post.title}
                </h4>
                <p className="text-xs text-neutral-600 truncate max-w-md">
                  {post.content}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  작성자: {post.authorName} |{" "}
                  {new Date(post.createdAt).toLocaleDateString()} | 댓글:{" "}
                  {post.comments?.length || 0}
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
                  <TrashIcon className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {posts.length === 0 && !loading && (
        <p className="text-neutral-500 py-4 text-center">게시글이 없습니다.</p>
      )}

      {/* 페이지네이션 */}
      {totalElements > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={5}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            onPageChange={(page) => {
              dispatch(
                fetchPosts({
                  teamId: teamProjectId,
                  boardId: BOARD_ID,
                  page,
                })
              );
            }}
            loading={loading}
          />
        </div>
      )}

      <Modal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        title="새 게시글 작성"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => setIsCreatePostModalOpen(false)}
            >
              취소
            </Button>
            <Button onClick={handleCreatePost}>등록</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="제목"
            value={newPostData.title}
            onChange={(e) =>
              setNewPostData((prev) => ({ ...prev, title: e.target.value }))
            }
            required
          />
          <TextArea
            label="내용"
            value={newPostData.content}
            onChange={(e) =>
              setNewPostData((prev) => ({ ...prev, content: e.target.value }))
            }
            rows={8}
            required
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              첨부파일 (선택)
            </label>
            <Input
              type="file"
              multiple
              className="text-sm"
              onChange={handleFileChange}
              accept="*/*"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-neutral-600">선택된 파일:</p>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-neutral-100 p-2 rounded text-xs"
                  >
                    <span>
                      {file.name} ({Math.round(file.size / 1024)}KB)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {selectedPost && (
        <BulletinPostDetailModal
          isOpen={isPostDetailModalOpen}
          onClose={() => {
            setIsPostDetailModalOpen(false);
            setSelectedPost(null); // 모달을 닫을 때 selectedPost 초기화
          }}
          post={selectedPost}
          onAddComment={handleAddBulletinComment}
          onDeletePost={handleDeleteBulletinPost}
          onUpdatePost={handleUpdateBulletinPost}
          currentUser={currentUser}
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

  const TABS = [
    { name: "공지", id: "announcements", icon: <ClipboardDocumentListIcon /> },
    { name: "칸반보드", id: "kanban", icon: <TableCellsIcon /> },
    { name: "게시판", id: "bulletin", icon: <Bars3Icon /> },
    // { name: '화상회의', id: 'video', icon: <VideoCameraIcon /> }, // Removed
    { name: "캘린더", id: "calendar", icon: <CalendarDaysIcon /> },
  ] as const;

  type TeamSpaceActiveTabType = (typeof TABS)[number]["id"];

  const getInitialTab = (): TeamSpaceActiveTabType => {
    const queryParams = new URLSearchParams(location.search);
    const feature = queryParams.get("feature");
    if (feature && TABS.some((tab) => tab.id === feature)) {
      return feature as TeamSpaceActiveTabType;
    }
    return "announcements";
  };
  const [activeTab, setActiveTab] = useState<TeamSpaceActiveTabType>(
    getInitialTab()
  );

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const feature = queryParams.get("feature");
    if (
      feature &&
      TABS.some((tab) => tab.id === feature) &&
      feature !== activeTab
    ) {
      setActiveTab(feature as TeamSpaceActiveTabType);
    }
  }, [location.search, activeTab]);

  // 기존의 데모 데이터 사용 로직 제거 - 실제 API 호출로 대체됨

  const handlePasswordSubmit = () => {
    if (password === "password123" && team?.passwordProtected) {
      setIsAuthenticatedForTeam(true);
      setAuthError("");
    } else {
      setAuthError("잘못된 비밀번호입니다.");
    }
  };

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
      console.error("팀 탈퇴 실패:", error);
      alert("팀 탈퇴에 실패했습니다. 다시 시도해주세요.");
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
      console.error("팀 삭제 실패:", error);
      alert("팀 삭제에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setTeamActionLoading(false);
    }
  }, [team, teamProjectId, workspaceId, navigate]);

  // 현재 사용자가 팀장인지 확인하는 함수
  const isTeamLeader = useCallback(() => {
    if (!team || !currentUser) {
      return false;
    }

    // 임시로 모든 팀 멤버가 팀장 권한을 가지도록 설정 (테스트용)
    const hasLeaderPermission = team.members.some(
      (member) => member.id === currentUser.id
    );
    // 테스트용: 팀 멤버라면 팀장 권한 부여
    return hasLeaderPermission;
  }, [team, currentUser]);

  // 팀 데이터 로드 함수
  const loadTeamData = async () => {
    console.log("팀 데이터 로드 시작:", teamProjectId);

    if (!teamProjectId) {
      console.log("팀 ID 없음");
      setTeam(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 실제 API 호출 - 백엔드에서 이미 멤버 정보도 함께 반환함
      const teamData = await teamApi.getTeam(teamProjectId);

      setTeam(teamData);
      setCurrentTeamProject(teamData);

      // 비밀번호 보호가 없다면 바로 인증 완료
      if (!teamData.passwordProtected) {
        setIsAuthenticatedForTeam(true);
      }
    } catch (error) {
      console.error("팀 데이터 로드 실패:", error);
      setError("팀 정보를 불러오는데 실패했습니다.");
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [workspaceId, teamProjectId]);

  // 워크스페이스나 팀 프로젝트 변경 시 bulletin 상태 초기화
  useEffect(() => {
    if (workspaceId || teamProjectId) {
      console.log(
        "[TeamSpacePage] 워크스페이스/팀 변경으로 인한 bulletin 상태 초기화:",
        { workspaceId, teamProjectId }
      );
      dispatch(resetBulletinState());
    }
  }, [dispatch, workspaceId, teamProjectId]);

  // 컴포넌트 마운트 시에도 bulletin 상태 초기화 (새로고침 대응)
  useEffect(() => {
    console.log("[TeamSpacePage] 컴포넌트 마운트로 인한 bulletin 상태 초기화");
    dispatch(resetBulletinState());
  }, [dispatch]);

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTeamSettingsDropdown]);

  if (loading)
    return <div className="p-6 text-center">팀 정보를 불러오는 중...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!team)
    return (
      <div className="p-6 text-center text-red-500">
        팀을 찾을 수 없습니다.{" "}
        <Link
          to={`/ws/${workspaceId || ""}`}
          className="text-primary hover:underline"
        >
          워크스페이스 홈으로
        </Link>
      </div>
    );
  if (!currentUser) return <p className="p-6">로그인이 필요합니다.</p>;

  if (team.passwordProtected && !isAuthenticatedForTeam) {
    return (
      <Modal
        isOpen={true}
        onClose={() => navigate(`/ws/${workspaceId}`)}
        title={`${team.name} - 비밀번호 입력`}
        footer={<Button onClick={handlePasswordSubmit}>입장</Button>}
      >
        <p className="mb-4 text-sm text-neutral-600">
          이 팀 스페이스는 비밀번호로 보호되어 있습니다.
        </p>
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
  switch (activeTab) {
    case "announcements":
      contentToRender = <TeamAnnouncementBoard teamProjectId={team.id} />;
      break;
    // case 'video': // Removed
    //    contentToRender = <TeamVideoConference teamMembers={team.members} currentUser={currentUser} />;
    //    break;
    case "calendar":
      contentToRender = <TeamCalendar teamProjectId={team.id} />;
      break;
    case "kanban":
      contentToRender = (
        <TeamKanbanBoard teamProjectId={team.id} currentUser={currentUser} />
      );
      break;
    case "bulletin":
      contentToRender = (
        <TeamBulletinBoard teamProjectId={team.id} currentUser={currentUser} />
      );
      break;
    default:
      contentToRender = <p>선택된 기능이 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      <Card
        title={`팀 스페이스: ${team.name}`}
        actions={
          <div className="flex items-center space-x-4">
            {team.progress !== undefined && (
              <span className="text-sm text-neutral-500">
                진행도: {team.progress}%
              </span>
            )}
            {/* 팀 설정 드롭다운 */}
            <div className="relative" data-dropdown="team-settings">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setShowTeamSettingsDropdown(!showTeamSettingsDropdown)
                }
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
        }
      >
        <div className="mb-6 border-b border-neutral-200">
          <nav
            className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto"
            aria-label="Tabs"
          >
            {TABS.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1
                ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                {React.cloneElement(tab.icon, {
                  className: "w-4 h-4 sm:w-5 sm:h-5",
                })}
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
              {teamActionLoading ? "처리 중..." : "탈퇴하기"}
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
                console.log("삭제하기 버튼 클릭됨");
                handleDeleteTeam();
              }}
              disabled={teamActionLoading}
            >
              {teamActionLoading ? "처리 중..." : "삭제하기"}
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
              🚨 <strong>주의:</strong> 팀의 모든 칸반 보드, 게시글, 일정,
              공지사항이 삭제됩니다.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
