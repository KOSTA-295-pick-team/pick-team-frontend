import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from '../ui';
import { ArrowLeftIcon } from '../icons';
import { ItemListSelector } from '../complex';
import { TeamProject } from '../../types';
import { useAuth } from '../../AuthContext';

interface TeamActionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TeamActionModal: React.FC<TeamActionModalProps> = ({ isOpen, onClose }) => {
    const { currentWorkspace, setCurrentTeamProject } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<'initial' | 'joinList'>('initial');
    const [selectedTeamToJoin, setSelectedTeamToJoin] = useState<TeamProject | null>(null);

    const availableTeamsToJoin = useMemo(() => {
        if (!currentWorkspace) return [];
        // 목업 데이터 제거 - 실제 API에서 팀 목록을 가져와야 함
        return []; // MOCK_TEAM_PROJECTS_APP 대신 빈 배열
    }, [currentWorkspace]);

    const handleCloseAndReset = () => {
        onClose();
        setStep('initial');
        setSelectedTeamToJoin(null);
    };

    const handleJoinTeam = () => {
        if (selectedTeamToJoin && currentWorkspace) {
            alert(`${selectedTeamToJoin.name} 팀에 참여했습니다! (목업)`);
            setCurrentTeamProject(selectedTeamToJoin); // Set context for joined team
            navigate(`/ws/${currentWorkspace.id}/team/${selectedTeamToJoin.id}`);
            handleCloseAndReset();
        } else {
            alert("팀을 선택해주세요 또는 워크스페이스 정보가 없습니다.");
        }
    };

    const renderTeamItem = (team: TeamProject, isSelected: boolean) => (
      <div className="flex items-center justify-between">
        <span>{team.name} <span className="text-xs text-neutral-500">({team.memberCount || 0}명)</span></span>
        {isSelected && <span className="text-primary">✓</span>}
      </div>
    );
    
    let modalTitle = "팀 생성 또는 참여";
    let modalFooter;
    let modalContent;

    if (step === 'initial') {
        modalFooter = (
            <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={handleCloseAndReset}>취소</Button>
            </div>
        );
        modalContent = (
            <div className="space-y-3">
                <Button 
                    className="w-full" 
                    onClick={() => { navigate('/team-formation'); handleCloseAndReset(); }}
                >
                    새 팀 만들기
                </Button>
                <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => setStep('joinList')}
                    disabled={!currentWorkspace || availableTeamsToJoin.length === 0}
                >
                    기존 팀 참여하기
                </Button>
                {(!currentWorkspace || availableTeamsToJoin.length === 0) && (
                    <p className="text-xs text-neutral-500 text-center">현재 워크스페이스에 참여할 수 있는 팀이 없습니다.</p>
                )}
            </div>
        );
    } else { // step === 'joinList'
        modalTitle = "기존 팀에 참여하기";
        modalFooter = (
            <div className="flex justify-between w-full">
                <Button variant="ghost" onClick={() => { setStep('initial'); setSelectedTeamToJoin(null); }} leftIcon={<ArrowLeftIcon className="w-4 h-4"/>}>
                    뒤로
                </Button>
                <div className="space-x-2">
                    <Button variant="ghost" onClick={handleCloseAndReset}>취소</Button>
                    <Button onClick={handleJoinTeam} disabled={!selectedTeamToJoin}>참여하기</Button>
                </div>
            </div>
        );
        modalContent = (
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">참여할 팀 선택:</label>
                <ItemListSelector
                    items={availableTeamsToJoin}
                    selectedItems={selectedTeamToJoin ? [selectedTeamToJoin] : []}
                    onSelectItem={(item: TeamProject) => setSelectedTeamToJoin(item)}
                    renderItem={renderTeamItem}
                    itemKey="id"
                />
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