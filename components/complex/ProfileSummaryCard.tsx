import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { Card, Button } from '../ui';

// ProfileSummaryCard Component (Epic 2)
interface ProfileSummaryCardProps {
  user: User;
  className?: string;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ user, className }) => {
  return (
    <Card className={`text-center ${className}`}>
      <img 
        src={user.profilePictureUrl || `https://picsum.photos/seed/${user.id}/150/150`} 
        alt={user.name || 'Profile'} 
        className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-primary"
      />
      <h3 className="text-lg font-semibold text-neutral-800">{user.name || '사용자 이름'}</h3>
      <p className="text-sm text-neutral-500 mb-1">{user.mbti || 'MBTI'}</p>
      {user.tags && user.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {user.tags.slice(0,3).map(tag => (
            <span key={tag} className="px-2 py-1 bg-primary-light/20 text-primary text-xs rounded-full">{tag}</span>
          ))}
        </div>
      )}
      <Link to={`/users/${user.id}`}>
        <Button variant="outline" size="sm" className="mt-4 w-full">프로필 보기</Button>
      </Link>
    </Card>
  );
}; 