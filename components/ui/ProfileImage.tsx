import React from "react";
import { getProfileImageSrc, handleImageError } from "../../utils/avatar";

interface ProfileImageProps {
  profileImageUrl: string | null | undefined;
  userId: string;
  size?: number;
  className?: string;
  alt?: string;
}

export const ProfileImage: React.FC<ProfileImageProps> = ({
  profileImageUrl,
  userId,
  size = 128,
  className = "",
  alt = "Profile",
}) => {
  const imageSrc = getProfileImageSrc(profileImageUrl, userId, size);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={(e) => handleImageError(e, userId, size)}
    />
  );
};
