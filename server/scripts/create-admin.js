import bcrypt from "bcryptjs";
import { getDatabase } from "../config/database.js";

function getArgument(name) {
    const item = process.argv.find((argument) => argument.startsWith(`--${name}=`));
    return item?.slice(name.length + 3).trim();
}

const email = getArgument("email")?.toLowerCase();
const username = getArgument("username")?.toLowerCase();
const password = getArgument("password");

if (!email || !username || !password || password.length < 8) {
    console.error("Usage: npm run admin:create -- --email=admin@example.com --username=admin --password=StrongPassword");
    process.exit(1);
}

const database = getDatabase();

try {
    const admin = await database.admin.create({
        data: {
            email,
            username,
            passwordHash: await bcrypt.hash(password, 12),
        },
        select: { email: true, username: true },
    });
    console.log(`Administrator ${admin.username} was created for ${admin.email}.`);
} catch (error) {
    let message = error.message;
    if (error.code === "P2002") message = "That email or username already exists.";
    console.error(message);
    process.exitCode = 1;
} finally {
    await database.$disconnect();
}
