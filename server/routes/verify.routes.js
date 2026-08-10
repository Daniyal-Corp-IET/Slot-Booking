import { Router } from "express";
import { requireLogin } from "../middleware/auth.js";

const router = Router();

router.get("/verify", requireLogin, (request, response) => {
    response.json({ user: request.user });
});

export default router;
