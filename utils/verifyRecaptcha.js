/**
 * Verifies a Google reCAPTCHA v2/v3 response token with Google's siteverify API.
 * If RECAPTCHA_SECRET_KEY is not configured, verification is skipped so environments
 * without keys continue to function until configured.
 *
 * @param {string} token - The g-recaptcha-response token from the client
 * @param {string} [remoteIp] - Optional client IP address
 * @returns {Promise<{ ok: boolean, skipped?: boolean, message?: string }>}
 */
async function verifyRecaptcha(token, remoteIp) {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret || secret.trim() === "") {
        return { ok: true, skipped: true };
    }

    if (!token || typeof token !== "string" || token.trim() === "") {
        return { ok: false, message: "Please complete the reCAPTCHA verification." };
    }

    try {
        const params = new URLSearchParams({
            secret: secret.trim(),
            response: token.trim(),
        });
        if (remoteIp) {
            params.append("remoteip", remoteIp);
        }

        const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        const data = await res.json();
        if (!data.success) {
            return {
                ok: false,
                message: "reCAPTCHA verification failed. Please try again.",
            };
        }

        return { ok: true };
    } catch (err) {
        console.error("[reCAPTCHA] Verification request failed:", err.message);
        return {
            ok: false,
            message: "Unable to verify reCAPTCHA. Please try again.",
        };
    }
}

module.exports = verifyRecaptcha;

