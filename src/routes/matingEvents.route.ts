import { Router } from "express";
import matingEventsController from "../controllers/matingEvents.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: MatingEvents
 *   description: Operations related to mating events of sows and boars
 */

/**
 * @swagger
 * /mating-events:
 *   get:
 *     summary: Get all mating events
 *     tags: [MatingEvents]
 *     responses:
 *       200:
 *         description: List of all mating events
 */
router.get("/", asyncHandler(matingEventsController.getAll.bind(matingEventsController)));

/**
 * @swagger
 * /mating-events/{id}:
 *   get:
 *     summary: Get a mating event by ID
 *     tags: [MatingEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the mating event
 *     responses:
 *       200:
 *         description: Mating event found
 *       404:
 *         description: Mating event not found
 */
router.get("/:id", asyncHandler(matingEventsController.getById.bind(matingEventsController)));

/**
 * @swagger
 * /mating-events:
 *   post:
 *     summary: Create a new mating event
 *     tags: [MatingEvents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sow_id:
 *                 type: integer
 *                 example: 1
 *               boar_id:
 *                 type: integer
 *                 example: 2
 *               insemination_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-05"
 *               insemination_type:
 *                 type: string
 *                 example: "Artificial"
 *               notes:
 *                 type: string
 *                 example: "First insemination attempt of the season"
 *     responses:
 *       201:
 *         description: Mating event created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", asyncHandler(matingEventsController.create.bind(matingEventsController)));

/**
 * @swagger
 * /mating-events/{id}:
 *   put:
 *     summary: Update an existing mating event
 *     tags: [MatingEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the mating event to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               boar_id:
 *                 type: integer
 *                 example: 3
 *               insemination_type:
 *                 type: string
 *                 example: "Natural"
 *               notes:
 *                 type: string
 *                 example: "Updated notes after check"
 *     responses:
 *       200:
 *         description: Mating event updated successfully
 *       404:
 *         description: Mating event not found
 */
router.put("/:id", asyncHandler(matingEventsController.update.bind(matingEventsController)));

/**
 * @swagger
 * /mating-events/{id}:
 *   delete:
 *     summary: Delete a mating event by ID
 *     tags: [MatingEvents]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the mating event to delete
 *     responses:
 *       204:
 *         description: Mating event deleted successfully
 *       404:
 *         description: Mating event not found
 */
router.delete("/:id", asyncHandler(matingEventsController.delete.bind(matingEventsController)));

/**
 * @swagger
 * /mating-events/sow/{sowId}:
 *   get:
 *     summary: Get all mating events for a specific sow
 *     tags: [MatingEvents]
 *     parameters:
 *       - in: path
 *         name: sowId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the sow
 *     responses:
 *       200:
 *         description: List of mating events for the sow
 *       404:
 *         description: No mating events found for this sow
 */
router.get("/sow/:sowId", asyncHandler(matingEventsController.getAllMatingEventsBySow.bind(matingEventsController)));

/**
 * @swagger
 * /mating-events/boar/{boarId}:
 *   get:
 *     summary: Get all mating events for a specific boar
 *     tags: [MatingEvents]
 *     parameters:
 *       - in: path
 *         name: boarId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the boar
 *     responses:
 *       200:
 *         description: List of mating events for the boar
 *       404:
 *         description: No mating events found for this boar
 */
router.get("/boar/:boarId", asyncHandler(matingEventsController.getAllMatingEventsByBoar.bind(matingEventsController)));

export default router;