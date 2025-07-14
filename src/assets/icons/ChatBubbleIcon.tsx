import React from 'react';

export const ChatBubbleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.682-3.091c-.326-.275-.724-.386-1.118-.386H7.625c-1.136 0-2.097-.847-2.193-1.98A18.75 18.75 0 0 1 5.25 12.511V8.227c0-1.136.847-2.1 1.98-2.193.34-.027.68-.052 1.02-.072V3.75L12 6.841c.325.275.724.386 1.118.386h3.382c.884 0 1.67.284 2.25.779Z" />
  </svg>
); 