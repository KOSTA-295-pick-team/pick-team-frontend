import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, Button } from "../../components";
import { User } from "../../types";
import { userControllerApi } from "../../services/user-controller";

export const UserProfileViewPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setError("사용자 ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const userData = await userControllerApi.getUserProfile(userId);
        setUser(userData);
      } catch (err) {
        setError("사용자 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-10">프로필 정보를 불러오는 중...</div>
    );
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-10 text-red-500">
        사용자 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="md:flex md:space-x-8">
          <div className="md:w-1/3 text-center mb-6 md:mb-0">
            <img
              src={
                user.profilePictureUrl ||
                `https://picsum.photos/seed/${user.id}/200/200`
              }
              alt={user.name}
              className="w-40 h-40 rounded-full mx-auto mb-4 border-4 border-primary"
            />
            <h1 className="text-3xl font-bold text-neutral-800">{user.name}</h1>
            <p className="text-neutral-600">{user.email}</p>
            {user.mbti && (
              <p className="text-sm text-primary mt-1">{user.mbti}</p>
            )}
            {user.portfolioLink && (
              <a
                href={user.portfolioLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  포트폴리오 보기
                </Button>
              </a>
            )}
          </div>

          <div className="md:w-2/3">
            {user.tags && user.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">
                  주요 성향 태그
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-primary-light/20 text-primary text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {user.bio && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">
                  자기소개
                </h3>
                <p className="text-neutral-600 whitespace-pre-line">
                  {user.bio}
                </p>
              </div>
            )}

            {user.preferredStyle && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">
                  좋아하는 협업 스타일
                </h3>
                <p className="text-neutral-600 whitespace-pre-line">
                  {user.preferredStyle}
                </p>
              </div>
            )}

            {user.avoidedStyle && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">
                  피하는 협업 스타일
                </h3>
                <p className="text-neutral-600 whitespace-pre-line">
                  {user.avoidedStyle}
                </p>
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
