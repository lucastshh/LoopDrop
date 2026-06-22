const https = require("https");
const fs = require("fs");

const CONTRACT_ADDRESS = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";
const COMPILER_VERSION = "v0.8.20+commit.a1b79de6";

const standardInput = fs.readFileSync("standard_input.json", "utf8");

// ArcScan uses Blockscout-compatible API
// POST to /api/v2/smart-contracts/{address}/verification/via/standard-input
const body = JSON.stringify({
  compiler_version: COMPILER_VERSION,
  license_type: "mit",
  source_code: standardInput,
  autodetect_constructor_args: true,
  constructor_args: "0000000000000000000000003600000000000000000000000000000000000000"
});

const options = {
  hostname: "testnet.arcscan.app",
  path: `/api/v2/smart-contracts/${CONTRACT_ADDRESS}/verification/via/standard-input`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  }
};

console.log("Submitting verification to ArcScan...");
console.log("Contract:", CONTRACT_ADDRESS);
console.log("Compiler:", COMPILER_VERSION);

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
    try {
      const parsed = JSON.parse(data);
      if (parsed.message) console.log("Message:", parsed.message);
      if (parsed.status) console.log("Status field:", parsed.status);
    } catch (e) {
      // not JSON, print raw
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.write(body);
req.end();
