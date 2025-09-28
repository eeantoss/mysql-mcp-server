# MySQL MCP 服务器使用指南

本文档详细说明如何在不同环境中配置和使用 MySQL MCP 服务器。

## 目录
- [快速开始](#快速开始)
- [Claude Desktop 集成](#claude-desktop-集成)
- [VS Code MCP 集成](#vs-code-mcp-集成)
- [命令行测试](#命令行测试)
- [工具使用示例](#工具使用示例)
- [故障排除](#故障排除)

## 快速开始

### 1. 环境准备

确保您的系统已安装：
- Node.js 18+ 
- npm 或 yarn
- MySQL 服务器（本地、Docker 或远程）

### 2. 项目设置

```bash
# 1. 克隆或下载项目
cd mysql-mcp-server

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的 MySQL 连接信息

# 4. 编译项目
npm run build

# 5. 测试启动
npm start
```

### 3. 环境变量配置

编辑 `.env` 文件：

```env
# 基本连接配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database

# 连接池配置（可选）
CONNECTION_LIMIT=10
ACQUIRE_TIMEOUT=60000
TIMEOUT=60000

# 调试模式（可选）
DEBUG=false
```

## Claude Desktop 集成

### 配置步骤

1. **找到 Claude Desktop 配置文件**：
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **添加 MCP 服务器配置**：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["C:\\Users\\26811\\CascadeProjects\\mysql-mcp-server\\build\\index.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database"
      }
    }
  }
}
```

### 使用 npm start 方式（推荐）

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npm",
      "args": ["start"],
      "cwd": "C:\\Users\\26811\\CascadeProjects\\mysql-mcp-server",
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306", 
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database"
      }
    }
  }
}
```

### Docker 连接配置

如果您的 MySQL 运行在 Docker 中：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npm",
      "args": ["start"],
      "cwd": "C:\\Users\\26811\\CascadeProjects\\mysql-mcp-server",
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root", 
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database",
        "CONNECTION_TYPE": "docker",
        "DOCKER_CONTAINER_NAME": "mysql_container"
      }
    }
  }
}
```

## VS Code MCP 集成

### 安装 MCP 扩展

1. 在 VS Code 中安装 "Model Context Protocol" 扩展
2. 创建或编辑 `.vscode/mcp.json` 文件：

```json
{
  "servers": {
    "mysql": {
      "type": "stdio",
      "command": "npm",
      "args": ["start"],
      "cwd": "C:\\Users\\26811\\CascadeProjects\\mysql-mcp-server",
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password", 
        "MYSQL_DATABASE": "your_database"
      }
    }
  }
}
```

## 命令行测试

### 使用 MCP Inspector

1. **安装 MCP Inspector**：
```bash
npm install -g @modelcontextprotocol/inspector
```

2. **启动 Inspector**：
```bash
mcp-inspector npm start
```

3. **在浏览器中测试**：
   - 打开 http://localhost:5173
   - 测试各种工具调用

### 直接命令行测试

```bash
# 启动服务器
npm start

# 服务器会在 stdio 模式下运行，等待 MCP 协议消息
```

## 工具使用示例

### 1. 连接数据库

```json
{
  "tool": "mysql_connect",
  "arguments": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "your_password",
    "database": "testdb",
    "connectionType": "direct"
  }
}
```

### 2. 执行查询

```json
{
  "tool": "mysql_execute_sql", 
  "arguments": {
    "sql": "SELECT * FROM users WHERE age > ?",
    "params": ["25"]
  }
}
```

### 3. 执行脚本文件

```json
{
  "tool": "mysql_execute_script",
  "arguments": {
    "scriptPath": "C:\\path\\to\\your\\script.sql"
  }
}
```

### 4. 批量执行 SQL

```json
{
  "tool": "mysql_execute_batch",
  "arguments": {
    "sqlScript": "CREATE TABLE test (id INT PRIMARY KEY, name VARCHAR(50)); INSERT INTO test VALUES (1, 'Alice'), (2, 'Bob');"
  }
}
```

### 5. 获取数据库结构

```json
{
  "tool": "mysql_get_schema",
  "arguments": {
    "databaseName": "testdb"
  }
}
```

### 6. 测试连接

```json
{
  "tool": "mysql_test_connection",
  "arguments": {}
}
```

### 7. 断开连接

```json
{
  "tool": "mysql_disconnect", 
  "arguments": {}
}
```

## 在 Claude Desktop 中的实际使用

一旦配置完成，您可以在 Claude Desktop 中这样使用：

### 示例对话

**您**: "帮我连接到数据库并查看所有表"

**Claude**: 我来帮您连接数据库并查看表结构。

*[Claude 会自动调用 mysql_connect 工具]*
*[然后调用 mysql_get_schema 工具]*

**您**: "查询 users 表中年龄大于 25 的用户"

**Claude**: 我来执行这个查询。

*[Claude 会调用 mysql_execute_sql 工具]*

### 智能体可以做什么

- 🔍 **数据探索**: 自动查看表结构、数据分布
- 📊 **数据分析**: 执行复杂查询、生成统计报告  
- 🛠️ **数据库管理**: 创建表、索引、执行维护脚本
- 📝 **脚本执行**: 运行 SQL 脚本文件、批量操作
- 🔧 **故障诊断**: 检查连接、分析性能问题

## 故障排除

### 常见问题

#### 1. 连接失败

**错误**: "连接池初始化失败"

**解决方案**:
- 检查 MySQL 服务是否运行
- 验证连接参数（主机、端口、用户名、密码）
- 检查防火墙设置
- 确认 MySQL 用户权限

#### 2. 权限错误

**错误**: "Access denied for user"

**解决方案**:
```sql
-- 创建用户并授权
CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON your_database.* TO 'mcp_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. Docker 连接问题

**错误**: "Connection refused"

**解决方案**:
```bash
# 检查 Docker 容器状态
docker ps

# 检查端口映射
docker port mysql_container

# 确保端口映射正确
docker run -p 3306:3306 mysql:8.0
```

#### 4. Node.js 版本问题

**错误**: "Unsupported engine"

**解决方案**:
```bash
# 检查 Node.js 版本
node --version

# 升级到 Node.js 18+
# Windows: 下载安装包
# macOS: brew install node
# Linux: 使用包管理器或 nvm
```

### 调试模式

启用调试模式查看详细日志：

```env
DEBUG=true
```

或在启动时设置：

```bash
DEBUG=true npm start
```

### 日志分析

查看详细的连接和查询日志：

```bash
# 启动时会显示：
# MySQL 连接池初始化成功 (direct)
# MySQL MCP 服务器已启动
```

## 高级配置

### 连接池优化

```env
# 连接池配置
CONNECTION_LIMIT=20          # 最大连接数
ACQUIRE_TIMEOUT=30000        # 获取连接超时（毫秒）
TIMEOUT=60000               # 查询超时（毫秒）
```

### SSL 连接

```env
# SSL 配置
MYSQL_SSL=true
# 或者使用证书文件
MYSQL_SSL_CA=/path/to/ca.pem
MYSQL_SSL_CERT=/path/to/cert.pem
MYSQL_SSL_KEY=/path/to/key.pem
```

### 多数据库支持

您可以配置多个 MCP 服务器实例连接不同的数据库：

```json
{
  "mcpServers": {
    "mysql-prod": {
      "command": "npm",
      "args": ["start"],
      "cwd": "C:\\path\\to\\mysql-mcp-server",
      "env": {
        "MYSQL_HOST": "prod.mysql.com",
        "MYSQL_DATABASE": "production"
      }
    },
    "mysql-dev": {
      "command": "npm", 
      "args": ["start"],
      "cwd": "C:\\path\\to\\mysql-mcp-server",
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_DATABASE": "development"
      }
    }
  }
}
```

## 性能优化建议

1. **连接池配置**: 根据并发需求调整连接池大小
2. **查询优化**: 使用参数化查询，避免 SQL 注入
3. **批量操作**: 对于大量数据操作，使用批量执行
4. **索引优化**: 通过 schema 查询了解索引使用情况
5. **监控日志**: 启用调试模式监控性能瓶颈

---

**需要帮助？** 请查看项目的 [README.md](./README.md) 或提交 Issue。
