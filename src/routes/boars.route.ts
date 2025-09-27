import { Router } from "express";
import BoarsController from "../controllers/boars.controller";

const router = Router();

router.get("/", BoarsController.getAll);
router.get("/:id", BoarsController.getById);
router.post("/", BoarsController.create);
router.put("/:id", BoarsController.update);
router.delete("/:id", BoarsController.delete);

export default router;