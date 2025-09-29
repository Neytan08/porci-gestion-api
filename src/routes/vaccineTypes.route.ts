import { Router } from "express";  
import VaccineTypesController from "../controllers/vaccineTypes.controller";

const router = Router();

router.get("/", VaccineTypesController.getAll); 
router.get("/:id", VaccineTypesController.getById);
router.post("/", VaccineTypesController.create); 
router.put("/:id", VaccineTypesController.update); 
router.delete("/:id", VaccineTypesController.delete);

export default router;