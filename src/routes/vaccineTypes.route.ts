import { Router } from "express";  
import VaccineTypesController from "../controllers/vaccineTypes.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/", asyncHandler(VaccineTypesController.getAll.bind(VaccineTypesController))); 
router.get("/:id", asyncHandler(VaccineTypesController.getById.bind(VaccineTypesController)));
router.post("/", asyncHandler(VaccineTypesController.create.bind(VaccineTypesController))); 
router.put("/:id", asyncHandler(VaccineTypesController.update.bind(VaccineTypesController))); 
router.delete("/:id", asyncHandler(VaccineTypesController.delete.bind(VaccineTypesController)));

export default router;