#!/usr/bin/env node

/**
 * MySQL MCP 服务器测试脚本
 * 用于验证 MCP 服务器是否正常工作
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 测试消息
const testMessages = [
  // 1. 初始化请求
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: {
          listChanged: true
        }
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  },
  
  // 2. 列出工具
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  },
  
  // 3. 测试连接工具
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "mysql_connect",
      arguments: {
        host: "localhost",
        port: 3306,
        user: "root",
        password: "test123",
        database: "test",
        connectionType: "direct"
      }
    }
  }
];

console.log('🚀 启动 MySQL MCP 服务器测试...\n');

// 启动 MCP 服务器
const mcpServer = spawn('node', ['build/index.js'], {
  cwd: projectRoot,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    MYSQL_HOST: 'localhost',
    MYSQL_PORT: '3306',
    MYSQL_USER: 'root',
    MYSQL_PASSWORD: 'test123',
    MYSQL_DATABASE: 'test'
  }
});

let messageId = 0;

// 处理服务器输出
mcpServer.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('📥 收到响应:', JSON.stringify(response, null, 2));
      
      // 发送下一个测试消息
      if (messageId < testMessages.length) {
        setTimeout(() => sendNextMessage(), 1000);
      } else {
        console.log('\n✅ 测试完成！');
        mcpServer.kill();
        process.exit(0);
      }
    } catch (error) {
      console.log('📄 服务器日志:', line);
    }
  });
});

mcpServer.stderr.on('data', (data) => {
  console.log('🔍 服务器错误/日志:', data.toString());
});

mcpServer.on('close', (code) => {
  console.log(`\n🔚 MCP 服务器退出，代码: ${code}`);
});

// 发送测试消息
function sendNextMessage() {
  if (messageId < testMessages.length) {
    const message = testMessages[messageId];
    console.log(`\n📤 发送消息 ${messageId + 1}:`, JSON.stringify(message, null, 2));
    
    mcpServer.stdin.write(JSON.stringify(message) + '\n');
    messageId++;
  }
}

// 等待服务器启动后发送第一个消息
setTimeout(() => {
  console.log('📡 开始发送测试消息...\n');
  sendNextMessage();
}, 2000);

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 测试被中断');
  mcpServer.kill();
  process.exit(0);
});

// 超时保护
setTimeout(() => {
  console.log('\n⏰ 测试超时，退出');
  mcpServer.kill();
  process.exit(1);
}, 30000);
