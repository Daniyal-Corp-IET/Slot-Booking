import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { findAccountByLoginId, getPublicUser } from "../models/users.js";

const router = Router();

router.post("/login", async (request, response) => {
    const loginId = request.body.username?.trim();
    const password = request.body.password;

    if (!loginId || !password) {
        response.status(400).json({ message: "Login ID and password are required." });
        return;
    }

    const user = await findAccountByLoginId(loginId);

    if (!user) {
        response.status(401).json({ message: "Incorrect username or password." });
        return;
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsCorrect) {
        response.status(401).json({ message: "Incorrect username or password." });
        return;
    }

    const publicUser = getPublicUser(user);
    const token = jwt.sign(
        {
            id: publicUser.id,
            role: publicUser.role,
            username: publicUser.username,
            sessionVersion: user.sessionVersion,
        },
        env.JWT_SECRET,
        { expiresIn: "3d" },
    );

    response.cookie("authToken", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    response.json({
        message: "Login successful.",
        user: publicUser,
    });
});

export default router;
