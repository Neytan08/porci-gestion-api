import { Router } from "express";
import BreedingSowController from "../controllers/breedingSows.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: BreedingSows
 *   description: Operations related to breeding sows
 */

/**
 * @swagger
 * /breedingsows:
 *   get:
 *     summary: Get all breeding sows
 *     tags: [BreedingSows]
 *     responses:
 *       200:
 *         description: List of all breeding sows
 */
router.get("/", asyncHandler(BreedingSowController.getAll.bind(BreedingSowController)));

/**
 * @swagger
 * /breedingsows/check-sow-tag-number-exists/{sowTagNumber}:
 *   get:
 *     summary: Check if a breeding sow tag number already exists
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: sowTagNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: Tag number to validate
 *     responses:
 *       200:
 *         description: Boolean result indicating whether the tag exists
 */
router.get(
  "/check-sow-tag-number-exists/:sowTagNumber",
  asyncHandler(BreedingSowController.checkSowTagNumberExists.bind(BreedingSowController)),
);

/**
 * @swagger
 * /breedingsows/{id}:
 *   get:
 *     summary: Get a breeding sow by ID
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the breeding sow
 *     responses:
 *       200:
 *         description: Breeding sow found
 *       404:
 *         description: Breeding sow not found
 */
router.get("/:id", asyncHandler(BreedingSowController.getById.bind(BreedingSowController)));

/**
 * @swagger
 * /breedingsows:
 *   post:
 *     summary: Create a new breeding sow
 *     tags: [BreedingSows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Gestacion, Lactancia, Vacia, No Productiva]
 *                 example: "Vacia"
 *               sow_tag_number:
 *                 type: string
 *                 example: "SOW-0010"
 *               entry_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-05"
 *               weight:
 *                 type: number
 *                 example: 180.5
 *               length:
 *                 type: number
 *                 example: 145.2
 *               mammary_glands:
 *                 type: integer
 *                 example: 14
 *               breed:
 *                 type: string
 *                 example: "Yorkshire"
 *               farrowing_number:
 *                 type: integer
 *                 example: 2
 *               last_weaning_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-15"
 *               removal_date:
 *                 type: string
 *                 format: date
 *                 example: null
 *               removal_reason:
 *                 type: string
 *                 example: null
 *     responses:
 *       201:
 *         description: Breeding sow created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", asyncHandler(BreedingSowController.create.bind(BreedingSowController)));

/**
 * @swagger
 * /breedingsows/{id}:
 *   put:
 *     summary: Update an existing breeding sow
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the breeding sow to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *                 example: 185.0
 *               length:
 *                 type: number
 *                 example: 150.0
 *               mammary_glands:
 *                 type: integer
 *                 example: 16
 *               last_weaning_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-20"
 *               removal_date:
 *                 type: string
 *                 format: date
 *                 example: null
 *               removal_reason:
 *                 type: string
 *                 example: null
 *     responses:
 *       200:
 *         description: Breeding sow updated successfully
 *       404:
 *         description: Breeding sow not found
 */
router.put("/:id", asyncHandler(BreedingSowController.update.bind(BreedingSowController)));

/**
 * @swagger
 * /breedingsows/retire:
 *   patch:
 *     summary: Retire one or many breeding sows
 *     tags: [BreedingSows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sow_ids
 *             properties:
 *               sow_ids:
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
 *                 example: "End of productive life"
 *     responses:
 *       200:
 *         description: Breeding sows retired successfully
 *       404:
 *         description: One or more breeding sows were not found
 */
router.patch(
  "/retire",
  asyncHandler(BreedingSowController.retire.bind(BreedingSowController)),
);

/**
 * @swagger
 * /breedingsows/{id}:
 *   delete:
 *     summary: Delete a breeding sow by ID
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the breeding sow to delete
 *     responses:
 *       204:
 *         description: Breeding sow deleted successfully
 *       404:
 *         description: Breeding sow not found
 */
router.delete("/:id", asyncHandler(BreedingSowController.delete.bind(BreedingSowController)));

/**
 * @swagger
 * /breedingsows/status/{status}:
 *   get:
 *     summary: Get all breeding sows by status
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: status
 *         schema:
 *           type: string
 *         required: true
 *         description: Status value to filter breeding sows
 *     responses:
 *       200:
 *         description: List of breeding sows with the specified status
 *       404:
 *         description: No breeding sows found for this status
 */
router.get(
  "/status/:status",
  asyncHandler(BreedingSowController.getAllByStatus.bind(BreedingSowController)),
);

/**
 * @swagger
 * /breedingsows/{sowId}/farrowings/count:
 *   get:
 *     summary: Get the number of farrowings for a specific sow
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: sowId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the sow
 *     responses:
 *       200:
 *         description: Number of farrowings for the sow
 *       404:
 *         description: No farrowing records found for this sow
 */
// router.get("/:sowId/farrowings/count", asyncHandler(BreedingSowController.countFarrowingsBySow.bind(BreedingSowController)));

export default router;
