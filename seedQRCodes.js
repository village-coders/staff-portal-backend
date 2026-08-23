require("dotenv").config();
const mongoose = require("mongoose");
const QRCode = require("./models/QRCode");
const connectToDb = require("./config/connectToDb");

/**
 * Extracted QR Code data from active database
 */
const seedQrCodes = [
    {
        codeId: "QR-241516",
        title: "QR Code QR-241516",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 0,
        attachments: [],
        createdAt: "2026-08-16T19:39:57.097Z",
        updatedAt: "2026-08-16T19:39:57.097Z"
    },
    {
        codeId: "QR-741887",
        title: "QR Code QR-741887",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 5,
        attachments: [
            {
                fileName: "Dairy Partners (Cymru Wales) GSO 30 Dec 22.pdf",
                fileUrl: "6a822bb73e9c7d73526fbf15",
                fileSize: "477.8 KB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-16T21:29:29.298Z"
            }
        ],
        lastScannedAt: "2026-08-16T22:02:08.256Z",
        createdAt: "2026-08-16T21:27:07.305Z",
        updatedAt: "2026-08-16T22:02:08.256Z"
    },
    {
        codeId: "QR-775081",
        title: "QR Code QR-775081",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 0,
        attachments: [],
        createdAt: "2026-08-16T22:27:59.310Z",
        updatedAt: "2026-08-16T22:27:59.310Z"
    },
    {
        codeId: "QR-581453",
        title: "QR Code QR-581453",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 3,
        attachments: [
            {
                fileName: "newly weds Food Ossett require amending cert no-unlocked.pdf",
                fileUrl: "6a84367b7db7381fcae6f4a9",
                fileSize: "1.60 MB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-18T10:39:57.587Z"
            }
        ],
        lastScannedAt: "2026-08-18T10:45:43.317Z",
        createdAt: "2026-08-18T10:38:33.809Z",
        updatedAt: "2026-08-18T10:45:43.317Z"
    },
    {
        codeId: "QR-350376",
        title: "QR Code QR-350376",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 0,
        attachments: [
            {
                fileName: "Mondelez CR Biscuit Production s.r.o. OPAVA HAK 4 Confectionery (CIV) 06.08.26-10.05.29-requiring amend for HAK tamplate-unlocked.pdf",
                fileUrl: "6a843d9f7db7381fcae6f4c0",
                fileSize: "1.59 MB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-18T11:10:24.344Z"
            }
        ],
        createdAt: "2026-08-18T11:09:14.862Z",
        updatedAt: "2026-08-18T11:10:24.345Z"
    },
    {
        codeId: "QR-414731",
        title: "QR Code QR-414731",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 8,
        attachments: [
            {
                fileName: "Mondelez CR Biscuit Production s.r.o. OPAVA HAK 4 Confectionery (CIV) 06.08.26-10.05.29-requiring amend for HAK tamplate-unlocked.pdf",
                fileUrl: "6a843ff57db7381fcae6f4d2",
                fileSize: "1.71 MB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-18T11:20:23.008Z"
            }
        ],
        lastScannedAt: "2026-08-18T11:29:10.789Z",
        createdAt: "2026-08-18T11:19:14.448Z",
        updatedAt: "2026-08-18T11:29:10.789Z"
    },
    {
        codeId: "QR-264850",
        title: "QR Code QR-264850",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 5,
        attachments: [
            {
                fileName: "Wilkin & Sons Ltd HFA 23 Sweet Preserves & Condiments (CIV) Renewal 29.07.29-19.08.27-unlocked.pdf",
                fileUrl: "6a8463fd7db7381fcae6f4f7",
                fileSize: "1.71 MB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-18T13:54:06.814Z"
            }
        ],
        lastScannedAt: "2026-08-18T13:55:05.518Z",
        createdAt: "2026-08-18T13:52:50.168Z",
        updatedAt: "2026-08-18T13:55:05.518Z"
    },
    {
        codeId: "QR-463011",
        title: "QR Code QR-463011",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 4,
        attachments: [
            {
                fileName: "KFC Adil Group-unlocked.pdf",
                fileUrl: "6a8491ea7db7381fcae6f515",
                fileSize: "1.75 MB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-18T17:10:04.601Z"
            }
        ],
        lastScannedAt: "2026-08-18T17:10:42.008Z",
        createdAt: "2026-08-18T17:08:53.364Z",
        updatedAt: "2026-08-18T17:10:42.008Z"
    },
    {
        codeId: "QR-463487",
        title: "QR Code QR-463487",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 2,
        attachments: [
            {
                fileName: "KFC Adil Group-unlocked.pdf",
                fileUrl: "6a84936d7db7381fcae6f533",
                fileSize: "1.88 MB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-18T17:16:30.507Z"
            }
        ],
        lastScannedAt: "2026-08-19T10:38:30.156Z",
        createdAt: "2026-08-18T17:15:40.428Z",
        updatedAt: "2026-08-19T10:38:30.156Z"
    },
    {
        codeId: "QR-788190",
        title: "QR Code QR-788190",
        description: "",
        createdByName: "HFA Admin",
        scanCount: 6,
        attachments: [
            {
                fileName: "Ransom Naturals Ltd HFA 2 Plant Extracts & Concentrates (CIV) Initial 11.08.26- 10.08.27-unlocked.pdf",
                fileUrl: "6a8719047db7381fcae6f55e",
                fileSize: "1.70 MB",
                mimeType: "application/pdf",
                uploadedAt: "2026-08-20T15:11:01.454Z"
            }
        ],
        lastScannedAt: "2026-08-21T06:35:52.149Z",
        createdAt: "2026-08-20T15:09:33.189Z",
        updatedAt: "2026-08-21T06:35:52.149Z"
    }
];

const { uploadBufferWithIdToGridFS } = require("./utils/gridfs");
const { generatePlaceholderPdf } = require("./utils/pdfHelper");

/**
 * Database Seeder for QR Codes
 */
const seedQRCodes = async () => {
    console.log("🌱  Starting QR Code database seed...\n");

    await connectToDb();

    console.log("Checking and seeding QR Codes & GridFS attachments...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let createdCount = 0;
    let skippedCount = 0;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });

    for (const qrData of seedQrCodes) {
        let qrDoc = await QRCode.findOne({ codeId: qrData.codeId });
        if (!qrDoc) {
            qrDoc = await QRCode.create(qrData);
            console.log(`✅  Created QR Code [${qrDoc.codeId}]: ${qrDoc.title}`);
            createdCount++;
        } else {
            console.log(`ℹ️   QR Code '${qrData.codeId}' metadata already exists.`);
            skippedCount++;
        }

        // Ensure GridFS files exist for all attachments
        for (const att of (qrDoc.attachments || [])) {
            if (!att.fileUrl) continue;
            try {
                const objectId = new mongoose.Types.ObjectId(att.fileUrl);
                const files = await bucket.find({ _id: objectId }).toArray();
                if (!files || files.length === 0) {
                    const pdfBuffer = generatePlaceholderPdf(qrDoc.title, qrDoc.codeId, att.fileName);
                    await uploadBufferWithIdToGridFS(objectId, pdfBuffer, att.fileName, att.mimeType || "application/pdf");
                    console.log(`   📄  Seeded missing GridFS binary file [${att.fileUrl}]: ${att.fileName}`);
                }
            } catch (err) {
                console.error(`   ⚠️  Error verifying GridFS file for ${att.fileName}:`, err.message);
            }
        }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🌱  QR Code & GridFS Seeding complete: ${createdCount} metadata created, ${skippedCount} existing.\n`);

    await mongoose.disconnect();
    process.exit(0);
};

// Execute if run directly
if (require.main === module) {
    seedQRCodes().catch((err) => {
        console.error("❌  QR Code seeding failed:", err.message);
        process.exit(1);
    });
}

module.exports = { seedQrCodes, seedQRCodes };
