import argon2 from "argon2";

const MEMORY_COST_KIB = 19 * 1024;
const TIME_COST = 2;
const PARALLELISM = 1;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    memoryCost: MEMORY_COST_KIB,
    parallelism: PARALLELISM,
    timeCost: TIME_COST,
    type: argon2.argon2id,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
