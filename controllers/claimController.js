const mongoose = require("mongoose");
const Claim = require("../models/Claim");
const generateClaimRef = require("../utils/generateClaimRef");
const { validateTransition, normalize, normalizeRole } = require("../utils/stateMachine");
const { sendNotification, sendNotificationToRole } = require("../utils/sendNotification");
const { uploadToGridFS } = require("../utils/gridfs");

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helper: Dispatch notifications based on transition
// ─────────────────────────────────────────────────────────────────────────────

const dispatchTransitionNotifications = async (claim, fromStatus, toStatus) => {
    const ref = claim.claimRefNo;
    const claimId = claim._id;
    const claimantId = claim.claimantId;

    const notifyClaimant = (title, message, type = "claim") =>
        sendNotification({ recipientId: claimantId, type, title, message, claimId });

    const notifyRole = (role, title, message, type = "claim") =>
        sendNotificationToRole({ role, type, title, message, claimId });

    if ((fromStatus === "SUBMITTED" || fromStatus === "NEW") && toStatus === "VERIFIED") {
        await notifyClaimant(
            `Claim ${ref} Verified`,
            `Your claim ${ref} has been verified by the Financial Officer and forwarded to the CEO.`,
            "verified"
        );
    } else if ((fromStatus === "SUBMITTED" || fromStatus === "NEW") && toStatus === "PENDING") {
        await notifyClaimant(
            `Action Required: Claim ${ref}`,
            `The Financial Officer has sent feedback on your claim ${ref}. Please review the note and resubmit.`,
            "pending"
        );
    } else if ((fromStatus === "SUBMITTED" || fromStatus === "NEW") && toStatus === "REJECTED") {
        await notifyClaimant(
            `Claim ${ref} Rejected`,
            `Your claim ${ref} has been rejected by the Financial Officer.`
        );
    } else if (fromStatus === "PENDING" && (toStatus === "SUBMITTED" || toStatus === "NEW")) {
        await notifyRole(
            "financial_officer",
            `Claim ${ref} Resubmitted`,
            `Claim ${ref} has been resubmitted by the claimant and is awaiting your review.`
        );
    } else if (
        (fromStatus === "VERIFIED" || fromStatus === "FURTHER_APPROVAL" || fromStatus === "FURTHER_APPROVAL_APPROVED") &&
        toStatus === "APPROVED_FOR_PAYMENT"
    ) {
        await notifyClaimant(
            `Claim ${ref} Approved for Payment`,
            `Great news! Your claim ${ref} has been approved by the CEO and is queued for payment.`,
            "paid"
        );
        await notifyRole(
            "accountant",
            `Payment Pending: Claim ${ref}`,
            `Claim ${ref} has been approved by the CEO and is ready for payment processing.`,
            "paid"
        );
    } else if (
        (fromStatus === "VERIFIED" || fromStatus === "FURTHER_APPROVAL_REJECTED" || fromStatus === "FURTHER_APPROVAL_APPROVED") &&
        toStatus === "FURTHER_APPROVAL"
    ) {
        await notifyRole(
            "chairman",
            `Board Approval Required: Claim ${ref}`,
            `Claim ${ref} has been escalated for board-level review (Further Approval). Please assess and respond.`
        );
    } else if (
        (fromStatus === "VERIFIED" || fromStatus === "FURTHER_APPROVAL_APPROVED" || fromStatus === "FURTHER_APPROVAL_REJECTED" || fromStatus === "FURTHER_APPROVAL") &&
        (toStatus === "SUBMITTED" || toStatus === "NEW" || toStatus === "PENDING")
    ) {
        await notifyRole(
            "financial_officer",
            `Claim ${ref} Returned by Management`,
            `Claim ${ref} has been returned for re-evaluation by the Financial Officer.`
        );
        await notifyClaimant(
            `Claim ${ref} Under Further Review`,
            `Your claim ${ref} has been returned for further review by the Financial Officer.`
        );
    } else if (
        (fromStatus === "FURTHER_APPROVAL" || fromStatus === "VERIFIED") &&
        toStatus === "FURTHER_APPROVAL_APPROVED"
    ) {
        await notifyRole(
            "ceo",
            `Board Approved: Claim ${ref}`,
            `The Board has approved claim ${ref} (Further Approval Approved). It has been returned to you for final action.`
        );
    } else if (
        (fromStatus === "FURTHER_APPROVAL" || fromStatus === "VERIFIED") &&
        toStatus === "FURTHER_APPROVAL_REJECTED"
    ) {
        await notifyRole(
            "ceo",
            `Board Rejected: Claim ${ref}`,
            `The Board has rejected claim ${ref} (Further Approval Rejected). It has been returned to you for review.`
        );
    } else if (fromStatus === "APPROVED_FOR_PAYMENT" && toStatus === "PAID") {
        await notifyClaimant(
            `Claim ${ref} Paid`,
            `Your claim ${ref} has been successfully processed. Payment has been disbursed.`,
            "paid"
        );
    } else if (toStatus === "REJECTED") {
        await notifyClaimant(
            `Claim ${ref} Rejected`,
            `Your claim ${ref} has been rejected.`
        );
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Submit a new claim
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/claims
 * Submit a new claim. Initializes with status NEW. Notifies financial officers.
 */
const submitClaim = async (req, res, next) => {
    try {
        const {
            claimType,
            filingDate,
            companyName,
            contactPerson,
            contactEmail,
            reasons,
            items,
            subtotals,
            department,
        } = req.body;

        if (!claimType || !filingDate || !items || !subtotals) {
            return res.status(400).json({
                success: false,
                message: "claimType, filingDate, items, and subtotals are required.",
            });
        }

        const claimRefNo = await generateClaimRef();

        const claim = await Claim.create({
            claimRefNo,
            claimantId: req.user._id,
            claimantName: req.user.name,
            department: department || req.user.department,
            claimType,
            filingDate,
            companyName,
            contactPerson,
            contactEmail,
            reasons: reasons || [],
            items,
            subtotals,
            status: "SUBMITTED",
            history: [
                {
                    actorId: req.user._id,
                    actorName: req.user.name,
                    actorRole: req.user.role,
                    fromStatus: null,
                    toStatus: "SUBMITTED",
                    note: "Claim submitted.",
                    timestamp: new Date(),
                },
            ],
        });

        // Notify all financial officers of the new submission
        await sendNotificationToRole({
            role: "financial_officer",
            type: "claim",
            title: `New Claim Submission: ${claimRefNo}`,
            message: `${req.user.name} has submitted a new claim (${claimRefNo}) for your review.`,
            claimId: claim._id,
        });

        res.status(201).json({
            success: true,
            message: "Claim submitted successfully.",
            data: claim,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: List claims (paginated, role-filtered)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/claims
 * Returns role-scoped, paginated claims with optional search & status filter.
 */
const getClaims = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const statusFilter = req.query.status || "";
        const role = (req.user.role || "user").toLowerCase();

        // ── Role-based base filter ──────────────────────────────────────────
        let baseFilter = {};

        if (role === "user") {
            baseFilter.claimantId = req.user._id;
        } else if (role === "financial_officer") {
            baseFilter = {
                $or: [
                    { claimantId: req.user._id },
                    {
                        status: {
                            $in: [
                                "SUBMITTED", "submitted",
                                "NEW", "new",
                                "PENDING", "pending",
                                "REJECTED", "rejected",
                                "VERIFIED", "verified",
                            ],
                        },
                    },
                ],
            };
        } else if (role === "ceo") {
            baseFilter = {
                $or: [
                    { claimantId: req.user._id },
                    {
                        status: {
                            $in: [
                                "VERIFIED", "verified",
                                "FURTHER_APPROVAL", "further_approval",
                                "FURTHER_APPROVAL_APPROVED", "further_approval_approved",
                                "FURTHER_APPROVAL_REJECTED", "further_approval_rejected",
                                "APPROVED_FOR_PAYMENT", "approved_for_payment",
                                "PAID", "paid",
                            ],
                        },
                    },
                ],
            };
        } else if (role === "chairman") {
            baseFilter = {
                $or: [
                    { claimantId: req.user._id },
                    {
                        status: {
                            $in: [
                                "FURTHER_APPROVAL", "further_approval",
                                "FURTHER_APPROVAL_APPROVED", "further_approval_approved",
                                "FURTHER_APPROVAL_REJECTED", "further_approval_rejected",
                            ],
                        },
                    },
                ],
            };
        } else if (role === "accountant") {
            baseFilter = {
                $or: [
                    { claimantId: req.user._id },
                    {
                        status: {
                            $in: [
                                "APPROVED_FOR_PAYMENT", "approved_for_payment",
                                "PAID", "paid",
                            ],
                        },
                    },
                ],
            };
        }
        // admin & super_admin: no base filter — access all claims

        // ── Optional explicit status filter ────────────────────────────────
        if (statusFilter) {
            const upperStatus = statusFilter.toUpperCase().trim();
            const lowerStatus = statusFilter.toLowerCase().trim();
            if (baseFilter.status && baseFilter.status.$in) {
                const permittedUpper = baseFilter.status.$in.map((s) => s.toUpperCase());
                if (!permittedUpper.includes(upperStatus)) {
                    return res.status(403).json({
                        success: false,
                        message: `Role '${role}' is not permitted to view claims with status '${statusFilter}'.`,
                    });
                }
                baseFilter.status = { $in: [upperStatus, lowerStatus] };
            } else {
                baseFilter.status = { $in: [upperStatus, lowerStatus] };
            }
        }

        // ── Search filter ──────────────────────────────────────────────────
        const searchFilter = search
            ? {
                  $or: [
                      { claimRefNo: { $regex: search, $options: "i" } },
                      { claimantName: { $regex: search, $options: "i" } },
                      { claimType: { $regex: search, $options: "i" } },
                      { department: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        const query = { ...baseFilter, ...searchFilter };

        const total = await Claim.countDocuments(query);
        const claims = await Claim.find(query)
            .populate("claimantId", "name email username department")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                pageSize: limit,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
            data: claims,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Get single claim by Mongo ID or claimRefNo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/claims/:id
 */
const getClaimById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const queryConditions = [{ claimRefNo: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const claim = await Claim.findOne({ $or: queryConditions }).populate(
            "claimantId",
            "name email username department"
        );

        if (!claim) {
            return res.status(404).json({ success: false, message: "Claim not found." });
        }

        // Users can only view their own claims
        const role = req.user.role;
        if (
            role === "user" &&
            claim.claimantId._id.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only view your own claims.",
            });
        }

        res.status(200).json({ success: true, data: claim });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Transition claim status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/claims/:id/transition
 * Body: { newStatus: string, note?: string }
 * Enforces state machine rules. Appends to history. Fires notifications.
 */
const transitionClaim = async (req, res, next) => {
    try {
        const { newStatus, note } = req.body;
        const { id } = req.params;
        const actor = req.user;

        if (!newStatus) {
            return res
                .status(400)
                .json({ success: false, message: "newStatus is required." });
        }

        const queryConditions = [{ claimRefNo: id }];
        if (mongoose.isValidObjectId(id)) queryConditions.push({ _id: id });

        const claim = await Claim.findOne({ $or: queryConditions });
        if (!claim) {
            return res.status(404).json({ success: false, message: "Claim not found." });
        }

        const fromStatus = normalize(claim.status);
        const normalizedNewStatus = normalize(newStatus);
        const actorRole = normalizeRole(actor.role);

        // ── State machine validation ────────────────────────────────────────
        const { valid, message } = validateTransition(fromStatus, normalizedNewStatus, actorRole);
        if (!valid) {
            return res.status(403).json({ success: false, message });
        }

        claim.status = normalizedNewStatus;
        if (note !== undefined) claim.officerNote = note;

        // Derive target role for this transition if not provided
        let targetRole = req.body.targetRole;
        if (!targetRole) {
            if (normalizedNewStatus === "VERIFIED") targetRole = "ceo";
            else if (normalizedNewStatus === "FURTHER_APPROVAL") targetRole = "chairman";
            else if (normalizedNewStatus === "FURTHER_APPROVAL_APPROVED" || normalizedNewStatus === "FURTHER_APPROVAL_REJECTED") targetRole = "ceo";
            else if (normalizedNewStatus === "APPROVED_FOR_PAYMENT") targetRole = "accountant";
            else if (normalizedNewStatus === "PAID") targetRole = "user";
            else if (normalizedNewStatus === "PENDING") targetRole = "user";
            else if (normalizedNewStatus === "SUBMITTED" || normalizedNewStatus === "NEW") targetRole = "financial_officer";
            else if (normalizedNewStatus === "REJECTED") targetRole = "user";
        }

        // Append audit history
        claim.history.push({
            actorId: actor._id,
            actorName: actor.name,
            actorRole: actorRole,
            fromStatus,
            toStatus: normalizedNewStatus,
            note: note || "",
            targetRole: (targetRole || "").toLowerCase().trim(),
            timestamp: new Date(),
        });

        await claim.save();

        // Fire notifications (non-blocking)
        dispatchTransitionNotifications(claim, fromStatus, normalizedNewStatus).catch((e) =>
            console.error("[Notification Dispatch Error]", e.message)
        );

        res.status(200).json({
            success: true,
            message: `Claim successfully transitioned from '${fromStatus}' to '${normalizedNewStatus}'.`,
            data: claim,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Resubmit a PENDING claim (User only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/v1/claims/:id/resubmit
 * Only the original claimant can resubmit. Claim must be in PENDING status.
 */
const resubmitClaim = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const queryConditions = [{ claimRefNo: id }];
        if (mongoose.isValidObjectId(id)) queryConditions.push({ _id: id });

        const claim = await Claim.findOne({ $or: queryConditions });
        if (!claim) {
            return res.status(404).json({ success: false, message: "Claim not found." });
        }

        if (claim.claimantId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the original claimant can resubmit this claim.",
            });
        }

        if (claim.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: `Only PENDING claims can be resubmitted. Current status: '${claim.status}'.`,
            });
        }

        claim.status = "SUBMITTED";
        claim.history.push({
            actorId: req.user._id,
            actorName: req.user.name,
            actorRole: req.user.role,
            fromStatus: "PENDING",
            toStatus: "SUBMITTED",
            note: note || "Claim resubmitted after addressing feedback.",
            timestamp: new Date(),
        });

        await claim.save();

        await sendNotificationToRole({
            role: "financial_officer",
            type: "claim",
            title: `Claim ${claim.claimRefNo} Resubmitted`,
            message: `${req.user.name} has resubmitted claim ${claim.claimRefNo} after addressing the feedback. Please re-review.`,
            claimId: claim._id,
        });

        res.status(200).json({
            success: true,
            message: "Claim resubmitted successfully.",
            data: claim,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Upload attachments to a claim (GridFS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/claims/:id/attachments
 * Accepts up to 10 files via multipart/form-data (field name: "files").
 * Files are stored in MongoDB GridFS; only the file ID is saved in the claim doc.
 */
const uploadClaimAttachments = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!req.files || req.files.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "No files were uploaded." });
        }

        const queryConditions = [{ claimRefNo: id }];
        if (mongoose.isValidObjectId(id)) queryConditions.push({ _id: id });

        const claim = await Claim.findOne({ $or: queryConditions });
        if (!claim) {
            return res.status(404).json({ success: false, message: "Claim not found." });
        }

        // Users can only upload to their own claims
        if (
            req.user.role === "user" &&
            claim.claimantId.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        const uploadedAttachments = [];

        for (const file of req.files) {
            const gridFsId = await uploadToGridFS(file);
            const attachment = {
                fileName: file.originalname,
                fileUrl: gridFsId.toString(), // GridFS _id as string
                fileSize: `${(file.size / 1024).toFixed(2)} KB`,
                uploadedAt: new Date(),
            };
            claim.attachments.push(attachment);
            uploadedAttachments.push(attachment);
        }

        await claim.save();

        res.status(200).json({
            success: true,
            message: `${uploadedAttachments.length} file(s) uploaded successfully.`,
            data: uploadedAttachments,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Hard delete (Admin only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/claims/:id
 * Permanently removes a claim from the database (Admin only).
 */
const deleteClaim = async (req, res, next) => {
    try {
        const claim = await Claim.findByIdAndDelete(req.params.id);
        if (!claim) {
            return res.status(404).json({ success: false, message: "Claim not found." });
        }
        res.status(200).json({ success: true, message: "Claim permanently deleted." });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Claims Summary (Dashboard stats)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/claims/summary
 * Returns fast count aggregation per status for dashboard cards + sidebar badges.
 * Handles both UPPERCASE (migrated legacy) and lowercase status values.
 */
const getClaimsSummary = async (req, res, next) => {
    try {
        const role = (req.user.role || "user").toLowerCase();

        // Build scope filter same as getClaims
        let scopeFilter = {};
        if (role === "user") {
            scopeFilter = { claimantId: req.user._id };
        } else if (role === "financial_officer") {
            scopeFilter = {
                $or: [
                    { claimantId: req.user._id },
                    { status: { $in: ["SUBMITTED","submitted","NEW","new","PENDING","pending","REJECTED","rejected","VERIFIED","verified"] } },
                ],
            };
        } else if (role === "ceo") {
            scopeFilter = {
                $or: [
                    { claimantId: req.user._id },
                    { status: { $in: ["VERIFIED","verified","FURTHER_APPROVAL","further_approval","FURTHER_APPROVAL_APPROVED","further_approval_approved","FURTHER_APPROVAL_REJECTED","further_approval_rejected","APPROVED_FOR_PAYMENT","approved_for_payment","PAID","paid"] } },
                ],
            };
        } else if (role === "chairman") {
            scopeFilter = {
                $or: [
                    { claimantId: req.user._id },
                    { status: { $in: ["FURTHER_APPROVAL","further_approval","FURTHER_APPROVAL_APPROVED","further_approval_approved","FURTHER_APPROVAL_REJECTED","further_approval_rejected"] } },
                ],
            };
        } else if (role === "accountant") {
            scopeFilter = {
                $or: [
                    { claimantId: req.user._id },
                    { status: { $in: ["APPROVED_FOR_PAYMENT","approved_for_payment","PAID","paid"] } },
                ],
            };
        }
        // admin/super_admin: no filter — all claims

        const agg = await Claim.aggregate([
            { $match: scopeFilter },
            { $group: { _id: { $toUpper: "$status" }, count: { $sum: 1 } } },
        ]);

        const counts = {};
        let total = 0;
        agg.forEach(({ _id, count }) => {
            counts[_id] = count;
            total += count;
        });

        res.status(200).json({
            success: true,
            totalClaims: total,
            submitted:             (counts["SUBMITTED"] || 0) + (counts["NEW"] || 0),
            pending:               counts["PENDING"] || 0,
            verified:              counts["VERIFIED"] || 0,
            further_approval:      counts["FURTHER_APPROVAL"] || 0,
            further_approval_approved: counts["FURTHER_APPROVAL_APPROVED"] || 0,
            further_approval_rejected: counts["FURTHER_APPROVAL_REJECTED"] || 0,
            approved_for_payment:  counts["APPROVED_FOR_PAYMENT"] || 0,
            paid:                  counts["PAID"] || 0,
            rejected:              counts["REJECTED"] || 0,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    submitClaim,
    getClaims,
    getClaimById,
    transitionClaim,
    resubmitClaim,
    uploadClaimAttachments,
    deleteClaim,
    getClaimsSummary,
};