import fs from "fs/promises";
import path from "path";

export const uploadsDir = path.resolve(process.cwd(), "uploads");

export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(uploadsDir, { recursive: true });
}

export async function saveLocalFile(uuid: string, buffer: Buffer): Promise<void> {
  await ensureUploadsDir();
  await fs.writeFile(path.join(uploadsDir, uuid), buffer);
}

export async function localFileExists(uuid: string): Promise<boolean> {
  try {
    await fs.access(path.join(uploadsDir, uuid));
    return true;
  } catch {
    return false;
  }
}

export function isReplitEnv(): boolean {
  return !!process.env.REPL_ID;
}
