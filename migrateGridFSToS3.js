require("dotenv").config();
const mongoose = require("mongoose");
const connectToDb = require("./config/connectToDb");
const Asset = require("./models/Asset");
const Claim = require("./models/Claim");
const QRCode = require("./models/QRCode");
const { uploadToS3, isS3Configured, getS3Stream, extractS3Key } = require("./utils/s3");

const PURGE_GRIDFS = process.argv.includes("--purge-gridfs");
const CONCURRENCY = 10;

async function readGridFSBuffer(bucket, fileId) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = bucket.openDownloadStream(fileId);
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}

async function processFile(bucket, db, gf, index, total) {
    const idStr = gf._id.toString();
    const filename = gf.filename || "document.pdf";
    const contentType = gf.metadata?.contentType || "application/pdf";

    const [qrMatch, claimMatch, assetMatch] = await Promise.all([
        QRCode.exists({ "attachments.fileUrl": idStr }),
        Claim.exists({ "attachments.fileUrl": idStr }),
        Asset.exists({ "attachments.fileUrl": idStr }),
    ]);

    let folder = "uploads";
    if (qrMatch) folder = "qrcodes";
    else if (claimMatch) folder = "claims";
    else if (assetMatch) folder = "assets";

    const buffer = await readGridFSBuffer(bucket, gf._id);
    const s3Url = await uploadToS3(buffer, filename, contentType, folder);

    if (!s3Url.startsWith("/api/files/s3/")) {
        throw new Error(`Upload did not return an S3 URL for ${idStr} (${filename}): ${s3Url}`);
    }

    const key = extractS3Key(s3Url);
    const s3Obj = await getS3Stream(key);
    if (s3Obj.stream && typeof s3Obj.stream.destroy === "function") {
        s3Obj.stream.destroy();
    }

    if (PURGE_GRIDFS) {
        await bucket.delete(gf._id);
    }

    const [qrRes, claimRes, assetRes] = await Promise.all([
        QRCode.updateMany(
            { "attachments.fileUrl": idStr },
            { $set: { "attachments.$[elem].fileUrl": s3Url } },
            { arrayFilters: [{ "elem.fileUrl": idStr }] }
        ),
        Claim.updateMany(
            { "attachments.fileUrl": idStr },
            { $set: { "attachments.$[elem].fileUrl": s3Url } },
            { arrayFilters: [{ "elem.fileUrl": idStr }] }
        ),
        Asset.updateMany(
            { "attachments.fileUrl": idStr },
            { $set: { "attachments.$[elem].fileUrl": s3Url } },
            { arrayFilters: [{ "elem.fileUrl": idStr }] }
        ),
    ]);

    const docsUpdated =
        (qrRes.modifiedCount || 0) +
        (claimRes.modifiedCount || 0) +
        (assetRes.modifiedCount || 0);

    console.log(`✅ [${index + 1}/${total}] ${idStr} (${filename}) -> ${s3Url} (${docsUpdated} doc(s))`);
    return docsUpdated;
}

async function migrate() {
    if (!isS3Configured) {
        console.error("❌ AWS S3 is not configured. Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.");
        process.exit(1);
    }

    await connectToDb();
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });

    const gridFiles = await db.collection("uploads.files").find({}).toArray();
    console.log(`Found ${gridFiles.length} file(s) in GridFS (uploads.files). Concurrency=${CONCURRENCY}, purgeGridFS=${PURGE_GRIDFS}`);

    let updatedDocCount = 0;
    for (let i = 0; i < gridFiles.length; i += CONCURRENCY) {
        const batch = gridFiles.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            batch.map((gf, offset) => processFile(bucket, db, gf, i + offset, gridFiles.length))
        );
        updatedDocCount += results.reduce((sum, n) => sum + n, 0);
    }

    // Final verification: check if any non-S3, non-empty attachment URLs remain
    const remaining = [];
    for (const [label, Model] of [["QRCode", QRCode], ["Claim", Claim], ["Asset", Asset]]) {
        const docs = await Model.find({ "attachments.0": { $exists: true } }).lean();
        for (const doc of docs) {
            for (const att of doc.attachments) {
                if (att.fileUrl && !att.fileUrl.startsWith("/api/files/s3/")) {
                    remaining.push({ label, id: doc._id.toString(), fileName: att.fileName, fileUrl: att.fileUrl });
                }
            }
        }
    }

    console.log(`\nMigration complete: ${gridFiles.length} GridFS file(s) uploaded to S3, ${updatedDocCount} document(s) updated.`);
    if (remaining.length > 0) {
        console.warn(`⚠️ Remaining non-S3 attachment references (${remaining.length}):`, remaining.slice(0, 10));
    } else {
        console.log("🎉 All non-empty attachment references in QRCode, Claim, and Asset now point to S3.");
    }

    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
