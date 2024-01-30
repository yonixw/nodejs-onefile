// From: https://github.com/yonixw/nodejs-onefile

const { aes_gcm_encrypt, aes_gcm_decrypt } = require("./aes-gcm-utils");

describe("Main set", () => {
    beforeEach(() => {
        process.env.AES_KEY = "794dec60-5449-4f16-9470-153d7563b831"
    })


    it("Should encrypt", () => {
        expect(aes_gcm_encrypt("123")).not.toBe("123")
        expect(aes_gcm_encrypt("123").length).not.toBeLessThan(process.env.AES_KEY.length)
    })

    it("Should decrypt", () => {
        let testInputs = [
            "abc 123 !! ~",
            "עברית",
            "🙋‍♂️👈👉",
            "🙋‍♂️👈👉 עברית"
        ];

        for (const i of testInputs) {
            expect(aes_gcm_decrypt(aes_gcm_encrypt(i))).toBe(i)
        }
    })
})