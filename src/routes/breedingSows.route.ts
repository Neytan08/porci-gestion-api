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
 *     summary: Get all active breeding sows
 *     tags: [BreedingSows]
 *     responses:
 *       200:
 *         description: List of active breeding sows with their breed data
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
 *       400:
 *         description: Invalid or blank sow tag number
 */
router.get(
  "/check-sow-tag-number-exists/:sowTagNumber",
  asyncHandler(BreedingSowController.checkSowTagNumberExists.bind(BreedingSowController)),
);

/**
 * @swagger
 * /breedingsows/{id}:
 *   get:
 *     summary: Get an active breeding sow by ID
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
 *         description: Active breeding sow found
 *       400:
 *         description: Invalid breeding sow ID
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
 *             required:
 *               - status
 *               - breed_id
 *               - sow_tag_number
 *               - entry_date
 *               - mammary_glands
 *               - farrowing_number
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Vacia, No Productiva]
 *                 example: "Vacia"
 *               breed_id:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               sow_tag_number:
 *                 type: string
 *                 maxLength: 50
 *                 example: "SOW-0010"
 *               entry_date:
 *                 type: string
 *                 description: M/D/YYYY, YYYY-MM-DD, or an ISO 8601 timestamp with an offset
 *                 example: "2025-10-05"
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999.99
 *                 multipleOf: 0.01
 *                 nullable: true
 *                 example: 180.5
 *               length:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999.99
 *                 multipleOf: 0.01
 *                 nullable: true
 *                 example: 145.2
 *               mammary_glands:
 *                 type: integer
 *                 minimum: 1
 *                 example: 14
 *               farrowing_number:
 *                 type: integer
 *                 minimum: 0
 *                 example: 2
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Purchased with two previous farrowings"
 *     responses:
 *       201:
 *         description: Breeding sow created successfully
 *       400:
 *         description: Invalid request payload
 *       404:
 *         description: Selected breed not found
 *       409:
 *         description: Normalized sow tag number already exists
 */
router.post("/", asyncHandler(BreedingSowController.create.bind(BreedingSowController)));

/**
 * @swagger
 * /breedingsows/{id}/validate-status-change:
 *   post:
 *     summary: Validate a proposed breeding sow status change
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the breeding sow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Vacia, Gestación, Lactancia, No Productiva]
 *                 example: "Gestación"
 *     responses:
 *       204:
 *         description: The proposed status change is allowed
 *       400:
 *         description: Invalid request payload
 *       404:
 *         description: Breeding sow not found
 *       409:
 *         description: The proposed status change is blocked by an active reproductive workflow
 */
router.post(
  "/:id/validate-status-change",
  asyncHandler(BreedingSowController.validateStatusChange.bind(BreedingSowController)),
);

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
 *               status:
 *                 type: string
 *                 enum: [Vacia, Gestación, Lactancia, No Productiva]
 *                 example: "No Productiva"
 *               breed_id:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               sow_tag_number:
 *                 type: string
 *                 maxLength: 50
 *                 example: "SOW-0010"
 *               entry_date:
 *                 type: string
 *                 description: M/D/YYYY, YYYY-MM-DD, or an ISO 8601 timestamp with an offset
 *                 example: "2025-10-05"
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999.99
 *                 multipleOf: 0.01
 *                 nullable: true
 *                 example: 185.0
 *               length:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999.99
 *                 multipleOf: 0.01
 *                 nullable: true
 *                 example: 150.0
 *               mammary_glands:
 *                 type: integer
 *                 minimum: 1
 *                 example: 16
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Updated profile information"
 *     responses:
 *       200:
 *         description: Breeding sow updated successfully
 *       400:
 *         description: Invalid ID or request payload
 *       404:
 *         description: Active breeding sow or selected breed not found
 *       409:
 *         description: Duplicate tag or status change blocked by a reproductive workflow
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
 *                 description: M/D/YYYY, YYYY-MM-DD, or an ISO 8601 timestamp with an offset
 *                 example: "2026-06-17"
 *               removal_reason:
 *                 type: string
 *                 example: "End of productive life"
 *     responses:
 *       200:
 *         description: Sows retired and open mating/farrowing workflows closed successfully
 *       400:
 *         description: Invalid IDs, payload, or removal date
 *       404:
 *         description: One or more breeding sows were not found
 *       409:
 *         description: One or more breeding sows were already retired or changed concurrently
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
 *       400:
 *         description: Invalid breeding sow ID
 *       404:
 *         description: Active breeding sow not found
 *       409:
 *         description: Breeding sow has reproductive history and must be retired instead
 */
router.delete("/:id", asyncHandler(BreedingSowController.delete.bind(BreedingSowController)));

/**
 * @swagger
 * /breedingsows/status/{status}:
 *   get:
 *     summary: Get active breeding sows by status
 *     tags: [BreedingSows]
 *     parameters:
 *       - in: path
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Vacia, Gestación, Lactancia, No Productiva]
 *         required: true
 *         description: Status value to filter breeding sows
 *     responses:
 *       200:
 *         description: List of active breeding sows with the specified status and breed data
 *       400:
 *         description: Invalid breeding sow status
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
