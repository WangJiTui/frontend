/**
 * 应用程序入口文件
 * 负责渲染根组件并初始化应用
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

// 获取根DOM元素
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染根组件
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// 性能监控（可选）
// 如果不需要性能监控，可以删除这行
reportWebVitals();
