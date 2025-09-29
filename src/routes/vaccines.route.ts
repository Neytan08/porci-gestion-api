import { Router } from "express";
import VaccinesController from "../controllers/vaccines.controller";

const router = Router();

router.get("/", VaccinesController.getAll);
router.get("/:id", VaccinesController.getById);
router.post("/", VaccinesController.create);
router.put("/:id", VaccinesController.update);
router.delete("/:id", VaccinesController.delete);
router.get("/cow/:cowId", VaccinesController.getVaccinesByCowId);
router.get("/boar/:boarId", VaccinesController.getVaccinesByBoarId);

export default router;