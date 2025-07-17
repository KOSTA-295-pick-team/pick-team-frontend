import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsersIcon } from "@/assets/icons";
import { Modal, Button, Input } from "@/components/ui";
import { useWorkspace } from "@/features/workspace/core/hooks/useWorkspace";
import { teamApi } from "@/features/teamspace/team/api/teamApi";
import { Team } from "@/features/teamspace/types/team";

interface TeamCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTeamCreated?: (team: Team) => void; // 팀 생성 완료 시 콜백
}

const TeamCreateModal: React.FC<TeamCreateModalProps> = ({ isOpen, onClose, onTeamCreated }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { currentWorkspace, setCurrentTeamProject } = useWorkspace();
    const navigate = useNavigate();

    const handleCloseAndReset = () => {
        setName('');
        setError('');
        setLoading(false);
        onClose();
    };

    const handleCreateTeam = async () => {
        setError('');
        
        if (!name.trim()) {
            setError('팀 이름을 입력해주세요.');
            return;
        }

        if (!currentWorkspace) {
            setError('워크스페이스 정보를 찾을 수 없습니다.');
            return;
        }

        try {
            setLoading(true);
            
            const newTeam = await teamApi.createTeam({
                name: name.trim(),
                workspaceId: currentWorkspace.id.toString(),
            });

            // 팀 생성 성공 시 콜백 호출
            if (onTeamCreated) {
                onTeamCreated(newTeam);
            }
            
            if (setCurrentTeamProject) {
                setCurrentTeamProject(newTeam);
            }

            // 생성된 팀 스페이스로 이동
            navigate(`/ws/${currentWorkspace.id}/team/${newTeam.id}`);
            handleCloseAndReset();
        } catch (err: any) {
            console.error('팀 생성 실패:', err);
            setError(err.message || '팀 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleCloseAndReset} 
            title="새 팀 만들기"
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={handleCloseAndReset} disabled={loading}>취소</Button>
                    <Button onClick={handleCreateTeam} disabled={loading || !name.trim()}>
                        {loading ? '생성 중...' : '팀 생성'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-neutral-600">
                    {currentWorkspace?.name} 워크스페이스에 새로운 팀을 만들어보세요.
                </p>
                <Input
                    label="팀 이름"
                    placeholder="예: 프론트엔드팀, 백엔드팀, 디자인팀"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    Icon={UsersIcon}
                    disabled={loading}
                    required
                    maxLength={50}
                />
                <div className="text-xs text-neutral-500">
                    <p>• 팀을 생성하면 자동으로 팀장이 됩니다.</p>
                    <p>• 워크스페이스의 다른 멤버들을 팀에 초대할 수 있습니다.</p>
                    <p>• 팀만의 칸반 보드, 게시판, 일정 관리를 사용할 수 있습니다.</p>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        </Modal>
    );
};

export default TeamCreateModal; 