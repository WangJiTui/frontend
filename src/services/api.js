import axios from "axios";

const BASE_URL = "http://localhost:8080";

// 创建axios实例
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5分钟超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token到请求头
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.token = token; // 使用token字段而不是Authorization
    }
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log(`Response received from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并重定向到登录
      localStorage.removeItem('token');
      localStorage.removeItem('login_user');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_role'); // 清理管理员权限标识
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} passwordHash - 密码哈希
 * @returns {Promise} 登录结果
 */
export const login = async (username, passwordHash) => {
  try {
    const response = await apiClient.post('/api/student/login', {
      username,
      passwordHash,
      email: null,
      role: null,
      createdAt: null
    });
    
    // 处理统一的Result格式响应
    if (response.data.code === 200 && response.data.data?.token) {
      // 保存token和用户信息
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('login_user', username);
      return {
        success: true,
        token: response.data.data.token,
        user: response.data.data.user,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || '登录失败：服务器返回异常');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.response?.data?.message || '登录失败，请检查用户名和密码');
  }
};

/**
 * 用户注册
 * @param {string} username - 用户名
 * @param {string} email - 邮箱地址
 * @param {string} passwordHash - 密码哈希
 * @returns {Promise} 注册结果
 */
export const register = async (username, email, passwordHash) => {
  try {
    console.log('发送注册请求:', { username, email, passwordHash });
    
    const response = await apiClient.post('/api/student/regist', {
      username,
      passwordHash,
      email,
      role: null,
      createdAt: null
    });
    
    console.log('注册响应:', response.data);
    
    // 处理统一的Result格式响应
    if (response.data.code === 200 && response.data.data?.token) {
      // 保存token和用户信息
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('login_user', username);
      localStorage.setItem('user_email', email);
      return {
        success: true,
        token: response.data.data.token,
        user: response.data.data.user,
        message: response.data.message
      };
    } else {
      console.error('注册失败，响应格式不正确:', response.data);
      throw new Error(response.data.message || '注册失败：服务器返回异常');
    }
  } catch (error) {
    console.error('Register error详细信息:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    
    // 更详细的错误处理
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      throw new Error('网络连接失败，请检查后端服务是否启动在8080端口');
    }
    
    if (error.response?.status === 404) {
      throw new Error('接口不存在，请检查后端接口路径是否正确');
    }
    
    if (error.response?.status === 500) {
      throw new Error('服务器内部错误: ' + (error.response?.data?.message || '未知错误'));
    }
    
    throw new Error(error.response?.data?.message || error.message || '注册失败，请检查输入信息');
  }
};

/**
 * 检查学号是否存在
 * @param {string} userName - 用户名/学号
 * @returns {Promise} 检查结果
 */
export const checkStudentNumber = async (userName) => {
  try {
    const response = await apiClient.post(`/api/student/checkStudentNumber?userName=${encodeURIComponent(userName)}`);
    
    return {
      success: response.data.code === 200,
      exists: response.data.data?.exists || false,
      message: response.data.message
    };
  } catch (error) {
    console.error('Check student number error:', error);
    throw new Error(error.response?.data?.message || '检查学号失败，请稍后重试');
  }
};

/**
 * 获取用户信息
 * @returns {Promise} 用户信息
 */
export const getUserInfo = async () => {
  try {
    const response = await apiClient.get('/api/student/getUserInfo');
    
    if (response.data.code === 200) {
      return {
        success: true,
        user: response.data.data
      };
    } else {
      throw new Error(response.data.message || '获取用户信息失败');
    }
  } catch (error) {
    console.error('Get user info error:', error);
    throw new Error(error.response?.data?.message || '获取用户信息失败，请稍后重试');
  }
};

/**
 * 简历分析
 * @param {File} pdfFile - PDF简历文件
 * @param {string} direction - 分析方向
 * @returns {Promise} 分析结果
 */
export const analyzeResume = async (pdfFile, direction) => {
  try {
    const formData = new FormData();
    formData.append('resume', pdfFile);
    formData.append('direction', direction);
    
    const response = await apiClient.post('/analyze-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return {
      success: true,
      analysis: response.data
    };
  } catch (error) {
    console.error('Resume analysis error:', error);
    throw new Error(error.response?.data?.message || '简历分析失败，请稍后重试');
  }
};

/**
 * 创建面试会话
 * @param {string} position - 职位名称
 * @param {File} resume_file - 简历文件
 * @param {File} job_file - 职位描述文件
 * @returns {Promise} 创建结果
 */
export const createInterview = async (position, resume_file, job_file) => {
  try {
    const formData = new FormData();
    formData.append('resume_file', resume_file);
    formData.append('job_file', job_file);
    
    const response = await apiClient.post(`/api/interviews/create?position=${encodeURIComponent(position)}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.code === 200) {
      return {
        success: true,
        sessionId: response.data.data?.sessionId,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || '创建面试会话失败');
    }
  } catch (error) {
    console.error('Create interview error:', error);
    throw new Error(error.response?.data?.message || '创建面试会话失败，请稍后重试');
  }
};

/**
 * 开始面试 - 正式开始面试
 * @returns {Promise} 开始结果
 */
export const startInterview = async () => {
  try {
    const response = await apiClient.post('/api/interviews/start');
    
    if (response.data.code === 200) {
      return {
        success: true,
        sessionId: response.data.data?.sessionId,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || '开始面试失败');
    }
  } catch (error) {
    console.error('Start interview error:', error);
    throw new Error(error.response?.data?.message || '开始面试失败，请稍后重试');
  }
};

/**
 * 获取面试问题
 * @returns {Promise} 问题内容
 */
export const getInterviewQuestion = async () => {
  try {
    const response = await apiClient.get('/api/interviews/question');
    
    if (response.data.code === 200) {
      return {
        success: true,
        question: response.data.data?.question,
        questionIndex: response.data.data?.questionIndex,
        isEnd: response.data.data?.isEnd || false,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || '获取面试问题失败');
    }
  } catch (error) {
    console.error('Get interview question error:', error);
    throw new Error(error.response?.data?.message || '获取面试问题失败，请稍后重试');
  }
};

/**
 * 提交面试回答
 * @param {Blob} videoFile - 录像视频文件
 * @returns {Promise} 提交结果
 */
export const submitAnswer = async (videoFile) => {
  try {
    const formData = new FormData();
    formData.append('videoFile', videoFile);
    
    const response = await apiClient.post('/api/interviews/question', formData, {
      // 不设置Content-Type，让浏览器自动设置multipart/form-data和boundary
    });
    
    if (response.data.code === 200) {
      return {
        success: true,
        message: response.data.message,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.message || '提交回答失败');
    }
  } catch (error) {
    console.error('Submit answer error:', error);
    throw new Error(error.response?.data?.message || '提交回答失败，请稍后重试');
  }
};

/**
 * 获取面试总结
 * @param {string} sessionId - 面试会话ID
 * @returns {Promise} 面试总结和建议
 */
export const getInterviewSummary = async (sessionId) => {
  try {
    const response = await apiClient.get(`/interview/summary/${sessionId}`);
    
    return {
      success: true,
      summary: response.data
    };
  } catch (error) {
    console.error('Get interview summary error:', error);
    throw new Error(error.response?.data?.message || '获取面试总结失败，请稍后重试');
  }
};

/**
 * 检查服务器状态
 * @returns {Promise} 服务器状态
 */
export const getServerStatus = async () => {
  try {
    const response = await apiClient.get('/health');
    return {
      online: true,
      status: response.data
    };
  } catch (error) {
    console.error('Server status check failed:', error);
    return {
      online: false,
      error: error.message
    };
  }
};

/**
 * 设置API基础URL
 * @param {string} url - 新的基础URL
 */
export const setApiBaseUrl = (url) => {
  apiClient.defaults.baseURL = url;
  console.log(`API base URL updated to: ${url}`);
};

/**
 * 获取当前API基础URL
 * @returns {string} 当前基础URL
 */
export const getCurrentApiBaseUrl = () => {
  return apiClient.defaults.baseURL;
};

// 导出axios实例供其他地方使用
export { apiClient };
