import { ObjectId } from "mongodb";
import { getIdProofBucket } from "./db";

/**
 * ID photos live in GridFS rather than on disk or a public bucket. They are
 * government identity documents: the only way to read one back is through the
 * authenticated admin route, which streams from here.
 */

export async function uploadIdProof({ buffer, filename, contentType, metadata }) {
  const bucket = await getIdProofBucket();

  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, {
      contentType,
      metadata,
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id));
    stream.end(buffer);
  });
}

export async function readIdProof(fileId) {
  if (!ObjectId.isValid(fileId)) return null;

  const bucket = await getIdProofBucket();
  const objectId = new ObjectId(fileId);
  const [file] = await bucket.find({ _id: objectId }).limit(1).toArray();
  if (!file) return null;

  const chunks = [];
  for await (const chunk of bucket.openDownloadStream(objectId)) {
    chunks.push(chunk);
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: file.contentType || "application/octet-stream",
    filename: file.filename,
    length: file.length,
  };
}

/** Best-effort cleanup so a failed registration does not leave orphan photos. */
export async function deleteIdProofs(fileIds) {
  if (!fileIds?.length) return;
  const bucket = await getIdProofBucket();
  await Promise.allSettled(
    fileIds.map((id) => bucket.delete(new ObjectId(id)))
  );
}
