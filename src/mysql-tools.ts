/**
 * MySQL MCP 工具实现
 * 提供各种 MySQL 操作的工具函数
 */

import fs from 'fs/promises';
import path from 'path';
import { MySQLConnectionManager } from './connection-manager.js';
import { 
  SQLExecutionResult, 
  SQLScriptResult, 
  DatabaseSchema, 
  TableInfo, 
  ColumnInfo, 
  IndexInfo, 
  ForeignKeyInfo, 
  ViewInfo,
  ConnectionTestResult,
  MCPToolError 
} from './types.js';

export class MySQLTools {
  private connectionManager: MySQLConnectionManager;

  constructor(connectionManager: MySQLConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * 执行单条 SQL 语句
   */
  async executeSql(sql: string, params?: any[]): Promise<SQLExecutionResult> {
    try {
      const startTime = Date.now();
      const { results, executionTime } = await this.connectionManager.execute(sql, params);
      
      // 判断是否为查询语句
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      const isShow = sql.trim().toLowerCase().startsWith('show');
      const isDescribe = sql.trim().toLowerCase().startsWith('describe') || sql.trim().toLowerCase().startsWith('desc');
      
      if (isSelect || isShow || isDescribe) {
        return {
          success: true,
          data: Array.isArray(results) ? results : [results],
          executionTime,
          message: `查询成功，返回 ${Array.isArray(results) ? results.length : 1} 行数据`
        };
      } else {
        // INSERT, UPDATE, DELETE 等操作
        const result = results as any;
        return {
          success: true,
          affectedRows: result.affectedRows || 0,
          insertId: result.insertId || null,
          fieldCount: result.fieldCount || 0,
          executionTime,
          message: `操作成功，影响 ${result.affectedRows || 0} 行`
        };
      }
    } catch (error) {
      const mcpError = error as MCPToolError;
      return {
        success: false,
        error: mcpError.message,
        message: 'SQL 执行失败'
      };
    }
  }

  /**
   * 执行 SQL 脚本文件
   */
  async executeScript(scriptPath: string): Promise<SQLScriptResult> {
    try {
      // 读取脚本文件
      const scriptContent = await fs.readFile(scriptPath, 'utf-8');
      return await this.executeBatch(scriptContent);
    } catch (error) {
      const mcpError = error as MCPToolError;
      return {
        success: false,
        results: [],
        totalStatements: 0,
        successfulStatements: 0,
        failedStatements: 1,
        executionTime: 0,
        errors: [`读取脚本文件失败: ${mcpError.message}`]
      };
    }
  }

  /**
   * 批量执行 SQL 语句
   */
  async executeBatch(sqlScript: string): Promise<SQLScriptResult> {
    const startTime = Date.now();
    const statements = this.parseSqlScript(sqlScript);
    const results: SQLExecutionResult[] = [];
    const errors: string[] = [];
    let successfulStatements = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;

      try {
        const result = await this.executeSql(statement);
        results.push(result);
        
        if (result.success) {
          successfulStatements++;
        } else {
          errors.push(`语句 ${i + 1}: ${result.error}`);
        }
      } catch (error) {
        const mcpError = error as MCPToolError;
        const errorResult: SQLExecutionResult = {
          success: false,
          error: mcpError.message,
          message: `语句 ${i + 1} 执行失败`
        };
        results.push(errorResult);
        errors.push(`语句 ${i + 1}: ${mcpError.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    const failedStatements = statements.length - successfulStatements;

    return {
      success: failedStatements === 0,
      results,
      totalStatements: statements.length,
      successfulStatements,
      failedStatements,
      executionTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 获取数据库结构信息
   */
  async getSchema(databaseName?: string): Promise<DatabaseSchema> {
    try {
      const tables = await this.getTables(databaseName);
      const views = await this.getViews(databaseName);

      return {
        tables,
        views
      };
    } catch (error) {
      const mcpError = error as MCPToolError;
      throw new Error(`获取数据库结构失败: ${mcpError.message}`);
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<ConnectionTestResult> {
    return await this.connectionManager.testConnection();
  }

  /**
   * 获取表信息
   */
  private async getTables(databaseName?: string): Promise<TableInfo[]> {
    const tablesResult = await this.executeSql(
      databaseName 
        ? `SHOW TABLES FROM \`${databaseName}\``
        : 'SHOW TABLES'
    );

    if (!tablesResult.success || !tablesResult.data) {
      return [];
    }

    const tables: TableInfo[] = [];
    
    for (const row of tablesResult.data) {
      const tableName = Object.values(row)[0] as string;
      const columns = await this.getColumns(tableName, databaseName);
      const indexes = await this.getIndexes(tableName, databaseName);
      const foreignKeys = await this.getForeignKeys(tableName, databaseName);

      tables.push({
        name: tableName,
        columns,
        indexes,
        foreignKeys
      });
    }

    return tables;
  }

  /**
   * 获取列信息
   */
  private async getColumns(tableName: string, databaseName?: string): Promise<ColumnInfo[]> {
    const fullTableName = databaseName ? `\`${databaseName}\`.\`${tableName}\`` : `\`${tableName}\``;
    const columnsResult = await this.executeSql(`DESCRIBE ${fullTableName}`);

    if (!columnsResult.success || !columnsResult.data) {
      return [];
    }

    return columnsResult.data.map((row: any) => ({
      name: row.Field,
      type: row.Type,
      nullable: row.Null === 'YES',
      defaultValue: row.Default,
      isPrimaryKey: row.Key === 'PRI',
      isAutoIncrement: row.Extra?.includes('auto_increment') || false,
      comment: row.Comment || undefined
    }));
  }

  /**
   * 获取索引信息
   */
  private async getIndexes(tableName: string, databaseName?: string): Promise<IndexInfo[]> {
    const fullTableName = databaseName ? `\`${databaseName}\`.\`${tableName}\`` : `\`${tableName}\``;
    const indexesResult = await this.executeSql(`SHOW INDEX FROM ${fullTableName}`);

    if (!indexesResult.success || !indexesResult.data) {
      return [];
    }

    const indexMap = new Map<string, IndexInfo>();

    for (const row of indexesResult.data) {
      const indexName = row.Key_name;
      if (!indexMap.has(indexName)) {
        indexMap.set(indexName, {
          name: indexName,
          columns: [],
          isUnique: row.Non_unique === 0,
          isPrimary: indexName === 'PRIMARY'
        });
      }
      indexMap.get(indexName)!.columns.push(row.Column_name);
    }

    return Array.from(indexMap.values());
  }

  /**
   * 获取外键信息
   */
  private async getForeignKeys(tableName: string, databaseName?: string): Promise<ForeignKeyInfo[]> {
    const dbName = databaseName || 'DATABASE()';
    const foreignKeysResult = await this.executeSql(`
      SELECT 
        CONSTRAINT_NAME as name,
        COLUMN_NAME as column_name,
        REFERENCED_TABLE_NAME as referenced_table,
        REFERENCED_COLUMN_NAME as referenced_column,
        DELETE_RULE as on_delete,
        UPDATE_RULE as on_update
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = ? 
        AND TABLE_SCHEMA = ${typeof dbName === 'string' && dbName !== 'DATABASE()' ? '?' : 'DATABASE()'}
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, databaseName ? [tableName, databaseName] : [tableName]);

    if (!foreignKeysResult.success || !foreignKeysResult.data) {
      return [];
    }

    return foreignKeysResult.data.map((row: any) => ({
      name: row.name,
      column: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
      onDelete: row.on_delete,
      onUpdate: row.on_update
    }));
  }

  /**
   * 获取视图信息
   */
  private async getViews(databaseName?: string): Promise<ViewInfo[]> {
    const viewsResult = await this.executeSql(`
      SELECT TABLE_NAME as name, VIEW_DEFINITION as definition
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_SCHEMA = ${databaseName ? '?' : 'DATABASE()'}
    `, databaseName ? [databaseName] : []);

    if (!viewsResult.success || !viewsResult.data) {
      return [];
    }

    return viewsResult.data.map((row: any) => ({
      name: row.name,
      definition: row.definition
    }));
  }

  /**
   * 解析 SQL 脚本为单独的语句
   */
  private parseSqlScript(script: string): string[] {
    // 简单的 SQL 语句分割，按分号分割
    // 注意：这是一个简化版本，实际生产环境可能需要更复杂的解析器
    const statements = script
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    return statements;
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.connectionManager.close();
  }
}
