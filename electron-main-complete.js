/**
 * 完整的Electron主进程实现
 * 集成BabelDOC Python环境管理
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const PythonManager = require('./python-manager');

let mainWindow;
let pythonManager;
let isInitializing = false;

class BabelDocElectronApp {
    constructor() {
        this.setupApp();
    }

    setupApp() {
        // 应用准备就绪时创建窗口
        app.whenReady().then(async () => {
            await this.createWindow();
            await this.initializePythonEnvironment();
            this.setupMenu();
        });

        // 所有窗口关闭时退出应用（macOS除外）
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // macOS应用激活时重新创建窗口
        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await this.createWindow();
            }
        });
    }

    async createWindow() {
        // 创建主窗口
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: true
            },
            icon: path.join(__dirname, 'assets', 'icon.png'), // 如果有图标
            show: false // 先不显示，等加载完成后再显示
        });

        // 加载HTML文件
        await mainWindow.loadFile('index.html');

        // 窗口准备好后显示
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        });

        // 开发环境下打开DevTools
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }

        this.setupIpcHandlers();
    }

    async initializePythonEnvironment() {
        if (isInitializing) {
            return;
        }

        isInitializing = true;
        
        try {
            console.log('🚀 开始初始化Python环境...');
            
            // 向渲染进程发送初始化开始事件
            if (mainWindow) {
                mainWindow.webContents.send('python-init-start');
            }

            pythonManager = new PythonManager();
            await pythonManager.initialize();

            console.log('✅ Python环境初始化成功');
            
            // 向渲染进程发送初始化成功事件
            if (mainWindow) {
                mainWindow.webContents.send('python-init-success');
            }

        } catch (error) {
            console.error('❌ Python环境初始化失败:', error);
            
            // 向渲染进程发送初始化失败事件
            if (mainWindow) {
                mainWindow.webContents.send('python-init-error', error.message);
            }

            // 显示错误对话框
            dialog.showErrorBox(
                'Python环境初始化失败',
                `无法初始化BabelDOC环境:\\n\\n${error.message}\\n\\n请确保已安装Python 3.10或更高版本。`
            );
        } finally {
            isInitializing = false;
        }
    }

    setupIpcHandlers() {
        // 文件选择对话框
        ipcMain.handle('select-pdf-file', async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'PDF Files', extensions: ['pdf'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            return result.canceled ? null : result.filePaths[0];
        });

        // 目录选择对话框
        ipcMain.handle('select-output-directory', async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory', 'createDirectory']
            });

            return result.canceled ? null : result.filePaths[0];
        });

        // PDF翻译
        ipcMain.handle('translate-pdf', async (event, options) => {
            if (!pythonManager) {
                throw new Error('Python环境未初始化。请等待初始化完成或重启应用。');
            }

            try {
                console.log('🔄 开始PDF翻译:', options);

                const result = await pythonManager.translatePDF(
                    options,
                    // 进度回调
                    (progress) => {
                        mainWindow.webContents.send('translation-progress', progress);
                    },
                    // 错误回调
                    (error) => {
                        mainWindow.webContents.send('translation-error', error);
                    }
                );

                console.log('✅ PDF翻译完成');
                return result;

            } catch (error) {
                console.error('❌ PDF翻译失败:', error);
                throw error;
            }
        });

        // 获取BabelDOC版本
        ipcMain.handle('get-babeldoc-version', async () => {
            if (!pythonManager) {
                throw new Error('Python环境未初始化');
            }

            try {
                return await pythonManager.getVersion();
            } catch (error) {
                throw new Error(`获取版本失败: ${error.message}`);
            }
        });

        // 获取环境状态
        ipcMain.handle('get-python-status', async () => {
            if (!pythonManager) {
                return {
                    initialized: false,
                    error: 'Python环境未初始化'
                };
            }

            return {
                initialized: true,
                ...pythonManager.getStatus()
            };
        });

        // 重新初始化Python环境
        ipcMain.handle('reinitialize-python', async () => {
            await this.initializePythonEnvironment();
            return true;
        });

        // 打开输出目录
        ipcMain.handle('open-output-directory', async (event, dirPath) => {
            if (fs.existsSync(dirPath)) {
                const { shell } = require('electron');
                await shell.openPath(dirPath);
                return true;
            }
            return false;
        });

        // 保存翻译配置
        ipcMain.handle('save-config', async (event, config) => {
            try {
                const configPath = path.join(app.getPath('userData'), 'babeldoc-config.json');
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                return true;
            } catch (error) {
                console.error('保存配置失败:', error);
                return false;
            }
        });

        // 加载翻译配置
        ipcMain.handle('load-config', async () => {
            try {
                const configPath = path.join(app.getPath('userData'), 'babeldoc-config.json');
                if (fs.existsSync(configPath)) {
                    const config = fs.readFileSync(configPath, 'utf8');
                    return JSON.parse(config);
                }
                return null;
            } catch (error) {
                console.error('加载配置失败:', error);
                return null;
            }
        });
    }

    setupMenu() {
        const template = [
            {
                label: '文件',
                submenu: [
                    {
                        label: '选择PDF文件',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => {
                            mainWindow.webContents.send('menu-select-file');
                        }
                    },
                    {
                        label: '选择输出目录',
                        accelerator: 'CmdOrCtrl+Shift+O',
                        click: () => {
                            mainWindow.webContents.send('menu-select-output');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '退出',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: '翻译',
                submenu: [
                    {
                        label: '开始翻译',
                        accelerator: 'CmdOrCtrl+T',
                        click: () => {
                            mainWindow.webContents.send('menu-start-translation');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '检查Python环境',
                        click: () => {
                            mainWindow.webContents.send('menu-check-python');
                        }
                    },
                    {
                        label: '重新初始化环境',
                        click: async () => {
                            await this.initializePythonEnvironment();
                        }
                    }
                ]
            },
            {
                label: '帮助',
                submenu: [
                    {
                        label: '关于BabelDOC',
                        click: () => {
                            dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: '关于BabelDOC',
                                message: 'BabelDOC Desktop',
                                detail: 'PDF文档翻译工具\\n\\n基于BabelDOC Python库构建'
                            });
                        }
                    },
                    {
                        label: '检查版本',
                        click: async () => {
                            try {
                                if (pythonManager) {
                                    const version = await pythonManager.getVersion();
                                    dialog.showMessageBox(mainWindow, {
                                        type: 'info',
                                        title: '版本信息',
                                        message: version
                                    });
                                } else {
                                    dialog.showMessageBox(mainWindow, {
                                        type: 'warning',
                                        title: '版本信息',
                                        message: 'Python环境未初始化'
                                    });
                                }
                            } catch (error) {
                                dialog.showErrorBox('版本检查失败', error.message);
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '开发者工具',
                        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                        click: () => {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                ]
            }
        ];

        // macOS特殊处理
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }
}

// 启动应用
new BabelDocElectronApp();

// 导出给其他模块使用
module.exports = { mainWindow, pythonManager };
