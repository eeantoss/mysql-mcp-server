/**
 * MySQL 连接管理器
 * 支持直连、Docker 和远程连接
 */

import mysql from 'mysql2/promise';
import { 
  MySQLConnectionConfig, 
  DockerConnectionConfig, 
  ConnectionType, 
  ConnectionTestResult,
  MCPToolError 
} from './types.js';

export class MySQLConnectionManager {
  private pool: mysql.Pool | null = null;
  private config: MySQLConnectionConfig;
  private connectionType: ConnectionType;

  constructor(config: MySQLConnectionConfig, connectionType: ConnectionType = ConnectionType.DIRECT) {
    this.config = config;
    this.connectionType = connectionType;
  }

  /**
   * 初始化连接池
   */
  async initialize(): Promise<void> {
    try {
      const poolConfig = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionLimit: this.config.connectionLimit || 10,
        acquireTimeout: this.config.acquireTimeout || 60000,
        timeout: this.config.timeout || 60000,
        ssl: this.config.ssl,
        // 跨平台兼容性设置
        charset: 'utf8mb4',
        timezone: 'local',
        supportBigNumbers: true,
        bigNumberStrings: true
      };

      this.pool = mysql.createPool(poolConfig);
      
      // 测试连接
      const testResult = await this.testConnection();
      if (!testResult.success) {
        throw new Error(`连接测试失败: ${testResult.error}`);
      }
      
      console.log(`MySQL 连接池初始化成功 (${this.connectionType})`);
    } catch (error) {
      const mcpError = error as MCPToolError;
      throw new Error(`连接池初始化失败: ${mcpError.message}`);
    }
  }

  /**
   * 获取数据库连接
   */
  async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new Error('连接池未初始化，请先调用 initialize()');
    }

    try {
      return await this.pool.getConnection();
    } catch (error) {
      const mcpError = error as MCPToolError;
      throw new Error(`获取数据库连接失败: ${mcpError.message}`);
    }
  }

  /**
   * 执行 SQL 查询
   */
  async execute(sql: string, params?: any[]): Promise<any> {
    const connection = await this.getConnection();
    
    try {
      const startTime = Date.now();
      const [results] = await connection.execute(sql, params);
      const executionTime = Date.now() - startTime;
      
      return { results, executionTime };
    } catch (error) {
      const mcpError = error as MCPToolError;
      throw new Error(`SQL 执行失败: ${mcpError.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      const connection = await this.getConnection();
      
      try {
        // 使用更高兼容性的探针查询，避免老版本/不同方言在别名或函数上的差异
        const [probe] = await connection.execute('SELECT 1 AS ok');
        let serverVersion: string | undefined = undefined;
        try {
          const [ver] = await connection.execute('SELECT @@version AS version');
          const verArr = ver as any[];
          serverVersion = verArr?.[0]?.version;
        } catch {
          // 忽略版本获取失败，不影响连通性判断
        }
        const connectionTime = Date.now() - startTime;
        
        return {
          success: true,
          message: '连接成功',
          connectionTime,
          serverVersion
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      const mcpError = error as MCPToolError;
      return {
        success: false,
        message: '连接失败',
        error: mcpError.message
      };
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('MySQL 连接池已关闭');
    }
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<mysql.PoolConnection> {
    const connection = await this.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  /**
   * 提交事务
   */
  async commitTransaction(connection: mysql.PoolConnection): Promise<void> {
    try {
      await connection.commit();
    } finally {
      connection.release();
    }
  }

  /**
   * 回滚事务
   */
  async rollbackTransaction(connection: mysql.PoolConnection): Promise<void> {
    try {
      await connection.rollback();
    } finally {
      connection.release();
    }
  }

  /**
   * 检查是否为 Docker 环境中的 MySQL
   */
  private async isDockerMySQL(): Promise<boolean> {
    if (this.connectionType !== ConnectionType.DOCKER) {
      return false;
    }

    // 可以添加更多 Docker 检测逻辑
    return this.config.host === 'localhost' || this.config.host === '127.0.0.1';
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): { type: ConnectionType; config: Partial<MySQLConnectionConfig> } {
    return {
      type: this.connectionType,
      config: {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        database: this.config.database
      }
    };
  }
}

/**
 * 创建连接管理器的工厂函数
 */
export function createConnectionManager(
  config: MySQLConnectionConfig | DockerConnectionConfig,
  type?: ConnectionType
): MySQLConnectionManager {
  const connectionType = type || ConnectionType.DIRECT;
  
  // 如果是 Docker 配置，进行特殊处理
  if ('containerName' in config && connectionType === ConnectionType.DOCKER) {
    // Docker 环境下的连接配置调整
    const dockerConfig: MySQLConnectionConfig = {
      ...config,
      host: config.host || 'localhost',
      port: config.dockerPort || config.port || 3306
    };
    return new MySQLConnectionManager(dockerConfig, ConnectionType.DOCKER);
  }
  
  return new MySQLConnectionManager(config, connectionType);
}
