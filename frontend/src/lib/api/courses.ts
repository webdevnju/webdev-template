import type { components } from "./generated/schema";
import { apiClient } from "./client";
import { ApiError } from "./errors";

export type Course = components["schemas"]["Course"];
export type CreateCourse = components["schemas"]["CreateCourse"];

type ListCoursesOptions = {
  keyword?: string;
  signal?: AbortSignal;
};

export async function listCourses({
  keyword,
  signal,
}: ListCoursesOptions = {}): Promise<Course[]> {
  const { data, error, response } = await apiClient.GET("/api/courses", {
    params: { query: { keyword } },
    signal,
  });

  if (error) {
    throw new ApiError(response.status, error);
  }

  return data.data;
}

export async function createCourse(course: CreateCourse): Promise<Course> {
  const { data, error, response } = await apiClient.POST("/api/courses", {
    body: course,
  });

  if (error) {
    throw new ApiError(response.status, error);
  }

  return data.data;
}
