```
██╗      ██████╗  ██████╗ ██████╗ ██████╗ ██████╗  ██████╗ ██████╗ 
██║     ██╔═══██╗██╔═══██╗██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
██║     ██║   ██║██║   ██║██████╔╝██║  ██║██████╔╝██║   ██║██████╔╝
██║     ██║   ██║██║   ██║██╔═══╝ ██║  ██║██╔══██╗██║   ██║██╔═══╝ 
███████╗╚██████╔╝╚██████╔╝██║     ██████╔╝██║  ██║╚██████╔╝██║     
╚══════╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     
```

> **buy and sell audio loops on-chain. $0.05–$0.15 USDC. NFT license auto-minted.**

---

## what is this

I'm an IT tech by day, ebike courier on weekends, and music producer since 2021. I've released a bunch of tracks but streaming royalties are basically zero — Spotify pays fractions of a cent per play, labels take their cut, and the money never reaches the person who actually made the loop.

So I built LoopDrop while riding deliveries, literally listening to my own loop packs on repeat and thinking: *why am I not selling these directly?*

LoopDrop is a micro-marketplace for audio loops and samples:
- **Producer** lists a loop with a title and USDC price ($0.05–$0.15)
- **Buyer** connects wallet, pays USDC, gets an NFT license minted to their address
- No middlemen. No label cut. No Splice subscription.

---

## why ARC network

ARC is built for onchain AI agents and micro-transactions — exactly what this needs.

Loop purchases are tiny ($0.05–$0.15). On Ethereum mainnet, gas fees would be bigger than the purchase itself. On ARC testnet, fees are negligible, transactions confirm fast, and the chain is designed for exactly this kind of agent-driven micro-economy.

Two agents run alongside the marketplace:
- **Buyer Agent** — simulates organic purchase activity: browses catalog, picks loops, sends USDC, triggers NFT mints
- **Royalty Agent** — tallies sales per period, calculates producer share, triggers payout transactions automatically

This is what ARC is built for. Autonomous agents doing real economic work on-chain, not just sitting in a chat interface.

---

## contract

```
Network:  ARC Testnet (Chain ID: 5042002)
Contract: 0xb8458128dC2603f78637CE1a74A7ee744661cFE0
USDC:     0x3600000000000000000000000000000000000000
Explorer: https://testnet.arcscan.app
Status:   ✅ Verified
```

### what it does

```solidity
listLoop(string title, uint256 price)  // producer lists a loop
buyLoop(uint256 loopId)                // buyer pays USDC, gets NFT license
payRoyalty(address producer)           // agent triggers payout
getLoop(uint256 loopId)                // read loop metadata
```

---

## tech stack

| layer | tech |
|---|---|
| frontend | Next.js 16 · TypeScript · Tailwind |
| wallet | ethers.js v6 (no wagmi) |
| chain | ARC Testnet (EVM-compatible) |
| payments | USDC (6 decimals) at `0x3600…` |
| license | on-chain NFT (ERC-721-style mint) |
| deploy | Vercel |

---

## live site

**https://loopdrop-lilac.vercel.app**

---

## project structure

```
app/
  page.tsx       — main marketplace UI
  deploy/        — hidden: deploy new contract
  init/          — hidden: list loops on-chain (one-time setup)
contracts/
  LoopDrop.sol   — Solidity 0.8.20, MIT license
```

---

*built by [@lucastshh](https://github.com/lucastshh) — loops between deliveries since 2021*