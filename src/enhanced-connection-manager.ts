/**
 * 增强的连接管理器
 * 支持多环境、动态切换和项目感知
 */

import { MySQLConnectionManager, createConnectionManager } from './connection-manager.js';
import { ProjectDetector, ProjectInfo, ProjectEnvironment } from './project-detector.js';
import { MySQLConnectionConfig, ConnectionType } from './types.js';

export interface ConnectionSession {
  id: string;
  environment: ProjectEnvironment;
  manager: MySQLConnectionManager;
  createdAt: Date;
  lastUsed: Date;
}

export class EnhancedConnectionManager {
  private sessions: Map<string, ConnectionSession> = new Map();
  private currentSessionId: string | null = null;
  private projectInfo: ProjectInfo | null = null;
  private projectDetector: ProjectDetector;

  constructor(workingDirectory?: string) {
    this.projectDetector = new ProjectDetector(workingDirectory);
  }

  /**
   * 检测当前项目配置
   */
  async detectProject(): Promise<ProjectInfo> {
    this.projectInfo = await this.projectDetector.detectProject();
    return this.projectInfo;
  }

  /**
   * 获取项目信息
   */
  getProjectInfo(): ProjectInfo | null {
    return this.projectInfo;
  }

  /**
   * 列出可用的环境
   */
  listEnvironments(): ProjectEnvironment[] {
    return this.projectInfo?.environments || [];
  }

  /**
   * 连接到指定环境
   */
  async connectToEnvironment(environmentName: string): Promise<ConnectionSession> {
    if (!this.projectInfo) {
      throw new Error('请先检测项目配置');
    }

    const environment = this.projectInfo.environments.find(env => env.name === environmentName);
    if (!environment) {
      throw new Error(`未找到环境: ${environmentName}`);
    }

    // 检查是否已有连接
    const existingSessionId = this.findSessionByEnvironment(environmentName);
    if (existingSessionId) {
      const session = this.sessions.get(existingSessionId)!;
      session.lastUsed = new Date();
      this.currentSessionId = existingSessionId;
      return session;
    }

    // 创建新连接
    const connectionManager = createConnectionManager(environment.config, ConnectionType.DIRECT);
    await connectionManager.initialize();

    const sessionId = this.generateSessionId();
    const session: ConnectionSession = {
      id: sessionId,
      environment,
      manager: connectionManager,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    return session;
  }

  /**
   * 手动连接到数据库
   */
  async connectManually(config: MySQLConnectionConfig, name?: string): Promise<ConnectionSession> {
    const connectionManager = createConnectionManager(config, ConnectionType.DIRECT);
    await connectionManager.initialize();

    const environment: ProjectEnvironment = {
      name: name || 'manual',
      displayName: `手动连接 (${config.host}:${config.port}/${config.database})`,
      config,
      source: 'manual',
      type: 'manual'
    };

    const sessionId = this.generateSessionId();
    const session: ConnectionSession = {
      id: sessionId,
      environment,
      manager: connectionManager,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    return session;
  }

  /**
   * 切换到指定会话
   */
  switchToSession(sessionId: string): ConnectionSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    session.lastUsed = new Date();
    this.currentSessionId = sessionId;
    return session;
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): ConnectionSession | null {
    if (!this.currentSessionId) {
      return null;
    }
    return this.sessions.get(this.currentSessionId) || null;
  }

  /**
   * 获取当前连接管理器
   */
  getCurrentManager(): MySQLConnectionManager | null {
    const session = this.getCurrentSession();
    return session?.manager || null;
  }

  /**
   * 列出所有会话
   */
  listSessions(): ConnectionSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 断开指定会话
   */
  async disconnectSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.manager.close();
      this.sessions.delete(sessionId);
      
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
    }
  }

  /**
   * 断开所有会话
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.sessions.values()).map(session => 
      session.manager.close()
    );
    
    await Promise.all(promises);
    this.sessions.clear();
    this.currentSessionId = null;
  }

  /**
   * 测试环境连接
   */
  async testEnvironmentConnection(environmentName: string): Promise<boolean> {
    if (!this.projectInfo) {
      return false;
    }

    const environment = this.projectInfo.environments.find(env => env.name === environmentName);
    if (!environment) {
      return false;
    }

    try {
      const tempManager = createConnectionManager(environment.config, ConnectionType.DIRECT);
      await tempManager.initialize();
      const result = await tempManager.testConnection();
      await tempManager.close();
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    totalSessions: number;
    activeSessions: number;
    currentEnvironment: string | null;
    detectedEnvironments: number;
  } {
    return {
      totalSessions: this.sessions.size,
      activeSessions: this.sessions.size, // 所有会话都是活跃的
      currentEnvironment: this.getCurrentSession()?.environment.name || null,
      detectedEnvironments: this.projectInfo?.environments.length || 0
    };
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxIdleMinutes: number = 30): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const idleMinutes = (now.getTime() - session.lastUsed.getTime()) / (1000 * 60);
      if (idleMinutes > maxIdleMinutes) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.disconnectSession(sessionId);
    }
  }

  /**
   * 根据环境名查找会话
   */
  private findSessionByEnvironment(environmentName: string): string | null {
    for (const [sessionId, session] of this.sessions) {
      if (session.environment.name === environmentName) {
        return sessionId;
      }
    }
    return null;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取环境连接信息摘要
   */
  getEnvironmentSummary(): string {
    if (!this.projectInfo) {
      return '未检测到项目配置';
    }

    const { type, environments } = this.projectInfo;
    let summary = `项目类型: ${type}\n`;
    summary += `检测到 ${environments.length} 个环境:\n`;

    environments.forEach(env => {
      const status = this.findSessionByEnvironment(env.name) ? '已连接' : '未连接';
      summary += `  - ${env.displayName} [${status}]\n`;
    });

    const currentSession = this.getCurrentSession();
    if (currentSession) {
      summary += `\n当前环境: ${currentSession.environment.displayName}`;
    }

    return summary;
  }
}
