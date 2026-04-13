const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { query } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const crypto = require('crypto');
const { getSessionUser } = require('./_auth');

// RP = Relying Party
const rpName = 'PC IPM Panawuan';

function getWebAuthnConfig(req) {
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const detectedOrigin = `${protocol}://${host}`;
    const detectedRPID = host.split(':')[0]; // remove port

    return {
        origin: process.env.WEBAUTHN_ORIGIN || detectedOrigin,
        rpID: process.env.WEBAUTHN_RP_ID || detectedRPID
    };
}

async function handleGetRegistrationOptions(req, res) {
    const user = await getSessionUser(req);
    if (!user) return json(res, 401, { status: 'error', message: 'Hanya anggota terdaftar yang bisa registrasi biometrik.' });

    const userAuthenticators = (await query`SELECT credential_id FROM user_authenticators WHERE user_id=${user.id}`).rows;

    const { rpID } = getWebAuthnConfig(req);
    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: String(user.id),
        userName: user.username,
        userDisplayName: user.nama_panjang || user.username,
        attestationType: 'none',
        excludeCredentials: userAuthenticators.map((auth) => ({
            id: auth.credential_id,
            type: 'public-key',
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform',
        },
    });

    // Store challenge
    await query`DELETE FROM webauthn_challenges WHERE user_id=${String(user.id)} AND purpose='registration'`;
    await query`INSERT INTO webauthn_challenges (user_id, challenge, purpose) VALUES (${String(user.id)}, ${options.challenge}, 'registration')`;

    return json(res, 200, options);
}

async function handleVerifyRegistration(req, res) {
    const user = await getSessionUser(req);
    if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

    const body = parseJsonBody(req);
    const challengeRow = (await query`SELECT challenge FROM webauthn_challenges WHERE user_id=${String(user.id)} AND purpose='registration'`).rows[0];

    if (!challengeRow) return json(res, 400, { status: 'error', message: 'Challenge tidak ditemukan' });

    const { origin, rpID } = getWebAuthnConfig(req);
    try {
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (verification.verified) {
            const { registrationInfo } = verification;
            const { credentialPublicKey, credentialID, counter } = registrationInfo;

            await query`INSERT INTO user_authenticators (user_id, credential_id, public_key, counter) VALUES (${user.id}, ${Buffer.from(credentialID).toString('base64url')}, ${Buffer.from(credentialPublicKey).toString('base64url')}, ${counter})`;
            await query`DELETE FROM webauthn_challenges WHERE user_id=${String(user.id)} AND purpose='registration'`;

            return json(res, 200, { status: 'success', message: 'Biometrik berhasil didaftarkan.' });
        }
        return json(res, 400, { status: 'error', message: 'Verifikasi gagal.' });
    } catch (error) {
        console.error(error);
        return json(res, 400, { status: 'error', message: error.message });
    }
}

async function handleGetAuthenticationOptions(req, res) {
    const username = req.query.username;
    if (!username) return json(res, 400, { status: 'error', message: 'Username diperlukan untuk login biometrik.' });

    const user = (await query`SELECT id FROM users WHERE LOWER(username)=${username.toLowerCase()}`).rows[0];
    if (!user) return json(res, 404, { status: 'error', message: 'User tidak ditemukan.' });

    const userAuthenticators = (await query`SELECT credential_id FROM user_authenticators WHERE user_id=${user.id}`).rows;

    const { rpID } = getWebAuthnConfig(req);
    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userAuthenticators.map((auth) => ({
            id: auth.credential_id,
            type: 'public-key',
        })),
        userVerification: 'preferred',
    });

    // Store challenge
    await query`DELETE FROM webauthn_challenges WHERE user_id=${username.toLowerCase()} AND purpose='authentication'`;
    await query`INSERT INTO webauthn_challenges (user_id, challenge, purpose) VALUES (${username.toLowerCase()}, ${options.challenge}, 'authentication')`;

    return json(res, 200, options);
}

async function handleVerifyAuthentication(req, res) {
    const body = parseJsonBody(req);
    const username = req.query.username;
    if (!username) return json(res, 400, { status: 'error', message: 'Username diperlukan.' });

    const user = (await query`SELECT id, username, role, nama_panjang, pimpinan FROM users WHERE LOWER(username)=${username.toLowerCase()}`).rows[0];
    if (!user) return json(res, 404, { status: 'error', message: 'User tidak ditemukan.' });

    const challengeRow = (await query`SELECT challenge FROM webauthn_challenges WHERE user_id=${username.toLowerCase()} AND purpose='authentication'`).rows[0];
    if (!challengeRow) return json(res, 400, { status: 'error', message: 'Challenge kadaluarsa atau tidak ditemukan.' });

    const authenticator = (await query`SELECT * FROM user_authenticators WHERE credential_id=${body.id} AND user_id=${user.id}`).rows[0];
    if (!authenticator) return json(res, 404, { status: 'error', message: 'Alat verifikasi tidak terdaftar.' });

    const { origin, rpID } = getWebAuthnConfig(req);
    try {
        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(authenticator.credential_id, 'base64url'),
                credentialPublicKey: Buffer.from(authenticator.public_key, 'base64url'),
                counter: parseInt(authenticator.counter),
            },
        });

        if (verification.verified) {
            const { authenticationInfo } = verification;
            await query`UPDATE user_authenticators SET counter=${authenticationInfo.newCounter}, last_used_at=NOW() WHERE id=${authenticator.id}`;
            await query`DELETE FROM webauthn_challenges WHERE user_id=${username.toLowerCase()} AND purpose='authentication'`;

            // SUCCESS LOGIN - Create Session
            const token = crypto.randomBytes(24).toString('hex');
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await query`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${user.id}, ${token}, ${user.role || 'user'}, ${expires.toISOString()})`;

            const cookieValue = `session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Secure`;
            res.setHeader('Set-Cookie', cookieValue);

            return json(res, 200, {
                status: 'success',
                user: {
                    id: user.id,
                    username: user.username,
                    nama_panjang: user.nama_panjang,
                    pimpinan: user.pimpinan,
                    role: user.role,
                    session: token
                }
            });
        }
        return json(res, 400, { status: 'error', message: 'Autentikasi biometrik gagal.' });
    } catch (error) {
        console.error(error);
        return json(res, 400, { status: 'error', message: error.message });
    }
}

module.exports = async (req, res) => {
    try {
        const action = req.query.action;
        switch (action) {
            case 'register-options': return await handleGetRegistrationOptions(req, res);
            case 'register-verify': return await handleVerifyRegistration(req, res);
            case 'login-options': return await handleGetAuthenticationOptions(req, res);
            case 'login-verify': return await handleVerifyAuthentication(req, res);
            case 'list-authenticators': {
                const user = await getSessionUser(req);
                if (!user) return json(res, 401, { status: 'error' });
                const count = Number((await query`SELECT COUNT(*)::int AS c FROM user_authenticators WHERE user_id=${user.id}`).rows[0]?.c || 0);
                return json(res, 200, { status: 'success', count });
            }
            default: return json(res, 404, { status: 'error', message: 'WebAuthn action not found' });
        }
    } catch (e) {
        return json(res, 500, { status: 'error', message: e.message });
    }
};
