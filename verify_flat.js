const https = require("https");
const fs = require("fs");

const CONTRACT = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";
const src = fs.readFileSync("contracts/LoopDrop.sol", "utf8");

// Try flat source code (not standard-json)
const params = new URLSearchParams({
  module: "contract",
  action: "verifysourcecode",
  contractaddress: CONTRACT,
  contractname: "LoopDrop",
  compilerversion: "v0.8.20+commit.a1b79de6",
  optimizationUsed: "1",
  runs: "200",
  sourceCode: src,
  codeformat: "solidity-single-file",
  constructorArguements: "0000000000000000000000003600000000000000000000000000000000000000",
  licenseType: "3"
});

const bodyStr = params.toString();

const options = {
  hostname: "testnet.arcscan.app",
  path: "/api",
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": Buffer.byteLength(bodyStr)
  }
};

console.log("Trying flat source code verification...");

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", c => data += c);
  res.on("end", () => {
    console.log("HTTP Status:", res.statusCode);
    console.log("Response:", data);
  });
});
req.on("error", e => console.error("Error:", e.message));
req.write(bodyStr);
req.end();
