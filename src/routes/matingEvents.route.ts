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
 *           minimum: 1
 *         required: true
 *         description: ID of the mating event
 *     responses:
 *       200:
 *         description: Mating event found
 *       400:
 *         description: Invalid mating event id
 *       404:
 *         description: Mating event not found
 */
router.get("/:id", asyncHandler(matingEventsController.getById.bind(matingEventsController)));

/**
 * @swagger
 * /matingevents:
 *   post:
 *     summary: Create a new mating event
 *     description: Starts a reproductive workflow for an empty sow. The reproduction date cannot precede entry and must be at least 5 days after the last actual weaning. Positivo moves the sow to gestation; Pendiente and Negativo leave it empty.
 *     tags: [MatingEvents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sow_id, reproduction_date, reproduction_type, pregnancy_result]
 *             properties:
 *               sow_id:
 *                 type: integer
 *                 minimum: 1
 *                 example: 5
 *               boar_id:
 *                 type: integer
 *                 minimum: 1
 *                 description: Required for Monta Natural and must reference an active boar. Must be omitted for Inseminación Artificial.
 *                 example: 1
 *               reproduction_date:
 *                 type: string
 *                 description: Calendar date supplied as M/D/YYYY, YYYY-MM-DD, or an ISO 8601 timestamp with an offset; on or after sow entry and at least 14 days after the last actual weaning
 *                 example: "2025-10-05"
 *               reproduction_type:
 *                 type: string
 *                 enum: [Monta Natural, Inseminación Artificial]
 *                 example: "Monta Natural"
 *               pregnancy_result:
 *                 type: string
 *                 enum: [Pendiente, Positivo, Negativo]
 *                 example: "Pendiente"
 *               notes:
 *                 type: string
 *                 example: "First reproduction attempt of the season"
 *             oneOf:
 *               - required: [boar_id]
 *                 properties:
 *                   reproduction_type:
 *                     type: string
 *                     enum: [Monta Natural]
 *               - properties:
 *                   reproduction_type:
 *                     type: string
 *                     enum: [Inseminación Artificial]
 *                 not:
 *                   required: [boar_id]
 *           examples:
 *             naturalMating:
 *               summary: Natural mating with an active boar
 *               value:
 *                 sow_id: 5
 *                 boar_id: 1
 *                 reproduction_date: "2025-10-05"
 *                 reproduction_type: "Monta Natural"
 *                 pregnancy_result: "Pendiente"
 *             artificialInsemination:
 *               summary: Artificial insemination without a boar
 *               value:
 *                 sow_id: 5
 *                 reproduction_date: "2025-10-05"
 *                 reproduction_type: "Inseminación Artificial"
 *                 pregnancy_result: "Pendiente"
 *     responses:
 *       201:
 *         description: Mating event created successfully
 *       400:
 *         description: Validation error, invalid reproductive chronology, or boar selection inconsistent with the reproduction type
 *       404:
 *         description: Selected sow or boar not found
 *       409:
 *         description: The sow is not eligible or the selected boar is retired
 */
router.post("/", asyncHandler(matingEventsController.create.bind(matingEventsController)));

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
 *           minimum: 1
 *         required: true
 *         description: ID of the mating event to delete
 *     responses:
 *       204:
 *         description: Mating event deleted successfully
 *       400:
 *         description: Invalid mating event id
 *       404:
 *         description: Mating event not found
 *       409:
 *         description: Mating event is referenced by farrowing history and cannot be deleted
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
 *           minimum: 1
 *         required: true
 *         description: ID of the sow
 *     responses:
 *       200:
 *         description: List of mating events for the sow. Returns an empty array when no records exist.
 *       400:
 *         description: Invalid sow id
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
 *           minimum: 1
 *         required: true
 *         description: ID of the boar
 *     responses:
 *       200:
 *         description: List of mating events for the boar. Returns an empty array when no records exist.
 *       400:
 *         description: Invalid boar id
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
 *         description: Mating events grouped only as Pendiente, Positivo, or Negativo; cancelled, closed, and null results are excluded
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
 *             required: [mating_ids, pregnancy_result]
 *             properties:
 *               mating_ids:
 *                 oneOf:
 *                   - type: integer
 *                     minimum: 1
 *                   - type: array
 *                     minItems: 1
 *                     items:
 *                       type: integer
 *                       minimum: 1
 *                 example: [1, 2]
 *               pregnancy_result:
 *                 type: string
 *                 enum: [Pendiente, Positivo, Negativo]
 *                 example: Positivo
 *     responses:
 *       200:
 *         description: Pregnancy result updated successfully
 *       400:
 *         description: Invalid payload
 *       404:
 *         description: One or more mating events were not found
 *       409:
 *         description: Business rule conflict while updating the pregnancy result
 */
router.put(
  "/update/pregnancy-result",
  asyncHandler(matingEventsController.updatePregnancyResult.bind(matingEventsController)),
);

export default router;
