import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
}

const backupFolder = path.resolve("backups");
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupFile = path.join(backupFolder, `itx-slot-${timestamp}.dump`);

await mkdir(backupFolder, { recursive: true });

const backup = spawn("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", `--file=${backupFile}`, process.env.DATABASE_URL], {
    stdio: "inherit",
    shell: process.platform === "win32",
});

backup.on("error", (error) => {
    console.error("Could not start pg_dump. Make sure PostgreSQL command-line tools are installed.");
    console.error(error.message);
});

backup.on("exit", (code) => {
    if (code === 0) console.log(`Database backup created at ${backupFile}`);
    else process.exitCode = code || 1;
});
