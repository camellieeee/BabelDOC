#!/usr/bin/env python3
"""
BabelDOC 构建测试脚本
用于测试可执行文件的基本功能
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

def test_executable(executable_path):
    """测试可执行文件的基本功能"""
    
    print(f"🧪 测试可执行文件: {executable_path}")
    
    if not Path(executable_path).exists():
        print(f"❌ 可执行文件不存在: {executable_path}")
        return False
    
    # 测试1: 版本信息
    print("📋 测试1: 检查版本信息...")
    try:
        result = subprocess.run([executable_path, '--version'], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"✅ 版本信息: {result.stdout.strip()}")
        else:
            print(f"⚠️ 版本检查警告: {result.stderr}")
    except Exception as e:
        print(f"❌ 版本检查失败: {e}")
        return False
    
    # 测试2: 帮助信息
    print("📋 测试2: 检查帮助信息...")
    try:
        result = subprocess.run([executable_path, '--help'], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print("✅ 帮助信息正常")
            # 检查关键参数是否存在
            help_text = result.stdout
            required_args = ['--files', '--openai', '--openai-api-key', '--lang-in', '--lang-out']
            missing_args = [arg for arg in required_args if arg not in help_text]
            if missing_args:
                print(f"⚠️ 缺少参数: {missing_args}")
            else:
                print("✅ 所有必要参数都存在")
        else:
            print(f"❌ 帮助信息失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ 帮助信息检查失败: {e}")
        return False
    
    # 测试3: 资源预热（可选）
    print("📋 测试3: 资源预热...")
    try:
        result = subprocess.run([executable_path, '--warmup'], 
                              capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print("✅ 资源预热成功")
        else:
            print(f"⚠️ 资源预热警告: {result.stderr}")
    except Exception as e:
        print(f"⚠️ 资源预热失败（这可能是正常的）: {e}")
    
    # 测试4: 错误处理
    print("📋 测试4: 错误处理...")
    try:
        # 故意传入无效参数
        result = subprocess.run([executable_path, '--invalid-arg'], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print("✅ 错误处理正常")
        else:
            print("⚠️ 错误处理可能有问题")
    except Exception as e:
        print(f"⚠️ 错误处理测试失败: {e}")
    
    print("🎉 基本功能测试完成！")
    return True

def test_electron_wrapper():
    """测试Electron包装器的语法正确性"""
    
    print("🧪 测试Electron包装器...")
    
    wrapper_path = Path(__file__).parent / "electron_wrapper.js"
    if not wrapper_path.exists():
        print(f"❌ Electron包装器不存在: {wrapper_path}")
        return False
    
    # 使用Node.js检查语法（如果可用）
    try:
        result = subprocess.run(['node', '--check', str(wrapper_path)], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Electron包装器语法正确")
        else:
            print(f"❌ Electron包装器语法错误: {result.stderr}")
            return False
    except FileNotFoundError:
        print("⚠️ 未找到Node.js，跳过语法检查")
    except Exception as e:
        print(f"⚠️ Electron包装器检查失败: {e}")
    
    return True

def main():
    """主测试函数"""
    
    print("🚀 开始BabelDOC构建测试...")
    
    project_root = Path(__file__).parent
    
    # 查找可执行文件
    executable_candidates = [
        project_root / "dist" / "babeldoc",
        project_root / "dist" / "babeldoc.exe"
    ]
    
    executable_path = None
    for candidate in executable_candidates:
        if candidate.exists():
            executable_path = candidate
            break
    
    if not executable_path:
        print("❌ 未找到可执行文件，请先运行构建脚本")
        print("💡 运行: python build_executable.py 或 ./build.sh")
        return False
    
    # 测试可执行文件
    success = test_executable(str(executable_path))
    
    # 测试Electron包装器
    wrapper_success = test_electron_wrapper()
    
    if success and wrapper_success:
        print("\n🎉 所有测试通过！")
        print(f"📁 可执行文件: {executable_path}")
        print(f"📏 文件大小: {executable_path.stat().st_size / (1024*1024):.1f} MB")
        print("\n📋 下一步:")
        print("1. 将可执行文件复制到您的Electron项目")
        print("2. 使用electron_wrapper.js调用BabelDOC")
        print("3. 配置Electron打包以包含可执行文件")
        return True
    else:
        print("\n❌ 部分测试失败，请检查构建过程")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
