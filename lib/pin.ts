import * as Crypto from 'expo-crypto';

const SALT = 'bedtime.v1.pin';

export async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${SALT}:${pin}`);
}

export async function verifyPin(pin: string, hash: string | null): Promise<boolean> {
  if (!hash) return true;
  const candidate = await hashPin(pin);
  return candidate === hash;
}
