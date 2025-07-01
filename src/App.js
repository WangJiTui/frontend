
/**
 * 应用程序根组件
 * 负责路由配置和整体布局
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import Summary from './pages/Summary';
import Admin from './pages/Admin';
/**
 * App组件 - 应用程序的主入口
 * 配置了三个主要路由：
 * - /: 首页，用于选择面试方向
 * - /interview: 面试页面，进行模拟面试
 * - /summary: 总结页面，显示面试反馈
 */
function App() {
  return (
    <div className="App">
      <Routes>
        {/* 首页路由 - 面试方向选择 */}
        <Route path="/" element={<Home />} />
        
        {/* 面试页面路由 - 模拟面试进行 */}
        <Route path="/interview" element={<Interview />} />
        
        {/* 总结页面路由 - 面试结果反馈 */}
        <Route path="/summary" element={<Summary />} />
        
        {/* 管理员页面路由 - 系统管理 */}
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </div>
  );
}

export default App;
