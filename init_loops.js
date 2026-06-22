// List all 6 loops on-chain via RPC
// Usage: PRIVATE_KEY=0x... node init_loops.js
const { ethers } = require("ethers");

const RPC = "https://rpc.testnet.arc.network";
const CONTRACT = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";

const ABI = [
  "function listLoop(string title, uint256 price) returns (uint256)",
  "function nextLoopId() view returns (uint256)",
  "function getLoop(uint256 loopId) view returns (address, string, uint256, bool)",
];

const LOOPS = [
  { title: "140bpm dark drill perc", price: 100000 },
  { title: "lofi jazz chord loop",   price: 70000  },
  { title: "trap hi-hat roll 808",   price: 50000  },
  { title: "ambient pad texture A#", price: 150000 },
  { title: "jersey club bounce kit", price: 80000  },
  { title: "melodic sample Gm sad",  price: 120000 },
];

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Usage: PRIVATE_KEY=0x... node init_loops.js");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(CONTRACT, ABI, wallet);

  console.log("Wallet:", wallet.address);
  
  const nextId = await contract.nextLoopId();
  console.log("Current nextLoopId:", nextId.toString());

  if (Number(nextId) > 1) {
    console.log("Loops already listed! Checking...");
    for (let i = 1; i < Number(nextId); i++) {
      const loop = await contract.getLoop(i);
      console.log(`Loop ${i}: "${loop[1]}" price=${loop[2]} active=${loop[3]}`);
    }
    return;
  }

  for (const loop of LOOPS) {
    console.log(`Listing: "${loop.title}" @ ${loop.price} (${loop.price/1e6} USDC)...`);
    const tx = await contract.listLoop(loop.title, loop.price);
    const receipt = await tx.wait();
    console.log(`  ✓ tx: ${receipt.hash}`);
  }

  const finalId = await contract.nextLoopId();
  console.log("Done! nextLoopId is now:", finalId.toString());
}

main().catch(console.error);
