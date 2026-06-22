const https = require("https");

const CONTRACT = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";

// Check if ArcScan has indexed the contract
function get(path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: "testnet.arcscan.app",
      path,
      method: "GET",
      headers: { "User-Agent": "node" }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data.slice(0, 300) }));
    });
    req.on("error", e => resolve({ error: e.message }));
    req.end();
  });
}

async function main() {
  // Check v2 API contract endpoint
  const r1 = await get(`/api/v2/addresses/${CONTRACT}`);
  console.log("v2/addresses:", r1.status, r1.body);

  const r2 = await get(`/api/v2/smart-contracts/${CONTRACT}`);
  console.log("v2/smart-contracts:", r2.status, r2.body.slice(0, 200));

  // Check etherscan API getabi
  const r3 = await get(`/api?module=contract&action=getabi&address=${CONTRACT}`);
  console.log("v1 getabi:", r3.status, r3.body);
}

main();
