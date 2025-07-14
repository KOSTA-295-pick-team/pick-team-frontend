import React, { forwardRef } from 'react';

// TextArea Component
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, name, error, className, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={name} className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>}
      <textarea
        id={name}
        name={name}
        ref={ref}
        rows={3}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-neutral-400 focus:outline-none sm:text-sm ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-neutral-300 focus:ring-primary focus:border-primary'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

TextArea.displayName = 'TextArea'; 