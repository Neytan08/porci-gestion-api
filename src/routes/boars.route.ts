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
 * /boars/check-boar-tag-number-exists/{boarTagNumber}:
 *   get:
 *     summary: Check if a boar tag number already exists
 *     tags: [Boars]
 *     parameters:
 *       - in: path
 *         name: boarTagNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: Tag number to validate
 *     responses:
 *       200:
 *         description: Boolean result indicating whether the tag exists
 */
router.get(
  "/check-boar-tag-number-exists/:boarTagNumber",
  asyncHandler(BoarsController.checkBoarTagNumberExists.bind(BoarsController)),
);

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
 * /boars/retire:
 *   patch:
 *     summary: Retire one or many boars
 *     tags: [Boars]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boar_ids
 *             properties:
 *               boar_ids:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *                 example: [1, 2]
 *               removal_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-17"
 *               removal_reason:
 *                 type: string
 *                 example: "End of reproductive use"
 *     responses:
 *       200:
 *         description: Boars retired successfully
 *       404:
 *         description: One or more boars were not found
 */
router.patch("/retire", asyncHandler(BoarsController.retire.bind(BoarsController)));

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
