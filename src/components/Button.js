/**
 * 通用按钮组件
 * 提供统一的按钮样式和交互行为
 */

import React from 'react';

/**
 * Button组件 - 通用按钮
 * @param {Object} props - 组件属性
 * @param {Function} props.onClick - 点击事件处理函数
 * @param {boolean} props.disabled - 是否禁用按钮
 * @param {string} props.label - 按钮文本标签
 * @param {string} props.className - 自定义CSS类名
 * @param {React.ReactNode} props.children - 子元素（可选，与label互斥）
 * @returns {JSX.Element} 按钮组件
 */
const Button = ({ onClick, disabled = false, label, className = '', children, ...props }) => {
  // 基础样式类
  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';
  
  // 合并自定义样式和基础样式
  const combinedClasses = `${baseClasses} ${className}`.trim();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
      {...props}
    >
      {/* 优先使用label属性，如果没有则使用children */}
      {label || children}
    </button>
  );
};

export default Button;
