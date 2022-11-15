import https from "https";
import http from "http";

type HTTPResponse = {
  status: number;
  headers: { [key: string]: string };
  body: string;
};

export function getReq(_url: string, _headers) {
  return new Promise<HTTPResponse>((ok, bad) => {
    const headers = _headers || {};
    let result = { status: -1, headers: {}, body: "" };

    if (!_url) return bad("Please provide valid URL");

    try {
      const options = {
        timeout: 30 * 1000,
        method: "GET",
        headers,
      };

      let bodyChunks: Buffer[] = [];
      const req = (_url.startsWith("http:") ? http : https).request(
        _url,
        options,
        (res) => {
          res.on("data", (buff) => {
            bodyChunks.push(buff);
          });

          res.on("end", () => {
            result = {
              status: res.statusCode || 999,
              headers: res.headers,
              body:
                bodyChunks.length > 0
                  ? Buffer.concat(bodyChunks).toString()
                  : "",
            };
            return ok(result);
          });
        }
      );

      req.on("error", (error) => {
        return bad(error);
      });

      req.on("timeout", () => {
        req.destroy();
      });

      req.end();
    } catch (error) {
      return bad(error);
    }
  });
}

export function postReq(_url, _headers, body) {
  return new Promise<HTTPResponse>((ok, bad) => {
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

      let bodyChunks: Buffer[] = [];
      const req = (_url.startsWith("http:") ? http : https).request(
        _url,
        options,
        (res) => {
          res.on("data", (buff) => {
            bodyChunks.push(buff);
          });

          res.on("end", () => {
            result = {
              status: res.statusCode || 999,
              headers: res.headers,
              body:
                bodyChunks.length > 0
                  ? Buffer.concat(bodyChunks).toString()
                  : "",
            };
            return ok(result);
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
      });

      req.on("error", (error) => {
        return bad(error);
      });

      req.write(data);
      req.end();
    } catch (error) {
      bad(error);
    }
  });
}

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
