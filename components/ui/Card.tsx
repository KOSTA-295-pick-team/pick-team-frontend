import React, { ReactNode } from 'react';

// Card Component
interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, title, actions }) => {
  return (
    <div className={`bg-white shadow-lg rounded-xl p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-200">
          {title && <h2 className="text-xl font-semibold text-neutral-800">{title}</h2>}
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}; 