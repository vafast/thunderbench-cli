/**
 * 示例性能测试配置
 */

import type { BenchmarkConfig } from "thunderbench";

const config: BenchmarkConfig = {
  name: "示例性能测试",
  description: "这是一个示例配置文件",
  groups: [
    {
      name: "基础测试组",
      http: {
        baseUrl: "http://localhost:3002",
        headers: {
          "User-Agent": "thunderbench/1.0",
        },
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
            url: "/api/test",
          },
          weight: 100,
        },
      ],
    },
  ],
};

export default config;

