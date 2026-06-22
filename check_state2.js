const { ethers } = require("ethers");

const RPC = "https://rpc.testnet.arc.network";
const CONTRACT = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";

const ABI = [
  "function nextLoopId() view returns (uint256)",
  "function getLoop(uint256 loopId) view returns (address, string, uint256, bool)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(CONTRACT, ABI, provider);

  const nextId = await contract.nextLoopId();
  console.log("nextLoopId:", nextId.toString(), "→ loops listed:", (Number(nextId) - 1));

  if (Number(nextId) > 1) {
    for (let i = 1; i < Number(nextId); i++) {
      const [producer, title, price, active] = await contract.getLoop(i);
      console.log(`Loop ${i}: "${title}" price=${price} active=${active} producer=${producer}`);
    }
  } else {
    console.log("NO LOOPS LISTED YET — need to call listLoop first");
    console.log("Run: PRIVATE_KEY=0x... node init_loops.js");
  }
}

main().catch(console.error);
