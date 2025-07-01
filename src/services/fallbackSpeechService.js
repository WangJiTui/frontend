class FallbackSpeechService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isFallbackMode = false;
        this.isPaused = false;
        this.currentTranscript = '';
        this.finalTranscript = '';
        this.interimTranscript = '';
        
        // 静音检测 - 改进的静音检测机制
        this.silenceTimeout = 5000; // 5秒静音自动停止
        this.silenceTimer = null;
        this.lastSpeechTime = 0;
        this.lastSoundTime = 0;
        this.isSoundDetected = false;
        this.isSpeechDetected = false;
        
        // 自动重试
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        // 回调函数 - 扩展回调类型
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onStatusCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
        this.onAudioStartCallback = null;
        this.onAudioEndCallback = null;
        this.onSoundStartCallback = null;
        this.onSoundEndCallback = null;
        this.onSpeechStartCallback = null;
        this.onSpeechEndCallback = null;
        
        // 检查浏览器支持
        this.initializeWebSpeechAPI();
    }

    // 初始化Web Speech API
    initializeWebSpeechAPI() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new window.webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new window.SpeechRecognition();
        } else {
            console.warn('浏览器不支持Web Speech API');
            return false;
        }

        if (this.recognition) {
            // 配置识别参数
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'zh-CN';
            this.recognition.maxAlternatives = 1;
            
            // 绑定事件处理器
            this.setupEventListeners();
            return true;
        }
        return false;
    }

    // 设置事件监听器 - 完善的事件处理
    setupEventListeners() {
        if (!this.recognition) return;

        // 识别开始
        this.recognition.onstart = (event) => {
            console.log('Web Speech API 开始识别');
            this.isListening = true;
            this.isPaused = false;
            this.isFallbackMode = true;
            this.retryCount = 0; // 重置重试计数
            this.updateStatus('listening', '正在使用浏览器语音识别...');
            
            if (this.onStartCallback) {
                this.onStartCallback(event);
            }
        };

        // 识别结果
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        // 识别错误
        this.recognition.onerror = (event) => {
            console.error('Web Speech API 错误:', event.error);
            this.handleSpeechError(event);
        };

        // 识别结束
        this.recognition.onend = (event) => {
            console.log('Web Speech API 识别结束');
            this.isListening = false;
            this.clearSilenceTimer();
            
            if (this.currentTranscript) {
                this.handleFinalResult();
            }
            
            if (this.onEndCallback) {
                this.onEndCallback(event);
            }
        };

        // 音频输入开始
        this.recognition.onaudiostart = (event) => {
            console.log('音频输入开始');
            if (this.onAudioStartCallback) {
                this.onAudioStartCallback(event);
            }
        };

        // 音频输入结束
        this.recognition.onaudioend = (event) => {
            console.log('音频输入结束');
            if (this.onAudioEndCallback) {
                this.onAudioEndCallback(event);
            }
        };

        // 检测到声音开始
        this.recognition.onsoundstart = (event) => {
            console.log('检测到声音开始');
            this.isSoundDetected = true;
            this.lastSoundTime = Date.now();
            this.clearSilenceTimer();
            
            if (this.onSoundStartCallback) {
                this.onSoundStartCallback(event);
            }
        };

        // 声音结束
        this.recognition.onsoundend = (event) => {
            console.log('声音结束');
            this.isSoundDetected = false;
            this.startSilenceTimer();
            
            if (this.onSoundEndCallback) {
                this.onSoundEndCallback(event);
            }
        };

        // 检测到语音开始
        this.recognition.onspeechstart = (event) => {
            console.log('检测到语音开始');
            this.isSpeechDetected = true;
            this.lastSpeechTime = Date.now();
            this.clearSilenceTimer();
            
            if (this.onSpeechStartCallback) {
                this.onSpeechStartCallback(event);
            }
        };

        // 语音结束
        this.recognition.onspeechend = (event) => {
            console.log('语音结束');
            this.isSpeechDetected = false;
            this.startSilenceTimer();
            
            if (this.onSpeechEndCallback) {
                this.onSpeechEndCallback(event);
            }
        };
    }

    // 处理语音识别结果 - 改进的结果处理
    handleSpeechResult(event) {
        let interimTranscript = '';
        let newFinalTranscript = '';

        // 处理识别结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                newFinalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // 更新转写结果
        if (newFinalTranscript) {
            this.finalTranscript += newFinalTranscript;
        }
        this.interimTranscript = interimTranscript;
        this.currentTranscript = this.finalTranscript + this.interimTranscript;

        // 更新语音时间 - 只有当有实际内容时才更新
        if (this.currentTranscript.trim()) {
            this.lastSpeechTime = Date.now();
            this.lastSoundTime = Date.now();
            this.resetSilenceTimer();
        }

        // 回调结果 - 提供更详细的信息
        if (this.onResultCallback) {
            this.onResultCallback({
                transcript: this.currentTranscript,
                final: this.finalTranscript,
                interim: this.interimTranscript,
                isFinal: newFinalTranscript.length > 0,
                confidence: event.results[event.results.length - 1][0].confidence || 0.8,
                resultIndex: event.resultIndex,
                results: event.results
            });
        }

        console.log('当前识别结果:', {
            final: this.finalTranscript,
            interim: this.interimTranscript,
            full: this.currentTranscript
        });
    }

    // 处理语音识别错误 - 加入自动重试机制
    handleSpeechError(event) {
        this.isListening = false;
        this.clearSilenceTimer();

        let errorMessage = '语音识别出错';
        let shouldRetry = false;
        
        switch (event.error) {
            case 'no-speech':
                errorMessage = '未检测到语音';
                shouldRetry = true;
                break;
            case 'audio-capture':
                errorMessage = '无法访问麦克风，请检查权限';
                shouldRetry = false;
                break;
            case 'not-allowed':
                errorMessage = '麦克风权限被拒绝，请允许使用麦克风';
                shouldRetry = false;
                break;
            case 'network':
                errorMessage = '网络连接错误';
                shouldRetry = true;
                break;
            case 'service-not-allowed':
                errorMessage = '语音识别服务不可用';
                shouldRetry = false;
                break;
            case 'aborted':
                errorMessage = '语音识别被中断';
                shouldRetry = false;
                break;
            default:
                errorMessage = `语音识别错误: ${event.error}`;
                shouldRetry = true;
        }

        console.error('语音识别错误:', errorMessage, event);

        // 自动重试机制
        if (shouldRetry && this.retryCount < this.maxRetries && !this.isPaused) {
            this.retryCount++;
            console.log(`尝试第 ${this.retryCount} 次重新启动语音识别...`);
            
            this.updateStatus('retrying', `${errorMessage}，正在重试 (${this.retryCount}/${this.maxRetries})`);
            
            setTimeout(() => {
                if (!this.isListening && !this.isPaused) {
                    this.startRealTimeTranscription();
                }
            }, this.retryDelay * this.retryCount); // 递增延迟
        } else {
            this.updateStatus('error', errorMessage);
            
            if (this.onErrorCallback) {
                this.onErrorCallback(new Error(errorMessage));
            }
        }
    }

    // 暂停语音识别
    pause() {
        if (this.isListening && !this.isPaused) {
            this.isPaused = true;
            this.recognition.stop();
            this.updateStatus('paused', '语音识别已暂停');
            console.log('语音识别已暂停');
        }
    }

    // 恢复语音识别
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.startRealTimeTranscription();
            console.log('语音识别已恢复');
        }
    }

    // 检查是否暂停
    isPausedState() {
        return this.isPaused;
    }

    // 重置静音计时器 - 改进的静音检测
    resetSilenceTimer() {
        this.clearSilenceTimer();
        this.lastSpeechTime = Date.now();
        this.lastSoundTime = Date.now();
    }

    // 开始静音计时器
    startSilenceTimer() {
        this.clearSilenceTimer();
        
        this.silenceTimer = setTimeout(() => {
            const now = Date.now();
            const speechSilence = now - this.lastSpeechTime;
            const soundSilence = now - this.lastSoundTime;
            
            // 只有在既没有语音也没有声音的情况下才停止
            if (speechSilence >= this.silenceTimeout && 
                soundSilence >= this.silenceTimeout && 
                !this.isSpeechDetected && 
                !this.isSoundDetected &&
                this.currentTranscript.trim()) {
                console.log(`检测到${this.silenceTimeout}ms静音，自动停止识别`);
                this.stopRealTimeTranscription();
            }
        }, this.silenceTimeout);
    }

    // 清除静音计时器
    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    // 开始实时语音转写 - 支持选项参数
    async startRealTimeTranscription(options = {}) {
        try {
            if (!this.recognition) {
                throw new Error('浏览器不支持Web Speech API');
            }

            if (this.isListening) {
                console.log('语音识别已在进行中');
                return true;
            }

            // 重置状态
            this.currentTranscript = '';
            this.finalTranscript = '';
            this.interimTranscript = '';
            this.lastSpeechTime = Date.now();
            this.lastSoundTime = Date.now();
            this.isSoundDetected = false;
            this.isSpeechDetected = false;
            this.isPaused = false;
            
            // 应用选项配置
            if (options.language) {
                this.recognition.lang = options.language;
            }
            if (options.silenceTimeout) {
                this.silenceTimeout = options.silenceTimeout;
            }
            if (options.continuous !== undefined) {
                this.recognition.continuous = options.continuous;
            }
            if (options.interimResults !== undefined) {
                this.recognition.interimResults = options.interimResults;
            }
            if (options.maxAlternatives) {
                this.recognition.maxAlternatives = options.maxAlternatives;
            }
            
            this.updateStatus('connecting', '正在启动浏览器语音识别...');
            
            // 开始识别
            this.recognition.start();
            
            return true;
        } catch (error) {
            console.error('启动Web Speech API失败:', error);
            this.updateStatus('error', `启动语音识别失败: ${error.message}`);
            
            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
            
            return false;
        }
    }

    // 重新开始识别（清除之前的结果）
    restart(options = {}) {
        this.clearTranscriptionResult();
        return this.startRealTimeTranscription(options);
    }

    // 获取当前状态信息
    getStatus() {
        return {
            isListening: this.isListening,
            isPaused: this.isPaused,
            isSoundDetected: this.isSoundDetected,
            isSpeechDetected: this.isSpeechDetected,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries,
            silenceTimeout: this.silenceTimeout,
            lastSpeechTime: this.lastSpeechTime,
            lastSoundTime: this.lastSoundTime,
            hasContent: this.currentTranscript.trim().length > 0
        };
    }

    // 设置配置
    configure(config = {}) {
        if (config.silenceTimeout !== undefined) {
            this.silenceTimeout = config.silenceTimeout;
        }
        if (config.maxRetries !== undefined) {
            this.maxRetries = config.maxRetries;
        }
        if (config.retryDelay !== undefined) {
            this.retryDelay = config.retryDelay;
        }
        if (config.language && this.recognition) {
            this.recognition.lang = config.language;
        }
    }

    // 停止实时语音转写
    async stopRealTimeTranscription() {
        try {
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }

            if (this.recognition && this.isListening) {
                this.recognition.stop();
            }

            this.isListening = false;
            this.updateStatus('stopped', '语音识别已停止');
            
            return true;
        } catch (error) {
            console.error('停止Web Speech API失败:', error);
            return false;
        }
    }

    // 处理最终结果
    handleFinalResult() {
        if (this.currentTranscript.trim()) {
            this.updateStatus('completed', '语音识别完成');
            
            if (this.onResultCallback) {
                this.onResultCallback({
                    transcript: this.currentTranscript,
                    isFinal: true,
                    confidence: 0.8
                });
            }
        }
    }

    // 获取转写结果 - 改进的结果格式
    getTranscriptionResult() {
        return {
            final: this.finalTranscript,
            interim: this.interimTranscript,
            full: this.currentTranscript,
            // 兼容旧格式
            finalResult: this.finalTranscript,
            interimResult: this.interimTranscript,
            fullResult: this.currentTranscript
        };
    }

    // 清除转写结果
    clearTranscriptionResult() {
        this.currentTranscript = '';
        this.finalTranscript = '';
        this.interimTranscript = '';
    }

    // 检查是否正在转写
    isTranscribing() {
        return this.isListening;
    }

    // 设置静音检测参数
    setSilenceDetection(timeout, threshold) {
        this.silenceTimeout = timeout || 5000;
        console.log(`设置静音检测: ${this.silenceTimeout}ms`);
    }

    // 设置回调函数 - 扩展的回调类型
    onTranscriptionResult(callback) {
        this.onResultCallback = callback;
    }

    onTranscriptionError(callback) {
        this.onErrorCallback = callback;
    }

    onTranscriptionStatus(callback) {
        this.onStatusCallback = callback;
    }

    // 新增的回调设置方法
    onStart(callback) {
        this.onStartCallback = callback;
    }

    onEnd(callback) {
        this.onEndCallback = callback;
    }

    onAudioStart(callback) {
        this.onAudioStartCallback = callback;
    }

    onAudioEnd(callback) {
        this.onAudioEndCallback = callback;
    }

    onSoundStart(callback) {
        this.onSoundStartCallback = callback;
    }

    onSoundEnd(callback) {
        this.onSoundEndCallback = callback;
    }

    onSpeechStart(callback) {
        this.onSpeechStartCallback = callback;
    }

    onSpeechEnd(callback) {
        this.onSpeechEndCallback = callback;
    }

    // 更新状态
    updateStatus(status, message) {
        console.log(`[FallbackSpeech] 状态: ${status}, 消息: ${message}`);
        
        if (this.onStatusCallback) {
            this.onStatusCallback(status, message);
        }
    }

    // 检查浏览器支持
    static isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    // 获取语音识别引擎信息
    static getEngineInfo() {
        if (window.SpeechRecognition) {
            return {
                engine: '原生SpeechRecognition API',
                type: 'native',
                support: 'full'
            };
        } else if (window.webkitSpeechRecognition) {
            return {
                engine: 'Webkit SpeechRecognition API',
                type: 'webkit',
                support: 'full'
            };
        } else {
            return {
                engine: '不支持',
                type: 'none',
                support: 'none'
            };
        }
    }

    // 获取支持的语言列表
    static getSupportedLanguages() {
        return [
            { code: 'zh-CN', name: '中文(简体)', region: '中国大陆' },
            { code: 'zh-TW', name: '中文(繁体)', region: '台湾' },
            { code: 'zh-HK', name: '中文(繁体)', region: '香港' },
            { code: 'en-US', name: '英语', region: '美国' },
            { code: 'en-GB', name: '英语', region: '英国' },
            { code: 'ja-JP', name: '日语', region: '日本' },
            { code: 'ko-KR', name: '韩语', region: '韩国' },
            { code: 'fr-FR', name: '法语', region: '法国' },
            { code: 'de-DE', name: '德语', region: '德国' },
            { code: 'es-ES', name: '西班牙语', region: '西班牙' },
            { code: 'ru-RU', name: '俄语', region: '俄罗斯' },
            { code: 'it-IT', name: '意大利语', region: '意大利' },
            { code: 'pt-BR', name: '葡萄牙语', region: '巴西' },
            { code: 'ar-SA', name: '阿拉伯语', region: '沙特阿拉伯' }
        ];
    }

    // 获取功能支持信息
    static getFeatureSupport() {
        const isSupported = FallbackSpeechService.isSupported();
        return {
            basic: isSupported,
            continuous: isSupported,
            interimResults: isSupported,
            confidence: isSupported,
            audioEvents: isSupported,
            soundEvents: isSupported,
            speechEvents: isSupported,
            languageDetection: false, // Web Speech API 不支持自动语言检测
            punctuation: true, // 支持标点符号
            numbers: true, // 支持数字识别
            silenceDetection: isSupported
        };
    }

    // 获取完整支持信息
    static getSupportInfo() {
        return {
            supported: FallbackSpeechService.isSupported(),
            engine: FallbackSpeechService.getEngineInfo(),
            languages: FallbackSpeechService.getSupportedLanguages(),
            features: FallbackSpeechService.getFeatureSupport(),
            defaultLanguage: 'zh-CN',
            capabilities: [
                '连续语音识别',
                '实时结果回调',
                '自动静音检测',
                '暂停/恢复功能',
                '自动重试机制',
                '详细事件监听',
                '置信度评分'
            ]
        };
    }
}

export default FallbackSpeechService; 