import { Router } from "express";
import BoarsController from "../controllers/boars.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/", asyncHandler(BoarsController.getAll.bind(BoarsController)));
router.get("/:id", asyncHandler(BoarsController.getById.bind(BoarsController)));
router.post("/", asyncHandler(BoarsController.create.bind(BoarsController)));
router.put("/:id", asyncHandler(BoarsController.update.bind(BoarsController)));
router.delete("/:id", asyncHandler(BoarsController.delete.bind(BoarsController)));

export default router;