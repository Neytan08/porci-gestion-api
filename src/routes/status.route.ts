import { Router } from "express";
import StatusController from "../controllers/status.controller";

const router = Router();

router.get("/", StatusController.getAll);
router.get("/:id", StatusController.getById);
router.post("/", StatusController.create);
router.put("/:id", StatusController.update);
router.delete("/:id", StatusController.delete);

export default router;