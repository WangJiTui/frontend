import React from 'react';

const Button = ({ onClick, disabled = false, label, className = '', children, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';
  
  const combinedClasses = `${baseClasses} ${className}`.trim();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
      {...props}
    >
      {label || children}
    </button>
  );
};

export default Button;
