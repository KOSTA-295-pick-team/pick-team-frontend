export interface User {
  id: number;
  email: string;
  name: string;
  age?: number;
  role: string;
  mbti?: string;
  disposition?: string;
  introduction?: string;
  portfolio?: string;
  profileImageUrl?: string;
  preferWorkstyle?: string;
  dislikeWorkstyle?: string;
  hashtags?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn: number;
  user: User;
} 

export interface UserProfileUpdateRequest {
  name?: string;
  age?: number;
  mbti?: string;
  disposition?: string;
  introduction?: string;
  portfolio?: string;
  profileImageUrl?: string;
  preferWorkstyle?: string;
  dislikeWorkstyle?: string;
  hashtags?: string[];
} 