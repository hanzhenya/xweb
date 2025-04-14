// 笔记应用主逻辑
document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const fileList = document.getElementById('fileList');
    const noteContent = document.getElementById('noteContent');
    const saveButton = document.getElementById('saveButton');
    const exportPdfButton = document.getElementById('exportPdfButton');
    const exportMdButton = document.getElementById('exportMdButton');
    const exportHtmlButton = document.getElementById('exportHtmlButton');
    const newNoteBtn = document.querySelector('.new-note-btn');
    const createMenu = document.getElementById('createMenu');
    const createOptions = document.querySelectorAll('.create-option');
    const currentFileName = document.getElementById('current-file-name');
    const folderContextMenu = document.getElementById('folderContextMenu');
    const noteContextMenu = document.getElementById('noteContextMenu');
    const newFolderMenuItem = document.getElementById('newFolder');
    const newNoteMenuItem = document.getElementById('newNote');
    const deleteFolderMenuItem = document.getElementById('deleteFolder');
    const renameFolderMenuItem = document.getElementById('renameFolder');
    const moveFolderMenuItem = document.getElementById('moveFolder');
    const deleteNoteMenuItem = document.getElementById('deleteNote');
    const moveNoteMenuItem = document.getElementById('moveNote');
    const latestNavItem = document.querySelector('.nav-item:first-child');
    const toastContainer = document.getElementById('toast-container');
    
    // 模态对话框元素
    const createFolderModal = document.getElementById('createFolderModal');
    const folderNameInput = document.getElementById('folderNameInput');
    const createFolderBtn = document.getElementById('createFolderBtn');
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    const closeFolderModalBtn = document.querySelector('#createFolderModal .close-btn');
    
    // 重命名对话框元素
    const renameFolderModal = document.getElementById('renameFolderModal');
    const newFolderNameInput = document.getElementById('newFolderNameInput');
    const confirmRenameBtn = document.getElementById('confirmRenameBtn');
    const cancelRenameBtn = document.getElementById('cancelRenameBtn');
    const closeRenameModalBtn = document.querySelector('#renameFolderModal .close-btn');
    
    // 删除确认对话框元素
    const deleteFolderModal = document.getElementById('deleteFolderModal');
    const deleteFolderMessage = document.getElementById('deleteFolderMessage');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const closeDeleteModalBtn = document.querySelector('#deleteFolderModal .close-btn');
    
    // 文件夹移动对话框元素
    const moveFolderModal = document.getElementById('moveFolderModal');
    const folderTreeContainer = document.getElementById('folderTreeContainer');
    const confirmMoveBtn = document.getElementById('confirmMoveBtn');
    const cancelMoveBtn = document.getElementById('cancelMoveBtn');
    const closeMoveFolderModalBtn = document.querySelector('#moveFolderModal .close-btn');
    
    // 笔记移动对话框元素
    const moveNoteModal = document.getElementById('moveNoteModal');
    const noteFolderTreeContainer = document.getElementById('noteFolderTreeContainer');
    const confirmMoveNoteBtn = document.getElementById('confirmMoveNoteBtn');
    const cancelMoveNoteBtn = document.getElementById('cancelMoveNoteBtn');
    const closeMoveNoteModalBtn = document.querySelector('#moveNoteModal .close-btn');

    // Editor.md编辑器实例
    let editor;

    // 状态变量
    let notes = [];
    let currentNoteId = null;
    let folders = [];
    let currentFolderId = null;
    let contextMenuTargetId = null;
    let noteContextMenuTargetId = null;
    let folderModalCallback = null;
    let isCreateMenuVisible = false;
    let isLatestMode = true; // 是否处于"最新"视图模式
    let selectedTargetFolderId = null; // 选择的目标文件夹ID（用于移动）
    let isLoadingNote = false; // 标记是否正在加载笔记，避免触发保存
    
    // 显示通知提示
    const showToast = (message, type = 'default') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        toast.innerHTML = `${icon}${message}`;
        toastContainer.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };
    
    // 初始化编辑器
    const initEditor = () => {
        editor = editormd("editor", {
            width: "100%",
            height: "100%",
            path: "/static/editor.md/lib/",
            theme: "default",
            previewTheme: "default",
            editorTheme: "default",
            markdown: "",
            codeFold: true,
            saveHTMLToTextarea: true,
            searchReplace: true,
            watch: true,  // 默认开启实时预览
            htmlDecode: "style,script,iframe",
            emoji: true,
            taskList: true,
            tocm: true,
            tex: true,
            flowChart: true,
            sequenceDiagram: true,
            // 图片上传设置
            imageUpload: true,
            imageFormats: ["jpg", "jpeg", "gif", "png", "bmp", "webp"],
            imageUploadURL: "/api/upload",
            // 文件上传配置
            fileUpload: true,
            fileUploadURL: "/api/upload",
            placeholder: "请输入Markdown内容...\n\n提示：文档第一行的标题将自动成为笔记的文件名\n例如：# 我的笔记标题",
            // 自定义工具栏
            toolbar: true,
            toolbarIcons: function() {
                return [
                    "undo", "redo", "|", 
                    "bold", "del", "italic", "quote", "ucwords", "uppercase", "lowercase", "|", 
                    "h1", "h2", "h3", "h4", "h5", "h6", "|", 
                    "list-ul", "list-ol", "hr", "|",
                    "link", "reference-link", "image","code", "preformatted-text", "code-block", "table", "datetime", "emoji", "html-entities", "file-upload", "pagebreak", "|",
                    "goto-line", "watch", "preview", "fullscreen", "clear", "search", "|",
                    "help", "info"
                ];
            },
            // 自定义工具栏图标
            toolbarIconsClass: {
                "file-upload": "fa-upload"
            },
            // 自定义工具栏按钮的事件
            toolbarHandlers: {
                "file-upload": function(cm, icon, cursor, selection) {
                    // 创建文件上传输入框
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '*/*'; // 接受所有文件类型
                    
                    // 监听文件选择事件
                    fileInput.addEventListener('change', async (e) => {
                        if (e.target.files.length === 0) return;
                        
                        const file = e.target.files[0];
                        const formData = new FormData();
                        formData.append('editormd-image-file', file);
                        
                        try {
                            // 显示上传中的提示
                            showToast('文件上传中...', 'default');
                            
                            // 发送上传请求
                            const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            });
                            
                            if (!response.ok) {
                                throw new Error('上传失败: ' + response.statusText);
                            }
                            
                            const result = await response.json();
                            
                            if (result.success === 1) {
                                // 文件上传成功，插入文件链接
                                const url = result.url;
                                const filename = result.filename;
                                const ext = filename.split('.').pop().toLowerCase();
                                
                                // 根据文件类型判断如何插入
                                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
                                    // 如果是图片，使用Markdown图片语法
                                    cm.replaceSelection(`![${filename}](${url})`);
                                } else {
                                    // 其他文件类型使用链接语法
                                    cm.replaceSelection(`[${filename}](${url})`);
                                }
                                
                                showToast('文件上传成功!', 'success');
                            } else {
                                showToast('文件上传失败: ' + result.message, 'error');
                            }
                        } catch (error) {
                            console.error('上传错误:', error);
                            showToast('文件上传出错: ' + error.message, 'error');
                        }
                    });
                    
                    // 触发文件选择对话框
                    fileInput.click();
                }
            },
            // 加载完成后的回调函数
            onload: function() {
                // 编辑器加载完成后的回调
                console.log('编辑器加载完成');
                
                // 当编辑器加载完成后，加载笔记但不自动创建新笔记
                if (notes.length > 0) {
                    selectNote(notes[0].id);
                } else {
                    // 没有笔记时显示空编辑器
                    editor.setMarkdown('');
                    currentFileName.textContent = '未命名文档.md';
                }
            },
            // 内容变化时的回调函数
            onchange: function() {
                // 只有不是加载笔记时才触发自动保存
                if (!isLoadingNote) {
                    // 检查笔记标题是否需要更新
                    updateNoteTitle();
                    autoSaveNote();
                }
            }
        });
    };
    
    // 自动保存笔记 (防抖处理)
    let saveTimeout = null;
    const autoSaveNote = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            // 静默保存 - 不显示通知但仍会更新文件名
            saveCurrentNote(false);
        }, 2000); // 2秒后自动保存
    };

    // 更新笔记标题（如果内容中的标题改变）
    const updateNoteTitle = () => {
        if (!currentNoteId) return;
        
        const content = editor.getMarkdown();
        const newTitle = extractTitleFromContent(content);
        
        // 获取当前笔记
        const note = notes.find(n => n.id === currentNoteId);
        if (!note) return;
        
        // 只有当标题不同时才更新显示
        if (note.title !== newTitle) {
            currentFileName.textContent = newTitle;
        }
    };
    
    // 导出为PDF
    const exportToPdf = () => {
        if (!currentNoteId) {
            showToast('请先选择或创建一个笔记', 'warning');
            return;
        }
        
        const note = notes.find(n => n.id === currentNoteId);
        if (!note) return;
        
        // 获取HTML内容
        const htmlContent = editor.getHTML();
        const title = note.title.replace(/\.md$/, '');
        
        try {
            // 创建一个临时iframe来呈现HTML内容
            const iframe = document.createElement('iframe');
            iframe.style.visibility = 'hidden';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            document.body.appendChild(iframe);
            
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            padding: 20px;
                            color: #333;
                        }
                        code {
                            background-color: #f5f5f5;
                            padding: 2px 4px;
                            border-radius: 3px;
                            font-family: monospace;
                        }
                        pre {
                            background-color: #f5f5f5;
                            padding: 10px;
                            border-radius: 5px;
                            overflow-x: auto;
                        }
                        a {
                            color: #4285f4;
                            text-decoration: none;
                        }
                        blockquote {
                            border-left: 4px solid #ddd;
                            padding-left: 16px;
                            margin-left: 0;
                            color: #666;
                        }
                        img {
                            max-width: 100%;
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                        }
                        table, th, td {
                            border: 1px solid #ddd;
                        }
                        th, td {
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #f5f5f5;
                        }
                    </style>
                </head>
                <body>${htmlContent}</body>
                </html>
            `);
            doc.close();
            
            // 使用window.print()打印为PDF
            setTimeout(() => {
                iframe.contentWindow.print();
                // 延迟移除iframe
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 500);
            
            showToast('正在准备导出PDF...', 'success');
        } catch (error) {
            console.error('导出PDF失败:', error);
            showToast('导出PDF失败: ' + error.message, 'error');
        }
    };
    
    // 导出为Markdown
    const exportToMarkdown = () => {
        if (!currentNoteId) {
            showToast('请先选择或创建一个笔记', 'warning');
            return;
        }
        
        try {
            const content = editor.getMarkdown();
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) return;
            
            // 创建Blob对象
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            
            // 创建下载链接
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = note.title;
            
            // 触发下载
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // 清理
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadLink.href);
            
            showToast('Markdown文件导出成功', 'success');
        } catch (error) {
            console.error('导出Markdown失败:', error);
            showToast('导出Markdown失败: ' + error.message, 'error');
        }
    };
    
    // 导出为HTML
    const exportToHtml = () => {
        if (!currentNoteId) {
            showToast('请先选择或创建一个笔记', 'warning');
            return;
        }
        
        try {
            const htmlContent = editor.getHTML();
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) return;
            
            const title = note.title.replace(/\.md$/, '');
            
            // 构建完整的HTML文档
            const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
            color: #333;
        }
        code {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        a {
            color: #4285f4;
            text-decoration: none;
        }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #666;
        }
        img {
            max-width: 100%;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th, td {
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
        }
    </style>
</head>
<body>
    <div class="content">
        ${htmlContent}
    </div>
</body>
</html>`;
            
            // 创建Blob对象
            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            
            // 创建下载链接
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = title + '.html';
            
            // 触发下载
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // 清理
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadLink.href);
            
            showToast('HTML文件导出成功', 'success');
        } catch (error) {
            console.error('导出HTML失败:', error);
            showToast('导出HTML失败: ' + error.message, 'error');
        }
    };

    // API 函数
    const fetchNotes = async () => {
        try {
            const response = await fetch('/api/notes');
            if (!response.ok) {
                throw new Error('获取笔记失败: ' + response.statusText);
            }
            const data = await response.json();
            notes = data.notes || [];
            return notes;
        } catch (error) {
            showToast('获取笔记失败: ' + error.message, 'error');
            return [];
        }
    };
    
    const fetchFolders = async () => {
        try {
            const response = await fetch('/api/folders');
            if (!response.ok) {
                throw new Error('获取文件夹失败: ' + response.statusText);
            }
            const data = await response.json();
            folders = data.folders || [];
            return folders;
        } catch (error) {
            showToast('获取文件夹失败: ' + error.message, 'error');
            return [];
        }
    };
    
    const fetchLatestNotes = async (limit = 10) => {
        try {
            const response = await fetch(`/api/notes/latest?limit=${limit}`);
            if (!response.ok) {
                throw new Error('获取最新笔记失败: ' + response.statusText);
            }
            const data = await response.json();
            return data.notes || [];
        } catch (error) {
            showToast('获取最新笔记失败: ' + error.message, 'error');
            return [];
        }
    };
    
    // 格式化日期
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    // 获取文件扩展名
    const getFileExtension = (filename) => {
        return filename.split('.').pop().toLowerCase();
    };

    // 根据文件名获取对应的图标
    const getFileIcon = (filename) => {
        const ext = getFileExtension(filename);
        const iconMap = {
            'md': 'fa-file-alt',
            'txt': 'fa-file-alt',
            'default': 'fa-file'
        };
        return iconMap[ext] || iconMap.default;
    };

    // 格式化文件大小
    const formatFileSize = (content) => {
        const bytes = new Blob([content]).size;
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
    };

    // 渲染文件列表
    const renderFileList = () => {
        fileList.innerHTML = '';
        
        // 渲染笔记列表
        const notesToRender = isLatestMode 
            ? notes 
            : notes.filter(note => {
                // 如果当前处于文件夹视图，则只显示当前文件夹下的笔记
                if (!currentFolderId) return false;
                
                // 根文件夹特殊处理
                if (currentFolderId === 'root') {
                    return note.folder_path === '' || note.folder_path === null;
                }
                
                const folder = folders.find(f => f.id === currentFolderId);
                if (!folder) return false;
                
                // 检查笔记是否属于当前文件夹
                return note.folder_path === folder.path;
            });
        
        // 按更新时间排序
        notesToRender.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        if (notesToRender.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '30px 15px';
            emptyMessage.innerHTML = `
                <i class="fas fa-folder-open" style="font-size: 3em; color: #ccc; margin-bottom: 15px;"></i>
                <p style="margin: 0; padding: 0 20px; color: #666; font-size: 16px;">${isLatestMode ? '还没有笔记，点击"新建"开始创建笔记吧！' : '该文件夹下没有笔记'}</p>
            `;
            fileList.appendChild(emptyMessage);
            return;
        }

        notesToRender.forEach(note => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.noteId = note.id;
            
            if (note.id === currentNoteId) {
                fileItem.classList.add('active');
            }
            
            // 计算文件大小
            const fileSize = formatFileSize(note.content);
            
            // 获取文件图标
            const fileIcon = getFileIcon(note.title);
            
            fileItem.innerHTML = `
                <div class="file-icon"><i class="fas ${fileIcon}"></i></div>
                <div class="file-info">
                    <div class="file-name">${note.title}</div>
                <div class="file-meta">
                        <span class="file-time">${formatDate(note.updated_at)}</span>
                        <span class="file-size">${fileSize}</span>
                    </div>
                </div>
            `;
            
            // 点击笔记条目
            fileItem.addEventListener('click', () => {
                selectNote(note.id);
            });
            
            // 右键菜单
            fileItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showNoteContextMenu(e, note.id);
            });
            
            fileList.appendChild(fileItem);
        });
    };

    // 渲染文件夹树
    const renderFolderTree = () => {
        const folderList = document.querySelector('.folder-list');
        folderList.innerHTML = '';
        
        // 根文件夹
        const rootFolder = {
            id: 'root',
            name: '我的文件夹',
            path: '',
            parent_path: null
        };
        
        // 构建文件夹树
        buildFolderTree(rootFolder, folderList);
    };
    
    // 构建文件夹树结构（递归）
    const buildFolderTree = (folder, parentElement) => {
                    const folderItem = document.createElement('li');
                    folderItem.className = 'folder-item';
        folderItem.dataset.folderId = folder.id;
                    
        // 构建文件夹标签
                    const folderLabel = document.createElement('div');
                    folderLabel.className = 'folder-label';
                    
        // 添加展开/折叠图标
                    const toggleIcon = document.createElement('i');
                    toggleIcon.className = 'fas fa-chevron-right folder-toggle';
        folderLabel.appendChild(toggleIcon);
                    
        // 添加文件夹图标
                    const folderIcon = document.createElement('i');
                    folderIcon.className = 'fas fa-folder';
        folderLabel.appendChild(folderIcon);
                    
        // 添加文件夹名称
                    const folderName = document.createElement('span');
                    folderName.textContent = folder.name;
                    folderLabel.appendChild(folderName);
        
                    folderItem.appendChild(folderLabel);
                    
        // 构建子文件夹容器
        const subFolderList = document.createElement('ul');
        subFolderList.className = 'subfolder-list';
        subFolderList.style.display = 'none';
        folderItem.appendChild(subFolderList);
        
        // 添加到父元素
        parentElement.appendChild(folderItem);
        
        // 单击选择文件夹
                    folderLabel.addEventListener('click', (e) => {
            if (e.target !== toggleIcon) {
                selectFolder(folder.id);
            }
        });
        
        // 双击文件夹修改显示状态
        folderLabel.addEventListener('dblclick', () => {
                        toggleFolder(folder.id);
                    });
                    
        // 点击展开/折叠图标
        toggleIcon.addEventListener('click', () => {
            toggleFolder(folder.id);
        });
        
        // 右键菜单
        folderLabel.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, folder.id);
        });
        
        // 递归添加子文件夹
        const childFolders = folders.filter(f => {
            if (folder.id === 'root') {
                return !f.parent_path || f.parent_path === '';
            } else {
                return f.parent_path === folder.path;
            }
        });
        
        if (childFolders.length > 0) {
            childFolders.forEach(childFolder => {
                buildFolderTree(childFolder, subFolderList);
            });
        } else {
            // 如果没有子文件夹，隐藏展开/折叠图标
            toggleIcon.style.visibility = 'hidden';
        }
    };

    // 切换文件夹展开/折叠状态
    const toggleFolder = (folderId) => {
        const folderItem = document.querySelector(`.folder-item[data-folder-id="${folderId}"]`);
        if (!folderItem) return;
        
        const subfolderList = folderItem.querySelector('.subfolder-list');
        const toggleIcon = folderItem.querySelector('.folder-toggle');
        const folderIcon = folderItem.querySelector('.fa-folder, .fa-folder-open');
        
        if (subfolderList.style.display === 'none') {
            // 展开
            subfolderList.style.display = 'block';
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-down');
                    folderIcon.classList.remove('fa-folder');
                    folderIcon.classList.add('fa-folder-open');
                } else {
            // 折叠
            subfolderList.style.display = 'none';
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-right');
                    folderIcon.classList.remove('fa-folder-open');
                    folderIcon.classList.add('fa-folder');
        }
    };

    // 显示文件夹右键菜单
    const showContextMenu = (e, folderId) => {
        e.preventDefault();
        
        // 设置目标文件夹ID
        contextMenuTargetId = folderId;
        
        // 定位菜单
        const rect = e.target.getBoundingClientRect();
        folderContextMenu.style.left = `${e.clientX}px`;
        folderContextMenu.style.top = `${e.clientY}px`;
        
        // 显示菜单
        folderContextMenu.style.display = 'block';
        
        // 点击其他区域关闭菜单
        document.addEventListener('click', closeContextMenu);
    };
    
    // 关闭文件夹右键菜单
    const closeContextMenu = () => {
        folderContextMenu.style.display = 'none';
        document.removeEventListener('click', closeContextMenu);
    };
    
    // 切换创建菜单显示状态
    const toggleCreateMenu = () => {
        if (isCreateMenuVisible) {
            closeCreateMenu();
        } else {
            createMenu.style.display = 'block';
            isCreateMenuVisible = true;
            document.addEventListener('click', (e) => {
                if (!newNoteBtn.contains(e.target) && !createMenu.contains(e.target)) {
                    closeCreateMenu();
                }
            });
        }
    };
    
    // 关闭创建菜单
    const closeCreateMenu = () => {
        createMenu.style.display = 'none';
        isCreateMenuVisible = false;
    };
    
    // 显示创建文件夹对话框
    const showCreateFolderModal = (callback) => {
        folderNameInput.value = '';
        createFolderModal.style.display = 'flex';
        folderNameInput.focus();
        folderModalCallback = callback;
    };
    
    // 关闭创建文件夹对话框
    const closeCreateFolderModal = () => {
        createFolderModal.style.display = 'none';
        folderModalCallback = null;
    };
    
    // 从对话框创建文件夹
    const createFolderFromModal = () => {
        const folderName = folderNameInput.value.trim();
        if (folderName) {
            if (folderModalCallback) {
            folderModalCallback(folderName);
        }
        closeCreateFolderModal();
                } else {
            showToast('文件夹名称不能为空', 'warning');
        }
    };

    // 选择笔记
    const selectNote = async (id) => {
        if (currentNoteId === id) return;
        
        isLoadingNote = true;
        
        try {
            const response = await fetch(`/api/notes/${id}`);
            if (!response.ok) throw new Error('获取笔记失败');
            
            const note = await response.json();
            
            // 设置当前笔记ID
            currentNoteId = id;
            
            // 更新编辑器内容
            editor.setMarkdown(note.content);
            
            // 更新文件名显示
            currentFileName.textContent = note.title;
            
            // 更新文件列表选中状态
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const selectedItem = document.querySelector(`.file-item[data-note-id="${id}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
                // 滚动到可见区域
                selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            // 检查文件名是否与内容提取的标题一致
            const extractedTitle = extractTitleFromContent(note.content);
            if (note.title !== extractedTitle && note.content.trim() !== '') {
                // 如果内容非空且文件名与提取的标题不一致，显示提示
                const confirmRename = confirm(`笔记标题与内容不一致，是否更新标题为 "${extractedTitle}"？`);
                if (confirmRename) {
                    // 立即保存笔记以更新标题
                    saveCurrentNote(true);
                }
            }
        } catch (error) {
            console.error('选择笔记失败:', error);
            showToast('加载笔记失败', 'error');
        } finally {
                    isLoadingNote = false;
        }
    };
    
    // 选择文件夹
    const selectFolder = (id) => {
        // 如果是当前文件夹，则不做操作
        if (currentFolderId === id && !isLatestMode) return;
        
        // 设置当前文件夹ID
        currentFolderId = id;
        isLatestMode = false;
        
        // 更新文件夹列表选中状态
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`.folder-item[data-folder-id="${id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // 更新导航菜单选中状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 更新文件列表标题
        const folder = folders.find(f => f.id === id) || { name: '未知文件夹' };
        document.querySelector('.file-list-title').textContent = folder.name;
        
        // 重新渲染文件列表
        renderFileList();
    };

    // 切换到"最新"视图
    const showLatestNotes = async () => {
        // 如果已经是最新模式，则不执行
        if (isLatestMode) return;
        
        isLatestMode = true;
        currentFolderId = null;
        
        // 更新导航菜单选中状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        latestNavItem.classList.add('active');
        
        // 更新文件夹列表选中状态
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 更新文件列表标题
        document.querySelector('.file-list-title').textContent = '最新笔记';
        
        try {
            // 获取最新的笔记
            const latestNotes = await fetchLatestNotes();
                    
                    // 更新notes数组中对应的笔记内容，但不改变顺序
                    latestNotes.forEach(note => {
                        const index = notes.findIndex(n => n.id === note.id);
                        if (index !== -1) {
                            notes[index] = note;
                        } else {
                            notes.push(note);
                        }
                    });
                    
                    renderFileList();
        } catch (error) {
            console.error('获取最新笔记出错:', error);
        }
    };

    // 从Markdown内容中提取标题
    const extractTitleFromContent = (content) => {
        // 尝试匹配第一个Markdown标题（支持一至六级标题）
        const headingMatch = content.match(/^(#+)\s+(.+)$/m);
        if (headingMatch && headingMatch[2]) {
            return headingMatch[2].trim().substring(0, 50) + '.md';
        }
        
        // 如果没有Markdown标题，尝试获取第一行非空文本
        const firstLineMatch = content.match(/^(.+)$/m);
        if (firstLineMatch && firstLineMatch[1]) {
            // 如果文本行太长或包含特殊字符，就只取一部分
            const firstLine = firstLineMatch[1].trim();
            // 过滤掉文件名不支持的字符
            const sanitizedTitle = firstLine
                .replace(/[\\/:*?"<>|]/g, '')  // 去除Windows文件名不支持的字符
                .substring(0, 50); // 限制长度
            
            return sanitizedTitle + '.md';
        }
        
        // 默认返回时间戳文件名
        const now = new Date();
        const timestamp = now.getTime();
        return `笔记_${timestamp}.md`;
    };

    // 创建新笔记
    const createNewNote = async (folderId = null) => {
        // 确定文件夹路径
        let folderPath = '';
        
        if (folderId) {
            const folder = folders.find(f => f.id === folderId);
            if (folder) {
                folderPath = folder.path;
            }
        }
        
        // 获取当前时间格式化字符串
        const now = new Date();
        const dateStr = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(/[\/\s:]/g, ''); // 移除日期中的斜杠、空格和冒号
        
        // 创建默认内容
        const defaultContent = `# 新笔记 ${dateStr}\n\n开始编写你的笔记吧...\n\n> 提示：第一行的标题文本将自动成为笔记的文件名`;
        
        // 从内容中提取标题
        const title = extractTitleFromContent(defaultContent);
        
        try {
            // 发送创建请求
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    content: defaultContent,
                    folder_path: folderPath
                })
            });
            
            if (!response.ok) {
                throw new Error(`创建笔记失败: ${response.statusText}`);
            }
            
                const result = await response.json();
            
            // 添加到本地数组
            notes.unshift(result);
            selectNote(result.id);
                    renderFileList();
            
            showToast('新笔记创建成功', 'success');
            
            // 焦点到编辑器并选中标题
            setTimeout(() => {
                editor.focus();
                const cmEditor = editor.cm;
                if (cmEditor) {
                    // 选中第一行标题
                    const titleEndPos = defaultContent.indexOf('\n');
                    if (titleEndPos > 0) {
                        cmEditor.setSelection({line: 0, ch: 2}, {line: 0, ch: titleEndPos});
                    }
                }
            }, 300);
        } catch (error) {
            console.error('创建笔记失败:', error);
            showToast(`创建笔记失败: ${error.message}`, 'error');
        }
    };
    
    // 创建新文件夹
    const createNewFolder = async (parentFolderId = null, folderName = null) => {
        // 如果没有提供文件夹名称，则弹出对话框
        if (!folderName) {
            showCreateFolderModal((name) => {
                createNewFolder(parentFolderId, name);
            });
            return;
        }
        
        // 确定父文件夹路径
        let parentPath = '';
        
        if (parentFolderId) {
            const parentFolder = folders.find(f => f.id === parentFolderId);
            if (parentFolder) {
                parentPath = parentFolder.path;
            }
        }
        
        try {
            // 发送创建请求
                const response = await fetch('/api/folders', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json'
                    },
                body: JSON.stringify({
                    name: folderName,
                    parent_path: parentPath
                })
                });
                
            if (!response.ok) {
                throw new Error(`创建文件夹失败: ${response.statusText}`);
            }
            
                    const result = await response.json();
            
            // 添加到本地数组
            folders.push(result);
                        renderFolderTree();
                        
            // 如果是在当前文件夹中创建的，则刷新文件列表
            if (parentFolderId === currentFolderId) {
                renderFileList();
            }
            
            showToast(`文件夹 "${folderName}" 创建成功`, 'success');
            } catch (error) {
            console.error('创建文件夹失败:', error);
            showToast(`创建文件夹失败: ${error.message}`, 'error');
            }
    };

    // 保存当前笔记
    const saveCurrentNote = async (showNotification = true) => {
        if (!currentNoteId) return;
        
        // 获取当前笔记
        const note = notes.find(n => n.id === currentNoteId);
        if (!note) return;
        
        // 获取编辑器内容
        const content = editor.getMarkdown();
        
        // 如果内容没有变化，则不保存
        if (note.content === content) {
            if (showNotification) {
                showToast('内容未变更，无需保存', 'default');
            }
            return;
            }
            
        // 从内容中提取标题
        const title = extractTitleFromContent(content);
        
        try {
            // 发送更新请求
            const response = await fetch(`/api/notes/${currentNoteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    folder_path: note.folder_path
                })
            });
            
            if (!response.ok) {
                throw new Error(`保存笔记失败: ${response.statusText}`);
            }
            
                const result = await response.json();
            
            // 更新本地数据
                    const noteIndex = notes.findIndex(n => n.id === currentNoteId);
                    if (noteIndex !== -1) {
                const oldTitle = notes[noteIndex].title;
                notes[noteIndex] = result;
                
                // 更新UI显示的文件名
                currentFileName.textContent = result.title;
                
                // 如果标题发生变化，显示额外提示
                if (oldTitle !== result.title) {
                    showToast(`笔记标题已更新为: ${result.title}`, 'success');
                }
            }
            
            // 更新文件列表（主要是更新时间和文件大小）
                    renderFileList();
                    
                    if (showNotification) {
                showToast('笔记已保存到本地文件系统', 'success');
            }
        } catch (error) {
            console.error('保存笔记失败:', error);
            if (showNotification) {
                showToast(`保存笔记失败: ${error.message}`, 'error');
            }
        }
    };

    // 显示笔记右键菜单
    const showNoteContextMenu = (e, noteId) => {
        e.preventDefault();
        
        // 设置目标笔记ID
        noteContextMenuTargetId = noteId;
        
        // 定位菜单
        noteContextMenu.style.left = `${e.clientX}px`;
        noteContextMenu.style.top = `${e.clientY}px`;
        
        // 显示菜单
        noteContextMenu.style.display = 'block';
        
        // 点击其他区域关闭菜单
        document.addEventListener('click', closeNoteContextMenu);
    };
    
    // 关闭笔记右键菜单
    const closeNoteContextMenu = () => {
        noteContextMenu.style.display = 'none';
        document.removeEventListener('click', closeNoteContextMenu);
    };

    // 删除笔记
    const deleteNote = async (id) => {
            try {
            // 发送删除请求
                const response = await fetch(`/api/notes/${id}`, {
                    method: 'DELETE'
                });
                
            if (!response.ok) {
                throw new Error(`删除笔记失败: ${response.statusText}`);
            }
            
                    const result = await response.json();
            
                    if (result.success) {
                // 从本地数据中移除笔记
                notes = notes.filter(note => note.id !== id);
                        
                // 如果删除的是当前笔记，则清空编辑器
                        if (currentNoteId === id) {
                    currentNoteId = null;
                                editor.setMarkdown('');
                                currentFileName.textContent = '未命名文档.md';
                        }
                        
                // 更新UI
                        renderFileList();
                
                showToast('笔记已删除', 'success');
                    } else {
                throw new Error(result.message || '删除失败');
                }
            } catch (error) {
            console.error('删除笔记失败:', error);
            showToast(`删除笔记失败: ${error.message}`, 'error');
        }
    };

    // 显示笔记移动对话框
    const showMoveNoteModal = () => {
        // 获取当前笔记
        const currentNote = notes.find(n => n.id === noteContextMenuTargetId);
        if (!currentNote) return;
        
        // 渲染文件夹树
        renderNoteFolderTree_forModal();
        
        // 显示对话框
        moveNoteModal.style.display = 'flex';
        
        // 重置选中状态
        selectedTargetFolderId = null;
    };
    
    // 关闭笔记移动对话框
    const closeMoveNoteModal = () => {
        moveNoteModal.style.display = 'none';
        selectedTargetFolderId = null;
    };
    
    // 为笔记移动对话框渲染文件夹树
    const renderNoteFolderTree_forModal = (currentFolderId) => {
        noteFolderTreeContainer.innerHTML = '';
        
        // 筛选出可作为目标的文件夹
        const availableFolders = [{ id: 'root', name: '根目录', path: '' }]
            .concat(folders);
        
        // 构建文件夹树
        availableFolders.sort((a, b) => {
            if (a.id === 'root') return -1;
            if (b.id === 'root') return 1;
            return a.path.localeCompare(b.path);
        }).forEach(folder => {
            const level = folder.path.split('/').length - (folder.path === '' ? 1 : 0);
            noteFolderTreeContainer.appendChild(buildFolderTreeItem(folder, level));
        });
    };
    
    // 移动笔记
    const moveNote = async () => {
        if (!selectedTargetFolderId) {
            showToast('请选择目标文件夹', 'warning');
            return;
        }
        
        const sourceNote = notes.find(n => n.id === noteContextMenuTargetId);
        if (!sourceNote) {
            showToast('源笔记不存在', 'error');
            closeMoveNoteModal();
            return;
        }
        
        // 获取目标文件夹
        let targetFolder;
        if (selectedTargetFolderId === 'root') {
            targetFolder = { id: 'root', path: '' };
                } else {
            targetFolder = folders.find(f => f.id === selectedTargetFolderId);
            if (!targetFolder) {
                showToast('目标文件夹不存在', 'error');
                closeMoveNoteModal();
                return;
            }
        }
        
        // 构建源路径和目标路径
        const sourcePath = sourceNote.file_path;
        const targetPath = targetFolder.path ? 
            `${targetFolder.path}/${sourceNote.title}` : 
            sourceNote.title;
        
        try {
            // 发送移动请求
            const response = await fetch('/api/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_path: sourcePath,
                    target_path: targetPath
                })
            });
            
            if (!response.ok) {
                throw new Error(`移动失败: ${response.statusText}`);
            }
            
                const result = await response.json();
            
                if (result.success) {
                // 更新本地数据
                const noteIndex = notes.findIndex(note => note.id === noteContextMenuTargetId);
                if (noteIndex !== -1) {
                    // 更新笔记的文件夹路径
                    notes[noteIndex].folder_path = targetFolder.path;
                    notes[noteIndex].file_path = targetPath;
                }
                
                // 更新UI
                    renderFileList();
                
                showToast('笔记移动成功', 'success');
                closeMoveNoteModal();
                } else {
                throw new Error(result.message || '移动失败');
            }
        } catch (error) {
            console.error('移动笔记失败:', error);
            showToast(`移动笔记失败: ${error.message}`, 'error');
        }
    };

    // 显示重命名文件夹对话框
    const showRenameFolderModal = () => {
        // 获取当前文件夹名称
        const folder = folders.find(f => f.id === contextMenuTargetId);
        if (!folder) return;
        
        newFolderNameInput.value = folder.name;
        renameFolderModal.style.display = 'flex';
        newFolderNameInput.focus();
        newFolderNameInput.select();
    };
    
    // 关闭重命名文件夹对话框
    const closeRenameFolderModal = () => {
        renameFolderModal.style.display = 'none';
    };
    
    // 重命名文件夹
    const renameFolder = async () => {
        const newName = newFolderNameInput.value.trim();
        if (!newName) {
            showToast('文件夹名称不能为空', 'warning');
            return;
        }
        
        // 获取当前文件夹
        const folder = folders.find(f => f.id === contextMenuTargetId);
        if (!folder) return;
        
        // 检查是否与其他同级文件夹重名
        const parentPath = folder.parent_path || '';
        const sameLevelFolders = folders.filter(f => f.parent_path === parentPath && f.id !== folder.id);
        
        if (sameLevelFolders.some(f => f.name === newName)) {
            showToast('该目录下已存在同名文件夹', 'error');
            return;
        }
        
        try {
            // 发送重命名请求
            const response = await fetch(`/api/folders/${contextMenuTargetId}`, {
                method: 'PUT',
                    headers: {
                    'Content-Type': 'application/json'
                    },
                body: JSON.stringify({
                    name: newName
                })
                });
                
            if (!response.ok) {
                throw new Error(`重命名失败: ${response.statusText}`);
            }
            
                    const result = await response.json();
            
            // 更新本地数据
            const folderIndex = folders.findIndex(f => f.id === contextMenuTargetId);
            if (folderIndex !== -1) {
                folders[folderIndex] = result;
            }
            
            // 更新UI
            renderFolderTree();
            showToast('文件夹重命名成功', 'success');
            
            // 关闭对话框
            closeRenameFolderModal();
            } catch (error) {
            console.error('重命名文件夹失败:', error);
            showToast(`重命名文件夹失败: ${error.message}`, 'error');
        }
    };
    
    // 显示删除文件夹确认对话框
    const showDeleteFolderModal = () => {
        const folder = folders.find(f => f.id === contextMenuTargetId);
        if (!folder) return;
        
        deleteFolderMessage.textContent = `确定要删除文件夹 "${folder.name}" 及其所有内容吗？此操作不可撤销。`;
        deleteFolderModal.style.display = 'flex';
    };
    
    // 关闭删除文件夹确认对话框
    const closeDeleteFolderModal = () => {
        deleteFolderModal.style.display = 'none';
    };
    
    // 删除文件夹
    const deleteFolder = async () => {
        // 获取当前文件夹
        const folder = folders.find(f => f.id === contextMenuTargetId);
        if (!folder) {
            closeDeleteFolderModal();
            return;
        }
        
        try {
            // 发送删除请求
            const response = await fetch(`/api/folders/${contextMenuTargetId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`删除失败: ${response.statusText}`);
            }
            
                const result = await response.json();
            
                if (result.success) {
                // 从本地数据中移除文件夹
                const deletedFolderPath = folder.path;
                // 移除被删除的文件夹及其所有子文件夹
                folders = folders.filter(f => !f.path.startsWith(deletedFolderPath + '/') && f.id !== contextMenuTargetId);
                
                // 移除这个文件夹中的所有笔记
                notes = notes.filter(note => !note.folder_path.startsWith(deletedFolderPath));
                
                // 如果删除的是当前选中的文件夹，则切换到根目录
                if (currentFolderId === contextMenuTargetId) {
                    currentFolderId = 'root';
                    isLatestMode = false;
                    // 更新文件列表标题
                    document.querySelector('.file-list-title').textContent = '我的文件夹';
                }
                
                // 更新UI
                renderFolderTree();
                    renderFileList();
                    
                showToast(`文件夹 "${folder.name}" 已从本地系统中删除`, 'success');
                } else {
                throw new Error(result.message || '删除失败');
            }
            
            // 关闭对话框
            closeDeleteFolderModal();
        } catch (error) {
            console.error('删除文件夹失败:', error);
            showToast(`删除文件夹失败: ${error.message}`, 'error');
            closeDeleteFolderModal();
        }
    };
    
    // 显示移动文件夹对话框
    const showMoveFolderModal = () => {
        // 获取当前文件夹
        const currentFolder = folders.find(f => f.id === contextMenuTargetId);
        if (!currentFolder) return;
        
        // 渲染文件夹树
        renderFolderTree_forModal();
        
        // 显示对话框
        moveFolderModal.style.display = 'flex';
        
        // 重置选中状态
        selectedTargetFolderId = null;
    };
    
    // 关闭移动文件夹对话框
    const closeMoveFolderModal = () => {
        moveFolderModal.style.display = 'none';
        selectedTargetFolderId = null;
    };
    
    // 移动文件夹
    const moveFolder = async () => {
        if (!selectedTargetFolderId) {
            showToast('请选择目标文件夹', 'warning');
            return;
        }
        
        const sourceFolder = folders.find(f => f.id === contextMenuTargetId);
        if (!sourceFolder) {
            showToast('源文件夹不存在', 'error');
            closeMoveFolderModal();
            return;
        }
        
        // 获取目标文件夹
        let targetFolder;
        if (selectedTargetFolderId === 'root') {
            targetFolder = { id: 'root', path: '' };
        } else {
            targetFolder = folders.find(f => f.id === selectedTargetFolderId);
            if (!targetFolder) {
                showToast('目标文件夹不存在', 'error');
                closeMoveFolderModal();
                return;
            }
        }
        
        // 如果目标文件夹是自己或子文件夹，则不允许移动
        if (targetFolder.id === sourceFolder.id || 
            (targetFolder.path && targetFolder.path.startsWith(sourceFolder.path + '/'))) {
            showToast('不能将文件夹移动到其自身或子文件夹中', 'error');
            return;
        }
        
        // 构建源路径和目标路径
        const sourcePath = sourceFolder.path;
        const targetPath = targetFolder.path ? 
            `${targetFolder.path}/${sourceFolder.name}` : 
            sourceFolder.name;
        
        try {
            // 发送移动请求
            const response = await fetch('/api/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_path: sourcePath,
                    target_path: targetPath
                })
            });
            
            if (!response.ok) {
                throw new Error(`移动失败: ${response.statusText}`);
            }
            
                const result = await response.json();
            
                if (result.success) {
                // 更新本地数据 - 需要重新获取文件夹结构
                await fetchFolders();
                
                // 更新UI
                renderFolderTree();
                
                showToast('文件夹移动成功', 'success');
                closeMoveFolderModal();
                } else {
                throw new Error(result.message || '移动失败');
            }
        } catch (error) {
            console.error('移动文件夹失败:', error);
            showToast(`移动文件夹失败: ${error.message}`, 'error');
        }
    };
    
    // 为移动对话框渲染文件夹树
    const renderFolderTree_forModal = () => {
        folderTreeContainer.innerHTML = '';
        
        // 获取源文件夹及其所有子文件夹的ID
        const sourceFolderId = contextMenuTargetId;
        const childFolderIds = getAllChildFolderIds(sourceFolderId);
        childFolderIds.push(sourceFolderId);
        
        // 筛选出可作为目标的文件夹（排除自己和子文件夹）
        const availableFolders = [{ id: 'root', name: '根目录', path: '' }]
            .concat(folders.filter(f => !childFolderIds.includes(f.id)));
        
        // 构建文件夹树
        availableFolders.sort((a, b) => {
            if (a.id === 'root') return -1;
            if (b.id === 'root') return 1;
            return a.path.localeCompare(b.path);
        }).forEach(folder => {
            const level = folder.path.split('/').length - (folder.path === '' ? 1 : 0);
            folderTreeContainer.appendChild(buildFolderTreeItem(folder, level));
        });
    };
    
    // 构建文件夹树项目
    const buildFolderTreeItem = (folder, level = 0) => {
        const treeItem = document.createElement('div');
        treeItem.className = 'folder-tree-item';
        treeItem.dataset.folderId = folder.id;
        treeItem.dataset.path = folder.path;
        
        // 缩进
        treeItem.style.paddingLeft = `${level * 20}px`;
        
        // 图标
        const iconSpan = document.createElement('span');
        iconSpan.className = 'folder-icon';
        iconSpan.innerHTML = '<i class="fas fa-folder"></i>';
        treeItem.appendChild(iconSpan);
            
            // 文件夹名称
        const nameSpan = document.createElement('span');
        nameSpan.className = 'folder-name';
        nameSpan.textContent = folder.name;
        treeItem.appendChild(nameSpan);
        
        // 点击事件
        treeItem.addEventListener('click', () => {
            // 移除所有已选中项的选中状态
            document.querySelectorAll('.folder-tree-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            
            // 添加选中状态
            treeItem.classList.add('selected');
            
            // 设置选中的目标文件夹ID
                    selectedTargetFolderId = folder.id;
                });
        
        return treeItem;
    };
    
    // 获取文件夹的所有子文件夹ID
    const getAllChildFolderIds = (folderId) => {
        const result = [];
        const folder = folders.find(f => f.id === folderId);
        
        if (!folder) return result;
        
        const folderPath = folder.path;
        
        // 查找所有路径以该文件夹路径开头的文件夹
        folders.forEach(f => {
            if (f.id !== folderId && f.path.startsWith(folderPath + '/')) {
                result.push(f.id);
            }
        });
        
        return result;
    };

    // 处理创建选项点击
    const handleCreateOptionClick = (optionType) => {
        closeCreateMenu();
        
        switch (optionType) {
            case 'blank':
            case 'markdown':
                // 创建新笔记
                createNewNote(currentFolderId);
                break;
            case 'folder':
                // 创建新文件夹
                showCreateFolderModal((folderName) => {
                    createNewFolder(currentFolderId, folderName);
                });
                break;
            default:
                break;
        }
    };

    // 初始化
    const init = async () => {
        try {
            // 加载数据
            await Promise.all([
                fetchNotes(),
                fetchFolders()
            ]);
            
            // 初始化编辑器
            initEditor();
            
            // 渲染文件夹树和文件列表
            renderFolderTree();
            renderFileList();
            
            // 展开根文件夹（我的文件夹）
            setTimeout(() => {
                const rootFolder = document.querySelector('.folder-item[data-folder-id="root"]');
                if (rootFolder) {
                    const toggleIcon = rootFolder.querySelector('.folder-toggle');
                    const folderIcon = rootFolder.querySelector('.fa-folder');
                    const subfolderList = rootFolder.querySelector('.subfolder-list');
                    
                    if (toggleIcon && folderIcon && subfolderList) {
                        // 展开
                        subfolderList.style.display = 'block';
                        toggleIcon.classList.remove('fa-chevron-right');
                        toggleIcon.classList.add('fa-chevron-down');
                        folderIcon.classList.remove('fa-folder');
                        folderIcon.classList.add('fa-folder-open');
                    }
                }
            }, 100);
        } catch (error) {
            console.error('初始化失败:', error);
            showToast('初始化失败，请刷新页面重试', 'error');
        }
    };
    
    // 事件绑定
    const bindEvents = () => {
        // 新建按钮点击
        newNoteBtn.addEventListener('click', toggleCreateMenu);
        
        // 创建选项点击
    createOptions.forEach(option => {
        option.addEventListener('click', () => {
                handleCreateOptionClick(option.dataset.type);
        });
    });
    
        // 保存按钮点击
        saveButton.addEventListener('click', () => saveCurrentNote(true));
        
        // 导出按钮点击
        exportPdfButton.addEventListener('click', exportToPdf);
        exportMdButton.addEventListener('click', exportToMarkdown);
        exportHtmlButton.addEventListener('click', exportToHtml);
        
        // 最新导航项点击
        latestNavItem.addEventListener('click', showLatestNotes);
        
        // 文件夹右键菜单项点击
    newFolderMenuItem.addEventListener('click', () => {
        closeContextMenu();
            showCreateFolderModal((folderName) => {
                createNewFolder(contextMenuTargetId, folderName);
            });
    });
    
    newNoteMenuItem.addEventListener('click', () => {
        closeContextMenu();
            createNewNote(contextMenuTargetId);
    });
    
    renameFolderMenuItem.addEventListener('click', () => {
        closeContextMenu();
            showRenameFolderModal();
    });
    
    moveFolderMenuItem.addEventListener('click', () => {
            closeContextMenu();
        showMoveFolderModal();
        });
        
        deleteFolderMenuItem.addEventListener('click', () => {
        closeContextMenu();
            showDeleteFolderModal();
        });
        
        // 文件夹模态框按钮点击
        createFolderBtn.addEventListener('click', createFolderFromModal);
        cancelFolderBtn.addEventListener('click', closeCreateFolderModal);
        closeFolderModalBtn.addEventListener('click', closeCreateFolderModal);
        
        // 重命名模态框按钮点击
        confirmRenameBtn.addEventListener('click', renameFolder);
        cancelRenameBtn.addEventListener('click', closeRenameFolderModal);
        closeRenameModalBtn.addEventListener('click', closeRenameFolderModal);
        
        // 删除确认模态框按钮点击
        confirmDeleteBtn.addEventListener('click', deleteFolder);
        cancelDeleteBtn.addEventListener('click', closeDeleteFolderModal);
        closeDeleteModalBtn.addEventListener('click', closeDeleteFolderModal);
        
        // 文件夹移动模态框按钮点击
        confirmMoveBtn.addEventListener('click', moveFolder);
        cancelMoveBtn.addEventListener('click', closeMoveFolderModal);
        closeMoveFolderModalBtn.addEventListener('click', closeMoveFolderModal);
        
        // 笔记右键菜单项点击
    deleteNoteMenuItem.addEventListener('click', () => {
        closeNoteContextMenu();
            deleteNote(noteContextMenuTargetId);
    });
    
    moveNoteMenuItem.addEventListener('click', () => {
        closeNoteContextMenu();
            showMoveNoteModal();
        });
        
        // 笔记移动模态框按钮点击
    confirmMoveNoteBtn.addEventListener('click', moveNote);
    cancelMoveNoteBtn.addEventListener('click', closeMoveNoteModal);
    closeMoveNoteModalBtn.addEventListener('click', closeMoveNoteModal);
        
        // 按键事件
    document.addEventListener('keydown', (e) => {
            // Ctrl+S 保存当前笔记
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
                saveCurrentNote(true);
            }
        });
        
        // 创建文件夹模态框回车键提交
        folderNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                createFolderFromModal();
            }
        });
        
        // 重命名文件夹模态框回车键提交
        newFolderNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                renameFolder();
            }
        });
    };
    
    // 初始化应用
    init();
    bindEvents();
}); 