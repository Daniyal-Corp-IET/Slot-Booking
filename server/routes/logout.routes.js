import { Router } from "express";
import { env } from "../config/env.js";
import { requireLogin } from "../middleware/auth.js";

const router = Router();

router.post("/logout", requireLogin, (request, response) => {
    response.clearCookie("authToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
    });
    response.json({ message: "Logged out successfully." });
});

export default router;
