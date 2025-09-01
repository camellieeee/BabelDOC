/**
 * Electron 使用 BabelDOC 的完整示例
 * 
 * 这个示例展示了如何在Electron应用中集成BabelDOC可执行文件
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 引入BabelDOC包装器
const BabelDocWrapper = require('./electron_wrapper');

class BabelDocElectronApp {
    constructor() {
        this.mainWindow = null;
        this.babeldoc = null;
        this.initializeBabelDoc();
    }

    initializeBabelDoc() {
        try {
            // 根据平台确定可执行文件路径
            let executableName = 'babeldoc';
            if (process.platform === 'win32') {
                executableName = 'babeldoc.exe';
            }
            
            // 在开发环境中
            let executablePath = path.join(__dirname, 'dist', executableName);
            
            // 在打包后的应用中
            if (app.isPackaged) {
                executablePath = path.join(process.resourcesPath, executableName);
            }
            
            // 检查可执行文件是否存在
            if (!fs.existsSync(executablePath)) {
                throw new Error(`BabelDOC executable not found: ${executablePath}`);
            }
            
            this.babeldoc = new BabelDocWrapper(executablePath);
            console.log('✅ BabelDOC initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize BabelDOC:', error);
            this.showErrorDialog('初始化失败', `无法初始化BabelDOC: ${error.message}`);
        }
    }

    async createWindow() {
        // 创建主窗口
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });

        // 加载HTML文件
        await this.mainWindow.loadFile('index.html');

        // 开发环境下打开DevTools
        if (!app.isPackaged) {
            this.mainWindow.webContents.openDevTools();
        }
    }

    setupIpcHandlers() {
        // 处理文件选择
        ipcMain.handle('select-pdf-file', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'PDF Files', extensions: ['pdf'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
            return null;
        });

        // 处理输出目录选择
        ipcMain.handle('select-output-directory', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory']
            });

            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
            return null;
        });

        // 处理PDF翻译
        ipcMain.handle('translate-pdf', async (event, options) => {
            if (!this.babeldoc) {
                throw new Error('BabelDOC not initialized');
            }

            try {
                console.log('🚀 开始翻译PDF:', options.inputFile);

                const result = await this.babeldoc.translatePDF(
                    {
                        inputFile: options.inputFile,
                        outputDir: options.outputDir,
                        langIn: options.langIn || 'en',
                        langOut: options.langOut || 'zh',
                        openaiApiKey: options.apiKey,
                        openaiModel: options.model || 'gpt-4o-mini',
                        openaiBaseUrl: options.baseUrl
                    },
                    // 进度回调
                    (progress) => {
                        console.log(`翻译进度: ${progress}%`);
                        this.mainWindow.webContents.send('translation-progress', progress);
                    },
                    // 错误回调
                    (error) => {
                        console.error('翻译错误:', error);
                        this.mainWindow.webContents.send('translation-error', error);
                    }
                );

                console.log('✅ 翻译完成:', result);
                return result;

            } catch (error) {
                console.error('❌ 翻译失败:', error);
                throw error;
            }
        });

        // 检查BabelDOC版本
        ipcMain.handle('get-babeldoc-version', async () => {
            if (!this.babeldoc) {
                throw new Error('BabelDOC not initialized');
            }

            try {
                const version = await this.babeldoc.getVersion();
                return version;
            } catch (error) {
                console.error('获取版本失败:', error);
                throw error;
            }
        });
    }

    showErrorDialog(title, content) {
        if (this.mainWindow) {
            dialog.showErrorBox(title, content);
        }
    }

    async initialize() {
        // 等待Electron准备就绪
        await app.whenReady();

        // 创建窗口
        await this.createWindow();

        // 设置IPC处理器
        this.setupIpcHandlers();

        // 处理所有窗口关闭
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // macOS特定处理
        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await this.createWindow();
            }
        });
    }
}

// preload.js 内容（需要单独创建文件）
const preloadScript = `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectPdfFile: () => ipcRenderer.invoke('select-pdf-file'),
    selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
    translatePdf: (options) => ipcRenderer.invoke('translate-pdf', options),
    getBabelDocVersion: () => ipcRenderer.invoke('get-babeldoc-version'),
    
    // 监听事件
    onTranslationProgress: (callback) => {
        ipcRenderer.on('translation-progress', (event, progress) => callback(progress));
    },
    onTranslationError: (callback) => {
        ipcRenderer.on('translation-error', (event, error) => callback(error));
    }
});
`;

// index.html 内容示例
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BabelDOC Electron Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select, button {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button {
            background-color: #007cba;
            color: white;
            cursor: pointer;
        }
        button:hover {
            background-color: #005a8b;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .progress {
            width: 100%;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-bar {
            height: 100%;
            background-color: #007cba;
            width: 0%;
            transition: width 0.3s ease;
        }
        .status {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <h1>🌍 BabelDOC PDF 翻译工具</h1>
    
    <div class="form-group">
        <label>输入PDF文件:</label>
        <input type="text" id="inputFile" readonly placeholder="点击选择PDF文件">
        <button onclick="selectInputFile()">选择PDF文件</button>
    </div>
    
    <div class="form-group">
        <label>输出目录:</label>
        <input type="text" id="outputDir" readonly placeholder="点击选择输出目录">
        <button onclick="selectOutputDir()">选择输出目录</button>
    </div>
    
    <div class="form-group">
        <label>源语言:</label>
        <select id="langIn">
            <option value="en">英语</option>
            <option value="zh">中文</option>
            <option value="ja">日语</option>
            <option value="ko">韩语</option>
        </select>
    </div>
    
    <div class="form-group">
        <label>目标语言:</label>
        <select id="langOut">
            <option value="zh">中文</option>
            <option value="en">英语</option>
            <option value="ja">日语</option>
            <option value="ko">韩语</option>
        </select>
    </div>
    
    <div class="form-group">
        <label>OpenAI API Key:</label>
        <input type="password" id="apiKey" placeholder="输入您的OpenAI API Key">
    </div>
    
    <div class="form-group">
        <label>模型:</label>
        <select id="model">
            <option value="gpt-4o-mini">GPT-4O Mini</option>
            <option value="gpt-4o">GPT-4O</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        </select>
    </div>
    
    <div class="form-group">
        <label>API Base URL (可选):</label>
        <input type="text" id="baseUrl" placeholder="https://api.openai.com/v1">
    </div>
    
    <button onclick="startTranslation()" id="translateBtn">开始翻译</button>
    
    <div class="progress" style="display: none;" id="progressContainer">
        <div class="progress-bar" id="progressBar"></div>
    </div>
    
    <div id="status"></div>
    
    <div style="margin-top: 30px;">
        <button onclick="checkVersion()">检查BabelDOC版本</button>
    </div>

    <script>
        let isTranslating = false;

        async function selectInputFile() {
            const filePath = await window.electronAPI.selectPdfFile();
            if (filePath) {
                document.getElementById('inputFile').value = filePath;
            }
        }

        async function selectOutputDir() {
            const dirPath = await window.electronAPI.selectOutputDirectory();
            if (dirPath) {
                document.getElementById('outputDir').value = dirPath;
            }
        }

        async function startTranslation() {
            if (isTranslating) return;

            const inputFile = document.getElementById('inputFile').value;
            const outputDir = document.getElementById('outputDir').value;
            const apiKey = document.getElementById('apiKey').value;

            if (!inputFile || !outputDir || !apiKey) {
                showStatus('请填写所有必需字段', 'error');
                return;
            }

            isTranslating = true;
            document.getElementById('translateBtn').disabled = true;
            document.getElementById('translateBtn').textContent = '翻译中...';
            document.getElementById('progressContainer').style.display = 'block';
            
            try {
                const options = {
                    inputFile,
                    outputDir,
                    langIn: document.getElementById('langIn').value,
                    langOut: document.getElementById('langOut').value,
                    apiKey,
                    model: document.getElementById('model').value,
                    baseUrl: document.getElementById('baseUrl').value || undefined
                };

                const result = await window.electronAPI.translatePdf(options);
                showStatus('翻译完成！', 'success');
                
            } catch (error) {
                showStatus(\`翻译失败: \${error.message || error}\`, 'error');
            } finally {
                isTranslating = false;
                document.getElementById('translateBtn').disabled = false;
                document.getElementById('translateBtn').textContent = '开始翻译';
                document.getElementById('progressContainer').style.display = 'none';
            }
        }

        async function checkVersion() {
            try {
                const version = await window.electronAPI.getBabelDocVersion();
                showStatus(\`BabelDOC 版本: \${version}\`, 'success');
            } catch (error) {
                showStatus(\`获取版本失败: \${error.message}\`, 'error');
            }
        }

        function showStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = message;
            statusDiv.className = \`status \${type}\`;
        }

        // 监听翻译进度
        window.electronAPI.onTranslationProgress((progress) => {
            const progressBar = document.getElementById('progressBar');
            progressBar.style.width = progress + '%';
        });

        // 监听翻译错误
        window.electronAPI.onTranslationError((error) => {
            console.error('Translation error:', error);
        });
    </script>
</body>
</html>
`;

// 如果直接运行此文件，启动应用
if (require.main === module) {
    const babelDocApp = new BabelDocElectronApp();
    babelDocApp.initialize().catch(console.error);
    
    // 创建必要的文件
    const fs = require('fs');
    const path = require('path');
    
    // 创建 preload.js
    if (!fs.existsSync('preload.js')) {
        fs.writeFileSync('preload.js', preloadScript);
        console.log('✅ Created preload.js');
    }
    
    // 创建 index.html
    if (!fs.existsSync('index.html')) {
        fs.writeFileSync('index.html', htmlContent);
        console.log('✅ Created index.html');
    }
}

module.exports = BabelDocElectronApp;
