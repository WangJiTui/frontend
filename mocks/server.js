const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 8000;
const JWT_SECRET = 'your-secret-key-for-testing';

// 配置CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true
}));

// 解析JSON
app.use(express.json());

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 模拟数据存储
let users = [
  {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    password: '123456',
    created_at: new Date().toISOString()
  }
];

let interviewSessions = new Map(); // 存储面试会话

// JWT中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未提供访问令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 生成JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ============= 健康检查接口 =============
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============= 用户认证接口 =============

// 用户登录
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const token = generateToken(user);

  res.json({
    message: 'success',
    token: token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    }
  });
});

// 用户注册
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  // 验证参数
  if (!username || !email || !password) {
    return res.status(400).json({ message: '所有字段都必须填写' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: '密码长度至少6位' });
  }

  // 检查用户名是否已存在
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: '用户名已存在' });
  }

  // 检查邮箱是否已存在
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ message: '邮箱已被注册' });
  }

  // 创建新用户
  const newUser = {
    id: uuidv4(),
    username,
    email,
    password,
    created_at: new Date().toISOString()
  };

  users.push(newUser);

  const token = generateToken(newUser);

  res.json({
    message: 'success',
    token: token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      created_at: newUser.created_at
    }
  });
});

// ============= 简历分析接口 =============
app.post('/analyze-resume', authenticateToken, upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传PDF简历文件' });
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ message: '仅支持PDF格式文件' });
  }

  // 模拟分析过程
  setTimeout(() => {
    const analysis = {
      basic_info: {
        name: '张三',
        phone: '138****8888',
        email: 'zhangsan@email.com',
        education: '本科',
        experience_years: '2-3年'
      },
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git'],
      strengths: [
        '具备扎实的前端开发技能',
        '有丰富的React项目经验',
        '掌握多种编程语言',
        '学习能力强，适应性好'
      ],
      suggestions: [
        '可以加强算法和数据结构方面的学习',
        '建议增加一些大型项目的经验',
        '可以考虑学习云计算相关技术',
        '建议提升系统设计能力'
      ],
      recommended_positions: [
        '前端开发工程师',
        '全栈开发工程师',
        'Web开发工程师',
        'JavaScript工程师'
      ],
      overall_score: 85
    };

    res.json({
      message: 'success',
      analysis: analysis
    });
  }, 2000); // 模拟2秒分析时间
});

// ============= 面试相关接口 =============

// 开始面试
app.post('/interview/start', authenticateToken, (req, res) => {
  const { directions } = req.body;

  if (!directions || !Array.isArray(directions) || directions.length === 0) {
    return res.status(400).json({ message: '请至少选择一个面试方向' });
  }

  // 创建面试会话
  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    userId: req.user.id,
    directions: directions,
    questions: generateQuestions(directions),
    currentQuestionIndex: 0,
    answers: [],
    startTime: new Date().toISOString(),
    status: 'active'
  };

  interviewSessions.set(sessionId, session);

  res.json({
    message: 'success',
    sessionId: sessionId,
    question: session.questions[0],
    questionIndex: 0,
    total_questions: session.questions.length
  });
});

// 提交面试回答
app.post('/interview/submit-answer', authenticateToken, upload.single('video'), (req, res) => {
  console.log('收到提交回答请求:', {
    transcription: req.body.transcription?.substring(0, 50) + '...',
    sessionId: req.body.sessionId,
    questionIndex: req.body.questionIndex,
    hasVideo: !!req.file,
    userId: req.user?.id
  });

  const { transcription, sessionId, questionIndex } = req.body;

  if (!sessionId || !transcription) {
    console.error('缺少必要参数:', { sessionId, transcription });
    return res.status(400).json({ message: '缺少必要参数' });
  }

  const session = interviewSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ message: '面试会话不存在' });
  }

  if (session.userId !== req.user.id) {
    return res.status(403).json({ message: '无权访问此面试会话' });
  }

  // 保存回答
  session.answers.push({
    questionIndex: parseInt(questionIndex),
    question: session.questions[parseInt(questionIndex)],
    answer: transcription,
    timestamp: new Date().toISOString(),
    hasVideo: !!req.file
  });

  const nextQuestionIndex = parseInt(questionIndex) + 1;

  // 检查是否还有更多问题
  if (nextQuestionIndex < session.questions.length) {
    session.currentQuestionIndex = nextQuestionIndex;
    
    res.json({
      message: 'continue',
      question: session.questions[nextQuestionIndex],
      questionIndex: nextQuestionIndex,
      feedback: '回答已记录，请继续下一个问题。'
    });
  } else {
    // 面试结束
    session.status = 'completed';
    session.endTime = new Date().toISOString();
    
    res.json({
      message: 'end',
      feedback: '面试已完成，感谢您的参与！'
    });
  }
});

// 获取面试总结
app.get('/interview/summary/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  const session = interviewSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ message: '面试会话不存在' });
  }

  if (session.userId !== req.user.id) {
    return res.status(403).json({ message: '无权访问此面试会话' });
  }

  if (session.status !== 'completed') {
    return res.status(400).json({ message: '面试尚未完成' });
  }

  // 生成面试总结
  const summary = generateInterviewSummary(session);

  res.json({
    message: 'success',
    summary: summary
  });
});

// ============= 辅助函数 =============

// 生成面试问题
function generateQuestions(directions) {
  const questionBank = {
    ai_engineer: [
      '请介绍一下你对机器学习的理解，以及你使用过哪些机器学习算法？',
      '什么是深度学习？它与传统机器学习有什么区别？',
      '请解释一下神经网络的基本原理和结构。',
      '你在AI项目中遇到过哪些挑战，是如何解决的？',
      '请谈谈你对自然语言处理的理解和应用经验。'
    ],
    data_engineer: [
      '请介绍一下数据仓库和数据湖的区别。',
      '你使用过哪些ETL工具？请分享一个数据处理项目的经验。',
      '如何设计一个可扩展的数据管道？',
      '请解释一下数据建模的概念和重要性。',
      '你在处理大数据时遇到过哪些性能问题？'
    ],
    frontend_engineer: [
      '请介绍一下React的生命周期和Hooks的使用。',
      '什么是虚拟DOM？它有什么优势？',
      '请解释一下前端性能优化的方法。',
      '你如何处理跨浏览器兼容性问题？',
      '请谈谈你对前端工程化的理解。'
    ],
    backend_engineer: [
      '请介绍一下RESTful API的设计原则。',
      '什么是微服务架构？它的优缺点是什么？',
      '请解释一下数据库事务的ACID特性。',
      '你使用过哪些缓存策略？',
      '请谈谈你对系统设计的理解。'
    ],
    devops_engineer: [
      '请介绍一下Docker和Kubernetes的基本概念。',
      '什么是CI/CD？请分享一个自动化部署的经验。',
      '请解释一下监控和日志的重要性。',
      '你如何处理生产环境的故障？',
      '请谈谈你对基础设施即代码的理解。'
    ],
    product_manager: [
      '请介绍一下产品需求文档的写作方法。',
      '如何进行用户研究和需求分析？',
      '请解释一下敏捷开发流程。',
      '你如何平衡用户需求和商业目标？',
      '请谈谈你对产品数据分析的理解。'
    ],
    qa_engineer: [
      '请介绍一下测试用例的设计方法。',
      '什么是自动化测试？你使用过哪些测试框架？',
      '请解释一下性能测试和压力测试的区别。',
      '你如何制定测试策略？',
      '请谈谈你对质量保证的理解。'
    ]
  };

  // 默认通用问题
  const defaultQuestions = [
    '请介绍一下你的技术背景和项目经验。',
    '你最近学习的新技术是什么？',
    '请分享一个你解决过的技术难题。',
    '你对团队协作有什么看法？',
    '你的职业规划是什么？'
  ];

  let questions = [];
  directions.forEach(direction => {
    if (questionBank[direction]) {
      questions = questions.concat(questionBank[direction]);
    }
  });

  if (questions.length === 0) {
    questions = defaultQuestions;
  }

  // 随机选择5个问题
  const shuffled = questions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
}

// 生成面试总结
function generateInterviewSummary(session) {
  const answeredQuestions = session.answers.length;
  const totalQuestions = session.questions.length;
  
  // 模拟评分算法
  const completionRate = answeredQuestions / totalQuestions;
  const baseScore = 70;
  const completionBonus = completionRate * 20;
  const randomFactor = Math.random() * 10;
  
  const overallScore = Math.min(100, Math.floor(baseScore + completionBonus + randomFactor));
  const technicalScore = Math.min(100, Math.floor(overallScore + (Math.random() - 0.5) * 10));
  const communicationScore = Math.min(100, Math.floor(overallScore + (Math.random() - 0.5) * 10));

  return {
    overall_score: overallScore,
    technical_assessment: {
      score: technicalScore,
      feedback: '技术基础扎实，对核心概念理解深入。建议在系统设计方面多下功夫。'
    },
    communication_assessment: {
      score: communicationScore,
      feedback: '表达清晰，逻辑性强，能够有效传达技术观点。建议在回答时更加简洁明了。'
    },
    strengths: [
      '技术基础扎实，理解深入',
      '学习能力强，适应性好',
      '实践经验丰富',
      '沟通表达清晰'
    ],
    areas_for_improvement: [
      '可以更详细地阐述技术实现细节',
      '建议增加实际项目经验的分享',
      '在回答复杂问题时可以更有条理',
      '可以加强系统设计能力'
    ],
    recommendations: [
      '深入学习相关技术栈的核心原理',
      '参与开源项目，积累实际开发经验',
      '练习系统设计题目，提升架构能力',
      '多参加技术交流活动，提升表达能力'
    ],
    detailed_feedback: `基于您选择的面试方向：${session.directions.join('、')}，我们对您的面试表现进行了全面分析。

**技术能力评估：**
您在技术面试中展现了扎实的基础知识，对核心概念有清晰的理解。在${session.directions[0] || '技术'}领域表现出色，能够准确回答相关问题。

**沟通表达能力：**
您的表达清晰，逻辑思维能力强，能够有效地传达技术观点。在回答问题时条理分明，展现了良好的沟通技巧。

**改进建议：**
1. 可以更详细地阐述技术实现细节
2. 建议增加实际项目经验的分享
3. 在回答复杂问题时可以更有条理

**总体评价：**
您在这次面试中表现良好，展现了扎实的技术基础和良好的沟通能力。建议继续深入学习相关技术，并在实际项目中积累更多经验。`,
    interview_duration: calculateDuration(session.startTime, session.endTime),
    questions_answered: answeredQuestions
  };
}

// 计算面试时长
function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.floor((end - start) / 1000 / 60); // 分钟
  return `${duration}分钟`;
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: '服务器内部错误',
    error_code: 'INTERNAL_SERVER_ERROR'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    message: '接口不存在',
    error_code: 'NOT_FOUND'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   POST /login - 用户登录');
  console.log('   POST /register - 用户注册');
  console.log('   POST /analyze-resume - 简历分析');
  console.log('   POST /interview/start - 开始面试');
  console.log('   POST /interview/submit-answer - 提交回答');
  console.log('   GET  /interview/summary/:sessionId - 获取面试总结');
  console.log('   GET  /health - 健康检查');
  console.log('');
  console.log('🔑 测试账号:');
  console.log('   用户名: testuser');
  console.log('   密码: 123456');
  console.log('');
  console.log('💡 提示: 前端服务器地址 http://localhost:3000');
}); 