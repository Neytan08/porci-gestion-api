import { Router } from "express";
import StatusController from "../controllers/status.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

/**
 * The property "bind" is used to ensure that "this" inside the controller
 * methods refers to the controller instance
*/

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Status
 *   description: Operations related to sow statuses
 */

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get all statuses
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: List of all statuses
 */
router.get("/", asyncHandler(StatusController.getAll.bind(StatusController)));

/**
 * @swagger
 * /status/{id}:
 *   get:
 *     summary: Get a status by ID
 *     tags: [Status]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the status
 *     responses:
 *       200:
 *         description: Status found
 *       404:
 *         description: Status not found
 */
router.get("/:id", asyncHandler(StatusController.getById.bind(StatusController)));

/**
 * @swagger
 * /status:
 *   post:
 *     summary: Create a new status
 *     tags: [Status]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status_name:
 *                 type: string
 *                 example: Active
 *     responses:
 *       201:
 *         description: Status created successfully
 */
router.post("/", asyncHandler(StatusController.create.bind(StatusController)));

/**
 * @swagger
 * /status/{id}:
 *   put:
 *     summary: Update a status by ID
 *     tags: [Status]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the status to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status_name:
 *                 type: string
 *                 example: Retired
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Status not found
 */
router.put("/:id", asyncHandler(StatusController.update.bind(StatusController)));

/**
 * @swagger
 * /status/{id}:
 *   delete:
 *     summary: Delete a status by ID
 *     tags: [Status]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the status to delete
 *     responses:
 *       204:
 *         description: Status deleted successfully
 *       404:
 *         description: Status not found
 */
router.delete("/:id", asyncHandler(StatusController.delete.bind(StatusController)));

export default router;