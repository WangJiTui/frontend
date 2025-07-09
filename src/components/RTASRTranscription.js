import React, { useReducer, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import RTASRService from '../services/rtasrService';
import FallbackSpeechService from '../services/fallbackSpeechService';

const initialState = {
    isListening: false,
    transcript: '',
    status: 'idle',
    statusMessage: '',
    error: '',
    showDiagnosis: false,
    diagnosisResult: null
};

const actionTypes = {
    SET_LISTENING: 'SET_LISTENING',
    SET_TRANSCRIPT: 'SET_TRANSCRIPT',
    SET_STATUS: 'SET_STATUS',
    SET_ERROR: 'SET_ERROR',
    SET_DIAGNOSIS: 'SET_DIAGNOSIS',
    RESET: 'RESET'
};

function rtasrReducer(state, action) {
    switch (action.type) {
        case actionTypes.SET_LISTENING:
            return {
                ...state,
                isListening: action.payload
            };
        case actionTypes.SET_TRANSCRIPT:
            return {
                ...state,
                transcript: action.payload
            };
        case actionTypes.SET_STATUS:
            return {
                ...state,
                status: action.payload.status,
                statusMessage: action.payload.message
            };
        case actionTypes.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                status: 'error'
            };
        case actionTypes.SET_DIAGNOSIS:
            return {
                ...state,
                showDiagnosis: true,
                diagnosisResult: action.payload
            };
        case actionTypes.RESET:
            return {
                ...initialState
            };
        default:
            return state;
    }
}

const RTASRTranscription = forwardRef(({ onTranscriptChange, onStatusChange, autoStart = false, isInterviewMode = false }, ref) => {
    const [state, dispatch] = useReducer(rtasrReducer, initialState);
    const { isListening } = state;
    
    const rtasrRef = useRef(null);
    const fallbackRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const lastTranscriptRef = useRef('');
    const latestResultRef = useRef({ final: '', interim: '', full: '' });
    const isInitializedRef = useRef(false);
    const currentServiceRef = useRef('primary');
    const switchAttemptRef = useRef(false);

    const startSilenceTimer = useCallback(() => {
        if (isInterviewMode) {
            return;
        }
        
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        
        silenceTimerRef.current = setTimeout(() => {
            if (state.isListening && rtasrRef.current) {
                console.log('检测到静音，自动停止转写');
                rtasrRef.current.stopRealTimeTranscription().then(() => {
                    dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                }).catch((error) => {
                    console.error('静音自动停止失败:', error);
                });
            }
        }, 3000);
    }, [isInterviewMode]);

    const resetSilenceTimer = useCallback(() => {
        if (isInterviewMode) {
            return;
        }
        
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        startSilenceTimer();
    }, [isInterviewMode]);

    const handleStopListening = useCallback(async () => {
            try {
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
                
            if (currentServiceRef.current === 'fallback' && fallbackRef.current) {
                await fallbackRef.current.stopRealTimeTranscription();
            } else if (rtasrRef.current) {
                await rtasrRef.current.stopRealTimeTranscription();
            }
            
                dispatch({ type: actionTypes.SET_LISTENING, payload: false });
            } catch (error) {
                console.error('停止失败:', error);
                dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
        }
    }, []);

    const handleStartListening = useCallback(async () => {
        try {
            dispatch({ type: actionTypes.SET_ERROR, payload: '' });
            
            if (state.isListening) {
                console.log('已经在监听中，先停止再重新开始');
                await handleStopListening();
            }
            
            let success = false;
            
            if (currentServiceRef.current === 'primary' && rtasrRef.current && !rtasrRef.current.isServiceDisabled()) {
                success = await rtasrRef.current.startRealTimeTranscription();
            }
            else if (currentServiceRef.current === 'fallback' && fallbackRef.current) {
                success = await fallbackRef.current.startRealTimeTranscription();
            }
            else if (!rtasrRef.current) {
                console.log('没有可用服务，初始化RTASR服务');
                return;
            }
            
            if (success) {
                if (!isInterviewMode) {
                    startSilenceTimer();
                }
                lastTranscriptRef.current = '';
            } else {
                dispatch({ type: actionTypes.SET_ERROR, payload: '启动语音转写失败' });
            }
        } catch (error) {
            console.error('启动失败:', error);
            dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
        }
    }, [isInterviewMode]);

    const onTranscriptChangeRef = useRef(onTranscriptChange);
    const onStatusChangeRef = useRef(onStatusChange);
    
    useEffect(() => {
        onTranscriptChangeRef.current = onTranscriptChange;
        onStatusChangeRef.current = onStatusChange;
    }, [onTranscriptChange, onStatusChange]);

    const setupRTASRCallbacks = useCallback(() => {
        if (!rtasrRef.current) return;
        
        rtasrRef.current.onTranscriptionResult((result) => {
            const confirmedText = result.final;
            dispatch({ type: actionTypes.SET_TRANSCRIPT, payload: confirmedText });
            
            latestResultRef.current = {
                final: result.final,
                interim: result.interim,
                full: result.final
            };
            
            if (onTranscriptChangeRef.current) {
                onTranscriptChangeRef.current({ ...latestResultRef.current });
            }

            if (confirmedText && confirmedText !== lastTranscriptRef.current) {
                resetSilenceTimer();
                lastTranscriptRef.current = confirmedText;
            }
        });

        rtasrRef.current.onStatusChange((status, message) => {
            dispatch({ type: actionTypes.SET_STATUS, payload: { status, message } });
            
            if (status === 'listening') {
                dispatch({ type: actionTypes.SET_LISTENING, payload: true });
            } else if (status === 'stopped' || status === 'error') {
                dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            }
            
            if (onStatusChangeRef.current) {
                onStatusChangeRef.current(status, message);
            }
        });

        rtasrRef.current.onError((error) => {
            dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
            console.error('RTASR错误:', error);
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        });
    }, [resetSilenceTimer]);

    const setupFallbackCallbacks = useCallback(() => {
        if (!fallbackRef.current) return;
        
        fallbackRef.current.onTranscriptionResult((result) => {
            const confirmedText = result.final;
            dispatch({ type: actionTypes.SET_TRANSCRIPT, payload: confirmedText });
            
            latestResultRef.current = {
                final: result.final,
                interim: result.interim,
                full: result.final
            };
            
            if (onTranscriptChangeRef.current) {
                onTranscriptChangeRef.current({ ...latestResultRef.current });
            }

            if (confirmedText && confirmedText !== lastTranscriptRef.current) {
                resetSilenceTimer();
                lastTranscriptRef.current = confirmedText;
            }
        });

        fallbackRef.current.onStatusChange((status, message) => {
            dispatch({ type: actionTypes.SET_STATUS, payload: { status, message: `[本地] ${message}` } });
            
            if (status === 'listening') {
                dispatch({ type: actionTypes.SET_LISTENING, payload: true });
            } else if (status === 'stopped' || status === 'error') {
                dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            }
            
            if (onStatusChangeRef.current) {
                onStatusChangeRef.current(status, `[本地] ${message}`);
            }
        });

        fallbackRef.current.onError((error) => {
            dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
            console.error('FallbackSpeech错误:', error);
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        });
    }, [resetSilenceTimer]);

    const initializeServices = useCallback(async () => {
        if (isInitializedRef.current) return;
        
        try {
            if (!rtasrRef.current) {
                rtasrRef.current = new RTASRService();
                setupRTASRCallbacks();
            }
            
            if (!fallbackRef.current) {
                fallbackRef.current = new FallbackSpeechService();
                setupFallbackCallbacks();
            }
            
            isInitializedRef.current = true;
            console.log('语音服务初始化完成');
        } catch (error) {
            console.error('初始化语音服务失败:', error);
            dispatch({ type: actionTypes.SET_ERROR, payload: '初始化语音服务失败' });
        }
    }, [setupRTASRCallbacks, setupFallbackCallbacks]);

    const tryFallbackService = useCallback(async () => {
        if (switchAttemptRef.current) {
            console.log('正在尝试切换服务，跳过重复尝试');
            return false;
        }

        switchAttemptRef.current = true;
        
        try {
            console.log('主要服务失败，尝试使用备用服务');
            
            if (!fallbackRef.current) {
                fallbackRef.current = new FallbackSpeechService();
                setupFallbackCallbacks();
            }
            
            const success = await fallbackRef.current.startRealTimeTranscription();
            if (success) {
                currentServiceRef.current = 'fallback';
                if (!isInterviewMode) {
                    startSilenceTimer();
                }
                lastTranscriptRef.current = '';
                console.log('成功切换到备用服务');
                return true;
            }
        } catch (error) {
            console.error('备用服务启动失败:', error);
        } finally {
            switchAttemptRef.current = false;
        }
        
        return false;
    }, [setupFallbackCallbacks, isInterviewMode, startSilenceTimer]);

    const handleServiceRetry = useCallback(async () => {
        if (rtasrRef.current && !rtasrRef.current.isServiceDisabled()) {
            const success = await rtasrRef.current.startRealTimeTranscription();
            if (success) {
                currentServiceRef.current = 'primary';
                if (!isInterviewMode) {
                    startSilenceTimer();
                }
                lastTranscriptRef.current = '';
                console.log('重新连接到主要服务成功');
                return true;
            }
        }
        
        const fallbackSuccess = await tryFallbackService();
        return fallbackSuccess;
    }, [isInterviewMode, startSilenceTimer, tryFallbackService]);

    const switchToService = useCallback(async (serviceType) => {
        try {
            if (state.isListening) {
                await handleStopListening();
            }
            
            if (serviceType === 'primary' && rtasrRef.current) {
                const success = await rtasrRef.current.startRealTimeTranscription();
                if (success) {
                    currentServiceRef.current = 'primary';
                    return true;
                }
            } else if (serviceType === 'fallback' && fallbackRef.current) {
                const success = await fallbackRef.current.startRealTimeTranscription();
                if (success) {
                    currentServiceRef.current = 'fallback';
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error(`切换到${serviceType}服务失败:`, error);
            return false;
        }
    }, [state.isListening, handleStopListening]);

    const performDiagnosis = useCallback(async () => {
        const result = {
            microphone: false,
            rtasrService: false,
            fallbackService: false,
            permissions: false,
            network: navigator.onLine
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            result.microphone = true;
            result.permissions = true;
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.log('麦克风测试失败:', error);
        }

        if (rtasrRef.current) {
            try {
                const testResult = await rtasrRef.current.testConnection();
                result.rtasrService = testResult;
            } catch (error) {
                console.log('RTASR服务测试失败:', error);
            }
        }

        if (fallbackRef.current) {
            try {
                const testResult = await fallbackRef.current.testConnection();
                result.fallbackService = testResult;
            } catch (error) {
                console.log('备用服务测试失败:', error);
            }
        }

        dispatch({ type: actionTypes.SET_DIAGNOSIS, payload: result });
        return result;
    }, []);

    useEffect(() => {
        const initializeAndStart = async () => {
            await initializeServices();
            if (autoStart) {
                setTimeout(() => {
                    handleStartListening();
                }, 500);
            }
        };
        
        initializeAndStart();
        
        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            
            if (rtasrRef.current && state.isListening) {
                rtasrRef.current.stopRealTimeTranscription().catch(console.error);
            }
            
            if (fallbackRef.current && state.isListening) {
                fallbackRef.current.stopRealTimeTranscription().catch(console.error);
            }
        };
    }, []);

    useImperativeHandle(ref, () => ({
        startRealTimeTranscription: handleStartListening,
        stopRealTimeTranscription: handleStopListening,
        isTranscribing: () => state.isListening,
        getTranscriptionResult: () => latestResultRef.current,
        getFinalTranscript: () => latestResultRef.current.final,
        clearTranscriptionResult: () => {
            latestResultRef.current = { final: '', interim: '', full: '' };
            dispatch({ type: actionTypes.SET_TRANSCRIPT, payload: '' });
        },
        switchToService: switchToService,
        testConnection: performDiagnosis,
        setSilenceDetection: (silenceTimeout, minAudioLength) => {
            if (rtasrRef.current && typeof rtasrRef.current.setSilenceDetection === 'function') {
                rtasrRef.current.setSilenceDetection(silenceTimeout, minAudioLength);
            }
            if (fallbackRef.current && typeof fallbackRef.current.setSilenceDetection === 'function') {
                fallbackRef.current.setSilenceDetection(silenceTimeout, minAudioLength);
            }
        }
    }), [handleStartListening, handleStopListening, state.isListening, switchToService, performDiagnosis]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'listening': return 'text-green-600';
            case 'processing': return 'text-yellow-600';
            case 'error': return 'text-red-600';
            case 'stopped': return 'text-gray-600';
            default: return 'text-gray-600';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'listening':
                return (
                    <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <path d="M12 19v4"/>
                        <path d="M8 23h8"/>
                    </svg>
                );
            case 'processing':
                return (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                    </svg>
                );
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">语音转写</h3>
                        <div className={`flex items-center space-x-1 ${getStatusColor(state.status)}`}>
                            {getStatusIcon(state.status)}
                            <span className="text-sm">{state.statusMessage || '准备就绪'}</span>
                        </div>
                    </div>
                    
                    <div className="flex space-x-2">
                        <button
                            onClick={handleStartListening}
                            disabled={state.isListening}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {state.isListening ? '录音中...' : '开始录音'}
                        </button>
                        
                        <button
                            onClick={handleStopListening}
                            disabled={!state.isListening}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            停止录音
                        </button>
                        
                        <button
                            onClick={performDiagnosis}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                        >
                            诊断
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-md p-4 min-h-[100px]">
                    <div className="text-sm text-gray-600 mb-2">转写结果：</div>
                    <div className="text-gray-800 whitespace-pre-wrap">
                        {state.transcript || '等待开始录音...'}
                    </div>
                </div>

                {state.error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span className="text-red-800 text-sm">{state.error}</span>
                        </div>
                        <div className="mt-2 flex space-x-2">
                            <button
                                onClick={handleServiceRetry}
                                className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                            >
                                重试
                            </button>
                            <button
                                onClick={() => switchToService('fallback')}
                                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                            >
                                切换到本地服务
                            </button>
                        </div>
                    </div>
                )}

                {state.showDiagnosis && state.diagnosisResult && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">系统诊断结果</h4>
                        <div className="space-y-1 text-xs">
                            <div className={`flex items-center ${state.diagnosisResult.microphone ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                                麦克风: {state.diagnosisResult.microphone ? '正常' : '异常'}
                            </div>
                            <div className={`flex items-center ${state.diagnosisResult.permissions ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                                权限: {state.diagnosisResult.permissions ? '已授权' : '未授权'}
                            </div>
                            <div className={`flex items-center ${state.diagnosisResult.network ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                                网络: {state.diagnosisResult.network ? '正常' : '断开'}
                            </div>
                            <div className={`flex items-center ${state.diagnosisResult.rtasrService ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                                RTASR服务: {state.diagnosisResult.rtasrService ? '正常' : '异常'}
                            </div>
                            <div className={`flex items-center ${state.diagnosisResult.fallbackService ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                                本地服务: {state.diagnosisResult.fallbackService ? '正常' : '异常'}
                            </div>
                        </div>
                        <button
                            onClick={() => dispatch({ type: actionTypes.SET_DIAGNOSIS, payload: null })}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                            关闭
                        </button>
                    </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>当前服务: {currentServiceRef.current === 'primary' ? 'RTASR' : '本地语音识别'}</span>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => switchToService('primary')}
                            className={`px-2 py-1 rounded text-xs ${currentServiceRef.current === 'primary' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            RTASR
                        </button>
                        <button
                            onClick={() => switchToService('fallback')}
                            className={`px-2 py-1 rounded text-xs ${currentServiceRef.current === 'fallback' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            本地
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default RTASRTranscription; 