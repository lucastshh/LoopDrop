const https = require("https");
const fs = require("fs");

const CONTRACT_ADDRESS = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";
const standardInput = fs.readFileSync("standard_input.json", "utf8");

const params = new URLSearchParams({
  module: "contract",
  action: "verifysourcecode",
  contractaddress: CONTRACT_ADDRESS,
  contractname: "LoopDrop",
  compilerversion: "v0.8.20+commit.a1b79de6",
  optimizationused: "1",
  runs: "200",
  sourceCode: standardInput,
  codeformat: "solidity-standard-json-input",
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

console.log("Submitting verification...");

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (c) => { data += c; });
  res.on("end", () => {
    console.log("HTTP Status:", res.statusCode);
    console.log("Response:", data);
    try {
      const j = JSON.parse(data);
      if (j.result) console.log("GUID:", j.result);
    } catch(e) {}
  });
});
req.on("error", (e) => console.error("Error:", e.message));
req.write(bodyStr);
req.end();
