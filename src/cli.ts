#!/usr/bin/env node

import { Command } from "commander";
import { TestEngine, validateConfig, BenchmarkConfig } from "thunderbench-core";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";

const program = new Command();

program
  .name("thunderbench")
  .description("高性能API性能测试工具，基于WRK引擎")
  .version("1.0.0")
  .option("-c, --config <path>", "配置文件路径", "./examples/test-config.js")
  .option("-v, --verbose", "详细输出模式")
  .option("--no-report", "不生成报告文件")
  .option("--no-progress", "不显示实时进度")
  .option("-o, --output <dir>", "报告输出目录", "./reports")
  .option("--timeout <ms>", "全局超时时间(毫秒)", "30000")
  .option("--concurrent <number>", "全局并发数覆盖", "10")
  .option("--dry-run", "仅验证配置，不执行测试")
  .option("--list-examples", "列出示例配置文件")
  .option("--create-example", "创建示例配置文件")
  .option("--cleanup-wrk", "测试完成后清理 wrk 脚本文件");

program.parse();

const options = program.opts();

async function main() {
  try {
    // 显示欢迎信息
    console.log(chalk.blue.bold("\nThunderBench - 高性能API性能测试工具"));
    console.log(chalk.gray("版本 1.0.0 | 基于内置 WRK 引擎\n"));

    // 处理特殊选项
    if (options.listExamples) {
      await listExamples();
      return;
    }

    if (options.createExample) {
      await createExampleConfig();
      return;
    }

    // 验证配置文件
    const configPath = path.resolve(options.config);
    console.log(chalk.blue(`配置文件: ${configPath}`));

    if (!(await fileExists(configPath))) {
      console.error(chalk.red(`配置文件不存在: ${configPath}`));
      console.log(chalk.yellow("使用 --create-example 创建示例配置文件"));
      process.exit(1);
    }

    // 加载配置
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
      config.groups.forEach((group: any) => {
        if (group.http) {
          group.http.timeout = timeout;
        }
      });
      console.log(chalk.yellow(`全局超时时间设置为: ${timeout}ms`));
    }

    if (options.concurrent && options.concurrent !== "10") {
      const concurrent = parseInt(options.concurrent);
      config.groups.forEach((group: any) => {
        // 将全局并发数转换为线程数和连接数
        group.threads = Math.min(12, Math.ceil(concurrent / 10)); // 每线程最多10个连接
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
    const result = await engine.runBenchmark();

    // 显示结果
    console.log(chalk.green("\n✅ 测试完成！"));
    console.log(chalk.blue(`报告已保存到: ${options.output}`));
  } catch (error) {
    console.error(chalk.red("\n❌ 测试执行失败:"), error);
    process.exit(1);
  }
}

async function listExamples() {
  console.log(chalk.blue("\n📚 可用的示例配置文件:"));
  console.log(chalk.gray("examples/simple-wrk-config.js - 简单配置示例"));
  console.log(chalk.gray("examples/complex-config.ts - 复杂配置示例"));
  console.log(chalk.gray("examples/parallel-test.ts - 并行测试示例"));
  console.log(chalk.gray("examples/serial-vs-parallel-demo.ts - 串行vs并行对比"));
}

async function createExampleConfig() {
  const exampleContent = `module.exports = {
  name: "示例性能测试",
  description: "这是一个示例配置文件",
  groups: [
    {
      name: "基础测试组",
      http: {
        baseUrl: "http://localhost:3000",
        headers: {
          "User-Agent": "thunderbench/1.0"
        }
      },
      threads: 2,
      connections: 50,
      duration: 10,
      timeout: 5,
      latency: true,
      executionMode: "parallel",
      tests: [
        {
          name: "GET 请求测试",
          request: {
            method: "GET",
            url: "/api/test"
          },
          weight: 100
        }
      ]
    }
  ]
};`;

  const configPath = "./test-config.js";
  try {
    await fs.writeFile(configPath, exampleContent);
    console.log(chalk.green(`✅ 示例配置文件已创建: ${configPath}`));
    console.log(chalk.blue("现在可以使用以下命令运行测试:"));
    console.log(chalk.gray(`thunderbench --config ${configPath}`));
  } catch (error) {
    console.error(chalk.red("❌ 创建示例配置文件失败:"), error);
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

main();
