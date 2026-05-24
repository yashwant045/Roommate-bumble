import { Router } from "express";
import { ListingController } from "../controllers/listingController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const listingController = new ListingController();

router.post("/", authMiddleware, listingController.createListing);
router.get("/", authMiddleware, listingController.getListings);
router.delete("/:id", authMiddleware, listingController.deleteListing);

export default router;
