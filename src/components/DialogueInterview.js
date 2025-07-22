import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getInterviewQuestion, submitAnswer, getInterviewSummary, completeInterview } from '../services/api';
import RTASRTranscription from './RTASRTranscription';
import Button from './Button';
import VideoRecorder from '../services/videoRecorder';
import CameraPreview from './CameraPreview';

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
  const [submissionState, setSubmissionState] = useState('idle');
  const [isInterviewStarted, setIsInterviewStarted] = useState(autoStart || false);
  const [isInterviewEnded, setIsInterviewEnded] = useState(false);
  
  const rtasrRef = useRef(null);
  const videoRecorderRef = useRef(new VideoRecorder());
  const statusChangeRef = useRef({ lastStatus: '', lastMessage: '', timestamp: Date.now() });
  const autoSubmitTimeoutRef = useRef(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startRecording = useCallback(async (delay = 1000) => {
    if (!rtasrRef.current) {
      console.log('rtasrRef.current不存在，无法开始录音');
      throw new Error('语音转写组件未就绪');
    }

    rtasrRef.current.setSilenceDetection(5000, 300);

    await new Promise(resolve => setTimeout(resolve, delay));

    const maxRetries = 3;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        console.log(`第 ${attempts + 1} 次尝试启动录音录像`);
        setFeedback(`正在启动录音录像服务... (${attempts + 1}/${maxRetries})`);
        
        if (!isVideoRecording) {
          await videoRecorderRef.current.startRecording();
          setIsVideoRecording(true);
          console.log('录像已启动');
        }
        
        await rtasrRef.current.startRealTimeTranscription();
        console.log('录音已启动成功');
        
        setError('');
        setFeedback('');
        return true;
        
      } catch (error) {
        attempts++;
        console.error(`第 ${attempts} 次启动录音录像失败:`, error);
        
        if (attempts < maxRetries) {
          console.log(`等待 ${2 * attempts} 秒后重试...`);
          setFeedback(`启动失败，${2 * attempts} 秒后重试... (${attempts}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        } else {
          console.error('所有重试都失败，启动录音录像失败');
          setError(`启动录音录像失败，已重试 ${maxRetries} 次。请检查网络连接或刷新页面重试。`);
          setFeedback('录音录像启动失败，请手动点击"提交回答"按钮继续');
          throw new Error(`启动录音录像失败: ${error.message}`);
        }
      }
    }
    return false;
  }, [isVideoRecording]);

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

  const handleSubmitAnswer = useCallback(async (answer) => {
    try {
      if (submissionState === 'submitting' || submissionState === 'submitted') {
        console.log('正在处理回答或已提交，跳过重复提交');
        return;
      }
      
      setSubmissionState('submitting');
      setError('');
      setFeedback('正在提交您的回答...');

      let videoBlob = null;
      try {
        if (rtasrRef.current && rtasrRef.current.isTranscribing()) {
          console.log('停止录音服务');
          await rtasrRef.current.stopRealTimeTranscription();
        }

        if (isVideoRecording && videoRecorderRef.current.getRecordingState()) {
          console.log('停止录像服务');
          videoBlob = await videoRecorderRef.current.stopRecording();
          setIsVideoRecording(false);
          console.log('录像已停止，大小:', videoBlob?.size);
        }
      } catch (error) {
        console.error('停止录音录像失败:', error);
      }

      const newAnswer = {
        question: currentQuestion,
        answer: answer,
        questionIndex: currentQuestionIndex,
        videoBlob: videoBlob
      };
      setAnswers(prev => [...prev, newAnswer]);

      // 第一步：提交答案到后端
      console.log('提交答案到后端...');
      const submitResult = await submitAnswer(videoBlob || new Blob(), answer);
      
      if (submitResult.success) {
        console.log('答案提交成功，准备获取下一个问题...');
        setFeedback('答案已提交，正在获取下一个问题...');
        
        // 第二步：获取下一个问题
        try {
          const questionResult = await getInterviewQuestion();
          
          if (questionResult.success) {
            if (questionResult.question && questionResult.question.trim()) {
              // 有新问题，继续面试
              console.log('获取到新问题:', questionResult.question);
              setCurrentQuestion(questionResult.question);
              setCurrentQuestionIndex((prev) => (prev || 0) + 1);
              setSubmissionState('idle');
              setFeedback('正在为下一个问题启动录音录像...');
              
              // 启动新一轮录音录像
              try {
                const startSuccess = await startRecording();
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
            } else {
              // 没有新问题，面试结束
              console.log('面试已结束');
              setIsInterviewEnded(true);
              setIsWaitingForAnswer(false);
              setCurrentQuestion('');
              setSubmissionState('submitted');
              setFeedback('面试已完成，正在完成面试流程...');
              
              try {
                await completeInterview(position);
                console.log('面试完成接口调用成功');
              } catch (completeError) {
                console.error('完成面试接口调用失败:', completeError);
              }
              
              try {
                const summaryResult = await getInterviewSummary(sessionId);
                console.log('获取面试总结成功:', summaryResult);
                onInterviewComplete(answers.concat([newAnswer]), summaryResult.summary, resumeAnalysisResult);
              } catch (summaryError) {
                console.error('获取面试总结失败:', summaryError);
                onInterviewComplete(answers.concat([newAnswer]), null, resumeAnalysisResult);
              }
            }
          } else {
            throw new Error('获取下一个问题失败');
          }
        } catch (questionError) {
          console.error('获取下一个问题失败:', questionError);
          
          // 检查是否是因为面试已结束
          if (questionError.message.includes('面试已结束') || 
              questionError.message.includes('no more questions') ||
              questionError.response?.status === 404) {
            console.log('面试已结束（通过错误判断）');
            setIsInterviewEnded(true);
            setIsWaitingForAnswer(false);
            setCurrentQuestion('');
            setSubmissionState('submitted');
            setFeedback('面试已完成，正在完成面试流程...');
            
            try {
              await completeInterview(position);
              console.log('面试完成接口调用成功');
            } catch (completeError) {
              console.error('完成面试接口调用失败:', completeError);
            }
            
            try {
              const summaryResult = await getInterviewSummary(sessionId);
              console.log('获取面试总结成功:', summaryResult);
              onInterviewComplete(answers.concat([newAnswer]), summaryResult.summary, resumeAnalysisResult);
            } catch (summaryError) {
              console.error('获取面试总结失败:', summaryError);
              onInterviewComplete(answers.concat([newAnswer]), null, resumeAnalysisResult);
            }
          } else {
            setError(questionError.message);
            setSubmissionState('idle');
          }
        }
      } else {
        setError('提交回答失败，请重试');
        setSubmissionState('idle');
      }
    } catch (error) {
      console.error('提交回答失败:', error);
      setError(error.message);
      setSubmissionState('idle');
    }
  }, [submissionState, currentQuestion, currentQuestionIndex, isVideoRecording, sessionId, position, resumeAnalysisResult, answers, onInterviewComplete, startRecording]);

  const handleTranscriptChange = (result) => {
    
  };

  const handleStatusChange = (status, message) => {
    const currentTime = Date.now();
    const { lastStatus, lastMessage, timestamp } = statusChangeRef.current;
    
    if (status === lastStatus && message === lastMessage && (currentTime - timestamp) < 500) {
      return;
    }
    
    statusChangeRef.current = { lastStatus: status, lastMessage: message, timestamp: currentTime };
    
    console.log(`状态变化: ${status} - ${message}`);
    
    // 删除自动提交逻辑
  };

  // 删除自动提交相关函数

  const handleManualSubmit = async () => {
    if (!rtasrRef.current) {
      setError('语音转写组件未初始化');
      return;
    }
    
    const transcript = rtasrRef.current.getFinalTranscript();
    if (!transcript || !transcript.trim()) {
      setError('请先录制您的回答或等待语音转写完成');
      return;
    }
    
    if (submissionState === 'submitting') {
      console.log('正在提交中，忽略手动提交请求');
      return;
    }
    
    console.log('手动提交回答:', transcript);
    await handleSubmitAnswer(transcript);
  };

  const getDirectionNames = (directions) => {
    const directionMapping = {
      "ai_engineer": "AI工程师",
      "data_engineer": "数据工程师", 
      "frontend_engineer": "前端工程师",
      "backend_engineer": "后端工程师",
      "devops_engineer": "DevOps工程师",
      "product_manager": "产品经理",
      "qa_engineer": "测试工程师"
    };
    
    return directions?.map(id => directionMapping[id] || id).join("、") || "通用面试";
  };

  const getCurrentStatus = () => {
    if (isInterviewEnded) return 'completed';
    if (!isInterviewStarted) return 'waiting';
    if (submissionState === 'submitting') return 'submitting';
    if (isWaitingForAnswer) return 'answering';
    return 'idle';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {currentQuestion && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8 border border-blue-200 shadow-xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">面试问题 #{currentQuestionIndex || 1}</h3>
                <p className="text-sm text-gray-600">面试方向: {getDirectionNames(selectedDirections)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getCurrentStatus() === 'answering' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-600">{getCurrentStatus() === 'answering' ? '等待回答' : '准备中'}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md">
            <p className="text-lg text-gray-800 leading-relaxed">{currentQuestion}</p>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">回答提示</span>
            </div>
            <p className="text-sm text-blue-700">
              开始面试后会自动开始录音录像。请充分思考后点击"提交回答"按钮提交您的回答。
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8">
          {/* 语音转写区域 */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              语音转写
            </h3>
            
            <RTASRTranscription
              ref={rtasrRef}
              onTranscriptChange={handleTranscriptChange}
              onStatusChange={handleStatusChange}
              autoStart={true}
              isInterviewMode={true}
              className="mb-6"
            />
          </div>

          {/* 摄像头预览区域 */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              视频录制
            </h3>
            
            <CameraPreview
              videoRecorder={videoRecorderRef.current}
              isRecording={isVideoRecording}
              className="mb-6"
            />
          </div>

          {/* 操作面板区域 */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              操作面板
            </h3>
            
            <div className="space-y-4">
              {isWaitingForAnswer && (
                <Button
                  onClick={handleManualSubmit}
                  disabled={submissionState === 'submitting'}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submissionState === 'submitting' ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      正在提交...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      提交回答
                    </div>
                  )}
                </Button>
              )}

              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">录音状态:</span>
                  <span className={`font-medium ${isVideoRecording ? 'text-green-600' : 'text-gray-500'}`}>
                    {isVideoRecording ? '录制中' : '未录制'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">录像状态:</span>
                  <span className={`font-medium ${isVideoRecording ? 'text-red-600' : 'text-gray-500'}`}>
                    {isVideoRecording ? '录制中' : '未录制'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">当前状态:</span>
                  <span className="font-medium text-blue-600">
                    {getCurrentStatus() === 'answering' ? '等待回答' : 
                     getCurrentStatus() === 'submitting' ? '提交中' : 
                     getCurrentStatus() === 'completed' ? '已完成' : '准备中'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">面试进度:</span>
                  <span className="font-medium text-purple-600">
                    {isInterviewEnded ? '已完成' : 
                     currentQuestionIndex ? `第 ${currentQuestionIndex} 题` : '准备中'}
                  </span>
                </div>
              </div>

              {/* 实时面试说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-800">实时面试模式</span>
                </div>
                <p className="text-xs text-blue-700">
                  • 开始面试后自动录音录像<br/>
                  • 请思考完毕后手动提交回答<br/>
                  • 面试结束时生成总结报告
                </p>
              </div>
            </div>
          </div>
        </div>

        {(feedback || error) && (
          <div className="mt-8">
            {feedback && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-800 font-medium">{feedback}</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800 font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DialogueInterview; 