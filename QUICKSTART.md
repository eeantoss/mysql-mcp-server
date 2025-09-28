# 🚀 MySQL MCP 服务器快速入门

## 5 分钟快速配置

### 步骤 1: 准备环境
```bash
# 确保 Node.js 18+ 已安装
node --version

# 进入项目目录
cd mysql-mcp-server
```

### 步骤 2: 安装和编译
```bash
# 安装依赖
npm install

# 编译项目
npm run build
```

### 步骤 3: 配置数据库连接
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入您的数据库信息
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASSWORD=your_password
# MYSQL_DATABASE=your_database
```

### 步骤 4: 测试运行
```bash
# 测试 MCP 服务器
npm run test:build
```

## Claude Desktop 快速配置

### 1. 找到配置文件
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. 添加配置
复制 `claude_desktop_config.example.json` 的内容到您的配置文件中，并修改路径和数据库信息。

### 3. 重启 Claude Desktop
重启 Claude Desktop 应用程序以加载新配置。

## 使用示例

在 Claude Desktop 中，您可以这样使用：

**您**: "连接到我的数据库并显示所有表"

**Claude**: 我来帮您连接数据库并查看表结构...
*[自动调用 mysql_connect 和 mysql_get_schema 工具]*

**您**: "查询用户表中的前10条记录"

**Claude**: 我来执行查询...
*[自动调用 mysql_execute_sql 工具]*

## 常见问题

### Q: 连接失败怎么办？
A: 检查 MySQL 服务是否运行，验证用户名密码是否正确。

### Q: 如何连接 Docker 中的 MySQL？
A: 在环境变量中添加：
```
CONNECTION_TYPE=docker
DOCKER_CONTAINER_NAME=your_container_name
```

### Q: 支持哪些 SQL 操作？
A: 支持所有标准 SQL 操作：SELECT、INSERT、UPDATE、DELETE、CREATE、DROP 等。

## 下一步

- 查看 [完整使用指南](./USAGE.md)
- 阅读 [详细文档](./README.md)
- 查看 [工具参考](./README.md#mcp-工具列表)

---

🎉 **恭喜！您已成功配置 MySQL MCP 服务器！**
