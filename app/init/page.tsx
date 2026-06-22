"use client";
import { useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";
const ARC_CHAIN_ID = 5042002;
const ARC_RPC = "https://rpc.testnet.arc.network";
const ARCSCAN = "https://testnet.arcscan.app";

const ABI = [
  "function listLoop(string title, uint256 price) returns (uint256)",
  "function nextLoopId() view returns (uint256)",
  "function getLoop(uint256 loopId) view returns (address, string, uint256, bool)",
];

const LOOPS_TO_LIST = [
  { title: "140bpm dark drill perc", price: 100000 },
  { title: "lofi jazz chord loop",   price: 70000  },
  { title: "trap hi-hat roll 808",   price: 50000  },
  { title: "ambient pad texture A#", price: 150000 },
  { title: "jersey club bounce kit", price: 80000  },
  { title: "melodic sample Gm sad",  price: 120000 },
];

export default function InitPage() {
  const [wallet, setWallet] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  async function connectAndInit() {
    if (!window.ethereum) { alert("Install Rabby or MetaMask"); return; }
    setRunning(true);
    setLog([]);
    setDone(false);

    try {
      // Connect wallet
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts[0];
      setWallet(addr);
      addLog(`✓ Connected: ${addr}`);

      // Switch to ARC testnet
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + ARC_CHAIN_ID.toString(16) }],
        });
        addLog(`✓ Switched to ARC Testnet (${ARC_CHAIN_ID})`);
      } catch {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x" + ARC_CHAIN_ID.toString(16),
            chainName: "ARC Testnet",
            rpcUrls: [ARC_RPC],
            nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
            blockExplorerUrls: [ARCSCAN],
          }],
        });
        addLog(`✓ Added + switched to ARC Testnet`);
      }

      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // Check current state
      const nextId = await contract.nextLoopId();
      const alreadyListed = Number(nextId) - 1;
      addLog(`Current state: ${alreadyListed} loops on-chain (nextLoopId=${nextId})`);

      // Show existing loops
      for (let i = 1; i <= alreadyListed; i++) {
        const [, title, price, active] = await contract.getLoop(i);
        addLog(`  [${i}] "${title}" $${Number(price)/1e6} USDC active=${active}`);
      }

      // List only remaining loops (starting from nextLoopId index in our array)
      const remaining = LOOPS_TO_LIST.slice(alreadyListed);
      if (remaining.length === 0) {
        addLog(`✅ All ${LOOPS_TO_LIST.length} loops already on-chain! BUY should work.`);
        setDone(true);
        setRunning(false);
        return;
      }

      addLog(`─── Listing ${remaining.length} remaining loops ───`);
      for (let i = 0; i < remaining.length; i++) {
        const loop = remaining[i];
        const idx = alreadyListed + i + 1;
        addLog(`[${idx}/${LOOPS_TO_LIST.length}] "${loop.title}" @ $${loop.price/1e6} USDC...`);
        const tx = await contract.listLoop(loop.title, loop.price);
        addLog(`  ⏳ tx: ${tx.hash.slice(0,18)}...`);
        const receipt = await tx.wait();
        addLog(`  ✓ block ${receipt.blockNumber}`);
      }

      const finalId = await contract.nextLoopId();
      addLog(`─────────────────────────────────────`);
      addLog(`✅ Done! ${Number(finalId) - 1}/${LOOPS_TO_LIST.length} loops on-chain`);
      addLog(`✅ Go to homepage — all BUY buttons live!`);
      setDone(true);

    } catch (e: unknown) {
      addLog(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setRunning(false);
  }

  return (
    <div style={{ background: "#ffff88", minHeight: "100vh", padding: "20px", fontFamily: "Courier New, monospace" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Arial", fontSize: 22, borderBottom: "3px solid #000", paddingBottom: 8 }}>
          <span style={{ color: "#ff0000" }}>LOOP</span>DROP — Init Loops
        </h1>

        <div style={{ background: "#fff8dc", border: "2px solid #000", padding: 12, marginBottom: 16, fontSize: 13 }}>
          <strong>What this does:</strong> Calls <code>listLoop()</code> on the deployed contract for all 6 loops.
          This is a one-time setup. After this, BUY buttons on the main page will work.
          <br /><br />
          Contract: <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">{CONTRACT_ADDRESS}</a>
        </div>

        {wallet && (
          <div style={{ marginBottom: 12, fontSize: 12, color: "#008800" }}>
            ✓ Connected: {wallet}
          </div>
        )}

        <button
          onClick={connectAndInit}
          disabled={running}
          style={{
            background: running ? "#888" : done ? "#006600" : "#ff0000",
            color: "#fff",
            border: "3px outset #fff",
            fontFamily: "Arial",
            fontWeight: "bold",
            fontSize: 14,
            padding: "10px 24px",
            cursor: running ? "default" : "pointer",
            marginBottom: 16,
            width: "100%"
          }}
        >
          {running ? "⏳ Running — confirm txs in wallet..." : done ? "✅ Done! Loops are live" : "🔌 Connect Wallet & List All Loops"}
        </button>

        {log.length > 0 && (
          <div style={{
            background: "#000",
            color: "#00ff00",
            padding: 12,
            fontSize: 12,
            lineHeight: 1.6,
            border: "2px solid #00ff00",
            maxHeight: 400,
            overflowY: "auto"
          }}>
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {done && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <a href="/" style={{
              background: "#0000ee",
              color: "#fff",
              padding: "8px 20px",
              fontFamily: "Arial",
              fontWeight: "bold",
              textDecoration: "none",
              border: "2px solid #000"
            }}>
              → Go to LoopDrop homepage
            </a>
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 11, color: "#666", textAlign: "center" }}>
          This page is not linked from the main site. One-time use only.
        </div>
      </div>
    </div>
  );
}
