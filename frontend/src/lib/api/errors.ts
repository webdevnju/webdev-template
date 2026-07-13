import type { components } from "./generated/schema";

type ErrorResponse = components["schemas"]["ErrorResponse"];

export class ApiError extends Error {
  readonly code: ErrorResponse["error"]["code"];
  readonly details: ErrorResponse["error"]["details"];
  readonly requestId: string;
  readonly status: number;

  constructor(status: number, response: ErrorResponse) {
    super(response.error.message);
    this.name = "ApiError";
    this.code = response.error.code;
    this.details = response.error.details;
    this.requestId = response.requestId;
    this.status = status;
  }
}
