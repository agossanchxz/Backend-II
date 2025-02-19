import { Router } from "express";
import passport from "passport";
import { registerUser, loginUser, getCurrentUser } from "../../controllers/sessionController.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/current", passport.authenticate("jwt", { session: false }), getCurrentUser);

export default router;
