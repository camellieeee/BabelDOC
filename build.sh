#!/bin/bash

# BabelDOC 自动构建脚本
# 用于构建跨平台的可执行文件

set -e  # 遇到错误时退出

echo "🚀 开始构建BabelDOC可执行文件..."

# 检查Python版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "🐍 Python版本: $python_version"

# 检查是否在虚拟环境中
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ 检测到虚拟环境: $VIRTUAL_ENV"
else
    echo "⚠️  警告: 未检测到虚拟环境，建议在虚拟环境中构建"
fi

# 安装构建依赖
echo "📦 安装构建依赖..."
pip install -r requirements_build.txt

# 安装项目依赖
echo "📦 安装项目依赖..."
pip install -e .

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf build/
rm -rf dist/
rm -rf *.spec

# 使用自定义spec文件构建
echo "🔨 开始PyInstaller构建..."
pyinstaller pyinstaller_spec.py

# 检查构建结果
if [ -f "dist/babeldoc" ] || [ -f "dist/babeldoc.exe" ]; then
    echo "✅ 构建成功！"
    
    # 显示文件信息
    if [ -f "dist/babeldoc" ]; then
        executable="dist/babeldoc"
    else
        executable="dist/babeldoc.exe"
    fi
    
    file_size=$(du -h "$executable" | cut -f1)
    echo "📁 可执行文件: $executable"
    echo "📏 文件大小: $file_size"
    
    # 测试可执行文件
    echo "🧪 测试可执行文件..."
    if $executable --version; then
        echo "✅ 测试成功！"
    else
        echo "⚠️ 测试失败，但文件已生成"
    fi
    
    echo ""
    echo "🎉 构建完成！"
    echo "📋 使用说明:"
    echo "1. 将 $executable 复制到您的Electron项目中"
    echo "2. 使用 electron_wrapper.js 来调用BabelDOC"
    echo "3. 在Electron打包时，确保包含可执行文件"
    
else
    echo "❌ 构建失败，未找到可执行文件"
    exit 1
fi
