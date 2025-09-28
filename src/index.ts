#!/usr/bin/env node

/**
 * MySQL MCP 服务器主程序
 * 实现 Model Context Protocol 接口，提供 MySQL 数据库操作工具
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { MySQLConnectionManager, createConnectionManager } from './connection-manager.js';
import { MySQLTools } from './mysql-tools.js';
import { EnhancedConnectionManager } from './enhanced-connection-manager.js';
import { MySQLConnectionConfig, ConnectionType } from './types.js';
import { pathToFileURL } from 'url';

// 加载环境变量
dotenv.config();
console.error('[MCP] Booting mysql-mcp-server...');

class MySQLMCPServer {
  private server: Server;
  private connectionManager: MySQLConnectionManager | null = null;
  private mysqlTools: MySQLTools | null = null;
  private enhancedManager: EnhancedConnectionManager;
  private isInteractiveMode: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: 'mysql-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.enhancedManager = new EnhancedConnectionManager();
    this.setupToolHandlers();
    this.setupErrorHandling();
    console.error('[MCP] Server instance constructed, tool handlers and error handling set.');
  }

  /**
   * 设置工具处理程序
   */
  private setupToolHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'mysql_connect',
            description: '连接到 MySQL 数据库',
            inputSchema: {
              type: 'object',
              properties: {
                host: {
                  type: 'string',
                  description: 'MySQL 服务器地址',
                  default: 'localhost'
                },
                port: {
                  type: 'number',
                  description: 'MySQL 端口号',
                  default: 3306
                },
                user: {
                  type: 'string',
                  description: '用户名',
                  default: 'root'
                },
                password: {
                  type: 'string',
                  description: '密码'
                },
                database: {
                  type: 'string',
                  description: '数据库名称（可选）'
                },
                connectionType: {
                  type: 'string',
                  enum: ['direct', 'docker', 'remote'],
                  description: '连接类型',
                  default: 'direct'
                },
                containerName: {
                  type: 'string',
                  description: 'Docker 容器名称（仅当 connectionType 为 docker 时需要）'
                }
              },
              required: ['host', 'user', 'password']
            }
          },
          {
            name: 'mysql_execute_sql',
            description: '执行单条 SQL 语句',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: '要执行的 SQL 语句'
                },
                params: {
                  type: 'array',
                  description: 'SQL 参数（可选）',
                  items: {
                    type: 'string'
                  }
                }
              },
              required: ['sql']
            }
          },
          {
            name: 'mysql_execute_script',
            description: '执行 SQL 脚本文件',
            inputSchema: {
              type: 'object',
              properties: {
                scriptPath: {
                  type: 'string',
                  description: 'SQL 脚本文件的完整路径'
                }
              },
              required: ['scriptPath']
            }
          },
          {
            name: 'mysql_execute_batch',
            description: '批量执行 SQL 语句',
            inputSchema: {
              type: 'object',
              properties: {
                sqlScript: {
                  type: 'string',
                  description: '包含多条 SQL 语句的脚本内容'
                }
              },
              required: ['sqlScript']
            }
          },
          {
            name: 'mysql_get_schema',
            description: '获取数据库结构信息',
            inputSchema: {
              type: 'object',
              properties: {
                databaseName: {
                  type: 'string',
                  description: '数据库名称（可选，默认使用当前连接的数据库）'
                }
              }
            }
          },
          {
            name: 'mysql_test_connection',
            description: '测试数据库连接',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'mysql_disconnect',
            description: '断开数据库连接',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'mysql_detect_project',
            description: '检测当前项目的数据库配置',
            inputSchema: {
              type: 'object',
              properties: {
                workingDirectory: {
                  type: 'string',
                  description: '项目根目录路径（可选，默认为当前目录）'
                }
              }
            }
          },
          {
            name: 'mysql_list_environments',
            description: '列出检测到的数据库环境',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'mysql_connect_environment',
            description: '连接到指定的项目环境',
            inputSchema: {
              type: 'object',
              properties: {
                environmentName: {
                  type: 'string',
                  description: '环境名称（如：dev, test, prod）'
                }
              },
              required: ['environmentName']
            }
          },
          {
            name: 'mysql_switch_environment',
            description: '切换到不同的数据库环境',
            inputSchema: {
              type: 'object',
              properties: {
                environmentName: {
                  type: 'string',
                  description: '要切换到的环境名称'
                }
              },
              required: ['environmentName']
            }
          },
          {
            name: 'mysql_list_sessions',
            description: '列出所有数据库连接会话',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'mysql_get_project_summary',
            description: '获取项目数据库配置摘要',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ] as Tool[]
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'mysql_connect':
            return await this.handleConnect(args);
          
          case 'mysql_execute_sql':
            return await this.handleExecuteSql(args);
          
          case 'mysql_execute_script':
            return await this.handleExecuteScript(args);
          
          case 'mysql_execute_batch':
            return await this.handleExecuteBatch(args);
          
          case 'mysql_get_schema':
            return await this.handleGetSchema(args);
          
          case 'mysql_test_connection':
            return await this.handleTestConnection();
          
          case 'mysql_disconnect':
            return await this.handleDisconnect();

          case 'mysql_detect_project':
            return await this.handleDetectProject(args);

          case 'mysql_list_environments':
            return await this.handleListEnvironments();

          case 'mysql_connect_environment':
            return await this.handleConnectEnvironment(args);

          case 'mysql_switch_environment':
            return await this.handleSwitchEnvironment(args);

          case 'mysql_list_sessions':
            return await this.handleListSessions();

          case 'mysql_get_project_summary':
            return await this.handleGetProjectSummary();
          
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${errorMessage}`
            }
          ]
        };
      }
    });
  }

  /**
   * 处理连接请求
   */
  private async handleConnect(args: any) {
    const config: MySQLConnectionConfig = {
      host: args.host || process.env.MYSQL_HOST || 'localhost',
      port: args.port || parseInt(process.env.MYSQL_PORT || '3306'),
      user: args.user || process.env.MYSQL_USER || 'root',
      password: args.password || process.env.MYSQL_PASSWORD || '',
      database: args.database || process.env.MYSQL_DATABASE,
      connectionLimit: parseInt(process.env.CONNECTION_LIMIT || '10'),
      acquireTimeout: parseInt(process.env.ACQUIRE_TIMEOUT || '60000'),
      timeout: parseInt(process.env.TIMEOUT || '60000')
    };

    const connectionType = args.connectionType as ConnectionType || ConnectionType.DIRECT;
    
    // 如果是 Docker 连接，添加容器名称
    if (connectionType === ConnectionType.DOCKER && args.containerName) {
      (config as any).containerName = args.containerName;
    }

    this.connectionManager = createConnectionManager(config, connectionType);
    await this.connectionManager.initialize();
    this.mysqlTools = new MySQLTools(this.connectionManager);

    const connectionInfo = this.connectionManager.getConnectionInfo();
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ MySQL 连接成功！\n连接类型: ${connectionInfo.type}\n服务器: ${connectionInfo.config.host}:${connectionInfo.config.port}\n用户: ${connectionInfo.config.user}\n数据库: ${connectionInfo.config.database || '未指定'}`
        }
      ]
    };
  }

  /**
   * 处理 SQL 执行请求
   */
  private async handleExecuteSql(args: any) {
    if (!this.mysqlTools) {
      throw new Error('请先连接到数据库');
    }

    const result = await this.mysqlTools.executeSql(args.sql, args.params);
    
    if (result.success) {
      let responseText = `✅ ${result.message}\n执行时间: ${result.executionTime}ms\n`;
      
      if (result.data && result.data.length > 0) {
        responseText += `\n📊 查询结果:\n${JSON.stringify(result.data, null, 2)}`;
      } else if (result.affectedRows !== undefined) {
        responseText += `\n📈 影响行数: ${result.affectedRows}`;
        if (result.insertId) {
          responseText += `\n🆔 插入ID: ${result.insertId}`;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ]
      };
    } else {
      throw new Error(result.error || 'SQL 执行失败');
    }
  }

  /**
   * 处理脚本执行请求
   */
  private async handleExecuteScript(args: any) {
    if (!this.mysqlTools) {
      throw new Error('请先连接到数据库');
    }

    const result = await this.mysqlTools.executeScript(args.scriptPath);
    
    let responseText = `📄 脚本执行完成\n`;
    responseText += `总语句数: ${result.totalStatements}\n`;
    responseText += `成功: ${result.successfulStatements}\n`;
    responseText += `失败: ${result.failedStatements}\n`;
    responseText += `执行时间: ${result.executionTime}ms\n`;
    
    if (result.errors && result.errors.length > 0) {
      responseText += `\n❌ 错误信息:\n${result.errors.join('\n')}`;
    }
    
    if (result.success) {
      responseText = `✅ ${responseText}`;
    } else {
      responseText = `⚠️ ${responseText}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * 处理批量执行请求
   */
  private async handleExecuteBatch(args: any) {
    if (!this.mysqlTools) {
      throw new Error('请先连接到数据库');
    }

    const result = await this.mysqlTools.executeBatch(args.sqlScript);
    
    let responseText = `📦 批量执行完成\n`;
    responseText += `总语句数: ${result.totalStatements}\n`;
    responseText += `成功: ${result.successfulStatements}\n`;
    responseText += `失败: ${result.failedStatements}\n`;
    responseText += `执行时间: ${result.executionTime}ms\n`;
    
    if (result.errors && result.errors.length > 0) {
      responseText += `\n❌ 错误信息:\n${result.errors.join('\n')}`;
    }
    
    if (result.success) {
      responseText = `✅ ${responseText}`;
    } else {
      responseText = `⚠️ ${responseText}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * 处理获取数据库结构请求
   */
  private async handleGetSchema(args: any) {
    if (!this.mysqlTools) {
      throw new Error('请先连接到数据库');
    }

    const schema = await this.mysqlTools.getSchema(args.databaseName);
    
    let responseText = `🗄️ 数据库结构信息\n\n`;
    
    // 表信息
    responseText += `📋 表 (${schema.tables.length} 个):\n`;
    for (const table of schema.tables) {
      responseText += `\n  📊 ${table.name}\n`;
      responseText += `    列数: ${table.columns.length}\n`;
      responseText += `    索引数: ${table.indexes.length}\n`;
      responseText += `    外键数: ${table.foreignKeys.length}\n`;
      
      // 显示列信息
      if (table.columns.length > 0) {
        responseText += `    列信息:\n`;
        for (const column of table.columns) {
          const flags = [];
          if (column.isPrimaryKey) flags.push('PK');
          if (column.isAutoIncrement) flags.push('AI');
          if (!column.nullable) flags.push('NOT NULL');
          
          responseText += `      - ${column.name}: ${column.type}`;
          if (flags.length > 0) {
            responseText += ` [${flags.join(', ')}]`;
          }
          responseText += `\n`;
        }
      }
    }
    
    // 视图信息
    if (schema.views.length > 0) {
      responseText += `\n👁️ 视图 (${schema.views.length} 个):\n`;
      for (const view of schema.views) {
        responseText += `  - ${view.name}\n`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * 处理测试连接请求
   */
  private async handleTestConnection() {
    if (!this.mysqlTools) {
      throw new Error('请先连接到数据库');
    }

    const result = await this.mysqlTools.testConnection();
    
    if (result.success) {
      let responseText = `✅ 连接测试成功！\n`;
      responseText += `连接时间: ${result.connectionTime}ms\n`;
      if (result.serverVersion) {
        responseText += `服务器版本: ${result.serverVersion}\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ]
      };
    } else {
      throw new Error(result.error || '连接测试失败');
    }
  }

  /**
   * 处理断开连接请求
   */
  private async handleDisconnect() {
    if (this.mysqlTools) {
      await this.mysqlTools.close();
      this.mysqlTools = null;
      this.connectionManager = null;
      
      return {
        content: [
          {
            type: 'text',
            text: '✅ 数据库连接已断开'
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: 'ℹ️ 当前没有活动的数据库连接'
          }
        ]
      };
    }
  }

  /**
   * 处理项目检测请求
   */
  private async handleDetectProject(args: any) {
    try {
      if (args.workingDirectory) {
        this.enhancedManager = new EnhancedConnectionManager(args.workingDirectory);
      }
      
      const projectInfo = await this.enhancedManager.detectProject();
      
      let responseText = `🔍 项目检测完成\n\n`;
      responseText += `📁 项目类型: ${projectInfo.type}\n`;
      responseText += `📂 项目路径: ${projectInfo.rootPath}\n`;
      responseText += `📄 配置文件: ${projectInfo.configFiles.length} 个\n`;
      
      if (projectInfo.configFiles.length > 0) {
        responseText += `\n📋 发现的配置文件:\n`;
        projectInfo.configFiles.forEach(file => {
          responseText += `  - ${file}\n`;
        });
      }
      
      responseText += `\n🌍 检测到的环境: ${projectInfo.environments.length} 个\n`;
      projectInfo.environments.forEach(env => {
        responseText += `  - ${env.displayName}\n`;
        responseText += `    来源: ${env.source}\n`;
        responseText += `    服务器: ${env.config.host}:${env.config.port}\n`;
        responseText += `    数据库: ${env.config.database || '未指定'}\n\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ 项目检测失败: ${errorMessage}`
          }
        ]
      };
    }
  }

  /**
   * 处理列出环境请求
   */
  private async handleListEnvironments() {
    const environments = this.enhancedManager.listEnvironments();
    
    if (environments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '🔍 未检测到任何数据库环境配置。请先运行 mysql_detect_project 检测项目配置。'
          }
        ]
      };
    }

    let responseText = `🌍 可用的数据库环境 (${environments.length} 个):\n\n`;
    
    environments.forEach((env, index) => {
      responseText += `${index + 1}. **${env.displayName}**\n`;
      responseText += `   环境名: ${env.name}\n`;
      responseText += `   服务器: ${env.config.host}:${env.config.port}\n`;
      responseText += `   数据库: ${env.config.database || '未指定'}\n`;
      responseText += `   用户: ${env.config.user}\n`;
      responseText += `   来源: ${env.source}\n`;
      responseText += `   类型: ${env.type === 'detected' ? '自动检测' : '手动配置'}\n\n`;
    });

    const currentSession = this.enhancedManager.getCurrentSession();
    if (currentSession) {
      responseText += `🔗 当前连接: ${currentSession.environment.displayName}`;
    } else {
      responseText += `💡 使用 mysql_connect_environment 连接到指定环境`;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * 处理连接环境请求
   */
  private async handleConnectEnvironment(args: any) {
    try {
      const session = await this.enhancedManager.connectToEnvironment(args.environmentName);
      
      // 更新当前工具实例
      this.connectionManager = session.manager;
      this.mysqlTools = new MySQLTools(session.manager);
      this.isInteractiveMode = true;

      let responseText = `✅ 成功连接到环境: ${session.environment.displayName}\n\n`;
      responseText += `🔗 连接信息:\n`;
      responseText += `  服务器: ${session.environment.config.host}:${session.environment.config.port}\n`;
      responseText += `  数据库: ${session.environment.config.database || '未指定'}\n`;
      responseText += `  用户: ${session.environment.config.user}\n`;
      responseText += `  会话ID: ${session.id}\n`;
      responseText += `  连接时间: ${session.createdAt.toLocaleString()}\n\n`;
      
      // 测试连接
      const testResult = await session.manager.testConnection();
      if (testResult.success) {
        responseText += `🎉 连接测试成功！\n`;
        responseText += `  服务器版本: ${testResult.serverVersion || '未知'}\n`;
        responseText += `  响应时间: ${testResult.connectionTime}ms\n`;
      } else {
        responseText += `⚠️ 连接测试失败: ${testResult.error}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ 连接环境失败: ${errorMessage}`
          }
        ]
      };
    }
  }

  /**
   * 处理切换环境请求
   */
  private async handleSwitchEnvironment(args: any) {
    try {
      // 先尝试连接到环境（如果还没连接）
      const session = await this.enhancedManager.connectToEnvironment(args.environmentName);
      
      // 更新当前工具实例
      this.connectionManager = session.manager;
      this.mysqlTools = new MySQLTools(session.manager);

      return {
        content: [
          {
            type: 'text',
            text: `🔄 已切换到环境: ${session.environment.displayName}\n会话ID: ${session.id}`
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ 切换环境失败: ${errorMessage}`
          }
        ]
      };
    }
  }

  /**
   * 处理列出会话请求
   */
  private async handleListSessions() {
    const sessions = this.enhancedManager.listSessions();
    const currentSession = this.enhancedManager.getCurrentSession();
    
    if (sessions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '📭 当前没有活跃的数据库连接会话'
          }
        ]
      };
    }

    let responseText = `📊 数据库连接会话 (${sessions.length} 个):\n\n`;
    
    sessions.forEach((session, index) => {
      const isCurrent = currentSession?.id === session.id;
      const indicator = isCurrent ? '🔗' : '💤';
      
      responseText += `${indicator} **会话 ${index + 1}** ${isCurrent ? '(当前)' : ''}\n`;
      responseText += `   ID: ${session.id}\n`;
      responseText += `   环境: ${session.environment.displayName}\n`;
      responseText += `   服务器: ${session.environment.config.host}:${session.environment.config.port}\n`;
      responseText += `   数据库: ${session.environment.config.database || '未指定'}\n`;
      responseText += `   创建时间: ${session.createdAt.toLocaleString()}\n`;
      responseText += `   最后使用: ${session.lastUsed.toLocaleString()}\n\n`;
    });

    const stats = this.enhancedManager.getConnectionStats();
    responseText += `📈 统计信息:\n`;
    responseText += `  总会话数: ${stats.totalSessions}\n`;
    responseText += `  活跃会话: ${stats.activeSessions}\n`;
    responseText += `  检测到的环境: ${stats.detectedEnvironments}`;

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * 处理获取项目摘要请求
   */
  private async handleGetProjectSummary() {
    const summary = this.enhancedManager.getEnvironmentSummary();
    
    return {
      content: [
        {
          type: 'text',
          text: `📋 项目数据库配置摘要\n\n${summary}`
        }
      ]
    };
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      if (this.mysqlTools) {
        await this.mysqlTools.close();
      }
      console.error('[MCP] Caught SIGINT, shutting down gracefully.');
      process.exit(0);
    });

    process.on('uncaughtException', (err) => {
      console.error('[MCP] UncaughtException:', err);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[MCP] UnhandledRejection:', reason);
    });

    process.on('beforeExit', (code) => {
      console.error('[MCP] beforeExit with code', code);
    });

    process.on('exit', (code) => {
      console.error('[MCP] exit with code', code);
    });
  }

  /**
   * 启动服务器
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    console.error('[MCP] Connecting Stdio transport...');
    await this.server.connect(transport);
    console.error('[MCP] MySQL MCP 服务器已启动并等待请求 (stdio)。');
    // 防止在无活跃事件循环时提前退出（例如手动运行时无客户端）
    if (process.stdin && (process.stdin as any).resume) {
      try {
        process.stdin.resume();
        console.error('[MCP] process.stdin resumed to keep event loop alive.');
      } catch (e) {
        console.error('[MCP] Failed to resume stdin:', e);
      }
    }
  }
}

// 启动服务器（兼容 Windows 的 ESM 直接执行判断）
try {
  const argv1 = process.argv[1];
  const argv1Url = argv1 ? pathToFileURL(argv1).href : '';
  console.error('[MCP] Entry check:', { argv1, argv1Url, importMetaUrl: import.meta.url });
  if (argv1 && argv1Url === import.meta.url) {
    const server = new MySQLMCPServer();
    server.run().catch((error) => {
      console.error('服务器启动失败:', error);
      process.exit(1);
    });
  } else {
    // 在某些环境中（如被当作模块引入），不直接启动
    console.error('[MCP] Not starting run(): current module is not main entry point.');
  }
} catch (e) {
  console.error('[MCP] Entry check failed, starting server as fallback.', e);
  const server = new MySQLMCPServer();
  server.run().catch((error) => {
    console.error('服务器启动失败:', error);
    process.exit(1);
  });
}
