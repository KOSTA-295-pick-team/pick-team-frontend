import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Modal, TextArea, Input } from '@/components/ui';
import { PlusCircleIcon, TrashIcon } from '@/assets/icons';
import { User, BulletinPost, BulletinComment, BulletinAttachment, PostResponse } from '@/types';
import { CommentResponse } from '@/features/teamspace/bulletin/types/board';
import { bulletinApi, PostCreateRequest } from '@/features/teamspace/bulletin/api/bulletinApi';

interface BulletinPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BulletinPost | null;
  onAddComment: (postId: number, commentText: string) => Promise<void>;
  onDeletePost: (postId: number) => Promise<void>;
  currentUser: User;
}

const BulletinPostDetailModal: React.FC<BulletinPostDetailModalProps> = ({
  isOpen, onClose, post, onAddComment, onDeletePost, currentUser
}) => {
  const [newCommentText, setNewCommentText] = useState('');

  if (!isOpen || !post) return null;

  const handleAddComment = async () => {
    if (newCommentText.trim()) {
      await onAddComment(post.id, newCommentText.trim());
      setNewCommentText('');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("이 게시글을 정말 삭제하시겠습니까?")) {
        await onDeletePost(post.id);
        onClose(); 
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={post.title}
      footer={
        <div className="flex justify-between w-full">
            {(Number(currentUser.id) === post.authorId) && 
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
              {post.attachments.map((att: BulletinAttachment) => (
                <li key={att.id}><a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{att.fileName}</a></li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-md font-semibold text-neutral-700 mb-2">댓글 ({post.comments?.length || 0})</h4>
          <div className="space-y-3 mb-3">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment: BulletinComment) => (
                <div key={comment.id} className="text-xs p-2 bg-neutral-100 rounded">
                  <p className="text-neutral-800 whitespace-pre-line">{comment.content}</p>
                  <p className="text-neutral-500 mt-1">- {comment.authorName} ({new Date(comment.createdAt).toLocaleString()})</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic">댓글이 없습니다.</p>
            )}
          </div>
          <div className="flex items-start space-x-2">
            <TextArea 
              value={newCommentText} 
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCommentText(e.target.value)} 
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

const TeamBulletinBoard: React.FC<{ teamProjectId: string, boardId: number, currentUser: User }> = ({ teamProjectId, boardId, currentUser }) => {

    const [posts, setPosts] = useState<BulletinPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [actualBoardId, setActualBoardId] = useState<number>(boardId);
    
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [newPostData, setNewPostData] = useState<{title: string, content: string}>({title: '', content: ''});
    
    const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);
    const [isPostDetailModalOpen, setIsPostDetailModalOpen] = useState(false);

    const mapApiPostToState = (p: PostResponse, teamProjectId: string, boardId: number): BulletinPost => ({
      id: p.id,
      boardId: String(boardId),
      teamId: teamProjectId,
      title: p.title,
      content: p.content,
      authorId: p.authorId,
      authorName: p.authorName,
      createdAt: p.createdAt,
      attachments: p.attachments?.map(a => ({
          id: String(a.id),
          postId: p.id,
          fileName: a.originalFileName,
          fileUrl: a.downloadUrl,
      })) || [],
      comments: [],
    });

    const loadPosts = useCallback(async () => {
        if (!hasMore && page !== 0) return;
        setIsLoading(true);
        try {
            const response = await bulletinApi.getPosts(teamProjectId, actualBoardId, page, 20);
            const apiPosts: BulletinPost[] = response.content.map((p: PostResponse) => mapApiPostToState(p, teamProjectId, actualBoardId));

            setPosts(prev => page === 0 ? apiPosts : [...prev, ...apiPosts]);
            setHasMore(!response.last);
        } catch (error) {
            console.error("게시글 로딩 실패:", error);
            setPosts([]);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [teamProjectId, actualBoardId, page, hasMore]);

    useEffect(()=> {
        // 팀 정보에서 boardId를 받아서 직접 사용
        setActualBoardId(boardId);
        setPage(0);
        setPosts([]);
        setHasMore(true);
    }, [teamProjectId, boardId]);

    useEffect(()=> {
        loadPosts();
    }, [loadPosts]);

    const handleOpenCreatePostModal = () => {
        setNewPostData({title: '', content: ''});
        setIsCreatePostModalOpen(true);
    };

    const handleCreatePost = async () => {
        if (!newPostData.title.trim() || !newPostData.content.trim()) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }
        
        console.log('게시글 생성 시작:', { teamProjectId, actualBoardId, currentUser: currentUser.id });
        
        try {
            const createRequest: PostCreateRequest = {
                boardId: actualBoardId, // actualBoardId 사용
                title: newPostData.title,
                content: newPostData.content,
            };
            
            console.log('게시글 생성 요청:', createRequest);
            
            await bulletinApi.createPost(teamProjectId, String(currentUser.id), createRequest);
            setIsCreatePostModalOpen(false);
            // Re-load posts
            setPage(0);
            setPosts([]);
            setHasMore(true);
        } catch (error) {
            console.error("게시글 생성 실패:", error);
            alert("게시글 생성에 실패했습니다. 게시판이 존재하지 않거나 권한이 없을 수 있습니다.");
        }
    };
    
    const handleOpenPostDetail = async (post: BulletinPost) => {
        try {
            const postDetails = await bulletinApi.getPost(post.id);
            const commentsResponse = await bulletinApi.getComments(post.id, 0, 100);
            
            const detailedPost: BulletinPost = {
                ...post,
                content: postDetails.content,
                comments: commentsResponse.content.map((c: CommentResponse) => ({
                    id: c.id,
                    postId: c.postId,
                    authorId: c.authorId,
                    authorName: c.authorName,
                    content: c.content,
                    createdAt: c.createdAt
                }))
            };
            setSelectedPost(detailedPost);
            setIsPostDetailModalOpen(true);
        } catch(error) {
            console.error("게시글 상세 정보 로딩 실패:", error);
            alert("게시글 정보를 불러오는 데 실패했습니다.");
        }
    };

    const handleAddBulletinComment = async (postId: number, commentText: string) => {
        try {
            const newComment = await bulletinApi.createComment(postId, String(currentUser.id), { content: commentText });
            if (selectedPost) {
                const newCommentForState: BulletinComment = {
                  id: newComment.id,
                  postId: newComment.postId,
                  authorId: newComment.authorId,
                  authorName: newComment.authorName,
                  content: newComment.content,
                  createdAt: newComment.createdAt
                };
                setSelectedPost(prev => prev ? {...prev, comments: [...(prev.comments || []), newCommentForState]} : null);
            }
        } catch(error) {
            console.error("댓글 추가 실패:", error);
            alert("댓글 추가에 실패했습니다.");
        }
    };
    
    const handleDeleteBulletinPost = async (postId: number) => {
        try {
            await bulletinApi.deletePost(postId, String(currentUser.id));
            setPosts(prev => prev.filter(p => p.id !== postId));
            if (selectedPost && selectedPost.id === postId) {
                setIsPostDetailModalOpen(false);
                setSelectedPost(null);
            }
        } catch (error) {
            console.error("게시글 삭제 실패:", error);
            alert("게시글 삭제에 실패했습니다.");
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
                             </div>
                             {(Number(currentUser.id) === post.authorId) &&
                                 <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteBulletinPost(post.id); }}>
                                     <TrashIcon className="w-4 h-4 text-red-500"/>
                                 </Button>
                             }
                        </div>
                    </li>
                ))}
            </ul>
            {hasMore && (
                 <div className="text-center mt-4">
                     <Button onClick={() => setPage(p => p + 1)} disabled={isLoading} variant="outline">
                         {isLoading ? '로딩 중...' : '더 보기'}
                     </Button>
                 </div>
             )}

            <Modal isOpen={isCreatePostModalOpen} onClose={() => setIsCreatePostModalOpen(false)} title="새 게시글 작성"
                footer={<Button onClick={handleCreatePost}>작성 완료</Button>}
            >
                <div className="space-y-3">
                    <Input label="제목" value={newPostData.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPostData(p => ({...p, title: e.target.value}))} />
                    <TextArea label="내용" value={newPostData.content} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPostData(p => ({...p, content: e.target.value}))} rows={10}/>
                </div>
            </Modal>
            
            <BulletinPostDetailModal 
                isOpen={isPostDetailModalOpen}
                onClose={() => setIsPostDetailModalOpen(false)}
                post={selectedPost}
                onAddComment={handleAddBulletinComment}
                onDeletePost={handleDeleteBulletinPost}
                currentUser={currentUser}
            />
        </Card>
    );
};

export default TeamBulletinBoard; 