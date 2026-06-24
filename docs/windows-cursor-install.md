# Windows Cursor 安装和运行

如果你说“放到 Cursor 里面根本没办法用”，通常是因为只装了插件，但没有启动本地 server，或者没有编译打包。现在已经补了两个一键脚本。

## 1. 拉最新代码

```cmd
cd C:\Users\Administrator\Desktop\cursor-
git checkout feature/cursor-style-ai-worker
git pull
```

## 2. 启动本地 server

双击根目录：

```txt
run-server.cmd
```

或命令行：

```cmd
cd C:\Users\Administrator\Desktop\cursor-
run-server.cmd
```

看到这个才算 server 正常：

```txt
Server is running on http://localhost:9182/
```

## 3. 安装插件到 Cursor

双击根目录：

```txt
install-extension.cmd
```

它会：

```txt
npm install
npm run compile
npm run package
Cursor.exe --install-extension xxx.vsix
```

如果自动安装失败，就在 Cursor 里手动：

```txt
Extensions → ... → Install from VSIX
```

选择：

```txt
vscode-extension\cursor-style-ai-worker-0.1.0.vsix
```

## 4. 使用

重启 Cursor，然后左侧应该出现：

```txt
AI Worker
```

打开：

```txt
AI Worker → USER CENTER
```

先点：

```txt
Start Local Server
```

然后输入测试码：

```txt
DEV-TEST-ACTIVE-KEY
```

点：

```txt
Login
```

应该显示：

```txt
Membership Status: Active
```

## 5. 生成你自己的激活码

打开：

```txt
http://localhost:9182/admin
```

Admin Token 默认：

```txt
change-me-admin-token
```

生成后，把 AIW- 开头的激活码填到插件里。
