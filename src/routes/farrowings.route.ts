import { Router } from "express";
import FarrowingsController from "../controllers/farrowings.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/", asyncHandler(FarrowingsController.getAll.bind(FarrowingsController)));
router.get("/:id", asyncHandler(FarrowingsController.getById.bind(FarrowingsController)));
router.post("/", asyncHandler(FarrowingsController.create.bind(FarrowingsController)));
router.put("/:id", asyncHandler(FarrowingsController.update.bind(FarrowingsController)));
router.delete("/:id", asyncHandler(FarrowingsController.delete.bind(FarrowingsController)));
router.get("/sow/:sowId", asyncHandler(FarrowingsController.getAllFarrowingsBySow.bind(FarrowingsController)));

export default router;