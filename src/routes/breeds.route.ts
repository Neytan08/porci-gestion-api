import { Router } from "express";
import BreedController from "../controllers/breed.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

/**
 * The property "bind" is used to ensure that "this" inside the controller
 * methods refers to the controller instance
 */

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Breed
 *   description: Operations related to sow's and boar's breeds
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
 *         required: true
 *         description: ID of the breed
 *     responses:
 *       200:
 *         description: Breed found
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
 *             properties:
 *               breed_name:
 *                 type: string
 *                 example: Durok
 *               description:
 *                 type: string
 *                 example: Proveniente de japon
 *     responses:
 *       201:
 *         description: Breed created successfully
 */
router.post("/", asyncHandler(BreedController.create.bind(BreedController)));

/**
 * @swagger
 * /breeds/{id}:
 *   put:
 *     summary: Update a breed by ID
 *     tags: [Breed]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
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
 *                 example: Landrass
 *               description:
 *                 type: string
 *                 example: Orejas punteadas
 *     responses:
 *       200:
 *         description: Breed updated successfully
 *       404:
 *         description: Beed not found
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
 *         required: true
 *         description: ID of the breed to delete
 *     responses:
 *       204:
 *         description: Breed deleted successfully
 *       404:
 *         description: Breed not found
 */
router.delete("/:id", asyncHandler(BreedController.delete.bind(BreedController)));

export default router;
