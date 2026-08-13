import { Router } from "express";
import { requireLogin } from "../middleware/auth.js";
import { clearAuthCookie } from "../utils/authCookie.js";

const router = Router();

router.post("/logout", requireLogin, (request, response) => {
    clearAuthCookie(response);
    response.json({ message: "Logged out successfully." });
});

export default router;
