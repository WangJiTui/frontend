# AI模拟面试系统

一个基于React的AI驱动模拟面试系统，支持实时语音转文字、智能问答和视频录制功能。

## 最新更新

1. **代码清理和优化**
   - 删除了 `RealTimeTranscription.js` 组件（使用Web Speech API的旧版本）
   - 删除了 `speechToText.js` 服务（旧的讯飞服务实现）
   - 删除了 `frontendSpeechToText.js` 和 `fallbackSpeechService.js` 服务
   - 删除了 `FrontendRealTimeTranscription.js` 组件
   - 简化了语音转写架构，统一使用 `rtasrService.js`
   - 优化了 `RTASRTranscription` 组件的useEffect依赖管理
   - 改进了错误处理和状态管理

2. **配置文件完善**
   - 创建了 `postcss.config.js` 配置文件
   - 确保Tailwind CSS正常工作

## 功能特性

- 🎯 **智能问答**: 根据面试方向提供专业问题，模拟真实面试场景
- 🎤 **语音识别**: 使用科大讯飞RTASR服务进行实时语音转文字
- 📊 **实时反馈**: 提供即时的回答分析和改进建议
- 📹 **视频录制**: 录制面试过程，便于后续回顾和分析
- 🔐 **用户管理**: 支持用户注册、登录和会话管理

## 语音转文字功能说明

### 服务配置
系统使用科大讯飞RTASR服务进行语音转文字，需要以下配置：

1. **APPID**: 科大讯飞应用ID
2. **SECRET_KEY**: 科大讯飞密钥
3. **网络连接**: 确保可以访问科大讯飞服务器

### 配置位置
语音服务配置位于 `src/services/rtasrService.js` 文件中：

```javascript
this.APPID = "42564b2f";
this.SECRET_KEY = "fe7d9141b97b6c9095a77c17b4887634";
this.HOST = "rtasr.xfyun.cn/v1/ws";
```

### 使用方法

1. **登录系统**: 使用注册的账号登录
2. **测试语音功能**: 在首页点击"测试语音转写"按钮
3. **开始面试**: 选择面试方向后开始面试，语音转文字功能会自动工作

### 故障排除

如果语音转文字功能不工作，请检查：

1. **API密钥**: 确保APPID和SECRET_KEY有效
2. **网络连接**: 确保可以访问科大讯飞服务器
3. **麦克风权限**: 允许浏览器访问麦克风
4. **浏览器支持**: 使用现代浏览器（Chrome、Edge、Firefox等）

### 常见错误

- **"RTASR服务连接失败"**: 检查API密钥和网络连接
- **"无法访问麦克风"**: 请允许浏览器访问麦克风权限
- **"WebSocket连接失败"**: 检查网络连接和防火墙设置

## 技术栈

- **前端**: React 18, Tailwind CSS
- **语音识别**: 科大讯飞RTASR服务
- **路由**: React Router DOM
- **加密**: CryptoJS
- **HTTP客户端**: Axios

## 安装和运行

### 前置要求

- Node.js 16+
- npm 或 yarn
- 有效的科大讯飞RTASR API密钥

### 安装依赖

```bash
npm install
```

### 配置API密钥

编辑 `src/services/rtasrService.js` 文件，更新您的API配置：

```javascript
this.APPID = "您的APPID";
this.SECRET_KEY = "您的SECRET_KEY";
```

### 启动开发服务器

```bash
npm start
```

应用将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
src/
├── components/          # React组件
│   ├── RTASRTranscription.js    # 语音转写组件
│   ├── DialogueInterview.js     # 面试对话组件
│   ├── VideoPreview.js          # 视频预览组件
│   └── ...
├── services/           # 服务层
│   ├── rtasrService.js          # 科大讯飞RTASR服务
│   └── ...
├── pages/             # 页面组件
│   ├── Home.js        # 首页
│   ├── Interview.js   # 面试页面
│   └── Summary.js     # 总结页面
└── ...
```

## 配置说明

### API配置

系统支持配置后端API地址：

1. 在首页点击"API配置"按钮
2. 输入后端服务器地址
3. 点击保存

### 语音服务配置

语音转文字功能使用科大讯飞RTASR服务：

1. 在科大讯飞开放平台注册账号
2. 创建应用并获取APPID和SECRET_KEY
3. 更新 `src/services/rtasrService.js` 中的配置
4. 确保网络可以访问科大讯飞服务器

## 故障排除

### 语音转文字不工作

1. **检查API配置**: 确保APPID和SECRET_KEY正确
2. **检查网络连接**: 确保可以访问科大讯飞服务器
3. **检查麦克风权限**: 允许浏览器访问麦克风
4. **查看控制台错误**: 打开浏览器开发者工具查看错误信息

### 获取科大讯飞API密钥

1. 访问 [科大讯飞开放平台](https://www.xfyun.cn/)
2. 注册账号并登录
3. 创建新应用
4. 在应用详情中获取APPID和SECRET_KEY

## 开发说明

### 调试语音功能

1. 打开浏览器开发者工具
2. 查看控制台日志，了解连接状态
3. 使用"运行连接诊断"功能获取详细信息

### 自定义配置

可以在 `src/services/rtasrService.js` 中修改以下配置：

- `silenceTimeout`: 静音检测超时时间（毫秒）
- `silenceThreshold`: 静音检测阈值
- `minSpeechLength`: 最小语音长度（毫秒）

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件
- 项目讨论区
