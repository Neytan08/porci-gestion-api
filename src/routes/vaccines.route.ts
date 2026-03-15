import { Router } from "express";
import VaccinesController from "../controllers/vaccines.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

/**
 * The property "bind" is used to ensure that "this" inside the controller
 * methods refers to the controller instance
 */

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Vaccines
 *   description: Operations related to vaccines administration for sows and boars
 */

/**
 * @swagger
 * /vaccines:
 *   get:
 *     summary: Get all vaccines
 *     tags: [Vaccines]
 *     responses:
 *       200:
 *         description: List of all registered vaccines
 */
router.get("/", asyncHandler(VaccinesController.getAll.bind(VaccinesController)));

/**
 * @swagger
 * /vaccines/{id}:
 *   get:
 *     summary: Get a vaccine by ID
 *     tags: [Vaccines]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the vaccine
 *     responses:
 *       200:
 *         description: Vaccine found
 *       404:
 *         description: Vaccine not found
 */
router.get("/:id", asyncHandler(VaccinesController.getById.bind(VaccinesController)));

/**
 * @swagger
 * /vaccines:
 *   post:
 *     summary: Register a new vaccine administration
 *     tags: [Vaccines]
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
 *               boar_id:
 *                 type: integer
 *                 example: 2
 *               vaccine_id:
 *                 type: integer
 *                 example: 3
 *               administration_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-05"
 *               dose:
 *                 type: string
 *                 example: "2 ml"
 *               administration_route:
 *                 type: string
 *                 example: "intramuscular"
 *               administered_by:
 *                 type: string
 *                 example: "Dr. Smith"
 *               note:
 *                 type: string
 *                 example: "Follow-up required in 3 months"
 *     responses:
 *       201:
 *         description: Vaccine created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", asyncHandler(VaccinesController.create.bind(VaccinesController)));

/**
 * @swagger
 * /vaccines/{id}:
 *   put:
 *     summary: Update an existing vaccine record
 *     tags: [Vaccines]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the vaccine to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dose:
 *                 type: string
 *                 example: "3 ml"
 *               note:
 *                 type: string
 *                 example: "Adjusted dosage after checkup"
 *     responses:
 *       200:
 *         description: Vaccine updated successfully
 *       404:
 *         description: Vaccine not found
 */
router.put("/:id", asyncHandler(VaccinesController.update.bind(VaccinesController)));

/**
 * @swagger
 * /vaccines/{id}:
 *   delete:
 *     summary: Delete a vaccine record by ID
 *     tags: [Vaccines]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the vaccine to delete
 *     responses:
 *       204:
 *         description: Vaccine deleted successfully
 *       404:
 *         description: Vaccine not found
 */
router.delete("/:id", asyncHandler(VaccinesController.delete.bind(VaccinesController)));

/**
 * @swagger
 * /vaccines/cow/{cowId}:
 *   get:
 *     summary: Get all vaccines for a specific cow
 *     tags: [Vaccines]
 *     parameters:
 *       - in: path
 *         name: cowId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the cow
 *     responses:
 *       200:
 *         description: List of vaccines for the cow
 *       404:
 *         description: No vaccines found for the cow
 */
router.get(
  "/cow/:cowId",
  asyncHandler(VaccinesController.getVaccinesByCowId.bind(VaccinesController)),
);

/**
 * @swagger
 * /vaccines/boar/{boarId}:
 *   get:
 *     summary: Get all vaccines for a specific boar
 *     tags: [Vaccines]
 *     parameters:
 *       - in: path
 *         name: boarId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the boar
 *     responses:
 *       200:
 *         description: List of vaccines for the boar
 *       404:
 *         description: No vaccines found for the boar
 */
router.get(
  "/boar/:boarId",
  asyncHandler(VaccinesController.getVaccinesByBoarId.bind(VaccinesController)),
);

export default router;
