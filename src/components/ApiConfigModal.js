/**
 * API配置模态框组件
 * 用于配置后端API连接参数
 */

import React, { useState, useEffect } from 'react';
import Button from './Button';

/**
 * ApiConfigModal组件 - API配置模态框
 * 功能：
 * - 显示/隐藏API配置界面
 * - 管理API服务器地址配置
 * - 提供配置保存和重置功能
 * 
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否显示模态框
 * @param {Function} props.onClose - 关闭模态框的回调函数
 * @param {string} props.apiUrl - 当前API地址
 * @param {Function} props.onApiUrlChange - API地址变化回调函数
 */
const ApiConfigModal = ({ isOpen, onClose, apiUrl, onApiUrlChange }) => {
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl || ''); // 本地API地址状态
  const [isValid, setIsValid] = useState(true); // URL有效性状态

  /**
   * 当props中的apiUrl变化时，更新本地状态
   */
  useEffect(() => {
    setLocalApiUrl(apiUrl || '');
  }, [apiUrl]);

  /**
   * 验证URL格式
   * @param {string} url - 要验证的URL
   * @returns {boolean} 是否有效
   */
  const validateUrl = (url) => {
    if (!url.trim()) return true; // 空URL认为是有效的（使用默认值）
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * 处理API地址输入变化
   * @param {Event} e - 输入事件
   */
  const handleApiUrlChange = (e) => {
    const newUrl = e.target.value;
    setLocalApiUrl(newUrl);
    setIsValid(validateUrl(newUrl));
  };

  /**
   * 保存API配置
   * 验证URL格式并调用父组件的回调函数
   */
  const handleSave = () => {
    if (!isValid) {
      alert('请输入有效的URL地址');
      return;
    }
    
    onApiUrlChange(localApiUrl.trim());
    onClose();
  };

  /**
   * 重置API配置
   * 恢复到默认值
   */
  const handleReset = () => {
    setLocalApiUrl('');
    setIsValid(true);
  };

  /**
   * 处理模态框关闭
   * 重置本地状态
   */
  const handleClose = () => {
    setLocalApiUrl(apiUrl || '');
    setIsValid(true);
    onClose();
  };

  // 如果模态框未打开，不渲染任何内容
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">API配置</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 模态框内容 */}
        <div className="p-6">
          <div className="space-y-4">
            {/* API地址输入 */}
            <div>
              <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-2">
                API服务器地址
              </label>
              <input
                type="url"
                id="apiUrl"
                value={localApiUrl}
                onChange={handleApiUrlChange}
                placeholder="https://your-api-server.com"
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${isValid ? 'border-gray-300' : 'border-red-300 focus:ring-red-500 focus:border-red-500'}
                `}
              />
              {!isValid && (
                <p className="mt-1 text-sm text-red-600">
                  请输入有效的URL地址
                </p>
              )}
            </div>

            {/* 配置说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">配置说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 留空使用默认地址</li>
                <li>• 确保服务器支持CORS</li>
                <li>• 格式：https://your-server.com</li>
                <li>• 修改后需要重新连接</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 模态框底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            onClick={handleReset}
            label="重置"
            className="bg-gray-600 hover:bg-gray-700 text-white"
          />
          <Button
            onClick={handleClose}
            label="取消"
            className="bg-gray-600 hover:bg-gray-700 text-white"
          />
          <Button
            onClick={handleSave}
            disabled={!isValid}
            label="保存"
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default ApiConfigModal; 