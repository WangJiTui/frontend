import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import Button from "../components/Button";
import InterviewDirectionSelector from "../components/InterviewDirectionSelector";
import { login, register } from "../services/api";
import ApiConfigModal from "../components/ApiConfigModal";

const Home = () => {
  const navigate = useNavigate();
  const [selectedDirections, setSelectedDirections] = useState([]);

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
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');

  const handleDirectionChange = (directions) => {
    setSelectedDirections(directions);
  };

  const handleStartInterview = () => {
    if (!jobDescription.trim()) {
      alert("请先输入职位描述或简历分析方向");
      return;
    }
    
    if (selectedDirections.length === 0) {
      alert("请至少选择一个面试方向");
      return;
    }
    
    if (!selectedFile) {
      alert("请先上传简历文件（PDF格式）");
      return;
    }
    
    navigate("/interview", { 
      state: { 
        selectedDirections,
        resumeFile: selectedFile,
        jobDescription: jobDescription.trim()
      } 
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('用户名和密码不能为空');
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    setSuccessMessage('');
    
    try {
      const passwordHash = password;
      const result = await login(username, passwordHash);
      if (result.success) {
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

  const handleRegister = async (e) => {
    e.preventDefault();
    
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
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('请输入有效的邮箱地址');
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    setSuccessMessage('');
    
    try {
      const passwordHash = password;
      const result = await register(username, email, passwordHash);
      if (result.success) {
        if (result.message === 'manager') {
          localStorage.setItem('user_role', 'manager');
          navigate('/admin');
          return;
        }
        
        setSuccessMessage('注册成功！正在为您登录...');
        setIsLoading(false);
        
        setTimeout(() => {
          setIsLoggedIn(true);
          setSuccessMessage('');
        }, 2000);
      }
    } catch (error) {
      setLoginError(error.message);
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
    setLoginError('');
    setSuccessMessage('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('login_user');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setSelectedDirections([]);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('请选择PDF文件');
        event.target.value = '';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        event.target.value = '';
        return;
      }

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('文件扩展名必须为.pdf');
        event.target.value = '';
        return;
      }

      if (file.size === 0) {
        alert('选择的文件为空，请选择有效的PDF文件');
        event.target.value = '';
        return;
      }
      
      setSelectedFile(file);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">模拟面试系统</h1>
              <p className="text-gray-600">
                {isRegisterMode ? '创建新账户' : '登录您的账户'}
              </p>
            </div>

            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
                  placeholder="请输入用户名"
                  required
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
                    placeholder="请输入邮箱地址"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
                  placeholder="请输入密码"
                  required
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
                    placeholder="请再次输入密码"
                    required
                  />
                </div>
              )}

              {loginError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                  {loginError}
                </div>
              )}

              {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                  {successMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '处理中...' : (isRegisterMode ? '注册' : '登录')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                {isRegisterMode ? '已有账户？点击登录' : '没有账户？点击注册'}
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowApiConfig(true)}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors duration-200"
              >
                API配置
              </button>
            </div>
          </div>
        </div>

        {showApiConfig && (
          <ApiConfigModal
            onClose={() => setShowApiConfig(false)}
            currentUrl={apiUrl}
            onSave={(url) => {
              setApiUrl(url);
              setShowApiConfig(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">模拟面试系统</h1>
                <p className="text-sm text-gray-600">欢迎回来，{localStorage.getItem('login_user')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/admin')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                管理页面
              </Button>
              <Button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            模拟面试
          </h1>
          <p className="text-xl text-gray-600">选择面试方向，开始你的模拟面试体验</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            简历分析方向
          </h2>
          
          <div className="max-w-lg mx-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  请输入职位描述或简历分析方向
                </div>
              </label>
              
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="请输入您要分析的职位要求、岗位描述或技能要求。例如：
前端工程师
要求：
1. 熟练掌握React、Vue等前端框架
2. 具备良好的JavaScript基础
3. 了解TypeScript、Webpack等工具
4. 有移动端开发经验者优先
..."
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none"
                rows={8}
              />
              
              {jobDescription.trim() && (
                <div className="mt-3 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2">
                  <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      已输入 {jobDescription.trim().length} 个字符
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            上传简历文件
          </h2>
          
          <div className="max-w-lg mx-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  请选择简历文件（PDF格式，最大10MB）
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
                  className="w-full flex items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-lg text-gray-600 font-medium mb-2">
                      {selectedFile ? selectedFile.name : '点击选择PDF文件或拖拽到此处'}
                    </p>
                    {selectedFile ? (
                      <div className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2 inline-block">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          已选择文件 - {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        支持PDF格式，用于面试时进行简历分析
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            选择面试方向
          </h2>
          <InterviewDirectionSelector
            selectedDirections={selectedDirections}
            onDirectionChange={handleDirectionChange}
          />
        </div>

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
      </div>
    </div>
  );
};

export default Home;
