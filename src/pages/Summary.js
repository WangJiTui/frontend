import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';

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

const Summary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { answers, directions, summary, resumeAnalysis } = location.state || {};
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!answers || !directions) {
      console.warn('No interview data found, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [answers, directions, navigate]);

  const handleRestartInterview = () => {
    navigate('/interview', { state: { selectedDirections: directions } });
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleDownloadSummary = () => {
    setIsLoading(true);
    
    try {
      let summaryText = `面试总结报告\n`;
      summaryText += `面试方向: ${getDirectionNames(directions)}\n`;
      summaryText += `面试时间: ${new Date().toLocaleString()}\n`;
      summaryText += `问题数量: ${answers.length}\n\n`;
      
      if (resumeAnalysis) {
        summaryText += `===== 简历分析结果 =====\n\n`;
        
        if (typeof resumeAnalysis === 'object' && resumeAnalysis !== null) {
          Object.entries(resumeAnalysis).forEach(([key, value]) => {
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
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">面试总结</h1>
                <p className="text-sm text-gray-600">面试方向: {getDirectionNames(directions)}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleDownloadSummary}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
              >
                {isLoading ? '下载中...' : '下载报告'}
              </Button>
              <Button
                onClick={handleRestartInterview}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                重新面试
              </Button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="order-2 lg:order-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <h2 className="text-2xl font-bold flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  面试问答详情
                </h2>
                <p className="text-blue-100 mt-2">回顾您在面试中的表现</p>
              </div>

              <div className="p-6">
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {answers.map((answer, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                          问题 {index + 1}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{answer.question}</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{answer.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            {resumeAnalysis && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    简历分析结果
                  </h2>
                  <p className="text-green-100 mt-2">基于您的简历内容生成的分析</p>
                </div>

                <div className="p-6">
                  {typeof resumeAnalysis === 'object' && resumeAnalysis !== null ? (
                    <div className="space-y-6">
                      {Object.entries(resumeAnalysis).map(([key, value]) => {
                        const formatFieldName = (key) => {
                          return key;
                        };

                        const getFieldIcon = (key) => {
                          if (key.includes('技能') || key.includes('能力')) {
                            return (
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            );
                          } else if (key.includes('经验') || key.includes('工作')) {
                            return (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2V6" />
                              </svg>
                            );
                          } else if (key.includes('建议') || key.includes('推荐')) {
                            return (
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            );
                          } else {
                            return (
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            );
                          }
                        };

                        return (
                          <div key={key} className="border-l-4 border-green-500 pl-4 py-2">
                            <div className="flex items-center mb-2">
                              {getFieldIcon(key)}
                              <h4 className="font-semibold text-gray-900 ml-2">{formatFieldName(key)}</h4>
                            </div>
                            <div className="text-gray-700">
                              {Array.isArray(value) ? (
                                <ul className="list-disc list-inside space-y-1">
                                  {value.map((item, index) => (
                                    <li key={index} className="text-sm">{item}</li>
                                  ))}
                                </ul>
                              ) : typeof value === 'object' ? (
                                <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-sm leading-relaxed">{value}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{resumeAnalysis}</p>
                  )}
                </div>
              </div>
            )}

            {summary && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    面试评估
                  </h2>
                  <p className="text-purple-100 mt-2">AI智能分析您的面试表现</p>
                </div>

                <div className="p-6 space-y-6">
                  {summary.overall_score !== undefined && (
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white text-2xl font-bold shadow-lg">
                        {summary.overall_score}
                      </div>
                      <p className="text-gray-600 mt-2">总体评分</p>
                    </div>
                  )}

                  {summary.technical_assessment && (
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          技术能力评估
                        </h4>
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                          {summary.technical_assessment.score}/100
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{summary.technical_assessment.feedback}</p>
                    </div>
                  )}

                  {summary.communication_assessment && (
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          沟通表达评估
                        </h4>
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                          {summary.communication_assessment.score}/100
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{summary.communication_assessment.feedback}</p>
                    </div>
                  )}

                  {summary.strengths && summary.strengths.length > 0 && (
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        表现优势
                      </h4>
                      <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                        {summary.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.areas_for_improvement && summary.areas_for_improvement.length > 0 && (
                    <div className="border-l-4 border-yellow-500 pl-4 py-2">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        改进建议
                      </h4>
                      <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                        {summary.areas_for_improvement.map((improvement, index) => (
                          <li key={index}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.recommendations && summary.recommendations.length > 0 && (
                    <div className="border-l-4 border-purple-500 pl-4 py-2">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        具体建议
                      </h4>
                      <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                        {summary.recommendations.map((recommendation, index) => (
                          <li key={index}>{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.detailed_feedback && (
                    <div className="border-l-4 border-gray-500 pl-4 py-2">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        详细反馈
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{summary.detailed_feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
