import React from 'react';

interface NoSymbolIconProps {
    className?: string;
}

export const NoSymbolIcon: React.FC<NoSymbolIconProps> = ({ className = "w-6 h-6" }) => {
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
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" 
            />
        </svg>
    );
};
