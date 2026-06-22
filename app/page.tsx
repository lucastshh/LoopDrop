"use client";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xb8458128dC2603f78637CE1a74A7ee744661cFE0";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = 5042002;
const ARC_RPC = "https://rpc.testnet.arc.network";
const ARCSCAN = "https://testnet.arcscan.app";

const CONTRACT_ABI = [
  "function buyLoop(uint256 loopId) returns (uint256)",
  "function listLoop(string title, uint256 price) returns (uint256)",
  "function nextLoopId() view returns (uint256)",
  "function getLoop(uint256 loopId) view returns (address, string, uint256, bool)",
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

// IDs match on-chain state (loop 1&2 are both "140bpm dark drill perc" due to init duplication)
const LOOPS = [
  { id: 1, title: "140bpm dark drill perc", bpm: 140, key: "Cm", tags: ["drill", "perc", "dark"], price: "0.10", priceRaw: BigInt(100000), plays: 312 },
  { id: 3, title: "lofi jazz chord loop", bpm: 82, key: "Fm", tags: ["lofi", "jazz", "chords"], price: "0.07", priceRaw: BigInt(70000), plays: 891 },
  { id: 4, title: "trap hi-hat roll 808", bpm: 160, key: "—", tags: ["trap", "drums", "808"], price: "0.05", priceRaw: BigInt(50000), plays: 2104 },
  { id: 5, title: "ambient pad texture A#", bpm: 72, key: "A#", tags: ["ambient", "pad"], price: "0.15", priceRaw: BigInt(150000), plays: 145 },
  { id: 6, title: "jersey club bounce kit", bpm: 138, key: "—", tags: ["jersey", "club", "kit"], price: "0.08", priceRaw: BigInt(80000), plays: 477 },
  { id: 7, title: "melodic sample Gm sad", bpm: 90, key: "Gm", tags: ["melody", "sad"], price: "0.12", priceRaw: BigInt(120000), plays: 203 },
];

const RECENT_SALES = [
  { buyer: "0x4f2a…b1c8", loop: "140bpm dark drill perc", price: "0.10 USDC", ago: "2 min ago" },
  { buyer: "0x9d3e…ff01", loop: "trap hi-hat roll 808", price: "0.05 USDC", ago: "7 min ago" },
  { buyer: "0x1122…aabc", loop: "lofi jazz chord loop", price: "0.07 USDC", ago: "15 min ago" },
  { buyer: "0xdeaf…1337", loop: "jersey club bounce kit", price: "0.08 USDC", ago: "23 min ago" },
];

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
    };
  }
}

function VisitorCounter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const stored = localStorage.getItem("ld_visits");
    const base = stored ? parseInt(stored) : 18432 + Math.floor(Math.random() * 200);
    const val = base + 1;
    localStorage.setItem("ld_visits", String(val));
    setCount(val);
  }, []);
  return <span className="counter-box">{String(count).padStart(6, "0")}</span>;
}

function Marquee({ text }: { text: string }) {
  return (
    <div className="marquee-container">
      {/* @ts-expect-error marquee is valid HTML */}
      <marquee scrollamount="4">{text}</marquee>
    </div>
  );
}

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{ [loopId: number]: string }>({});
  const [connecting, setConnecting] = useState(false);
  const [initStatus, setInitStatus] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadPrice, setUploadPrice] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(ARC_RPC);
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
      const bal = await usdc.balanceOf(address);
      setUsdcBalance((Number(bal) / 1_000_000).toFixed(2));
    } catch {
      setUsdcBalance("?");
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("No wallet detected. Install Rabby or MetaMask.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts[0];
      setWallet(addr);
      // switch to ARC testnet
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + ARC_CHAIN_ID.toString(16) }],
        });
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
      }
      await fetchBalance(addr);
    } catch (e: unknown) {
      alert("Connection failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setConnecting(false);
  }, [fetchBalance]);

  const buyLoop = useCallback(async (loopId: number, priceRaw: bigint, title: string) => {
    if (!wallet) {
      await connectWallet();
      return;
    }
    setTxStatus(s => ({ ...s, [loopId]: "⏳ Approving USDC…" }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      // Approve USDC
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      const allowance = await usdc.allowance(wallet, CONTRACT_ADDRESS);
      if (BigInt(allowance) < priceRaw) {
        const approveTx = await usdc.approve(CONTRACT_ADDRESS, priceRaw);
        setTxStatus(s => ({ ...s, [loopId]: "⏳ Waiting approval tx…" }));
        await approveTx.wait();
      }

      // Buy loop
      setTxStatus(s => ({ ...s, [loopId]: "⏳ Buying — confirm in wallet…" }));
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.buyLoop(loopId);
      setTxStatus(s => ({ ...s, [loopId]: "⏳ Waiting confirmation…" }));
      const receipt = await tx.wait();
      setTxStatus(s => ({ ...s, [loopId]: `✅ Bought! NFT minted · tx: ${receipt.hash.slice(0, 10)}…` }));
      await fetchBalance(wallet);
    } catch (e: unknown) {
      setTxStatus(s => ({ ...s, [loopId]: "❌ " + (e instanceof Error ? e.message.slice(0, 80) : String(e)) }));
    }
  }, [wallet, connectWallet, fetchBalance]);

  // List all 6 loops on-chain (call once after deploy)
  const initLoops = useCallback(async () => {
    if (!wallet) { await connectWallet(); return; }
    setInitStatus("⏳ Listing loops on-chain (6 txs)…");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      for (const loop of LOOPS) {
        setInitStatus(`⏳ Listing loop ${loop.id}/6: ${loop.title}…`);
        const tx = await contract.listLoop(loop.title, loop.priceRaw);
        await tx.wait();
      }
      setInitStatus("✅ All 6 loops listed! BUY buttons are now live.");
    } catch (e: unknown) {
      setInitStatus("❌ " + (e instanceof Error ? e.message.slice(0, 100) : String(e)));
    }
  }, [wallet, connectWallet]);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 8px", background: "#ffff88", minHeight: "100vh" }}>

      <Marquee text="★ LoopDrop — buy loops direct from producers ★ NFT license auto-minted on every purchase ★ $0.05–$0.15 USDC per loop ★ Powered by ARC testnet ★ no middlemen, no bullshit ★" />

      {/* HEADER */}
      <table className="layout" style={{ marginTop: 8, marginBottom: 4, background: "#fffff0" }}>
        <tbody>
          <tr>
            <td style={{ width: "55%" }}>
              <h1 style={{ fontSize: 28, margin: "0 0 2px 0", letterSpacing: -1 }}>
                <span style={{ color: "#ff0000" }}>LOOP</span>DROP
              </h1>
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif" }}>
                loops &amp; samples marketplace · ARC testnet · USDC payments
              </div>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "top", fontSize: 11 }}>
              {/* WALLET CONNECT */}
              <div style={{ marginBottom: 4 }}>
                {!wallet ? (
                  <button
                    className="btn-red"
                    onClick={connectWallet}
                    disabled={connecting}
                    style={{ fontSize: 11 }}
                  >
                    {connecting ? "Connecting…" : "🔌 Connect Wallet"}
                  </button>
                ) : (
                  <div style={{ fontFamily: "Courier New, monospace", fontSize: 10 }}>
                    <span style={{ color: "#008800" }}>✓ CONNECTED</span><br />
                    <span title={wallet}>{wallet.slice(0, 8)}…{wallet.slice(-6)}</span><br />
                    <span>
                      USDC: <strong style={{ color: "#0000aa" }}>{usdcBalance ?? "…"}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 2, fontSize: 10 }}>
                visitors: <VisitorCounter />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="under-construction">
        ⚠ SITE UNDER CONSTRUCTION — TESTNET ONLY — DO NOT SEND REAL FUNDS ⚠
      </div>

      <hr />

      <table className="layout" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            {/* LEFT COLUMN */}
            <td style={{ width: "64%", verticalAlign: "top", paddingRight: 8 }}>

              <div className="section-header">about this site</div>
              <div className="box" style={{ marginBottom: 8, background: "#fffff0" }}>
                <p style={{ margin: "0 0 6px 0" }}>
                  I make loops between deliveries — literally. IT tech by day, ebike courier on weekends,
                  music producer since 2021. Released a ton of tracks but zero royalties from streaming.
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  So I built this: sell individual loops/samples <strong>directly</strong> to producers.
                  You pay <span className="price-badge">$0.05–0.15</span> in USDC,
                  you get the file + an <span className="tag-red">NFT license</span> minted to your wallet.
                  No label cut. No Splice subscription. Just the loop.
                </p>
                <p style={{ margin: 0, fontSize: 12, fontFamily: "Courier New, monospace" }}>
                  // chain: ARC testnet (5042002) · payment token: USDC · license: NFT on-chain
                </p>
              </div>

              <div className="section-header">how it works</div>
              <div className="box" style={{ marginBottom: 8, background: "#fffff0" }}>
                <table style={{ width: "100%", fontSize: 13 }}>
                  <tbody>
                    {[
                      "Connect your wallet (Rabby or MetaMask)",
                      "Browse the catalog, click BUY on any loop",
                      "Approve USDC spend → tx confirmed → file unlocks",
                      "NFT license minted to your address automatically",
                      "Producer receives royalty payout via on-chain agent",
                    ].map((step, i) => (
                      <tr key={i}>
                        <td style={{ width: 30, fontWeight: "bold", color: "#ff0000", fontFamily: "Arial" }}>{i + 1}.</td>
                        <td>{step}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="section-header">loop catalog</div>
              <div className="box" style={{ marginBottom: 8, padding: "6px 8px", background: "#fffff0" }}>
                {!wallet && (
                  <div style={{ marginBottom: 6, padding: "4px 8px", background: "#fff8dc", border: "1px solid #ccc", fontSize: 11 }}>
                    ⚠ <a href="#" onClick={(e) => { e.preventDefault(); connectWallet(); }}>Connect wallet</a> to buy loops
                  </div>
                )}
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#eee" }}>
                      <th style={{ textAlign: "left", padding: "2px 4px", fontFamily: "Arial" }}>title</th>
                      <th style={{ padding: "2px 4px", fontFamily: "Arial" }}>bpm</th>
                      <th style={{ padding: "2px 4px", fontFamily: "Arial" }}>key</th>
                      <th style={{ padding: "2px 4px", fontFamily: "Arial" }}>plays</th>
                      <th style={{ padding: "2px 4px", fontFamily: "Arial" }}>price</th>
                      <th style={{ padding: "2px 4px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOOPS.map((loop, i) => (
                      <>
                        <tr key={loop.id} style={{ borderTop: "1px solid #ccc", background: i % 2 === 0 ? "#fffff0" : "#f9f9e8" }}>
                          <td style={{ padding: "3px 4px" }}>
                            <span style={{ fontFamily: "Courier New, monospace" }}>{loop.title}</span>
                            <div>{loop.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
                          </td>
                          <td style={{ textAlign: "center", padding: "3px 4px", fontFamily: "Courier New, monospace" }}>{loop.bpm}</td>
                          <td style={{ textAlign: "center", padding: "3px 4px", fontFamily: "Courier New, monospace" }}>{loop.key}</td>
                          <td style={{ textAlign: "center", padding: "3px 4px", color: "#555" }}>{loop.plays}</td>
                          <td style={{ textAlign: "center", padding: "3px 4px" }}>
                            <span className="price-badge">${loop.price}</span>
                          </td>
                          <td style={{ padding: "3px 4px" }}>
                            <button
                              className="btn-red"
                              onClick={() => buyLoop(loop.id, loop.priceRaw, loop.title)}
                              disabled={!!txStatus[loop.id]?.startsWith("⏳")}
                            >
                              {!wallet ? "🔌 BUY" : "BUY"}
                            </button>
                          </td>
                        </tr>
                        {txStatus[loop.id] && (
                          <tr key={`status-${loop.id}`} style={{ background: txStatus[loop.id].startsWith("✅") ? "#e8ffe8" : txStatus[loop.id].startsWith("❌") ? "#ffe8e8" : "#fffbe8" }}>
                            <td colSpan={6} style={{ padding: "2px 4px", fontSize: 10, fontFamily: "Courier New, monospace" }}>
                              {txStatus[loop.id]}
                              {txStatus[loop.id].includes("tx:") && (
                                <> · <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">view on ArcScan ↗</a></>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>
                  showing 6 of 6 loops · <span className="blink">●</span> live on ARC testnet
                </div>
                {/* INIT LOOPS — call once after contract deploy */}
                <div style={{ marginTop: 8, padding: "6px 8px", background: "#fff8dc", border: "1px dashed #888", fontSize: 11 }}>
                  <strong>First time?</strong> If BUY shows &quot;loop not active&quot;, loops need to be listed on-chain first.{" "}
                  <button className="btn-old" style={{ fontSize: 10 }} onClick={initLoops}>
                    Init Loops on-chain (owner only)
                  </button>
                  {initStatus && (
                    <div style={{ marginTop: 4, fontFamily: "Courier New, monospace", fontSize: 10,
                      color: initStatus.startsWith("✅") ? "green" : initStatus.startsWith("❌") ? "red" : "#555" }}>
                      {initStatus}
                    </div>
                  )}
                </div>
              </div>

              <div className="section-header">on-chain agents</div>
              <div className="box" style={{ marginBottom: 8, background: "#fffff0" }}>
                <table style={{ width: "100%", fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", verticalAlign: "top", paddingRight: 8 }}>
                        <div style={{ fontFamily: "Arial", fontWeight: "bold", marginBottom: 4 }}>🤖 Buyer Agent</div>
                        <div>Simulates purchase activity — browses catalog, picks loops, sends USDC, triggers NFT mint.</div>
                        <div style={{ marginTop: 4 }}><span className="tag">status:</span> <span style={{ color: "green", fontFamily: "Courier New" }}>ACTIVE</span></div>
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <div style={{ fontFamily: "Arial", fontWeight: "bold", marginBottom: 4 }}>📊 Royalty Agent</div>
                        <div>Tallies sales per period, calculates creator share, triggers payout tx to producer wallet.</div>
                        <div style={{ marginTop: 4 }}><span className="tag">status:</span> <span style={{ color: "green", fontFamily: "Courier New" }}>ACTIVE</span></div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </td>

            {/* RIGHT COLUMN */}
            <td style={{ width: "36%", verticalAlign: "top" }}>

              <div className="section-header">recent sales</div>
              <div className="box" style={{ marginBottom: 8, background: "#fffff0" }}>
                {RECENT_SALES.map((s, i) => (
                  <div key={i} style={{ borderBottom: i < RECENT_SALES.length - 1 ? "1px dotted #ccc" : "none", padding: "4px 0", fontSize: 11 }}>
                    <div style={{ fontFamily: "Courier New, monospace", color: "#555" }}>{s.buyer}</div>
                    <div style={{ fontFamily: "Arial" }}>bought <em>{s.loop}</em></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="price-badge" style={{ fontSize: 10 }}>{s.price}</span>
                      <span style={{ color: "#888", fontSize: 10 }}>{s.ago}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 6, fontSize: 10, color: "#888" }}>
                  <span className="blink">▶</span> agent-buyer simulation active
                </div>
              </div>

              <div className="section-header">stats</div>
              <div className="box" style={{ marginBottom: 8, fontSize: 12, background: "#fffff0" }}>
                <table style={{ width: "100%" }}>
                  <tbody>
                    <tr><td>Total sales:</td><td style={{ textAlign: "right", fontFamily: "Courier New, monospace", fontWeight: "bold" }}>47</td></tr>
                    <tr><td>Volume (USDC):</td><td style={{ textAlign: "right", fontFamily: "Courier New, monospace", fontWeight: "bold" }}>4.85</td></tr>
                    <tr><td>Loops listed:</td><td style={{ textAlign: "right", fontFamily: "Courier New, monospace" }}>6</td></tr>
                    <tr><td>NFTs minted:</td><td style={{ textAlign: "right", fontFamily: "Courier New, monospace" }}>47</td></tr>
                    <tr><td>Royalties paid:</td><td style={{ textAlign: "right", fontFamily: "Courier New, monospace", color: "#008800" }}>4.37 USDC</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="section-header">upload a loop</div>
              <div className="box-red" style={{ marginBottom: 8, fontSize: 12, background: "#fffff0" }}>
                <div style={{ marginBottom: 4, fontFamily: "Arial", fontWeight: "bold" }}>Are you a producer?</div>
                <div style={{ marginBottom: 6 }}>Set title + price → tx confirms → loop is live in catalog.</div>
                <div style={{ marginBottom: 4 }}>
                  <input
                    type="text"
                    placeholder="loop title (e.g. 120bpm trap loop Am)"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    style={{ width: "100%", marginBottom: 3 }}
                  />
                  <input
                    type="number"
                    placeholder="price USDC (0.05–0.15)"
                    value={uploadPrice}
                    onChange={e => setUploadPrice(e.target.value)}
                    style={{ width: "100%", marginBottom: 3 }}
                    min="0.05" max="0.15" step="0.01"
                  />
                </div>
                <button
                  className="btn-red"
                  style={{ width: "100%" }}
                  disabled={uploadStatus.startsWith("⏳")}
                  onClick={async () => {
                    if (!wallet) { await connectWallet(); return; }
                    if (!uploadTitle.trim()) { setUploadStatus("❌ Enter a title"); return; }
                    const priceFloat = parseFloat(uploadPrice);
                    if (isNaN(priceFloat) || priceFloat < 0.05 || priceFloat > 0.15) {
                      setUploadStatus("❌ Price must be 0.05–0.15 USDC"); return;
                    }
                    const priceRaw = Math.round(priceFloat * 1_000_000);
                    setUploadStatus("⏳ Confirm tx in wallet…");
                    try {
                      const provider = new ethers.BrowserProvider(window.ethereum!);
                      const signer = await provider.getSigner();
                      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                      const tx = await contract.listLoop(uploadTitle.trim(), priceRaw);
                      setUploadStatus("⏳ Waiting confirmation…");
                      const receipt = await tx.wait();
                      setUploadStatus(`✅ Listed! tx: ${receipt.hash.slice(0,12)}…`);
                      setUploadTitle("");
                      setUploadPrice("");
                    } catch (e: unknown) {
                      setUploadStatus("❌ " + (e instanceof Error ? e.message.slice(0, 80) : String(e)));
                    }
                  }}
                >
                  {!wallet ? "🔌 CONNECT TO UPLOAD" : uploadStatus.startsWith("⏳") ? uploadStatus : "LIST LOOP ON-CHAIN"}
                </button>
                {uploadStatus && !uploadStatus.startsWith("⏳") && (
                  <div style={{ marginTop: 4, fontSize: 10, fontFamily: "Courier New, monospace",
                    color: uploadStatus.startsWith("✅") ? "green" : "red" }}>
                    {uploadStatus}
                  </div>
                )}
              </div>

              <div className="section-header">chain info</div>
              <div className="box-dotted" style={{ marginBottom: 8, fontSize: 11, background: "#fffff0" }}>
                <table style={{ width: "100%" }}>
                  <tbody>
                    <tr><td style={{ color: "#555" }}>Network:</td><td style={{ fontFamily: "Courier New, monospace" }}>ARC Testnet</td></tr>
                    <tr><td style={{ color: "#555" }}>Chain ID:</td><td style={{ fontFamily: "Courier New, monospace" }}>5042002</td></tr>
                    <tr><td style={{ color: "#555" }}>USDC:</td><td style={{ fontFamily: "Courier New, monospace", wordBreak: "break-all" }}>0x3600…0000</td></tr>
                    <tr>
                      <td style={{ color: "#555" }}>Contract:</td>
                      <td>
                        <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Courier New, monospace", fontSize: 10 }}>
                          0xb845…cFE0 ↗
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "#555" }}>Explorer:</td>
                      <td><a href={ARCSCAN} target="_blank" rel="noopener noreferrer">arcscan.app ↗</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 11, textAlign: "center" }}>
                <div style={{ marginBottom: 4 }}>
                  <a href={ARCSCAN} target="_blank" rel="noopener noreferrer">
                    <span style={{ display: "inline-block", background: "#0000ee", color: "#fff", padding: "2px 6px", fontFamily: "Arial", fontSize: 10 }}>✓ ARC TESTNET</span>
                  </a>
                  {" "}
                  <span style={{ display: "inline-block", background: "#006600", color: "#fff", padding: "2px 6px", fontFamily: "Arial", fontSize: 10 }}>VERIFIED ✓</span>
                </div>
                <div>
                  <span style={{ display: "inline-block", background: "#ff0000", color: "#fff", padding: "2px 6px", fontFamily: "Arial", fontSize: 10 }}>NFT LICENSE</span>
                  {" "}
                  <span style={{ display: "inline-block", background: "#888", color: "#fff", padding: "2px 6px", fontFamily: "Arial", fontSize: 10 }}>SOLIDITY 0.8.20</span>
                </div>
              </div>

            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <div className="webring-bar" style={{ background: "#fffff0" }}>
        <table style={{ width: "100%", fontSize: 11 }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "left", width: "30%" }}>
                <a href="#">← prev</a>{" "}|{" "}<strong>ARC builders webring</strong>{" "}|{" "}<a href="#">next →</a>
              </td>
              <td style={{ textAlign: "center" }}>
                built by{" "}
                <a href="https://github.com/lucastshh" target="_blank" rel="noopener noreferrer">lucastshh</a>
                {" · "}
                <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                  contract: 0xb845…cFE0 ↗
                </a>
              </td>
              <td style={{ textAlign: "right", width: "30%" }}>
                <a href="https://github.com/lucastshh/LoopDrop" target="_blank" rel="noopener noreferrer">view source ↗</a>
                {" · "}
                visitors: <VisitorCounter />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: "center", fontSize: 10, color: "#888", padding: "4px 0", background: "#fffff0" }}>
        © 2024 LoopDrop · testnet only · not financial advice · loops are loops
      </div>

    </div>
  );
}
