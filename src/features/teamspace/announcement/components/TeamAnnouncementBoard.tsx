import React, { useState, useEffect } from "react";
import { Button, Card, Modal, TextArea, Input } from "@/components/ui";
import { PlusCircleIcon, TrashIcon } from "@/assets/icons";
import { User } from "@/features/user/types/user";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAnnouncementsWithPaging,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/features/teamspace/announcement/store/announcementThunks";
import Pagination from "@/components/ui/Pagination";

const TeamAnnouncementBoard: React.FC<{
  teamId: string;
  workspaceId: string;
  currentUser: User;
}> = ({ teamId, workspaceId, currentUser }) => {
  const dispatch = useAppDispatch();
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
    if (workspaceId && teamId && currentUser?.id) {
      dispatch(
        fetchAnnouncementsWithPaging({
          teamId: Number(teamId),
          workspaceId,
          page: currentPageState,
          size: pageSize,
        })
      );
    }
  }, [
    dispatch,
    teamId,
    workspaceId,
    currentUser?.id,
    currentPageState,
    pageSize,
  ]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPageState(page);
  };

  // 공지사항 생성/수정 후 현재 페이지 새로고침
  const refreshCurrentPage = () => {
    dispatch(
      fetchAnnouncementsWithPaging({
        teamId: Number(teamId),
        workspaceId,
        page: currentPageState,
        size: pageSize,
      })
    );
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
    setTitle(announcement.title);
    setContent(announcement.content);
    setEditingAnnouncement(announcement.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      if (editingAnnouncement) {
        // 수정
        await dispatch(
          updateAnnouncement({
            announcementId: editingAnnouncement,
            title: title.trim(),
            content: content.trim(),
            workspaceId,
          })
        ).unwrap();
      } else {
        // 생성
        await dispatch(
          createAnnouncement({
            teamId: Number(teamId),
            title: title.trim(),
            content: content.trim(),
            workspaceId,
          })
        ).unwrap();
      }

      resetModal();
      refreshCurrentPage();
    } catch (error) {
      console.error("공지사항 처리 실패:", error);
      alert(
        `공지사항 ${editingAnnouncement ? "수정" : "생성"}에 실패했습니다.`
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 공지사항을 정말 삭제하시겠습니까?")) return;

    try {
      await dispatch(
        deleteAnnouncement({
          announcementId: id,
          workspaceId,
        })
      ).unwrap();

      refreshCurrentPage();
    } catch (error) {
      console.error("공지사항 삭제 실패:", error);
      alert("공지사항 삭제에 실패했습니다.");
    }
  };

  // 수정 권한 확인 (작성자 본인만 수정 가능)
  const canEdit = (announcement: any) => {
    return String(currentUser.id) === String(announcement.accountId);
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
      {loading ? (
        <p>공지사항을 불러오는 중...</p>
      ) : error ? (
        <p className="text-red-500">공지사항 로딩 중 오류가 발생했습니다.</p>
      ) : !Array.isArray(announcements) || announcements.length === 0 ? (
        <p className="text-neutral-500">아직 공지사항이 없습니다.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {announcements.map((anno) => (
              <li
                key={anno.id}
                className="p-3 bg-primary-light/10 rounded-md shadow-sm group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{anno.title}</p>
                    <p className="text-neutral-700 whitespace-pre-line mt-1">
                      {anno.content}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      작성자: {anno.authorName} -{" "}
                      {anno.createdAt
                        ? new Date(anno.createdAt).toLocaleString()
                        : "날짜 정보 없음"}
                    </p>
                  </div>
                  {canEdit(anno) && (
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(anno)}
                        aria-label="공지 수정"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(anno.id)}
                        aria-label="공지 삭제"
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* 페이징 컴포넌트 */}
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
        </>
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
            <Button onClick={handleSubmit}>
              {editingAnnouncement ? "수정" : "등록"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요..."
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default TeamAnnouncementBoard;
