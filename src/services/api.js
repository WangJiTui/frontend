import axios from "axios";

const BASE_URL = "http://localhost:8000";

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
      config.headers.Authorization = `Bearer ${token}`;
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
 * @param {string} password - 密码
 * @returns {Promise} 登录结果
 */
export const login = async (username, password) => {
  try {
    const response = await apiClient.post('/login', {
      username,
      password
    });
    
    if ((response.data.message === 'success' || response.data.message === 'manager') && response.data.token) {
      // 保存token和用户信息
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('login_user', username);
      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
        message: response.data.message // 传递消息，用于判断是否为管理员
      };
    } else {
      throw new Error('登录失败：服务器返回异常');
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
 * @param {string} password - 密码
 * @returns {Promise} 注册结果
 */
export const register = async (username, email, password) => {
  try {
    const response = await apiClient.post('/register', {
      username,
      email,
      password
    });
    
    if ((response.data.message === 'success' || response.data.message === 'manager') && response.data.token) {
      // 保存token和用户信息
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('login_user', username);
      localStorage.setItem('user_email', email);
      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
        message: response.data.message // 传递消息，用于判断是否为管理员
      };
    } else {
      throw new Error('注册失败：服务器返回异常');
    }
  } catch (error) {
    console.error('Register error:', error);
    throw new Error(error.response?.data?.message || '注册失败，请检查输入信息');
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
 * @param {Array} interviewDirections - 面试方向数组
 * @returns {Promise} 创建结果
 */
export const createInterview = async (interviewDirections) => {
  try {
    const response = await apiClient.post('/api/interview/create', {
      directions: interviewDirections
    });
    
    return {
      success: true,
      sessionId: response.data.sessionId
    };
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
    const response = await apiClient.post('/api/interview/start');
    
    return {
      success: true,
      sessionId: response.data.sessionId
    };
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
    const response = await apiClient.get('/api/interview/question');
    
    return {
      success: true,
      question: response.data.question,
      questionIndex: response.data.questionIndex,
      isEnd: response.data.isEnd || false
    };
  } catch (error) {
    console.error('Get interview question error:', error);
    throw new Error(error.response?.data?.message || '获取面试问题失败，请稍后重试');
  }
};

/**
 * 提交面试回答
 * @param {string} transcription - 语音转文字内容
 * @param {Blob} videoBlob - 录像视频文件
 * @param {number} questionIndex - 当前问题索引
 * @returns {Promise} 提交结果
 */
export const submitAnswer = async (transcription, videoBlob, questionIndex) => {
  try {
    const formData = new FormData();
    formData.append('transcription', transcription);
    formData.append('video', videoBlob, `answer_${questionIndex}_${Date.now()}.webm`);
    formData.append('questionIndex', questionIndex.toString());
    
    const response = await apiClient.post('/api/interview/question', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return {
      success: true,
      message: response.data.message
    };
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
