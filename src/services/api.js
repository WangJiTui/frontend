import axios from "axios";
import * as mockApi from './mockApi';

// 开发模式配置 - 设置为 true 使用模拟API，false 使用真实后端
const USE_MOCK_API = true;

const BASE_URL = "http://localhost:8080";

// 创建axios实例
const realApiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5分钟超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token到请求头
realApiClient.interceptors.request.use(
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
realApiClient.interceptors.response.use(
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
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.login(username, passwordHash);
  }

  try {
    const response = await realApiClient.post('/api/student/login', {
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
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.register(username, email, passwordHash);
  }

  try {
    console.log('发送注册请求:', { username, email, passwordHash });
    
    const response = await realApiClient.post('/api/student/regist', {
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
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.checkStudentNumber(userName);
  }

  try {
    const response = await realApiClient.post(`/api/student/checkStudentNumber?userName=${encodeURIComponent(userName)}`);
    
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
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.getUserInfo();
  }

  try {
    const response = await realApiClient.get('/api/student/getUserInfo');
    
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
 * 创建面试会话
 * @param {string} position - 职位名称
 * @param {File} resume_file - 简历文件
 * @param {File} job_file - 职位描述文件
 * @returns {Promise} 创建结果
 */
export const createInterview = async (position, resume_file, job_file) => {
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.createInterview(position, resume_file, job_file);
  }

  try {
    const formData = new FormData();
    formData.append('resume_file', resume_file);
    formData.append('job_file', job_file);
    
    // 验证FormData内容
    console.log('FormData 验证:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, {
        valueType: typeof value,
        isFile: value instanceof File,
        isBlob: value instanceof Blob,
        name: value?.name || '(no name)',
        size: value?.size || '(no size)',
        type: value?.type || '(no type)',
        constructor: value?.constructor?.name
      });
    }
    
    // 额外验证：尝试读取job_file内容
    const job_file_from_formdata = formData.get('job_file');
    if (job_file_from_formdata instanceof File) {
      console.log('从FormData获取的job_file确实是File对象');
      const reader = new FileReader();
      reader.onload = function(e) {
        console.log('FormData中job_file的内容:', e.target.result.substring(0, 100));
      };
      reader.readAsText(job_file_from_formdata);
    } else {
      console.error('警告：从FormData获取的job_file不是File对象!', typeof job_file_from_formdata);
    }
    
    const response = await realApiClient.post(`/api/interviews/create?position=${encodeURIComponent(position)}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('createInterview响应:', response.data);
    console.log('create data类型:', typeof response.data.data);
    console.log('create data内容:', response.data.data);
    
    if (response.data.code === 200) {
      const data = response.data.data;
      
      return {
        success: true,
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
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.startInterview();
  }

  try {
    const response = await realApiClient.post('/api/interviews/start');
    
    console.log('startInterview响应:', response.data);
    
    if (response.data.code === 200) {
      return {
        success: true,
        firstQuestion: response.data.data, // 后端返回的是第一个问题字符串
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
 * 获取面试问题 - 支持实时面试流程
 * @returns {Promise} 问题内容
 */
export const getInterviewQuestion = async () => {
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.getInterviewQuestion();
  }

  try {
    const response = await realApiClient.get('/api/interviews/question');
    
    console.log('getInterviewQuestion响应:', response.data);
    console.log('data类型:', typeof response.data.data);
    console.log('data内容:', response.data.data);
    
    if (response.data.code === 200) {
      // 根据后端实际返回的数据格式调整处理逻辑
      const data = response.data.data;
      
      // 如果data是字符串，则直接作为问题内容
      if (typeof data === 'string') {
        return {
          success: true,
          question: data,
          isEnd: false,
          hasNextQuestion: true,
          message: response.data.message
        };
      }
      
      // 如果data是对象，按原来的逻辑处理
      return {
        success: true,
        question: data?.question || data,
        isEnd: data?.isEnd || false,
        hasNextQuestion: !data?.isEnd,
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
 * @param {string} answer - 回答内容（语音转文字）
 * @returns {Promise} 提交结果
 */
export const submitAnswer = async (videoFile, answer) => {
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.submitAnswer(videoFile, answer);
  }

  try {
    const formData = new FormData();
    formData.append('videoFile', videoFile);
    
    // 根据API文档，answer作为query参数传递
    const response = await realApiClient.post(`/api/interviews/question?answer=${encodeURIComponent(answer)}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('submitAnswer响应:', response.data);
    console.log('submit data类型:', typeof response.data.data);
    console.log('submit data内容:', response.data.data);
    
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
 * 获取简历分析结果
 * @returns {Promise} 简历分析结果
 */
export const getResumeAnalysis = async () => {
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.getResumeAnalysis();
  }

  try {
    const response = await realApiClient.get('/api/interviews/resume-analysis');
    
    console.log('getResumeAnalysis响应:', response.data);
    console.log('analysis data类型:', typeof response.data.data);
    console.log('analysis data内容:', response.data.data);
    
    if (response.data.code === 200) {
      return {
        success: true,
        analysis: response.data.data,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || '获取简历分析失败');
    }
  } catch (error) {
    console.error('Get resume analysis error:', error);
    throw new Error(error.response?.data?.message || '获取简历分析失败，请稍后重试');
  }
};

/**
 * 获取面试总结
 * @returns {Promise} 面试总结和建议
 */
export const getInterviewSummary = async () => {
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.getInterviewSummary();
  }

  try {
    const response = await realApiClient.get('/interview/summary');
    
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
 * 设置API基础URL
 * @param {string} url - 新的基础URL
 */
export const setApiBaseUrl = (url) => {
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.setApiBaseUrl(url);
  }

  realApiClient.defaults.baseURL = url;
  console.log(`API base URL updated to: ${url}`);
};

/**
 * 检查是否使用模拟API
 * @returns {boolean} 是否使用模拟API
 */
export const isUsingMockApi = () => {
  return USE_MOCK_API;
};

/**
 * 获取API模式信息
 * @returns {object} API模式信息
 */
export const getApiMode = () => {
  return {
    useMock: USE_MOCK_API,
    baseUrl: getCurrentApiBaseUrl(),
    mode: USE_MOCK_API ? 'mock' : 'real'
  };
};

/**
 * 获取当前API基础URL
 * @returns {string} 当前基础URL
 */
export const getCurrentApiBaseUrl = () => {
  // 如果启用模拟API，返回模拟基础URL
  if (USE_MOCK_API) {
    return mockApi.getCurrentApiBaseUrl();
  }

  return realApiClient.defaults.baseURL;
};

/**
 * 完成面试
 * @param {string} position - 职位名称
 * @returns {Promise} 完成结果
 */
export const completeInterview = async (position) => {
  // 如果启用模拟API，使用模拟服务
  if (USE_MOCK_API) {
    return mockApi.completeInterview(position);
  }

  try {
    const response = await realApiClient.post(`/api/interviews/complete?position=${encodeURIComponent(position)}`);
    
    console.log('completeInterview响应:', response.data);
    console.log('complete data类型:', typeof response.data.data);
    console.log('complete data内容:', response.data.data);
    
    if (response.data.code === 200) {
      return {
        success: true,
        message: response.data.message,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.message || '完成面试失败');
    }
  } catch (error) {
    console.error('Complete interview error:', error);
    throw new Error(error.response?.data?.message || '完成面试失败，请稍后重试');
  }
};

// 导出axios实例供其他地方使用
// 如果使用模拟API，导出模拟的apiClient；否则导出真实的apiClient
export const apiClient = USE_MOCK_API ? mockApi.apiClient : realApiClient;
