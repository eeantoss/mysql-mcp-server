/**
 * 项目配置检测器
 * 自动检测不同类型项目的数据库配置
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { MySQLConnectionConfig } from './types.js';

export interface ProjectEnvironment {
  name: string;
  displayName: string;
  config: MySQLConnectionConfig;
  source: string;
  type: 'detected' | 'manual';
}

export interface ProjectInfo {
  type: ProjectType;
  rootPath: string;
  environments: ProjectEnvironment[];
  configFiles: string[];
}

export enum ProjectType {
  SPRING_BOOT = 'spring-boot',
  NODE_JS = 'node-js',
  LARAVEL = 'laravel',
  DJANGO = 'django',
  GENERIC = 'generic'
}

export class ProjectDetector {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  /**
   * 检测项目类型和配置
   */
  async detectProject(): Promise<ProjectInfo> {
    const projectType = await this.detectProjectType();
    const configFiles = await this.findConfigFiles(projectType);
    const environments = await this.parseEnvironments(projectType, configFiles);

    return {
      type: projectType,
      rootPath: this.rootPath,
      environments,
      configFiles
    };
  }

  /**
   * 检测项目类型
   */
  private async detectProjectType(): Promise<ProjectType> {
    try {
      // 检查 Spring Boot 项目
      if (await this.fileExists('pom.xml') || await this.fileExists('build.gradle')) {
        const appYml = await this.fileExists('src/main/resources/application.yml') ||
                      await this.fileExists('src/main/resources/application.yaml');
        if (appYml) {
          return ProjectType.SPRING_BOOT;
        }
      }

      // 检查 Node.js 项目
      if (await this.fileExists('package.json')) {
        return ProjectType.NODE_JS;
      }

      // 检查 Laravel 项目
      if (await this.fileExists('artisan') && await this.fileExists('composer.json')) {
        return ProjectType.LARAVEL;
      }

      // 检查 Django 项目
      if (await this.fileExists('manage.py') || await this.fileExists('settings.py')) {
        return ProjectType.DJANGO;
      }

      return ProjectType.GENERIC;
    } catch (error) {
      return ProjectType.GENERIC;
    }
  }

  /**
   * 查找配置文件
   */
  private async findConfigFiles(projectType: ProjectType): Promise<string[]> {
    const configFiles: string[] = [];

    switch (projectType) {
      case ProjectType.SPRING_BOOT:
        configFiles.push(...await this.findSpringBootConfigs());
        break;
      
      case ProjectType.NODE_JS:
        configFiles.push(...await this.findNodeJsConfigs());
        break;
      
      case ProjectType.LARAVEL:
        configFiles.push(...await this.findLaravelConfigs());
        break;
      
      case ProjectType.DJANGO:
        configFiles.push(...await this.findDjangoConfigs());
        break;
      
      default:
        configFiles.push(...await this.findGenericConfigs());
    }

    return configFiles;
  }

  /**
   * 查找 Spring Boot 配置文件
   */
  private async findSpringBootConfigs(): Promise<string[]> {
    const configs: string[] = [];
    const resourcesPath = 'src/main/resources';
    
    const patterns = [
      'application.yml',
      'application.yaml', 
      'application.properties',
      'application-*.yml',
      'application-*.yaml',
      'application-*.properties'
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // 处理通配符模式
        const prefix = pattern.split('*')[0];
        const suffix = pattern.split('*')[1];
        
        try {
          const files = await fs.readdir(path.join(this.rootPath, resourcesPath));
          for (const file of files) {
            if (file.startsWith(prefix) && file.endsWith(suffix)) {
              configs.push(path.join(resourcesPath, file));
            }
          }
        } catch (error) {
          // 目录不存在，跳过
        }
      } else {
        const filePath = path.join(resourcesPath, pattern);
        if (await this.fileExists(filePath)) {
          configs.push(filePath);
        }
      }
    }

    return configs;
  }

  /**
   * 查找 Node.js 配置文件
   */
  private async findNodeJsConfigs(): Promise<string[]> {
    const configs: string[] = [];
    const patterns = ['.env', '.env.local', '.env.development', '.env.test', '.env.production'];

    for (const pattern of patterns) {
      if (await this.fileExists(pattern)) {
        configs.push(pattern);
      }
    }

    return configs;
  }

  /**
   * 查找 Laravel 配置文件
   */
  private async findLaravelConfigs(): Promise<string[]> {
    const configs: string[] = [];
    
    if (await this.fileExists('.env')) {
      configs.push('.env');
    }
    
    if (await this.fileExists('config/database.php')) {
      configs.push('config/database.php');
    }

    return configs;
  }

  /**
   * 查找 Django 配置文件
   */
  private async findDjangoConfigs(): Promise<string[]> {
    const configs: string[] = [];
    
    // 查找 settings.py 文件
    const settingsFiles = await this.findFiles('**/settings*.py');
    configs.push(...settingsFiles);

    return configs;
  }

  /**
   * 查找通用配置文件
   */
  private async findGenericConfigs(): Promise<string[]> {
    const configs: string[] = [];
    const patterns = ['.env', 'config.json', 'config.yml', 'config.yaml'];

    for (const pattern of patterns) {
      if (await this.fileExists(pattern)) {
        configs.push(pattern);
      }
    }

    return configs;
  }

  /**
   * 解析环境配置
   */
  private async parseEnvironments(projectType: ProjectType, configFiles: string[]): Promise<ProjectEnvironment[]> {
    const environments: ProjectEnvironment[] = [];

    for (const configFile of configFiles) {
      try {
        const envs = await this.parseConfigFile(projectType, configFile);
        environments.push(...envs);
      } catch (error) {
        console.warn(`解析配置文件失败: ${configFile}`, error);
      }
    }

    return environments;
  }

  /**
   * 解析单个配置文件
   */
  private async parseConfigFile(projectType: ProjectType, configFile: string): Promise<ProjectEnvironment[]> {
    const filePath = path.join(this.rootPath, configFile);
    const content = await fs.readFile(filePath, 'utf-8');

    switch (projectType) {
      case ProjectType.SPRING_BOOT:
        return this.parseSpringBootConfig(configFile, content);
      
      case ProjectType.NODE_JS:
      case ProjectType.LARAVEL:
        return this.parseEnvConfig(configFile, content);
      
      default:
        return this.parseGenericConfig(configFile, content);
    }
  }

  /**
   * 解析 Spring Boot 配置
   */
  private parseSpringBootConfig(configFile: string, content: string): ProjectEnvironment[] {
    const environments: ProjectEnvironment[] = [];

    try {
      if (configFile.endsWith('.yml') || configFile.endsWith('.yaml')) {
        const config = yaml.load(content) as any;
        
        if (config?.spring?.datasource) {
          const ds = config.spring.datasource;
          const env = this.extractEnvironmentName(configFile);
          
          const dbConfig = this.parseJdbcUrl(ds.url || ds['jdbc-url']);
          if (dbConfig && dbConfig.host) {
            environments.push({
              name: env,
              displayName: `${env} (Spring Boot)`,
              config: {
                host: dbConfig.host,
                port: dbConfig.port || 3306,
                user: ds.username || ds.user || 'root',
                password: ds.password || '',
                database: dbConfig.database
              },
              source: configFile,
              type: 'detected'
            });
          }
        }
      } else if (configFile.endsWith('.properties')) {
        const props = this.parseProperties(content);
        const jdbcUrl = props['spring.datasource.url'] || props['spring.datasource.jdbc-url'];
        
        if (jdbcUrl) {
          const dbConfig = this.parseJdbcUrl(jdbcUrl);
          if (dbConfig && dbConfig.host) {
            const env = this.extractEnvironmentName(configFile);
            environments.push({
              name: env,
              displayName: `${env} (Spring Boot)`,
              config: {
                host: dbConfig.host,
                port: dbConfig.port || 3306,
                user: props['spring.datasource.username'] || props['spring.datasource.user'] || 'root',
                password: props['spring.datasource.password'] || '',
                database: dbConfig.database
              },
              source: configFile,
              type: 'detected'
            });
          }
        }
      }
    } catch (error) {
      console.warn(`解析 Spring Boot 配置失败: ${configFile}`, error);
    }

    return environments;
  }

  /**
   * 解析环境变量配置
   */
  private parseEnvConfig(configFile: string, content: string): ProjectEnvironment[] {
    const environments: ProjectEnvironment[] = [];
    const env = this.extractEnvironmentName(configFile);
    
    try {
      const envVars = this.parseEnvFile(content);
      
      const host = envVars.DB_HOST || envVars.MYSQL_HOST || 'localhost';
      const port = parseInt(envVars.DB_PORT || envVars.MYSQL_PORT || '3306');
      const database = envVars.DB_DATABASE || envVars.MYSQL_DATABASE || envVars.DB_NAME;
      const user = envVars.DB_USERNAME || envVars.MYSQL_USER || envVars.DB_USER || 'root';
      const password = envVars.DB_PASSWORD || envVars.MYSQL_PASSWORD || '';

      if (host && database) {
        environments.push({
          name: env,
          displayName: `${env} (${host}:${port}/${database})`,
          config: {
            host,
            port,
            user,
            password,
            database
          },
          source: configFile,
          type: 'detected'
        });
      }
    } catch (error) {
      console.warn(`解析 ENV 配置失败: ${configFile}`, error);
    }

    return environments;
  }

  /**
   * 解析通用配置
   */
  private parseGenericConfig(configFile: string, content: string): ProjectEnvironment[] {
    // 尝试解析 JSON 或 YAML
    try {
      let config: any;
      
      if (configFile.endsWith('.json')) {
        config = JSON.parse(content);
      } else if (configFile.endsWith('.yml') || configFile.endsWith('.yaml')) {
        config = yaml.load(content);
      } else {
        return [];
      }

      // 尝试从配置中提取数据库信息
      const dbConfigs = this.extractDatabaseConfigs(config);
      return dbConfigs.map(dbConfig => ({
        name: dbConfig.name || 'default',
        displayName: `${dbConfig.name || 'default'} (${configFile})`,
        config: dbConfig.config,
        source: configFile,
        type: 'detected' as const
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * 解析 JDBC URL
   */
  private parseJdbcUrl(jdbcUrl: string): Partial<MySQLConnectionConfig> | null {
    if (!jdbcUrl) return null;

    // 解析 JDBC URL: jdbc:mysql://host:port/database
    const match = jdbcUrl.match(/jdbc:mysql:\/\/([^:]+):?(\d+)?\/([^?]+)/);
    if (match) {
      return {
        host: match[1],
        port: parseInt(match[2] || '3306'),
        database: match[3]
      };
    }

    return null;
  }

  /**
   * 解析 Properties 文件
   */
  private parseProperties(content: string): Record<string, string> {
    const props: Record<string, string> = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          props[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return props;
  }

  /**
   * 解析 ENV 文件
   */
  private parseEnvFile(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
          // 移除引号
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key.trim()] = value;
        }
      }
    });

    return envVars;
  }

  /**
   * 从配置对象中提取数据库配置
   */
  private extractDatabaseConfigs(config: any): Array<{name: string, config: MySQLConnectionConfig}> {
    const configs: Array<{name: string, config: MySQLConnectionConfig}> = [];
    
    // 递归搜索数据库配置
    const searchConfig = (obj: any, path: string[] = []): void => {
      if (typeof obj !== 'object' || obj === null) return;

      // 检查是否包含数据库配置字段
      if (obj.host && (obj.database || obj.db)) {
        configs.push({
          name: path.join('.') || 'default',
          config: {
            host: obj.host,
            port: parseInt(obj.port || '3306'),
            user: obj.user || obj.username || 'root',
            password: obj.password || '',
            database: obj.database || obj.db
          }
        });
      }

      // 递归搜索
      for (const [key, value] of Object.entries(obj)) {
        searchConfig(value, [...path, key]);
      }
    };

    searchConfig(config);
    return configs;
  }

  /**
   * 从文件名提取环境名称
   */
  private extractEnvironmentName(configFile: string): string {
    const basename = path.basename(configFile);
    
    // Spring Boot 模式: application-dev.yml -> dev
    const springMatch = basename.match(/application-(.+)\.(yml|yaml|properties)/);
    if (springMatch) {
      return springMatch[1];
    }

    // ENV 模式: .env.development -> development
    const envMatch = basename.match(/\.env\.(.+)/);
    if (envMatch) {
      return envMatch[1];
    }

    // 默认环境名称
    if (basename === 'application.yml' || basename === 'application.yaml' || basename === 'application.properties') {
      return 'default';
    }
    
    if (basename === '.env') {
      return 'local';
    }

    return path.parse(basename).name;
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.rootPath, filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 查找匹配模式的文件
   */
  private async findFiles(pattern: string): Promise<string[]> {
    // 简化的文件查找实现
    // 实际项目中可以使用 glob 库
    return [];
  }
}
