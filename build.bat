@echo off
REM BabelDOC Windows 自动构建脚本
REM 用于在Windows系统上构建可执行文件

echo 🚀 开始构建BabelDOC可执行文件...

REM 激活conda环境
where conda >nul 2>nul
if %errorlevel% equ 0 (
    echo 🔧 激活conda环境: babeldoc
    call conda activate babeldoc
    if %errorlevel% neq 0 (
        echo ⚠️  警告: 激活conda环境失败，使用当前环境
    )
) else (
    echo ⚠️  警告: 未找到conda，尝试使用当前环境
)

REM 检查Python版本
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set python_version=%%i
echo 🐍 Python版本: %python_version%
if %errorlevel% neq 0 (
    echo ❌ 未找到Python，请确保Python已安装并添加到PATH
    pause
    exit /b 1
)

REM 检查是否在虚拟环境中
if defined CONDA_DEFAULT_ENV (
    echo ✅ 检测到conda环境: %CONDA_DEFAULT_ENV%
) else if defined VIRTUAL_ENV (
    echo ✅ 检测到虚拟环境: %VIRTUAL_ENV%
) else (
    echo ⚠️  警告: 未检测到虚拟环境，建议在虚拟环境中构建
)

REM 安装构建依赖
echo 📦 安装构建依赖...
pip install -r requirements_build.txt
if %errorlevel% neq 0 (
    echo ❌ 安装构建依赖失败
    pause
    exit /b 1
)

REM 安装项目依赖
echo 📦 安装项目依赖...
pip install -e .
if %errorlevel% neq 0 (
    echo ❌ 安装项目依赖失败
    pause
    exit /b 1
)

REM 清理之前的构建
echo 🧹 清理之前的构建...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist *.spec del *.spec

REM 安装jaraco.text以解决依赖问题
echo 📦 安装jaraco.text依赖...
pip install jaraco.text
if %errorlevel% neq 0 (
    echo ⚠️  警告: 安装jaraco.text失败，可能影响打包结果
)

REM 创建自定义spec文件
echo 🔨 生成PyInstaller配置...
(
echo # -*- mode: python ; coding: utf-8 -*-
echo """
echo BabelDOC PyInstaller 配置文件
echo 用于精确控制打包过程
echo """
echo.
echo import os
echo import sys
echo from pathlib import Path
echo.
echo # 获取项目根目录
echo project_root = Path.cwd(^)
echo.
echo block_cipher = None
echo.
echo # 分析入口点
echo a = Analysis(
echo     [str(project_root / 'babeldoc' / 'main.py'^)],
echo     pathex=[str(project_root^)],
echo     binaries=[],
echo     datas=[
echo         # 包含babeldoc包的所有数据文件
echo         (str(project_root / 'babeldoc'^), 'babeldoc'^),
echo         # 包含模型和资源文件
echo         (str(project_root / 'babeldoc' / 'assets'^), 'babeldoc/assets'^),
echo         # 包含tiktoken_ext数据 - Windows路径
echo         # 注意：Windows下tiktoken缓存路径通常在用户目录
echo         # 包含字体等资源
echo     ],
echo     hiddenimports=[
echo         'babeldoc',
echo         'babeldoc.main',
echo         'babeldoc.format.pdf.high_level',
echo         'babeldoc.translator.translator',
echo         'babeldoc.docvision.doclayout',
echo         'babeldoc.docvision.rpc_doclayout',
echo         'babeldoc.docvision.rpc_doclayout2',
echo         'babeldoc.docvision.rpc_doclayout3',
echo         'babeldoc.docvision.rpc_doclayout4',
echo         'babeldoc.docvision.rpc_doclayout5',
echo         'babeldoc.docvision.rpc_doclayout6',
echo         'babeldoc.docvision.rpc_doclayout7',
echo         'babeldoc.assets.assets',
echo         'babeldoc.format.pdf.converter',
echo         'babeldoc.format.pdf.result_merger',
echo         'babeldoc.format.pdf.translation_config',
echo         'babeldoc.glossary',
echo         'babeldoc.translator.cache',
echo         'babeldoc.utils.atomic_integer',
echo         'babeldoc.utils.priority_thread_pool_executor',
echo         'babeldoc.progress_monitor',
echo         # 第三方库
echo         'onnxruntime',
echo         'onnxruntime.capi._pybind_state',
echo         'cv2',
echo         'numpy',
echo         'PIL',
echo         'PIL.Image',
echo         'PIL.ImageDraw',
echo         'PIL.ImageFont',
echo         'rich',
echo         'rich.progress',
echo         'rich.logging',
echo         'tqdm',
echo         'openai',
echo         'httpx',
echo         'httpx._client',
echo         'httpx._config',
echo         'httpx._models',
echo         'configargparse',
echo         'peewee',
echo         'psutil',
echo         'pymupdf',
echo         'fitz',  # PyMuPDF的内部名称
echo         'toml',
echo         'orjson',
echo         'msgpack',
echo         'pydantic',
echo         'tenacity',
echo         'skimage',
echo         'freetype',
echo         'tiktoken',
echo         'Levenshtein',
echo         'rapidocr_onnxruntime',
echo         'pyzstd',
echo         'hyperscan',
echo         'rtree',
echo         'chardet',
echo         'scipy',
echo         'uharfbuzz',
echo         'sklearn',
echo         # jaraco和setuptools相关
echo         'jaraco',
echo         'jaraco.text',
echo         'jaraco.functools',
echo         'jaraco.context',
echo         'setuptools._vendor',
echo         'setuptools._vendor.jaraco',
echo         'setuptools._vendor.jaraco.text',
echo         'setuptools._vendor.jaraco.functools',
echo         'setuptools._vendor.jaraco.context',
echo         'pkg_resources',
echo         # tiktoken相关
echo         'tiktoken_ext',
echo         'tiktoken_ext.openai_public',
echo         # 异步相关
echo         'asyncio',
echo         'concurrent.futures',
echo         'threading',
echo         'multiprocessing',
echo         # 系统相关
echo         'platform',
echo         'ctypes',
echo         'ctypes.util',
echo     ],
echo     hookspath=[],
echo     hooksconfig={},
echo     runtime_hooks=[],
echo     excludes=[
echo         # 排除不需要的包以减小体积
echo         'matplotlib',
echo         'pandas',
echo         'jupyter',
echo         'notebook',
echo         'IPython',
echo         'pytest',
echo         'sphinx',
echo     ],
echo     win_no_prefer_redirects=False,
echo     win_private_assemblies=False,
echo     cipher=block_cipher,
echo     noarchive=False,
echo ^)
echo.
echo # 创建PYZ归档
echo pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher^)
echo.
echo # 创建可执行文件 - 目录模式（更稳定^)
echo exe = EXE(
echo     pyz,
echo     a.scripts,
echo     [],
echo     exclude_binaries=True,
echo     name='babeldoc',
echo     debug=False,
echo     bootloader_ignore_signals=False,
echo     strip=False,
echo     upx=False,  # 禁用UPX压缩（避免依赖问题^)
echo     console=True,  # 保留控制台窗口
echo     disable_windowed_traceback=False,
echo     argv_emulation=False,
echo     target_arch=None,
echo     codesign_identity=None,
echo     entitlements_file=None,
echo ^)
echo.
echo # 使用目录模式收集所有文件
echo coll = COLLECT(
echo     exe,
echo     a.binaries,
echo     a.zipfiles,
echo     a.datas,
echo     strip=False,
echo     upx=False,
echo     upx_exclude=[],
echo     name='babeldoc'
echo ^)
) > babeldoc.spec

echo 🔨 开始PyInstaller构建...
pyinstaller babeldoc.spec --clean
if %errorlevel% neq 0 (
    echo ❌ PyInstaller构建失败
    pause
    exit /b 1
)

REM 检查构建结果
if exist "dist\babeldoc\babeldoc.exe" (
    echo ✅ 构建成功！
    
    REM 显示文件信息
    set executable=dist\babeldoc\babeldoc.exe
    echo 📁 可执行文件: %executable%
    for %%I in ("%executable%") do echo 📏 文件大小: %%~zI 字节
    
    REM 显示目录大小（Windows没有du命令，使用dir）
    echo 📂 打包目录: dist\babeldoc
    for /f "tokens=3" %%a in ('dir "dist\babeldoc" /-c ^| find "个文件"') do set dir_size=%%a
    echo 📏 目录大小: %dir_size% 字节
    
    REM 测试可执行文件
    echo 🧪 测试可执行文件...
    "%executable%" --version
    if %errorlevel% equ 0 (
        echo ✅ 测试成功！
    ) else (
        echo ⚠️ 测试失败，但文件已生成
    )
    
    echo.
    echo 🎉 构建完成！
    echo 📋 使用说明:
    echo 1. 将整个 dist\babeldoc 目录复制到您的Electron项目中
    echo 2. 使用 electron_wrapper.js 来调用 %executable%
    echo 3. 在Electron打包时，确保包含整个babeldoc目录
    
) else (
    echo ❌ 构建失败，未找到可执行文件
    echo 📝 检查以下位置:
    echo    - dist\babeldoc\babeldoc.exe
    if exist "dist" (
        echo 📁 当前dist目录内容:
        dir dist\ /b
        if exist "dist\babeldoc" (
            echo 📁 babeldoc目录内容:
            dir dist\babeldoc\ /b
        )
    )
    pause
    exit /b 1
)

pause
