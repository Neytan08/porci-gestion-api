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
 *     summary: Get active boars
 *     tags: [Boars]
 *     responses:
 *       200:
 *         description: Boars with neither retirement field set, including breed and age in years and completed months
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
 *         description: Boolean result indicating whether a tag exists, ignoring case and whitespace
 *         content:
 *           application/json:
 *             schema:
 *               type: boolean
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
 *         description: Boar with breed and age in years and completed months
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
 *             required: [boar_tag_number, breed_id, birth_date]
 *             properties:
 *               boar_tag_number:
 *                 type: string
 *                 example: "B010"
 *               weight:
 *                 type: number
 *                 nullable: true
 *                 example: null
 *               length:
 *                 type: number
 *                 nullable: true
 *                 example: null
 *               birth_date:
 *                 type: string
 *                 example: "2023-06-15"
 *                 description: M/D/YYYY, YYYY-MM-DD, or ISO 8601 timestamp with an explicit offset; the supplied calendar day is stored
 *               breed_id:
 *                 type: integer
 *                 example: 1
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *     responses:
 *       201:
 *         description: Created boar in a newBoar object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Breed not found
 *       409:
 *         description: Boar tag already exists under case and whitespace insensitive comparison
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
 *               boar_tag_number:
 *                 type: string
 *                 example: "B010"
 *               breed_id:
 *                 type: integer
 *                 example: 1
 *               weight:
 *                 type: number
 *                 nullable: true
 *                 example: 265.0
 *               length:
 *                 type: number
 *                 nullable: true
 *                 example: 162.0
 *               birth_date:
 *                 type: string
 *                 example: "6/15/2023"
 *                 description: M/D/YYYY, YYYY-MM-DD, or ISO 8601 timestamp with an explicit offset
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Healthy"
 *     responses:
 *       200:
 *         description: Updated boar in an updatedBoar object
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Boar or breed not found
 *       409:
 *         description: Boar is retired or tag already exists
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
 *               - removal_date
 *               - removal_reason
 *             properties:
 *               boar_ids:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     minItems: 1
 *                     items:
 *                       type: integer
 *                 example: [1, 2]
 *               removal_date:
 *                 type: string
 *                 example: "2026-06-17"
 *                 description: M/D/YYYY, YYYY-MM-DD, or ISO 8601 timestamp with an explicit offset
 *               removal_reason:
 *                 type: string
 *                 minLength: 1
 *                 example: "End of reproductive use"
 *     responses:
 *       200:
 *         description: Count of boars retired in the atomic batch
 *       400:
 *         description: Invalid retirement payload or removal date before birth date
 *       404:
 *         description: One or more boars were not found
 *       409:
 *         description: One or more boars are already retired
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
 *       409:
 *         description: Boar is retired or has mating events
 */
router.delete("/:id", asyncHandler(BoarsController.delete.bind(BoarsController)));

export default router;
