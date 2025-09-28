/**
 * MySQL MCP 服务器类型定义
 */

export interface MySQLConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  ssl?: string | object;
}

export interface DockerConnectionConfig extends MySQLConnectionConfig {
  containerName: string;
  dockerPort?: number;
}

export interface SQLExecutionResult {
  success: boolean;
  data?: any[];
  affectedRows?: number;
  insertId?: number;
  fieldCount?: number;
  message?: string;
  error?: string;
  executionTime?: number;
}

export interface SQLScriptResult {
  success: boolean;
  results: SQLExecutionResult[];
  totalStatements: number;
  successfulStatements: number;
  failedStatements: number;
  executionTime: number;
  errors?: string[];
}

export interface DatabaseSchema {
  tables: TableInfo[];
  views: ViewInfo[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  comment?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface ForeignKeyInfo {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface ViewInfo {
  name: string;
  definition: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  connectionTime?: number;
  serverVersion?: string;
  error?: string;
}

export enum ConnectionType {
  DIRECT = 'direct',
  DOCKER = 'docker',
  REMOTE = 'remote'
}

export interface MCPToolError extends Error {
  code?: string;
  sqlState?: string;
}
