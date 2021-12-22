import { randomBytes, secretbox } from "tweetnacl";
import { db, auth } from "./firebase";
import { SolanaAuth, SolanaAuthBase } from "./SolanaAuth";

// TAKEN FROM: https://github.com/dchest/tweetnacl-js/wiki/Examples
const newNonce = () => randomBytes(secretbox.nonceLength);

const getNonce = async (pubkey: string) => {
  /**
   * If there is NO nonce, create the user profile with a new nonce
   * if there is a nonce, update it.
   */

  let nonce = await checkNonce(pubkey);

  if (!nonce) {
    nonce = await createProfile(pubkey);
  } else {
    nonce = await updateNonce(pubkey);
  }
  return nonce;
};

const checkNonce = async (pubkey: string) => {
  const docRef = db.doc(`profiles/${pubkey}`);
  const doc = await docRef.get();

  if (doc.exists) {
    return doc.data()?.nonce;
  }
  return undefined;
};

const verifyTTL = async (pubkey: string) => {
  const docRef = db.doc(`profiles/${pubkey}`);
  const doc = await docRef.get();
  const tll = doc.data()?.tll;
  if (tll < +new Date()) {
    return false;
  }
  return true;
};

const createProfile = async (pubkey: string) => {
  const docRef = db.doc(`profiles/${pubkey}`);
  const nonce = newNonce().toString();
  await docRef.set({
    pubkey: pubkey, // redundant
    nonce,
    ttl: +new Date() + 300000, // now + 5min
  });
  return nonce;
};

const updateNonce = async (pubkey: string) => {
  const docRef = db.doc(`profiles/${pubkey}`);
  const nonce = newNonce().toString();
  await docRef.set({
    nonce,
    ttl: +new Date() + 300000,
  });
  return nonce;
};

const generateToken = (pubkey: string) => {
  return auth.createCustomToken(pubkey);
};

const SolanaAuthConfig: SolanaAuthBase = {
  checkNonce,
  updateNonce,
  createProfile,
  verifyTTL,
  generateToken,
};

export const SolanaFirebaseAuth = new SolanaAuth(SolanaAuthConfig);