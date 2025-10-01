import { Router } from "express";
import BreedingSowController from "../controllers/breedingSows.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/", asyncHandler(BreedingSowController.getAll.bind(BreedingSowController)));
router.get("/:id", asyncHandler(BreedingSowController.getById.bind(BreedingSowController)));
router.post("/", asyncHandler(BreedingSowController.create.bind(BreedingSowController)));
router.put("/:id", asyncHandler(BreedingSowController.update.bind(BreedingSowController)));
router.delete("/:id", asyncHandler(BreedingSowController.delete.bind(BreedingSowController)));
router.get("/status/:statusId", asyncHandler(BreedingSowController.getAllByStatusId.bind(BreedingSowController)));
router.get("/:sowId/farrowings/count", asyncHandler(BreedingSowController.countFarrowingsBySow.bind(BreedingSowController)));

export default router;