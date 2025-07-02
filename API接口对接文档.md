# 前端API接口对接文档

## 概述
本文档描述前端与后端的API接口对接详情，包含所有当前使用的接口定义和参数说明。

## 接口基础信息
- 基础URL: 可配置，默认为 `http://localhost:8080`
- 请求格式: JSON / FormData
- 响应格式: JSON

## 1. 用户控制器 (User Controller)

### 1.1 用户登录
- **接口路径**: `/api/users/login`
- **请求方法**: POST
- **请求参数**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "success": true
  }
  ```

### 1.2 用户注册
- **接口路径**: `/api/users/register`
- **请求方法**: POST
- **请求参数**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "success": true
  }
  ```

### 1.3 学号检查
- **接口路径**: `/api/users/check-student-number?userName={userName}`
- **请求方法**: GET
- **查询参数**: 
  - `userName`: 用户名
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "data": "boolean"
  }
  ```

### 1.4 获取用户信息
- **接口路径**: `/api/users/profile`
- **请求方法**: GET
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "data": {
      "username": "string",
      "email": "string"
    }
  }
  ```

## 2. 面试控制器 (Interview Controller)

### 2.1 创建面试会话
- **接口路径**: `/api/interviews/create?position={position}`
- **请求方法**: POST
- **查询参数**:
  - `position`: 职位名称（如："AI工程师,前端工程师"）
- **请求体**: FormData
  - `resume_file`: PDF简历文件
  - `job_file`: 岗位描述TXT文件
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "data": {
      "sessionId": "string",
      "resumeAnalysis": {
        "综合评分": "number",
        "匹配度": "number",
        "技能清单": ["string"],
        "工作经验": "string",
        "教育背景": "string",
        "优势特点": "string",
        "需要改进": "string",
        "改进建议": "string"
      }
    }
  }
  ```

### 2.2 开始面试
- **接口路径**: `/api/interviews/start`
- **请求方法**: POST
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "success": true
  }
  ```

### 2.3 获取面试问题
- **接口路径**: `/api/interviews/question`
- **请求方法**: GET
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "data": {
      "question": "string",
      "questionIndex": "number",
      "isLastQuestion": "boolean"
    }
  }
  ```

### 2.4 提交面试回答
- **接口路径**: `/api/interviews/question?answer={answer}`
- **请求方法**: POST
- **查询参数**:
  - `answer`: 用户回答内容（字符串）
- **请求体**: FormData
  - `videoFile`: 录制的视频文件
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "data": {
      "feedback": "string",
      "isLastQuestion": "boolean",
      "question": "string",
      "questionIndex": "number"
    }
  }
  ```

### 2.5 完成面试
- **接口路径**: `/api/interviews/complete?position={position}`
- **请求方法**: POST
- **查询参数**:
  - `position`: 职位名称
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "success": true
  }
  ```

### 2.6 获取面试总结
- **接口路径**: `/api/interviews/summary?sessionId={sessionId}`
- **请求方法**: GET
- **查询参数**:
  - `sessionId`: 面试会话ID
- **响应格式**:
  ```json
  {
    "code": 200,
    "message": "string",
    "data": {
      "总体评价": "string",
      "面试得分": "number",
      "技术能力": "string",
      "沟通表达": "string",
      "问题解决": "string",
      "改进建议": ["string"],
      "优势亮点": ["string"]
    }
  }
  ```

## 3. 其他接口

### 3.1 服务器状态检查
- **接口路径**: `/api/status`
- **请求方法**: GET
- **响应格式**:
  ```json
  {
    "status": "online",
    "timestamp": "string",
    "version": "string"
  }
  ```

## 4. 前端实现说明

### 4.1 工作流程
1. **用户登录/注册** → 验证用户身份
2. **文件上传** → 选择PDF简历文件
3. **面试方向选择** → 选择一个或多个面试方向
4. **开始面试** → 调用创建面试接口，同时进行简历分析
5. **面试进行** → 循环获取问题和提交回答
6. **结束面试** → 完成面试并获取总结
7. **查看结果** → 显示面试评价和简历分析结果

### 4.2 文件处理
- **简历文件**: 用户上传的PDF文件，直接传递给后端
- **岗位描述文件**: 前端根据选择的面试方向自动生成TXT文件
- **视频文件**: 每个回答的录制视频，与文字回答一同提交

### 4.3 状态管理
- 面试状态通过React state管理
- 用户信息存储在localStorage
- 面试结果在Summary页面统一展示

### 4.4 错误处理
- 网络错误：显示友好提示，允许重试
- 文件错误：验证文件类型、大小、完整性
- 状态错误：自动重置状态，引导用户重新操作

## 5. 数据格式说明

### 5.1 简历分析结果
后端返回的简历分析结果为中文字段名的JSON对象，包含但不限于：
- 数值型字段：评分、匹配度等
- 字符串字段：经验描述、建议等
- 数组字段：技能列表、改进建议等

### 5.2 面试评价结果
面试完成后的评价结果同样为中文字段名，涵盖：
- 综合评价和分数
- 各维度能力评估
- 具体改进建议
- 优势亮点总结

## 6. 技术要点

### 6.1 文件上传
- 使用FormData格式上传文件
- 支持大文件上传（最大10MB）
- 包含进度显示和错误处理

### 6.2 实时交互
- 语音转文字功能
- 视频录制功能
- 实时状态反馈

### 6.3 数据展示
- 动态数据结构渲染
- 响应式布局设计
- 导出功能支持

## 7. 更新记录
- **2024-12**: 整合简历分析和面试功能，统一工作流程
- **2024-12**: 移除独立的简历分析接口，集成到面试创建接口
- **2024-12**: 优化中文字段显示，移除不必要的字段映射
- **2024-12**: 增强文件验证和错误处理逻辑 