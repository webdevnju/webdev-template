import type { components } from "./generated/schema";
import { apiClient } from "./client";

export type Health = components["schemas"]["Health"];

export async function getHealth(signal?: AbortSignal): Promise<Health> {
  const { data, response } = await apiClient.GET("/api/health", { signal });

  if (!data) {
    throw new Error(`API 返回了非预期状态：HTTP ${response.status}`);
  }

  return data;
}
