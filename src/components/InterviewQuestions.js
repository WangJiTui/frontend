/**
 * 面试问题组件
 * 用于显示和管理面试问题列表
 */

import React, { useState, useEffect } from 'react';
import { getInterviewQuestions } from '../services/api';
import Button from './Button';

/**
 * InterviewQuestions组件 - 面试问题管理器
 * 功能：
 * - 显示面试问题列表
 * - 管理问题状态（已回答/未回答）
 * - 提供问题导航功能
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.selectedDirections - 面试方向数组
 * @param {boolean} props.isVisible - 是否可见
 */
const InterviewQuestions = ({ selectedDirections, isVisible = true }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false); // 是否展开问题列表

  useEffect(() => {
    if (selectedDirections && selectedDirections.length > 0 && isVisible) {
      loadQuestions();
    }
  }, [selectedDirections, isVisible]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const questionList = await getInterviewQuestions(selectedDirections);
      setQuestions(questionList);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('加载面试问题失败:', error);
      setError('加载面试问题失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  /**
   * 检查问题是否已回答
   * @param {number} questionIndex - 问题索引
   * @returns {boolean} 是否已回答
   */
  const isQuestionAnswered = (questionIndex) => {
    return answers.some(answer => answer.questionIndex === questionIndex);
  };

  /**
   * 获取问题的回答内容
   * @param {number} questionIndex - 问题索引
   * @returns {string} 回答内容
   */
  const getQuestionAnswer = (questionIndex) => {
    const answer = answers.find(answer => answer.questionIndex === questionIndex);
    return answer ? answer.answer : '';
  };

  /**
   * 处理问题点击
   * @param {number} questionIndex - 问题索引
   */
  const handleQuestionClick = (questionIndex) => {
    if (onQuestionSelect) {
      onQuestionSelect(questionIndex);
    }
  };

  /**
   * 切换问题列表展开状态
   */
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* 问题列表头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          面试问题 ({questions.length})
        </h3>
        <Button
          onClick={toggleExpanded}
          label={expanded ? "收起" : "展开"}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
        />
      </div>

      {/* 问题列表 */}
      <div className={`${expanded ? 'max-h-96' : 'max-h-64'} overflow-y-auto`}>
        {questions.map((question, index) => {
          const isAnswered = isQuestionAnswered(index);
          const isCurrent = index === currentQuestionIndex;
          const answer = getQuestionAnswer(index);

          return (
            <div
              key={index}
              className={`
                p-4 border-b border-gray-100 cursor-pointer transition-colors
                ${isCurrent ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}
              `}
              onClick={() => handleQuestionClick(index)}
            >
              {/* 问题头部 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`
                    w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center
                    ${isAnswered 
                      ? 'bg-green-100 text-green-800' 
                      : isCurrent 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {index + 1}
                  </span>
                  <span className={`
                    text-sm font-medium
                    ${isAnswered ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-600'}
                  `}>
                    {isAnswered ? '已回答' : isCurrent ? '当前问题' : '未回答'}
                  </span>
                </div>
                
                {/* 状态指示器 */}
                {isAnswered && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* 问题内容 */}
              <div className="ml-8">
                <p className="text-gray-900 text-sm leading-relaxed mb-2">
                  {question}
                </p>
                
                {/* 回答预览 */}
                {isAnswered && answer && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600 mb-1">回答预览:</p>
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {answer.length > 100 ? `${answer.substring(0, 100)}...` : answer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 统计信息 */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>已回答: {answers.length}</span>
          <span>总问题: {questions.length}</span>
          <span>进度: {Math.round((answers.length / questions.length) * 100)}%</span>
        </div>
        
        {/* 进度条 */}
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(answers.length / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default InterviewQuestions; 