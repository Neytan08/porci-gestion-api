import { Router } from "express";
import BreedingSowController from "../controllers/breedingSows.controller";

const router = Router();

router.get("/", BreedingSowController.getAll);
router.get("/:id", BreedingSowController.getById);
router.post("/", BreedingSowController.create);
router.put("/:id", BreedingSowController.update);
router.delete("/:id", BreedingSowController.delete);
router.get("/status/:statusId", BreedingSowController.getAllByStatusId);
router.get("/:sowId/farrowings/count", BreedingSowController.countFarrowingsBySow);

export default router;