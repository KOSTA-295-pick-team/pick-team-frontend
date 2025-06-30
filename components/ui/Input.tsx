import React from 'react';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  Icon?: React.ElementType;
}

export const Input: React.FC<InputProps> = ({ label, name, error, Icon, type="text", className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={name} className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>}
      <div className="relative">
        {Icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon className="h-5 w-5 text-neutral-400" /></div>}
        <input
          id={name}
          name={name}
          type={type}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-neutral-400 focus:outline-none sm:text-sm ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-neutral-300 focus:ring-primary focus:border-primary'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}; 