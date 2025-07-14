import React from 'react';

export const CogIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0H3.75m16.5 0c.071 0 .142.002.21.006M12 2.25a8.975 8.975 0 0 0-2.036.335A7.46 7.46 0 0 1 12 2.25Zm0 0a8.975 8.975 0 0 1 2.036.335A7.46 7.46 0 0 0 12 2.25Zm0 19.5a8.975 8.975 0 0 0 2.036-.335A7.46 7.46 0 0 1 12 21.75Zm0 0a8.975 8.975 0 0 1-2.036-.335A7.46 7.46 0 0 0 12 21.75Zm-9.75-6.375A7.46 7.46 0 0 1 2.25 12Zm0 0a7.46 7.46 0 0 0-.036 2.036A8.975 8.975 0 0 1 2.25 12Zm19.5 0a7.46 7.46 0 0 0 .036 2.036A8.975 8.975 0 0 0 21.75 12Zm0 0a7.46 7.46 0 0 1 .036-2.036A8.975 8.975 0 0 1 21.75 12Z" />
  </svg>
); 