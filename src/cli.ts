#!/usr/bin/env node

import { Command } from "commander";
import {
  TestEngine,
  validateConfig,
  BenchmarkConfig,
  runComparison,
  generateComparisonReport,
  ServerConfig,
  ComparisonTestConfig,
} from "thunderbench";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";

const program = new Command();

program
  .name("thunderbench")
  .description("高性能API性能测试工具，基于WRK引擎")
  .version("1.1.0");

// ============================================================
// 主命令: 运行单个测试
// ============================================================
program
  .command("run", { isDefault: true })
  .description("运行性能测试")
  .option("-c, --config <path>", "配置文件路径", "./test-config.js")
  .option("-v, --verbose", "详细输出模式")
  .option("--no-report", "不生成报告文件")
  .option("--no-progress", "不显示实时进度")
  .option("-o, --output <dir>", "报告输出目录", "./reports")
  .option("--timeout <ms>", "全局超时时间(毫秒)", "30000")
  .option("--concurrent <number>", "全局并发数覆盖", "10")
  .option("--dry-run", "仅验证配置，不执行测试")
  .option("--cleanup-wrk", "测试完成后清理 wrk 脚本文件")
  .action(runBenchmark);

// ============================================================
// 对比命令: 框架对比测试
// ============================================================
program
  .command("compare")
  .description("运行框架对比测试")
  .requiredOption("-c, --config <path>", "对比测试配置文件路径")
  .option("-o, --output <dir>", "报告输出目录", "./comparison-reports")
  .option("-v, --verbose", "详细输出模式")
  .option("--format <formats>", "报告格式 (markdown,json)", "markdown,json")
  .action(runComparisonTest);

// ============================================================
// 工具命令
// ============================================================
program
  .command("create-config")
  .description("创建示例配置文件")
  .option("--type <type>", "配置类型 (single, comparison)", "single")
  .action(createExampleConfig);

program
  .command("validate")
  .description("验证配置文件")
  .requiredOption("-c, --config <path>", "配置文件路径")
  .action(validateConfigFile);

program.parse();

// ============================================================
// 命令实现
// ============================================================

async function runBenchmark(options: {
  config: string;
  verbose?: boolean;
  report?: boolean;
  progress?: boolean;
  output: string;
  timeout: string;
  concurrent: string;
  dryRun?: boolean;
  cleanupWrk?: boolean;
}) {
  try {
    console.log(chalk.blue.bold("\nThunderBench - 高性能API性能测试工具"));
    console.log(chalk.gray("版本 1.1.0 | 基于内置 WRK 引擎\n"));

    const configPath = path.resolve(options.config);
    console.log(chalk.blue(`配置文件: ${configPath}`));

    if (!(await fileExists(configPath))) {
      console.error(chalk.red(`配置文件不存在: ${configPath}`));
      console.log(chalk.yellow("使用 'thunderbench create-config' 创建示例配置文件"));
      process.exit(1);
    }

    const spinner = ora("加载配置文件...").start();
    let config: BenchmarkConfig;

    try {
      const configModule = await import(configPath);
      config = configModule.default || configModule.config;
      spinner.succeed("配置文件加载成功");
    } catch (error) {
      spinner.fail("配置文件加载失败");
      console.error(chalk.red("错误详情:"), error);
      process.exit(1);
    }

    // 应用全局选项覆盖
    if (options.timeout) {
      const timeout = parseInt(options.timeout);
      config.groups.forEach((group) => {
        if (group.http) {
          group.http.timeout = timeout;
        }
      });
    }

    if (options.concurrent && options.concurrent !== "10") {
      const concurrent = parseInt(options.concurrent);
      config.groups.forEach((group) => {
        group.threads = Math.min(12, Math.ceil(concurrent / 10));
        group.connections = concurrent;
      });
      console.log(chalk.yellow(`全局并发数设置为: ${concurrent}`));
    }

    // 干运行模式
    if (options.dryRun) {
      console.log(chalk.blue("\n干运行模式 - 仅验证配置"));
      try {
        validateConfig(config);
        console.log(chalk.green("✅ 配置验证通过"));
      } catch (error) {
        console.error(chalk.red("❌ 配置验证失败:"), error);
        process.exit(1);
      }
      return;
    }

    // 创建测试引擎
    const engine = new TestEngine(config, {
      outputDir: options.output,
      cleanupScripts: options.cleanupWrk,
      showProgress: options.progress,
      verbose: options.verbose,
    });

    // 运行测试
    console.log(chalk.blue("\n开始 WRK 基准测试..."));
    await engine.runBenchmark();

    console.log(chalk.green("\n✅ 测试完成！"));
    console.log(chalk.blue(`报告已保存到: ${options.output}`));
  } catch (error) {
    console.error(chalk.red("\n❌ 测试执行失败:"), error);
    process.exit(1);
  }
}

async function runComparisonTest(options: {
  config: string;
  output: string;
  verbose?: boolean;
  format: string;
}) {
  try {
    console.log(chalk.blue.bold("\nThunderBench - 框架对比测试"));
    console.log(chalk.gray("版本 1.1.0 | 支持多框架自动对比\n"));

    const configPath = path.resolve(options.config);
    console.log(chalk.blue(`配置文件: ${configPath}`));

    if (!(await fileExists(configPath))) {
      console.error(chalk.red(`配置文件不存在: ${configPath}`));
      console.log(chalk.yellow("使用 'thunderbench create-config --type comparison' 创建示例配置文件"));
      process.exit(1);
    }

    const spinner = ora("加载对比测试配置...").start();
    let comparisonConfig: {
      servers: ServerConfig[];
      testConfig: ComparisonTestConfig;
    };

    try {
      const configModule = await import(configPath);
      comparisonConfig = configModule.default || configModule;
      spinner.succeed("配置加载成功");
    } catch (error) {
      spinner.fail("配置加载失败");
      console.error(chalk.red("错误详情:"), error);
      process.exit(1);
    }

    // 运行对比测试
    const result = await runComparison(
      comparisonConfig.servers,
      comparisonConfig.testConfig,
      {
        outputDir: options.output,
        verbose: options.verbose,
      }
    );

    // 生成报告
    const formats = options.format.split(",").map((f) => f.trim()) as ("markdown" | "json")[];
    const reportFiles = await generateComparisonReport(result, {
      outputDir: options.output,
      formats,
    });

    console.log(chalk.green("\n✅ 对比测试完成！"));
    console.log(chalk.blue("报告文件:"));
    reportFiles.forEach((file) => console.log(chalk.gray(`  - ${file}`)));
  } catch (error) {
    console.error(chalk.red("\n❌ 对比测试失败:"), error);
    process.exit(1);
  }
}

async function createExampleConfig(options: { type: string }) {
  const type = options.type;

  if (type === "comparison") {
    await createComparisonConfigExample();
  } else {
    await createSingleConfigExample();
  }
}

async function createSingleConfigExample() {
  const exampleContent = `/**
 * ThunderBench 性能测试配置
 */
module.exports = {
  name: "API性能测试",
  description: "测试 API 端点的性能表现",
  groups: [
    {
      name: "基础测试组",
      http: {
        baseUrl: "http://localhost:3000",
        headers: {
          "User-Agent": "thunderbench/1.0"
        }
      },
      threads: 4,
      connections: 100,
      duration: 30,
      timeout: 5,
      latency: true,
      executionMode: "parallel",
      tests: [
        {
          name: "健康检查",
          request: {
            method: "GET",
            url: "/health"
          },
          weight: 30
        },
        {
          name: "获取用户列表",
          request: {
            method: "GET",
            url: "/api/users"
          },
          weight: 40
        },
        {
          name: "创建用户",
          request: {
            method: "POST",
            url: "/api/users",
            body: { name: "Test User", email: "test@example.com" }
          },
          weight: 30
        }
      ]
    }
  ]
};`;

  const configPath = "./thunderbench.config.js";
  try {
    await fs.writeFile(configPath, exampleContent);
    console.log(chalk.green(`✅ 示例配置文件已创建: ${configPath}`));
    console.log(chalk.blue("运行测试:"));
    console.log(chalk.gray(`  thunderbench run --config ${configPath}`));
  } catch (error) {
    console.error(chalk.red("❌ 创建配置文件失败:"), error);
  }
}

async function createComparisonConfigExample() {
  const exampleContent = `/**
 * ThunderBench 框架对比测试配置
 */

/** @type {import('thunderbench').ServerConfig[]} */
const servers = [
  {
    name: "Framework-A",
    command: "bun",
    args: ["run", "server-a.ts"],
    port: 3001,
    healthCheckPath: "/health",
    startupTimeout: 10000,
    warmupRequests: 100,
  },
  {
    name: "Framework-B",
    command: "bun",
    args: ["run", "server-b.ts"],
    port: 3002,
    healthCheckPath: "/health",
    startupTimeout: 10000,
    warmupRequests: 100,
  },
];

/** @type {import('thunderbench').ComparisonTestConfig} */
const testConfig = {
  name: "框架性能对比",
  description: "对比多个 Web 框架的性能",
  threads: 4,
  connections: 100,
  duration: 30,
  scenarios: [
    {
      name: "Hello World",
      method: "GET",
      path: "/",
      weight: 40,
    },
    {
      name: "JSON API",
      method: "GET",
      path: "/api/users",
      weight: 30,
    },
    {
      name: "动态路由",
      method: "GET",
      path: "/api/users/123",
      weight: 20,
    },
    {
      name: "POST 请求",
      method: "POST",
      path: "/api/users",
      headers: { "Content-Type": "application/json" },
      body: { name: "Test", email: "test@test.com" },
      weight: 10,
    },
  ],
};

module.exports = { servers, testConfig };
`;

  const configPath = "./comparison.config.js";
  try {
    await fs.writeFile(configPath, exampleContent);
    console.log(chalk.green(`✅ 对比测试配置文件已创建: ${configPath}`));
    console.log(chalk.blue("运行对比测试:"));
    console.log(chalk.gray(`  thunderbench compare --config ${configPath}`));
  } catch (error) {
    console.error(chalk.red("❌ 创建配置文件失败:"), error);
  }
}

async function validateConfigFile(options: { config: string }) {
  try {
    const configPath = path.resolve(options.config);

    if (!(await fileExists(configPath))) {
      console.error(chalk.red(`配置文件不存在: ${configPath}`));
      process.exit(1);
    }

    const spinner = ora("验证配置文件...").start();

    try {
      const configModule = await import(configPath);
      const config = configModule.default || configModule.config || configModule;

      // 判断是单个测试配置还是对比测试配置
      if (config.groups) {
        validateConfig(config);
        spinner.succeed("单测试配置验证通过");
      } else if (config.servers && config.testConfig) {
        // 对比测试配置
        spinner.succeed("对比测试配置格式正确");
        console.log(chalk.blue(`  服务器数量: ${config.servers.length}`));
        console.log(chalk.blue(`  测试场景: ${config.testConfig.scenarios?.length || 0}`));
      } else {
        spinner.fail("无法识别的配置格式");
        process.exit(1);
      }
    } catch (error) {
      spinner.fail("配置验证失败");
      console.error(chalk.red("错误详情:"), error);
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("❌ 验证失败:"), error);
    process.exit(1);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
