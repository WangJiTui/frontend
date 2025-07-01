import React, { useReducer, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import RTASRService from '../services/rtasrService';
import FallbackSpeechService from '../services/fallbackSpeechService';

// 定义状态类型
const initialState = {
    isListening: false,
    transcript: '',
    status: 'idle',
    statusMessage: '',
    error: '',
    showDiagnosis: false,
    diagnosisResult: null
};

// 定义action类型
const actionTypes = {
    SET_LISTENING: 'SET_LISTENING',
    SET_TRANSCRIPT: 'SET_TRANSCRIPT',
    SET_STATUS: 'SET_STATUS',
    SET_ERROR: 'SET_ERROR',
    SET_DIAGNOSIS: 'SET_DIAGNOSIS',
    RESET: 'RESET'
};

// 状态reducer
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
    
    // 服务引用
    const rtasrRef = useRef(null);
    const fallbackRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const lastTranscriptRef = useRef('');
    const latestResultRef = useRef({ final: '', interim: '', full: '' });
    const isInitializedRef = useRef(false);
    const currentServiceRef = useRef('primary'); // 'primary' | 'fallback'
    const switchAttemptRef = useRef(false);

    // 自动停止功能 - 检测静音
    const startSilenceTimer = useCallback(() => {
        // 在面试模式下，禁用组件级别的静音检测，使用服务级别的静音检测
        if (isInterviewMode) {
            return;
        }
        
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        
        // 3秒静音后自动停止
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
    }, [isInterviewMode]); // 移除state依赖避免重新创建

    const resetSilenceTimer = useCallback(() => {
        // 在面试模式下，禁用组件级别的静音检测
        if (isInterviewMode) {
            return;
        }
        
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        startSilenceTimer();
    }, [isInterviewMode]); // 移除函数依赖避免循环

    const handleStopListening = useCallback(async () => {
            try {
                // 清理静音计时器
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
                
            // 根据当前使用的服务停止
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
            
            // 如果已经在监听，先停止
            if (state.isListening) {
                console.log('已经在监听中，先停止再重新开始');
                await handleStopListening();
            }
            
            let success = false;
            
            // 尝试使用主要服务（RTASR）
            if (currentServiceRef.current === 'primary' && rtasrRef.current && !rtasrRef.current.isServiceDisabled()) {
                success = await rtasrRef.current.startRealTimeTranscription();
            }
            // 使用备用服务
            else if (currentServiceRef.current === 'fallback' && fallbackRef.current) {
                success = await fallbackRef.current.startRealTimeTranscription();
            }
            // 如果没有服务可用，初始化主要服务
            else if (!rtasrRef.current) {
                console.log('没有可用服务，初始化RTASR服务');
                return;
            }
            
            if (success) {
                // 启动静音计时器（仅在非面试模式下）
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
    }, [isInterviewMode]); // 移除可能导致循环的函数依赖

    // 使用ref保存最新的回调函数
    const onTranscriptChangeRef = useRef(onTranscriptChange);
    const onStatusChangeRef = useRef(onStatusChange);
    
    useEffect(() => {
        onTranscriptChangeRef.current = onTranscriptChange;
        onStatusChangeRef.current = onStatusChange;
    }, [onTranscriptChange, onStatusChange]);

    // 设置RTASR回调函数
    const setupRTASRCallbacks = useCallback(() => {
        if (!rtasrRef.current) return;
        
        rtasrRef.current.onTranscriptionResult((result) => {
            const confirmedText = result.final;
            dispatch({ type: actionTypes.SET_TRANSCRIPT, payload: confirmedText });
            
            // 更新最新结果的引用
            latestResultRef.current = {
                final: result.final,
                interim: result.interim,
                full: result.final
            };
            
            // 检测到新内容时重置静音计时器（仅在非面试模式下）
            if (!isInterviewMode && confirmedText !== lastTranscriptRef.current && confirmedText.trim()) {
                // 直接调用重置静音计时器逻辑，避免依赖
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                }
                if (!isInterviewMode) {
                    silenceTimerRef.current = setTimeout(() => {
                        if (state.isListening && rtasrRef.current) {
                            console.log('检测到静音，自动停止转写');
                            rtasrRef.current.stopRealTimeTranscription().catch((error) => {
                                console.error('静音自动停止失败:', error);
                            });
                        }
                    }, 3000);
                }
                lastTranscriptRef.current = confirmedText;
            } else if (isInterviewMode) {
                // 在面试模式下，只更新lastTranscriptRef
                lastTranscriptRef.current = confirmedText;
            }
            
            if (onTranscriptChangeRef.current) {
                onTranscriptChangeRef.current({
                    final: confirmedText,
                    interim: result.interim,
                    full: confirmedText,
                    isFinal: true
                });
            }
        });

        // 设置RTASR错误回调
        rtasrRef.current.onTranscriptionError((error) => {
            console.error('RTASR错误:', error);
            
            // 检查是否应该切换到备用服务
            if (currentServiceRef.current === 'primary' && !switchAttemptRef.current && FallbackSpeechService.isSupported()) {
                console.log('RTASR服务失败，尝试切换到备用语音识别服务');
                switchAttemptRef.current = true;
                
                // 禁用RTASR服务，停止重连尝试
                if (rtasrRef.current) {
                    rtasrRef.current.disable();
                }
                
                tryFallbackService();
                return;
            }
            
            // 如果已切换到备用服务，忽略RTASR的错误
            if (currentServiceRef.current === 'fallback') {
                console.log('已切换到备用服务，忽略RTASR错误:', error.message);
                return;
            }
            
            dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
            dispatch({ type: actionTypes.SET_LISTENING, payload: false });
            
            // 如果是网络错误，显示重试按钮
            if (error.message.includes('网络') || error.message.includes('连接')) {
                dispatch({ 
                    type: actionTypes.SET_STATUS, 
                    payload: { 
                        status: 'error', 
                        message: error.message + '，请点击重试按钮重新开始录音' 
                    } 
                });
            } else {
                dispatch({ 
                    type: actionTypes.SET_STATUS, 
                    payload: { status: 'error', message: error.message } 
                });
            }
            
            if (onStatusChangeRef.current) onStatusChangeRef.current('error', error.message);
        });

        // 设置RTASR状态变化回调
        rtasrRef.current.onTranscriptionStatus((status, message) => {
            // 如果已切换到备用服务，忽略RTASR的状态更新
            if (currentServiceRef.current === 'fallback') {
                console.log('已切换到备用服务，忽略RTASR状态:', { status, message });
                return;
            }
            
            dispatch({ 
                type: actionTypes.SET_STATUS, 
                payload: { status, message }
            });
            
            console.log('RTASR收到状态变化:', { status, message, isInterviewMode });
            
            switch (status) {
                case 'connecting':
                    dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                    dispatch({ type: actionTypes.SET_ERROR, payload: '' }); // 清除之前的错误
                    break;
                case 'listening':
                    dispatch({ type: actionTypes.SET_LISTENING, payload: true });
                    dispatch({ type: actionTypes.SET_ERROR, payload: '' });
                    break;
                case 'stopping':
                case 'stopped':
                    dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                    break;
                case 'error':
                    dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                    // 如果是网络错误，添加重试提示
                    if (message.includes('网络') || message.includes('连接')) {
                        message += '，请点击重试按钮重新开始录音';
                    }
                    break;
                case 'waiting':
                    dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                    dispatch({ type: actionTypes.SET_ERROR, payload: '' }); // 清除之前的错误
                    break;
                case 'disconnected':
                    dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                    // 如果是正常关闭，触发自动提交
                    if (message === '连接已正常关闭' && onStatusChange) {
                        console.log('检测到正常关闭，准备触发自动提交');
                        // 延迟一点时间，确保转写结果已经更新
                        setTimeout(() => {
                            console.log('触发disconnected状态回调');
                            if (onStatusChangeRef.current) {
                                onStatusChangeRef.current('disconnected', message);
                            }
                        }, 500);
                    }
                    break;
                default:
                    // 未知状态，记录日志但不进行特殊处理
                    console.warn('未知的RTASR状态:', status, message);
                    break;
            }
            
            if (onStatusChangeRef.current) onStatusChangeRef.current(status, message);
        });
    }, [isInterviewMode]); // 移除函数依赖，使用useRef保存最新的回调

    // 尝试使用备用服务
    const tryFallbackService = useCallback(async () => {
        if (!FallbackSpeechService.isSupported()) {
            dispatch({ type: actionTypes.SET_ERROR, payload: '主要语音服务不可用，浏览器也不支持备用语音识别' });
            return;
        }

        try {
            console.log('初始化备用语音服务');
            fallbackRef.current = new FallbackSpeechService();
            currentServiceRef.current = 'fallback';
            
            // 设置备用服务回调
            fallbackRef.current.onTranscriptionResult((result) => {
                dispatch({ type: actionTypes.SET_TRANSCRIPT, payload: result.transcript });
                
                latestResultRef.current = {
                    final: result.transcript,
                    interim: '',
                    full: result.transcript
                };
                
                if (onTranscriptChangeRef.current) {
                    onTranscriptChangeRef.current({
                        final: result.transcript,
                        interim: '',
                        full: result.transcript,
                        isFinal: result.isFinal
                    });
                }
            });
            
            fallbackRef.current.onTranscriptionError((error) => {
                console.error('备用服务错误:', error);
                dispatch({ type: actionTypes.SET_ERROR, payload: `备用语音服务错误: ${error.message}` });
                dispatch({ type: actionTypes.SET_LISTENING, payload: false });
            });
            
            fallbackRef.current.onTranscriptionStatus((status, message) => {
                dispatch({ 
                    type: actionTypes.SET_STATUS, 
                    payload: { status, message: `[备用] ${message}` }
                });
                
                if (status === 'listening') {
                    dispatch({ type: actionTypes.SET_LISTENING, payload: true });
                } else if (status === 'stopped' || status === 'error') {
                    dispatch({ type: actionTypes.SET_LISTENING, payload: false });
                }
                
                if (onStatusChangeRef.current) onStatusChangeRef.current(status, `[备用] ${message}`);
            });
            
            // 启动备用服务
            const success = await fallbackRef.current.startRealTimeTranscription();
            if (success) {
                console.log('备用服务启动成功，已禁用RTASR重连');
                dispatch({ type: actionTypes.SET_STATUS, payload: { 
                    status: 'listening', 
                    message: '已切换到浏览器内置语音识别，请继续说话' 
                }});
            } else {
                // 如果备用服务也失败了，重新启用RTASR服务
                if (rtasrRef.current) {
                    rtasrRef.current.enable();
                }
                currentServiceRef.current = 'primary';
                switchAttemptRef.current = false;
                throw new Error('启动备用语音服务失败');
            }
        } catch (error) {
            console.error('备用服务失败:', error);
            dispatch({ type: actionTypes.SET_ERROR, payload: `切换到备用服务失败: ${error.message}` });
        }
    }, []); // 移除函数依赖，使用ref访问最新回调

    // 初始化RTASR服务
    useEffect(() => {
        if (!rtasrRef.current) {
            console.log('初始化RTASR服务');
            rtasrRef.current = new RTASRService();
            setupRTASRCallbacks();
            isInitializedRef.current = true;
        }
    }, [setupRTASRCallbacks]);

    // 处理自动启动
    useEffect(() => {
        const initializeAndStart = async () => {
            if (autoStart && isInitializedRef.current && !isListening) {
                console.log('自动启动录音');
                try {
                    await handleStartListening();
                } catch (error) {
                    console.error('自动启动录音失败:', error);
                }
            }
        };

        initializeAndStart();
    }, [autoStart, isListening]);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
        startRealTimeTranscription: handleStartListening,
        stopRealTimeTranscription: handleStopListening,
        isTranscribing: () => state.isListening,
        getTranscriptionResult: () => latestResultRef.current,
        clearTranscriptionResult: () => {
            dispatch({ type: actionTypes.SET_TRANSCRIPT, payload: '' });
            lastTranscriptRef.current = '';
            latestResultRef.current = { final: '', interim: '', full: '' };
        },
        setSilenceDetection: (timeout, threshold) => {
            // 根据当前使用的服务设置静音检测
            if (currentServiceRef.current === 'fallback' && fallbackRef.current) {
                fallbackRef.current.setSilenceDetection(timeout, threshold);
            } else if (rtasrRef.current) {
                rtasrRef.current.setSilenceDetection(timeout, threshold);
            }
        },
        runDiagnosis: async () => {
            if (rtasrRef.current) {
                const result = await rtasrRef.current.diagnoseConnection();
                dispatch({ type: actionTypes.SET_DIAGNOSIS, payload: result });
                return result;
            }
        },
        getCurrentService: () => currentServiceRef.current,
        switchToFallback: tryFallbackService,
        resetToPrimaryService: () => {
            // 重置到主要服务
            if (rtasrRef.current) {
                rtasrRef.current.enable();
            }
            currentServiceRef.current = 'primary';
            switchAttemptRef.current = false;
            console.log('已重置到主要服务（RTASR）');
        },
        isPrimaryServiceDisabled: () => {
            return rtasrRef.current ? rtasrRef.current.isServiceDisabled() : false;
        },
        setManualInput: (text) => {
            // 设置手动输入的文本，用于录音服务失败时的备用方案
            dispatch({ type: actionTypes.SET_TRANSCRIPT, payload: text });
            latestResultRef.current = { final: text, interim: '', full: text };
        }
    }), [state.isListening]); // 移除函数依赖，避免无限重新创建



    if (state.error && state.status === 'error') {
        return (
            <div className={`rounded-lg p-4 ${
                isInterviewMode 
                    ? 'bg-red-50 border border-red-100' 
                    : 'bg-red-100'
            }`}>
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className={`text-sm ${
                            isInterviewMode ? 'text-red-700' : 'text-red-800'
                        }`}>
                            {state.error}
                        </p>
                    </div>
                </div>
                
                {/* 诊断结果 */}
                {state.showDiagnosis && (
                    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">连接诊断结果</h4>
                        {state.diagnosisResult ? (
                            <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>网络状态: <span className={state.diagnosisResult.networkStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.networkStatus}</span></div>
                                    <div>WebSocket支持: <span className={state.diagnosisResult.websocketSupport ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.websocketSupport ? '是' : '否'}</span></div>
                                    <div>麦克风支持: <span className={state.diagnosisResult.microphoneSupport ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.microphoneSupport ? '是' : '否'}</span></div>
                                    <div>连接测试: <span className={state.diagnosisResult.connectionTest ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.connectionTest ? '通过' : '失败'}</span></div>
                                    {state.diagnosisResult.rtasrServiceTest !== undefined && (
                                        <div>RTASR服务: <span className={state.diagnosisResult.rtasrServiceTest ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.rtasrServiceTest ? '可用' : '不可用'}</span></div>
                                    )}
                                </div>
                                {state.diagnosisResult.suggestions && state.diagnosisResult.suggestions.length > 0 && (
                                    <div className="mt-2">
                                        <div className="font-medium text-gray-700">建议:</div>
                                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                                            {state.diagnosisResult.suggestions.map((suggestion, index) => (
                                                <li key={index}>{suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600">正在诊断...</div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${isInterviewMode ? 'interview-mode' : ''}`}>
            {/* 在非面试模式下显示标题和状态 */}
            {!isInterviewMode && (
                <>
                    <h2 className="text-lg font-semibold text-gray-900">实时语音转写</h2>
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                            state.isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm text-gray-600">
                            {state.isListening ? '正在录音...' : '未开始录音'}
                            {currentServiceRef.current === 'fallback' && (
                                <span className="ml-1 text-blue-600">(备用服务)</span>
                            )}
                        </span>
                    </div>
                </>
            )}

            {/* 状态信息 - 在面试模式下只显示关键状态 */}
            {state.status !== 'idle' && (!isInterviewMode || (isInterviewMode && state.status === 'error')) && (
                <div className={`rounded-lg p-4 ${
                    state.status === 'error' 
                        ? 'bg-red-50 border border-red-100' 
                        : state.status === 'connecting' 
                            ? 'bg-blue-50 border border-blue-100'
                            : 'bg-gray-50 border border-gray-100'
                }`}>
                    <div className="flex items-center">
                        {state.status === 'connecting' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        )}
                        <span className={`ml-2 text-sm ${
                            state.status === 'error' 
                                ? 'text-red-700' 
                                : state.status === 'connecting'
                                    ? 'text-blue-700'
                                    : 'text-gray-700'
                        }`}>
                            {state.statusMessage}
                        </span>
                    </div>
                </div>
            )}

            {/* 转写结果显示区域 */}
            <div className="relative">
                <textarea
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none"
                    value={state.transcript}
                    readOnly
                    placeholder={state.isListening ? '正在识别...' : '点击"开始"按钮开始语音识别'}
                />
                
                {/* 录音指示器 */}
                <div className="absolute top-2 right-2">
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                            state.isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm text-gray-600">
                            {state.isListening ? '正在录音...' : '未开始录音'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 诊断结果 */}
            {state.showDiagnosis && state.diagnosisResult && (
                <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">连接诊断结果</h4>
                    {state.diagnosisResult ? (
                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>网络状态: <span className={state.diagnosisResult.networkStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.networkStatus}</span></div>
                                <div>WebSocket支持: <span className={state.diagnosisResult.websocketSupport ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.websocketSupport ? '是' : '否'}</span></div>
                                <div>麦克风支持: <span className={state.diagnosisResult.microphoneSupport ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.microphoneSupport ? '是' : '否'}</span></div>
                                <div>连接测试: <span className={state.diagnosisResult.connectionTest ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.connectionTest ? '通过' : '失败'}</span></div>
                                {state.diagnosisResult.rtasrServiceTest !== undefined && (
                                    <div>RTASR服务: <span className={state.diagnosisResult.rtasrServiceTest ? 'text-green-600' : 'text-red-600'}>{state.diagnosisResult.rtasrServiceTest ? '可用' : '不可用'}</span></div>
                                )}
                            </div>
                            {state.diagnosisResult.suggestions && state.diagnosisResult.suggestions.length > 0 && (
                                <div className="mt-2">
                                    <div className="font-medium text-gray-700">建议:</div>
                                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                                        {state.diagnosisResult.suggestions.map((suggestion, index) => (
                                            <li key={index}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-600">正在诊断...</div>
                    )}
                </div>
            )}
        </div>
    );
});

RTASRTranscription.displayName = 'RTASRTranscription';

export default RTASRTranscription; 