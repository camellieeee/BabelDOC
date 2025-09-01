# BabelDOC 可执行文件构建指南

本指南说明如何将BabelDOC打包为独立的可执行文件，以便在Electron项目中使用。

## 🎯 目标

将BabelDOC Python项目打包成单个可执行文件，使得：
1. 用户无需安装Python环境
2. Electron项目可以通过spawn调用BabelDOC
3. 便于分发和部署

## 📋 前提条件

1. **Python环境**: Python 3.10-3.13
2. **虚拟环境**: 推荐使用虚拟环境进行构建
3. **系统要求**: 
   - Linux/macOS: 8GB+ RAM, 10GB+ 磁盘空间
   - Windows: 8GB+ RAM, 10GB+ 磁盘空间

## 🚀 快速开始

### 方法1: 使用自动化脚本（推荐）

#### Linux/macOS:
```bash
# 1. 进入项目目录
cd /path/to/BabelDOC

# 2. 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate

# 3. 运行构建脚本
./build.sh
```

#### Windows:
```cmd
# 1. 进入项目目录
cd C:\path\to\BabelDOC

# 2. 创建虚拟环境（推荐）
python -m venv venv
venv\Scripts\activate

# 3. 运行构建脚本
build.bat
```

### 方法2: 使用Python脚本

```bash
# 运行构建脚本
python build_executable.py
```

### 方法3: 手动构建

```bash
# 1. 安装构建依赖
pip install -r requirements_build.txt

# 2. 安装项目依赖
pip install -e .

# 3. 使用PyInstaller构建
pyinstaller pyinstaller_spec.py

# 4. 检查生成的可执行文件
ls -la dist/
```

## 📁 构建输出

成功构建后，您将得到：

```
dist/
├── babeldoc          # Linux/macOS可执行文件
├── babeldoc.exe      # Windows可执行文件
└── ...

electron_wrapper.js  # Electron调用包装器
```

## 🔧 在Electron中使用

### 1. 复制可执行文件

将生成的可执行文件复制到您的Electron项目中：

```
your-electron-project/
├── resources/
│   └── babeldoc      # 或 babeldoc.exe
├── src/
│   └── main.js
└── package.json
```

### 2. 使用包装器

```javascript
const BabelDocWrapper = require('./electron_wrapper');
const path = require('path');

// 初始化BabelDOC包装器
const babeldoc = new BabelDocWrapper(
    path.join(__dirname, 'resources', 'babeldoc')
);

// 翻译PDF
async function translatePDF() {
    try {
        const result = await babeldoc.translatePDF({
            inputFile: '/path/to/input.pdf',
            outputDir: '/path/to/output',
            langIn: 'en',
            langOut: 'zh',
            openaiApiKey: 'your-api-key',
            openaiModel: 'gpt-4o-mini'
        }, 
        (progress) => {
            console.log(`翻译进度: ${progress}%`);
        },
        (error) => {
            console.error('翻译错误:', error);
        });
        
        console.log('翻译完成:', result);
    } catch (error) {
        console.error('错误:', error);
    }
}
```

### 3. Electron打包配置

在您的`package.json`或打包配置中包含可执行文件：

```json
{
  "build": {
    "extraResources": [
      {
        "from": "resources/babeldoc",
        "to": "babeldoc"
      }
    ]
  }
}
```

## ⚙️ 高级配置

### 自定义PyInstaller配置

编辑 `pyinstaller_spec.py` 文件来自定义打包选项：

```python
# 添加额外的隐藏导入
hiddenimports=[
    'your_custom_module',
    # ...
],

# 包含额外的数据文件
datas=[
    ('/path/to/your/data', 'data'),
    # ...
],

# 排除不需要的模块
excludes=[
    'unnecessary_module',
    # ...
],
```

### 减小可执行文件体积

1. **启用UPX压缩**（如果可用）:
   ```python
   upx=True,  # 在pyinstaller_spec.py中
   ```

2. **排除不必要的依赖**:
   ```python
   excludes=[
       'matplotlib',
       'pandas',
       'jupyter',
       # 添加更多不需要的包
   ],
   ```

3. **使用--onedir模式**（如果单文件太大）:
   ```python
   # 修改pyinstaller_spec.py，使用COLLECT而不是单文件EXE
   ```

## 🐛 常见问题

### 1. 构建失败：缺少依赖

```bash
# 确保安装了所有依赖
pip install -r requirements_build.txt
pip install -e .
```

### 2. 可执行文件太大

- 检查是否包含了不必要的依赖
- 启用UPX压缩
- 考虑使用--onedir模式

### 3. 运行时错误：找不到模块

- 检查`hiddenimports`列表
- 确保所有必要的数据文件都被包含

### 4. OpenAI API调用失败

- 确保API密钥正确
- 检查网络连接
- 验证base URL设置

### 5. macOS权限问题

```bash
# 给可执行文件添加执行权限
chmod +x dist/babeldoc

# 如果遇到安全警告，可能需要在系统设置中允许
```

## 📊 性能优化

### 1. 多线程设置

```javascript
const result = await babeldoc.translatePDF({
    // ... 其他参数
    poolMaxWorkers: 4,  // 设置工作线程数
    qps: 4              // 设置QPS限制
});
```

### 2. 缓存配置

BabelDOC会自动使用缓存来避免重复翻译相同内容。

### 3. 内存优化

对于大文件，考虑使用分页翻译：

```javascript
const result = await babeldoc.translatePDF({
    // ... 其他参数
    maxPagesPerPart: 50,  // 每部分最大页数
    pages: '1-10'         // 只翻译特定页面
});
```

## 📝 开发建议

1. **版本管理**: 在可执行文件名中包含版本号
2. **错误处理**: 实现完善的错误处理和日志记录
3. **进度反馈**: 提供用户友好的进度显示
4. **配置管理**: 允许用户自定义翻译参数
5. **资源清理**: 确保临时文件得到正确清理

## 🔍 调试

### 启用调试模式

```javascript
const result = await babeldoc.translatePDF({
    // ... 其他参数
    debug: true  // 启用调试输出
});
```

### 查看日志

可执行文件的日志会输出到stdout/stderr，可以通过包装器捕获。

## 📞 支持

如果遇到问题：

1. 检查本文档的常见问题部分
2. 查看BabelDOC项目的GitHub Issues
3. 确保使用最新版本的BabelDOC

## 📄 许可证

本构建脚本遵循BabelDOC项目的AGPL-3.0许可证。
