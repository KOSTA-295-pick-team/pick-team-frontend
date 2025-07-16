import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/user/auth/context/AuthContext";
import {
  Button,
  Input,
  Card,
  TextArea,
} from "@/components/ui";
import { UserIcon, CogIcon } from "@/assets/icons";
import { User } from "@/features/user/types/user";
import { userApi } from "@/lib/userApi";
import { getProfileImageSrc, handleImageError } from "@/lib/imageUtils";

export const MyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    useEffect(() => {
      navigate("/login");
    }, [navigate]);
    return <p>로그인이 필요합니다. 로그인 페이지로 이동합니다...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Card title="마이페이지">
          <div className="text-center mb-8">
            <img
              key={`${currentUser.profileImageUrl || "default"}-${Date.now()}`}
              src={getProfileImageSrc(
                currentUser.profileImageUrl,
                currentUser.id,
                128
              )}
              alt={currentUser.name || "User Profile"}
              className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-blue-500 object-cover"
              onError={(e) => handleImageError(e, currentUser.id, 128)}
            />
            <h2 className="text-2xl font-semibold text-gray-800">
              {currentUser.name}
            </h2>
            <p className="text-gray-600">{currentUser.email}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/my-page/profile-edit" className="block">
              <Card className="hover:shadow-lg transition-shadow h-full cursor-pointer border-2 hover:border-blue-300">
                <div className="flex items-center space-x-4 p-4">
                  <UserIcon className="w-10 h-10 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">
                      프로필 정보 수정
                    </h3>
                    <p className="text-sm text-gray-500">
                      개인 정보 및 성향을 업데이트하세요.
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link to="/my-page/account-settings" className="block">
              <Card className="hover:shadow-lg transition-shadow h-full cursor-pointer border-2 hover:border-blue-300">
                <div className="flex items-center space-x-4 p-4">
                  <CogIcon className="w-10 h-10 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">
                      계정 설정
                    </h3>
                    <p className="text-sm text-gray-500">
                      비밀번호 변경 등 계정 관련 설정을 관리합니다.
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const ProfileEditPage: React.FC = () => {
  const { currentUser, updateUserProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    age: undefined,
    mbti: "",
    disposition: "", // 성향/특성 필드 추가
    skills: [],
    bio: "",
    portfolioUrl: "",
    preferWorkstyle: "",
    dislikeWorkstyle: "",
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [hasUploadedImage, setHasUploadedImage] = useState(false); // 업로드 상태 추적
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        age: currentUser.age || undefined,
        mbti: currentUser.mbti || "",
        disposition: currentUser.disposition || "", // 성향/특성 초기값 설정
        skills: currentUser.hashtags || [], // hashtags -> skills 매핑
        bio: currentUser.introduction || "", // introduction -> bio 매핑
        portfolioUrl: currentUser.portfolio || "", // portfolio -> portfolioUrl 매핑
        preferWorkstyle: currentUser.preferWorkstyle || "",
        dislikeWorkstyle: currentUser.dislikeWorkstyle || "",
      });
      
      // 업로드 중이 아닐 때만 미리보기 업데이트
      if (!hasUploadedImage) {
        setProfileImagePreview(
          getProfileImageSrc(currentUser.profileImageUrl, currentUser.id, 150)
        );
      }
    } else {
      const timer = setTimeout(() => {
        if (!currentUser) {
          navigate("/login");
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentUser, navigate, hasUploadedImage]); // hasUploadedImage 의존성 추가

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age" ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!profileImageFile) return;

    setIsUploadingImage(true);
    setImageError(null);
    setHasUploadedImage(true); // 업로드 시작 시 플래그 설정

    try {
      const response = await userApi.uploadProfileImage(profileImageFile);
      const imageUrl = response.data.profileImageUrl;

      // 업로드된 이미지 URL로 즉시 미리보기 업데이트
      const fullImageUrl = getProfileImageSrc(imageUrl, currentUser?.id || "", 150);
      setProfileImagePreview(`${fullImageUrl}?t=${Date.now()}`);
      setProfileImageFile(null);

      // AuthContext의 사용자 정보 업데이트
      updateUserProfile({
        ...currentUser,
        profileImageUrl: imageUrl,
      });

      // 최신 프로필 정보를 서버에서 다시 가져오기
      await refreshProfile();
      
      // 추가적으로 미리보기를 다시 설정하여 확실히 갱신
      setTimeout(() => {
        const updatedImageUrl = getProfileImageSrc(imageUrl, currentUser?.id || "", 150);
        setProfileImagePreview(`${updatedImageUrl}?t=${Date.now()}`);
        setHasUploadedImage(false); // 업로드 완료 후 플래그 해제
      }, 500);
      
    } catch (error: any) {
      setImageError(error.message || "이미지 업로드 중 오류가 발생했습니다.");
      setHasUploadedImage(false); // 에러 시에도 플래그 해제
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!confirm("프로필 이미지를 삭제하시겠습니까?")) return;

    setIsUploadingImage(true);
    setImageError(null);
    setHasUploadedImage(true); // 삭제 시작 시 플래그 설정

    try {
      // 프로필 이미지를 null로 설정하여 삭제
      await userApi.updateMyProfile({
        profileImageUrl: null,
      });

      updateUserProfile({ 
        ...currentUser,
        profileImageUrl: null 
      });
      
      // 기본 이미지로 미리보기 설정
      setProfileImagePreview(
        getProfileImageSrc(null, currentUser?.id || "", 150)
      );

      // 최신 프로필 정보를 서버에서 다시 가져오기
      await refreshProfile();
      
      // 삭제 완료 후 플래그 해제
      setTimeout(() => {
        setHasUploadedImage(false);
      }, 500);
      
    } catch (error: any) {
      setImageError(error.message || "이미지 삭제 중 오류가 발생했습니다.");
      setHasUploadedImage(false); // 에러 시에도 플래그 해제
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills?.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s !== skill) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      // 프론트엔드 필드명을 백엔드 필드명으로 변환
      const profileUpdateData = {
        name: formData.name,
        age: formData.age,
        mbti: formData.mbti,
        disposition: formData.disposition, // 성향/특성 필드 추가
        introduction: formData.bio, // bio -> introduction
        portfolio: formData.portfolioUrl, // portfolioUrl -> portfolio
        hashtags: formData.skills, // skills -> hashtags
        preferWorkstyle: formData.preferWorkstyle,
        dislikeWorkstyle: formData.dislikeWorkstyle,
      };

      const response = await userApi.updateMyProfile(profileUpdateData);
      updateUserProfile(response.data);
      
      // 최신 프로필 정보를 서버에서 다시 가져오기
      await refreshProfile();
      
      navigate("/my-page", { replace: true });
    } catch (error: any) {
      setProfileError(error.message || "프로필 수정 중 오류가 발생했습니다.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <p className="text-center text-gray-600">로딩 중...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Card title="프로필 편집">
          {profileError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{profileError}</p>
            </div>
          )}

          {imageError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{imageError}</p>
            </div>
          )}

          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              프로필 이미지
            </h3>
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <img
                  src={profileImagePreview || ""}
                  alt="Profile"
                  className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover"
                  onError={(e) => handleImageError(e, currentUser.id, 150)}
                />
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="text-white text-sm">업로드 중...</div>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleImageUpload}
                    disabled={!profileImageFile || isUploadingImage}
                    variant="primary"
                    size="sm"
                  >
                    이미지 업로드
                  </Button>
                  <Button
                    onClick={handleImageDelete}
                    disabled={isUploadingImage}
                    variant="outline"
                    size="sm"
                  >
                    이미지 삭제
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="이름"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                required
              />
              <Input
                label="나이"
                name="age"
                type="number"
                value={formData.age || ""}
                onChange={handleChange}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="MBTI"
                name="mbti"
                value={formData.mbti || ""}
                onChange={handleChange}
                placeholder="예: ENFP"
              />
              <Input
                label="성향/특성"
                name="disposition"
                value={formData.disposition || ""}
                onChange={handleChange}
                placeholder="예: 활발함, 신중함, 협력적"
              />
            </div>

            <div className="grid md:grid-cols-1 gap-6">
              <Input
                label="포트폴리오 링크"
                name="portfolioUrl"
                value={formData.portfolioUrl || ""}
                onChange={handleChange}
                placeholder="https://portfolio.example.com"
              />
            </div>

            <TextArea
              label="자기소개"
              name="bio"
              value={formData.bio || ""}
              onChange={handleChange}
              rows={4}
              placeholder="자신을 소개해주세요..."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기술 스택
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.skills?.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="기술을 입력하고 Enter를 누르세요"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value) {
                        addSkill(value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <TextArea
                label="선호하는 작업 스타일"
                name="preferWorkstyle"
                value={formData.preferWorkstyle || ""}
                onChange={handleChange}
                rows={3}
                placeholder="어떤 방식으로 일하는 것을 선호하시나요?"
              />
              <TextArea
                label="기피하는 작업 스타일"
                name="dislikeWorkstyle"
                value={formData.dislikeWorkstyle || ""}
                onChange={handleChange}
                rows={3}
                placeholder="어떤 방식은 피하고 싶으신가요?"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/my-page")}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export const AccountSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      await userApi.changePassword({ 
        currentPassword, 
        newPassword 
      });
      setSuccess("비밀번호가 성공적으로 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err.status === 400 && err.message?.includes('소셜 로그인')) {
        setError("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.");
      } else if (err.status === 401) {
        setError("현재 비밀번호가 올바르지 않습니다.");
      } else {
        setError(err.message || "비밀번호 변경에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <p className="text-center text-gray-600">로그인이 필요합니다.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Card title="계정 설정">
          <div className="space-y-8">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">계정 정보</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">이메일:</span>
                  <span className="text-sm text-gray-800">{currentUser.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">로그인 방식:</span>
                  <span className="text-sm text-gray-800">
                    {currentUser.provider === 'LOCAL' ? '이메일 로그인' : 
                     currentUser.provider === 'GOOGLE' ? '구글 로그인' :
                     currentUser.provider === 'KAKAO' ? '카카오 로그인' : '알 수 없음'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">가입일:</span>
                  <span className="text-sm text-gray-800">
                    {currentUser.createdAt 
                      ? new Date(currentUser.createdAt).toLocaleDateString() 
                      : "정보 없음"}
                  </span>
                </div>
              </div>
            </div>

            {/* 소셜 로그인 사용자는 비밀번호 변경 불가 */}
            {currentUser.provider === 'LOCAL' && (
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">비밀번호 변경</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="현재 비밀번호"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  label="새 비밀번호"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="8자 이상 입력하세요"
                />
                <Input
                  label="새 비밀번호 확인"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="새 비밀번호를 다시 입력하세요"
                />

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600">{success}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/my-page")}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? "변경 중..." : "비밀번호 변경"}
                  </Button>
                </div>
              </form>
            </div>
            )}

            {/* 소셜 로그인 사용자용 안내 메시지 */}
            {currentUser.provider !== 'LOCAL' && (
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">비밀번호 변경</h3>
                <p className="text-sm text-gray-600">
                  소셜 로그인({currentUser.provider === 'GOOGLE' ? '구글' : '카카오'})으로 가입하신 경우, 
                  해당 플랫폼에서 비밀번호를 변경해주세요.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MyPage;
