import React, { useRef, useEffect, useState } from 'react';

const CameraPreview = ({ videoRecorder, isRecording, className = '' }) => {
  const videoRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const setupVideoStream = () => {
      if (videoRecorder && videoRef.current) {
        try {
          const stream = videoRecorder.getStream();
          if (stream) {
            videoRef.current.srcObject = stream;
            setHasError(false);
            setErrorMessage('');
          }
        } catch (error) {
          console.error('设置视频流失败:', error);
          setHasError(true);
          setErrorMessage('无法显示摄像头画面');
        }
      }
    };

    if (isRecording) {
      setupVideoStream();
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [videoRecorder, isRecording]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  if (hasError) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">摄像头预览</h4>
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        </div>
        <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-700">摄像头预览</h4>
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
          {isRecording && (
            <span className="text-xs text-red-600 font-medium">录制中</span>
          )}
        </div>
        
        <button
          onClick={toggleVisibility}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title={isVisible ? "隐藏预览" : "显示预览"}
        >
          {isVisible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      
      {isVisible && (
        <div className="relative">
          {isRecording ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video object-cover bg-black"
            />
          ) : (
            <div className="aspect-video bg-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">摄像头未启动</p>
                <p className="text-xs text-gray-400 mt-1">开始录制时将显示画面</p>
              </div>
            </div>
          )}
          
          {isRecording && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">REC</span>
            </div>
          )}
        </div>
      )}
      
      <div className="p-2 bg-gray-50 text-xs text-gray-600 text-center">
        {isRecording ? '正在录制视频和音频' : '准备录制'}
      </div>
    </div>
  );
};

export default CameraPreview;