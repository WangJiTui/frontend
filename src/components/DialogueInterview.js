import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getInterviewQuestion, submitAnswer, getInterviewSummary, completeInterview } from '../services/api';
import RTASRTranscription from './RTASRTranscription';
import Button from './Button';
import VideoRecorder from '../services/videoRecorder';

const DialogueInterview = ({ selectedDirections, resumeFile, jobDescription, sessionId, position, resumeAnalysisResult, autoStart, onInterviewComplete }) => {
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
  const [isInterviewStarted, setIsInterviewStarted] = useState(autoStart || false);
  const [isInterviewEnded, setIsInterviewEnded] = useState(false);
  
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



  // 获取第一个问题并开始录音（面试已在父组件初始化完成）
  useEffect(() => {
    if (!autoStart || !sessionId) return;
    
    const initializeFirstQuestion = async () => {
      try {
        setFeedback('正在获取第一个问题...');
        setError('');
        
        const questionResult = await getInterviewQuestion();
        if (questionResult.success) {
          setCurrentQuestion(questionResult.question);
          setCurrentQuestionIndex(questionResult.questionIndex);
          
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
        console.error('获取第一个问题失败:', error);
        setError(error.message);
      }
    };

    initializeFirstQuestion();
  }, [autoStart, sessionId, startRecording]);

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

  // 清理定时器的effect  
  useEffect(() => {
    // 清除任何可能存在的自动提交计时器
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
  }, []);

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
      {(!isInterviewStarted || !currentQuestion) && !isInterviewEnded && (
        <div className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">{feedback || '正在准备第一个问题...'}</p>
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