import React, { ReactNode } from 'react';
import { XMarkIcon } from '../icons';

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]}`}>
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-neutral-200">
          <h3 className="text-lg sm:text-xl font-semibold text-neutral-800">{title}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
            <XMarkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>
        <div className="p-4 sm:p-5 text-neutral-600">{children}</div>
        {footer && <div className="flex justify-end space-x-3 p-4 sm:p-5 border-t border-neutral-200">{footer}</div>}
      </div>
    </div>
  );
}; 