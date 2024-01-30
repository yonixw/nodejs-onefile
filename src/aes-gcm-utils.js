/*
 █████  ███████ ███████      ██████   ██████ ███    ███     ██    ██     ██ 
██   ██ ██      ██          ██       ██      ████  ████     ██    ██    ███ 
███████ █████   ███████     ██   ███ ██      ██ ████ ██     ██    ██     ██ 
██   ██ ██           ██     ██    ██ ██      ██  ██  ██      ██  ██      ██ 
██   ██ ███████ ███████      ██████   ██████ ██      ██       ████   ██  ██ 
            From: https://github.com/yonixw/nodejs-onefile

Simple encrypting and decrypting with AES GCM. 

How to use:
const { aes_gcm_encrypt, aes_gcm_decrypt } = require("./aes-gcm-utils");

aes_gcm_encrypt(plain_text:string, optionalKey:string?) : string
aes_gcm_decrypt(encrypt_result: string, optionalKey:string?) : string

env.AES_KEY will be used if not key provided

*/

const crypto = require("crypto")

/*
Get supported AES on the target machine (no cbc because it's weak, prefer gcm with most bytes):
    console.log(
        crypto.getCiphers()
        .filter(e => e.startsWith("aes-") && e.indexOf("-cbc") < 0)
    );
*/

const common = {
    algo: process.env.AES_ALGO || "aes-256-gcm",
    key_size: parseInt(process.env.AES_KEY_LEN || "32"),
    iv_size: parseInt(process.env.AES_IV_LEN || "16"),
    hash_size: process.env.AES_HASH_LEN || "512"
}

// IV||encrypted_text||tag

const prepare = (keyStr) => {
    keyStr = keyStr || process.env.AES_KEY || "";
    if (keyStr.length < 36)
        throw new Error("Key must be at least 36 char long (like UUID)")

    let keyHash = crypto
        .createHash('sha' + common.hash_size)
        .update(keyStr)
        .digest().subarray(0, common.key_size)

    return { keyHash }
}

const encrypt = (plainStr, keyStr = null) => {
    let { keyHash } = prepare(keyStr);
    let iv = crypto.randomBytes(12)

    const cipher = crypto.createCipheriv(common.algo, keyHash, iv);

    let enc = cipher.update(plainStr, 'utf8', 'base64');
    enc += cipher.final('base64');

    const result = {
        iv: iv.toString('hex'),
        enc,
        tag: cipher.getAuthTag().toString('hex')
    }

    return Buffer.from(JSON.stringify(result), "utf-8").toString("base64");
}

const decrypt = (encObj, keyStr = null) => {
    let { keyHash } = prepare(keyStr);
    let { iv, enc, tag } = JSON.parse(Buffer.from(encObj, "base64").toString("utf-8"));

    const decipher = crypto.createDecipheriv(common.algo, keyHash, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let str = decipher.update(enc, 'base64', 'utf8');
    str += decipher.final('utf8');

    return str;
}

module.exports = { aes_gcm_encrypt: encrypt, aes_gcm_decrypt: decrypt }