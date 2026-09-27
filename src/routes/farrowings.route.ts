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
 *           minimum: 1
 *         required: true
 *         description: ID of the farrowing record
 *     responses:
 *       200:
 *         description: Farrowing record found
 *       400:
 *         description: Invalid farrowing identifier
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
 *             required: [sow_id, farrowing_date, male_piglets, female_piglets]
 *             properties:
 *               sow_id:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               farrowing_date:
 *                 type: string
 *                 description: M/D/YYYY, YYYY-MM-DD, or an ISO 8601 timestamp with an offset. Must be after the associated reproduction date.
 *                 example: "2025-10-05"
 *               male_piglets:
 *                 type: integer
 *                 minimum: 0
 *                 example: 5
 *               female_piglets:
 *                 type: integer
 *                 minimum: 0
 *                 example: 6
 *               still_births:
 *                 type: integer
 *                 minimum: 0
 *                 example: 0
 *               mummies:
 *                 type: integer
 *                 minimum: 0
 *                 example: 0
 *               notes:
 *                 type: string
 *                 example: "Normal farrowing, no complications"
 *     responses:
 *       201:
 *         description: Farrowing record created successfully. The related mating event is closed and the sow moves to lactation.
 *       400:
 *         description: Invalid payload or farrowing date not after the reproduction date
 *       404:
 *         description: The sow was not found
 *       409:
 *         description: The sow is not eligible for farrowing creation
 */
router.post("/", asyncHandler(FarrowingsController.create.bind(FarrowingsController)));

/**
 * @swagger
 * /farrowings/{id}/wean:
 *   patch:
 *     summary: Record weaning and move the sow from lactation to empty
 *     description: Saves the actual weaned_date and weaned_piglets and updates the sow's last_weaning_date in one transaction. The planned weaning_date is unchanged. Both body fields are required only for this operation.
 *     tags: [Farrowings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID of the farrowing to wean
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weaned_date, weaned_piglets]
 *             properties:
 *               weaned_date:
 *                 type: string
 *                 description: Actual weaning date in M/D/YYYY, YYYY-MM-DD, or offset ISO format; on or after the farrowing date
 *                 example: "2026-09-10"
 *               weaned_piglets:
 *                 type: integer
 *                 minimum: 0
 *                 example: 10
 *     responses:
 *       200:
 *         description: Updated farrowing. The sow is now empty and her last weaning date is recorded.
 *       400:
 *         description: Invalid identifier, missing or invalid body fields, or weaning date before farrowing
 *       404:
 *         description: Farrowing not found
 *       409:
 *         description: Already weaned, sow is not lactating, or the reproductive state changed concurrently
 */
router.patch("/:id/wean", asyncHandler(FarrowingsController.wean.bind(FarrowingsController)));

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
 *           minimum: 1
 *         required: true
 *         description: ID of the farrowing record to delete
 *     responses:
 *       204:
 *         description: Unweaned farrowing deleted; mating event and sow reproductive state restored
 *       400:
 *         description: Invalid farrowing identifier
 *       404:
 *         description: Farrowing record not found
 *       409:
 *         description: Completed farrowing is permanent history or related reproductive state changed
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
 *           minimum: 1
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
