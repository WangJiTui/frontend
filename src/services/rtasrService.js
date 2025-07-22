import CryptoJS from 'crypto-js';

class RTASRService {
    constructor() {
        // 科大讯飞RTASR配置
        this.APPID = "42564b2f";
        this.SECRET_KEY = "fe7d9141b97b6c9095a77c17b4887634";
        this.HOST = "rtasr.xfyun.cn/v1/ws";
        this.BASE_URL = "wss://" + this.HOST;
        this.CHUNK_SIZE = 1280;
        
        // WebSocket连接
        this.ws = null;
        this.isConnected = false;
        this.isListening = false;
        this.isNormalStop = false; // 标记是否为正常停止
        this.reconnectAttempts = 0; // 重连尝试次数
        this.maxReconnectAttempts = 3; // 最大重连次数
        
        // 连接状态验证
        this.connectionCheckInterval = null;
        this.lastPingTime = 0;
        this.lastPongTime = 0;
        this.pingInterval = 10000; // 10秒发送一次ping
        this.pongTimeout = 5000;  // 5秒内没收到pong就认为连接异常
        
        // 连接队列管理
        this.isProcessing = false; // 是否正在处理音频
        this.connectionTimeout = 30000; // 30秒连接超时
        this.lastConnectionTime = 0; // 上次连接时间
        this.connectionTimer = null; // 连接计时器
        this.minConnectionInterval = 5000; // 最小连接间隔，设置为5秒
        this.maxRetryWait = 60000; // 最大重试等待时间，1分钟
        this.retryBackoff = 1.5; // 重试等待时间的增长系数
        this.currentRetryWait = 5000; // 当前重试等待时间，初始为5秒
        
        // 诊断信息
        this.lastError = null;
        this.connectionDiagnostics = {
            networkStatus: 'unknown',
            websocketSupport: 'unknown',
            microphoneSupport: 'unknown',
            lastSuccessfulConnection: null,
            failureCount: 0,
            lastFailureReason: null
        };
        
        // 添加网络状态监听
        this.setupNetworkListeners();
        
        // 音频相关
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioStream = null;
        this.audioProcessor = null;
        
        // 静音检测
        this.silenceTimeout = 5000; // 5秒静音自动停止
        this.silenceThreshold = 300; // 静音阈值
        this.silenceStartTime = -1;
        this.silenceTimer = null;
        
        // 语音长度检测
        this.minSpeechLength = 2000; // 最小语音长度2秒
        this.speechStartTime = -1;
        this.hasDetectedSpeech = false;
        
        // 转写结果
        this.finalResult = '';
        this.interimResult = '';
        
        // 回调函数
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onStatusCallback = null;
        
        // 握手状态
        this.handshakeSuccess = false;
        this.connectClose = false;
        
        // 服务控制
        this.isDisabled = false; // 是否已禁用服务（切换到备用服务时设置）
    }

    // 设置配置
    setConfig(config) {
        if (config.APPID) this.APPID = config.APPID;
        if (config.SECRET_KEY) this.SECRET_KEY = config.SECRET_KEY;
        if (config.HOST) {
            this.HOST = config.HOST;
            this.BASE_URL = "wss://" + this.HOST;
        }
    }

    // 生成握手参数
    getHandShakeParams() {
        const ts = Math.floor(new Date().getTime() / 1000);
        const signa = CryptoJS.MD5(this.APPID + ts).toString();
        const signatureSha = CryptoJS.HmacSHA1(signa, this.SECRET_KEY);
        const signature = CryptoJS.enc.Base64.stringify(signatureSha);
        
        console.log('握手参数生成:', {
            APPID: this.APPID,
            ts: ts,
            signa: signa,
            signature: signature
        });
        
        return `${this.BASE_URL}?appid=${this.APPID}&ts=${ts}&signa=${encodeURIComponent(signature)}`;
    }

    // MD5加密
    MD5(str) {
        return CryptoJS.MD5(str).toString();
    }

    // HMAC-SHA1加密
    HmacSHA1Encrypt(text, key) {
        const hash = CryptoJS.HmacSHA1(text, key);
        return CryptoJS.enc.Base64.stringify(hash);
    }

    // 设置网络状态监听
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('网络已连接');
            this.connectionDiagnostics.networkStatus = 'connected';
            this.updateStatus('network', '网络已连接');
        });

        window.addEventListener('offline', () => {
            console.log('网络已断开');
            this.connectionDiagnostics.networkStatus = 'disconnected';
            this.updateStatus('network', '网络已断开');
            if (this.isProcessing) {
                this.handleNetworkError('网络连接已断开');
            }
        });
    }

    // 开始实时语音转写
    async startRealTimeTranscription() {
        try {
            // 检查服务是否已被禁用
            if (this.isDisabled) {
                console.log('RTASR服务已被禁用，跳过启动');
                return false;
            }
            
            // 运行连接诊断
            await this.runConnectionDiagnostics();
            
            // 检查诊断结果
            const diagnosticResult = await this.checkDiagnosticResult();
            if (!diagnosticResult.success) {
                throw new Error(diagnosticResult.message);
            }

            // 检查是否已经在处理中
            if (this.isProcessing) {
                // 如果已经在处理中，先尝试停止当前任务
                try {
                    console.log('检测到已有任务，尝试停止');
                    await this.stopRealTimeTranscription();
                    // 等待资源释放
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (stopError) {
                    console.error('停止当前任务失败:', stopError);
                    throw new Error('当前已有一个转写任务正在进行中，请等待当前任务完成后再试');
                }
            }

            // 检查距离上次连接是否太近
            const now = Date.now();
            const timeSinceLastConnection = now - this.lastConnectionTime;
            
            if (timeSinceLastConnection < this.minConnectionInterval) {
                const waitTime = this.minConnectionInterval - timeSinceLastConnection;
                if (waitTime > this.maxRetryWait) {
                    throw new Error('请求过于频繁，请稍后再试');
                }
                
                this.currentRetryWait = Math.min(
                    this.currentRetryWait * this.retryBackoff,
                    this.maxRetryWait
                );
                
                this.updateStatus('waiting', `请等待 ${Math.ceil(waitTime/1000)} 秒后重试`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                this.currentRetryWait = this.minConnectionInterval;
            }

            this.lastConnectionTime = now;
            this.isProcessing = true;

            // 设置连接超时
            this.connectionTimer = setTimeout(() => {
                if (this.isProcessing) {
                    this.handleConnectionTimeout();
                }
            }, this.connectionTimeout);

            // 重置标记
            this.isNormalStop = false;
            this.connectClose = false;
            this.silenceStartTime = -1;
            this.speechStartTime = -1;
            this.hasDetectedSpeech = false;
            this.reconnectAttempts = 0;
        this.isDisabled = false; // 添加禁用标记
            
            this.updateStatus('connecting', '正在连接RTASR服务...');
            
            // 建立WebSocket连接
            await this.connectWebSocket();
            
            // 等待握手成功
            await this.waitForHandshake();
            
            // 开始音频录制
            await this.startAudioRecording();
            
            // 更新连接诊断信息
            this.connectionDiagnostics.lastSuccessfulConnection = new Date().toISOString();
            this.connectionDiagnostics.failureCount = 0;
            
            this.updateStatus('listening', '正在识别...');
            return true;
        } catch (error) {
            console.error('启动语音转写失败:', error);
            
            // 更新诊断信息
            this.connectionDiagnostics.failureCount++;
            this.connectionDiagnostics.lastFailureReason = error.message;
            this.lastError = error;
            
            // 清理连接和资源
            await this.cleanupConnection();
            
            let errorMessage = error.message;
            if (!errorMessage.includes('任务正在进行') && 
                !errorMessage.includes('请等待') && 
                !errorMessage.includes('网络连接已断开')) {
                errorMessage = await this.getDetailedErrorMessage(error);
            }
            
            this.updateStatus('error', errorMessage);
            if (this.onErrorCallback) {
                this.onErrorCallback(new Error(errorMessage));
            }
            return false;
        }
    }

    // 运行连接诊断
    async runConnectionDiagnostics() {
        console.log('运行连接诊断...');
        
        // 检查网络连接
        this.connectionDiagnostics.networkStatus = navigator.onLine ? 'connected' : 'disconnected';
        
        // 检查WebSocket支持
        this.connectionDiagnostics.websocketSupport = typeof WebSocket !== 'undefined' ? 'supported' : 'unsupported';
        
        // 检查麦克风支持
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasAudioInput = devices.some(device => device.kind === 'audioinput');
            this.connectionDiagnostics.microphoneSupport = hasAudioInput ? 'supported' : 'unsupported';
        } catch (error) {
            this.connectionDiagnostics.microphoneSupport = 'error';
            console.error('检查麦克风支持时出错:', error);
        }
        
        console.log('诊断结果:', this.connectionDiagnostics);
    }

    // 检查诊断结果
    async checkDiagnosticResult() {
        const result = {
            success: true,
            message: ''
        };
        
        // 检查网络状态
        if (this.connectionDiagnostics.networkStatus !== 'connected') {
            result.success = false;
            result.message = '网络连接已断开，请检查网络设置';
            return result;
        }
        
        // 检查WebSocket支持
        if (this.connectionDiagnostics.websocketSupport !== 'supported') {
            result.success = false;
            result.message = '您的浏览器不支持WebSocket，请更换或更新浏览器';
            return result;
        }
        
        // 检查麦克风支持
        if (this.connectionDiagnostics.microphoneSupport === 'unsupported') {
            result.success = false;
            result.message = '未检测到麦克风设备，请检查麦克风连接';
            return result;
        } else if (this.connectionDiagnostics.microphoneSupport === 'error') {
            result.success = false;
            result.message = '检查麦克风权限时出错，请确保已授予麦克风访问权限';
            return result;
        }
        
        // 检查失败次数
        if (this.connectionDiagnostics.failureCount > 5) {
            result.success = false;
            result.message = '连接多次失败，请稍后重试或联系技术支持';
            return result;
        }
        
        return result;
    }

    // 获取详细错误信息
    async getDetailedErrorMessage(error) {
        // 运行诊断以获取最新状态
        await this.runConnectionDiagnostics();
        
        let errorMessage = '语音转写服务连接失败';
        const details = [];
        
        // 根据诊断结果添加具体原因
        if (this.connectionDiagnostics.networkStatus !== 'connected') {
            details.push('网络连接异常');
        }
        
        if (this.connectionDiagnostics.websocketSupport !== 'supported') {
            details.push('浏览器不支持WebSocket');
        }
        
        if (this.connectionDiagnostics.microphoneSupport !== 'supported') {
            details.push('麦克风访问受限');
        }
        
        // 如果有具体错误信息，添加到详情中
        if (error.message && !error.message.includes('语音转写服务连接失败')) {
            details.push(error.message);
        }
        
        // 组合错误信息
        if (details.length > 0) {
            errorMessage += `（${details.join('，')}）`;
        }
        
        errorMessage += '，请稍后重试';
        return errorMessage;
    }

    // 处理网络错误
    handleNetworkError(message) {
        console.error('网络错误:', message);
        this.updateStatus('error', message);
        this.cleanupConnection();
        
        if (this.onErrorCallback) {
            this.onErrorCallback(new Error(message));
        }
    }

    // 连接WebSocket
    connectWebSocket() {
        try {
            const websocketUrl = this.getHandShakeParams();
            console.log('正在连接WebSocket:', websocketUrl);

            // 检查浏览器 WebSocket 支持
            if (!window.WebSocket) {
                throw new Error("浏览器不支持WebSocket");
            }

            this.ws = new WebSocket(websocketUrl);

            // 设置二进制类型为 arraybuffer
            this.ws.binaryType = 'arraybuffer';

            // 设置连接超时
            this.connectionTimer = setTimeout(() => {
                if (!this.isConnected) {
                    this.handleConnectionTimeout();
                }
            }, this.connectionTimeout);

            // 绑定事件处理器
            this.ws.onopen = this.handleWebSocketOpen.bind(this);
            this.ws.onmessage = this.handleWebSocketMessage.bind(this);
            this.ws.onerror = this.handleWebSocketError.bind(this);
            this.ws.onclose = this.handleWebSocketClose.bind(this);

            return true;
        } catch (error) {
            console.error('WebSocket连接失败:', error);
            this.handleWebSocketError(error);
            return false;
        }
    }

    // WebSocket打开事件处理
    handleWebSocketOpen() {
        console.log('WebSocket连接已建立');
        this.isConnected = true;
        this.handshakeSuccess = false;
        this.connectClose = false;
        this.reconnectAttempts = 0;
        
        // 清除连接超时定时器
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }

        // 开始心跳检测
        this.startConnectionCheck();
        
        // 等待握手成功
        this.waitForHandshake().then(() => {
            // 开始录音
            this.startAudioRecording();
        }).catch(error => {
            console.error('握手失败:', error);
            this.handleWebSocketError(error);
        });
    }

    // WebSocket错误事件处理
    handleWebSocketError(error) {
        console.error('WebSocket错误:', error);
        this.lastError = error;
        
        if (this.onErrorCallback) {
            this.onErrorCallback({
                type: 'websocket',
                message: error.message || '连接错误',
                details: error
            });
        }
        
        // 尝试重连（只有在未被禁用时）
        if (this.isProcessing && !this.connectClose && !this.isDisabled) {
            this.attemptReconnect();
        }
    }

    // 开始连接状态检查
    startConnectionCheck() {
        this.stopConnectionCheck(); // 先清理可能存在的旧定时器
        
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, this.pingInterval);
        
        // 立即进行第一次检查
        this.checkConnection();
    }

    // 停止连接状态检查
    stopConnectionCheck() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    // 检查连接状态
    checkConnection() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket未连接或已关闭');
            this.handleConnectionLost();
            return;
        }

        const now = Date.now();
        
        // 如果上次发送ping后没有收到pong，且超过超时时间
        if (this.lastPingTime > 0 && 
            this.lastPingTime > this.lastPongTime && 
            now - this.lastPingTime > this.pongTimeout) {
            console.log('Pong响应超时');
            this.handleConnectionLost();
            return;
        }

        // 发送ping
        try {
            this.ws.send('ping');
            this.lastPingTime = now;
        } catch (error) {
            console.error('发送ping失败:', error);
            this.handleConnectionLost();
        }
    }

    // 处理pong响应
    handlePong() {
        this.lastPongTime = Date.now();
        this.isConnected = true;
    }

    // 处理连接丢失
    handleConnectionLost() {
        console.log('检测到连接丢失');
        
        // 停止连接检查
        this.stopConnectionCheck();
        
        // 只有在正在处理且未被禁用时才尝试重连
        if (this.isProcessing && !this.isDisabled) {
            this.updateStatus('error', '检测到连接异常，正在尝试恢复...');
            
            // 确保在重连前清理旧连接
            this.cleanupConnection().then(() => {
                this.attemptReconnect();
            }).catch(error => {
                console.error('清理旧连接时出错:', error);
                this.updateStatus('error', '连接异常，请刷新页面重试');
            });
        } else if (this.isDisabled) {
            console.log('RTASR服务已被禁用，不进行重连');
        }
    }

    // 尝试重新连接
    async attemptReconnect() {
        // 检查服务是否已被禁用
        if (this.isDisabled) {
            console.log('RTASR服务已被禁用，停止重连尝试');
            return;
        }
        
        // 达到最大重试次数后不再重试，直接禁用服务
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('达到最大重试次数，禁用RTASR服务');
            this.disable();
            this.updateStatus('disabled', 'RTASR服务不可用，已自动切换到本地服务');
            return;
        }

        this.reconnectAttempts++;
        console.log(`正在进行第 ${this.reconnectAttempts} 次重连`);

        try {
            // 使用指数退避策略计算等待时间
            const baseDelay = 2000; // 基础延迟2秒
            const maxDelay = 30000; // 最大延迟30秒
            const delay = Math.min(
                baseDelay * Math.pow(this.retryBackoff, this.reconnectAttempts - 1),
                maxDelay
            );

            console.log(`等待 ${delay/1000} 秒后重试`);
            this.updateStatus('waiting', `将在 ${Math.ceil(delay/1000)} 秒后重试连接`);

            await this.cleanupConnection();
            await new Promise(resolve => setTimeout(resolve, delay));

            // 在重连前检查网络状态
            if (!navigator.onLine) {
                throw new Error('网络连接已断开');
            }

            // 运行连接诊断
            const diagnosis = await this.diagnoseConnection();
            if (!diagnosis.networkStatus === 'connected' || !diagnosis.websocketSupport) {
                throw new Error('网络或浏览器不支持WebSocket连接');
            }

            await this.startRealTimeTranscription();
            
            // 重连成功后重置重试计数和等待时间
            if (this.isConnected) {
                console.log('重连成功，重置重试状态');
                this.reconnectAttempts = 0;
                this.currentRetryWait = this.minConnectionInterval;
            }
        } catch (error) {
            console.error('重连失败:', error);
            
            // 更新诊断信息
            this.connectionDiagnostics.failureCount++;
            this.connectionDiagnostics.lastFailureReason = error.message;
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                // 继续重试
                this.attemptReconnect();
            } else {
                // 达到最大重试次数，禁用服务
                console.log('所有重连尝试失败，禁用RTASR服务');
                this.disable();
                this.updateStatus('disabled', 'RTASR服务连接失败，已自动切换到本地服务');
            }
        }
    }

    // 重置重连状态
    resetReconnectState() {
        this.reconnectAttempts = 0;
        this.currentRetryWait = this.minConnectionInterval;
    }

    // 处理WebSocket关闭
    handleWebSocketClose(event) {
        let errorMessage = '连接已断开';
        
        switch (event.code) {
            case 1000:
                if (this.isNormalStop) {
                    errorMessage = '连接已正常关闭';
                    this.updateStatus('disconnected', errorMessage);
                    return;
                }
                break;
            case 1001:
                errorMessage = '服务器主动断开连接';
                break;
            case 1002:
                errorMessage = '协议错误';
                break;
            case 1003:
                errorMessage = '数据格式错误';
                break;
            case 1005:
                errorMessage = '连接异常断开';
                break;
            case 1006:
                errorMessage = '网络连接异常，请检查网络';
                break;
            case 1007:
                errorMessage = '数据格式不一致';
                break;
            case 1008:
                errorMessage = '连接被拒绝';
                break;
            case 1009:
                errorMessage = '数据过大';
                break;
            default:
                errorMessage = `连接断开 (错误码: ${event.code})`;
        }
        
        this.updateStatus('error', errorMessage);
        if (this.onErrorCallback) {
            this.onErrorCallback(new Error(errorMessage));
        }
    }

    // 等待握手成功
    waitForHandshake() {
        return new Promise((resolve, reject) => {
            const checkHandshake = () => {
                if (this.handshakeSuccess) {
                    resolve();
                } else if (!this.isConnected) {
                    reject(new Error('连接已断开'));
                } else {
                    setTimeout(checkHandshake, 100);
                }
            };
            checkHandshake();
        });
    }

    // WebSocket消息处理
    handleWebSocketMessage(event) {
        // 处理pong消息
        if (typeof event.data === 'string' && event.data === 'pong') {
            this.handlePong();
            return;
        }

        try {
            const data = JSON.parse(event.data);
            console.log('收到WebSocket消息:', data);

            if (data.action === 'started') {
                // 握手成功
                console.log('握手成功');
                this.handshakeSuccess = true;
            } else if (data.action === 'error') {
                // 处理错误
                const errorMessage = this.getErrorMessage(data.code, data.desc);
                console.error('服务端返回错误:', {
                    code: data.code,
                    desc: data.desc,
                    message: errorMessage,
                    sid: data.sid
                });
                this.handleWebSocketError(new Error(errorMessage));
            } else if (data.action === 'result') {
                // 处理转写结果
                this.parseResult(data);
            }
        } catch (error) {
            console.error('处理WebSocket消息失败:', error);
        }
    }

    // 获取错误信息
    getErrorMessage(code, desc) {
        const errorMessages = {
            '0': '成功',
            '10105': '授权失败，请检查APPID和密钥是否正确',
            '10106': '无效参数，请检查必要参数是否正确',
            '10107': '参数值非法，请检查参数值是否符合要求',
            '10110': '无授权许可，请检查授权是否正确',
            '10700': '语音识别服务出现错误，请稍后重试',
            '10202': '网络连接错误，请检查网络是否正常',
            '10204': '服务连接异常，请检查网络后重试',
            '10205': '服务连接异常，请检查网络后重试',
            '16003': '服务异常，请稍后重试',
            '10800': '当前连接数超过限制，请稍后重试',
            '37005': '未检测到语音输入，请确保麦克风正常工作并有声音输入'
        };

        let errorMessage = errorMessages[code] || desc || '未知错误';
        
        // 根据错误码决定是否需要重试
        const shouldRetry = ['10202', '10204', '10205', '16003'].includes(code);
        if (shouldRetry && this.reconnectAttempts < this.maxReconnectAttempts) {
            errorMessage += '，正在尝试重新连接...';
            this.attemptReconnect();
        }
        
        // 特殊处理某些错误
        switch (code) {
            case '10105':
            case '10110':
                // 授权相关错误，不需要重试
                this.cleanupConnection();
                break;
            case '10800':
                // 连接数超限，等待一段时间后重试
                this.handleMaxConnectError();
                break;
            case '37005':
                // 无音频数据，可能需要重新开始录音
                this.cleanupConnection();
                errorMessage = '超过15秒未检测到语音，请重新开始录音';
                break;
            default:
                // 其他未知错误，记录日志但不进行特殊处理
                console.warn('未知错误代码:', code, desc);
                break;
        }

        return errorMessage;
    }

    // 解析转写结果
    parseResult(data) {
        try {
            const result = JSON.parse(data.data);
            let text = '';
            
            // 解析中文结果
            if (result.cn && result.cn.st) {
                result.cn.st.rt.forEach(item => {
                    item.ws.forEach(word => {
                        word.cw.forEach(char => {
                            text += char.w;
                        });
                    });
                });
            }
            
            // 更新结果
            if (result.cn.st.type === 0) {
                // 最终结果
                this.finalResult += text;
                this.interimResult = '';
            } else {
                // 中间结果
                this.interimResult = text;
            }
            
            // 调用回调
            if (this.onResultCallback) {
                this.onResultCallback({
                    final: this.finalResult,
                    interim: this.interimResult,
                    full: this.finalResult + this.interimResult
                });
            }
            
            return text;
        } catch (error) {
            console.error('解析转写结果失败:', error);
            return '';
        }
    }

    // 开始音频录制
    async startAudioRecording() {
        try {
            // 获取音频流
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            
            // 创建音频源
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            
            // 创建音频处理器
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            // 处理音频数据
            this.audioProcessor.onaudioprocess = (event) => {
                if (this.isListening && this.isConnected) {
                    const inputBuffer = event.inputBuffer;
                    const inputData = inputBuffer.getChannelData(0);
                    
                    // 转换为16位PCM
                    const pcmData = this.convertToPCM16(inputData);
                    
                    // 静音检测
                    const isSilent = this.isSilent(pcmData);
                    this.handleSilenceDetection(isSilent);
                    
                    // 发送音频数据
                    this.sendAudioData(pcmData);
                }
            };
            
            // 连接音频节点
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);
            
            this.isListening = true;
            console.log('音频录制开始');
            
        } catch (error) {
            console.error('启动音频录制失败:', error);
            throw new Error('无法访问麦克风');
        }
    }

    // 转换为16位PCM
    convertToPCM16(float32Array) {
        const pcm16 = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return pcm16;
    }

    // 静音检测
    isSilent(pcmData) {
        let maxAmplitude = 0;
        for (let i = 0; i < pcmData.length; i++) {
            const amplitude = Math.abs(pcmData[i]);
            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude;
            }
            if (amplitude > this.silenceThreshold) {
                return false;
            }
        }
        // 每100次调用记录一次调试信息
        if (Math.random() < 0.01) { // 1%的概率记录
            console.log('静音检测调试:', { 
                maxAmplitude, 
                threshold: this.silenceThreshold, 
                isSilent: maxAmplitude <= this.silenceThreshold,
                timestamp: new Date().toISOString()
            });
        }
        return true;
    }

    // 处理静音检测
    handleSilenceDetection(isSilent) {
        if (isSilent) {
            // 如果还没有检测到足够的语音，不开始静音计时
            if (!this.hasDetectedSpeech) {
                return;
            }
            
            if (this.silenceStartTime < 0) {
                this.silenceStartTime = Date.now();
                console.log('开始静音检测，开始时间:', new Date(this.silenceStartTime).toISOString());
            } else {
                const silentDuration = Date.now() - this.silenceStartTime;
                // 每500ms记录一次静音持续时间
                if (silentDuration % 500 < 50) {
                    console.log('静音持续时间:', silentDuration, 'ms, 阈值:', this.silenceTimeout, 'ms');
                }
                if (silentDuration >= this.silenceTimeout) {
                    console.log(`连续静音超过${this.silenceTimeout/1000}秒，停止录音`);
                    // 重置静音检测状态
                    this.silenceStartTime = -1;
                    this.stopRealTimeTranscription();
                }
            }
        } else {
            // 检测到声音
            if (this.speechStartTime < 0) {
                this.speechStartTime = Date.now();
                console.log('开始检测语音，开始时间:', new Date(this.speechStartTime).toISOString());
            } else {
                const speechDuration = Date.now() - this.speechStartTime;
                // 如果语音长度达到最小要求，标记为已检测到语音
                if (speechDuration >= this.minSpeechLength && !this.hasDetectedSpeech) {
                    this.hasDetectedSpeech = true;
                    console.log('检测到足够的语音长度，开始启用静音检测');
                }
            }
            
            if (this.silenceStartTime >= 0) {
                const silentDuration = Date.now() - this.silenceStartTime;
                console.log('检测到声音，重置静音计时器，静音持续时间:', silentDuration, 'ms');
            }
            this.silenceStartTime = -1;
        }
    }

    // 发送音频数据
    sendAudioData(pcmData) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // 分块发送
            for (let i = 0; i < pcmData.length; i += this.CHUNK_SIZE) {
                const chunk = pcmData.slice(i, i + this.CHUNK_SIZE);
                this.ws.send(chunk);
            }
        }
    }

    // 停止实时语音转写
    async stopRealTimeTranscription() {
        console.log('停止语音转写');
        
        try {
            if (this.isListening) {
                this.isNormalStop = true;
                this.isListening = false;
                
                // 等待最后的数据处理完成
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 清理所有连接和资源
                await this.cleanupConnection();
                
                this.updateStatus('disconnected', '连接已正常关闭');
                return true;
            }
        } catch (error) {
            console.error('停止语音转写失败:', error);
            // 即使出错也要尝试清理资源
            try {
                await this.cleanupConnection();
            } catch (cleanupError) {
                console.error('清理资源时出错:', cleanupError);
            }
            throw error;
        }
        
        return false;
    }

    // 检查是否正在转写
    isTranscribing() {
        return this.isListening;
    }

    // 获取转写结果
    getTranscriptionResult() {
        return {
            final: this.finalResult,
            interim: this.interimResult,
            full: this.finalResult + this.interimResult
        };
    }

    // 清空转写结果
    clearTranscriptionResult() {
        this.finalResult = '';
        this.interimResult = '';
        this.isNormalStop = false;
        this.connectClose = false;
        // 重置静音检测状态
        this.silenceStartTime = -1;
        // 重置语音检测状态
        this.speechStartTime = -1;
        this.hasDetectedSpeech = false;
    }

    // 设置回调函数
    onTranscriptionResult(callback) {
        this.onResultCallback = callback;
    }

    onTranscriptionError(callback) {
        this.onErrorCallback = callback;
    }

    onTranscriptionStatus(callback) {
        this.onStatusCallback = callback;
    }

    // 更新状态
    updateStatus(status, message) {
        console.log('RTASR状态更新:', { 
            status, 
            message, 
            timestamp: new Date().toISOString(),
            isListening: this.isListening,
            isConnected: this.isConnected,
            isNormalStop: this.isNormalStop
        });
        if (this.onStatusCallback) {
            this.onStatusCallback(status, message);
        }
    }

    // 设置静音检测参数
    setSilenceDetection(timeout, threshold) {
        this.silenceTimeout = timeout || 10000;
        this.silenceThreshold = threshold || 300;
        console.log('静音检测参数已设置:', { timeout: this.silenceTimeout, threshold: this.silenceThreshold });
    }

    // 连接诊断
    async diagnoseConnection() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            networkStatus: 'unknown',
            websocketSupport: false,
            microphoneSupport: false,
            connectionTest: false,
            rtasrServiceTest: false,
            suggestions: []
        };

        try {
            // 检查WebSocket支持
            diagnosis.websocketSupport = typeof WebSocket !== 'undefined';
            if (!diagnosis.websocketSupport) {
                diagnosis.suggestions.push('浏览器不支持WebSocket，请使用现代浏览器');
            }

            // 检查麦克风支持
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    diagnosis.microphoneSupport = true;
                    stream.getTracks().forEach(track => track.stop());
                } catch (error) {
                    diagnosis.microphoneSupport = false;
                    diagnosis.suggestions.push('无法访问麦克风，请检查权限设置');
                }
            } else {
                diagnosis.suggestions.push('浏览器不支持麦克风访问');
            }

            // 检查网络连接
            try {
                await fetch('https://www.baidu.com/favicon.ico', { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                diagnosis.networkStatus = 'connected';
            } catch (error) {
                diagnosis.networkStatus = 'disconnected';
                diagnosis.suggestions.push('网络连接异常，请检查网络设置');
            }

            // 测试WebSocket连接
            try {
                const testWs = new WebSocket('wss://echo.websocket.org');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('WebSocket连接超时'));
                    }, 5000);
                    
                    testWs.onopen = () => {
                        clearTimeout(timeout);
                        testWs.close();
                        resolve();
                    };
                    
                    testWs.onerror = () => {
                        clearTimeout(timeout);
                        reject(new Error('WebSocket连接失败'));
                    };
                });
                diagnosis.connectionTest = true;
            } catch (error) {
                diagnosis.connectionTest = false;
                diagnosis.suggestions.push('WebSocket连接测试失败，可能是网络或防火墙问题');
            }

            // 测试RTASR服务连接
            if (diagnosis.connectionTest && diagnosis.networkStatus === 'connected') {
                try {
                    const url = this.getHandShakeParams();
                    console.log('测试RTASR服务连接:', url);
                    
                    const rtasrWs = new WebSocket(url);
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('RTASR服务连接超时'));
                        }, 10000); // 10秒超时
                        
                        rtasrWs.onopen = () => {
                            clearTimeout(timeout);
                            console.log('RTASR服务连接成功');
                            rtasrWs.close();
                            resolve();
                        };
                        
                        rtasrWs.onerror = (error) => {
                            clearTimeout(timeout);
                            console.error('RTASR服务连接失败:', error);
                            reject(new Error('RTASR服务连接失败'));
                        };
                        
                        rtasrWs.onclose = (event) => {
                            clearTimeout(timeout);
                            if (event.code === 1000) {
                                resolve(); // 正常关闭
                            } else {
                                reject(new Error(`RTASR服务连接关闭: ${event.code}`));
                            }
                        };
                    });
                    diagnosis.rtasrServiceTest = true;
                } catch (error) {
                    diagnosis.rtasrServiceTest = false;
                    console.error('RTASR服务测试失败:', error);
                    diagnosis.suggestions.push('RTASR服务连接失败，可能是API密钥无效或服务不可用');
                    diagnosis.suggestions.push('建议使用Web Speech API作为备用方案');
                }
            }

        } catch (error) {
            console.error('连接诊断失败:', error);
            diagnosis.suggestions.push('诊断过程出错: ' + error.message);
        }

        console.log('RTASR连接诊断结果:', diagnosis);
        return diagnosis;
    }

    // 获取连接状态信息
    getConnectionInfo() {
        return {
            isConnected: this.isConnected,
            isListening: this.isListening,
            isNormalStop: this.isNormalStop,
            handshakeSuccess: this.handshakeSuccess,
            connectClose: this.connectClose,
            timestamp: new Date().toISOString()
        };
    }

    // 处理连接数超限错误
    handleMaxConnectError() {
        console.log('处理连接数超限错误');
        this.updateStatus('error', '当前连接数超过限制，将在5秒后重试');
        
        // 清理现有连接
        this.cleanupConnection();
        
        // 5秒后重试
        setTimeout(() => {
            if (this.isProcessing) {
                this.startRealTimeTranscription();
            }
        }, 5000);
    }

    // 处理无效响应
    handleInvalidResponse() {
        console.log('处理无效响应');
        this.updateStatus('error', '服务响应无效，正在重试...');
        
        // 清理现有连接
        this.cleanupConnection();
        
        // 如果未超过最大重试次数，尝试重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`尝试第 ${this.reconnectAttempts} 次重连`);
            
            // 使用指数退避策略
            const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
            setTimeout(() => {
                if (this.isProcessing) {
                    this.startRealTimeTranscription();
                }
            }, delay);
        } else {
            this.updateStatus('error', '服务暂时不可用，请稍后再试');
            if (this.onErrorCallback) {
                this.onErrorCallback(new Error('服务暂时不可用，请稍后再试'));
            }
        }
    }

    // 处理连接超时
    handleConnectionTimeout() {
        console.log('连接超时，自动清理资源');
        this.updateStatus('error', '连接超时，请重试');
        this.cleanupConnection();
    }

    // 清理连接和资源
    async cleanupConnection() {
        console.log('开始清理连接和资源');
        
        // 清理连接计时器
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        
        // 停止音频录制
        if (this.audioStream) {
            try {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            } catch (error) {
                console.error('停止音频流失败:', error);
            }
        }
        
        // 清理音频处理器
        if (this.audioProcessor) {
            try {
                this.audioProcessor.disconnect();
                this.audioProcessor = null;
            } catch (error) {
                console.error('断开音频处理器失败:', error);
            }
        }
        
        // 关闭音频上下文
        if (this.audioContext) {
            try {
                await this.audioContext.close();
                this.audioContext = null;
            } catch (error) {
                console.error('关闭音频上下文失败:', error);
            }
        }
        
        // 关闭WebSocket连接
        if (this.ws) {
            try {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.close();
                }
                this.ws = null;
            } catch (error) {
                console.error('关闭WebSocket连接失败:', error);
            }
        }
        
        // 重置状态
        this.isProcessing = false;
        this.isConnected = false;
        this.isListening = false;
        this.handshakeSuccess = false;
        
        console.log('连接和资源清理完成');
    }

    // 设置连接超时时间
    setConnectionTimeout(timeout) {
        if (typeof timeout === 'number' && timeout > 0) {
            this.connectionTimeout = timeout;
        }
    }

    // 获取当前连接超时设置
    getConnectionTimeout() {
        return this.connectionTimeout;
    }

    // 禁用服务（切换到备用服务时调用）
    disable() {
        console.log('正在禁用RTASR服务...');
        this.isDisabled = true;
        
        // 停止所有正在进行的操作
        this.cleanupConnection();
        
        // 清除重连状态
        this.reconnectAttempts = 0;
        this.isProcessing = false;
        
        this.updateStatus('disabled', 'RTASR服务已禁用，已切换到备用服务');
    }

    // 重新启用服务
    enable() {
        console.log('重新启用RTASR服务');
        this.isDisabled = false;
        this.reconnectAttempts = 0;
        this.updateStatus('idle', 'RTASR服务已重新启用');
    }

    // 检查服务是否被禁用
    isServiceDisabled() {
        return this.isDisabled;
    }
}

export default RTASRService; 