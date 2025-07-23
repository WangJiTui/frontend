# 模拟API使用说明

这个功能允许你在不连接后端服务器的情况下测试前端功能。

## 如何启用模拟API

在 `src/services/api.js` 文件中，将第5行的 `USE_MOCK_API` 设置为 `true`:

```javascript
const USE_MOCK_API = true;  // 设置为 true 启用模拟API
```

## 模拟数据说明

### 登录/注册
- **测试用户**: username: `test`, password: `test123`
- 注册时会自动创建新用户
- 所有操作都会有模拟的延迟效果

### 面试功能
- 提供5个预设的面试问题
- 支持完整的面试流程：创建 → 开始 → 回答问题 → 完成
- 包含模拟的简历分析和面试总结

### 可用的API功能
✅ 用户登录/注册  
✅ 检查学号是否存在  
✅ 获取用户信息  
✅ 创建面试会话  
✅ 开始面试  
✅ 获取面试问题  
✅ 提交面试回答  
✅ 获取简历分析  
✅ 获取面试总结  
✅ 完成面试  

## 模拟API的特点

1. **延迟模拟**: 每个API调用都有真实的延迟效果（300ms-2000ms）
2. **状态管理**: 维护面试进度和用户状态
3. **错误处理**: 包含适当的错误处理逻辑
4. **控制台日志**: 显示模拟API的调用情况

## 切换回真实API

将 `USE_MOCK_API` 设置为 `false` 即可切换回真实后端API:

```javascript
const USE_MOCK_API = false;  // 设置为 false 使用真实后端
```

## 检查当前API模式

你可以在浏览器控制台中运行以下代码来检查当前使用的API模式:

```javascript
import { getApiMode } from './src/services/api';
console.log(getApiMode()); // 显示当前API模式信息
```

## 注意事项

- 模拟API的数据在页面刷新后会重置
- 上传的文件在模拟模式下不会真正处理，但会模拟成功响应
- 模拟API不会连接到真实数据库或AI服务