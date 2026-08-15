import { Router } from "express";
import FarrowingsController from "../controllers/farrowings.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Farrowings
 *   description: Operations related to farrowing events of sows
 */

/**
 * @swagger
 * /farrowings:
 *   get:
 *     summary: Get all farrowing records
 *     tags: [Farrowings]
 *     responses:
 *       200:
 *         description: List of all farrowing records
 */
router.get("/", asyncHandler(FarrowingsController.getAll.bind(FarrowingsController)));

/**
 * @swagger
 * /farrowings/{id}:
 *   get:
 *     summary: Get a farrowing record by ID
 *     tags: [Farrowings]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the farrowing record
 *     responses:
 *       200:
 *         description: Farrowing record found
 *       404:
 *         description: Farrowing record not found
 */
router.get("/:id", asyncHandler(FarrowingsController.getById.bind(FarrowingsController)));

/**
 * @swagger
 * /farrowings:
 *   post:
 *     summary: Create a new farrowing record
 *     description: Creates a farrowing only for a gestating sow with a positive mating event. The weaning date is calculated from the farrowing date.
 *     tags: [Farrowings]
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
 *               farrowing_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-05"
 *               male_piglets:
 *                 type: integer
 *                 example: 5
 *               female_piglets:
 *                 type: integer
 *                 example: 6
 *               still_births:
 *                 type: integer
 *                 example: 0
 *               mummies:
 *                 type: integer
 *                 example: 0
 *               weaned_piglets:
 *                 type: integer
 *                 example: 10
 *               notes:
 *                 type: string
 *                 example: "Normal farrowing, no complications"
 *     responses:
 *       201:
 *         description: Farrowing record created successfully. The related mating event is closed and the sow moves to lactation.
 *       400:
 *         description: Validation error
 *       404:
 *         description: The sow was not found
 *       409:
 *         description: The sow is not eligible for farrowing creation
 */
router.post("/", asyncHandler(FarrowingsController.create.bind(FarrowingsController)));

/**
 * @swagger
 * /farrowings/{id}:
 *   put:
 *     summary: Update an existing farrowing record
 *     tags: [Farrowings]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the farrowing record to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               farrowing_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-06"
 *               male_piglets:
 *                 type: integer
 *                 example: 6
 *               female_piglets:
 *                 type: integer
 *                 example: 5
 *               notes:
 *                 type: string
 *                 example: "Updated after follow-up"
 *     responses:
 *       200:
 *         description: Farrowing record updated successfully. If farrowing_date changes, weaning_date is recalculated.
 *       400:
 *         description: Invalid update payload or invalid identifier
 *       404:
 *         description: Farrowing record not found
 */
router.put("/:id", asyncHandler(FarrowingsController.update.bind(FarrowingsController)));

/**
 * @swagger
 * /farrowings/{id}:
 *   delete:
 *     summary: Delete a farrowing record by ID
 *     tags: [Farrowings]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the farrowing record to delete
 *     responses:
 *       204:
 *         description: Farrowing record deleted successfully
 *       404:
 *         description: Farrowing record not found
 */
router.delete("/:id", asyncHandler(FarrowingsController.delete.bind(FarrowingsController)));

/**
 * @swagger
 * /farrowings/sow/{sowId}:
 *   get:
 *     summary: Get all farrowing records for a specific sow
 *     tags: [Farrowings]
 *     parameters:
 *       - in: path
 *         name: sowId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the sow
 *     responses:
 *       200:
 *         description: Farrowing records grouped with the sow id and total count. Returns an empty list when no records exist.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sowId:
 *                   type: integer
 *                   example: 1
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 farrowings:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid sow id
 */
router.get("/sow/:sowId", asyncHandler(FarrowingsController.getAllFarrowingsBySow.bind(FarrowingsController)));

export default router;
