const https = require("https");
const fs = require("fs");

const CONTRACT = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";
const standardInput = fs.readFileSync("standard_input.json", "utf8");

// Blockscout v2 verification via standard-input — multipart/form-data
const boundary = "----LoopDropVerify" + Date.now();

function buildMultipart(fields) {
  let body = "";
  for (const [name, value] of Object.entries(fields)) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${name}"\r\n\r\n`;
    body += `${value}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return body;
}

const formData = buildMultipart({
  compiler_version: "v0.8.20+commit.a1b79de6",
  license_type: "mit",
  source_code: standardInput,
  autodetect_constructor_args: "true",
  constructor_args: "0000000000000000000000003600000000000000000000000000000000000000"
});

const options = {
  hostname: "testnet.arcscan.app",
  path: `/api/v2/smart-contracts/${CONTRACT}/verification/via/standard-input`,
  method: "POST",
  headers: {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": Buffer.byteLength(formData)
  }
};

console.log("Submitting via v2 multipart standard-input...");

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", c => data += c);
  res.on("end", () => {
    console.log("HTTP Status:", res.statusCode);
    console.log("Response:", data.slice(0, 500));
  });
});
req.on("error", e => console.error("Error:", e.message));
req.write(formData);
req.end();
