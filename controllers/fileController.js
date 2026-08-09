const { downloadFromGridFS } = require("../utils/gridfs");

/**
 * GET /api/v1/files/:id
 *
 * Streams a file from MongoDB GridFS to the client.
 * The :id param is the GridFS file ObjectId (stored in attachment.fileUrl).
 *
 * Requires authentication (protect middleware applied in router).
 * Sets Content-Type and Content-Disposition headers automatically from GridFS metadata.
 */
const getFile = async (req, res, next) => {
    try {
        await downloadFromGridFS(req.params.id, res);
    } catch (err) {
        next(err);
    }
};

module.exports = { getFile };
