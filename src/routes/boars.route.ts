import { Router } from "express";
import BoarsController from "../controllers/boars.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Boars
 *   description: Operations related to boars management
 */

/**
 * @swagger
 * /boars:
 *   get:
 *     summary: Get all boars
 *     tags: [Boars]
 *     responses:
 *       200:
 *         description: List of all boars
 */
router.get("/", asyncHandler(BoarsController.getAll.bind(BoarsController)));

/**
 * @swagger
 * /boars/{id}:
 *   get:
 *     summary: Get a boar by ID
 *     tags: [Boars]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the boar
 *     responses:
 *       200:
 *         description: Boar found
 *       404:
 *         description: Boar not found
 */
router.get("/:id", asyncHandler(BoarsController.getById.bind(BoarsController)));

/**
 * @swagger
 * /boars:
 *   post:
 *     summary: Create a new boar
 *     tags: [Boars]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               boar_tag_number:
 *                 type: string
 *                 example: "B010"
 *               weight:
 *                 type: number
 *                 example: null
 *               length:
 *                 type: number
 *                 example: null
 *               birth_date:
 *                 type: string
 *                 format: date
 *                 example: "2023-06-15"
 *               breed_id:
 *                 type: integer
 *                 example: 1
 *               removal_date:
 *                 type: string
 *                 format: date
 *                 example: null
 *               removal_reason:
 *                 type: string
 *                 example: null
 *               description:
 *                 type: string
 *                 example: null
 *               age:
 *                 type: number
 *                 example: null
 *     responses:
 *       201:
 *         description: Boar created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", asyncHandler(BoarsController.create.bind(BoarsController)));

/**
 * @swagger
 * /boars/{id}:
 *   put:
 *     summary: Update an existing boar
 *     tags: [Boars]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the boar to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *                 example: 265.0
 *               length:
 *                 type: number
 *                 example: 162.0
 *               removal_date:
 *                 type: string
 *                 format: date
 *                 example: 10/05/2025
 *               removal_reason:
 *                 type: string
 *                 example: "Health issues"
 *     responses:
 *       200:
 *         description: Boar updated successfully
 *       404:
 *         description: Boar not found
 */
router.put("/:id", asyncHandler(BoarsController.update.bind(BoarsController)));

/**
 * @swagger
 * /boars/{id}:
 *   delete:
 *     summary: Delete a boar by ID
 *     tags: [Boars]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the boar to delete
 *     responses:
 *       204:
 *         description: Boar deleted successfully
 *       404:
 *         description: Boar not found
 */
router.delete("/:id", asyncHandler(BoarsController.delete.bind(BoarsController)));

export default router;
