const {
    appToken,
    genServerHMACTicket, genAppClientHMACTicket,
    verifyHMACTicket,
    lambdaVerifyHMACTicket
} = require("./app-auth-hmac")

describe("Main set", () => {
    beforeAll(() => {
        process.env.HMAC_SECRET = "123"
    })

    it("Should have secret", () => {
        expect(!!process.env.HMAC_SECRET).toBe(true)
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

        process.env.HMAC_SECRET = "123XX"
        const verifyResult = verifyHMACTicket(appClientToken);
        process.env.HMAC_SECRET = "123"

        expect(verifyResult.valid).toBe(false)
    })

    it("Client token should NOT be valid on out of time token", () => {
        const delta24hour = 24 * 60 * 60 * 1000;

        const { appClientToken1 } = newAppClientToken(-delta24hour)
        const verifyResult1 = verifyHMACTicket(appClientToken1);

        const { appClientToken2 } = newAppClientToken(delta24hour)
        const verifyResult2 = verifyHMACTicket(appClientToken2);

        expect(verifyResult1.valid).toBe(false)
        expect(verifyResult2.valid).toBe(false)
    })
})