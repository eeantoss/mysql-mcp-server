# MySQL MCP 服务器

一个基于 Model Context Protocol (MCP) 的 MySQL 数据库操作服务器，支持跨平台使用，可以通过 MCP 协议执行 SQL 语句、脚本和数据库管理操作。

## TL;DR（精简版）

- **项目诉求（一句话）**：面向多项目多环境的智能 MySQL 管理，通过 MCP 无需本地 mysql 客户端即可执行 SQL/脚本与环境切换。

- **安装（两选一）**
  - 本机开发：`npm run build && npm link`
  - 全局安装（Git）：`npm i -g git+https://github.com/eeantoss/mysql-mcp-server.git`

- **Windsurf/Claude MCP 最小配置**
  ```json
  { "mcpServers": { "mysql": { "command": "mysql-mcp-server.cmd", "env": { "DEBUG": "false" } } } }
  ```

- **三大典型场景（即贴即用）**
  - 本地未安装 MySQL 客户端（仍可执行 SQL）
    ```json
    { "tool": "mysql_connect", "arguments": {"host":"localhost","port":3306,"user":"root","password":"pwd","database":"test"} }
    ```
    ```sql
    SELECT 1 AS ok;  -- 校验
    SHOW TABLES;     -- 列出表
    ```
  - 数据库在 Docker 容器中
    ```json
    { "tool": "mysql_connect", "arguments": {"connectionType":"docker","containerName":"mysql_container","user":"root","password":"pwd","database":"test"} }
    ```
  - 数据库在远程 IP（如 1.1.1.2:3306）
    ```json
    { "tool": "mysql_connect", "arguments": {"host":"1.1.1.2","port":3306,"user":"root","password":"pwd","database":"prod"} }
    ```

> 更多功能/演示：见下方“文档导航”。

## 📚 文档导航

- 🚀 **[快速入门](./QUICKSTART.md)** - 5分钟快速配置指南
- 📖 **[详细使用指南](./USAGE.md)** - 完整的配置和使用说明
- 🌍 **[多项目多环境指南](./MULTI_PROJECT_GUIDE.md)** - 智能项目检测和环境管理
- 🎯 **[功能演示](./DEMO.md)** - 实际使用场景演示
- 🔧 **[API 参考](#mcp-工具列表)** - 所有工具的详细说明

## 功能特性

### 🌟 核心功能
- 🔌 **多种连接方式**：支持直连、Docker 容器、远程连接
- 🖥️ **跨平台兼容**：支持 Windows、Linux、macOS
- 📝 **SQL 执行**：单条 SQL 语句执行，支持参数化查询
- 📄 **脚本执行**：支持 SQL 脚本文件和批量 SQL 语句执行
- 🗄️ **数据库结构查询**：获取表、列、索引、外键、视图信息
- 🔍 **连接测试**：测试数据库连接状态和性能
- ⚡ **连接池管理**：自动管理数据库连接池，提高性能
- 🛡️ **错误处理**：完善的错误处理和日志记录

### 🚀 智能项目管理 (新功能)
- 🔍 **自动项目检测**：智能识别 Spring Boot、Node.js、Laravel、Django 项目
- 🌍 **多环境支持**：自动解析 dev、test、prod 等多个环境配置
- 🔄 **动态环境切换**：无需重启即可在不同数据库环境间切换
- 📁 **项目感知**：根据工作目录自动加载项目配置文件
- 🎯 **会话管理**：支持多项目多环境的并发连接管理

## 安装和配置

### 1. 安装依赖

```bash
npm install
```
#### Node 版本要求（重要）

- 需要 Node.js ≥ 18。
- 若使用 nvm（Windows）：

```powershell
nvm use 18.20.8
node -v   # 期望输出 v18.x
```

#### 全局安装（两种方式，选其一）

- 开发者本地（推荐）：

```bash
npm run build
npm link   # 将本项目注册为全局命令 mysql-mcp-server
```

- 从 GitHub 全局安装：

```bash
npm i -g git+https://github.com/eeantoss/mysql-mcp-server.git
```

### 2. 环境配置

复制 `.env.example` 为 `.env` 并配置您的数据库连接信息：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# MySQL 连接配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database

# Docker 连接配置 (可选)
DOCKER_CONTAINER_NAME=mysql_container
DOCKER_MYSQL_PORT=3306

# 连接池配置
CONNECTION_LIMIT=10
ACQUIRE_TIMEOUT=60000
TIMEOUT=60000

# 调试模式
DEBUG=false
```

### 3. 编译项目

```bash
npm run build
```

### 4. 启动服务器

```bash
npm start
```

或者开发模式：

```bash
npm run dev
```
### 5. 在 Windsurf / Claude 中以 MCP 方式启动（示例）

在 `c:\\Users\\26811\\.codeium\\windsurf\\mcp_config.json` 中配置：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["C:\\\Users\\\\26811\\\\CascadeProjects\\\\mysql-mcp-server\\\\build\\\\index.js"],
      "env": { "DEBUG": "false" }
    }
  }
}
```

注意：使用全局 CLI 后，无需写死绝对路径；部分 IDE 不允许设置 `cwd` 字段，请仅指定 `command` 即可。

## MCP 工具列表

### 🌟 智能项目管理工具

#### 1. `mysql_detect_project` - 检测项目配置

自动检测当前项目的数据库配置文件和环境设置。

**参数：**
- `workingDirectory` (string, 可选): 项目根目录路径，默认为当前目录

**支持的项目类型：**
- Spring Boot (application.yml, application-*.yml)
- Node.js (.env, .env.*)
- Laravel (.env, config/database.php)
- Django (settings.py)

#### 2. `mysql_list_environments` - 列出环境

列出检测到的所有数据库环境配置。

#### 3. `mysql_connect_environment` - 连接环境

连接到指定的项目环境。

**参数：**
- `environmentName` (string, 必需): 环境名称（如：dev, test, prod）

#### 4. `mysql_switch_environment` - 切换环境

切换到不同的数据库环境。

**参数：**
- `environmentName` (string, 必需): 要切换到的环境名称

#### 5. `mysql_list_sessions` - 列出会话

列出所有活跃的数据库连接会话。

#### 6. `mysql_get_project_summary` - 项目摘要

获取项目数据库配置的完整摘要信息。

### 🔧 基础数据库工具

#### 7. `mysql_connect` - 手动连接数据库

连接到 MySQL 数据库。

**参数：**
- `host` (string): MySQL 服务器地址，默认 'localhost'
- `port` (number): MySQL 端口号，默认 3306
- `user` (string): 用户名，默认 'root'
- `password` (string): 密码 **(必需)**
- `database` (string): 数据库名称（可选）
- `connectionType` (string): 连接类型，可选值：'direct', 'docker', 'remote'，默认 'direct'
- `containerName` (string): Docker 容器名称（仅当 connectionType 为 'docker' 时需要）

**示例：**
```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "mypassword",
  "database": "testdb",
  "connectionType": "direct"
}
```

#### 8. `mysql_execute_sql` - 执行 SQL 语句

执行单条 SQL 语句。

**参数：**
- `sql` (string): 要执行的 SQL 语句 **(必需)**
- `params` (array): SQL 参数（可选）

**示例：**
```json
{
  "sql": "SELECT * FROM users WHERE age > ?",
  "params": ["25"]
}
```

#### 9. `mysql_execute_script` - 执行 SQL 脚本文件

执行 SQL 脚本文件。

**参数：**
- `scriptPath` (string): SQL 脚本文件的完整路径 **(必需)**

**示例：**
```json
{
  "scriptPath": "/path/to/your/script.sql"
}
```

#### 10. `mysql_execute_batch` - 批量执行 SQL

批量执行多条 SQL 语句。

**参数：**
- `sqlScript` (string): 包含多条 SQL 语句的脚本内容 **(必需)**

**示例：**
```json
{
  "sqlScript": "CREATE TABLE test (id INT PRIMARY KEY); INSERT INTO test VALUES (1);"
}
```

#### 11. `mysql_get_schema` - 获取数据库结构

获取数据库结构信息，包括表、列、索引、外键、视图等。

**参数：**
- `databaseName` (string): 数据库名称（可选，默认使用当前连接的数据库）

**示例：**
```json
{
  "databaseName": "mydb"
}
```

#### 12. `mysql_test_connection` - 测试连接

测试当前数据库连接状态。

**参数：** 无
## 常用操作示例（可复制）

以下示例展示“连接 → 验证 → 列表 → CRUD”的完整流程，所有 SQL 均明确显示：

- 连接（示例：localhost:3308/poseidon，root/root）

```json
{ "tool": "mysql_connect", "arguments": {"host":"localhost","port":3308,"user":"root","password":"root","database":"poseidon"} }
```

- 连接校验 SQL

```sql
SELECT 1 AS ok;
```

- 列出当前库所有表

```sql
SHOW TABLES;
```

- CRUD 演示

```sql
-- 建表（存在则忽略）
CREATE TABLE IF NOT EXISTS test_user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  age INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入
INSERT INTO test_user (name, age) VALUES ("Alice", 28), ("Bob", 35);

-- 查询
SELECT id, name, age, created_at FROM test_user ORDER BY id;

-- 更新
UPDATE test_user SET age = age + 1 WHERE name = "Alice";

-- 验证更新
SELECT id, name, age FROM test_user WHERE name = "Alice";

-- 删除
DELETE FROM test_user WHERE name = "Bob";
```
> 建议在对话式智能体中，每一步先回显“将执行的 SQL/动作”，再调用 MCP 工具执行，最后回显结果，保证可观测性。

#### 13. `mysql_disconnect` - 断开连接

断开数据库连接。

**参数：** 无

## 使用场景

### 场景 1：多项目多环境管理 🌟

**问题**：开发者经常需要在不同项目的不同环境间切换操作数据库
- 项目A：开发环境(1.1.1.1:3306)、测试环境(1.1.1.1:3307)、生产环境(1.1.1.2:3306)
- 项目B：本地环境(localhost:3306)、云端环境(cloud.db.com:3306)

**解决方案**：
```
您: "检测当前Spring Boot项目的数据库配置"
Claude: [自动检测] → 发现dev、test、prod三个环境

您: "连接到开发环境，查询用户数据"
Claude: [连接dev环境] → [执行查询]

您: "切换到生产环境，执行相同查询对比数据"
Claude: [切换prod环境] → [执行查询] → [对比结果]
```

### 场景 2：替代命令行 MySQL 客户端

当您的系统没有安装 MySQL 客户端，或者 MySQL 运行在 Docker 容器中时，可以使用此 MCP 服务器来执行 SQL 操作。

```bash
# 传统方式（可能失败）
mysql -u root -p mydb < script.sql

# 使用 MCP 方式
# 通过 MCP 客户端调用 mysql_execute_script 工具
```

### 场景 3：智能体 SQL 操作

在 AI 智能体中集成数据库操作能力，让智能体能够：
- 自动检测项目配置并连接相应环境
- 执行数据查询和分析
- 运行数据库脚本
- 管理数据库结构
- 执行数据迁移
- 在多环境间进行数据对比

### 场景 4：跨平台数据库管理

在不同操作系统上提供统一的数据库操作接口，无需安装特定的数据库客户端。

## Docker 支持

### 连接到 Docker 中的 MySQL

如果您的 MySQL 运行在 Docker 容器中，可以这样连接：

```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "password",
  "connectionType": "docker",
  "containerName": "mysql_container"
}
```

### 在 Docker 中运行 MCP 服务器

您也可以将 MCP 服务器本身运行在 Docker 中：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 MySQL 服务是否运行
   - 验证连接参数（主机、端口、用户名、密码）
   - 确认防火墙设置

2. **权限错误**
   - 确保用户有足够的数据库权限
   - 检查 MySQL 用户配置

3. **Docker 连接问题**
   - 确认容器名称正确
   - 检查端口映射
   - 验证网络连接

4. **MCP 报错：failed to initialize server: transport error: server terminated**
   - 常见原因：Node 版本过低或 ESM 主入口判断差异。
   - 处理：确保 Node ≥ 18；我们已在 `src/index.ts` 修复入口判断（`pathToFileURL(process.argv[1])` 比较）并使用 `process.stdin.resume()` 保活。
   - 若更新后仍报错，请在 IDE 中 Reload Window 或重存 `mcp_config.json` 触发重启。

5. **PowerShell 提示 Execution Policy / profile.ps1 安全警告**
   - 这是终端环境提示，不影响构建与运行，可忽略或按需调整系统策略。

6. **连接测试语句报错 near 'current_time'**
   - 旧版本使用 `NOW() as current_time` 在部分 MySQL/MariaDB/SQL 模式下可能报错。
   - 已改为更高兼容的探针：`SELECT 1 AS ok;` 与可选 `SELECT @@version AS version;`。
   - 如仍遇到此错误，请确认已重启 MCP 进程并加载最新构建。

设置环境变量 `DEBUG=true` 启用调试模式，查看详细的日志信息。

## 开发

### 项目结构

```
mysql-mcp-server/
├── src/
│   ├── index.ts              # MCP 服务器主程序
│   ├── connection-manager.ts # 连接管理器
│   ├── mysql-tools.ts        # MySQL 工具实现
│   └── types.ts              # 类型定义
├── build/                    # 编译输出
├── package.json
├── tsconfig.json
└── README.md
```

### 开发命令

```bash
# 安装依赖
npm install

# 编译
npm run build

# 开发模式（监听文件变化）
npm run watch

# 启动服务器
npm start

# 开发模式启动
npm run dev
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本
- 支持基本的 MySQL 操作
- 跨平台兼容
- Docker 支持
- 完整的 MCP 协议实现
### v1.1.0
- 新增：智能项目检测与多环境管理（`mysql_detect_project` 等 6 个工具）
- 新增：增强连接管理器，支持多会话与快速切换
- 新增：启动与生命周期详细日志，改进 ESM 入口判断与保活
- 优化：连接测试改为 `SELECT 1 AS ok` / `SELECT @@version AS version`，提升兼容性
- 文档：新增 Windsurf/Claude MCP 配置示例与完整 CRUD 演练
