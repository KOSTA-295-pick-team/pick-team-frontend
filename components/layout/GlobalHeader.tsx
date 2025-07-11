import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { BellIcon } from '../icons';

export const GlobalHeader: React.FC = () => {
  const { currentUser, logout, currentWorkspace } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <header className="bg-primary text-white shadow-md h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 fixed top-0 left-0 right-0 z-50">
      <Link to={`/ws/${currentWorkspace?.id || 'ws_default'}`} className="text-xl font-bold">
        PickTeam
      </Link>
      <div className="flex items-center space-x-4">
        {/* 팀 구성 버튼 삭제됨 */}
        <Link to="/notifications" className="p-1 rounded-full hover:bg-primary-dark relative">
          <BellIcon className="h-6 w-6" />
        </Link>
        <div className="relative">
          <button 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark focus:ring-white"
          >
            <img className="h-8 w-8 rounded-full object-cover" src={currentUser.profilePictureUrl || `https://picsum.photos/seed/${currentUser.id}/32/32`} alt="User Profile" />
          </button>
          {profileDropdownOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none text-neutral-700">
              <Link to="/my-page" className="block px-4 py-2 text-sm hover:bg-neutral-100" onClick={() => setProfileDropdownOpen(false)}>마이페이지</Link>
              <button 
                onClick={() => { 
                  logout(); 
                  setProfileDropdownOpen(false);
                  navigate('/login'); 
                }} 
                className="w-full text-left block px-4 py-2 text-sm hover:bg-neutral-100"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}; 