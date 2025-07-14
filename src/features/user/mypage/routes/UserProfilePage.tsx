import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { User } from '@/features/user/types/user';

// Demo data source - in a real app, this would be fetched from a backend
const demoUsers: User[] = [
  { id: '1', email: 'user1@example.com', name: '김철수', age: 25, mbti: 'ENFP', hashtags: ['#아이디어뱅크', '#활발함', '#커뮤니케이션중요'], introduction: '새로운 기술 배우는 것을 좋아합니다. 함께 성장할 팀원을 찾아요!', portfolio: 'https://github.com/user1', preferWorkstyle: '자유로운 분위기, 적극적인 의견 교환', dislikeWorkstyle: '수직적인 관계, 소통 부재', profileImageUrl: 'https://picsum.photos/seed/user1/200/200' },
  { id: '2', email: 'user2@example.com', name: '이영희', age: 28, mbti: 'ISTJ', hashtags: ['#계획적', '#꼼꼼함', '#책임감강함'], introduction: '체계적인 프로젝트 진행을 선호합니다. 마감 기한 준수!', preferWorkstyle: '명확한 역할 분담, 체계적인 진행', dislikeWorkstyle: '즉흥적인 변경, 불확실한 목표', profileImageUrl: 'https://picsum.photos/seed/user2/200/200' },
  { id: '3', email: 'user3@example.com', name: '박민준', age: 22, mbti: 'ESFP', hashtags: ['#분위기메이커', '#친화력갑', '#긍정적'], introduction: '즐겁게 일하는 것이 최고! 팀에 활력을 불어넣겠습니다.', preferWorkstyle: '유쾌한 분위기, 팀워크 중시', dislikeWorkstyle: '지나치게 엄숙한 분위기', profileImageUrl: 'https://picsum.photos/seed/user3/200/200' },
];


export const UserProfileViewPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const foundUser = demoUsers.find(u => u.id === userId);
      setUser(foundUser || null);
      setLoading(false);
    }, 500);
  }, [userId]);

  if (loading) {
    return <div className="text-center py-10">프로필 정보를 불러오는 중...</div>;
  }

  if (!user) {
    return <div className="text-center py-10 text-red-500">사용자 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="md:flex md:space-x-8">
          <div className="md:w-1/3 text-center mb-6 md:mb-0">
            <img 
              src={user.profileImageUrl || `https://picsum.photos/seed/${user.id}/200/200`} 
              alt={user.name} 
              className="w-40 h-40 rounded-full mx-auto mb-4 border-4 border-primary"
            />
            <h1 className="text-3xl font-bold text-neutral-800">{user.name}</h1>
            <p className="text-neutral-600">{user.email}</p>
            {user.mbti && <p className="text-sm text-primary mt-1">{user.mbti}</p>}
            {user.portfolio && (
              <a href={user.portfolio} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="mt-4 w-full">포트폴리오 보기</Button>
              </a>
            )}
          </div>

          <div className="md:w-2/3">
            {user.hashtags && user.hashtags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">주요 성향 태그</h3>
                <div className="flex flex-wrap gap-2">
                  {user.hashtags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-primary-light/20 text-primary text-sm rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {user.introduction && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">자기소개</h3>
                <p className="text-neutral-600 whitespace-pre-line">{user.introduction}</p>
              </div>
            )}

            {user.preferWorkstyle && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">좋아하는 협업 스타일</h3>
                <p className="text-neutral-600 whitespace-pre-line">{user.preferWorkstyle}</p>
              </div>
            )}

            {user.dislikeWorkstyle && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">피하는 협업 스타일</h3>
                <p className="text-neutral-600 whitespace-pre-line">{user.dislikeWorkstyle}</p>
              </div>
            )}
            
            {user.age && (
              <p className="text-sm text-neutral-500">나이: {user.age}세</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

