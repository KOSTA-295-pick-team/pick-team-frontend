import React from 'react';

interface TableCellsIconProps {
    className?: string;
}

export const TableCellsIcon: React.FC<TableCellsIconProps> = ({ className = "w-6 h-6" }) => {
    return (
        <svg 
            className={className} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10zm8-10v20m5-20v20M8 7v10m0 0v3m0-3h10m0 0v3" 
            />
        </svg>
    );
};
