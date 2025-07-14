import { useContext } from 'react';
import { WorkspaceContext, WorkspaceContextType } from '@/features/workspace/core/context/WorkspaceContext';

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace는 WorkspaceProvider 내부에서 사용해야 합니다.');
  }
  return context;
}; 