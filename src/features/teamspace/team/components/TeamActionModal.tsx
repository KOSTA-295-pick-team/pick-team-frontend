import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from '@/components/ui';
import { ArrowLeftIcon } from '@/assets/icons';
import { ItemListSelector } from '@/components/complex';
import { Team } from '@/features/teamspace/types/team';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { teamApi } from '@/features/teamspace/team/api/teamApi';

interface TeamActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialStep?: 'teamAction' | 'createTeam' | 'joinList'; // 초기 단계 설정 prop 추가
}

const TeamActionModal: React.FC<TeamActionModalProps> = ({ isOpen, onClose, initialStep = 'teamAction' }) => {
    const { currentUser } = useAuth();
    const { currentWorkspace } = useWorkspace();
    const navigate = useNavigate();
    const [step, setStep] = useState<'teamAction' | 'createTeam' | 'joinList'>(initialStep);
    const [selectedTeamToJoin, setSelectedTeamToJoin] = useState<Team | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);
    
    // 팀 생성 폼 상태
    const [teamName, setTeamName] = useState('');
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);

    const availableTeamsToJoin = useMemo(() => {
        if (!currentWorkspace || !currentUser) return [];
        
        // 현재 사용자가 이미 참여하지 않은 팀만 필터링
        return teams.filter((_team) => {
            // NOTE: 백엔드에서 멤버 목록을 포함하여 팀 정보를 제공하지 않으므로, 이 로직은 실제 동작하지 않을 수 있음
            // 클라이언트 측에서 멤버십을 확인할 수 없는 경우, 모든 팀이 참여 가능하게 보일 수 있음
            // 추후 백엔드 API가 팀 멤버 정보를 함께 반환하도록 수정하거나,
            // 또는 각 팀의 멤버 목록을 별도로 조회하는 로직이 필요함
            return true; 
        });
    }, [currentWorkspace, teams, currentUser]);

    // 팀 목록 로드
    const loadTeams = async () => {
        if (!currentWorkspace || !isOpen) return;
        
        setIsLoadingTeams(true);
        
        try {
            const teamList = await teamApi.getTeams(currentWorkspace.id);
            setTeams(teamList);
        } catch (error: any) {
            console.error('팀 목록 로드 실패:', error);
            setTeams([]);
        } finally {
            setIsLoadingTeams(false);
        }
    };

    // 모달이 열릴 때마다 팀 목록 로드하고 초기 step 설정
    useEffect(() => {
        if (isOpen && currentWorkspace) {
            setStep(initialStep);
            loadTeams();
        }
    }, [isOpen, currentWorkspace, initialStep]);

    const handleCloseAndReset = () => {
        onClose();
        setStep(initialStep);
        setSelectedTeamToJoin(null);
        setTeamName('');
    };

    const handleCreateTeam = async () => {
        if (!teamName.trim() || !currentWorkspace) {
            alert("팀 이름을 입력해주세요.");
            return;
        }

        try {
            setIsCreatingTeam(true);
            const newTeam = await teamApi.createTeam({
                workspaceId: currentWorkspace.id,
                name: teamName.trim(),
            });
            alert(`${newTeam.name} 팀이 생성되었습니다!`);
            // setCurrentTeamProject(newTeam); // 컨텍스트 업데이트는 Workspace/Team 페이지에서 처리
            navigate(`/ws/${currentWorkspace.id}/team/${newTeam.id}`);
            handleCloseAndReset();
        } catch (error: any) {
            console.error('팀 생성 실패:', error);
            alert(error.response?.data?.detail || error.message || '팀 생성에 실패했습니다.');
        } finally {
            setIsCreatingTeam(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!selectedTeamToJoin || !currentWorkspace || !currentUser) {
            alert("팀을 선택해주세요 또는 워크스페이스 정보가 없습니다.");
            return;
        }

        try {
            await teamApi.addMember(String(selectedTeamToJoin.id), String(currentUser.id));
            alert(`${selectedTeamToJoin.name} 팀에 참여했습니다!`);
            // setCurrentTeamProject(selectedTeamToJoin); // 컨텍스트 업데이트는 Workspace/Team 페이지에서 처리
            navigate(`/ws/${currentWorkspace.id}/team/${selectedTeamToJoin.id}`);
            handleCloseAndReset();
        } catch (error: any) {
            console.error('팀 참여 실패:', error);
            
            // 500 에러와 에러 메시지를 확인하여 적절한 메시지로 변환
            if (error.response?.status === 500) {
                const errorDetail = error.response?.data?.detail;
                if (errorDetail && errorDetail.includes('이미 팀의 멤버입니다')) {
                    alert('이미 참여된 팀입니다.');
                    return;
                }
            }
            
            // 기타 에러 처리
            if (error.response?.data?.detail) {
                alert(error.response.data.detail);
            } else if (error.message) {
                alert(error.message);
            } else {
                alert('팀 참여에 실패했습니다.');
            }
        }
    };

    const renderTeamItem = (team: Team, isSelected: boolean) => (
      <div className="flex items-center justify-between">
        <span>{team.name} <span className="text-xs text-neutral-500">({team.memberCount || 0}명)</span></span>
        {isSelected && <span className="text-primary">✓</span>}
      </div>
    );
    
    let modalTitle = "팀 관리";
    let modalFooter;
    let modalContent;

    if (step === 'teamAction') {
        modalTitle = "팀 생성 또는 참여";
        modalFooter = (
            <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={handleCloseAndReset}>취소</Button>
            </div>
        );
        modalContent = (
            <div className="space-y-3">
                <Button 
                    className="w-full" 
                    onClick={() => setStep('createTeam')}
                >
                    새 팀 만들기
                </Button>
                <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => setStep('joinList')}
                    disabled={!currentWorkspace || isLoadingTeams || availableTeamsToJoin.length === 0}
                >
                    {isLoadingTeams ? '팀 목록 로딩 중...' : '기존 팀 참여하기'}
                </Button>
                {(!currentWorkspace || (availableTeamsToJoin.length === 0 && !isLoadingTeams)) && (
                    <p className="text-xs text-neutral-500 text-center">현재 워크스페이스에 참여할 수 있는 팀이 없습니다.</p>
                )}
            </div>
        );
    } else if (step === 'createTeam') {
        modalTitle = "새 팀 만들기";
        modalFooter = (
            <div className="flex justify-between w-full">
                <Button variant="ghost" onClick={() => setStep('teamAction')} leftIcon={<ArrowLeftIcon className="w-4 h-4"/>}>
                    뒤로
                </Button>
                <div className="flex space-x-2">
                    <Button variant="ghost" onClick={handleCloseAndReset}>취소</Button>
                    <Button onClick={handleCreateTeam} disabled={!teamName.trim() || isCreatingTeam}>
                        {isCreatingTeam ? '생성 중...' : '팀 생성'}
                    </Button>
                </div>
            </div>
        );
        modalContent = (
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                        {currentWorkspace?.name} 워크스페이스에 새로운 팀을 만들어보세요.
                    </h3>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        팀 이름
                    </label>
                    <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="예: 프론트엔드팀, 백엔드팀, 디자인팀"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={isCreatingTeam}
                    />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="text-sm text-blue-700 space-y-1">
                        <p>• 팀을 생성하면 자동으로 팀장이 됩니다.</p>
                        <p>• 워크스페이스의 다른 멤버들을 팀에 초대할 수 있습니다.</p>
                        <p>• 팀만의 칸반 보드, 게시판, 일정 관리를 사용할 수 있습니다.</p>
                    </div>
                </div>
            </div>
        );
    } else { // step === 'joinList'
        modalTitle = "기존 팀에 참여하기";
        modalFooter = (
            <div className="flex justify-between w-full">
                <Button variant="ghost" onClick={() => { setStep('teamAction'); setSelectedTeamToJoin(null); }} leftIcon={<ArrowLeftIcon className="w-4 h-4"/>}>
                    뒤로
                </Button>
                <div className="flex space-x-2">
                    <Button variant="ghost" onClick={handleCloseAndReset}>취소</Button>
                    <Button onClick={handleJoinTeam} disabled={!selectedTeamToJoin}>참여하기</Button>
                </div>
            </div>
        );
        modalContent = (
            <div>
                {isLoadingTeams ? (
                    <div className="text-center py-4">팀 목록을 불러오는 중...</div>
                ) : availableTeamsToJoin.length === 0 ? (
                    <div className="text-center py-4 text-neutral-500">참여할 수 있는 팀이 없습니다.</div>
                ) : (
                    <>
                <label className="block text-sm font-medium text-neutral-700 mb-1">참여할 팀 선택:</label>
                <ItemListSelector
                    items={availableTeamsToJoin}
                    selectedItems={selectedTeamToJoin ? [selectedTeamToJoin] : []}
                    onSelectItem={(item: Team) => setSelectedTeamToJoin(item)}
                    renderItem={renderTeamItem}
                    itemKey="id"
                />
                    </>
                )}
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={handleCloseAndReset} title={modalTitle} footer={modalFooter}>
            {modalContent}
        </Modal>
    );
};

export default TeamActionModal; 