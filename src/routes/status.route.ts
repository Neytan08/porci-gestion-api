import { Router } from "express";
import StatusController from "../controllers/status.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

/**
 * The property "bind" is used to ensure that "this" inside the controller
 * methods refers to the controller instance
*/

const router = Router();

router.get("/", asyncHandler(StatusController.getAll.bind(StatusController)));
router.get("/:id", asyncHandler(StatusController.getById.bind(StatusController)));
router.post("/", asyncHandler(StatusController.create.bind(StatusController)));
router.put("/:id", asyncHandler(StatusController.update.bind(StatusController)));
router.delete("/:id", asyncHandler(StatusController.delete.bind(StatusController)));

export default router;