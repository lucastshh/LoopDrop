const https = require("https");

const RPC = "https://rpc.testnet.arc.network";
const CONTRACT = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";

const body = JSON.stringify({
  jsonrpc: "2.0",
  method: "eth_getCode",
  params: [CONTRACT, "latest"],
  id: 1
});

const url = new URL(RPC);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", c => data += c);
  res.on("end", () => {
    const j = JSON.parse(data);
    const code = j.result;
    console.log("eth_getCode result:", code === "0x" ? "NO CONTRACT (empty)" : "CONTRACT EXISTS, length=" + code.length);
    console.log("Full:", code.slice(0, 100));
  });
});
req.on("error", e => console.error(e.message));
req.write(body);
req.end();

// Also check chain ID
const body2 = JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 2 });
const options2 = { ...options, headers: { ...options.headers, "Content-Length": Buffer.byteLength(body2) } };
const req2 = https.request(options2, (res) => {
  let data = "";
  res.on("data", c => data += c);
  res.on("end", () => {
    const j = JSON.parse(data);
    console.log("Chain ID (hex):", j.result, "=> decimal:", parseInt(j.result, 16));
  });
});
req2.on("error", e => console.error(e.message));
req2.write(body2);
req2.end();
