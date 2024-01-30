// From: https://github.com/yonixw/nodejs-onefile

const https = require("https");

/*

███████ ██   ██  █████  ███    ███ ██████  ██      ███████ ███████ 
██       ██ ██  ██   ██ ████  ████ ██   ██ ██      ██      ██      
█████     ███   ███████ ██ ████ ██ ██████  ██      █████   ███████ 
██       ██ ██  ██   ██ ██  ██  ██ ██      ██      ██           ██ 
███████ ██   ██ ██   ██ ██      ██ ██      ███████ ███████ ███████ 

postReq(echo + "?dpp1=123", null, { x: 5 })
  .then((e) => console.log("result-", e))
  .catch((e) => console.log("error-", e));

postReq(
  "https://domain.com/echo.php",
  { "Content-type": "application/x-www-form-urlencoded" },
  "dpp1=123&dpp2=456"
)
  .then((e) => console.log("result-", e))
  .catch((e) => console.log("error-", e));
  
-----------------------------------------------------------------------

const { postReq, getReq } = require("./fetch-onefile")
const {SLACK_URL} = process.env

exports.handler = async (event) => {
    let result = {err: "initial"}
    try {
         result = await postReq(SLACK_URL, null, {"text": "try"});
        
    } catch (e) {
        result = {"err":`${e}`}
    }
    
    const response = {
        statusCode: 200,
        body: JSON.stringify(result),
    };
    return response;
};

*/

function getReq(_url, _headers) {
    return new Promise((ok, bad) => {
        const headers = _headers || {};
        let result = { status: -1, headers: {}, body: "" };

        if (!_url) return bad("Please provide valid URL");

        try {
            const options = {
                timeout: 30 * 1000,
                method: "GET",
                headers,
            };

            let bodyChunks = [];
            const req = https.request(_url, options, (res) => {
                res.on("data", (buff) => {
                    bodyChunks.push(buff);
                });

                res.on("end", () => {
                    result = {
                        status: res.statusCode,
                        headers: res.headers,
                        body:
                            bodyChunks.length > 0 ? Buffer.concat(bodyChunks).toString() : "",
                    };
                    return ok(result);
                });
            });

            req.on("error", (error) => {
                return bad(error);
            });

            req.on("timeout", () => {
                req.destroy();
            });

            req.end();
        } catch (error) {
            bad(error);
        }
    });
}

function postReq(_url, _headers, body) {
    return new Promise((ok, bad) => {
        const data = typeof body === "string" ? body : JSON.stringify(body || {});
        const headers = _headers || {
            "Content-Type":
                typeof body === "string"
                    ? "application/x-www-form-urlencoded"
                    : "application/json",
        };

        let result = { status: -1, headers: {}, body: "" };

        if (!_url) return bad("Please provide valid URL");

        try {
            const options = {
                timeout: 30 * 1000,
                method: "POST",
                headers,
            };

            let bodyChunks = [];
            const req = https.request(_url, options, (res) => {
                res.on("data", (buff) => {
                    bodyChunks.push(buff);
                });

                res.on("end", () => {
                    result = {
                        status: res.statusCode,
                        headers: res.headers,
                        body:
                            bodyChunks.length > 0 ? Buffer.concat(bodyChunks).toString() : "",
                    };
                    return ok(result);
                });
            });

            req.on("error", (error) => {
                return bad(error);
            });

            req.on("timeout", () => {
                req.destroy();
            });

            req.write(data);
            req.end();
        } catch (error) {
            bad(error);
        }
    });
}

module.exports = { postReq, getReq };

