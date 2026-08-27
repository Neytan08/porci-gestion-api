import { Router } from "express";
import matingEventsController from "../controllers/matingEvents.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: integer
 *           example: 409
 *         errorCode:
 *           type: string
 *           example: SOW_NOT_EMPTY
 *         message:
 *           type: string
 *           example: The sow must be in empty status before creating a mating event.
 */

/**
 * @swagger
 * tags:
 *   name: MatingEvents
 *   description: Operations related to mating events of sows and boars
 */

/**
 * @swagger
 * /matingevents:
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
 * /matingevents/{id}:
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get("/:id", asyncHandler(matingEventsController.getById.bind(matingEventsController)));

/**
 * @swagger
 * /matingevents:
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
 *                 example: 5
 *               boar_id:
 *                 type: integer
 *                 example: 1
 *               reproduction_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-05"
 *               reproduction_type:
 *                 type: string
 *                 example: "Inseminación Artificial"
 *               pregnancy_result:
 *                 type: string
 *                 example: "Pendiente"
 *               notes:
 *                 type: string
 *                 example: "First reproduction attempt of the season"
 *     responses:
 *       201:
 *         description: Mating event created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: The sow is not eligible for creating a mating event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post("/", asyncHandler(matingEventsController.create.bind(matingEventsController)));

/**
 * @swagger
 * /matingevents/{id}:
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
 *                 example: 1
 *               insemination_type:
 *                 type: string
 *                 example: "Artificial"
 *               insemination_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-05"
 *               pregnancy_result:
 *                 type: string
 *                 example: "Pendiente"
 *               notes:
 *                 type: string
 *                 example: "Updated notes after check"
 *     responses:
 *       200:
 *         description: Mating event updated successfully
 *       400:
 *         description: Invalid update payload or invalid identifier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: Mating event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.put("/:id", asyncHandler(matingEventsController.update.bind(matingEventsController)));

/**
 * @swagger
 * /matingevents/{id}:
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.delete("/:id", asyncHandler(matingEventsController.delete.bind(matingEventsController)));

/**
 * @swagger
 * /matingevents/sow/{sowId}:
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
 *         description: List of mating events for the sow. Returns an empty array when no records exist.
 *       400:
 *         description: Invalid sow id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  "/sow/:sowId",
  asyncHandler(matingEventsController.getAllMatingEventsBySow.bind(matingEventsController)),
);

/**
 * @swagger
 * /matingevents/boar/{boarId}:
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
 *         description: List of mating events for the boar. Returns an empty array when no records exist.
 *       400:
 *         description: Invalid boar id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  "/boar/:boarId",
  asyncHandler(matingEventsController.getAllMatingEventsByBoar.bind(matingEventsController)),
);

/**
 * @swagger
 * /matingevents/grouped/pregnancy-result:
 *   get:
 *     summary: Get all mating events grouped by pregnancy result
 *     tags: [MatingEvents]
 *     responses:
 *       200:
 *         description: List of mating events grouped by pregnancy result
 */
router.get(
  "/grouped/pregnancy-result",
  asyncHandler(matingEventsController.getAllGroupedByPregnancyResult.bind(matingEventsController)),
);

/**
 * @swagger
 * /matingevents/update/pregnancy-result:
 *   put:
 *     summary: Update the pregnancy result for one or many mating events
 *     tags: [MatingEvents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mating_ids:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *                 example: [1, 2]
 *               pregnancy_result:
 *                 type: string
 *                 example: Positivo
 *     responses:
 *       200:
 *         description: Pregnancy result updated successfully
 *       400:
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: One or more mating events were not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: Business rule conflict while updating the pregnancy result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.put(
  "/update/pregnancy-result",
  asyncHandler(matingEventsController.updatePregnancyResult.bind(matingEventsController)),
);

export default router;