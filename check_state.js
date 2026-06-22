const https = require("https");

const RPC = "https://rpc.testnet.arc.network";
const CONTRACT = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";

// ABI encoded calls
// nextLoopId() => keccak256("nextLoopId()")[0:4] = 0xb5a8f835
// getLoop(1) => keccak256("getLoop(uint256)")[0:4] + padded 1

function call(data) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      jsonrpc: "2.0", method: "eth_call",
      params: [{ to: CONTRACT, data }, "latest"],
      id: 1
    });
    const req = https.request({
      hostname: "rpc.testnet.arc.network",
      path: "/",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); }
      });
    });
    req.on("error", e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  // nextLoopId()
  const r1 = await call("0xb5a8f835");
  const nextId = parseInt(r1.result, 16);
  console.log("nextLoopId:", nextId, "(loops listed:", nextId - 1, ")");

  if (nextId > 1) {
    // getLoop(1)
    const r2 = await call("0x80e7fc19" + "0000000000000000000000000000000000000000000000000000000000000001");
    console.log("getLoop(1) raw:", r2.result ? r2.result.slice(0, 200) : r2);
  }

  // Check if USDC address has any code (is it a real ERC20 or native?)
  const body3 = JSON.stringify({
    jsonrpc: "2.0", method: "eth_getCode",
    params: ["0x3600000000000000000000000000000000000000", "latest"],
    id: 3
  });
  const req3 = https.request({
    hostname: "rpc.testnet.arc.network", path: "/", method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body3) }
  }, res => {
    let d = "";
    res.on("data", c => d += c);
    res.on("end", () => {
      const j = JSON.parse(d);
      const code = j.result;
      console.log("USDC 0x3600 code length:", code.length, code === "0x" ? "(NO CODE - might be precompile)" : "(HAS CODE)");
      console.log("USDC code first 40 chars:", code.slice(0, 40));
    });
  });
  req3.on("error", e => console.error(e.message));
  req3.write(body3);
  req3.end();
}

main();
