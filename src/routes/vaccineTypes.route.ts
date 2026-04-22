import { Router } from "express";
import VaccineTypesController from "../controllers/vaccineTypes.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: VaccineTypes
 *   description: Operations related to vaccine types management
 */

/**
 * @swagger
 * /vaccine-types:
 *   get:
 *     summary: Get all vaccine types
 *     tags: [VaccineTypes]
 *     responses:
 *       200:
 *         description: List of all registered vaccine types
 */
router.get("/", asyncHandler(VaccineTypesController.getAll.bind(VaccineTypesController)));

/**
 * @swagger
 * /vaccine-types/{id}:
 *   get:
 *     summary: Get a vaccine type by ID
 *     tags: [VaccineTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the vaccine type
 *     responses:
 *       200:
 *         description: Vaccine type found
 *       404:
 *         description: Vaccine type not found
 */
router.get("/:id", asyncHandler(VaccineTypesController.getById.bind(VaccineTypesController)));

/**
 * @swagger
 * /vaccine-types:
 *   post:
 *     summary: Create a new vaccine type
 *     tags: [VaccineTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "FMD Vaccine"
 *               description:
 *                 type: string
 *                 example: "Used for foot-and-mouth disease prevention"
 *     responses:
 *       201:
 *         description: Vaccine type created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", asyncHandler(VaccineTypesController.create.bind(VaccineTypesController)));

/**
 * @swagger
 * /vaccine-types/{id}:
 *   put:
 *     summary: Update an existing vaccine type
 *     tags: [VaccineTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the vaccine type to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Modified Vaccine"
 *     responses:
 *       200:
 *         description: Vaccine type updated successfully
 *       404:
 *         description: Vaccine type not found
 */
router.put("/:id", asyncHandler(VaccineTypesController.update.bind(VaccineTypesController)));

/**
 * @swagger
 * /vaccine-types/{id}:
 *   delete:
 *     summary: Delete a vaccine type by ID
 *     tags: [VaccineTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the vaccine type to delete
 *     responses:
 *       204:
 *         description: Vaccine type deleted successfully
 *       404:
 *         description: Vaccine type not found
 */
router.delete("/:id", asyncHandler(VaccineTypesController.delete.bind(VaccineTypesController)));

export default router;
