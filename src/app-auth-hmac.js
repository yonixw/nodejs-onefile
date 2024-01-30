/*
 █████  ██████  ██████       █████  ██    ██ ████████ ██   ██     ██    ██     ██ 
██   ██ ██   ██ ██   ██     ██   ██ ██    ██    ██    ██   ██     ██    ██    ███ 
███████ ██████  ██████      ███████ ██    ██    ██    ███████     ██    ██     ██ 
██   ██ ██      ██          ██   ██ ██    ██    ██    ██   ██      ██  ██      ██ 
██   ██ ██      ██          ██   ██  ██████     ██    ██   ██       ████   ██  ██ 
            From: https://github.com/yonixw/nodejs-onefile

Simple system to create apps that can come and ask. each app will have a secret derived from a master secret.
That way you can track what app was used, and ban them if any abuse found without affecting other apps.

TODO: move to JWT where shared_secret = hash(master_secret, appid) ? Do we have "onefile" for JWT?

How to use:
    Backend Server:
        env.APP_AUTH_HMAC_SECRET:
            - Long secure master secret
        appToken(appid:string): string 
            - Create the secret token that the app need to know (together with appid) to authenticate as a server app.
            - Deterministic, so the server doesn't have to store it in DB
            - Should be protected with Admin (otherwise one can get fake apps)
        verifyHMACTicket (ticket: string) : { valid: boolean, error: string, appid: string? }
            - Verify a ticket from a client. If valid, appid will have value;
            - There is a maximum of `maxTime` (5min) before a ticket becomes invalid.
    Client/App Server:
        genAppClientHMACTicket(appid:string, appsecret:string) : string
            - The ticket to append to the request to authenticate as an app of the server

*/


const crypto = require("crypto")

function secureRandom(bytes = 64) {
    const buf = Buffer.alloc(bytes);
    return crypto.randomFillSync(buf).toString('hex');
}

function appToken(appid) {
    const SECRET = process.env.APP_AUTH_HMAC_SECRET;

    if (!SECRET) {
        console.log("APP_AUTH_HMAC_SECRET not defined, return random!!");
        return "Error: Missing define! random=" + secureRandom();
    }

    if (!/^[a-z0-9\-]{5,}$/.test(appid || "")) {
        return "Error: Bad format appid, expecting=^[a-zA-Z0-9\-]{5,}$, random=" + secureRandom()
    }

    return crypto
        .createHash('sha256')
        .update(`sha256|${appid}|${SECRET}|${appid}|${SECRET}`)
        .digest('hex');
}

function signAppHMAC256(appid, timestamp = Date.now(), salt = secureRandom(16), appsecret = appToken(appid)) {

    if (!/^[a-z0-9\-]{5,}$/.test(appid || "")) {
        return "Error: Bad format appid, expecting=^[a-zA-Z0-9\-]{5,}$, random=" + secureRandom()
    }
    if (!appid || !timestamp || !salt) {
        console.log("Error: signAppHMAC256 Arguments are null, return random!",
            { appid, timestamp, salt });
        return "Error: Missing params! random=" + secureRandom();
    }

    const hmac = crypto
        .createHash('sha256')
        // proof have shared secret appsecret that derived per app
        .update(`sha256|${timestamp}|${salt}|${appsecret}|${appid}`)
        .digest('hex');

    return hmac;
}

function verifyAppHMAC256(appid, timestamp, salt, proof, maxTime = 5 * 60 * 1000) {
    const _time = parseInt(timestamp);

    if (!appid || !_time || !proof || !salt || !parseInt(maxTime)) return {
        valid: false, proofOk: false, timeWindowValid: false
    }


    const timeWindowValid = (Math.abs(Date.now() - _time) < maxTime);
    const proofOk = signAppHMAC256(appid, timestamp, salt) === proof;


    return { valid: proofOk && timeWindowValid, proofOk, timeWindowValid };
}

function genServerHMACTicket(appid, timestamp = Date.now(), salt = secureRandom(16), algo = "sha256") {
    //signAppHMAC000 has the shared secret in the proof

    if (algo == "sha256") {
        return `sha256.ticketv1.${appid}.${timestamp}.${salt}.` +
            `${signAppHMAC256(appid, timestamp, salt)}`
    }
    return "Error: Unsupported algo '" + String(algo) + "' for token"
}

function genAppClientHMACTicket(appid, appsecret, timestamp = Date.now(), salt = secureRandom(16), algo = "sha256") {

    if (algo == "sha256") {
        return `sha256.ticketv1.${appid}.${timestamp}.${salt}.` +
            `${signAppHMAC256(appid, timestamp, salt, appsecret)}`
    }
    return "Error: Unsupported algo '" + String(algo) + "' for token"
}

function verifyHMACTicket(ticket) {
    let result = { valid: false, error: "init", appid: null }
    try {
        const parts = (ticket || "").split('.')

        if (parts.length !== 6) {
            result.error = "Ticket parts len mismatch";
            return result
        }

        let { 0: algo, 1: version, 2: appid, 3: timestamp, 4: salt, 5: proof } = parts;
        if (!algo || !appid || !timestamp || !salt || !proof) {
            result.error = "Missing params";
            return result;
        }

        if (algo === "sha256" && version == "ticketv1") {
            const verifyResult = verifyAppHMAC256(appid, timestamp, salt, proof);
            if (verifyResult.valid) {
                result.valid = true
                result.appid = appid
                result.error = null
            }
            else {
                result.error = "Not valid ticket " + JSON.stringify(verifyResult)
            }
        } else {
            result.error = "Unknwon verifyHMACTicket algo=" + algo + ", version=" + version;
        }

    } catch (e) {
        result.valid = false;
        result.error = `Error: ${e} `;
        result.appid = null;
    }
    return result;
}

function lambdaVerifyHMACTicket(event) {
    let ticket = ""
    if (event.queryStringParameters && event.queryStringParameters["ticket"]) {
        ticket = event.queryStringParameters["ticket"]
    }
    if (event.headers && event.headers["ticket"]) {
        ticket = event.headers["ticket"]
    }
    if (event.headers && event.headers["x-ticket"]) {
        ticket = event.headers["x-ticket"]
    }
    if (event.appid && event.appgroup) {
        const _appid = event.appgroup + '-' + event.appid
        // Act like verify failed and give info in error
        // Assuming here only lambda admin can set appid in event (unlike http headers, params etc.)
        return { valid: false, appid: _appid, error: `appid=${_appid}, appsecret=${appToken(_appid)}` }
    }

    return verifyHMACTicket(ticket);
}

module.exports = {
    appToken,
    signAppHMAC256, verifyAppHMAC256,
    genServerHMACTicket, genAppClientHMACTicket,
    verifyHMACTicket,
    lambdaVerifyHMACTicket
}
