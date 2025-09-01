@echo off
REM BabelDOC Windows 自动构建脚本
REM 用于在Windows系统上构建可执行文件

echo 🚀 开始构建BabelDOC可执行文件...

REM 检查Python版本
python --version
if %errorlevel% neq 0 (
    echo ❌ 未找到Python，请确保Python已安装并添加到PATH
    pause
    exit /b 1
)

REM 检查虚拟环境
if defined VIRTUAL_ENV (
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

REM 使用自定义spec文件构建
echo 🔨 开始PyInstaller构建...
pyinstaller pyinstaller_spec.py
if %errorlevel% neq 0 (
    echo ❌ PyInstaller构建失败
    pause
    exit /b 1
)

REM 检查构建结果
if exist "dist\babeldoc.exe" (
    echo ✅ 构建成功！
    
    REM 显示文件信息
    echo 📁 可执行文件: dist\babeldoc.exe
    for %%I in ("dist\babeldoc.exe") do echo 📏 文件大小: %%~zI 字节
    
    REM 测试可执行文件
    echo 🧪 测试可执行文件...
    "dist\babeldoc.exe" --version
    if %errorlevel% equ 0 (
        echo ✅ 测试成功！
    ) else (
        echo ⚠️ 测试失败，但文件已生成
    )
    
    echo.
    echo 🎉 构建完成！
    echo 📋 使用说明:
    echo 1. 将 dist\babeldoc.exe 复制到您的Electron项目中
    echo 2. 使用 electron_wrapper.js 来调用BabelDOC
    echo 3. 在Electron打包时，确保包含可执行文件
    
) else (
    echo ❌ 构建失败，未找到可执行文件
    pause
    exit /b 1
)

pause
