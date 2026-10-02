import { Router } from "express";
import HealthController from "../controllers/health.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Check whether the API process is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: The API process is running
 */
router.get("/live", HealthController.liveness.bind(HealthController));

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Check whether the API can serve database-backed requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: The API and its database are ready
 *       503:
 *         description: The database is temporarily unavailable
 */
router.get("/ready", asyncHandler(HealthController.readiness.bind(HealthController)));

export default router;
