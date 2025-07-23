// 模拟API服务 - 用于测试前端功能而无需后端连接

// 模拟延迟函数
const delay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟用户数据
const mockUsers = [
  { username: 'test', passwordHash: 'test123', email: 'test@example.com', token: 'mock-token-123' }
];

// 模拟面试问题
const mockQuestions = [
  "请简单介绍一下你自己。",
  "为什么想要申请这个职位？",
  "你对这个行业有什么了解？",
  "请描述一个你解决问题的例子。",
  "你的职业规划是什么？"
];

let currentQuestionIndex = 0;
let isInterviewStarted = false;
let currentUser = null;

/**
 * 模拟用户登录
 */
export const login = async (username, passwordHash) => {
  await delay(500);
  
  const user = mockUsers.find(u => u.username === username && u.passwordHash === passwordHash);
  
  if (user) {
    currentUser = user;
    return {
      success: true,
      token: user.token,
      user: { username: user.username, email: user.email },
      message: '登录成功'
    };
  } else {
    throw new Error('用户名或密码错误');
  }
};

/**
 * 模拟用户注册
 */
export const register = async (username, email, passwordHash) => {
  await delay(800);
  
  // 检查用户是否已存在
  const existingUser = mockUsers.find(u => u.username === username || u.email === email);
  if (existingUser) {
    throw new Error('用户名或邮箱已存在');
  }
  
  // 创建新用户
  const newUser = { 
    username, 
    email, 
    passwordHash, 
    token: `mock-token-${Date.now()}` 
  };
  mockUsers.push(newUser);
  currentUser = newUser;
  
  return {
    success: true,
    token: newUser.token,
    user: { username: newUser.username, email: newUser.email },
    message: '注册成功'
  };
};

/**
 * 模拟检查学号是否存在
 */
export const checkStudentNumber = async (userName) => {
  await delay(300);
  
  const exists = mockUsers.some(u => u.username === userName);
  
  return {
    success: true,
    exists,
    message: exists ? '学号已存在' : '学号可用'
  };
};

/**
 * 模拟获取用户信息
 */
export const getUserInfo = async () => {
  await delay(300);
  
  if (!currentUser) {
    throw new Error('未登录');
  }
  
  return {
    success: true,
    user: {
      username: currentUser.username,
      email: currentUser.email,
      role: 'student'
    }
  };
};

/**
 * 模拟创建面试会话
 */
export const createInterview = async (position, resume_file, job_file) => {
  await delay(1500);
  
  console.log('模拟创建面试会话:', { position, resume_file: resume_file?.name, job_file: job_file?.name });
  
  // 重置面试状态
  currentQuestionIndex = 0;
  isInterviewStarted = false;
  
  return {
    success: true,
    message: `成功创建 ${position} 面试会话`
  };
};

/**
 * 模拟开始面试
 */
export const startInterview = async () => {
  await delay(800);
  
  isInterviewStarted = true;
  currentQuestionIndex = 0;
  
  return {
    success: true,
    firstQuestion: mockQuestions[currentQuestionIndex],
    message: '面试开始'
  };
};

/**
 * 模拟获取面试问题
 */
export const getInterviewQuestion = async () => {
  await delay(500);
  
  if (!isInterviewStarted) {
    throw new Error('面试尚未开始');
  }
  
  if (currentQuestionIndex >= mockQuestions.length) {
    return {
      success: true,
      question: null,
      isEnd: true,
      hasNextQuestion: false,
      message: '面试已结束'
    };
  }
  
  const question = mockQuestions[currentQuestionIndex];
  
  return {
    success: true,
    question,
    isEnd: false,
    hasNextQuestion: currentQuestionIndex < mockQuestions.length - 1,
    message: '获取问题成功'
  };
};

/**
 * 模拟提交面试回答
 */
export const submitAnswer = async (videoFile, answer) => {
  await delay(1200);
  
  console.log('模拟提交回答:', { videoSize: videoFile?.size, answer });
  
  // 移动到下一个问题
  currentQuestionIndex++;
  
  return {
    success: true,
    message: '回答提交成功',
    data: {
      questionIndex: currentQuestionIndex - 1,
      answered: true
    }
  };
};

/**
 * 模拟获取简历分析结果
 */
export const getResumeAnalysis = async () => {
  await delay(2000);
  
  const mockAnalysis = {
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    experience: '2-3年工作经验',
    education: '本科学历',
    strengths: ['技术栈匹配度高', '项目经验丰富', '学习能力强'],
    suggestions: ['可以进一步提升算法能力', '建议增加大型项目经验']
  };
  
  return {
    success: true,
    analysis: mockAnalysis,
    message: '简历分析完成'
  };
};

/**
 * 模拟获取面试总结
 */
export const getInterviewSummary = async () => {
  await delay(1500);
  
  const mockSummary = {
    overall_score: 85,
    dimensions: {
      technical_skills: 88,
      communication: 82,
      problem_solving: 87,
      teamwork: 80
    },
    feedback: '表现良好，技术能力扎实，沟通能力有待提升',
    suggestions: [
      '继续保持技术学习的热情',
      '多参与团队协作项目',
      '提升表达和沟通技巧'
    ]
  };
  
  return {
    success: true,
    summary: mockSummary
  };
};

/**
 * 模拟完成面试
 */
export const completeInterview = async (position) => {
  await delay(1000);
  
  console.log('模拟完成面试:', position);
  
  // 重置面试状态
  isInterviewStarted = false;
  currentQuestionIndex = 0;
  
  return {
    success: true,
    message: '面试已完成',
    data: {
      completed: true,
      position
    }
  };
};

/**
 * 模拟设置API基础URL（在模拟模式下无效）
 */
export const setApiBaseUrl = (url) => {
  console.log(`模拟模式：忽略API基础URL设置 ${url}`);
};

/**
 * 模拟获取当前API基础URL
 */
export const getCurrentApiBaseUrl = () => {
  return 'mock://localhost:8080';
};

// 模拟axios实例
export const apiClient = {
  defaults: {
    baseURL: 'mock://localhost:8080'
  }
};