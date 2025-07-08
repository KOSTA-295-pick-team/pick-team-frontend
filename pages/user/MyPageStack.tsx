import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import {
  Button,
  Input,
  Card,
  TextArea,
  UserIcon,
  CogIcon,
} from "../../components";
import { User, TendencyTag } from "../../types";
import {
  userControllerApi,
  UserApiError,
} from "../../services/user-controller";
import { getProfileImageSrc, handleImageError } from "../../utils/avatar";

const availableTags: TendencyTag[] = [
  { id: "1", label: "#아침형인간" },
  { id: "2", label: "#저녁형인간" },
  { id: "3", label: "#리더역할선호" },
  { id: "4", label: "#팔로워역할선호" },
  { id: "5", label: "#계획적" },
  { id: "6", label: "#즉흥적" },
  { id: "7", label: "#ISTJ" },
  { id: "8", label: "#꼼꼼함" },
  { id: "9", label: "#아이디어뱅크" },
  { id: "10", label: "#커뮤니케이션중요" },
];

export const MyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    // This case should ideally be handled by ProtectedRoute
    // For safety, redirect if somehow accessed without a user
    useEffect(() => {
      navigate("/login");
    }, [navigate]);
    return <p>로그인이 필요합니다. 로그인 페이지로 이동합니다...</p>;
  }

  return (
    <div className="space-y-6">
      <Card title="마이페이지">
        <div className="text-center mb-6">
          <img
            key={currentUser.profileImageUrl || "default"} // 강제 리렌더링을 위한 key
            src={getProfileImageSrc(
              currentUser.profileImageUrl,
              currentUser.id,
              128
            )}
            alt={currentUser.name || "User Profile"}
            className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-primary"
            onError={(e) => handleImageError(e, currentUser.id, 128)}
          />
          <h2 className="text-2xl font-semibold text-neutral-800">
            {currentUser.name}
          </h2>
          <p className="text-neutral-600">{currentUser.email}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/my-page/profile-edit" className="block">
            <Card className="hover:shadow-xl transition-shadow h-full cursor-pointer">
              <div className="flex items-center space-x-3 p-2">
                <UserIcon className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-700">
                    프로필 정보 수정
                  </h3>
                  <p className="text-sm text-neutral-500">
                    개인 정보 및 성향을 업데이트하세요.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/my-page/account-settings" className="block">
            <Card className="hover:shadow-xl transition-shadow h-full cursor-pointer">
              <div className="flex items-center space-x-3 p-2">
                <CogIcon className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-700">
                    계정 설정
                  </h3>
                  <p className="text-sm text-neutral-500">
                    비밀번호 변경 등 계정 관련 설정을 관리합니다.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export const ProfileEditPage: React.FC = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    age: undefined,
    mbti: "",
    tags: [],
    bio: "",
    portfolioLink: "",
    preferredStyle: "",
    avoidedStyle: "",
  });
  const [customTag, setCustomTag] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
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
        tags: currentUser.tags || [],
        bio: currentUser.bio || "",
        portfolioLink: currentUser.portfolioLink || "",
        preferredStyle: currentUser.preferredStyle || "",
        avoidedStyle: currentUser.avoidedStyle || "",
      });
      // 이미지 미리보기만 별도로 업데이트 (항상 최신 이미지 반영)
      setProfileImagePreview(
        getProfileImageSrc(currentUser.profileImageUrl, currentUser.id, 150)
      );
    } else {
      // Redirect if no current user (should be caught by ProtectedRoute)
      // 하지만 updateUserProfile 과정에서 일시적으로 null이 될 수 있으므로 더 신중하게 처리
      const timer = setTimeout(() => {
        if (!currentUser) {
          navigate("/login");
        }
      }, 1000); // 1초 대기 후 여전히 currentUser가 없으면 리다이렉트

      return () => clearTimeout(timer);
    }
    // currentUser.profileImageUrl 변경은 의존성에서 제외하여 불필요한 리렌더링 방지
    // 또한 name, email 등의 변경으로 인한 불필요한 useEffect 실행도 방지
  }, [currentUser?.id, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age" ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleTagToggle = (tagLabel: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.includes(tagLabel)
        ? prev.tags.filter((t) => t !== tagLabel)
        : [...(prev.tags || []), tagLabel],
    }));
  };

  const handleAddCustomTag = () => {
    if (
      customTag &&
      !formData.tags?.includes(
        customTag.startsWith("#") ? customTag : `#${customTag}`
      )
    ) {
      const newTag = customTag.startsWith("#") ? customTag : `#${customTag}`;
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag],
      }));
      setCustomTag("");
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);

      // 프리뷰 생성
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

    try {
      const imageUrl = await userControllerApi.uploadProfileImage(
        profileImageFile
      );

      // 2단계: 서버의 사용자 프로필에도 이미지 URL 업데이트
      await userControllerApi.updateMyProfile({
        profileImageUrl: imageUrl,
      });

      // 3단계: 서버에서 최신 사용자 정보를 다시 가져와서 Context 동기화
      const updatedProfile = await userControllerApi.getMyProfile();

      // 로컬 미리보기 이미지 먼저 업데이트
      setProfileImagePreview(
        getProfileImageSrc(imageUrl, currentUser?.id || "", 150)
      );
      setProfileImageFile(null);

      // 서버에서 가져온 최신 정보로 Context 업데이트
      updateUserProfile({
        profileImageUrl: updatedProfile.profileImageUrl,
        // 다른 필드들도 최신 상태로 동기화
        name: updatedProfile.name,
        email: updatedProfile.email,
        age: updatedProfile.age,
        mbti: updatedProfile.mbti,
        bio: updatedProfile.introduction,
        portfolioLink: updatedProfile.portfolio,
        preferredStyle: updatedProfile.preferWorkstyle,
        avoidedStyle: updatedProfile.dislikeWorkstyle,
      });
    } catch (error) {
      if (error instanceof UserApiError) {
        setImageError(error.message);
      } else {
        setImageError("이미지 업로드 중 오류가 발생했습니다.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!confirm("프로필 이미지를 삭제하시겠습니까?")) return;

    setIsUploadingImage(true);
    setImageError(null);

    try {
      await userControllerApi.deleteProfileImage();

      // 2단계: 서버의 사용자 프로필에서도 이미지 URL 제거
      await userControllerApi.updateMyProfile({
        profileImageUrl: null,
      });

      // 성공적으로 삭제되면 컨텍스트 업데이트
      updateUserProfile({ profileImageUrl: null });
      setProfileImagePreview(
        getProfileImageSrc(null, currentUser?.id || "", 150)
      );
    } catch (error) {
      if (error instanceof UserApiError) {
        setImageError(error.message);
      } else {
        setImageError("이미지 삭제 중 오류가 발생했습니다.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      // API 문서 기준으로 UpdateMyProfileRequest 타입에 맞게 데이터 변환
      const updateData: any = {
        name: formData.name,
        age: formData.age,
        mbti: formData.mbti,
        hashtags: formData.tags, // UI의 tags → API의 hashtags
        introduction: formData.bio, // UI의 bio → API의 introduction
        portfolio: formData.portfolioLink, // UI의 portfolioLink → API의 portfolio
        preferWorkstyle: formData.preferredStyle, // UI의 preferredStyle → API의 preferWorkstyle
        dislikeWorkstyle: formData.avoidedStyle, // UI의 avoidedStyle → API의 dislikeWorkstyle
      };

      // undefined 필드 제거
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await userControllerApi.updateMyProfile(updateData);

      // 성공적으로 업데이트되면 컨텍스트 업데이트 (이미지 URL 제외)
      updateUserProfile(formData);

      // 성공 시 마이페이지로 이동
      navigate("/my-page", { replace: true });
    } catch (error) {
      if (error instanceof UserApiError) {
        setProfileError(error.message);
      } else {
        setProfileError("프로필 수정 중 오류가 발생했습니다.");
      }
      // 실패 시 화면 최상단으로 스크롤
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (!currentUser) return null; // Or a loading spinner, but should be handled by useEffect redirect

  return (
    <Card title="프로필 정보 수정">
      {/* 프로필 이미지 관리 섹션 - 별도로 분리 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">프로필 이미지</h3>
        <div className="flex flex-col items-center space-y-4">
          {currentUser && (
            <img
              src={
                profileImagePreview ||
                getProfileImageSrc(
                  currentUser.profileImageUrl,
                  currentUser.id,
                  150
                )
              }
              alt="프로필 미리보기"
              className="w-32 h-32 rounded-full object-cover border-2 border-primary"
              onError={(e) => handleImageError(e, currentUser.id, 150)}
            />
          )}
          <Input
            type="file"
            label="이미지 선택"
            accept="image/*"
            onChange={handleProfileImageChange}
            className="text-sm"
          />
          {profileImageFile && (
            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={handleImageUpload}
                disabled={isUploadingImage}
                size="sm"
              >
                {isUploadingImage ? "업로드 중..." : "이미지 업로드"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setProfileImageFile(null);
                  setProfileImagePreview(
                    getProfileImageSrc(
                      currentUser?.profileImageUrl,
                      currentUser?.id || "",
                      150
                    )
                  );
                }}
                variant="outline"
                size="sm"
              >
                취소
              </Button>
            </div>
          )}
          {currentUser?.profileImageUrl && (
            <Button
              type="button"
              onClick={handleImageDelete}
              disabled={isUploadingImage}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              {isUploadingImage ? "삭제 중..." : "이미지 삭제"}
            </Button>
          )}
          {imageError && <p className="text-red-600 text-sm">{imageError}</p>}
        </div>
      </div>

      {/* 프로필 정보 수정 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {profileError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {profileError}
          </div>
        )}

        <Input
          label="이름"
          name="name"
          value={formData.name || ""}
          onChange={handleChange}
        />
        <Input
          label="나이"
          name="age"
          type="number"
          value={formData.age || ""}
          onChange={handleChange}
        />
        <Input
          label="MBTI"
          name="mbti"
          value={formData.mbti || ""}
          onChange={handleChange}
          placeholder="예: INTP"
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            성향 태그
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {availableTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => handleTagToggle(tag.label)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors
                  ${
                    formData.tags?.includes(tag.label)
                      ? "bg-primary text-white border-primary"
                      : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200"
                  }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              name="customTag"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="직접 태그 입력 (예: #성실함)"
              className="flex-grow"
            />
            <Button
              type="button"
              onClick={handleAddCustomTag}
              variant="outline"
              size="md"
            >
              추가
            </Button>
          </div>
          {formData.tags && formData.tags.length > 0 && (
            <div className="mt-2 text-sm text-neutral-600">
              선택된 태그: {formData.tags.join(", ")}
            </div>
          )}
        </div>

        <TextArea
          label="자기소개"
          name="bio"
          value={formData.bio || ""}
          onChange={handleChange}
          rows={4}
        />
        <Input
          label="포트폴리오 링크"
          name="portfolioLink"
          type="url"
          value={formData.portfolioLink || ""}
          onChange={handleChange}
          placeholder="https://example.com"
        />
        <TextArea
          label="좋아하는 협업 스타일"
          name="preferredStyle"
          value={formData.preferredStyle || ""}
          onChange={handleChange}
        />
        <TextArea
          label="피하는 협업 스타일"
          name="avoidedStyle"
          value={formData.avoidedStyle || ""}
          onChange={handleChange}
        />

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/my-page")}
            disabled={isUpdatingProfile}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={isUpdatingProfile}>
            {isUpdatingProfile ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export const AccountSettingsPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState({
    passwordChange: false,
    accountDelete: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  // 비밀번호 유효성 검사 (API 문서 기준)
  const validatePassword = (password: string): string | null => {
    if (password.length < 8 || password.length > 50) {
      return "비밀번호는 8자 이상 50자 이하여야 합니다.";
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()-=]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return "비밀번호는 대소문자, 숫자, 특수문자(!@#$%^&*()-=)를 모두 포함해야 합니다.";
    }

    return null;
  };

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 클라이언트 측 유효성 검사
    if (newPassword !== confirmNewPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (currentPassword === newPassword) {
      setError("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
      return;
    }

    setLoading((prev) => ({ ...prev, passwordChange: true }));

    try {
      await userControllerApi.changePassword({
        currentPassword,
        newPassword,
      });

      setSuccess("비밀번호가 성공적으로 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("비밀번호 변경 실패:", err);

      if (err instanceof UserApiError) {
        switch (err.status) {
          case 401:
            setError("현재 비밀번호가 올바르지 않습니다.");
            break;
          case 422:
            setError("비밀번호 형식이 올바르지 않습니다.");
            break;
          default:
            setError(err.message || "비밀번호 변경에 실패했습니다.");
        }
      } else {
        setError("비밀번호 변경 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, passwordChange: false }));
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setError("");
    setLoading((prev) => ({ ...prev, accountDelete: true }));

    try {
      await userControllerApi.deleteAccount();

      // 계정 삭제 성공 시 로그아웃 및 로그인 페이지로 이동
      await logout();
      navigate("/login", {
        state: {
          message: "계정이 성공적으로 삭제되었습니다.",
        },
      });
    } catch (err) {
      console.error("계정 삭제 실패:", err);

      if (err instanceof UserApiError) {
        setError(err.message || "계정 삭제에 실패했습니다.");
      } else {
        setError("계정 삭제 중 오류가 발생했습니다.");
      }
      setShowDeleteConfirm(false);
    } finally {
      setLoading((prev) => ({ ...prev, accountDelete: false }));
    }
  };

  return (
    <Card title="계정 설정">
      <form onSubmit={handleSubmitPasswordChange} className="space-y-6">
        <h3 className="text-lg font-medium text-neutral-700">비밀번호 변경</h3>
        <Input
          label="현재 비밀번호"
          name="currentPassword"
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={loading.passwordChange}
        />
        <Input
          label="새 비밀번호"
          name="newPassword"
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8자 이상, 대소문자, 숫자, 특수문자 포함"
          disabled={loading.passwordChange}
        />
        <Input
          label="새 비밀번호 확인"
          name="confirmNewPassword"
          type="password"
          required
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          disabled={loading.passwordChange}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/my-page")}
            disabled={loading.passwordChange}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading.passwordChange}
          >
            {loading.passwordChange ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-neutral-200">
        <h3 className="text-lg font-medium text-neutral-700">계정 삭제</h3>
        <p className="text-sm text-neutral-500 mt-1 mb-3">
          계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다. 이 작업은 되돌릴
          수 없습니다.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={loading.accountDelete}
          >
            계정 삭제 요청
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ 정말로 계정을 삭제하시겠습니까?
              </p>
              <p className="text-sm text-red-600">
                이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading.accountDelete}
              >
                취소
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={loading.accountDelete}
              >
                {loading.accountDelete ? "삭제 중..." : "계정 삭제 확인"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
