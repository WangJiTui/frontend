import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createInterview, startInterview, getInterviewQuestion, submitAnswer, getInterviewSummary, completeInterview } from '../services/api';
import RTASRTranscription from './RTASRTranscription';
import Button from './Button';
import VideoRecorder from '../services/videoRecorder';

const DialogueInterview = ({ selectedDirections, resumeFile, onInterviewComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionState, setSubmissionState] = useState('idle'); // 'idle' | 'submitting' | 'submitted'
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isInterviewEnded, setIsInterviewEnded] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [position, setPosition] = useState(''); // 存储职位信息
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState(null); // 存储简历分析结果
  
  const rtasrRef = useRef(null);
  const videoRecorderRef = useRef(new VideoRecorder());
  const statusChangeRef = useRef({ lastStatus: '', lastMessage: '', timestamp: Date.now() });
  const autoSubmitTimeoutRef = useRef(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  
  // 组件挂载状态检查
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 生成岗位描述文件
  const generateJobDescriptionFile = useCallback((directions) => {
    const directionMapping = {
      "ai_engineer": {
        title: "AI工程师",
        description: `职位名称：AI工程师
岗位职责：
1. 负责AI算法研发与优化
2. 开发机器学习和深度学习模型
3. 处理大规模数据集，进行特征工程
4. 与产品团队协作，将AI技术产品化
5. 持续跟进AI领域前沿技术发展

任职要求：
1. 计算机、人工智能相关专业本科及以上学历
2. 熟练掌握Python编程，了解TensorFlow/PyTorch等框架
3. 具备扎实的数学基础，熟悉机器学习算法
4. 有实际项目经验，能独立完成模型训练和部署
5. 良好的团队协作和沟通能力

薪资范围：20-40K`
      },
      "frontend_engineer": {
        title: "前端工程师",
        description: `职位名称：前端工程师
岗位职责：
1. 负责Web前端界面开发与维护
2. 与UI/UX设计师协作，实现高质量用户界面
3. 优化前端性能，提升用户体验
4. 与后端工程师配合，完成数据交互
5. 参与技术方案讨论，推动前端技术发展

任职要求：
1. 计算机相关专业本科及以上学历
2. 熟练掌握HTML5、CSS3、JavaScript等前端技术
3. 熟悉React、Vue等主流前端框架
4. 了解前端工程化工具，如Webpack、Vite等
5. 具备良好的代码规范和团队协作能力

薪资范围：15-30K`
      },
      "backend_engineer": {
        title: "后端工程师",
        description: `职位名称：后端工程师
岗位职责：
1. 负责服务端应用开发与维护
2. 设计和实现RESTful API接口
3. 数据库设计与优化
4. 系统架构设计与性能调优
5. 参与技术选型和代码审查

任职要求：
1. 计算机相关专业本科及以上学历
2. 熟练掌握Java、Python或Go等后端语言
3. 熟悉Spring Boot、Django等开发框架
4. 了解MySQL、Redis等数据存储技术
5. 具备良好的系统设计和问题解决能力

薪资范围：18-35K`
      },
      "data_engineer": {
        title: "数据工程师",
        description: `职位名称：数据工程师
岗位职责：
1. 构建和维护数据处理流水线
2. 设计数据仓库和数据湖架构
3. 开发ETL/ELT数据处理任务
4. 监控数据质量，确保数据准确性
5. 与数据科学家和分析师协作

任职要求：
1. 计算机、统计学相关专业本科及以上学历
2. 熟练掌握SQL，了解大数据处理技术
3. 熟悉Hadoop、Spark、Kafka等大数据工具
4. 了解云平台数据服务，如AWS、阿里云等
5. 具备良好的数据敏感度和解决问题能力

薪资范围：20-40K`
      },
      "devops_engineer": {
        title: "DevOps工程师",
        description: `职位名称：DevOps工程师
岗位职责：
1. 构建和维护CI/CD流水线
2. 管理云基础设施和容器化部署
3. 监控系统性能，处理运维告警
4. 自动化运维流程，提升部署效率
5. 与开发团队协作，推进DevOps文化

任职要求：
1. 计算机相关专业本科及以上学历
2. 熟练掌握Linux系统管理
3. 了解Docker、Kubernetes等容器技术
4. 熟悉Jenkins、GitLab CI等CI/CD工具
5. 具备云平台使用经验，良好的自动化思维

薪资范围：18-35K`
      },
      "product_manager": {
        title: "产品经理",
        description: `职位名称：产品经理
岗位职责：
1. 负责产品规划和需求分析
2. 设计产品功能和用户体验流程
3. 协调技术、设计、运营等团队资源
4. 分析用户反馈，持续优化产品
5. 制定产品发展策略和版本规划

任职要求：
1. 本科及以上学历，理工科背景优先
2. 具备产品思维和用户洞察能力
3. 熟悉产品设计流程和项目管理
4. 良好的沟通协调和跨团队协作能力
5. 有互联网产品经验者优先

薪资范围：20-40K`
      },
      "qa_engineer": {
        title: "测试工程师",
        description: `职位名称：测试工程师
岗位职责：
1. 负责软件产品的质量保证
2. 设计和执行测试用例
3. 开发自动化测试脚本
4. 性能测试和安全测试
5. 缺陷跟踪和质量报告

任职要求：
1. 计算机相关专业本科及以上学历
2. 熟悉软件测试理论和方法
3. 掌握自动化测试工具，如Selenium等
4. 了解性能测试工具，如JMeter等
5. 具备良好的逻辑思维和细致耐心

薪资范围：15-30K`
      }
    };

    // 选择第一个方向作为主要岗位，或组合多个方向
    const primaryDirection = directions[0];
    const jobInfo = directionMapping[primaryDirection] || {
      title: "通用技术岗位",
      description: "通用技术岗位职责和要求"
    };

    // 如果有多个方向，生成复合岗位描述
    if (directions.length > 1) {
      const titles = directions.map(dir => directionMapping[dir]?.title || dir).join("/");
      const description = `复合岗位：${titles}\n\n结合了以下领域的技能要求：\n${directions.map(dir => `- ${directionMapping[dir]?.title || dir}`).join('\n')}`;
      
      return new File([description], 'job_description.txt', { type: 'text/plain' });
    }

    return new File([jobInfo.description], 'job_description.txt', { type: 'text/plain' });
  }, []);

  // 开始录音录像的通用函数
  const startRecording = useCallback(async (delay = 1000) => {
    if (!rtasrRef.current) {
      console.log('rtasrRef.current不存在，无法开始录音');
      throw new Error('语音转写组件未就绪');
    }

    // 设置面试场景的静音检测参数（5秒静音检测）
    rtasrRef.current.setSilenceDetection(5000, 300);

    // 延迟启动录音录像，确保组件和资源都已准备就绪
    await new Promise(resolve => setTimeout(resolve, delay));

    const maxRetries = 3;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        console.log(`第 ${attempts + 1} 次尝试启动录音录像`);
        setFeedback(`正在启动录音录像服务... (${attempts + 1}/${maxRetries})`);
        
        // 启动录像
        if (!isVideoRecording) {
          await videoRecorderRef.current.startRecording();
          setIsVideoRecording(true);
          console.log('录像已启动');
        }
        
        // 启动录音
        await rtasrRef.current.startRealTimeTranscription();
        console.log('录音已启动成功');
        
        // 成功启动，清除错误信息
        setError('');
        setFeedback('');
        return true; // 返回成功标识
        
      } catch (error) {
        attempts++;
        console.error(`第 ${attempts} 次启动录音录像失败:`, error);
        
        if (attempts < maxRetries) {
          console.log(`等待 ${2 * attempts} 秒后重试...`);
          setFeedback(`启动失败，${2 * attempts} 秒后重试... (${attempts}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        } else {
          // 所有重试都失败了
          console.error('所有重试都失败，启动录音录像失败');
          setError(`启动录音录像失败，已重试 ${maxRetries} 次。请检查网络连接或刷新页面重试。`);
          setFeedback('录音录像启动失败，请手动点击"提交回答"按钮继续');
          throw new Error(`启动录音录像失败: ${error.message}`);
        }
      }
    }
    return false; // 失败返回false
  }, [isVideoRecording]);



  // 开始面试 - 调用后端API创建面试会话并获取第一个问题
  const handleStartInterview = useCallback(async () => {
    try {
      setFeedback('正在创建面试会话...');
      setError('');
      
      // 第一步：创建面试会话
      // 检查必要的文件是否存在
      if (!resumeFile) {
        throw new Error('简历文件未上传，请返回首页上传简历文件');
      }
      
      const currentPosition = selectedDirections?.join(',') || '前端开发'; // 将方向转换为职位
      setPosition(currentPosition); // 保存职位信息到状态
      
      // 使用真实的简历文件和生成的岗位描述文件
      const resume_file = resumeFile; // 用户上传的PDF简历文件
      const job_file = generateJobDescriptionFile(selectedDirections); // 根据选择的方向生成岗位描述TXT文件
      
      const createResult = await createInterview(currentPosition, resume_file, job_file);
      if (!createResult.success) {
        throw new Error('创建面试会话失败');
      }
      
      setSessionId(createResult.sessionId);
      setResumeAnalysisResult(createResult.resumeAnalysis); // 保存简历分析结果
      setFeedback('正在开始面试...');
      
      // 第二步：开始面试
      const startResult = await startInterview();
      if (!startResult.success) {
        throw new Error('开始面试失败');
      }
      
      setFeedback('正在获取第一个问题...');
      
      // 第三步：获取第一个问题
      const questionResult = await getInterviewQuestion();
      if (questionResult.success) {
        setCurrentQuestion(questionResult.question);
        setCurrentQuestionIndex(questionResult.questionIndex);
        setIsInterviewStarted(true);
        
        // 开始录音录像
        try {
          const startSuccess = await startRecording(1500);
          if (startSuccess) {
            setIsWaitingForAnswer(true);
            setFeedback('');
          } else {
            setError('录音启动失败，请手动输入回答并点击提交按钮');
            setIsWaitingForAnswer(false);
          }
        } catch (startError) {
          console.error('启动录音失败:', startError);
          setError(`录音启动失败: ${startError.message}`);
          setIsWaitingForAnswer(false);
        }
      }
    } catch (error) {
      console.error('开始面试失败:', error);
      setError(error.message);
    }
  }, [selectedDirections, resumeFile, generateJobDescriptionFile, startRecording]);

  // 发送回答并获取下一个问题或结束面试
  const handleSubmitAnswer = useCallback(async (answer) => {
    try {
      // 防止重复提交
      if (submissionState === 'submitting' || submissionState === 'submitted') {
        console.log('正在处理回答或已提交，跳过重复提交');
        return;
      }
      
      setSubmissionState('submitting');
      setError('');
      setFeedback('正在提交您的回答...');

      // 停止录音录像
      let videoBlob = null;
      try {
        // 停止录音
        if (rtasrRef.current && rtasrRef.current.isTranscribing()) {
          console.log('停止录音服务');
          await rtasrRef.current.stopRealTimeTranscription();
        }

        // 停止录像
        if (isVideoRecording && videoRecorderRef.current.getRecordingState()) {
          console.log('停止录像服务');
          videoBlob = await videoRecorderRef.current.stopRecording();
          setIsVideoRecording(false);
          console.log('录像已停止，大小:', videoBlob?.size);
        }
      } catch (error) {
        console.error('停止录音录像失败:', error);
      }

      // 保存当前回答
      const newAnswer = {
        question: currentQuestion,
        answer: answer,
        questionIndex: currentQuestionIndex,
        videoBlob: videoBlob
      };
      setAnswers(prev => [...prev, newAnswer]);

      // 发送回答到后端
      // 根据API文档，需要传递videoFile和answer两个参数
      const submitResult = await submitAnswer(videoBlob || new Blob(), answer);
      
      if (submitResult.success) {
        // 获取下一个问题
        try {
          const questionResult = await getInterviewQuestion();
          
          if (questionResult.success) {
            if (questionResult.isEnd) {
              // 面试结束
              setIsInterviewEnded(true);
              setIsWaitingForAnswer(false);
              setCurrentQuestion('');
              setSubmissionState('submitted');
              setFeedback('面试已完成，正在完成面试流程...');
              
              // 先调用完成面试接口
              try {
                await completeInterview(position);
                console.log('面试完成接口调用成功');
              } catch (completeError) {
                console.error('完成面试接口调用失败:', completeError);
                // 即使完成面试接口失败，也继续获取总结
              }
              
              setFeedback('面试已完成，正在获取分析结果...');
              
              // 获取面试总结
              try {
                const summaryResult = await getInterviewSummary(sessionId);
                if (summaryResult.success) {
                  // 调用完成回调，传递总结信息和简历分析结果
                  if (onInterviewComplete) {
                    onInterviewComplete([...answers, newAnswer], summaryResult.summary, resumeAnalysisResult);
                  }
                  setFeedback('面试完成！正在跳转到总结页面...');
                }
              } catch (summaryError) {
                console.error('获取面试总结失败:', summaryError);
                setError('面试已完成，但获取总结失败');
                // 即使获取总结失败，也要调用完成回调
                if (onInterviewComplete) {
                  onInterviewComplete([...answers, newAnswer], null, resumeAnalysisResult);
                }
              }
            } else {
              // 继续面试，显示下一个问题
              setCurrentQuestion(questionResult.question);
              setCurrentQuestionIndex(questionResult.questionIndex);
              setSubmissionState('idle');

              // 清空语音转写内容
              if (rtasrRef.current) {
                rtasrRef.current.clearTranscriptionResult();
              }
              
              setIsWaitingForAnswer(false);
              setHasSubmitted(false);
              
              // 自动开始下一个问题的录音录像
              try {
                console.log(`开始启动第 ${questionResult.questionIndex + 1} 题的录音服务`);
                const startSuccess = await startRecording(1000);
                
                if (startSuccess) {
                  setIsWaitingForAnswer(true);
                  setFeedback('');
                } else {
                  setError(`第 ${questionResult.questionIndex + 1} 题录音启动失败，请手动输入回答并点击提交按钮`);
                  setIsWaitingForAnswer(false);
                }
              } catch (startError) {
                console.error('启动下一题录音失败:', startError);
                setError(`第 ${questionResult.questionIndex + 1} 题录音启动失败: ${startError.message}`);
                setIsWaitingForAnswer(false);
              }
            }
          }
        } catch (questionError) {
          console.error('获取下一个问题失败:', questionError);
          setError('获取下一个问题失败: ' + questionError.message);
        }
      }
    } catch (error) {
      console.error('提交回答失败:', error);
      setError(error.message);
      setSubmissionState('idle');
    }
  }, [currentQuestion, currentQuestionIndex, sessionId, submissionState, answers, onInterviewComplete, startRecording, isVideoRecording]);

  // 处理转写结果变化
  const handleTranscriptChange = (result) => {
    // 处理转写结果变化的逻辑保持不变
  };

  // 处理状态变化
  const handleStatusChange = (status, message) => {
    console.log(`[DialogueInterview] 状态变化: ${status} - ${message}`);
    
    // 检查状态变化频率，避免重复处理
    const now = Date.now();
    const lastCheck = statusChangeRef.current;
    
    if (lastCheck.lastStatus === status && 
        lastCheck.lastMessage === message && 
        (now - lastCheck.timestamp) < 1000) {
      return; // 1秒内的重复状态忽略
    }
    
    statusChangeRef.current = { lastStatus: status, lastMessage: message, timestamp: now };
    
    // 处理不同的状态
    if (status === 'silence_detected' && !hasSubmitted && isWaitingForAnswer && submissionState === 'idle') {
      console.log('检测到5秒静音，准备自动提交回答');
      handleAutoSubmit();
    }
  };

  // 自动提交回答
  const handleAutoSubmit = async () => {
    // 检查是否已经开始提交流程
    if (hasSubmitted || submissionState !== 'idle') {
      console.log('已经在提交流程中，跳过自动提交');
      return;
    }

    console.log('=== 开始自动提交流程 ===');
    setHasSubmitted(true); // 标记为已提交，防止重复提交

    try {
      // 获取当前转写结果
      const currentAnswer = rtasrRef.current ? rtasrRef.current.getTranscriptionResult().final : '';
      console.log('自动提交的回答内容:', currentAnswer);
      
      if (currentAnswer.trim()) {
        await handleSubmitAnswer(currentAnswer);
      } else {
        console.log('没有检测到有效回答，提交空回答');
        await handleSubmitAnswer('用户未提供回答');
      }
    } catch (error) {
      console.error('自动提交失败:', error);
      setError('自动提交失败，请手动点击提交按钮');
      setHasSubmitted(false); // 重置状态，允许手动提交
    }
    
    console.log('=== 自动提交流程结束 ===');
  };

  // 手动提交回答
  const handleManualSubmit = async () => {
    if (submissionState === 'submitting' || hasSubmitted) {
      console.log('正在提交中或已提交，跳过手动提交');
      return;
    }

    // 阻止自动提交
    setHasSubmitted(true);

    try {
      // 获取当前转写结果
      const currentAnswer = rtasrRef.current ? rtasrRef.current.getTranscriptionResult().final : '';
      console.log('手动提交的回答内容:', currentAnswer);
      
      if (currentAnswer.trim()) {
        await handleSubmitAnswer(currentAnswer);
      } else {
        await handleSubmitAnswer('用户未提供回答');
      }
    } catch (error) {
      console.error('手动提交失败:', error);
      setError('提交失败，请重试');
      setHasSubmitted(false); // 重置状态，允许重试
    }
  };

  // 初始化面试
  useEffect(() => {
    if (selectedDirections && selectedDirections.length > 0 && !isInterviewStarted) {
      console.log('DialogueInterview组件初始化，selectedDirections:', selectedDirections);
      
      // 清除任何可能存在的自动提交计时器
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
        autoSubmitTimeoutRef.current = null;
      }
      
      // 自动开始面试
      handleStartInterview();
    }
  }, [selectedDirections, isInterviewStarted, handleStartInterview]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
      
      // 停止录音录像
      if (rtasrRef.current && rtasrRef.current.isTranscribing()) {
        rtasrRef.current.stopRealTimeTranscription().catch(console.error);
      }
      
      if (isVideoRecording && videoRecorderRef.current.getRecordingState()) {
        videoRecorderRef.current.stopRecording().catch(console.error);
      }
    };
  }, [isVideoRecording]);

  return (
    <div className="space-y-6">
      {!isInterviewStarted && (
        <div className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">正在准备面试...</p>
        </div>
      )}

      {isInterviewStarted && !isInterviewEnded && currentQuestion && (
        <div className="question-section mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              面试问题 {currentQuestionIndex + 1}
            </h3>
            <p className="text-blue-800">{currentQuestion}</p>
          </div>

          {/* 语音转写组件 */}
          <RTASRTranscription
            ref={rtasrRef}
            onTranscriptChange={handleTranscriptChange}
            onStatusChange={handleStatusChange}
            isWaitingForAnswer={isWaitingForAnswer}
            className="mb-4"
          />

          {/* 录像状态显示 */}
          {isVideoRecording && (
            <div className="flex items-center justify-center mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-red-700 font-medium">正在录像中...</span>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="text-center">
            <Button
              onClick={handleManualSubmit}
              disabled={submissionState === 'submitting'}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                submissionState === 'submitting'
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submissionState === 'submitting' ? (
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  提交中...
                </div>
              ) : (
                '提交回答'
              )}
            </Button>
          </div>
        </div>
      )}

      {isInterviewEnded && (
        <div className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">面试已完成，正在生成分析报告...</p>
        </div>
      )}

      {/* 反馈信息 */}
      {feedback && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">{feedback}</p>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 回答历史 */}
      {answers.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">回答历史</h3>
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {answers.map((answer, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-sm font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded">
                    问题 {answer.questionIndex + 1}
                  </span>
                </div>
                <p className="text-gray-700 mt-2 font-medium">{answer.question}</p>
                <p className="text-gray-600 mt-1">{answer.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DialogueInterview; 