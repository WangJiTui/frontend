/**
 * 视频预览组件
 * 用于显示摄像头实时预览和录制状态
 */

import React, { useRef, useEffect } from "react";

/**
 * VideoPreview组件 - 视频预览
 * 功能：
 * - 显示摄像头实时预览
 * - 显示录制状态指示器
 * - 处理视频流绑定
 * 
 * @param {Object} props - 组件属性
 * @param {boolean} props.isRecording - 是否正在录制
 * @param {MediaStream|null} props.videoStream - 视频流对象
 */
const VideoPreview = ({ isRecording, videoStream }) => {
  const videoRef = useRef(null); // 视频元素引用

  /**
   * 当视频流变化时，更新视频源
   */
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  return (
    <div className="video-preview relative w-full max-w-md mx-auto">
      {/* 录制状态且有视频流时显示视频预览 */}
      {isRecording && videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-auto rounded-lg shadow-lg"
        />
      ) : (
        /* 无录制或无视频流时显示占位符 */
        <div className="flex flex-col items-center justify-center w-full h-64 bg-gray-200 rounded-lg border-dashed border-4 border-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-500 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-gray-600 text-xl font-semibold">
            {isRecording ? "面试进行中..." : "准备开始面试"}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
