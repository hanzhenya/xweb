import os
import sys
import subprocess
import webbrowser
from time import sleep

def check_venv():
    """检查虚拟环境是否存在并激活"""
    venv_dir = "venv"
    if not os.path.exists(venv_dir):
        print("虚拟环境不存在，正在创建...")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
            print("虚拟环境创建成功！")
        except subprocess.CalledProcessError:
            print("创建虚拟环境失败，请检查Python版本(需要Python 3.6+)")
            return False
    
    return True

def install_requirements():
    """安装依赖包"""
    print("正在安装依赖...")
    
    # 根据操作系统选择正确的虚拟环境路径
    if sys.platform.startswith('win'):
        pip_path = os.path.join("venv", "Scripts", "pip")
    else:
        pip_path = os.path.join("venv", "bin", "pip")
    
    try:
        subprocess.run([pip_path, "install", "-r", "requirements.txt"], check=True)
        print("依赖安装完成！")
        return True
    except subprocess.CalledProcessError:
        print("安装依赖失败，请检查网络连接或requirements.txt文件")
        return False

def start_app():
    """启动应用程序"""
    print("正在启动XNotes笔记应用...")
    
    # 创建必要的目录
    os.makedirs("notes", exist_ok=True)
    os.makedirs(os.path.join("static", "uploads"), exist_ok=True)
    
    # 根据操作系统选择正确的Python解释器路径
    if sys.platform.startswith('win'):
        python_path = os.path.join("venv", "Scripts", "python")
    else:
        python_path = os.path.join("venv", "bin", "python")
    
    # 启动应用
    try:
        # 创建一个新的进程运行应用
        process = subprocess.Popen([python_path, "main.py"])
        
        # 等待应用启动
        print("等待服务启动...")
        sleep(2)
        
        # 打开浏览器
        webbrowser.open("http://127.0.0.1:8000")
        print("XNotes已启动！请在浏览器中使用")
        print("按Ctrl+C停止应用")
        
        # 等待进程结束
        process.wait()
    except KeyboardInterrupt:
        print("\n正在停止应用...")
        process.terminate()
        print("应用已停止")
    except Exception as e:
        print(f"启动应用失败: {e}")

if __name__ == "__main__":
    if check_venv():
        if install_requirements():
            start_app() 