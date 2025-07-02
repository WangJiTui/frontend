/**
 * 面试总结页面组件
 * 显示面试结果、反馈和建议
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';

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
 * Summary组件 - 面试总结页面
 * 功能：
 * - 显示面试问题和回答
 * - 提供面试反馈和建议
 * - 支持重新开始面试或返回首页
 */
const Summary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 从路由状态中获取面试数据
  const { answers, directions, summary, resumeAnalysis } = location.state || {};
  const [isLoading, setIsLoading] = useState(false); // 加载状态

  /**
   * 验证面试数据是否有效
   * 如果没有数据，重定向到首页
   */
  useEffect(() => {
    if (!answers || !directions) {
      console.warn('No interview data found, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [answers, directions, navigate]);

  /**
   * 重新开始面试
   * 导航到面试页面并传递面试方向
   */
  const handleRestartInterview = () => {
    navigate('/interview', { state: { selectedDirections: directions } });
  };

  /**
   * 返回首页
   */
  const handleBackToHome = () => {
    navigate('/');
  };

  /**
   * 下载面试记录
   * 将面试数据导出为文本文件
   */
  const handleDownloadSummary = () => {
    setIsLoading(true);
    
    try {
      // 生成面试记录文本
      let summaryText = `面试总结报告\n`;
      summaryText += `面试方向: ${getDirectionNames(directions)}\n`;
      summaryText += `面试时间: ${new Date().toLocaleString()}\n`;
      summaryText += `问题数量: ${answers.length}\n\n`;
      
      // 如果有简历分析结果，添加到报告中
      if (resumeAnalysis) {
        summaryText += `===== 简历分析结果 =====\n\n`;
        
        if (typeof resumeAnalysis === 'object' && resumeAnalysis !== null) {
                     // 如果是对象，格式化显示
           Object.entries(resumeAnalysis).forEach(([key, value]) => {
             // 后端已经传中文字段名，无需映射
             summaryText += `${key}:\n`;
            
            if (Array.isArray(value)) {
              value.forEach((item, index) => {
                summaryText += `${index + 1}. ${item}\n`;
              });
            } else if (typeof value === 'object') {
              summaryText += JSON.stringify(value, null, 2);
            } else {
              summaryText += `${value}`;
            }
            summaryText += `\n\n`;
          });
        } else {
          summaryText += `${resumeAnalysis}\n\n`;
        }
      }

      // 如果有总结信息，添加到报告中
      if (summary) {
        summaryText += `===== 面试评估结果 =====\n\n`;
        
        if (summary.overall_score !== undefined) {
          summaryText += `总体评分: ${summary.overall_score}/100\n\n`;
        }
        
        if (summary.technical_assessment) {
          summaryText += `技术能力评估:\n`;
          summaryText += `评分: ${summary.technical_assessment.score}/100\n`;
          summaryText += `反馈: ${summary.technical_assessment.feedback}\n\n`;
        }
        
        if (summary.communication_assessment) {
          summaryText += `沟通表达评估:\n`;
          summaryText += `评分: ${summary.communication_assessment.score}/100\n`;
          summaryText += `反馈: ${summary.communication_assessment.feedback}\n\n`;
        }
        
        if (summary.strengths && summary.strengths.length > 0) {
          summaryText += `优势:\n`;
          summary.strengths.forEach((strength, index) => {
            summaryText += `${index + 1}. ${strength}\n`;
          });
          summaryText += `\n`;
        }
        
        if (summary.areas_for_improvement && summary.areas_for_improvement.length > 0) {
          summaryText += `改进建议:\n`;
          summary.areas_for_improvement.forEach((improvement, index) => {
            summaryText += `${index + 1}. ${improvement}\n`;
          });
          summaryText += `\n`;
        }
        
        if (summary.recommendations && summary.recommendations.length > 0) {
          summaryText += `具体建议:\n`;
          summary.recommendations.forEach((recommendation, index) => {
            summaryText += `${index + 1}. ${recommendation}\n`;
          });
          summaryText += `\n`;
        }
        
        if (summary.detailed_feedback) {
          summaryText += `详细反馈:\n${summary.detailed_feedback}\n\n`;
        }
        
        summaryText += `===== 问答记录 =====\n\n`;
      }
      
      answers.forEach((answer, index) => {
        summaryText += `问题 ${index + 1}:\n`;
        summaryText += `${answer.question}\n\n`;
        summaryText += `回答:\n`;
        summaryText += `${answer.answer}\n\n`;
        summaryText += `---\n\n`;
      });
      
      // 创建并下载文件
      const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `面试总结_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 如果没有面试数据，显示加载状态
  if (!answers || !directions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载面试总结...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 页面头部 */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* 页面标题 */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">面试总结</h1>
                <div className="text-sm text-gray-600">
                  面试方向: {getDirectionNames(directions)}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <Button
                onClick={handleDownloadSummary}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {isLoading ? "下载中..." : "下载总结"}
              </Button>
              <Button
                onClick={handleRestartInterview}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                重新面试
              </Button>
              <Button
                onClick={handleBackToHome}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 简历分析结果 */}
          {resumeAnalysis && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                简历分析结果
              </h2>
              
              {/* 动态渲染简历分析数据 */}
              <div className="space-y-6">
                {(() => {
                                     // 直接使用后端传来的中文字段名
                   const formatFieldName = (key) => {
                     return key; // 后端已经传中文，无需映射
                   };

                                     const getFieldIcon = (key) => {
                     // 基于中文字段名的图标映射
                     const iconMapping = {
                       '综合评分': '📊',
                       '匹配度': '🎯',
                       '技能清单': '🛠️',
                       '工作经验': '💼',
                       '教育背景': '🎓',
                       '优势特点': '💪',
                       '需要改进': '⚠️',
                       '改进建议': '💡',
                       '推荐建议': '📋',
                       '总结': '📝',
                       '详细分析': '🔍',
                       '简历分析': '📄',
                       '岗位分析': '💼',
                       '匹配度分析': '🎯'
                     };
                     return iconMapping[key] || '📄';
                   };

                  // 检查是否为对象类型的数据
                  if (typeof resumeAnalysis === 'object' && resumeAnalysis !== null) {
                    // 如果是对象，遍历对象的所有键值对
                    return Object.entries(resumeAnalysis).map(([key, value], index) => (
                      <div key={key} className={`mb-6 last:mb-0 ${index > 0 ? 'border-t border-gray-100 pt-4' : ''}`}>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <span className="text-xl mr-2">{getFieldIcon(key)}</span>
                          {formatFieldName(key)}
                        </h3>
                        <div className="ml-8">
                          {Array.isArray(value) ? (
                            // 如果值是数组，渲染为美观的列表
                            <div className="space-y-2">
                              {value.map((item, index) => (
                                <div key={index} className="flex items-start bg-gray-50 rounded-md p-3">
                                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                  <div className="flex-1">
                                    {typeof item === 'object' ? (
                                      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                                        {JSON.stringify(item, null, 2)}
                                      </pre>
                                    ) : (
                                      <span className="text-gray-700">{String(item)}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : typeof value === 'object' ? (
                            // 如果值是对象，使用卡片样式
                            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-400">
                              <pre className="text-sm text-gray-600 whitespace-pre-wrap overflow-auto">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            </div>
                          ) : typeof value === 'number' ? (
                            // 如果是数字，特别展示（可能是分数）
                                                         <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-l-4 border-green-400">
                               <span className="text-2xl font-bold text-green-600">{value}</span>
                               {(key.includes('评分') || key.includes('匹配度')) && (
                                 <span className="text-gray-500 ml-2">/ 100</span>
                               )}
                             </div>
                          ) : (
                            // 如果值是字符串，使用段落样式
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{String(value)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  } else {
                    // 如果不是对象，直接显示内容
                    return (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {String(resumeAnalysis)}
                        </pre>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {/* 面试总体评分 - 如果有summary的话 */}
          {summary && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                面试评估结果
              </h2>
              
              {/* 总体评分 */}
              {summary.overall_score !== undefined && (
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mb-4">
                    <span className="text-4xl font-bold text-white">{summary.overall_score}</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-700">总体评分</p>
                  <p className="text-sm text-gray-500">满分100分</p>
                </div>
              )}

              {/* 技能评估网格 */}
              {(summary.technical_assessment || summary.communication_assessment) && (
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {summary.technical_assessment && (
                    <div className="bg-blue-50 rounded-xl p-6">
                      <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        技术能力评估
                      </h3>
                      <div className="text-3xl font-bold text-blue-700 mb-2">{summary.technical_assessment.score}/100</div>
                      <p className="text-blue-800 text-sm">{summary.technical_assessment.feedback}</p>
                    </div>
                  )}

                  {summary.communication_assessment && (
                    <div className="bg-green-50 rounded-xl p-6">
                      <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        沟通表达评估
                      </h3>
                      <div className="text-3xl font-bold text-green-700 mb-2">{summary.communication_assessment.score}/100</div>
                      <p className="text-green-800 text-sm">{summary.communication_assessment.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 优势和改进建议 */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 优势分析 */}
                {summary.strengths && summary.strengths.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="font-semibold text-purple-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      核心优势
                    </h3>
                    <ul className="space-y-2">
                      {summary.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-purple-800 flex items-start">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 改进建议 */}
                {summary.areas_for_improvement && summary.areas_for_improvement.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-6">
                    <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      改进建议
                    </h3>
                    <ul className="space-y-2">
                      {summary.areas_for_improvement.map((improvement, index) => (
                        <li key={index} className="text-sm text-orange-800 flex items-start">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 具体建议 */}
              {summary.recommendations && summary.recommendations.length > 0 && (
                <div className="bg-indigo-50 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-indigo-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    学习建议
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {summary.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-indigo-200">
                        <p className="text-sm text-indigo-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 详细反馈 */}
              {summary.detailed_feedback && (
                <div className="bg-gray-50 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    详细反馈
                  </h3>
                  <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                    {summary.detailed_feedback}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 面试概览 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">面试概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{answers.length}</div>
                <div className="text-sm text-blue-800">问题数量</div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <div className="text-2xl font-bold text-green-600">
                  {answers.filter(a => a.answer && a.answer.trim() !== '用户未提供回答').length}
                </div>
                <div className="text-sm text-green-800">已回答</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">
                  {new Date().toLocaleDateString()}
                </div>
                <div className="text-sm text-purple-800">面试日期</div>
              </div>
            </div>
          </div>

          {/* 面试问答记录 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              面试问答记录
            </h2>
            <div className="space-y-6">
              {answers.map((answer, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-start space-x-3 mb-4">
                    <span className="text-sm font-medium text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                      问题 {index + 1}
                    </span>
                    {answer.answer && answer.answer.trim() !== '用户未提供回答' ? (
                      <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                        已回答
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-red-600 bg-red-100 px-3 py-1 rounded-full">
                        未回答
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">问题：</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{answer.question}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">回答：</h4>
                      <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                        {answer.answer || '未提供回答'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>npm
        </div>
      </div>
    </div>
  );
};

export default Summary;
