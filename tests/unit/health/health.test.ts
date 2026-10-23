import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import healthController from "../../../src/controllers/health.controller";
import { checkDatabaseConnection } from "../../../src/services/health/healthQueries";

vi.mock("../../../src/services/health/healthQueries", () => ({
  checkDatabaseConnection: vi.fn(),
}));

/** Captures health responses while the real readiness service evaluates its dependency. */
function createResponse() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

describe("health dependency decisions", () => {
  it("reports readiness after a successful database check", async () => {
    vi.mocked(checkDatabaseConnection).mockResolvedValue(undefined);
    const response = createResponse();
    await healthController.readiness({} as Request, response as unknown as Response);
    expect(checkDatabaseConnection).toHaveBeenCalledExactlyOnceWith();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: "ready" });
  });

  it("reports database unavailability without exposing the underlying failure", async () => {
    vi.mocked(checkDatabaseConnection).mockRejectedValue(new Error("PRIVATE-DATABASE-DETAILS"));
    const response = createResponse();
    await healthController.readiness({} as Request, response as unknown as Response);
    expect(checkDatabaseConnection).toHaveBeenCalledExactlyOnceWith();
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ status: "unavailable" });
  });

  it("reports liveness without consulting an unavailable database", () => {
    vi.mocked(checkDatabaseConnection).mockRejectedValue(new Error("Database unavailable"));
    const response = createResponse();
    healthController.liveness({} as Request, response as unknown as Response);
    expect(response.json).toHaveBeenCalledWith({ status: "ok" });
    expect(response.status).not.toHaveBeenCalled();
    expect(checkDatabaseConnection).not.toHaveBeenCalled();
  });
});
