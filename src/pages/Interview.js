/**
 * 面试页面组件
 * 负责管理整个面试流程，包括问题展示和回答收集
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import DialogueInterview from "../components/DialogueInterview";
import { getServerStatus } from "../services/api";

/**
 * Interview组件 - 面试主页面
 * 功能：
 * - 接收从首页传递的面试方向
 * - 管理面试状态（进行中/已完成）
 * - 处理面试完成后的导航
 */
const Interview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 从路由状态中获取选中的面试方向和简历文件，使用useMemo避免重复创建
  const selectedDirections = useMemo(() => 
    location.state?.selectedDirections || [], 
    [location.state?.selectedDirections]
  );
  
  const resumeFile = useMemo(() => 
    location.state?.resumeFile || null, 
    [location.state?.resumeFile]
  );
  
  const jobDescription = useMemo(() => 
    location.state?.jobDescription || '', 
    [location.state?.jobDescription]
  );
  
  const [isInterviewComplete, setIsInterviewComplete] = useState(false); // 面试是否完成
  const [interviewAnswers, setInterviewAnswers] = useState([]); // 面试回答记录
  const [interviewSummary, setInterviewSummary] = useState(null); // 面试总结信息
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState(null); // 简历分析结果

  // 检查服务器状态
  useEffect(() => {
    checkServerStatus();
  }, []);

  /**
   * 验证面试方向和简历文件是否有效
   * 如果没有选择方向或上传简历，重定向到首页
   */
  useEffect(() => {
    if (!jobDescription || !jobDescription.trim()) {
      console.warn('No job description provided, redirecting to home');
      alert('职位描述信息丢失，请重新输入职位描述');
      navigate('/', { replace: true });
      return;
    }
    
    if (!selectedDirections || selectedDirections.length === 0) {
      console.warn('No interview directions selected, redirecting to home');
      alert('面试方向信息丢失，请重新选择面试方向');
      navigate('/', { replace: true });
      return;
    }
    
    if (!resumeFile) {
      console.warn('No resume file provided, redirecting to home');
      alert('简历文件信息丢失，请重新上传简历文件');
      navigate('/', { replace: true });
    }
  }, [jobDescription, selectedDirections, resumeFile, navigate]);

  const checkServerStatus = async () => {
    try {
      await getServerStatus();
      // 服务器状态检查完成，但不存储状态
    } catch (error) {
      console.error("Server status check failed:", error);
    }
  };

  /**
   * 处理面试完成
   * 保存面试答案、总结信息、简历分析结果并设置完成状态
   * @param {Array} answers - 面试回答数组
   * @param {Object} summary - 面试总结信息（可选）
   * @param {Object} resumeAnalysis - 简历分析结果（可选）
   */
  const handleInterviewComplete = (answers, summary, resumeAnalysis) => {
    setInterviewAnswers(answers);
    setInterviewSummary(summary);
    setResumeAnalysisResult(resumeAnalysis);
    setIsInterviewComplete(true);
    
    // 自动跳转到总结页面
    setTimeout(() => {
      navigate('/summary', { 
        state: { 
          answers: answers,
          directions: selectedDirections,
          summary: summary,
          resumeAnalysis: resumeAnalysis
        } 
      });
    }, 2000); // 显示完成提示2秒后自动跳转
  };

  /**
   * 将面试方向英文代码转换为中文名称
   * @param {Array} directions - 面试方向代码数组
   * @returns {string} 中文名称字符串
   */
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

  /**
   * 查看面试总结
   * 导航到总结页面并传递面试数据
   */
  const handleViewSummary = () => {
    navigate('/summary', { 
      state: { 
        answers: interviewAnswers,
        directions: selectedDirections,
        summary: interviewSummary,
        resumeAnalysis: resumeAnalysisResult
      } 
    });
  };

  /**
   * 重新开始面试
   * 重置状态并重新开始
   */
  const handleRestartInterview = () => {
    setIsInterviewComplete(false);
    setInterviewAnswers([]);
    setInterviewSummary(null);
    setResumeAnalysisResult(null);
  };

  /**
   * 返回首页
   */
  const handleBackToHome = () => {
    navigate('/');
  };

  // 如果没有选择面试方向，显示加载状态
  if (!selectedDirections || selectedDirections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载面试...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 页面头部 */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* 面试信息 */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">模拟面试</h1>
                <div className="text-sm text-gray-600">
                  面试方向: {getDirectionNames(selectedDirections)}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <Button
                onClick={handleBackToHome}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isInterviewComplete ? (
          /* 面试进行中 */
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
              <DialogueInterview
                selectedDirections={selectedDirections}
                resumeFile={resumeFile}
                jobDescription={jobDescription}
                onInterviewComplete={handleInterviewComplete}
              />
            </div>
          </div>
        ) : (
          /* 面试已完成 */
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
              <div className="text-green-600 mb-6">
                <svg className="h-20 w-20 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">面试完成！</h2>
                <p className="text-gray-600 text-lg mb-6">恭喜您完成了所有面试问题</p>
                <p className="text-sm text-gray-500">正在生成分析报告，2秒后自动跳转...</p>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleViewSummary}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  查看总结
                </Button>
                <Button
                  onClick={handleRestartInterview}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  重新开始
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Interview;