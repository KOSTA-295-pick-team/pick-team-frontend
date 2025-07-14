import React from 'react';

interface RocketLaunchIconProps {
    className?: string;
}

export const RocketLaunchIcon: React.FC<RocketLaunchIconProps> = ({ className = "w-6 h-6" }) => {
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
                d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103-.212-.219-.414-.35-.6a30.119 30.119 0 00-.62-1.1c-.184-.304-.364-.597-.539-.81a25.931 25.931 0 00-.31-.42c-.003-.004-.007-.007-.01-.013a8.097 8.097 0 01-.37-.55c-.116-.18-.222-.362-.32-.528a30.25 30.25 0 01-.26-.457c-.245-.49-.37-1.017-.37-1.578a2 2 0 114 0c0 .448-.04.89-.119 1.325a19.395 19.395 0 01-.373 1.64" 
            />
        </svg>
    );
};
