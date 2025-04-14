import os
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import uuid

# 创建FastAPI应用
app = FastAPI(title="XNotes - 本地笔记应用")

# 设置静态文件目录和模板目录
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 数据模型
class NoteBase(BaseModel):
    title: str
    content: str
    folder_path: str

class NoteCreate(NoteBase):
    pass

class NoteUpdate(NoteBase):
    pass

class NoteResponse(NoteBase):
    id: str
    created_at: str
    updated_at: str
    file_path: str
    pinned: bool = False

class FolderBase(BaseModel):
    name: str
    parent_path: Optional[str] = None

class FolderCreate(FolderBase):
    pass

class FolderUpdate(BaseModel):
    name: str

class FolderResponse(FolderBase):
    id: str
    path: str
    created_at: str

class MoveItemRequest(BaseModel):
    source_path: str
    target_path: str

# 配置
NOTES_DIR = os.path.join(os.getcwd(), "notes")
UPLOADS_DIR = os.path.join(os.getcwd(), "static", "uploads")

# 确保目录存在
os.makedirs(NOTES_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# 工具函数
def get_file_id(file_path):
    """根据文件路径生成唯一ID"""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, file_path))

def get_file_extension(file_path):
    """获取文件扩展名"""
    return os.path.splitext(file_path)[1].lower()

def is_note_file(file_path):
    """判断文件是否为笔记文件"""
    extensions = ['.md', '.txt']
    return get_file_extension(file_path) in extensions

def get_file_created_time(file_path):
    """获取文件创建时间"""
    return datetime.fromtimestamp(os.path.getctime(file_path)).strftime('%Y-%m-%d %H:%M:%S')

def get_file_modified_time(file_path):
    """获取文件修改时间"""
    return datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S')

def create_note_response(file_path, relative_path):
    """创建笔记响应对象"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    title = os.path.basename(file_path)
    folder_path = os.path.dirname(relative_path)
    if folder_path.startswith('/'):
        folder_path = folder_path[1:]
    
    return NoteResponse(
        id=get_file_id(file_path),
        title=title,
        content=content,
        folder_path=folder_path,
        file_path=relative_path,
        created_at=get_file_created_time(file_path),
        updated_at=get_file_modified_time(file_path),
        pinned=False  # 暂不支持置顶功能
    )

def create_folder_response(folder_path, relative_path):
    """创建文件夹响应对象"""
    name = os.path.basename(folder_path)
    parent_path = os.path.dirname(relative_path)
    if parent_path.startswith('/'):
        parent_path = parent_path[1:]
    
    return FolderResponse(
        id=get_file_id(folder_path),
        name=name,
        parent_path=parent_path if parent_path else None,
        path=relative_path,
        created_at=get_file_created_time(folder_path)
    )

def scan_notes(directory=NOTES_DIR, prefix=""):
    """扫描目录中的所有笔记和文件夹"""
    notes = []
    folders = []
    
    # 确保目录存在
    if not os.path.exists(directory):
        os.makedirs(directory)
        
    for item in os.listdir(directory):
        item_path = os.path.join(directory, item)
        relative_path = os.path.join(prefix, item)
        
        if os.path.isdir(item_path):
            # 是文件夹
            folders.append(create_folder_response(item_path, relative_path))
            
            # 递归扫描子文件夹
            sub_notes, sub_folders = scan_notes(item_path, relative_path)
            notes.extend(sub_notes)
            folders.extend(sub_folders)
        elif os.path.isfile(item_path) and is_note_file(item_path):
            # 是笔记文件
            notes.append(create_note_response(item_path, relative_path))
    
    return notes, folders

# 路由
@app.get("/")
async def read_root(request: Request):
    """返回主页"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/notes")
async def get_notes():
    """获取所有笔记"""
    notes, _ = scan_notes()
    return {"notes": notes}

@app.get("/api/folders")
async def get_folders():
    """获取所有文件夹"""
    _, folders = scan_notes()
    return {"folders": folders}

@app.get("/api/notes/latest")
async def get_latest_notes(limit: int = 10):
    """获取最新的笔记"""
    notes, _ = scan_notes()
    # 按更新时间排序
    notes.sort(key=lambda x: x.updated_at, reverse=True)
    return {"notes": notes[:limit]}

@app.get("/api/notes/{note_id}")
async def get_note(note_id: str):
    """获取单个笔记内容"""
    notes, _ = scan_notes()
    for note in notes:
        if note.id == note_id:
            return note
    raise HTTPException(status_code=404, detail="笔记未找到")

@app.post("/api/notes")
async def create_note(note: NoteCreate):
    """创建新笔记"""
    # 确保文件夹路径存在
    folder_path = os.path.join(NOTES_DIR, note.folder_path)
    os.makedirs(folder_path, exist_ok=True)
    
    # 创建文件
    file_path = os.path.join(folder_path, note.title)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(note.content)
    
    # 构建相对路径
    relative_path = os.path.join(note.folder_path, note.title)
    
    # 返回创建的笔记
    return create_note_response(file_path, relative_path)

@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, note: NoteUpdate):
    """更新笔记内容"""
    notes, _ = scan_notes()
    
    # 查找笔记
    target_note = None
    for n in notes:
        if n.id == note_id:
            target_note = n
            break
    
    if not target_note:
        raise HTTPException(status_code=404, detail="笔记未找到")
    
    # 获取旧文件路径
    old_file_path = os.path.join(NOTES_DIR, target_note.file_path)
    
    # 计算新文件路径
    new_folder_path = os.path.join(NOTES_DIR, note.folder_path)
    new_file_path = os.path.join(new_folder_path, note.title)
    
    # 确保目标文件夹存在
    os.makedirs(new_folder_path, exist_ok=True)
    
    # 写入内容
    with open(old_file_path, 'w', encoding='utf-8') as f:
        f.write(note.content)
    
    # 如果文件名或文件夹发生变化，则移动文件
    if old_file_path != new_file_path:
        os.rename(old_file_path, new_file_path)
    
    # 构建相对路径
    relative_path = os.path.join(note.folder_path, note.title)
    
    # 返回更新后的笔记
    return create_note_response(new_file_path, relative_path)

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    """删除笔记"""
    notes, _ = scan_notes()
    
    # 查找笔记
    target_note = None
    for note in notes:
        if note.id == note_id:
            target_note = note
            break
    
    if not target_note:
        raise HTTPException(status_code=404, detail="笔记未找到")
    
    # 删除文件
    file_path = os.path.join(NOTES_DIR, target_note.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"success": True, "message": "笔记已删除"}
    
    raise HTTPException(status_code=404, detail="文件未找到")

@app.post("/api/folders")
async def create_folder(folder: FolderCreate):
    """创建新文件夹"""
    # 构建文件夹路径
    parent_path = folder.parent_path if folder.parent_path else ""
    folder_path = os.path.join(NOTES_DIR, parent_path, folder.name)
    
    # 检查文件夹是否已存在
    if os.path.exists(folder_path):
        raise HTTPException(status_code=400, detail="文件夹已存在")
    
    # 创建文件夹
    os.makedirs(folder_path, exist_ok=True)
    
    # 构建相对路径
    relative_path = os.path.join(parent_path, folder.name)
    
    # 返回创建的文件夹
    return create_folder_response(folder_path, relative_path)

@app.put("/api/folders/{folder_id}")
async def update_folder(folder_id: str, folder: FolderUpdate):
    """重命名文件夹"""
    _, folders = scan_notes()
    
    # 查找文件夹
    target_folder = None
    for f in folders:
        if f.id == folder_id:
            target_folder = f
            break
    
    if not target_folder:
        raise HTTPException(status_code=404, detail="文件夹未找到")
    
    # 获取旧文件夹路径
    old_folder_path = os.path.join(NOTES_DIR, target_folder.path)
    
    # 计算新文件夹路径
    parent_path = os.path.dirname(old_folder_path)
    new_folder_path = os.path.join(parent_path, folder.name)
    
    # 检查新文件夹是否已存在
    if os.path.exists(new_folder_path) and old_folder_path != new_folder_path:
        raise HTTPException(status_code=400, detail="目标文件夹已存在")
    
    # 重命名文件夹
    os.rename(old_folder_path, new_folder_path)
    
    # 构建相对路径
    parent_relative_path = os.path.dirname(target_folder.path)
    relative_path = os.path.join(parent_relative_path, folder.name)
    
    # 返回更新后的文件夹
    return create_folder_response(new_folder_path, relative_path)

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: str):
    """删除文件夹"""
    _, folders = scan_notes()
    
    # 查找文件夹
    target_folder = None
    for folder in folders:
        if folder.id == folder_id:
            target_folder = folder
            break
    
    if not target_folder:
        raise HTTPException(status_code=404, detail="文件夹未找到")
    
    # 删除文件夹
    folder_path = os.path.join(NOTES_DIR, target_folder.path)
    if os.path.exists(folder_path):
        shutil.rmtree(folder_path)
        return {"success": True, "message": "文件夹已删除"}
    
    raise HTTPException(status_code=404, detail="文件夹未找到")

@app.post("/api/move")
async def move_item(request: MoveItemRequest):
    """移动文件或文件夹"""
    source_path = os.path.join(NOTES_DIR, request.source_path)
    target_path = os.path.join(NOTES_DIR, request.target_path)
    
    # 检查源路径是否存在
    if not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail="源文件或文件夹未找到")
    
    # 确保目标文件夹存在
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    # 检查目标路径是否已存在
    if os.path.exists(target_path):
        raise HTTPException(status_code=400, detail="目标路径已存在同名文件或文件夹")
    
    # 移动文件或文件夹
    shutil.move(source_path, target_path)
    
    return {"success": True, "message": "移动成功"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(..., alias="editormd-image-file")):
    """上传文件"""
    # 生成文件保存路径
    filename = file.filename
    # 确保文件名唯一
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(UPLOADS_DIR, unique_filename)
    
    # 保存文件
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 构建访问URL
    url = f"/static/uploads/{unique_filename}"
    
    # 返回EditorMD所需的格式
    return {
        "success": 1,
        "message": "上传成功",
        "url": url,
        "filename": filename
    }

# 启动应用的入口点
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000) 