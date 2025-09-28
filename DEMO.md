# 🎯 MySQL MCP 服务器演示指南

## 演示场景

假设您有以下项目结构：

```
您的工作空间/
├── project-a/ (Spring Boot)
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── application-dev.yml    # 1.1.1.1:3306/project_a_dev
│   │   ├── application-test.yml   # 1.1.1.1:3307/project_a_test
│   │   └── application-prod.yml   # 1.1.1.2:3306/project_a_prod
│   └── pom.xml
│
├── project-b/ (Node.js)
│   ├── .env.development           # 1.1.1.1:3306/project_b_dev
│   ├── .env.production            # 1.1.1.2:3306/project_b_prod
│   └── package.json
│
└── project-c/ (Laravel)
    ├── .env                       # 1.1.1.2:3306/project_c
    └── composer.json
```

## 🚀 演示步骤

### 第一步：启动 MCP 服务器

确保您的 `mcp_config.json` 已正确配置：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["C:\\Users\\26811\\CascadeProjects\\mysql-mcp-server\\build\\index.js"],
      "env": {
        "DEBUG": "false"
      }
    }
  }
}
```

### 第二步：在 Claude Desktop 中演示

#### 场景 1：Spring Boot 多环境项目

**您**: "我现在在一个 Spring Boot 项目目录下，请帮我检测数据库配置"

**Claude**: 我来检测您的项目配置...

*[Claude 会自动调用 `mysql_detect_project` 工具]*

**预期响应**:
```
🔍 项目检测完成

📁 项目类型: spring-boot
📂 项目路径: /path/to/project-a
📄 配置文件: 4 个

📋 发现的配置文件:
  - src/main/resources/application.yml
  - src/main/resources/application-dev.yml
  - src/main/resources/application-test.yml
  - src/main/resources/application-prod.yml

🌍 检测到的环境: 3 个
  - dev (Spring Boot)
    来源: src/main/resources/application-dev.yml
    服务器: 1.1.1.1:3306
    数据库: project_a_dev

  - test (Spring Boot)
    来源: src/main/resources/application-test.yml
    服务器: 1.1.1.1:3307
    数据库: project_a_test

  - prod (Spring Boot)
    来源: src/main/resources/application-prod.yml
    服务器: 1.1.1.2:3306
    数据库: project_a_prod
```

**您**: "连接到开发环境"

**Claude**: *[调用 `mysql_connect_environment` 工具，参数: environmentName: "dev"]*

**预期响应**:
```
✅ 成功连接到环境: dev (Spring Boot)

🔗 连接信息:
  服务器: 1.1.1.1:3306
  数据库: project_a_dev
  用户: dev_user
  会话ID: session_1727511766123_abc123def
  连接时间: 2025-09-28 16:22:46

🎉 连接测试成功！
  服务器版本: 8.0.35
  响应时间: 45ms
```

**您**: "查询用户表的结构"

**Claude**: *[调用 `mysql_get_schema` 工具]*

**您**: "现在切换到生产环境，查看相同的表结构"

**Claude**: *[调用 `mysql_switch_environment` 工具，参数: environmentName: "prod"]*

#### 场景 2：多项目管理

**您**: "现在我切换到 Node.js 项目目录，重新检测配置"

**Claude**: *[调用 `mysql_detect_project` 工具，指定新的工作目录]*

**预期响应**:
```
🔍 项目检测完成

📁 项目类型: node-js
📂 项目路径: /path/to/project-b
📄 配置文件: 2 个

📋 发现的配置文件:
  - .env.development
  - .env.production

🌍 检测到的环境: 2 个
  - development (localhost:3306/project_b_dev)
    来源: .env.development
    服务器: 1.1.1.1:3306
    数据库: project_b_dev

  - production (1.1.1.2:3306/project_b_prod)
    来源: .env.production
    服务器: 1.1.1.2:3306
    数据库: project_b_prod
```

**您**: "查看当前所有的数据库连接会话"

**Claude**: *[调用 `mysql_list_sessions` 工具]*

**预期响应**:
```
📊 数据库连接会话 (2 个):

🔗 **会话 1** (当前)
   ID: session_1727511766123_abc123def
   环境: prod (Spring Boot)
   服务器: 1.1.1.2:3306
   数据库: project_a_prod
   创建时间: 2025-09-28 16:22:46
   最后使用: 2025-09-28 16:25:12

💤 **会话 2**
   ID: session_1727511800456_def456ghi
   环境: development (localhost:3306/project_b_dev)
   服务器: 1.1.1.1:3306
   数据库: project_b_dev
   创建时间: 2025-09-28 16:23:20
   最后使用: 2025-09-28 16:23:20

📈 统计信息:
  总会话数: 2
  活跃会话: 2
  检测到的环境: 2
```

#### 场景 3：复杂查询和数据对比

**您**: "在开发环境执行这个查询：SELECT COUNT(*) FROM users WHERE status = 'active'"

**Claude**: 
1. *[切换到 dev 环境]*
2. *[执行 SQL 查询]*

**您**: "在生产环境执行相同的查询，对比结果"

**Claude**: 
1. *[切换到 prod 环境]*
2. *[执行相同查询]*
3. *[对比并分析结果]*

## 🎯 核心优势演示

### 1. 零配置切换
- 无需手动输入数据库连接信息
- 自动从项目配置文件读取
- 支持多种项目类型和配置格式

### 2. 智能环境管理
- 自动检测项目类型（Spring Boot、Node.js、Laravel等）
- 解析不同格式的配置文件（YAML、Properties、ENV）
- 维护多个环境的并发连接

### 3. 会话持久化
- 连接会话自动复用
- 支持多项目同时操作
- 智能会话管理和清理

### 4. 用户友好
- 直观的环境切换
- 详细的连接状态反馈
- 完整的错误处理和提示

## 🔧 测试用例

### 测试 1：项目检测准确性
```
输入：不同类型的项目目录
预期：正确识别项目类型和配置文件
验证：检测结果包含所有环境配置
```

### 测试 2：环境连接稳定性
```
输入：连接到各个环境
预期：成功建立连接并通过测试
验证：连接信息准确，响应时间合理
```

### 测试 3：多环境并发
```
输入：同时连接多个环境
预期：各环境独立工作，无冲突
验证：查询结果正确，会话管理正常
```

### 测试 4：错误处理
```
输入：无效的环境名称或连接信息
预期：友好的错误提示
验证：不影响其他正常连接
```

## 📊 性能指标

- **项目检测速度**: < 1秒
- **环境连接时间**: < 3秒
- **环境切换速度**: < 500ms
- **并发连接数**: 支持10+个环境
- **内存使用**: 每个连接 < 10MB

## 🎉 演示总结

通过这个演示，您可以看到：

1. **自动化程度高**: 无需手动配置数据库连接
2. **多项目支持**: 轻松管理不同项目的数据库
3. **环境切换便捷**: 一键切换开发/测试/生产环境
4. **智能感知**: 自动识别项目类型和配置
5. **用户体验好**: 直观的反馈和错误处理

**这就是新一代的数据库操作体验！** 🚀
