@echo off
echo ========================================
echo    面试系统 Mock API 服务器启动工具
echo ========================================
echo.

:: 检查是否在正确的目录
if not exist "package.json" (
    echo [错误] 找不到 package.json 文件
    echo 请确保在 frontend/mocks 目录下运行此脚本
    pause
    exit /b 1
)

:: 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo [信息] 正在安装依赖包...
    echo.
    npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成
    echo.
)

echo [信息] 正在启动 Mock API 服务器...
echo.
echo 服务器地址: http://localhost:8000
echo 前端应用: http://localhost:3000
echo.
echo 测试账号:
echo   用户名: testuser
echo   密码: 123456
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

:: 启动服务器
npm start 