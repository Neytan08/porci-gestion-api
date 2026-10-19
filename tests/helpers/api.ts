import request from "supertest";
import { expect } from "vitest";
import app from "../../src/app";

export const api = request(app);

/** Asserts the public error contract without coupling tests to diagnostic log messages. */
export function expectApiError(response: request.Response, status: number, errorCode: string) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ status, errorCode, message: expect.any(String) });
  expect(response.headers["x-request-id"]).toEqual(expect.any(String));
}
