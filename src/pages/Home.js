/**
 * 首页组件
 * 用户选择面试方向的入口页面
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import Button from "../components/Button";
import InterviewDirectionSelector from "../components/InterviewDirectionSelector";
import { getServerStatus, login, register, analyzeResume } from "../services/api";
import ApiConfigModal from "../components/ApiConfigModal";

/**
 * Home组件 - 应用程序首页
 * 功能：
 * - 显示面试方向选择界面
 * - 检查服务器连接状态
 * - 导航到面试页面
 * - 简历分析功能
 */
const Home = () => {
  const navigate = useNavigate();
  const [selectedDirections, setSelectedDirections] = useState([]); // 选中的面试方向
  const [serverStatus, setServerStatus] = useState(null); // 服务器连接状态
  // 检查用户是否已登录 - 验证token和用户信息
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('login_user');
    return !!(token && user);
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  
  // 简历分析相关状态
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysisResult, setShowAnalysisResult] = useState(false);
  const [analysisDirection, setAnalysisDirection] = useState(''); // 简历分析方向

  /**
   * 检查服务器连接状态
   * 在组件挂载时自动执行
   */
  useEffect(() => {
    checkServerStatus();
  }, []);

  /**
   * 检查后端服务器状态
   * 用于确定是否使用模拟模式
   */
  const checkServerStatus = async () => {
    try {
      const status = await getServerStatus();
      setServerStatus(status);
    } catch (error) {
      console.error("Server status check failed:", error);
      setServerStatus(null);
    }
  };

  /**
   * 处理面试方向选择变化
   * @param {Array} directions - 选中的面试方向数组
   */
  const handleDirectionChange = (directions) => {
    setSelectedDirections(directions);
  };

  /**
   * 开始面试
   * 验证是否选择了面试方向，然后导航到面试页面
   */
  const handleStartInterview = () => {
    if (selectedDirections.length === 0) {
      alert("请至少选择一个面试方向");
      return;
    }
    
    navigate("/interview", { state: { selectedDirections } });
  };

  /**
   * 处理登录
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('用户名和密码不能为空');
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      // 简单的密码哈希（实际项目中应使用更安全的哈希方法）
      const passwordHash = password;
      const result = await login(username, passwordHash);
      if (result.success) {
        // 检查是否为管理员（仅限预设管理员账号：admin、manager）
        // 管理员权限由后端预设，前端无法控制
        if (result.message === 'manager') {
          localStorage.setItem('user_role', 'manager');
          navigate('/admin');
          return;
        }
        
        setIsLoggedIn(true);
        setLoginError('');
      }
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理注册
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // 验证表单
    if (!username.trim() || !password.trim() || !email.trim()) {
      setLoginError('所有字段都必须填写');
      return;
    }
    
    if (password !== confirmPassword) {
      setLoginError('两次输入的密码不一致');
      return;
    }
    
    if (password.length < 6) {
      setLoginError('密码长度至少6位');
      return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('请输入有效的邮箱地址');
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      // 简单的密码哈希（实际项目中应使用更安全的哈希方法）
      const passwordHash = password;
      const result = await register(username, email, passwordHash);
      if (result.success) {
        // 检查是否为管理员（仅限预设管理员账号：admin、manager）
        // 管理员权限由后端预设，前端无法控制
        if (result.message === 'manager') {
          localStorage.setItem('user_role', 'manager');
          navigate('/admin');
          return;
        }
        
        setIsLoggedIn(true);
        setIsLoading(false);
      }
    } catch (error) {
      setLoginError(error.message);
      setIsLoading(false);
    }
  };

  /**
   * 切换登录/注册模式
   */
  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
    setLoginError('');
  };

  /**
   * 处理退出登录
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('login_user');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role'); // 清理管理员权限标识
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setSelectedDirections([]);
  };

  /**
   * 处理文件选择
   * @param {Event} event - 文件输入事件
   */
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 检查文件类型
      if (file.type !== 'application/pdf') {
        alert('请选择PDF文件');
        return;
      }
      
      // 检查文件大小（限制10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  /**
   * 处理简历分析
   */
  const handleResumeAnalysis = async () => {
    if (!selectedFile) {
      alert('请先选择PDF文件');
      return;
    }

    if (!analysisDirection.trim()) {
      alert('请输入分析方向');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const result = await analyzeResume(selectedFile, analysisDirection);
      if (result.success) {
        setAnalysisResult({
          fileName: selectedFile.name,
          fileSize: (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB',
          analysis: result.analysis,
          direction: analysisDirection
        });
        setShowAnalysisResult(true);
      }
    } catch (error) {
      console.error('简历分析失败:', error);
      alert(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 关闭分析结果弹窗
   */
  const closeAnalysisResult = () => {
    setShowAnalysisResult(false);
    setAnalysisResult(null);
    setSelectedFile(null);
    setAnalysisDirection('');
    // 清空文件输入
    const fileInput = document.getElementById('resume-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* 登录/注册卡片 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Logo和标题 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                模拟面试系统
              </h1>
              <p className="text-gray-600 mt-2">
                {isRegisterMode ? '注册开始你的面试之旅' : '登录开始你的面试之旅'}
              </p>
            </div>

            {/* 登录/注册表单 */}
            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    用户名
                  </div>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      邮箱
                    </div>
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="请输入邮箱地址"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    密码
                  </div>
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isRegisterMode ? "请输入密码（至少6位）" : "请输入密码"}
                  disabled={isLoading}
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      确认密码
                    </div>
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    disabled={isLoading}
                  />
                </div>
              )}

              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-700 text-sm">{loginError}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isRegisterMode ? '注册中...' : '登录中...'}
                  </div>
                ) : (
                  isRegisterMode ? '注册' : '登录'
                )}
              </button>
            </form>

            {/* 切换模式 */}
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
              >
                {isRegisterMode ? '已有账号？点击登录' : '没有账号？点击注册'}
              </button>
            </div>

            {/* 底部提示 */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                {isRegisterMode 
                  ? '注册后即可开始使用模拟面试系统'
                  : '提示：请使用已注册的账号登录'
                }
              </p>
            </div>
          </div>

          {/* 装饰性元素 */}
          <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 顶部导航栏 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-8 border border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">模拟面试系统</h2>
                <p className="text-sm text-gray-600">
                  欢迎，{localStorage.getItem('login_user')}
                  {localStorage.getItem('user_email') && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({localStorage.getItem('user_email')})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleLogout} 
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                退出登录
              </Button>
            </div>
          </div>
        </div>

        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            模拟面试
          </h1>
          <p className="text-xl text-gray-600">选择面试方向，开始你的模拟面试体验</p>
        </div>

        {/* 服务器状态指示器 */}
        {serverStatus?.online && (
          <div className="mb-8 p-4 bg-green-100/80 backdrop-blur-sm border border-green-300 rounded-2xl max-w-md mx-auto shadow-lg">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-800 font-medium">✓ 服务器连接正常</span>
            </div>
          </div>
        )}
        
        {serverStatus && !serverStatus.online && (
          <div className="mb-8 p-4 bg-red-100/80 backdrop-blur-sm border border-red-300 rounded-2xl max-w-md mx-auto shadow-lg">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-800 font-medium">✗ 服务器连接失败</span>
            </div>
          </div>
        )}

        {/* 面试方向选择 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            选择面试方向
          </h2>
          <InterviewDirectionSelector
            selectedDirections={selectedDirections}
            onDirectionChange={handleDirectionChange}
          />
        </div>

        {/* 开始面试按钮 */}
        <div className="text-center mb-8">
          <Button
            onClick={handleStartInterview}
            disabled={selectedDirections.length === 0}
            className={`font-bold py-4 px-12 rounded-2xl text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl ${
              selectedDirections.length > 0
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                : 'bg-gray-400 cursor-not-allowed text-white'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              开始面试
            </div>
          </Button>
        </div>

        {/* 简历分析功能 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            简历分析
          </h2>
          
          <div className="max-w-md mx-auto">
            {/* 分析方向输入框 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  分析方向
                </div>
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                value={analysisDirection}
                onChange={(e) => setAnalysisDirection(e.target.value)}
                placeholder="例如：前端工程师、Java工程师、产品经理等"
                disabled={isAnalyzing}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  选择简历文件（PDF格式，最大10MB）
                </div>
              </label>
              
              <div className="relative">
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="resume-upload"
                  className="w-full flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-gray-600">
                      {selectedFile ? selectedFile.name : '点击选择PDF文件或拖拽到此处'}
                    </p>
                    {selectedFile && (
                      <p className="text-sm text-gray-500 mt-1">
                        文件大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={handleResumeAnalysis}
                disabled={!selectedFile || !analysisDirection.trim() || isAnalyzing}
                className={`font-bold py-3 px-8 rounded-xl text-base transition-all duration-200 transform hover:scale-105 shadow-lg ${
                  selectedFile && analysisDirection.trim() && !isAnalyzing
                    ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white'
                    : 'bg-gray-400 cursor-not-allowed text-white'
                }`}
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    分析中...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    开始分析
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">系统功能</h3>
          <div className="grid md:grid-cols-2 gap-4 text-blue-800">
            <div>
              <h4 className="font-medium mb-2">🎯 智能问答</h4>
              <p className="text-sm">根据面试方向提供专业问题，模拟真实面试场景</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🎤 语音识别</h4>
              <p className="text-sm">支持实时语音转文字，让面试更自然流畅</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📊 实时反馈</h4>
              <p className="text-sm">提供即时的回答分析和改进建议</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📹 视频录制</h4>
              <p className="text-sm">录制面试过程，便于后续回顾和分析</p>
            </div>
          </div>
        </div>
      </div>

      {/* API配置模态框 */}
      <ApiConfigModal
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        apiUrl={apiUrl}
        onApiUrlChange={setApiUrl}
      />

      {/* 简历分析结果弹窗 */}
      {showAnalysisResult && analysisResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 弹窗标题 */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">简历分析结果</h3>
                <button
                  onClick={closeAnalysisResult}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 文件信息 */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">文件信息</h4>
                <p className="text-sm text-gray-600">文件名: {analysisResult.fileName}</p>
                <p className="text-sm text-gray-600">文件大小: {analysisResult.fileSize}</p>
              </div>

              {/* 分析结果网格 */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 技能分析 */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    核心技能
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.analysis.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    基本信息
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">工作经验:</span> {analysisResult.analysis.experience}
                    </p>
                    <p className="text-sm text-green-800">
                      <span className="font-medium">教育背景:</span> {analysisResult.analysis.education}
                    </p>
                  </div>
                </div>

                {/* 优势分析 */}
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    核心优势
                  </h4>
                  <ul className="space-y-2">
                    {analysisResult.analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-purple-800 flex items-start">
                        <svg className="w-4 h-4 mr-2 mt-0.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 改进建议 */}
                <div className="bg-orange-50 rounded-xl p-4">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    改进建议
                  </h4>
                  <ul className="space-y-2">
                    {analysisResult.analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-orange-800 flex items-start">
                        <svg className="w-4 h-4 mr-2 mt-0.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 推荐职位 */}
              <div className="bg-indigo-50 rounded-xl p-4 mt-6">
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h.01" />
                  </svg>
                  推荐职位
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.recommendedPositions.map((position, index) => (
                    <span key={index} className="px-4 py-2 bg-indigo-200 text-indigo-800 rounded-full text-sm font-medium">
                      {position}
                    </span>
                  ))}
                </div>
              </div>

              {/* 底部操作按钮 */}
              <div className="flex justify-end mt-6 space-x-3">
                <Button
                  onClick={closeAnalysisResult}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  关闭
                </Button>
                <Button
                  onClick={() => {
                    // 这里可以添加下载报告功能
                    alert('下载功能待实现');
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all"
                >
                  下载报告
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
