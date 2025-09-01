/**
 * Python环境管理器
 * 用于在Electron应用中管理Python虚拟环境和BabelDOC安装
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class PythonManager {
    constructor() {
        this.pythonPath = null;
        this.venvPath = null;
        this.babeldocInstalled = false;
        this.setupPaths();
    }

    setupPaths() {
        // 在应用数据目录中创建Python环境
        const appDataPath = app.getPath('userData');
        this.venvPath = path.join(appDataPath, 'babeldoc-python-env');
        
        // 根据平台设置Python路径
        if (process.platform === 'win32') {
            this.pythonPath = path.join(this.venvPath, 'Scripts', 'python.exe');
        } else {
            this.pythonPath = path.join(this.venvPath, 'bin', 'python');
        }
    }

    /**
     * 检查系统是否安装了Python
     */
    async checkSystemPython() {
        const pythonCommands = ['python3', 'python'];
        
        for (const cmd of pythonCommands) {
            try {
                const result = await this.runCommand(cmd, ['--version']);
                if (result.success) {
                    console.log(`✅ 找到Python: ${result.stdout.trim()}`);
                    return cmd;
                }
            } catch (error) {
                // 继续尝试下一个命令
            }
        }
        
        return null;
    }

    /**
     * 运行命令的通用方法
     */
    runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                ...options
            });
            
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        code,
                        stdout,
                        stderr
                    });
                } else {
                    reject({
                        success: false,
                        code,
                        stdout,
                        stderr,
                        error: `Command failed with code ${code}`
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
     * 创建虚拟环境
     */
    async createVirtualEnv(pythonCommand) {
        if (fs.existsSync(this.venvPath)) {
            console.log('✅ 虚拟环境已存在');
            return true;
        }

        console.log('🔨 创建Python虚拟环境...');
        
        try {
            await this.runCommand(pythonCommand, ['-m', 'venv', this.venvPath]);
            console.log('✅ 虚拟环境创建成功');
            return true;
        } catch (error) {
            console.error('❌ 虚拟环境创建失败:', error);
            throw new Error(`虚拟环境创建失败: ${error.error || error.message}`);
        }
    }

    /**
     * 检查BabelDOC是否已安装
     */
    async checkBabelDOCInstallation() {
        try {
            const result = await this.runCommand(this.pythonPath, ['-m', 'babeldoc', '--version']);
            if (result.success) {
                console.log('✅ BabelDOC已安装:', result.stdout.trim());
                this.babeldocInstalled = true;
                return true;
            }
        } catch (error) {
            // BabelDOC未安装
        }
        
        this.babeldocInstalled = false;
        return false;
    }

    /**
     * 安装BabelDOC
     */
    async installBabelDOC() {
        if (await this.checkBabelDOCInstallation()) {
            return true;
        }

        console.log('📦 安装BabelDOC...');
        
        try {
            // 先升级pip
            await this.runCommand(this.pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip']);
            
            // 安装BabelDOC
            const result = await this.runCommand(this.pythonPath, ['-m', 'pip', 'install', 'BabelDOC']);
            
            console.log('✅ BabelDOC安装成功');
            this.babeldocInstalled = true;
            return true;
        } catch (error) {
            console.error('❌ BabelDOC安装失败:', error);
            throw new Error(`BabelDOC安装失败: ${error.error || error.message}`);
        }
    }

    /**
     * 初始化Python环境
     */
    async initialize() {
        try {
            console.log('🚀 初始化BabelDOC Python环境...');
            
            // 1. 检查系统Python
            const pythonCommand = await this.checkSystemPython();
            if (!pythonCommand) {
                throw new Error('未找到Python 3。请安装Python 3.10或更高版本。');
            }

            // 2. 创建虚拟环境
            await this.createVirtualEnv(pythonCommand);

            // 3. 安装BabelDOC
            await this.installBabelDOC();

            console.log('🎉 BabelDOC环境初始化完成！');
            return true;
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 调用BabelDOC进行翻译
     */
    async translatePDF(options, progressCallback = null, errorCallback = null) {
        if (!this.babeldocInstalled) {
            throw new Error('BabelDOC未安装，请先初始化环境');
        }

        // 构建命令行参数
        const args = ['-m', 'babeldoc'];
        
        if (options.files) {
            args.push('--files', options.files);
        }
        if (options.output) {
            args.push('--output', options.output);
        }
        if (options.openaiApiKey) {
            args.push('--openai');
            args.push('--openai-api-key', options.openaiApiKey);
        }
        if (options.openaiModel) {
            args.push('--openai-model', options.openaiModel);
        }
        if (options.openaiBaseUrl) {
            args.push('--openai-base-url', options.openaiBaseUrl);
        }
        if (options.langIn) {
            args.push('--lang-in', options.langIn);
        }
        if (options.langOut) {
            args.push('--lang-out', options.langOut);
        }
        if (options.pages) {
            args.push('--pages', options.pages);
        }

        console.log('🔄 开始PDF翻译...');
        console.log('命令:', this.pythonPath, args.join(' '));

        return new Promise((resolve, reject) => {
            const babeldoc = spawn(this.pythonPath, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';

            babeldoc.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                
                // 简单的进度解析
                if (progressCallback) {
                    const progressMatch = output.match(/(\\d+)%/);
                    if (progressMatch) {
                        progressCallback(parseInt(progressMatch[1]));
                    }
                }
                
                console.log(`BabelDOC: ${output}`);
            });

            babeldoc.stderr.on('data', (data) => {
                const error = data.toString();
                stderr += error;
                
                if (errorCallback) {
                    errorCallback(error);
                }
                
                console.error(`BabelDOC Error: ${error}`);
            });

            babeldoc.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ PDF翻译完成');
                    resolve({
                        success: true,
                        code,
                        stdout,
                        stderr
                    });
                } else {
                    console.error(`❌ PDF翻译失败，退出码: ${code}`);
                    reject({
                        success: false,
                        code,
                        stdout,
                        stderr,
                        error: `BabelDOC exited with code ${code}`
                    });
                }
            });

            babeldoc.on('error', (error) => {
                console.error('❌ BabelDOC进程错误:', error);
                reject({
                    success: false,
                    error: error.message,
                    originalError: error
                });
            });
        });
    }

    /**
     * 获取BabelDOC版本信息
     */
    async getVersion() {
        if (!this.babeldocInstalled) {
            throw new Error('BabelDOC未安装');
        }

        try {
            const result = await this.runCommand(this.pythonPath, ['-m', 'babeldoc', '--version']);
            return result.stdout.trim();
        } catch (error) {
            throw new Error(`获取版本失败: ${error.error || error.message}`);
        }
    }

    /**
     * 检查环境状态
     */
    getStatus() {
        return {
            venvPath: this.venvPath,
            pythonPath: this.pythonPath,
            venvExists: fs.existsSync(this.venvPath),
            pythonExists: fs.existsSync(this.pythonPath),
            babeldocInstalled: this.babeldocInstalled
        };
    }
}

module.exports = PythonManager;
