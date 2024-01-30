// From: https://github.com/yonixw/nodejs-onefile

const {
    appToken,
    signAppHMAC256, verifyAppHMAC256,
    genServerHMACTicket, genAppClientHMACTicket,
    verifyHMACTicket,
    lambdaVerifyHMACTicket
} = require("./app-auth-hmac")

describe("Main set", () => {
    beforeEach(() => {
        process.env.APP_AUTH_HMAC_SECRET = "123"
    })

    const delta24hour = 24 * 60 * 60 * 1000;

    function expectError(text, not = false) {
        let result = /error/i.test(text)
        if (not) result = !result;
        expect(result).toBe(true);
    }

    it("Should return no app secret on empty or problem", () => {
        expectError(appToken("apppppppp"), true)
        expectError(appToken("Bad App Name!!!"))
        expectError(appToken(false))
        process.env.APP_AUTH_HMAC_SECRET = ""
        expectError(appToken("apppppppp"))
    })

    it("Should not sign on bad param", () => {
        process.env.APP_AUTH_HMAC_SECRET = ""

        expectError(genAppClientHMACTicket())
        expectError(genAppClientHMACTicket("bad app name !!! . . "))
        expectError(genAppClientHMACTicket("app-id-12345", null, null, null))
        expectError(genAppClientHMACTicket("app-id-12345", appToken("app-id-12345"), null, null))
        expectError(genAppClientHMACTicket("app-id-12345", appToken("app-id-12345"), 0, null))
        expectError(genAppClientHMACTicket("app-id-12345", appToken("app-id-12345"), 0, "salt", null))

        expectError(signAppHMAC256())
        expectError(signAppHMAC256("bad app name !!! . . "));
        expectError(signAppHMAC256("app-id-12345", null));
        expectError(signAppHMAC256("app-id-12345", 0, null));
        expectError(signAppHMAC256("app-id-12345", 0, "salt", null));
    })

    it("Should not verify on bad param", () => {
        const appid = "app-id-12345";
        const timestamp = Date.now();
        const salt = "salt";
        const proof = signAppHMAC256(appid, timestamp, salt);


        expect(verifyAppHMAC256().valid).toBe(false)
        expect(verifyAppHMAC256(appid, null, null, proof).valid).toBe(false)
        expect(verifyAppHMAC256(appid, timestamp, null, proof).valid).toBe(false)
        expect(verifyAppHMAC256(appid, timestamp, salt, null).valid).toBe(false)
        expect(verifyAppHMAC256(appid, timestamp, salt, proof).valid).toBe(true)
    })

    it("Should not verify on bad timestamp", () => {
        const appid = "app-id-12345";
        const timestamp = Date.now() - delta24hour;
        const salt = "salt";
        const proof = signAppHMAC256(appid, timestamp, salt);

        expect(verifyAppHMAC256(appid, timestamp, salt, proof).valid).toBe(false)
        expect(verifyAppHMAC256(appid, timestamp, salt, proof).proofOk).toBe(true)
        expect(verifyAppHMAC256(appid, timestamp, salt, proof).timeWindowValid).toBe(false)
    })


    it("Should have secret", () => {
        expect(!!process.env.APP_AUTH_HMAC_SECRET).toBe(true)
    })

    function newAppClientToken(timeDelta = 0) {
        const appid = "test-app-12345"
        const appSecret = appToken(appid)
        const _date = Date.now() - timeDelta
        const salt = "salt"
        const appClientToken = genAppClientHMACTicket(appid, appSecret, _date, salt)
        return { appid, _date, salt, appClientToken }
    }

    it("Server token should equal client token", () => {
        const { appid, _date, salt, appClientToken } = newAppClientToken()
        const serverToken = genServerHMACTicket(appid, _date, salt);

        expect(serverToken).toBe(appClientToken)
    })

    it("Client token should be valid", () => {
        const { appid, _date, salt, appClientToken } = newAppClientToken()
        const verifyResult = verifyHMACTicket(appClientToken);

        expect(verifyResult.valid).toBe(true)
        expect(verifyResult.appid).toBe(appid)
    })

    it("Client token should NOT be valid on diff secret", () => {
        const { appid, _date, salt, appClientToken } = newAppClientToken()

        process.env.APP_AUTH_HMAC_SECRET = "123XX"
        const verifyResult = verifyHMACTicket(appClientToken);
        process.env.APP_AUTH_HMAC_SECRET = "123"

        expect(verifyResult.valid).toBe(false)
    })

    it("Client token should NOT be valid on out of time token", () => {

        const { appClientToken1 } = newAppClientToken(-delta24hour)
        const verifyResult1 = verifyHMACTicket(appClientToken1);

        const { appClientToken2 } = newAppClientToken(delta24hour)
        const verifyResult2 = verifyHMACTicket(appClientToken2);

        expect(verifyResult1.valid).toBe(false)
        expect(verifyResult2.valid).toBe(false)
    })

    it("Should not verify on bad ticket params", () => {
        const appName = "app-id-1234"
        const appSecret = appToken(appName);
        const validTime = Date.now();
        const notValidTime = Date.now() - delta24hour;
        const salt = "salt";
        const proof = signAppHMAC256(appName, validTime, salt, appSecret);

        const ticket = genAppClientHMACTicket(appName, appSecret, validTime, salt);

        expect(verifyHMACTicket(ticket).valid).toBe(true)
        expect(verifyHMACTicket(ticket.replace(appName, "bad.!$appname")).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace(appName, "")).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace(validTime, notValidTime)).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace(validTime, "")).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace(salt, "other-salt")).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace(salt, "")).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace(proof, "other-proof")).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace(proof, "")).valid).toBe(false)
        expect(verifyHMACTicket(ticket.replace("sha", "not-sha")).valid).toBe(false)
        expect(verifyHMACTicket({}).valid).toBe(false)

    })

    it("Should not generate for unknown algo", () => {
        const appName = "app-id-1234"
        const appSecret = appToken(appName);
        const validTime = Date.now();
        const salt = "salt";

        expectError(genAppClientHMACTicket(appName, appSecret, validTime, salt, "not-sha"))
        expectError(genServerHMACTicket(appName, appSecret, validTime, salt, "not-sha"))
    })

    it("Should verify with lambda helper", () => {
        const appid = "app-id-1234";
        const ticket = genServerHMACTicket(appid);

        expect(lambdaVerifyHMACTicket({ queryStringParameters: { ticket } }).valid).toBe(true)
        expect(lambdaVerifyHMACTicket({ headers: { ticket } }).valid).toBe(true)
        expect(lambdaVerifyHMACTicket({ headers: { "x-ticket": ticket } }).valid).toBe(true)

        expect(lambdaVerifyHMACTicket({ appgroup: "prefix", appid }).valid).toBe(false)
        expect(lambdaVerifyHMACTicket({ appgroup: "prefix", appid }).error).toContain(appToken("prefix" + "-" + appid))

    })
})