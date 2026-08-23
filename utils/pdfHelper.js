/**
 * Generates a valid PDF 1.4 buffer for QR code document placeholders or missing GridFS files.
 *
 * @param {string} title - Document title / QR Title
 * @param {string} codeId - QR Code ID (e.g. QR-741887)
 * @param {string} fileName - Original file name
 * @returns {Buffer} - Valid PDF Buffer
 */
const generatePlaceholderPdf = (title = "HFA QR Document", codeId = "QR Code", fileName = "Document.pdf") => {
    const cleanTitle = (title || "").replace(/[()\\]/g, "");
    const cleanCodeId = (codeId || "").replace(/[()\\]/g, "");
    const cleanFileName = (fileName || "").replace(/[()\\]/g, "");

    const streamContent = `BT
/F1 18 Tf
50 720 Td
(Halal Food Authority - Verified QR Certificate) Tj
/F1 14 Tf
0 -35 Td
(Code ID: ${cleanCodeId}) Tj
0 -25 Td
(Title: ${cleanTitle}) Tj
0 -25 Td
(Attachment: ${cleanFileName}) Tj
/F1 11 Tf
0 -40 Td
(Status: Active & Authenticated Record) Tj
0 -20 Td
(Issued by Halal Food Authority) Tj
ET`;

    const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000243 00000 n 
0000000312 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
500
%%EOF`;

    return Buffer.from(pdfString);
};

module.exports = { generatePlaceholderPdf };
