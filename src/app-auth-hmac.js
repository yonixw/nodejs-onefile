const crypto = require("crypto")

function secureRandom(bytes = 64) {
    const buf = Buffer.alloc(bytes);
    return crypto.randomFillSync(buf).toString('hex');
}

function appToken(appid) {
    const SECRET = process.env.HMAC_SECRET;

    if (!SECRET) {
        console.log("HMAC_SECRET not defined, return random!!");
        return "Missing define! random=" + secureRandom();
    }

    return crypto
        .createHash('sha256')
        .update(`sha256|${appid}|${SECRET}|${appid}|${SECRET}`)
        .digest('hex');
}

function signAppHMAC256(appid, timestamp = Date.now(), salt = secureRandom(16), appsecret = appToken(appid)) {

    if (!/^[a-zA-Z0-9\-]{5,}$/.test(appid || "")) {
        return "Bad format appid, expecting=^[a-zA-Z0-9\-]{5,}$, random=" + secureRandom()
    }
    if (!appid || !timestamp || !salt) {
        console.log("signAppHMAC256 Arguments are null, return random!",
            { appid, timestamp, salt });
        return "Missing params! random=" + secureRandom();
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

    if (!appid || !_time || !proof || !salt || !parseInt(maxTime)) return false;

    const timeWindowValid = (Date.now() - _time < maxTime);
    const proofOk = signAppHMAC256(appid, timestamp, salt) === proof;


    return proofOk && timeWindowValid;
}

function genHMACTicket(appid, timestamp = Date.now(), salt = secureRandom(16), algo = "sha256") {
    //signAppHMAC000 has the shared secret in the proof

    if (algo == "sha256") {
        return `sha256.ticketv1.${appid}.${timestamp}.${salt}.${signAppHMAC256(appid, timestamp, salt)}`
    }
    return "Unsupported algo '" + String(algo) + "' for token"
}

function verifyHMACTicket(ticket) {
    try {
        const parts = (ticket || "").split('.')
        if (parts.length !== 6)
            return { valid: false, error: "Ticket parts len mismatch" };

        let { 0: algo, 1: version, 2: appid, 3: timestamp, 4: salt, 5: proof } = parts;
        if (!algo || !appid || !timestamp || !salt || !proof) {
            return { valid: false, error: "Missing params" };
        }

        if (algo === "sha256" && version == "ticketv1") {
            if (verifyAppHMAC256(appid, timestamp, salt, proof)) {
                return { valid: true, appid, error: null }
            }
            else {
                return { valid: false, error: "Not valid ticket" }
            }
        } else {
            return { valid: false, error: "Unknwon verifyHMACTicket algo=" + algo + ", version=" + version };
        }

        return { valid: false, error: "End of cases" };
    } catch (e) {
        return { valid: false, error: `Error: ${e}` };
    }
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
    //let { valid, appid, error } = verifyHMACTicket(ticket)
    return verifyHMACTicket(ticket);
}

module.exports = {
    genHMACTicket, verifyHMACTicket,
    lambdaVerifyHMACTicket
}