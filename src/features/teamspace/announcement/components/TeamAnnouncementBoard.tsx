import React, { useState, useEffect, useCallback } from "react";
import { Button, Card, Modal, TextArea } from "@/components/ui";
import { PlusCircleIcon, TrashIcon } from "@/assets/icons";
import { User } from "@/features/user/types/user";
import { announcementApi } from "@/features/teamspace/announcement/api/announcementApi";
import { Announcement as ApiAnnouncement } from "@/features/teamspace/announcement/types/announcement";

const TeamAnnouncementBoard: React.FC<{
  teamId: string;
  workspaceId: string; // workspaceId prop 추가
  currentUser: User;
}> = ({ teamId, workspaceId, currentUser }) => {
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const data = await announcementApi.getAnnouncements(workspaceId, Number(teamId));
      
      // 안전장치: 응답이 배열인지 확인하고, 아니면 빈 배열로 설정
      if (Array.isArray(data)) {
        setAnnouncements(data);
      } else {
        console.warn('공지사항 응답이 배열이 아닙니다:', data);
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("공지사항 로딩 실패:", error);
      setAnnouncements([]); // 에러 발생 시 빈 배열로 설정
      // 사용자에게 에러 알림 처리 (예: 토스트 메시지)
    } finally {
      setIsLoading(false);
    }
  }, [teamId, workspaceId]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleAdd = async () => {
    if (newAnnouncementContent.trim()) {
      try {
        await announcementApi.createAnnouncement(workspaceId, {
          teamId: Number(teamId), // 수정: number 타입으로 다시 변환
          title: "새 공지", // 임시 제목 또는 제목 입력 필드 추가 필요
          content: newAnnouncementContent.trim(),
        });
        setNewAnnouncementContent("");
        setShowModal(false);
        await loadAnnouncements(); // 목록 새로고침
      } catch (error) {
        console.error("공지사항 추가 실패:", error);
        alert("공지사항 추가에 실패했습니다.");
      }
    }
  };

  const handleDelete = async (announcementId: string) => {
    // 수정: number -> string
    if (window.confirm("이 공지사항을 정말 삭제하시겠습니까?")) {
      try {
        await announcementApi.deleteAnnouncement(workspaceId, announcementId); // 수정: Number() 변환 제거
        await loadAnnouncements(); // 목록 새로고침
      } catch (error) {
        console.error("공지사항 삭제 실패:", error);
        alert("공지사항 삭제에 실패했습니다.");
      }
    }
  };

  return (
    <Card
      title="📢 팀 공지사항"
      actions={
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          leftIcon={<PlusCircleIcon />}
        >
          공지 추가
        </Button>
      }
    >
      {isLoading ? (
        <p>공지사항을 불러오는 중...</p>
      ) : !Array.isArray(announcements) || announcements.length === 0 ? (
        <p className="text-neutral-500">아직 공지사항이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((anno) => (
            <li
              key={anno.id}
              className="p-3 bg-primary-light/10 rounded-md shadow-sm group"
            >
              <div className="flex justify-between items-start">
                <div>
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
                {String(currentUser.id) === String(anno.accountId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(anno.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="공지 삭제"
                  >
                    <TrashIcon className="w-4 h-4 text-red-500" />
                  </Button>
                )}
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
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button onClick={handleAdd}>등록</Button>
          </div>
        }
      >
        <TextArea
          value={newAnnouncementContent}
          onChange={(e) => setNewAnnouncementContent(e.target.value)}
          placeholder="공지 내용을 입력하세요..."
          rows={4}
        />
      </Modal>
    </Card>
  );
};

export default TeamAnnouncementBoard;
