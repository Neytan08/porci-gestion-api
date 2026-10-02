import type { Request, Response } from "express";
import { isApplicationReady } from "../services/health/healthService";

class HealthController {
  /** Confirms that the Node.js process can accept HTTP requests. */
  liveness(_: Request, res: Response) {
    return res.json({ status: "ok" });
  }

  /** Confirms that dependencies required by normal API requests are available. */
  async readiness(_: Request, res: Response) {
    const ready = await isApplicationReady();
    return res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
  }
}

export default new HealthController();
