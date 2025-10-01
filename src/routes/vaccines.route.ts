import { Router } from "express";
import VaccinesController from "../controllers/vaccines.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

/**
 * The property "bind" is used to ensure that "this" inside the controller
 * methods refers to the controller instance
*/

const router = Router();

router.get("/", asyncHandler(VaccinesController.getAll.bind(VaccinesController)));
router.get("/:id", asyncHandler(VaccinesController.getById.bind(VaccinesController)));
router.post("/", asyncHandler(VaccinesController.create.bind(VaccinesController)));
router.put("/:id", asyncHandler(VaccinesController.update.bind(VaccinesController)));
router.delete("/:id", asyncHandler(VaccinesController.delete.bind(VaccinesController)));
router.get("/cow/:cowId", asyncHandler(VaccinesController.getVaccinesByCowId.bind(VaccinesController)));
router.get("/boar/:boarId", asyncHandler(VaccinesController.getVaccinesByBoarId.bind(VaccinesController)));

export default router;