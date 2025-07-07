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
            src={
              currentUser.profilePictureUrl ||
              `https://picsum.photos/seed/${currentUser.id}/128/128`
            }
            alt={currentUser.name || "User Profile"}
            className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-primary"
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
  const { currentUser, updateUserProfile } = useAuth(); // Use updateUserProfile from context
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
    profilePictureUrl: "",
  });
  const [customTag, setCustomTag] = useState("");

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
        profilePictureUrl:
          currentUser.profilePictureUrl ||
          `https://picsum.photos/seed/${currentUser.id}/150/150`,
      });
    } else {
      // Redirect if no current user (should be caught by ProtectedRoute)
      navigate("/login");
    }
  }, [currentUser, navigate]);

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

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          profilePictureUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      // const updatedUser: User = { ...currentUser, ...formData };
      updateUserProfile(formData); // Update context with new user data
      alert("프로필이 업데이트되었습니다!");
      navigate("/my-page");
    }
  };

  if (!currentUser) return null; // Or a loading spinner, but should be handled by useEffect redirect

  return (
    <Card title="프로필 정보 수정">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <img
            src={
              formData.profilePictureUrl ||
              `https://picsum.photos/seed/${currentUser.id}/150/150`
            }
            alt="프로필 미리보기"
            className="w-32 h-32 rounded-full object-cover border-2 border-primary"
          />
          <Input
            type="file"
            label="프로필 사진 변경"
            accept="image/*"
            onChange={handleProfilePictureChange}
            className="text-sm"
          />
        </div>

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
          >
            취소
          </Button>
          <Button type="submit" variant="primary">
            저장
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
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const handleSubmitPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmNewPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    // Demo password change
    console.log("Password change attempt:", { currentPassword, newPassword });
    setSuccess("비밀번호가 성공적으로 변경되었습니다.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
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
        />
        <Input
          label="새 비밀번호"
          name="newPassword"
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="새 비밀번호 확인"
          name="confirmNewPassword"
          type="password"
          required
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/my-page")}
          >
            취소
          </Button>
          <Button type="submit" variant="primary">
            비밀번호 변경
          </Button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-neutral-200">
        <h3 className="text-lg font-medium text-neutral-700">계정 삭제</h3>
        <p className="text-sm text-neutral-500 mt-1 mb-3">
          계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다. 이 작업은 되돌릴
          수 없습니다.
        </p>
        <Button variant="danger" onClick={() => alert("계정 삭제 기능 (목업)")}>
          계정 삭제 요청
        </Button>
      </div>
    </Card>
  );
};
