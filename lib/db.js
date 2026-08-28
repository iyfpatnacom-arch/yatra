import { MongoClient, GridFSBucket } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "iskcon_yatra";

/**
 * Next dev reloads modules on every edit. Without caching on globalThis we
 * would open a new connection pool per reload and exhaust Atlas connections.
 */
const globalForMongo = globalThis;

/**
 * Connect lazily. Connecting at module scope would fire during `next build`
 * (which imports every route) and turn a missing env var into an opaque build
 * failure instead of a clear runtime error on the first request.
 */
function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and fill it in."
    );
  }

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri, { maxPoolSize: 10, retryWrites: true ,autoSelectFamily: false});
    globalForMongo._mongoClientPromise = client.connect().catch((error) => {
      // Clear the cache so the next request retries instead of being stuck
      // with a permanently rejected promise.
      globalForMongo._mongoClientPromise = undefined;
      throw error;
    });
  }

  return globalForMongo._mongoClientPromise;
}

export async function getDb() {
  const client = await connect();
  return client.db(DB_NAME);
}

export async function getRegistrations() {
  const db = await getDb();
  return db.collection("registrations");
}

/** GridFS bucket holding uploaded ID-proof photos. Never publicly served. */
export async function getIdProofBucket() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "idProofs" });
}

/**
 * Idempotent index creation, called from the registration route so a fresh
 * database is usable without a separate migration step.
 */
export async function ensureIndexes() {
  if (globalForMongo._yatraIndexesReady) {
    return globalForMongo._yatraIndexesReady;
  }

  globalForMongo._yatraIndexesReady = (async () => {
    const registrations = await getRegistrations();
    await Promise.all([
      registrations.createIndex({ orderId: 1 }, { unique: true }),
      registrations.createIndex({ createdAt: -1 }),
      registrations.createIndex({ "payment.status": 1, createdAt: -1 }),
      registrations.createIndex({ type: 1 }),
      registrations.createIndex({ "primary.email": 1 }),
      registrations.createIndex({ "primary.phone": 1 }),
    ]);
  })().catch((error) => {
    globalForMongo._yatraIndexesReady = undefined;
    throw error;
  });

  return globalForMongo._yatraIndexesReady;
}
