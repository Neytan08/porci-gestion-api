import { Router } from "express";
import BreedController from "../controllers/breed.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Breed
 *   description: Operations related to sow and boar breeds
 */

/**
 * @swagger
 * /breeds:
 *   get:
 *     summary: Get all breeds
 *     tags: [Breed]
 *     responses:
 *       200:
 *         description: List of all breeds
 */
router.get("/", asyncHandler(BreedController.getAll.bind(BreedController)));

/**
 * @swagger
 * /breeds/{id}:
 *   get:
 *     summary: Get a breed by ID
 *     tags: [Breed]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: ID of the breed
 *     responses:
 *       200:
 *         description: Breed found
 *       400:
 *         description: Invalid breed ID
 *       404:
 *         description: Breed not found
 */
router.get("/:id", asyncHandler(BreedController.getById.bind(BreedController)));

/**
 * @swagger
 * /breeds:
 *   post:
 *     summary: Create a new breed
 *     tags: [Breed]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [breed_name]
 *             properties:
 *               breed_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 pattern: '\S'
 *                 example: Duroc
 *               description:
 *                 type: string
 *                 example: Breed description
 *     responses:
 *       201:
 *         description: Breed created successfully
 *       400:
 *         description: Invalid request
 *       409:
 *         description: Breed name already exists, ignoring case and whitespace
 */
router.post("/", asyncHandler(BreedController.create.bind(BreedController)));

/**
 * @swagger
 * /breeds/{id}:
 *   put:
 *     summary: Partially update a breed by ID
 *     description: Changes only supplied editable fields.
 *     tags: [Breed]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: ID of the breed to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               breed_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 pattern: '\S'
 *                 example: Large White
 *               description:
 *                 type: string
 *                 example: Updated breed description
 *     responses:
 *       200:
 *         description: Breed updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Breed not found
 *       409:
 *         description: Breed name already exists, ignoring case and whitespace
 */
router.put("/:id", asyncHandler(BreedController.update.bind(BreedController)));

/**
 * @swagger
 * /breeds/{id}:
 *   delete:
 *     summary: Delete a breed by ID
 *     tags: [Breed]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: ID of the breed to delete
 *     responses:
 *       204:
 *         description: Breed deleted successfully
 *       400:
 *         description: Invalid breed ID
 *       404:
 *         description: Breed not found
 *       409:
 *         description: Breed has associated boars or breeding sows
 */
router.delete("/:id", asyncHandler(BreedController.delete.bind(BreedController)));

export default router;
