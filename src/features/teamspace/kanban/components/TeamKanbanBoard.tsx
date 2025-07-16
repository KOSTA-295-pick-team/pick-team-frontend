import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, TextArea, Input } from "@/components/ui";
import {
  PlusCircleIcon,
  TrashIcon,
  ChatBubbleIcon,
  CogIcon,
  XMarkIcon,
} from "@/assets/icons";
import { User } from "@/features/user/types/user";
import {
  KanbanBoard,
  KanbanCard as KanbanCardType,
  KanbanTaskUpdateRequest,
} from "@/features/teamspace/kanban/types/kanban";
import { kanbanApi } from "@/features/teamspace/kanban/api/kanbanApi";

// Sub-components
interface KanbanCardProps {
  card: KanbanCardType;
  onClick: () => void;
  onDragStart: (card: KanbanCardType, fromColumnId: string) => void;
  columnId: string;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  onClick,
  onDragStart,
  columnId,
}) => (
  <div
    draggable
    onDragStart={() => onDragStart(card, columnId)}
    onClick={onClick}
    className="bg-white p-3 rounded-md shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-neutral-200"
  >
    <h4 className="font-semibold text-neutral-800 mb-1">{card.title}</h4>
    <div className="flex items-center justify-between text-xs text-neutral-500">
      <div className="flex items-center space-x-2">
        {card.deadline && (
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
            {new Date(card.deadline).toLocaleDateString()}
          </span>
        )}
        {card.comments.length > 0 && (
          <span className="flex items-center space-x-1">
            <ChatBubbleIcon className="w-3 h-3" />
            <span>{card.comments.length}</span>
          </span>
        )}
      </div>
      {card.assignees.length > 0 && (
        <div className="flex -space-x-1">
          {card.assignees.slice(0, 3).map((assignee) => (
            <img
              key={assignee.id}
              src={
                assignee.profileImageUrl ||
                `https://i.pravatar.cc/150?u=${assignee.id}`
              }
              alt={assignee.name}
              className="w-6 h-6 rounded-full border-2 border-white"
            />
          ))}
          {card.assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-neutral-300 border-2 border-white flex items-center justify-center text-xs">
              +{card.assignees.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

// Trello 스타일 카드 상세 모달
interface TrelloStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: KanbanCardType | null;
  columnTitle: string;
  onUpdateCard: (cardId: string, updatedCard: KanbanTaskUpdateRequest) => void;
  onAddComment: (cardId: string, commentData: { content: string }) => void;
  onUpdateComment: (cardId: string, commentId: string, content: string) => void;
  onDeleteComment: (cardId: string, commentId: string) => void;
  onDeleteCard: (cardId: string) => void;
  currentUser: User;
  teamMembers: User[];
  loadBoard: () => Promise<void>;
}

const TrelloStyleModal: React.FC<TrelloStyleModalProps> = ({
  isOpen,
  onClose,
  card,
  columnTitle,
  onUpdateCard,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onDeleteCard,
  currentUser,
  teamMembers,
  loadBoard,
}) => {
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDeadline, setEditedDeadline] = useState<string>("");
  const [editedAssigneeIds, setEditedAssigneeIds] = useState<number[]>([]);
  const [newComment, setNewComment] = useState("");

  // 댓글 수정 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // 작업 완료 상태
  const [completionMessage, setCompletionMessage] = useState("");
  const [showCompletionRequest, setShowCompletionRequest] = useState(false);
  const [showCompletionApproval, setShowCompletionApproval] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

  // 댓글 페이징 상태
  const [currentCommentPage, setCurrentCommentPage] = useState(0);
  const [totalCommentPages, setTotalCommentPages] = useState(0);
  const [paginatedComments, setPaginatedComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showDeadlinePopover, setShowDeadlinePopover] = useState(false);
  const [showAssigneePopover, setShowAssigneePopover] = useState(false);

  const deadlineRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (card) {
      setEditedTitle(card.title);
      setEditedDescription(card.description || "");
      setEditedDeadline(card.deadline ? card.deadline.split("T")[0] : "");
      // assignees 데이터 처리 개선
      const assigneeIds = card.assignees
        .map((a) => {
          const id = typeof a.id === "string" ? parseInt(a.id) : a.id;
          return isNaN(id) ? 0 : id;
        })
        .filter((id) => id > 0);
      setEditedAssigneeIds(assigneeIds);

      // 댓글 페이징 초기화 및 첫 페이지 로드
      setCurrentCommentPage(0);
      loadComments(0);
    }
  }, [card]);

  // 댓글 페이징 로드
  const loadComments = async (page: number) => {
    if (!card) return;

    setIsLoadingComments(true);
    try {
      const response = await kanbanApi.getComments(card.id, page, 4);
      setPaginatedComments(response.content);
      setTotalCommentPages(response.totalPages);
      setCurrentCommentPage(page);
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  if (!isOpen || !card) return null;

  const handleSave = () => {
    onUpdateCard(card.id, {
      subject: editedTitle,
      content: editedDescription,
      deadline: editedDeadline
        ? new Date(editedDeadline).toISOString()
        : undefined,
      assigneeIds: editedAssigneeIds.map(String), // 문자열 배열로 변환
    });
  };

  // 댓글 추가
  const handleAddComment = async () => {
    if (newComment.trim()) {
      await onAddComment(card.id, { content: newComment });
      setNewComment("");
      // 댓글 추가 후 현재 페이지 다시 로드
      await loadComments(currentCommentPage);
    }
  };

  // 댓글 수정
  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!content.trim()) return;

    try {
      await onUpdateComment(card.id, commentId, content.trim());
      setEditingCommentId(null);
      setEditingCommentText("");
      // 댓글 수정 후 현재 페이지 다시 로드
      await loadComments(currentCommentPage);
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      alert("댓글 수정에 실패했습니다.");
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;

    try {
      await onDeleteComment(card.id, commentId);
      // 댓글 삭제 후 현재 페이지 다시 로드
      await loadComments(currentCommentPage);
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  // 작업 완료 요청
  const handleRequestCompletion = async () => {
    try {
      await kanbanApi.requestTaskCompletion(card.id, {
        message: completionMessage.trim() || undefined,
      });

      // 부모 컴포넌트의 보드 상태 업데이트 (이것이 selectedCard를 업데이트함)
      await loadBoard();

      setShowCompletionRequest(false);
      setCompletionMessage("");
      alert("작업 완료 요청이 전송되었습니다.");
    } catch (error) {
      console.error("작업 완료 요청 실패:", error);
      alert("작업 완료 요청에 실패했습니다.");
    }
  };

  // 작업 완료 승인/거부
  const handleApproveCompletion = async (approved: boolean) => {
    try {
      await kanbanApi.approveTaskCompletion(card.id, {
        approved,
        approvalMessage: approvalMessage.trim() || undefined,
      });

      // 전체 보드 상태 새로고침 (이것이 selectedCard를 업데이트함)
      await loadBoard();

      setShowCompletionApproval(false);
      setApprovalMessage("");
      alert(approved ? "작업이 승인되었습니다." : "작업이 거부되었습니다.");
    } catch (error) {
      console.error("작업 승인 처리 실패:", error);
      alert("작업 승인 처리에 실패했습니다.");
    }
  };

  const handleDelete = () => {
    onDeleteCard(card.id);
  };

  const toggleAssignee = (memberId: number) => {
    setEditedAssigneeIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[70vw] h-[70vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-neutral-200">
          <div></div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 h-full overflow-hidden">
          <div className="flex h-full max-w-none mx-auto">
            {" "}
            {/* 왼쪽: 카드 상세 정보 - 영역 확대 */}
            <div className="flex-[4] pr-8 overflow-y-auto">
              {/* 카드 제목 */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <span className="text-sm text-neutral-500 mr-2">
                    {columnTitle}에서
                  </span>
                </div>
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      handleSave();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingTitle(false);
                        handleSave();
                      }
                    }}
                    className="text-xl font-bold"
                  />
                ) : (
                  <h2
                    className="text-xl font-bold text-neutral-800 cursor-pointer hover:bg-neutral-100 p-2 rounded"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {editedTitle}
                  </h2>
                )}
              </div>

              {/* Trello 스타일 액션 버튼들 */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-3">
                  {/* 마감일 버튼 */}
                  <div className="relative" ref={deadlineRef}>
                    {editedDeadline ? (
                      <Button
                        size="md"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeadlinePopover(true);
                        }}
                        className="bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 flex items-center space-x-2 px-4 py-2.5"
                      >
                        <span>📅</span>
                        <span>
                          {new Date(editedDeadline).toLocaleDateString()}
                        </span>
                      </Button>
                    ) : (
                      <Button
                        size="md"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeadlinePopover(true);
                        }}
                        className="bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 flex items-center space-x-2 px-4 py-2.5"
                      >
                        <span>📅</span>
                        <span>Dates</span>
                      </Button>
                    )}
                  </div>

                  {/* 담당자 버튼 */}
                  <div className="relative" ref={assigneeRef}>
                    <Button
                      size="md"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAssigneePopover(true);
                      }}
                      className="bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 flex items-center space-x-2 px-4 py-2.5"
                    >
                      <span>👤</span>
                      <span>Members</span>
                      {editedAssigneeIds.length > 0 && (
                        <span className="bg-neutral-600 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                          {editedAssigneeIds.length}
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* 작업 완료 요청 버튼 */}
                  {!card.completionRequested && !card.isApproved && (
                    <Button
                      size="md"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCompletionRequest(true);
                      }}
                      className="bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 flex items-center space-x-2 px-4 py-2.5"
                    >
                      <span>✓</span>
                      <span>Complete</span>
                    </Button>
                  )}

                  {/* 삭제 버튼 */}
                  <Button
                    size="md"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("정말로 이 카드를 삭제하시겠습니까?")) {
                        handleDelete();
                      }
                    }}
                    className="bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 flex items-center space-x-2 px-4 py-2.5"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete</span>
                  </Button>
                </div>

                {/* 담당자 표시 */}
                {editedAssigneeIds.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">
                      담당자 ({editedAssigneeIds.length}명)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {editedAssigneeIds.map((assigneeId) => {
                        const member = teamMembers.find((m) => {
                          const memberAccountId = (m as any).accountId || m.id;
                          return memberAccountId === assigneeId;
                        });

                        return member ? (
                          <div
                            key={assigneeId}
                            className="flex items-center space-x-2 bg-white border border-neutral-200 px-3 py-1.5 rounded-lg shadow-sm"
                          >
                            <img
                              src={
                                member.profileImageUrl ||
                                `https://i.pravatar.cc/150?u=${member.id}`
                              }
                              alt={member.name}
                              className="w-6 h-6 rounded-full border border-neutral-200"
                            />
                            <span className="text-sm font-medium text-neutral-700">
                              {member.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAssignee(assigneeId);
                                handleSave();
                              }}
                              className="text-neutral-400 hover:text-neutral-600 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div
                            key={assigneeId}
                            className="flex items-center space-x-2 bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg"
                          >
                            <span className="text-sm text-red-600">
                              Unknown User (ID: {assigneeId})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 작업 상태 표시 */}
                {(() => {
                  if (card.isApproved) {
                    return (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-green-600 text-lg">✅</span>
                          <p className="text-sm font-medium text-green-800">
                            작업이 승인되었습니다
                          </p>
                        </div>
                      </div>
                    );
                  } else if (card.completionRequested) {
                    return (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <span className="text-amber-600 text-lg">⏳</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800 mb-1">
                              작업 완료 승인 대기 중
                            </p>
                            {card.completionRequestMessage && (
                              <p className="text-xs text-amber-700 mb-3 bg-amber-100 p-2 rounded">
                                "{card.completionRequestMessage}"
                              </p>
                            )}
                            <Button
                              size="sm"
                              onClick={() => setShowCompletionApproval(true)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              승인/거부
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return null;
                  }
                })()}
              </div>

              {/* 설명 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">설명</h3>
                {isEditingDescription ? (
                  <TextArea
                    ref={descriptionTextareaRef}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    onBlur={() => {
                      setIsEditingDescription(false);
                      handleSave();
                    }}
                    placeholder="이 카드에 대한 더 자세한 설명을 추가하세요..."
                    rows={4}
                  />
                ) : (
                  <div
                    className="min-h-[100px] p-3 bg-neutral-50 rounded cursor-pointer hover:bg-neutral-100"
                    onClick={() => setIsEditingDescription(true)}
                  >
                    {editedDescription ? (
                      <p className="whitespace-pre-wrap">{editedDescription}</p>
                    ) : (
                      <p className="text-neutral-500">
                        이 카드에 대한 더 자세한 설명을 추가하세요...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>{" "}
            {/* 오른쪽: 댓글 및 활동 - 영역 확대 */}
            <div className="w-[350px] pl-8 border-l border-neutral-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-3">활동</h3>

                {/* 댓글 작성 */}
                <div className="mb-4">
                  <div className="flex items-start space-x-2">
                    <img
                      src={
                        currentUser.profileImageUrl ||
                        `https://i.pravatar.cc/150?u=${currentUser.id}`
                      }
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <TextArea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글 작성..."
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <Button
                        size="md"
                        variant="outline"
                        onClick={handleAddComment}
                        className="mt-2 bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 px-3 py-1"
                        disabled={!newComment.trim()}
                      >
                        댓글 달기
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 댓글 목록 */}
                <div className="space-y-3">
                  {isLoadingComments ? (
                    <div className="flex justify-center py-4">
                      <span className="text-neutral-500">
                        댓글을 불러오는 중...
                      </span>
                    </div>
                  ) : (
                    paginatedComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-start space-x-2"
                      >
                        <img
                          src={
                            comment.authorName
                              ? `https://i.pravatar.cc/150?u=${comment.accountId}`
                              : `https://i.pravatar.cc/150?u=${comment.authorId}`
                          }
                          alt={comment.authorName || "Unknown"}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="bg-neutral-50 rounded p-3">
                            <div className="flex items-center justify-between mb-1 flex-nowrap">
                              <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
                                <span className="font-medium text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                                  {comment.authorName || "Unknown"}
                                </span>
                                <span className="text-xs text-neutral-500 whitespace-nowrap flex-shrink-0">
                                  {new Date(
                                    comment.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              {comment.accountId?.toString() ===
                                currentUser.id.toString() && (
                                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentText(comment.comment);
                                    }}
                                    className="text-xs text-neutral-500 hover:text-neutral-700 whitespace-nowrap px-1 py-0.5 rounded hover:bg-neutral-200 transition-colors"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(comment.id)
                                    }
                                    className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap px-1 py-0.5 rounded hover:bg-red-100 transition-colors"
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingCommentId === comment.id ? (
                              <div>
                                <TextArea
                                  value={editingCommentText}
                                  onChange={(e) =>
                                    setEditingCommentText(e.target.value)
                                  }
                                  rows={2}
                                  className="mb-2"
                                />
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleUpdateComment(
                                        comment.id,
                                        editingCommentText
                                      )
                                    }
                                  >
                                    저장
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText("");
                                    }}
                                  >
                                    취소
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm">{comment.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* 페이징 UI */}
                  {totalCommentPages > 1 && (
                    <div className="flex justify-center items-center space-x-1 pt-4">
                      <button
                        onClick={() => loadComments(currentCommentPage - 1)}
                        disabled={currentCommentPage === 0 || isLoadingComments}
                        className="px-2 py-1.5 text-xs bg-neutral-100 border border-neutral-300 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded flex-shrink-0"
                      >
                        이전
                      </button>

                      <div className="flex space-x-1 flex-shrink-0">
                        {(() => {
                          const maxVisiblePages = 3;
                          let startPage = Math.max(0, currentCommentPage - 1);
                          let endPage = Math.min(
                            totalCommentPages - 1,
                            startPage + maxVisiblePages - 1
                          );

                          // 끝에서부터 계산하여 시작 페이지 조정
                          if (endPage - startPage < maxVisiblePages - 1) {
                            startPage = Math.max(
                              0,
                              endPage - maxVisiblePages + 1
                            );
                          }

                          const pages = [];

                          // 첫 페이지가 보이지 않으면 첫 페이지와 ... 추가
                          if (startPage > 0) {
                            pages.push(
                              <button
                                key={0}
                                onClick={() => loadComments(0)}
                                disabled={isLoadingComments}
                                className="px-2 py-1.5 text-xs rounded border bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 flex-shrink-0"
                              >
                                1
                              </button>
                            );
                            if (startPage > 1) {
                              pages.push(
                                <span
                                  key="start-ellipsis"
                                  className="px-1 py-1.5 text-xs text-neutral-500 flex-shrink-0"
                                >
                                  ...
                                </span>
                              );
                            }
                          }

                          // 보이는 페이지들
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => loadComments(i)}
                                disabled={isLoadingComments}
                                className={`px-2 py-1.5 text-xs rounded border flex-shrink-0 ${
                                  currentCommentPage === i
                                    ? "bg-neutral-600 border-neutral-600 text-white"
                                    : "bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200"
                                }`}
                              >
                                {i + 1}
                              </button>
                            );
                          }

                          // 마지막 페이지가 보이지 않으면 ... 과 마지막 페이지 추가
                          if (endPage < totalCommentPages - 1) {
                            if (endPage < totalCommentPages - 2) {
                              pages.push(
                                <span
                                  key="end-ellipsis"
                                  className="px-1 py-1.5 text-xs text-neutral-500 flex-shrink-0"
                                >
                                  ...
                                </span>
                              );
                            }
                            pages.push(
                              <button
                                key={totalCommentPages - 1}
                                onClick={() =>
                                  loadComments(totalCommentPages - 1)
                                }
                                disabled={isLoadingComments}
                                className="px-2 py-1.5 text-xs rounded border bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200 flex-shrink-0"
                              >
                                {totalCommentPages}
                              </button>
                            );
                          }

                          return pages;
                        })()}
                      </div>

                      <button
                        onClick={() => loadComments(currentCommentPage + 1)}
                        disabled={
                          currentCommentPage >= totalCommentPages - 1 ||
                          isLoadingComments
                        }
                        className="px-2 py-1.5 text-xs bg-neutral-100 border border-neutral-300 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded flex-shrink-0"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 마감일 설정 팝오버 */}
          {showDeadlinePopover && (
            <div
              className="fixed inset-0 z-50"
              onClick={() => setShowDeadlinePopover(false)}
            >
              <div
                className="absolute bg-white p-4 rounded-lg shadow-xl border"
                style={{
                  top: deadlineRef.current?.getBoundingClientRect().bottom || 0,
                  left: deadlineRef.current?.getBoundingClientRect().left || 0,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="font-medium mb-3">마감일 설정</h4>
                <Input
                  type="date"
                  value={editedDeadline}
                  onChange={(e) => setEditedDeadline(e.target.value)}
                />
                <div className="flex justify-end mt-3 space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeadlinePopover(false)}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowDeadlinePopover(false);
                      handleSave();
                    }}
                  >
                    저장
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 담당자 선택 팝오버 */}
          {showAssigneePopover && (
            <div
              className="fixed inset-0 z-50"
              onClick={() => setShowAssigneePopover(false)}
            >
              <div
                className="absolute bg-white p-4 rounded-lg shadow-xl border max-h-64 overflow-y-auto min-w-[250px]"
                style={{
                  top: assigneeRef.current?.getBoundingClientRect().bottom || 0,
                  left: assigneeRef.current?.getBoundingClientRect().left || 0,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="font-medium mb-3">담당자 선택</h4>
                <div className="space-y-2">
                  {teamMembers.map((member) => {
                    // accountId가 있으면 사용하고, 없으면 id 사용 (백엔드 호환성)
                    const memberAccountId =
                      (member as any).accountId || member.id;
                    return (
                      <div
                        key={member.id}
                        onClick={() => {
                          toggleAssignee(memberAccountId);
                        }}
                        className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                          editedAssigneeIds.includes(memberAccountId)
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-neutral-50 border border-transparent"
                        }`}
                      >
                        <img
                          src={
                            member.profileImageUrl ||
                            `https://i.pravatar.cc/150?u=${member.id}`
                          }
                          alt={member.name}
                          className="w-8 h-8 rounded-full border border-neutral-200"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {member.name}
                          </span>
                        </div>
                        {editedAssigneeIds.includes(memberAccountId) && (
                          <span className="text-blue-500 text-sm font-medium">
                            ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-3 space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAssigneePopover(false)}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowAssigneePopover(false);
                      handleSave();
                    }}
                  >
                    저장
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 작업 완료 요청 모달 */}
          {showCompletionRequest && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">작업 완료 요청</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  이 작업이 완료되었음을 팀 리더에게 알리시겠습니까?
                </p>
                <TextArea
                  value={completionMessage}
                  onChange={(e) => setCompletionMessage(e.target.value)}
                  placeholder="완료 메시지를 입력하세요 (선택사항)"
                  rows={3}
                  className="mb-4"
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowCompletionRequest(false);
                      setCompletionMessage("");
                    }}
                  >
                    취소
                  </Button>
                  <Button onClick={handleRequestCompletion}>완료 요청</Button>
                </div>
              </div>
            </div>
          )}

          {/* 작업 완료 승인 모달 */}
          {showCompletionApproval && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">작업 완료 승인</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  이 작업의 완료를 승인하시겠습니까?
                </p>
                {card.completionRequestMessage && (
                  <div className="bg-neutral-50 p-3 rounded mb-4">
                    <p className="text-sm">
                      <strong>완료 요청 메시지:</strong>{" "}
                      {card.completionRequestMessage}
                    </p>
                  </div>
                )}
                <TextArea
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  placeholder="승인/거부 메시지를 입력하세요 (선택사항)"
                  rows={3}
                  className="mb-4"
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowCompletionApproval(false);
                      setApprovalMessage("");
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleApproveCompletion(false)}
                    className="text-red-600 hover:text-red-700"
                  >
                    거부
                  </Button>
                  <Button
                    onClick={() => handleApproveCompletion(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    승인
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 메인 컴포넌트
const TeamKanbanBoard: React.FC<{
  teamProjectId: string;
  currentUser: User;
  teamMembers: User[];
}> = ({ teamProjectId, currentUser, teamMembers }) => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [selectedColumnTitle, setSelectedColumnTitle] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddingCard, setIsAddingCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  // 칸반 리스트 추가 상태
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  // 칸반 리스트 수정 상태
  const [isEditingList, setIsEditingList] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState("");

  // 드래그 앤 드랍 상태
  const [draggedCard, setDraggedCard] = useState<KanbanCardType | null>(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState<string | null>(
    null
  );

  // 컬럼 메뉴 상태
  const [showColumnMenu, setShowColumnMenu] = useState<string | null>(null);

  // 보드 로드
  const loadBoard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const kanbanDto = await kanbanApi.getKanbanByTeamId(teamProjectId);

      // DTO를 프론트엔드 타입으로 변환
      const transformedBoard: KanbanBoard = {
        id: kanbanDto.id.toString(),
        teamId: kanbanDto.teamId.toString(),
        columns: kanbanDto.kanbanLists.map((list) => ({
          id: list.id.toString(),
          title: list.kanbanListName,
          cards: list.tasks.map((task) => ({
            id: task.id.toString(),
            title: task.subject,
            content: task.content,
            description: task.content,
            deadline: task.deadline,
            isApproved: task.isApproved,
            completionRequested: task.completionRequested,
            completionRequestMessage: task.completionRequestMessage,
            assignees: task.members.map((member) => ({
              id: member.accountId.toString(),
              userId: member.accountId.toString(),
              name: member.memberName,
              profileImageUrl: member.profileImage,
            })),
            comments: task.comments.map((comment) => ({
              id: comment.id.toString(),
              content: comment.comment,
              authorId: comment.accountId.toString(),
              authorName: comment.authorName,
              createdAt: comment.createdAt,
              author: {
                id: comment.accountId.toString(),
                name: comment.authorName,
                profileImageUrl: "",
              },
            })),
          })),
        })),
      };

      setBoard(transformedBoard);

      // 현재 선택된 카드가 있다면 업데이트된 정보로 교체
      if (selectedCard) {
        const updatedCard = transformedBoard.columns
          .flatMap((column) => column.cards)
          .find((card) => card.id === selectedCard.id);

        if (updatedCard) {
          setSelectedCard(updatedCard);
        }
      }
    } catch (error) {
      console.error("칸반 보드 로딩 실패:", error);
      setError("칸반 보드를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [teamProjectId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // 카드 상세 모달 열기
  const handleOpenCardDetail = (card: KanbanCardType, columnTitle: string) => {
    setSelectedCard(card);
    setSelectedColumnTitle(columnTitle);
    setIsDetailModalOpen(true);
  };

  // 카드 업데이트
  const handleUpdateCard = async (
    cardId: string,
    updatedCard: KanbanTaskUpdateRequest
  ) => {
    try {
      // API 요청 데이터 준비 및 검증
      const requestData: any = {};

      // 필수/변경된 필드만 추가
      if (updatedCard.subject !== undefined) {
        requestData.subject = updatedCard.subject;
      }

      if (updatedCard.content !== undefined) {
        requestData.content = updatedCard.content || ""; // 빈 문자열로 유지
      }

      if (updatedCard.deadline !== undefined) {
        if (updatedCard.deadline) {
          // deadline이 있는 경우, 날짜 형식 검증
          const deadlineDate = new Date(updatedCard.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            requestData.deadline = deadlineDate.toISOString();
          }
        } else {
          requestData.deadline = null; // 마감일 제거
        }
      }

      // kanbanListId 처리 - 카드 이동시에만 필요
      // 일반적인 카드 정보 업데이트에서는 kanbanListId를 제외

      // order 처리
      if (updatedCard.order !== undefined) {
        requestData.order = updatedCard.order;
      }

      // isApproved 처리
      if (updatedCard.isApproved !== undefined) {
        requestData.isApproved = updatedCard.isApproved;
      }

      // assigneeIds 처리 - 팀 멤버 검증 포함 및 에러 방지
      if (updatedCard.assigneeIds !== undefined) {
        // 빈 배열도 처리하도록 수정
        // 빈 배열인 경우 (모든 담당자 제거)
        if (updatedCard.assigneeIds.length === 0) {
          requestData.assigneeIds = [];
          console.log("Removing all assignees (empty array)");
        } else {
          // 담당자가 있는 경우
          // 팀 멤버들의 실제 ID 확인 및 매핑
          // User 타입이지만 실제로는 TeamMemberResponse일 수 있으므로 accountId도 확인
          const validTeamMemberIds = teamMembers
            .map((member) => {
              // accountId가 있으면 그것을 사용, 없으면 id 사용
              const memberId = (member as any).accountId || member.id;
              const parsedId = parseInt(memberId.toString());
              console.log("Team member detail:", {
                id: member.id,
                accountId: (member as any).accountId,
                name: member.name,
                finalId: memberId,
                parsedId: parsedId,
                type: typeof memberId,
              });
              return parsedId;
            })
            .filter((id) => !isNaN(id) && id > 0);

          const currentUserId = parseInt(currentUser.id.toString());
          const requestedIds = updatedCard.assigneeIds.map((id) =>
            parseInt(id)
          );

          // 현재 사용자 ID도 유효한 팀 멤버인지 확인
          if (!validTeamMemberIds.includes(currentUserId)) {
            console.warn(
              "Current user not found in team members, adding to valid IDs"
            );
            validTeamMemberIds.push(currentUserId);
          }

          const validAssigneeIds = requestedIds.filter(
            (id) => !isNaN(id) && id > 0 && validTeamMemberIds.includes(id)
          );

          // 디버깅: 팀 멤버 ID와 할당하려는 ID 확인
          console.log("Current user ID:", currentUserId);
          console.log(
            "Team members raw data:",
            teamMembers.map((m) => ({
              id: m.id,
              accountId: (m as any).accountId,
              name: m.name,
              email: m.email,
            }))
          );
          console.log("Valid team member IDs:", validTeamMemberIds);
          console.log("Requested assignee IDs:", requestedIds);
          console.log("Final valid assignee IDs:", validAssigneeIds);

          // 유효한 assignee가 있을 때만 요청에 포함
          if (validAssigneeIds.length > 0) {
            requestData.assigneeIds = validAssigneeIds;
          } else {
            console.error("No valid assignee IDs found!");
            console.error(
              "This indicates a serious data synchronization issue"
            );
            console.error("Requested IDs:", requestedIds);
            console.error("Available team member IDs:", validTeamMemberIds);

            // 에러 상황에서는 assigneeIds 업데이트를 건너뛰고 기존 담당자 유지
            console.warn("Skipping assigneeIds update to prevent server error");
            // requestData에 assigneeIds를 포함하지 않음
          }

          // 유효하지 않은 ID가 있으면 경고 표시
          const invalidIds = requestedIds.filter(
            (id) => !validTeamMemberIds.includes(id)
          );
          if (invalidIds.length > 0) {
            console.error("Invalid assignee IDs detected:", invalidIds);
            console.error("This might indicate a data synchronization issue");
            // 사용자에게 알림
            alert(
              `일부 담당자 정보를 찾을 수 없습니다. (ID: ${invalidIds.join(
                ", "
              )})\n현재 유효한 담당자로만 업데이트됩니다.`
            );
          }
        }
      }

      // 디버깅을 위한 로그
      console.log("Updating card with data:", requestData);
      console.log("assigneeIds details:", requestData.assigneeIds);
      console.log(
        "assigneeIds type check:",
        requestData.assigneeIds?.map((id: any) => ({
          id,
          type: typeof id,
          isValid: !isNaN(id) && id > 0,
        }))
      );

      const updatedTaskDto = await kanbanApi.updateTask(cardId, requestData);

      // 로컬 상태 즉시 업데이트
      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;

        const updatedColumns = prevBoard.columns.map((column) => ({
          ...column,
          cards: column.cards.map((card) => {
            if (card.id === cardId) {
              return {
                ...card,
                title: updatedTaskDto.subject,
                content: updatedTaskDto.content,
                description: updatedTaskDto.content,
                deadline: updatedTaskDto.deadline,
                assignees: updatedTaskDto.members.map((member) => ({
                  id: member.accountId.toString(),
                  userId: member.accountId.toString(),
                  name: member.memberName,
                  profileImageUrl: member.profileImage,
                })),
              };
            }
            return card;
          }),
        }));

        return { ...prevBoard, columns: updatedColumns };
      });

      // 선택된 카드도 업데이트
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard({
          ...selectedCard,
          title: updatedTaskDto.subject,
          content: updatedTaskDto.content,
          description: updatedTaskDto.content,
          deadline: updatedTaskDto.deadline,
          assignees: updatedTaskDto.members.map((member) => ({
            id: member.accountId.toString(),
            userId: member.accountId.toString(),
            name: member.memberName,
            profileImageUrl: member.profileImage,
          })),
        });
      }
    } catch (error: any) {
      console.error("태스크 업데이트 실패:", error);

      // 더 구체적인 에러 메시지 제공
      let errorMessage = "태스크 업데이트에 실패했습니다.";
      if (error.message) {
        if (error.message.includes("500")) {
          errorMessage +=
            " 서버 내부 오류가 발생했습니다. 입력한 정보를 다시 확인해주세요.";
        } else if (error.message.includes("400")) {
          errorMessage += " 입력한 정보가 올바르지 않습니다.";
        } else if (error.message.includes("404")) {
          errorMessage += " 해당 태스크를 찾을 수 없습니다.";
        }
      }

      alert(errorMessage);
    }
  };

  // 댓글 추가
  const handleAddComment = async (
    cardId: string,
    commentData: { content: string }
  ) => {
    try {
      const newCommentDto = await kanbanApi.createComment(cardId, {
        comment: commentData.content,
      });

      // 로컬 상태 업데이트 (실시간 반영)
      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;

        const updatedColumns = prevBoard.columns.map((column) => ({
          ...column,
          cards: column.cards.map((card) => {
            if (card.id === cardId) {
              const newComment = {
                id: newCommentDto.id.toString(),
                content: newCommentDto.comment,
                authorId: newCommentDto.accountId.toString(),
                authorName: newCommentDto.authorName,
                createdAt: newCommentDto.createdAt,
                author: {
                  id: newCommentDto.accountId.toString(),
                  name: newCommentDto.authorName,
                  profileImageUrl: "",
                },
              };

              return {
                ...card,
                comments: [...card.comments, newComment],
              };
            }
            return card;
          }),
        }));

        return { ...prevBoard, columns: updatedColumns };
      });

      // 선택된 카드도 업데이트
      if (selectedCard && selectedCard.id === cardId) {
        const newComment = {
          id: newCommentDto.id.toString(),
          content: newCommentDto.comment,
          authorId: newCommentDto.accountId.toString(),
          authorName: newCommentDto.authorName,
          createdAt: newCommentDto.createdAt,
          author: {
            id: newCommentDto.accountId.toString(),
            name: newCommentDto.authorName,
            profileImageUrl: "",
          },
        };

        setSelectedCard((prev) =>
          prev
            ? {
                ...prev,
                comments: [...prev.comments, newComment],
              }
            : null
        );
      }
    } catch (error) {
      console.error("댓글 추가 실패:", error);
      alert("댓글 추가에 실패했습니다.");
    }
  };

  // 댓글 수정
  const handleUpdateComment = async (
    cardId: string,
    commentId: string,
    content: string
  ) => {
    try {
      const updatedCommentDto = await kanbanApi.updateComment(
        cardId,
        commentId,
        {
          comment: content,
        }
      );

      // 로컬 상태 업데이트 (실시간 반영)
      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;

        const updatedColumns = prevBoard.columns.map((column) => ({
          ...column,
          cards: column.cards.map((card) => {
            if (card.id === cardId) {
              return {
                ...card,
                comments: card.comments.map((comment) =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        content: updatedCommentDto.comment,
                      }
                    : comment
                ),
              };
            }
            return card;
          }),
        }));

        return { ...prevBoard, columns: updatedColumns };
      });

      // 선택된 카드도 업데이트
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map((comment) =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        content: updatedCommentDto.comment,
                      }
                    : comment
                ),
              }
            : null
        );
      }
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      alert("댓글 수정에 실패했습니다.");
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (cardId: string, commentId: string) => {
    try {
      await kanbanApi.deleteComment(cardId, commentId);

      // 로컬 상태 업데이트 (실시간 반영)
      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;

        const updatedColumns = prevBoard.columns.map((column) => ({
          ...column,
          cards: column.cards.map((card) => {
            if (card.id === cardId) {
              return {
                ...card,
                comments: card.comments.filter(
                  (comment) => comment.id !== commentId
                ),
              };
            }
            return card;
          }),
        }));

        return { ...prevBoard, columns: updatedColumns };
      });

      // 선택된 카드도 업데이트
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.filter(
                  (comment) => comment.id !== commentId
                ),
              }
            : null
        );
      }
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  // 카드 삭제
  const handleDeleteCard = async (cardId: string) => {
    try {
      await kanbanApi.deleteTask(cardId);
      await loadBoard(); // 보드 새로고침
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error("태스크 삭제 실패:", error);
      alert("태스크 삭제에 실패했습니다.");
    }
  };

  // 카드 생성 (제목만)
  const handleCreateCard = async (columnId: string, title: string) => {
    if (!title.trim()) return;

    try {
      await kanbanApi.createTask({
        subject: title.trim(),
        content: "",
        kanbanListId: parseInt(columnId),
        order: 0,
      });

      await loadBoard(); // 보드 새로고침
      setNewCardTitle("");
      setIsAddingCard(null);
    } catch (error) {
      console.error("카드 생성 실패:", error);
      alert("카드 생성에 실패했습니다.");
    }
  };

  // 칸반 리스트 생성
  const handleCreateList = async (title: string) => {
    if (!title.trim() || !board) return;

    try {
      await kanbanApi.createKanbanList({
        kanbanListName: title.trim(),
        kanbanId: parseInt(board.id),
        order: board.columns.length,
      });

      await loadBoard(); // 보드 새로고침
      setNewListTitle("");
      setIsAddingList(false);
    } catch (error) {
      console.error("리스트 생성 실패:", error);
      alert("리스트 생성에 실패했습니다.");
    }
  };

  // 칸반 리스트 수정
  const handleUpdateList = async (listId: string, title: string) => {
    if (!title.trim()) return;

    try {
      await kanbanApi.updateKanbanList(listId, {
        kanbanListName: title.trim(),
      });

      await loadBoard(); // 보드 새로고침
      setIsEditingList(null);
      setEditingListTitle("");
    } catch (error) {
      console.error("리스트 수정 실패:", error);
      alert("리스트 수정에 실패했습니다.");
    }
  };

  // 칸반 리스트 삭제
  const handleDeleteList = async (listId: string) => {
    if (
      !confirm(
        "이 리스트를 삭제하시겠습니까? 리스트 안의 모든 카드도 함께 삭제됩니다."
      )
    ) {
      return;
    }

    try {
      await kanbanApi.deleteKanbanList(listId);
      await loadBoard(); // 보드 새로고침
    } catch (error) {
      console.error("리스트 삭제 실패:", error);
      alert("리스트 삭제에 실패했습니다.");
    }
  };

  // 드래그 앤 드랍 핸들러들
  const handleDragStart = (card: KanbanCardType, fromColumnId: string) => {
    setDraggedCard(card);
    setDraggedFromColumn(fromColumnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();

    if (
      !draggedCard ||
      !draggedFromColumn ||
      draggedFromColumn === toColumnId
    ) {
      setDraggedCard(null);
      setDraggedFromColumn(null);
      return;
    }

    try {
      // 백엔드 API 호출로 카드의 컬럼 변경
      await kanbanApi.updateTask(draggedCard.id, {
        kanbanListId: parseInt(toColumnId),
      });

      await loadBoard(); // 보드 새로고침
    } catch (error) {
      console.error("카드 이동 실패:", error);
      alert("카드 이동에 실패했습니다.");
    } finally {
      setDraggedCard(null);
      setDraggedFromColumn(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={loadBoard} className="mt-2">
          다시 시도
        </Button>
      </div>
    );
  }

  // 안전한 columns 접근을 위한 기본값 설정
  const safeColumns = Array.isArray(board?.columns) ? board.columns : [];

  return (
    <div className="flex flex-col h-full">
      {/* Board Header */}
      <div className="p-4 bg-white/50 backdrop-blur-sm rounded-t-lg">
        <h2 className="text-xl font-bold text-neutral-800">📌 칸반 보드</h2>
      </div>

      {/* Board Columns */}
      <div className="flex-grow p-4 overflow-x-auto">
        <div className="flex space-x-4">
          {safeColumns.map((column) => (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="w-72 bg-neutral-100 rounded-lg shadow-md flex-shrink-0"
            >
              {/* Trello 스타일 헤더 */}
              <div className="flex items-center justify-between p-3 border-b">
                {isEditingList === column.id ? (
                  <Input
                    value={editingListTitle}
                    onChange={(e) => setEditingListTitle(e.target.value)}
                    onBlur={() => {
                      if (editingListTitle.trim()) {
                        handleUpdateList(column.id, editingListTitle);
                      } else {
                        setIsEditingList(null);
                        setEditingListTitle("");
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateList(column.id, editingListTitle);
                      }
                    }}
                    className="font-semibold text-neutral-700"
                    autoFocus
                  />
                ) : (
                  <h3
                    className="font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-200 px-2 py-1 rounded"
                    onClick={() => {
                      setIsEditingList(column.id);
                      setEditingListTitle(column.title);
                    }}
                  >
                    {column.title}
                  </h3>
                )}
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowColumnMenu(
                        showColumnMenu === column.id ? null : column.id
                      )
                    }
                    className="p-1 rounded hover:bg-neutral-200 transition-colors"
                  >
                    <CogIcon className="w-4 h-4 text-neutral-600" />
                  </button>
                  {showColumnMenu === column.id && (
                    <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-2 z-10 min-w-[150px]">
                      <button
                        onClick={() => {
                          setIsAddingCard(column.id);
                          setShowColumnMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-sm"
                      >
                        카드 추가
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingList(column.id);
                          setEditingListTitle(column.title);
                          setShowColumnMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-sm"
                      >
                        리스트 수정
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteList(column.id);
                          setShowColumnMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-sm text-red-600"
                      >
                        리스트 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2 space-y-2">
                {(column.cards || []).map((card) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    onClick={() => handleOpenCardDetail(card, column.title)}
                    onDragStart={handleDragStart}
                    columnId={column.id}
                  />
                ))}

                {/* 카드 추가 UI */}
                {isAddingCard === column.id ? (
                  <div className="p-2">
                    <Input
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      placeholder="카드 제목을 입력하세요..."
                      className="mb-2"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleCreateCard(column.id, newCardTitle);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleCreateCard(column.id, newCardTitle)
                        }
                      >
                        카드 추가
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingCard(null);
                          setNewCardTitle("");
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCard(column.id)}
                    className="w-full p-2 m-2 text-left text-neutral-600 hover:bg-neutral-200 rounded transition-colors"
                  >
                    + 카드 추가
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add another list - Trello 스타일 */}
          {isAddingList ? (
            <div className="w-72 bg-neutral-100 rounded-lg shadow-md flex-shrink-0 p-3">
              <Input
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="리스트 제목을 입력하세요..."
                className="mb-2"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCreateList(newListTitle);
                  }
                }}
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleCreateList(newListTitle)}
                  disabled={!newListTitle.trim()}
                >
                  리스트 추가
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListTitle("");
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingList(true)}
              className="w-72 bg-neutral-50 hover:bg-neutral-100 rounded-lg shadow-md flex-shrink-0 p-4 text-neutral-600 border-2 border-dashed border-neutral-300 hover:border-neutral-400 transition-all duration-200 flex items-center justify-center"
            >
              <PlusCircleIcon className="w-5 h-5 mr-2" />
              Add another list
            </button>
          )}
        </div>
      </div>

      {/* Trello 스타일 카드 상세 모달 */}
      {isDetailModalOpen && selectedCard && (
        <TrelloStyleModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedCard(null);
          }}
          card={selectedCard}
          columnTitle={selectedColumnTitle}
          onUpdateCard={handleUpdateCard}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onDeleteCard={handleDeleteCard}
          currentUser={currentUser}
          teamMembers={teamMembers}
          loadBoard={loadBoard}
        />
      )}
    </div>
  );
};

export default TeamKanbanBoard;
