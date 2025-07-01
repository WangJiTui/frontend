#!/bin/bash

echo "========================================"
echo "   面试系统 Mock API 服务器启动工具"
echo "========================================"
echo

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "[错误] 找不到 package.json 文件"
    echo "请确保在 frontend/mocks 目录下运行此脚本"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "[信息] Node.js 版本: $(node --version)"
echo "[信息] NPM 版本: $(npm --version)"
echo

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "[信息] 正在安装依赖包..."
    echo
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
    echo
    echo "[成功] 依赖安装完成"
    echo
fi

echo "[信息] 正在启动 Mock API 服务器..."
echo
echo "服务器地址: http://localhost:8000"
echo "前端应用: http://localhost:3000"
echo
echo "测试账号:"
echo "  用户名: testuser"
echo "  密码: 123456"
echo
echo "按 Ctrl+C 停止服务器"
echo "========================================"
echo

# 启动服务器
npm start 