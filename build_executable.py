#!/usr/bin/env python3
"""
BabelDOC 可执行文件构建脚本
用于将BabelDOC打包成独立的可执行文件，供Electron项目调用
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def build_executable():
    """构建BabelDOC可执行文件"""
    
    print("🚀 开始构建BabelDOC可执行文件...")
    
    # 检查PyInstaller是否安装
    try:
        import PyInstaller
        print(f"✅ 发现PyInstaller版本: {PyInstaller.__version__}")
    except ImportError:
        print("❌ 未发现PyInstaller，正在安装...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    # 项目根目录
    project_root = Path(__file__).parent
    build_dir = project_root / "build"
    dist_dir = project_root / "dist"
    
    # 清理之前的构建
    if build_dir.exists():
        shutil.rmtree(build_dir)
        print("🧹 清理旧的build目录")
    
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
        print("🧹 清理旧的dist目录")
    
    # PyInstaller 命令参数
    pyinstaller_args = [
        "pyinstaller",
        "--onefile",  # 打包成单个文件
        "--name", "babeldoc",  # 可执行文件名
        "--console",  # 保留控制台窗口
        "--noconfirm",  # 不询问确认
        # 添加必要的隐藏导入
        "--hidden-import", "babeldoc",
        "--hidden-import", "babeldoc.main",
        "--hidden-import", "babeldoc.format.pdf.high_level", 
        "--hidden-import", "babeldoc.translator.translator",
        "--hidden-import", "babeldoc.docvision.doclayout",
        "--hidden-import", "babeldoc.assets.assets",
        "--hidden-import", "onnxruntime",
        "--hidden-import", "cv2",
        "--hidden-import", "numpy",
        "--hidden-import", "PIL",
        "--hidden-import", "rich",
        "--hidden-import", "tqdm",
        "--hidden-import", "openai",
        "--hidden-import", "httpx",
        "--hidden-import", "configargparse",
        # 收集数据文件
        "--collect-data", "babeldoc",
        "--collect-data", "onnxruntime", 
        # 入口脚本
        str(project_root / "babeldoc" / "main.py")
    ]
    
    print("📦 开始PyInstaller打包...")
    print(f"命令: {' '.join(pyinstaller_args)}")
    
    try:
        # 运行PyInstaller
        result = subprocess.run(pyinstaller_args, 
                              cwd=project_root, 
                              capture_output=True, 
                              text=True)
        
        if result.returncode == 0:
            print("✅ PyInstaller打包成功！")
            
            # 检查生成的可执行文件
            executable_path = dist_dir / "babeldoc"
            if sys.platform == "win32":
                executable_path = executable_path.with_suffix(".exe")
            
            if executable_path.exists():
                print(f"🎉 可执行文件已生成: {executable_path}")
                print(f"📏 文件大小: {executable_path.stat().st_size / (1024*1024):.1f} MB")
                
                # 测试可执行文件
                print("🧪 测试可执行文件...")
                test_result = subprocess.run([str(executable_path), "--version"], 
                                           capture_output=True, text=True)
                if test_result.returncode == 0:
                    print(f"✅ 测试成功: {test_result.stdout.strip()}")
                else:
                    print(f"⚠️ 测试警告: {test_result.stderr}")
                
                return str(executable_path)
            else:
                print("❌ 未找到生成的可执行文件")
                return None
        else:
            print("❌ PyInstaller打包失败:")
            print(result.stderr)
            return None
            
    except Exception as e:
        print(f"❌ 构建过程出错: {e}")
        return None

def create_electron_wrapper():
    """创建Electron调用包装脚本"""
    
    project_root = Path(__file__).parent
    wrapper_path = project_root / "electron_wrapper.js"
    
    wrapper_content = '''/**
 * BabelDOC Electron 包装器
 * 用于在Electron项目中调用BabelDOC可执行文件
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class BabelDocWrapper {
    constructor(executablePath) {
        this.executablePath = executablePath;
        
        // 验证可执行文件是否存在
        if (!fs.existsSync(this.executablePath)) {
            throw new Error(`BabelDOC executable not found: ${this.executablePath}`);
        }
    }
    
    /**
     * 翻译PDF文件
     * @param {Object} options - 翻译选项
     * @param {string} options.inputFile - 输入PDF文件路径
     * @param {string} options.outputDir - 输出目录
     * @param {string} options.langIn - 源语言代码 (默认: 'en')
     * @param {string} options.langOut - 目标语言代码 (默认: 'zh')
     * @param {string} options.openaiApiKey - OpenAI API密钥
     * @param {string} options.openaiModel - OpenAI模型 (默认: 'gpt-4o-mini')
     * @param {string} options.openaiBaseUrl - OpenAI API基础URL
     * @param {Function} onProgress - 进度回调函数
     * @param {Function} onError - 错误回调函数
     * @returns {Promise} 翻译结果Promise
     */
    async translatePDF(options, onProgress = null, onError = null) {
        return new Promise((resolve, reject) => {
            // 构建命令行参数
            const args = [
                '--openai',
                '--openai-api-key', options.openaiApiKey,
                '--files', options.inputFile
            ];
            
            // 可选参数
            if (options.outputDir) {
                args.push('--output', options.outputDir);
            }
            if (options.langIn) {
                args.push('--lang-in', options.langIn);
            }
            if (options.langOut) {
                args.push('--lang-out', options.langOut);
            }
            if (options.openaiModel) {
                args.push('--openai-model', options.openaiModel);
            }
            if (options.openaiBaseUrl) {
                args.push('--openai-base-url', options.openaiBaseUrl);
            }
            
            console.log('Executing BabelDOC:', this.executablePath, args.join(' '));
            
            // 启动子进程
            const child = spawn(this.executablePath, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            // 处理输出
            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                
                // 简单的进度解析（根据实际输出格式调整）
                if (onProgress && output.includes('%')) {
                    const progressMatch = output.match(/(\\d+)%/);
                    if (progressMatch) {
                        onProgress(parseInt(progressMatch[1]));
                    }
                }
                
                console.log('BabelDOC stdout:', output);
            });
            
            child.stderr.on('data', (data) => {
                const error = data.toString();
                stderr += error;
                
                if (onError) {
                    onError(error);
                }
                
                console.error('BabelDOC stderr:', error);
            });
            
            // 处理进程结束
            child.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        code: code,
                        stdout: stdout,
                        stderr: stderr
                    });
                } else {
                    reject({
                        success: false,
                        code: code,
                        stdout: stdout,
                        stderr: stderr,
                        error: `BabelDOC exited with code ${code}`
                    });
                }
            });
            
            child.on('error', (error) => {
                reject({
                    success: false,
                    error: error.message,
                    originalError: error
                });
            });
        });
    }
    
    /**
     * 检查BabelDOC版本
     * @returns {Promise<string>} 版本信息
     */
    async getVersion() {
        return new Promise((resolve, reject) => {
            const child = spawn(this.executablePath, ['--version'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(`Failed to get version, exit code: ${code}`);
                }
            });
            
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
}

module.exports = BabelDocWrapper;

// 使用示例
if (require.main === module) {
    async function example() {
        try {
            // 初始化包装器（需要指定可执行文件路径）
            const babeldoc = new BabelDocWrapper('./dist/babeldoc');
            
            // 检查版本
            const version = await babeldoc.getVersion();
            console.log('BabelDOC version:', version);
            
            // 翻译PDF
            const result = await babeldoc.translatePDF({
                inputFile: '/path/to/input.pdf',
                outputDir: '/path/to/output',
                langIn: 'en',
                langOut: 'zh',
                openaiApiKey: 'your-api-key',
                openaiModel: 'gpt-4o-mini'
            }, 
            (progress) => {
                console.log(`Translation progress: ${progress}%`);
            },
            (error) => {
                console.error('Translation error:', error);
            });
            
            console.log('Translation completed:', result);
            
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    example();
}
'''
    
    with open(wrapper_path, 'w', encoding='utf-8') as f:
        f.write(wrapper_content)
    
    print(f"📝 已创建Electron包装器: {wrapper_path}")
    return str(wrapper_path)

if __name__ == "__main__":
    # 构建可执行文件
    executable_path = build_executable()
    
    if executable_path:
        # 创建Electron包装器
        wrapper_path = create_electron_wrapper()
        
        print("\n🎉 构建完成！")
        print(f"📁 可执行文件: {executable_path}")
        print(f"📁 Electron包装器: {wrapper_path}")
        print("\n📋 使用说明:")
        print("1. 将生成的可执行文件复制到您的Electron项目中")
        print("2. 使用提供的electron_wrapper.js来调用BabelDOC")
        print("3. 在Electron打包时，确保包含可执行文件")
    else:
        print("❌ 构建失败，请检查错误信息")
        sys.exit(1)
