import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Modal,
  TextArea,
  Input,
  Pagination,
} from "@/components/ui";
import {
  PlusCircleIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
} from "@/assets/icons";
import {
  User,
  BulletinPost,
  BulletinComment,
  BulletinAttachment,
} from "@/types";
import {
  fetchPosts,
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
  deletePost,
  createPostWithFiles,
  updatePostWithFiles,
} from "@/features/teamspace/bulletin/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface CommentItemProps {
  comment: BulletinComment;
  currentUser: User;
  onUpdate: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUser,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleUpdate = async () => {
    if (editContent.trim() && editContent !== comment.content) {
      await onUpdate(comment.id, editContent.trim());
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("이 댓글을 정말 삭제하시겠습니까?")) {
      await onDelete(comment.id);
    }
  };

  const isOwner = Number(currentUser.id) === comment.authorId;

  return (
    <div className="text-xs p-3 bg-neutral-100 rounded border">
      {isEditing ? (
        <div className="space-y-2">
          <TextArea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpdate} variant="primary">
              수정
            </Button>
            <Button
              size="sm"
              onClick={() => setIsEditing(false)}
              variant="ghost"
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-neutral-800 whitespace-pre-line mb-2">
            {comment.content}
          </p>
          <div className="flex justify-between items-center">
            <p className="text-neutral-500">
              - {comment.authorName} (
              {new Date(comment.createdAt).toLocaleString()})
            </p>
            {isOwner && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                >
                  수정
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-red-600"
                >
                  삭제
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// 이미지 미리보기 모달 컴포넌트
interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  fileId: number;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  fileId,
}) => {
  const handleDownload = async () => {
    try {
      const { bulletinApi } = await import(
        "@/features/teamspace/bulletin/api/bulletinApi"
      );
      await bulletinApi.downloadAttachment(fileId);
    } catch (error) {
      console.error("파일 다운로드 실패:", error);
      alert("파일 다운로드에 실패했습니다.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileName}
      footer={
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="primary">
            다운로드
          </Button>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div className="flex justify-center items-center max-h-[70vh]">
        <img
          src={imageUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded"
          onError={() => {
            console.error("이미지 로드 실패");
          }}
        />
      </div>
    </Modal>
  );
};

interface BulletinPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BulletinPost | null;
  currentUser: User;
}

const BulletinPostDetailModal: React.FC<BulletinPostDetailModalProps> = ({
  isOpen,
  onClose,
  post,
  currentUser,
}) => {
  const dispatch = useAppDispatch();
  const { comments, commentCurrentPage, commentTotalPages, loading } =
    useAppSelector((state) => state.bulletin);
  const [newCommentText, setNewCommentText] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({ title: "", content: "" });
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<{
    isOpen: boolean;
    url: string;
    fileName: string;
    fileId: number;
  }>({ isOpen: false, url: "", fileName: "", fileId: 0 });

  // 댓글 로드
  useEffect(() => {
    if (isOpen && post) {
      dispatch(fetchComments({ postId: post.id, page: 0, size: 10 }));
    }
  }, [isOpen, post, dispatch]);

  // 편집 모드 초기화
  useEffect(() => {
    if (post && isEditMode) {
      setEditData({ title: post.title, content: post.content });
      setEditFiles([]);
    }
  }, [post, isEditMode]);

  if (!isOpen || !post) return null;

  const handleAddComment = async () => {
    if (newCommentText.trim()) {
      await dispatch(
        createComment({
          postId: post.id,
          content: newCommentText.trim(),
          accountId: String(currentUser.id),
        })
      );
      setNewCommentText("");
    }
  };

  const handleUpdateComment = async (commentId: number, content: string) => {
    await dispatch(
      updateComment({
        commentId,
        content,
        accountId: String(currentUser.id),
      })
    );
  };

  const handleDeleteComment = async (commentId: number) => {
    await dispatch(
      deleteComment({
        commentId,
        accountId: String(currentUser.id),
      })
    );
  };

  const handleDeletePost = async () => {
    if (window.confirm("이 게시글을 정말 삭제하시겠습니까?")) {
      await dispatch(
        deletePost({ postId: post.id, accountId: String(currentUser.id) })
      );
      onClose();
    }
  };

  const handleUpdatePost = async () => {
    if (!editData.title.trim() || !editData.content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("boardId", post.boardId);
    formData.append("title", editData.title);
    formData.append("content", editData.content);

    editFiles.forEach((file) => {
      formData.append("files", file);
    });

    await dispatch(
      updatePostWithFiles({
        postId: post.id,
        accountId: String(currentUser.id),
        post: { title: editData.title, content: editData.content },
        files: editFiles,
      })
    );

    setIsEditMode(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEditFiles(Array.from(e.target.files));
    }
  };

  const handleCommentPageChange = (page: number) => {
    dispatch(fetchComments({ postId: post.id, page, size: 10 }));
  };

  const handleDeleteAttachment = async (
    postId: number,
    attachmentId: number // string에서 number로 변경
  ) => {
    if (!confirm("첨부파일을 삭제하시겠습니까?")) {
      return;
    }

    try {
      // bulletinApi를 사용하여 첨부파일 삭제
      const { bulletinApi } = await import(
        "@/features/teamspace/bulletin/api/bulletinApi"
      );
      await bulletinApi.deleteAttachment(
        postId,
        attachmentId,
        String(currentUser.id)
      );

      // 게시글 정보 다시 조회하여 첨부파일 목록 업데이트
      window.location.reload(); // 임시로 페이지 새로고침, 나중에 상태 업데이트로 개선 가능
    } catch (error) {
      console.error("첨부파일 삭제 실패:", error);
      alert("첨부파일 삭제에 실패했습니다.");
    }
  };

  const isOwner = Number(currentUser.id) === post.authorId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "게시글 수정" : post.title}
      footer={
        <div className="flex justify-between w-full">
          {isEditMode ? (
            <div className="flex gap-2">
              <Button onClick={handleUpdatePost} disabled={loading}>
                수정 완료
              </Button>
              <Button variant="ghost" onClick={() => setIsEditMode(false)}>
                취소
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {isOwner && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(true)}
                      size="sm"
                    >
                      게시글 수정
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDeletePost}
                      size="sm"
                    >
                      게시글 삭제
                    </Button>
                  </>
                )}
              </div>
              <Button variant="ghost" onClick={onClose} className="ml-auto">
                닫기
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {isEditMode ? (
          <div className="space-y-4">
            <Input
              label="제목"
              value={editData.title}
              onChange={(e) =>
                setEditData((prev) => ({ ...prev, title: e.target.value }))
              }
            />
            <TextArea
              label="내용"
              value={editData.content}
              onChange={(e) =>
                setEditData((prev) => ({ ...prev, content: e.target.value }))
              }
              rows={10}
            />
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                파일 첨부
              </label>

              {/* 파일 선택 영역 */}
              <div className="relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="edit-file-upload"
                />
                <label
                  htmlFor="edit-file-upload"
                  className="flex items-center justify-center w-full h-12 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <PhotoIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    파일을 선택하거나 드래그하세요
                  </span>
                </label>
              </div>

              {/* 선택된 파일 목록 */}
              {editFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    선택된 파일 ({editFiles.length}개)
                  </p>
                  <div className="space-y-2">
                    {editFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center space-x-3">
                          <PhotoIcon className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setEditFiles((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="파일 제거"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="pb-2 border-b">
              <p className="text-xs text-neutral-500">
                작성자: {post.authorName} | 작성일:{" "}
                {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-line">
              {post.content}
            </div>

            {post.attachments && post.attachments.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <PhotoIcon className="w-4 h-4 mr-2 text-gray-500" />
                  첨부파일 ({post.attachments.length}개)
                </h5>
                <div className="space-y-2">
                  {post.attachments.map((att: BulletinAttachment) => {
                    const handleFileClick = async () => {
                      try {
                        const { bulletinApi } = await import(
                          "@/features/teamspace/bulletin/api/bulletinApi"
                        );

                        // 이미지 파일인지 확인
                        if (bulletinApi.isImageFile(att.fileName)) {
                          // 이미지 파일이면 미리보기 모달 표시
                          const imageUrl = await bulletinApi.getImageBlobUrl(
                            att.id
                          );
                          setImagePreview({
                            isOpen: true,
                            url: imageUrl,
                            fileName: att.fileName,
                            fileId: att.id,
                          });
                        } else {
                          // 이미지가 아니면 다운로드
                          bulletinApi.downloadAttachment(att.id);
                        }
                      } catch (error) {
                        console.error("파일 처리 실패:", error);
                        alert("파일을 불러오는데 실패했습니다.");
                      }
                    };

                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center space-x-3">
                          <PhotoIcon className="w-4 h-4 text-gray-400" />
                          <div>
                            <button
                              onClick={handleFileClick}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                            >
                              {att.fileName}
                            </button>
                            <p className="text-xs text-gray-500">
                              {att.fileName.match(
                                /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i
                              )
                                ? "클릭하여 미리보기"
                                : "클릭하여 다운로드"}
                            </p>
                          </div>
                        </div>
                        {/* 파일 삭제 버튼 (작성자만 표시) */}
                        {currentUser.id === post.authorId && (
                          <button
                            onClick={() =>
                              handleDeleteAttachment(post.id, att.id)
                            }
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="첨부파일 삭제"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="text-md font-semibold text-neutral-700 mb-2">
                댓글 ({comments.length})
              </h4>
              <div className="space-y-3 mb-3">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUser={currentUser}
                      onUpdate={handleUpdateComment}
                      onDelete={handleDeleteComment}
                    />
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic">
                    댓글이 없습니다.
                  </p>
                )}
              </div>

              {commentTotalPages > 1 && (
                <div className="mb-3">
                  <Pagination
                    currentPage={commentCurrentPage}
                    totalPages={commentTotalPages}
                    totalElements={0}
                    pageSize={10}
                    hasNext={commentCurrentPage < commentTotalPages - 1}
                    hasPrevious={commentCurrentPage > 0}
                    onPageChange={handleCommentPageChange}
                  />
                </div>
              )}

              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <TextArea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <Button
                  onClick={handleAddComment}
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={loading}
                >
                  댓글 작성
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 이미지 미리보기 모달 */}
      <ImagePreviewModal
        isOpen={imagePreview.isOpen}
        onClose={() => {
          setImagePreview({ isOpen: false, url: "", fileName: "", fileId: 0 });
          // Blob URL 정리
          if (imagePreview.url) {
            window.URL.revokeObjectURL(imagePreview.url);
          }
        }}
        imageUrl={imagePreview.url}
        fileName={imagePreview.fileName}
        fileId={imagePreview.fileId}
      />
    </Modal>
  );
};

interface PostCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamProjectId: string;
  boardId: number;
  currentUser: User;
  onSuccess: () => void;
}

const PostCreateModal: React.FC<PostCreateModalProps> = ({
  isOpen,
  onClose,
  teamProjectId,
  boardId,
  currentUser,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.bulletin);
  const [postData, setPostData] = useState({ title: "", content: "" });
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPostData({ title: "", content: "" });
      setFiles([]);
    }
  }, [isOpen]);

  const handleCreatePost = async () => {
    if (!postData.title.trim() || !postData.content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("boardId", String(boardId));
    formData.append("title", postData.title);
    formData.append("content", postData.content);

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      await dispatch(
        createPostWithFiles({
          teamId: teamProjectId,
          accountId: String(currentUser.id),
          post: {
            title: postData.title,
            content: postData.content,
            boardId: boardId,
          },
          files: files,
        })
      );

      // 성공 시에만 폼 초기화 및 모달 닫기
      setPostData({ title: "", content: "" });
      setFiles([]);
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error("게시글 생성 실패:", error);
      if (error.message && error.message.includes("400")) {
        alert("게시글 생성에 실패했습니다. 게시판 설정을 확인해주세요.");
      } else {
        alert("게시글 생성에 실패했습니다.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="새 게시글 작성"
      footer={
        <div className="flex gap-2">
          <Button onClick={handleCreatePost} disabled={loading}>
            작성 완료
          </Button>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="제목"
          value={postData.title}
          onChange={(e) =>
            setPostData((prev) => ({ ...prev, title: e.target.value }))
          }
        />
        <TextArea
          label="내용"
          value={postData.content}
          onChange={(e) =>
            setPostData((prev) => ({ ...prev, content: e.target.value }))
          }
          rows={10}
        />
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            파일 첨부
          </label>

          {/* 파일 선택 영역 */}
          <div className="relative">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="create-file-upload"
            />
            <label
              htmlFor="create-file-upload"
              className="flex items-center justify-center w-full h-12 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <PhotoIcon className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">
                파일을 선택하거나 드래그하세요
              </span>
            </label>
          </div>

          {/* 선택된 파일 목록 */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                선택된 파일 ({files.length}개)
              </p>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <PhotoIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="파일 제거"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const TeamBulletinBoard: React.FC<{
  teamProjectId: string;
  boardId: number;
  currentUser: User;
}> = ({ teamProjectId, boardId, currentUser }) => {
  const dispatch = useAppDispatch();
  const {
    posts,
    currentPost,
    loading,
    currentPage,
    totalPages,
    pageSize,
    totalElements,
    hasNext,
    hasPrevious,
  } = useAppSelector((state) => state.bulletin);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 게시글 목록 로드
  useEffect(() => {
    dispatch(
      fetchPosts({
        teamId: teamProjectId,
        boardId,
        page: currentPage,
        size: pageSize,
      })
    );
  }, [dispatch, teamProjectId, boardId, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    dispatch(
      fetchPosts({
        teamId: teamProjectId,
        boardId,
        page,
        size: pageSize,
      })
    );
  };

  const handleOpenPostDetail = (post: BulletinPost) => {
    // Redux 상태에 현재 게시글 설정
    dispatch({ type: "bulletin/setCurrentPost", payload: post });
    setIsDetailModalOpen(true);
  };

  const handleCreateSuccess = () => {
    // 첫 페이지로 이동하여 새 게시글 확인
    dispatch(
      fetchPosts({
        teamId: teamProjectId,
        boardId,
        page: 0,
        size: pageSize,
      })
    );
  };

  const handleDeletePost = async (postId: number) => {
    if (window.confirm("이 게시글을 정말 삭제하시겠습니까?")) {
      await dispatch(deletePost({ postId, accountId: String(currentUser.id) }));
    }
  };

  return (
    <Card
      title="📋 게시판"
      actions={
        <Button
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<PlusCircleIcon />}
        >
          새 글 작성
        </Button>
      }
    >
      <div className="space-y-4">
        {loading && posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">게시글을 불러오는 중...</p>
          </div>
        ) : posts.length > 0 ? (
          <>
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
                      <p className="text-xs text-neutral-600 truncate max-w-md mt-1">
                        {post.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-neutral-500">
                            {post.authorName} •{" "}
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                          {post.attachments && post.attachments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <PhotoIcon className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {post.attachments.length}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {Number(currentUser.id) === post.authorId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post.id);
                        }}
                      >
                        <TrashIcon className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  pageSize={pageSize}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">게시글이 없습니다.</p>
          </div>
        )}
      </div>

      <PostCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        teamProjectId={teamProjectId}
        boardId={boardId}
        currentUser={currentUser}
        onSuccess={handleCreateSuccess}
      />

      <BulletinPostDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        post={currentPost}
        currentUser={currentUser}
      />
    </Card>
  );
};

export default TeamBulletinBoard;
