# 多项目多环境使用指南

## 🌟 新功能概述

增强版 MySQL MCP 服务器现在支持：
- 🔍 **自动项目检测** - 智能识别不同类型的项目配置
- 🌍 **多环境管理** - 支持 dev、test、prod 等多个环境
- 🔄 **动态环境切换** - 无需重启即可切换数据库连接
- 📁 **项目感知** - 根据工作目录自动加载配置

## 支持的项目类型

### 1. Spring Boot 项目
**配置文件**：
- `src/main/resources/application.yml`
- `src/main/resources/application-dev.yml`
- `src/main/resources/application-test.yml`
- `src/main/resources/application-prod.yml`
- `src/main/resources/application.properties`

**示例配置**：
```yaml
# application-dev.yml
spring:
  datasource:
    url: jdbc:mysql://1.1.1.1:3306/project_a_dev
    username: dev_user
    password: dev_password

# application-prod.yml  
spring:
  datasource:
    url: jdbc:mysql://1.1.1.2:3306/project_a_prod
    username: prod_user
    password: prod_password
```

### 2. Node.js 项目
**配置文件**：
- `.env`
- `.env.local`
- `.env.development`
- `.env.test`
- `.env.production`

**示例配置**：
```env
# .env.development
DB_HOST=1.1.1.1
DB_PORT=3306
DB_DATABASE=project_b_dev
DB_USERNAME=dev_user
DB_PASSWORD=dev_password

# .env.production
DB_HOST=1.1.1.2
DB_PORT=3306
DB_DATABASE=project_b_prod
DB_USERNAME=prod_user
DB_PASSWORD=prod_password
```

### 3. Laravel 项目
**配置文件**：
- `.env`
- `config/database.php`

### 4. Django 项目
**配置文件**：
- `settings.py`
- `settings/development.py`
- `settings/production.py`

## 🚀 使用流程

### 步骤 1：检测项目配置

在 Claude Desktop 中：

**您**: "检测当前项目的数据库配置"

**Claude**: 我来检测您的项目配置...
*[调用 mysql_detect_project 工具]*

**响应示例**：
```
🔍 项目检测完成

📁 项目类型: spring-boot
📂 项目路径: /path/to/your/project
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

### 步骤 2：查看可用环境

**您**: "列出所有可用的数据库环境"

**Claude**: *[调用 mysql_list_environments 工具]*

### 步骤 3：连接到指定环境

**您**: "连接到开发环境的数据库"

**Claude**: *[调用 mysql_connect_environment 工具，参数：environmentName: "dev"]*

**您**: "连接到生产环境"

**Claude**: *[调用 mysql_connect_environment 工具，参数：environmentName: "prod"]*

### 步骤 4：执行数据库操作

连接成功后，您可以正常使用所有 SQL 工具：

**您**: "查询用户表的前10条记录"

**Claude**: *[调用 mysql_execute_sql 工具]*

### 步骤 5：切换环境

**您**: "切换到测试环境"

**Claude**: *[调用 mysql_switch_environment 工具]*

## 🛠️ 新增的 MCP 工具

### 1. `mysql_detect_project`
检测当前项目的数据库配置

**参数**：
- `workingDirectory` (可选): 项目根目录路径

**使用场景**：
- 初次使用时检测项目配置
- 切换到新项目时重新检测

### 2. `mysql_list_environments`
列出检测到的数据库环境

**使用场景**：
- 查看项目有哪些环境
- 确认环境配置信息

### 3. `mysql_connect_environment`
连接到指定的项目环境

**参数**：
- `environmentName` (必需): 环境名称

**使用场景**：
- 连接到开发环境：`environmentName: "dev"`
- 连接到测试环境：`environmentName: "test"`
- 连接到生产环境：`environmentName: "prod"`

### 4. `mysql_switch_environment`
切换到不同的数据库环境

**参数**：
- `environmentName` (必需): 要切换到的环境名称

**使用场景**：
- 在不同环境间快速切换
- 对比不同环境的数据

### 5. `mysql_list_sessions`
列出所有数据库连接会话

**使用场景**：
- 查看当前有哪些活跃连接
- 管理多个数据库会话

### 6. `mysql_get_project_summary`
获取项目数据库配置摘要

**使用场景**：
- 快速了解项目配置概况
- 确认当前连接状态

## 💡 实际使用示例

### 场景 1：Spring Boot 多环境项目

```
您: "我有一个Spring Boot项目，需要在开发和生产环境间切换操作数据库"

Claude: 我来帮您检测项目配置并设置多环境连接。
[检测项目] → [列出环境] → [连接到dev环境]

您: "查询开发环境用户表的数据"
Claude: [执行查询]

您: "现在切换到生产环境，查看相同的表"
Claude: [切换到prod环境] → [执行相同查询]
```

### 场景 2：Node.js 项目不同端口

```
项目结构：
- A项目：1.1.1.1:3306/database_a
- B项目：1.1.1.1:3307/database_b  
- C项目：1.1.1.2:3306/database_c

您: "检测当前Node.js项目的数据库配置"
Claude: [自动检测.env文件] → [发现多个环境配置]

您: "连接到本地开发环境"
Claude: [连接到localhost:3306]

您: "切换到测试服务器"
Claude: [切换到1.1.1.1:3307]
```

### 场景 3：多项目管理

```
您: "我现在在项目A目录，检测配置"
Claude: [检测到Spring Boot项目，3个环境]

您: "切换到项目B目录，重新检测"
Claude: [重新检测] → [发现Node.js项目，2个环境]

您: "查看当前所有连接会话"
Claude: [显示项目A和项目B的活跃连接]
```

## ⚙️ 高级配置

### 自定义工作目录

```json
{
  "tool": "mysql_detect_project",
  "arguments": {
    "workingDirectory": "/path/to/specific/project"
  }
}
```

### 环境变量优先级

1. 项目配置文件中的设置
2. 系统环境变量
3. MCP 服务器默认值

### 连接会话管理

- 每个环境维护独立的连接会话
- 自动重用现有连接
- 支持并发多环境连接
- 自动清理过期会话

## 🔧 故障排除

### 问题 1：检测不到项目配置

**原因**：工作目录不正确或配置文件不存在

**解决**：
```
1. 确认当前目录是项目根目录
2. 检查配置文件是否存在
3. 使用 workingDirectory 参数指定正确路径
```

### 问题 2：环境连接失败

**原因**：数据库服务器不可达或认证失败

**解决**：
```
1. 检查网络连接
2. 验证数据库服务器地址和端口
3. 确认用户名密码正确
4. 检查数据库服务器防火墙设置
```

### 问题 3：配置文件解析错误

**原因**：配置文件格式不正确

**解决**：
```
1. 检查YAML/JSON语法
2. 确认环境变量格式
3. 验证JDBC URL格式
```

## 📈 性能优化

1. **连接复用**：相同环境的连接会被复用
2. **延迟连接**：只有在实际使用时才建立连接
3. **会话管理**：自动清理长时间未使用的连接
4. **配置缓存**：项目配置检测结果会被缓存

---

**🎉 现在您可以轻松管理多个项目的多个数据库环境了！**
