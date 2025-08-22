import http from 'http';

const server = http.createServer((req, res) => {
  // 添加随机延迟模拟真实API
  const delay = Math.random() * 100;
  
  setTimeout(() => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Hello from test server',
      timestamp: new Date().toISOString(),
      delay: `${delay.toFixed(2)}ms`
    }));
  }, delay);
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`🚀 测试服务器启动: http://localhost:${PORT}`);
  console.log('📊 可用接口:');
  console.log('  GET / - 返回 JSON 响应');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});
