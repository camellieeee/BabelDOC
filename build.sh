#!/bin/bash

# BabelDOC 自动构建脚本
# 用于构建跨平台的可执行文件

set -e  # 遇到错误时退出

echo "🚀 开始构建BabelDOC可执行文件..."

# 激活conda环境
if command -v conda &> /dev/null; then
    echo "🔧 激活conda环境: babeldoc"
    eval "$(conda shell.bash hook)"
    conda activate babeldoc
else
    echo "⚠️  警告: 未找到conda，尝试使用当前环境"
fi

# 检查Python版本
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "🐍 Python版本: $python_version"

# 检查是否在虚拟环境中
if [[ "$CONDA_DEFAULT_ENV" != "" ]]; then
    echo "✅ 检测到conda环境: $CONDA_DEFAULT_ENV"
elif [[ "$VIRTUAL_ENV" != "" ]]; then
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

# 创建自定义spec文件
echo "🔨 生成PyInstaller配置..."
cat > babeldoc.spec << 'EOF'
# -*- mode: python ; coding: utf-8 -*-
"""
BabelDOC PyInstaller 配置文件
用于精确控制打包过程
"""

import os
import sys
from pathlib import Path

# 获取项目根目录
project_root = Path.cwd()

block_cipher = None

# 分析入口点
a = Analysis(
    [str(project_root / 'babeldoc' / 'main.py')],
    pathex=[str(project_root)],
    binaries=[],
    datas=[
        # 包含babeldoc包的所有数据文件
        (str(project_root / 'babeldoc'), 'babeldoc'),
        # 包含模型和资源文件
        (str(project_root / 'babeldoc' / 'assets'), 'babeldoc/assets'),
        # 包含tiktoken_ext数据
        ('/opt/anaconda3/envs/babeldoc/lib/python3.12/site-packages/tiktoken_ext', 'tiktoken_ext'),
        # 包含babeldoc的tiktoken缓存
        ('/Users/mofei/.babeldoc/assets/tiktoken', '_babeldoc_tiktoken_cache'),
        ('/Users/mofei/.cache/babeldoc/tiktoken', '_babeldoc_tiktoken_cache2'),
        # 包含字体等资源
    ],
    hiddenimports=[
        'babeldoc',
        'babeldoc.main',
        'babeldoc.format.pdf.high_level',
        'babeldoc.translator.translator',
        'babeldoc.docvision.doclayout',
        'babeldoc.docvision.rpc_doclayout',
        'babeldoc.docvision.rpc_doclayout2',
        'babeldoc.docvision.rpc_doclayout3',
        'babeldoc.docvision.rpc_doclayout4',
        'babeldoc.docvision.rpc_doclayout5',
        'babeldoc.docvision.rpc_doclayout6',
        'babeldoc.docvision.rpc_doclayout7',
        'babeldoc.assets.assets',
        'babeldoc.format.pdf.converter',
        'babeldoc.format.pdf.result_merger',
        'babeldoc.format.pdf.translation_config',
        'babeldoc.glossary',
        'babeldoc.translator.cache',
        'babeldoc.utils.atomic_integer',
        'babeldoc.utils.priority_thread_pool_executor',
        'babeldoc.progress_monitor',
        # 第三方库
        'onnxruntime',
        'onnxruntime.capi._pybind_state',
        'cv2',
        'numpy',
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',
        'rich',
        'rich.progress',
        'rich.logging',
        'tqdm',
        'openai',
        'httpx',
        'httpx._client',
        'httpx._config',
        'httpx._models',
        'configargparse',
        'peewee',
        'psutil',
        'pymupdf',
        'fitz',  # PyMuPDF的内部名称
        'toml',
        'orjson',
        'msgpack',
        'pydantic',
        'tenacity',
        'skimage',
        'freetype',
        'tiktoken',
        'Levenshtein',
        'rapidocr_onnxruntime',
        'pyzstd',
        'hyperscan',
        'rtree',
        'chardet',
        'scipy',
        'uharfbuzz',
        'sklearn',
        # jaraco和setuptools相关
        'jaraco',
        'jaraco.text',
        'jaraco.functools',
        'jaraco.context',
        'setuptools._vendor',
        'setuptools._vendor.jaraco',
        'setuptools._vendor.jaraco.text',
        'setuptools._vendor.jaraco.functools',
        'setuptools._vendor.jaraco.context',
        'pkg_resources',
        # tiktoken相关
        'tiktoken_ext',
        'tiktoken_ext.openai_public',
        # 异步相关
        'asyncio',
        'concurrent.futures',
        'threading',
        'multiprocessing',
        # 系统相关
        'platform',
        'ctypes',
        'ctypes.util',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # 排除不需要的包以减小体积
        'matplotlib',
        'pandas',
        'jupyter',
        'notebook',
        'IPython',
        'pytest',
        'sphinx',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# 创建PYZ归档
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# 创建可执行文件 - 目录模式（更稳定）
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='babeldoc',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # 禁用UPX压缩（避免依赖问题）
    console=True,  # 保留控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# 使用目录模式收集所有文件
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='babeldoc'
)
EOF

echo "🔨 开始PyInstaller构建..."
pyinstaller babeldoc.spec --clean

# 检查构建结果
if [ -f "dist/babeldoc/babeldoc" ] || [ -f "dist/babeldoc/babeldoc.exe" ]; then
    echo "✅ 构建成功！"
    
    # 显示文件信息
    if [ -f "dist/babeldoc/babeldoc" ]; then
        executable="dist/babeldoc/babeldoc"
    else
        executable="dist/babeldoc/babeldoc.exe"
    fi
    
    file_size=$(du -h "$executable" | cut -f1)
    echo "📁 可执行文件: $executable"
    echo "📏 文件大小: $file_size"
    
    # 显示目录大小
    dir_size=$(du -sh "dist/babeldoc" | cut -f1)
    echo "📂 打包目录: dist/babeldoc"
    echo "📏 目录大小: $dir_size"
    
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
    echo "1. 将整个 dist/babeldoc 目录复制到您的Electron项目中"
    echo "2. 使用 electron_wrapper.js 来调用 $executable"
    echo "3. 在Electron打包时，确保包含整个babeldoc目录"
    
else
    echo "❌ 构建失败，未找到可执行文件"
    echo "📝 检查以下位置:"
    echo "   - dist/babeldoc/babeldoc"
    echo "   - dist/babeldoc/babeldoc.exe"
    if [ -d "dist" ]; then
        echo "📁 当前dist目录内容:"
        ls -la dist/
        if [ -d "dist/babeldoc" ]; then
            echo "📁 babeldoc目录内容:"
            ls -la dist/babeldoc/
        fi
    fi
    exit 1
fi
