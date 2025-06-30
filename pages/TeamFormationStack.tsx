import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Card, Modal, ItemListSelector, ProfileSummaryCard, PlusCircleIcon, TrashIcon } from '../components';
import { User, Team, Poll, VoteOption, TeamProject } from '../types';
import { useAuth } from '../AuthContext';

// Add toast animation styles
const toastStyles = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = toastStyles;
  document.head.appendChild(styleSheet);
}

// Toast notification component
interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'info';
  createdAt: number;
  isNew: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, createdAt, isNew, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // 슬라이드 인 애니메이션은 새로운 토스트에만 적용
    if (isNew) {
      setHasAnimated(true);
    }
  }, [isNew]);

  useEffect(() => {
    // 생성 시간을 기준으로 개별 타이머 설정
    const now = Date.now();
    const elapsed = now - createdAt;
    const remainingFadeTime = Math.max(0, 2500 - elapsed);
    const remainingRemoveTime = Math.max(0, 3000 - elapsed);

    let fadeTimer: NodeJS.Timeout | undefined;
    let removeTimer: NodeJS.Timeout | undefined;

    if (remainingFadeTime > 0) {
      fadeTimer = setTimeout(() => {
        setIsExiting(true);
      }, remainingFadeTime);
    } else if (!isExiting) {
      setIsExiting(true);
    }

    if (remainingRemoveTime > 0) {
      removeTimer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, remainingRemoveTime);
    } else {
      setIsVisible(false);
      onClose();
    }

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, [createdAt, onClose, isExiting]);

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';

  if (!isVisible) return null;

  return (
    <div 
      className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 max-w-sm transform transition-all duration-300 ease-in-out ${
        isExiting ? 'opacity-0 scale-95 translate-x-2' : 'opacity-100 scale-100 translate-x-0'
      }`}
      style={{
        animation: (isNew && hasAnimated) ? 'slideIn 0.3s ease-out forwards' : 'none'
      }}
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1 text-sm">{message}</span>
      <button 
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 300);
        }} 
        className="text-white hover:text-gray-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Custom hook for toast notifications
const useToast = () => {
  const [toasts, setToasts] = useState<Array<{ 
    id: string; 
    message: string; 
    type: 'error' | 'success' | 'info';
    createdAt: number;
    isNew: boolean;
  }>>([]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Date.now().toString();
    const createdAt = Date.now();
    
    // 기존 토스트들의 isNew를 false로 설정
    setToasts(prev => [
      ...prev.map(toast => ({ ...toast, isNew: false })),
      { id, message, type, createdAt, isNew: true }
    ]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className="flex flex-col space-y-3">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id}
            className="pointer-events-auto transform transition-all duration-300 ease-in-out"
            style={{ 
              transform: `translateY(${index * 4}px)`,
              zIndex: 1000 - index 
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              createdAt={toast.createdAt}
              isNew={toast.isNew}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return { showToast, ToastContainer };
};


// Demo data
const demoAvailableUsers: User[] = [
  { id: '1', name: '김코딩', email: 'kim@example.com', mbti: 'ENTP', tags: ['#리더십', '#기획'], profilePictureUrl: 'https://picsum.photos/seed/userA/100/100' },
  { id: '2', name: '박해커', email: 'park@example.com', mbti: 'ISTP', tags: ['#개발', '#문제해결'], profilePictureUrl: 'https://picsum.photos/seed/userB/100/100' },
  { id: '3', name: '이디자인', email: 'lee@example.com', mbti: 'ISFP', tags: ['#디자인', '#UIUX'], profilePictureUrl: 'https://picsum.photos/seed/userC/100/100' },
  { id: '4', name: '최기획', email: 'choi@example.com', mbti: 'ENFJ', tags: ['#기획', '#PM'], profilePictureUrl: 'https://picsum.photos/seed/userD/100/100' },
  { id: '5', name: '정개발', email: 'jung@example.com', mbti: 'INTP', tags: ['#백엔드', '#데이터'], profilePictureUrl: 'https://picsum.photos/seed/userE/100/100' },
  { id: '6', name: '윤테스트', email: 'yoon@example.com', mbti: 'ESTJ', tags: ['#QA', '#꼼꼼함'], profilePictureUrl: 'https://picsum.photos/seed/userF/100/100' },
];

export const TeamFormationHubPage: React.FC = () => {
  return (
    <Card title="팀 구성 방식 선택">
      <p className="mb-6 text-neutral-600">프로젝트에 가장 적합한 팀 구성 방식을 선택하세요.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/team-formation/auto-dice" className="block">
          <Card className="hover:shadow-xl transition-shadow h-full">
            <h3 className="text-xl font-semibold text-primary mb-2">🎲 주사위 굴리기</h3>
            <p className="text-sm text-neutral-500">참가자를 무작위로 팀에 배정합니다. 빠르고 공정한 팀 구성에 적합합니다.</p>
          </Card>
        </Link>
        <Link to="/team-formation/auto-ladder" className="block">
          <Card className="hover:shadow-xl transition-shadow h-full">
            <h3 className="text-xl font-semibold text-primary mb-2">🪜 사다리 타기</h3>
            <p className="text-sm text-neutral-500">사다리 게임을 통해 팀을 구성합니다. 재미있고 시각적인 결과를 제공합니다.</p>
          </Card>
        </Link>
        <Link to="/team-formation/vote" className="block">
          <Card className="hover:shadow-xl transition-shadow h-full">
            <h3 className="text-xl font-semibold text-primary mb-2">🗳️ 투표 기반 분배</h3>
            <p className="text-sm text-neutral-500">선호하는 팀원이나 역할을 투표하여 팀을 구성합니다. 팀원들의 의견을 반영할 수 있습니다.</p>
          </Card>
        </Link>
        <Link to="/team-formation/admin" className="block">
          <Card className="hover:shadow-xl transition-shadow h-full">
            <h3 className="text-xl font-semibold text-primary mb-2">⚙️ 관리자 수동 분배</h3>
            <p className="text-sm text-neutral-500">관리자가 직접 팀원을 배치합니다. 특정 요구사항이나 균형을 맞출 때 유용합니다.</p>
          </Card>
        </Link>
      </div>
    </Card>
  );
};


// AutoTeamPage (Dice or Ladder)
interface AutoTeamPageProps {
  mode: 'dice' | 'ladder';
}
export const AutoTeamPage: React.FC<AutoTeamPageProps> = ({ mode }) => {
  const { currentWorkspace } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [participants, setParticipants] = useState<User[]>([]);
  const [numTeams, setNumTeams] = useState<number>(2);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleUserSelect = (user: User) => {
    setParticipants(prev =>
      prev.find(p => p.id === user.id) ? prev.filter(p => p.id !== user.id) : [...prev, user]
    );
  };
  
  const renderUserItem = (user: User, isSelected: boolean) => (
    <div className="flex items-center space-x-3">
      <img src={user.profilePictureUrl} alt={user.name} className="w-8 h-8 rounded-full" />
      <span>{user.name} ({user.mbti})</span>
      {isSelected && <span className="text-primary">✓</span>}
    </div>
  );

  const handleDistributeTeams = () => {
    if (participants.length === 0 || numTeams <= 0) {
      showToast('참가자를 선택하고 팀 수를 설정해주세요.', 'error');
      return;
    }
    if (!currentWorkspace) {
      showToast('현재 워크스페이스 정보를 가져올 수 없습니다. 다시 시도해주세요.', 'error');
      return;
    }
    setIsProcessing(true);
    setShowResults(false);
    
    // Simulate processing delay
    setTimeout(() => {
      let shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());
      const newTeamsData: TeamProject[] = Array.from({ length: numTeams }, (_, i) => ({
        id: `team-${mode}-${i + 1}-${Date.now()}`,
        workspaceId: currentWorkspace.id, // Added workspaceId
        name: `${mode === 'dice' ? '주사위' : '사다리'} 팀 ${i + 1}`,
        members: [],
        announcements: [],
        // other TeamProject fields if necessary (memberCount, progress can be calculated or set later)
      }));

      shuffledParticipants.forEach((participant, index) => {
        newTeamsData[index % numTeams].members.push(participant);
      });
      
      // Update memberCount for each team
      const finalTeams = newTeamsData.map(team => ({...team, memberCount: team.members.length}));

      setTeams(finalTeams);
      setIsProcessing(false);
      setShowResults(true);
    }, mode === 'dice' ? 1500 : 2500); // Ladder might take longer to "draw"
  };

  const DiceAnimation: React.FC = () => (
    <div className="flex justify-center items-center my-8">
      <div className="animate-bounce text-6xl">🎲</div>
      <p className="ml-4 text-xl text-neutral-600">팀을 나누고 있습니다...</p>
    </div>
  );

  const LadderAnimation: React.FC = () => (
    <div className="my-8 text-center">
      <p className="text-xl text-neutral-600 mb-4">사다리를 그리고 있습니다...</p>
      <div className="w-full h-40 bg-neutral-200 rounded-md flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪜</span>
      </div>
    </div>
  );


  return (
    <>
      <ToastContainer />
      <Card title={mode === 'dice' ? '🎲 주사위 굴리기 팀 분배' : '🪜 사다리타기 팀 분배'}>
        {!showResults ? (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">참가자 선택:</label>
            <ItemListSelector
              items={demoAvailableUsers}
              selectedItems={participants}
              onSelectItem={handleUserSelect}
              renderItem={renderUserItem}
              itemKey="id"
            />
            <p className="text-xs text-neutral-500 mt-1">{participants.length}명 선택됨</p>
          </div>
          <div className="mb-6">
            <Input 
              label="팀 수:" 
              type="number" 
              value={numTeams} 
              onChange={(e) => setNumTeams(Math.max(1, parseInt(e.target.value)))} 
              min="1" 
            />
          </div>
          <Button onClick={handleDistributeTeams} disabled={isProcessing || !currentWorkspace} className="w-full">
            {isProcessing ? '처리 중...' : '팀 분배 시작'}
          </Button>
          {isProcessing && (mode === 'dice' ? <DiceAnimation /> : <LadderAnimation />)}
        </>
      ) : (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">🎉 팀 분배 결과 🎉</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map(team => (
              <Card key={team.id} title={team.name} className="bg-neutral-50">
                {team.members.length > 0 ? (
                  <ul className="space-y-2">
                    {team.members.map(member => (
                      <li key={member.id} className="flex items-center space-x-2 p-2 bg-white rounded shadow">
                        <img src={member.profilePictureUrl} alt={member.name} className="w-8 h-8 rounded-full" />
                        <span>{member.name} ({member.mbti})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-neutral-500">팀원이 없습니다.</p>
                )}
              </Card>
            ))}
          </div>
          <Button onClick={() => setShowResults(false)} className="mt-6 w-full" variant="outline">
            다시 설정하기
          </Button>
        </div>
      )}
      </Card>
    </>
  );
};

// VoteTeamPage
export const VoteTeamPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isCreatingPoll, setIsCreatingPoll] = useState(true);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [votes, setVotes] = useState<Record<string, number>>({}); // optionId: count

  const handleAddOption = () => setPollOptions([...pollOptions, '']);
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };
  const handleRemoveOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleCreatePoll = () => {
    if (!currentWorkspace) {
        showToast("워크스페이스 정보를 찾을 수 없습니다.", 'error');
        return;
    }
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
      showToast('질문과 모든 옵션을 입력해주세요.', 'error');
      return;
    }
    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question: pollQuestion,
      options: pollOptions.map((opt, i) => ({ id: `opt-${i}`, text: opt, votes: 0 })),
      teamProjectId: currentWorkspace.id, // Context for the poll (using workspace ID as a stand-in)
    };
    setPoll(newPoll);
    setVotes(newPoll.options.reduce((acc, opt) => {
      acc[opt.id] = 0;
      return acc;
    }, {} as Record<string, number>));
    setIsCreatingPoll(false);
  };

  const handleVote = (optionId: string) => {
    if (!poll) return;
    setVotes(prev => ({ ...prev, [optionId]: (prev[optionId] || 0) + 1 }));
    // In a real app, this would be an API call and prevent multiple votes from same user if needed
  };

  if (isCreatingPoll) {
    return (
      <>
        <ToastContainer />
        <Card title="🗳️ 투표 기반 팀 분배 설정">
        <div className="space-y-4">
          <Input 
            label="투표 질문 (예: 함께하고 싶은 사람, 선호하는 역할)" 
            value={pollQuestion} 
            onChange={(e) => setPollQuestion(e.target.value)} 
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">투표 항목:</label>
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <Input 
                  value={option} 
                  onChange={(e) => handleOptionChange(index, e.target.value)} 
                  placeholder={`항목 ${index + 1}`}
                  className="flex-grow"
                />
                {pollOptions.length > 2 && (
                  <Button onClick={() => handleRemoveOption(index)} variant="ghost" size="sm" aria-label="항목 삭제">
                    <TrashIcon className="w-5 h-5 text-red-500"/>
                  </Button>
                )}
              </div>
            ))}
            <Button onClick={handleAddOption} variant="outline" size="sm" leftIcon={<PlusCircleIcon />}>항목 추가</Button>
          </div>
          <Button onClick={handleCreatePoll} className="w-full" disabled={!currentWorkspace}>투표 생성</Button>
        </div>
        </Card>
      </>
    );
  }

  if (!poll) return null; // Should not happen if !isCreatingPoll

  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <ToastContainer />
      <Card title={`투표: ${poll.question}`}>
      <div className="space-y-3 mb-6">
        {poll.options.map(option => {
          const percentage = totalVotes > 0 ? ((votes[option.id] || 0) / totalVotes) * 100 : 0;
          return (
            <div key={option.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-neutral-700">{option.text}</span>
                <span className="text-sm text-neutral-500">{votes[option.id] || 0}표 ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <Button onClick={() => handleVote(option.id)} size="sm" variant="outline" className="mt-1">
                {option.text}에 투표
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-neutral-600">총 투표 수: {totalVotes}</p>
      <Button onClick={() => setIsCreatingPoll(true)} variant="ghost" className="mt-4">새 투표 만들기</Button>
      {/* TODO: Add logic to form teams based on vote results */}
      <p className="mt-4 text-center text-neutral-500 italic">
        (실제 팀 구성 로직은 추가 구현이 필요합니다. 현재는 투표 및 결과 표시만 가능합니다.)
      </p>
      </Card>
    </>
  );
};


// AdminTeamPage
export const AdminTeamPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [users, setUsers] = useState<User[]>(demoAvailableUsers);
  
  const initialTeams: Team[] = currentWorkspace ? [
    { id: 'admin-team-1', workspaceId: currentWorkspace.id, name: '알파 팀', members: [], announcements: [] },
    { id: 'admin-team-2', workspaceId: currentWorkspace.id, name: '베타 팀', members: [], announcements: [] },
  ] : [];
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  
  const [draggedUser, setDraggedUser] = useState<User | null>(null);

  useEffect(() => { // Update teams if workspace changes or was not available initially
    if (currentWorkspace && teams.length === 0) {
        setTeams([
            { id: 'admin-team-1', workspaceId: currentWorkspace.id, name: '알파 팀', members: [], announcements: [] },
            { id: 'admin-team-2', workspaceId: currentWorkspace.id, name: '베타 팀', members: [], announcements: [] },
        ]);
    } else if (currentWorkspace && teams.length > 0 && teams.some(t => t.workspaceId !== currentWorkspace.id)) {
        // If workspace ID mismatch, re-initialize or update IDs. For simplicity, re-init here.
         setTeams([
            { id: 'admin-team-1-new', workspaceId: currentWorkspace.id, name: '알파 팀', members: [], announcements: [] },
            { id: 'admin-team-2-new', workspaceId: currentWorkspace.id, name: '베타 팀', members: [], announcements: [] },
        ]);
    }
  }, [currentWorkspace, teams]);


  const handleDragStart = (user: User) => {
    setDraggedUser(user);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (teamId: string) => {
    if (!draggedUser) return;

    // Remove from users list and current team (if any)
    setUsers(prev => prev.filter(u => u.id !== draggedUser.id));
    setTeams(prevTeams => prevTeams.map(team => ({
      ...team,
      members: team.members.filter(m => m.id !== draggedUser.id),
    })));

    // Add to new team
    setTeams(prevTeams => prevTeams.map(team =>
      team.id === teamId
        ? { ...team, members: [...team.members, draggedUser] }
        : team
    ));
    setDraggedUser(null);
  };
  
  const handleRemoveFromTeam = (userId: string, teamId: string) => {
    const userToMove = teams.find(t => t.id === teamId)?.members.find(m => m.id === userId);
    if (!userToMove) return;

    setTeams(prevTeams => prevTeams.map(team => 
      team.id === teamId 
        ? {...team, members: team.members.filter(m => m.id !== userId)}
        : team
    ));
    setUsers(prevUsers => [...prevUsers, userToMove]);
  };

  const handleAddTeam = () => {
    if (!currentWorkspace) {
        showToast("워크스페이스 정보를 먼저 로드해야 합니다.", 'error');
        return;
    }
    const newTeamName = prompt("새 팀 이름을 입력하세요:", `팀 ${teams.length + 1}`);
    if (newTeamName) {
      setTeams(prev => [...prev, { 
          id: `admin-team-${Date.now()}`, 
          workspaceId: currentWorkspace.id, // Added workspaceId
          name: newTeamName, 
          members: [], 
          announcements: [] 
        }]);
    }
  };
  
  const handleConfirmTeams = () => {
    // In a real app, send team data to backend
    showToast('팀 구성이 확정되었습니다! (콘솔에서 결과 확인)', 'success');
    console.log("확정된 팀:", teams);
  };
  
  if (!currentWorkspace) {
    return (
        <Card title="⚙️ 관리자 수동 팀 분배">
            <p>워크스페이스 정보를 불러오는 중이거나, 워크스페이스가 선택되지 않았습니다.</p>
        </Card>
    );
  }


  return (
    <>
      <ToastContainer />
      <Card title="⚙️ 관리자 수동 팀 분배">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddTeam} leftIcon={<PlusCircleIcon />} variant="outline" disabled={!currentWorkspace}>팀 추가</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Unassigned Users Column */}
        <div 
          className="bg-neutral-100 p-4 rounded-lg min-h-[200px]"
          onDragOver={handleDragOver}
          onDrop={() => { // Logic for dropping back to unassigned (optional)
            if (draggedUser && !users.find(u => u.id === draggedUser.id)) {
              setTeams(prevTeams => prevTeams.map(team => ({
                ...team,
                members: team.members.filter(m => m.id !== draggedUser.id),
              })));
              setUsers(prev => [...prev, draggedUser]);
              setDraggedUser(null);
            }
          }}
        >
          <h3 className="font-semibold text-neutral-700 mb-3 border-b pb-2">미배정 인원 ({users.length})</h3>
          <div className="space-y-2">
            {users.map(user => (
              <div
                key={user.id}
                draggable
                onDragStart={() => handleDragStart(user)}
                className="p-2 bg-white rounded shadow cursor-grab flex items-center space-x-2"
              >
                <img src={user.profilePictureUrl} alt={user.name} className="w-6 h-6 rounded-full" />
                <span>{user.name}</span>
              </div>
            ))}
             {users.length === 0 && <p className="text-sm text-neutral-500">모든 인원이 배정되었습니다.</p>}
          </div>
        </div>

        {/* Team Columns */}
        {teams.map(team => (
          <div
            key={team.id}
            className="bg-primary-light/10 p-4 rounded-lg min-h-[200px]"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(team.id)}
          >
            <h3 className="font-semibold text-primary-dark mb-3 border-b border-primary-light pb-2">{team.name} ({team.members.length}명)</h3>
            <div className="space-y-2">
              {team.members.map(member => (
                <div key={member.id} className="p-2 bg-white rounded shadow flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                    <img src={member.profilePictureUrl} alt={member.name} className="w-6 h-6 rounded-full" />
                    <span>{member.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRemoveFromTeam(member.id, team.id)} aria-label="팀에서 제거">
                    <TrashIcon className="w-4 h-4 text-red-400 hover:text-red-600"/>
                  </Button>
                </div>
              ))}
              {team.members.length === 0 && <p className="text-sm text-neutral-500">이 팀에 팀원을 드래그하세요.</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <Button onClick={handleConfirmTeams} size="lg">팀 구성 확정 및 공지</Button>
      </div>
       <p className="mt-4 text-center text-neutral-500 italic">
        (드래그 앤 드롭 기능은 기본 HTML5 API로 구현되었습니다. 실제 앱에서는 라이브러리 사용을 권장합니다.)
      </p>
      </Card>
    </>
  );
};
