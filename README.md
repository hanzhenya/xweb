# XNotes - 本地文件系统笔记应用

XNotes是一个基于本地文件系统的笔记软件，使用FastAPI作为后端和原生JavaScript作为前端实现。所有的笔记和文件夹都直接保存在本地文件系统中，无需数据库支持。

## 功能特点

- 📝 基于Markdown的笔记编辑
- 🗂️ 支持文件夹组织笔记
- 🔍 实时预览Markdown内容
- 📊 支持图表、数学公式等高级功能
- 📤 文件和图片上传功能
- 📱 响应式设计，支持多种设备
- 💾 自动保存功能
- 🛠️ 文件和文件夹的移动、重命名、删除等操作

## 技术栈

- 后端: FastAPI (Python)
- 前端: 原生JavaScript + jQuery
- Markdown编辑器: Editor.md
- 图标: Font Awesome
- 样式: CSS自定义样式

## 安装与使用

### 系统要求

- Python 3.6+ (推荐Python 3.10+)
- 现代浏览器 (Chrome, Firefox, Edge等)

### 安装步骤

1. 克隆或下载项目到本地
2. 确保安装了Python 3.6+
3. 运行启动脚本:

```bash
python start.py
```

启动脚本会自动:
- 创建Python虚拟环境
- 安装所需依赖
- 启动应用
- 打开浏览器访问应用

### 手动启动

如果要手动启动应用，可以按照以下步骤:

1. 创建并激活虚拟环境:
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

2. 安装依赖:
```bash
pip install -r requirements.txt
```

3. 启动应用:
```bash
python main.py
```

4. 打开浏览器访问 http://127.0.0.1:8000

## 目录结构

```
xnotes/
│
├── main.py          # FastAPI主程序
├── start.py         # 启动脚本
├── requirements.txt # 依赖列表
├── README.md        # 项目说明
│
├── notes/           # 笔记文件存储目录
│
├── static/          # 静态资源
│   ├── css/         # 样式文件
│   ├── js/          # JavaScript文件
│   ├── uploads/     # 上传文件存储目录
│   ├── editor.md/   # Markdown编辑器
│   └── fontawesome/ # 图标
│
├── templates/       # HTML模板
│   └── index.html   # 主页
│
└── venv/            # Python虚拟环境
```

## 使用说明

- 点击左侧的"新建"按钮创建新笔记或文件夹
- 在左侧文件夹树中浏览和组织笔记
- 点击"最新"查看最近修改的笔记
- 右键点击文件夹或笔记可以进行更多操作
- 编辑器支持常见的Markdown语法和扩展功能

## 注意事项

- 所有数据都保存在本地文件系统，请定期备份`notes`目录
- 笔记文件默认使用UTF-8编码保存

## 授权协议

MIT License 