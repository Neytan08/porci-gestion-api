import { Router } from "express";
import FarrowingsController from "../controllers/farrowings.controller";

const router = Router();

router.get("/", FarrowingsController.getAll);
router.get("/:id", FarrowingsController.getById);
router.post("/", FarrowingsController.create);
router.put("/:id", FarrowingsController.update);
router.delete("/:id", FarrowingsController.delete);
router.get("/sow/:sowId", FarrowingsController.getAllFarrowingsBySow);

export default router;