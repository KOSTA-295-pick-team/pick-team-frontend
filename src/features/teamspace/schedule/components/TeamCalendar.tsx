import React, { useState, useEffect, useCallback } from "react";
import { Button, Card, Modal, TextArea, Input } from "@/components/ui";
import { TrashIcon, ArrowLeftIcon, PlusCircleIcon } from "@/assets/icons";
import {
  ScheduleResponse,
  ScheduleCreateRequest,
  ScheduleUpdateRequest,
  User,
} from "@/types";
import { scheduleApi } from "@/features/teamspace/schedule/api/scheduleApi";

// 컴포넌트 내부에서 사용할 이벤트 타입 (날짜를 Date 객체로 관리)
interface InternalCalendarEvent {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  type: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER";
  teamId: number;
  creatorId?: number;
}

const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

const TeamCalendar: React.FC<{ teamId: string; currentUser: User }> = ({
  teamId,
  currentUser,
}) => {
  const [events, setEvents] = useState<InternalCalendarEvent[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<InternalCalendarEvent>>({
    title: "",
    startDate: new Date(),
    endDate: new Date(),
    type: "MEETING",
  });
  const [editingEvent, setEditingEvent] =
    useState<InternalCalendarEvent | null>(null);
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());

  const { year, month } = {
    year: currentDisplayDate.getFullYear(),
    month: currentDisplayDate.getMonth(),
  };

  const loadEvents = useCallback(
    async (startDate: Date, endDate: Date) => {
      try {
        const scheduleResponses = await scheduleApi.getSchedulesByDateRange(
          Number(teamId),
          startDate.toISOString(),
          endDate.toISOString()
        );
        const calendarEvents: InternalCalendarEvent[] = scheduleResponses.map(
          (res: ScheduleResponse) => ({
            id: res.id,
            title: res.title,
            startDate: new Date(res.startDate),
            endDate: new Date(res.endDate),
            type: res.type,
            teamId: res.teamId,
            description: res.scheduleDesc,
            creatorId: res.creatorId,
          })
        );
        setEvents(calendarEvents);
      } catch (error) {
        console.error("일정 로딩 실패:", error);
        alert("일정을 불러오는 데 실패했습니다.");
      }
    },
    [teamId]
  );

  useEffect(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59);
    loadEvents(firstDay, lastDay);
  }, [year, month, loadEvents]);

  const resetModalState = () => {
    setEditingEvent(null);
    setNewEvent({
      title: "",
      startDate: new Date(),
      endDate: new Date(),
      type: "MEETING",
    });
    setShowAddEventModal(false);
  };

  const handleAddOrUpdateEvent = async () => {
    const eventToProcess = editingEvent
      ? { ...editingEvent, ...newEvent }
      : newEvent;

    if (
      !eventToProcess.title ||
      !eventToProcess.startDate ||
      !eventToProcess.endDate
    ) {
      alert("일정 제목, 시작일, 종료일은 필수입니다.");
      return;
    }

    try {
      if (editingEvent) {
        const updateRequest: ScheduleUpdateRequest = {
          title: eventToProcess.title,
          startDate: eventToProcess.startDate.toISOString(),
          endDate: eventToProcess.endDate.toISOString(),
          scheduleDesc: eventToProcess.description,
          type: eventToProcess.type || "MEETING",
        };
        await scheduleApi.updateSchedule(
          Number(teamId),
          editingEvent.id,
          String(currentUser.id),
          updateRequest
        );
      } else {
        const createRequest: ScheduleCreateRequest = {
          title: eventToProcess.title,
          startDate: eventToProcess.startDate.toISOString(),
          endDate: eventToProcess.endDate.toISOString(),
          scheduleDesc: eventToProcess.description,
          type: eventToProcess.type || "MEETING",
        };
        await scheduleApi.createSchedule(
          Number(teamId),
          String(currentUser.id),
          createRequest
        );
      }

      resetModalState();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59);
      await loadEvents(firstDay, lastDay);
    } catch (error) {
      console.error("일정 처리 실패:", error);
      alert(`일정 ${editingEvent ? "수정" : "추가"}에 실패했습니다.`);
    }
  };

  const handleDeleteEvent = async () => {
    if (editingEvent) {
      if (window.confirm("이 일정을 정말 삭제하시겠습니까?")) {
        try {
          await scheduleApi.deleteSchedule(
            Number(teamId),
            editingEvent.id,
            String(currentUser.id)
          );
          resetModalState();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0, 23, 59, 59);
          await loadEvents(firstDay, lastDay);
        } catch (error) {
          console.error("일정 삭제 실패:", error);
          alert("일정 삭제에 실패했습니다.");
        }
      }
    }
  };

  const openAddModal = (date: Date) => {
    resetModalState();
    const startOfDay = new Date(date);
    startOfDay.setHours(9, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(10, 0, 0, 0);
    setNewEvent({
      title: "",
      startDate: startOfDay,
      endDate: endOfDay,
      type: "MEETING",
    });
    setShowAddEventModal(true);
  };

  const openEditModal = (event: InternalCalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      type: event.type,
      description: event.description,
    });
    setShowAddEventModal(true);
  };

  const prevMonth = () => setCurrentDisplayDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDisplayDate(new Date(year, month + 1, 1));

  const getDayClass = (
    _day: number,
    isCurrentMonth: boolean,
    isToday: boolean,
    hasEvent: boolean
  ) => {
    let classes =
      "w-6 h-6 text-center leading-6 cursor-pointer rounded-full transition-colors text-sm ";
    if (!isCurrentMonth) classes += "text-gray-400";
    else if (isToday) classes += "bg-blue-500 text-white font-bold ";
    else classes += "hover:bg-blue-100 ";

    if (hasEvent && isCurrentMonth) classes += " font-semibold";

    return classes;
  };

  const renderDays = () => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push(
        <div
          key={`prev-${i}`}
          className="p-2 h-24 border-b border-r border-gray-200 bg-gray-50"
        >
          <div className="w-6 h-6 text-center leading-6 text-gray-300 text-sm">
            {prevMonthDays - i}
          </div>
        </div>
      );
    }

    for (let i = 1; i <= totalDays; i++) {
      const fullDate = new Date(year, month, i);
      const isToday = fullDate.toDateString() === new Date().toDateString();
      const dayEvents = events.filter((e) => {
        const start = new Date(e.startDate);
        const end = new Date(e.endDate);
        return (
          fullDate >=
            new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
          fullDate <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
        );
      });

      days.push(
        <div
          key={i}
          className="p-2 h-24 border-b border-r border-gray-200 hover:bg-gray-50 cursor-pointer"
        >
          <div className="flex justify-between items-start mb-1">
            <div
              className={getDayClass(i, true, isToday, dayEvents.length > 0)}
              onClick={() => openAddModal(fullDate)}
            >
              {i}
            </div>
          </div>
          <div className="w-full text-xs space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                onClick={() => openEditModal(event)}
                className={`px-1 py-0.5 rounded truncate cursor-pointer text-xs ${
                  event.type === "MEETING"
                    ? "bg-blue-100 text-blue-800"
                    : event.type === "DEADLINE"
                    ? "bg-red-100 text-red-800"
                    : event.type === "WORKSHOP"
                    ? "bg-green-100 text-green-800"
                    : event.type === "VACATION"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{dayEvents.length - 3}개
              </div>
            )}
          </div>
        </div>
      );
    }

    const remainingCells = 42 - days.length; // 6 * 7 grid
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="p-2 h-24 border-b border-r border-gray-200 bg-gray-50"
        >
          <div className="w-6 h-6 text-center leading-6 text-gray-300 text-sm">
            {i}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-200">
        <h2 className="text-xl font-semibold text-neutral-800">🗓️ 팀 캘린더</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openAddModal(new Date())}
          leftIcon={<PlusCircleIcon />}
        >
          일정 추가
        </Button>
      </div>
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          leftIcon={<ArrowLeftIcon />}
        >
          이전 달
        </Button>
        <h3 className="text-lg font-bold">{`${year}년 ${month + 1}월`}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          rightIcon={
            <div className="transform rotate-180">
              <ArrowLeftIcon />
            </div>
          }
        >
          다음 달
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 border border-gray-200 rounded-lg overflow-hidden">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="font-semibold text-center text-sm p-2 bg-gray-50 border-b border-gray-200"
          >
            {day}
          </div>
        ))}
        {renderDays()}
      </div>

      <Modal
        isOpen={showAddEventModal}
        onClose={resetModalState}
        title={editingEvent ? "일정 수정" : "새 일정 추가"}
        footer={
          <div className="flex justify-between w-full">
            {editingEvent && (
              <Button
                variant="danger"
                onClick={handleDeleteEvent}
                leftIcon={<TrashIcon />}
              >
                삭제
              </Button>
            )}
            <div className="flex space-x-2 ml-auto">
              <Button variant="ghost" onClick={resetModalState}>
                취소
              </Button>
              <Button variant="primary" onClick={handleAddOrUpdateEvent}>
                {editingEvent ? "수정" : "추가"}
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
            placeholder="일정 제목을 입력하세요"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="시작일"
              type="datetime-local"
              value={
                newEvent.startDate
                  ? new Date(
                      newEvent.startDate.getTime() -
                        newEvent.startDate.getTimezoneOffset() * 60000
                    )
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setNewEvent((prev) => ({
                  ...prev,
                  startDate: new Date(e.target.value),
                }))
              }
              required
            />
            <Input
              label="종료일"
              type="datetime-local"
              value={
                newEvent.endDate
                  ? new Date(
                      newEvent.endDate.getTime() -
                        newEvent.endDate.getTimezoneOffset() * 60000
                    )
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setNewEvent((prev) => ({
                  ...prev,
                  endDate: new Date(e.target.value),
                }))
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              일정 종류
            </label>
            <select
              value={newEvent.type || "MEETING"}
              onChange={(e) =>
                setNewEvent((prev) => ({
                  ...prev,
                  type: e.target.value as InternalCalendarEvent["type"],
                }))
              }
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="MEETING">📝 회의</option>
              <option value="DEADLINE">⏰ 마감일</option>
              <option value="WORKSHOP">🎯 워크샵</option>
              <option value="VACATION">🏖️ 휴가</option>
              <option value="OTHER">📌 기타</option>
            </select>
          </div>
          <TextArea
            label="설명 (선택)"
            value={newEvent.description || ""}
            onChange={(e) =>
              setNewEvent((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            placeholder="일정에 대한 상세 설명을 입력하세요"
          />
        </div>
      </Modal>
    </Card>
  );
};

export default TeamCalendar;
