# ThunderBench CLI

ThunderBench 命令行工具 - 高性能 API 性能测试工具

## 🚀 特性

- **简单易用**：一键启动性能测试
- **配置灵活**：支持 JavaScript/TypeScript 配置文件
- **实时监控**：测试进度和结果实时显示
- **报告生成**：自动生成详细的测试报告
- **基于核心包**：使用 thunderbench 核心引擎

## 📦 安装

```bash
npm install -g thunderbench-cli
# 或
npm install -g thunderbench-cli
```

## 💻 使用方法

### 基本命令

```bash
# 查看帮助
thunderbench --help

# 查看版本
thunderbench --version

# 列出示例配置
thunderbench --list-examples

# 创建示例配置
thunderbench --create-example
```

### 运行测试

```bash
# 使用配置文件运行测试
thunderbench --config config.js

# 详细模式
thunderbench --config config.js --verbose

# 指定输出目录
thunderbench --config config.js -o ./reports

# 干运行（只验证配置）
thunderbench --config config.js --dry-run
```

## 📊 配置文件格式

创建 `config.js` 文件：

```javascript
module.exports = {
  name: "API 性能测试",
  description: "测试 API 接口性能",
  groups: [
    {
      name: "用户接口测试",
      http: {
        baseUrl: "http://localhost:3000",
        headers: {
          "User-Agent": "thunderbench/1.0",
          "Content-Type": "application/json"
        }
      },
      threads: 2,           // 线程数
      connections: 50,       // 连接数
      duration: 30,          // 测试时长（秒）
      timeout: 10,           // 超时时间（秒）
      latency: true,         // 是否记录延迟
      executionMode: "parallel", // 执行模式：parallel/serial
      tests: [
        {
          name: "获取用户列表",
          request: {
            method: "GET",
            url: "/api/users",
            headers: {}
          },
          weight: 60          // 权重
        },
        {
          name: "创建用户",
          request: {
            method: "POST",
            url: "/api/users",
            headers: {},
            body: JSON.stringify({
              name: "测试用户",
              email: "test@example.com"
            })
          },
          weight: 40          // 权重
        }
      ]
    }
  ]
};
```

## 🔧 命令行选项

| 选项 | 简写 | 描述 |
|------|------|------|
| `--config <file>` | `-c` | 配置文件路径 |
| `--output-dir <dir>` | `-o` | 输出目录 |
| `--verbose` | `-v` | 详细输出 |
| `--dry-run` | `-d` | 干运行（只验证配置） |
| `--create-example` | | 创建示例配置文件 |
| `--list-examples` | | 列出可用示例 |
| `--help` | `-h` | 显示帮助信息 |
| `--version` | `-V` | 显示版本信息 |

## 📈 测试结果

测试完成后，会显示：

```
────────────────────────────────────────────────────────────
                ThunderBench 性能测试结果
────────────────────────────────────────────────────────────
总耗时: 30.05s
总请求数: 2,847
成功: 2,847 (100.0%)
平均延迟: 52.34ms
P95延迟: 98.67ms
吞吐量: 94.7 req/s
延迟分布: P50: 45ms | P90: 78ms | P95: 98.67ms | P99: 156ms
────────────────────────────────────────────────────────────
```

## 📁 输出文件

测试完成后会在输出目录生成：

- `summary.md` - 测试总结报告
- `detailed-report.json` - 详细测试数据
- `wrk-output/` - WRK 原始输出

## 🛠️ 开发

```bash
# 克隆仓库
git clone https://github.com/thunderbench/thunderbench-cli.git
cd thunderbench-cli

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🔗 相关链接

- [核心引擎](https://github.com/thunderbench/thunderbench)
- [文档](https://github.com/thunderbench/thunderbench-cli)
- [问题反馈](https://github.com/thunderbench/thunderbench-cli/issues)
