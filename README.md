```
╔══════════════════════════════════════════════╗
║  LOOPDROP — a loose pack of loops, sold one    ║
║  at a time, straight off the chain.            ║
╚══════════════════════════════════════════════╝

artist ....... luca shuffield  ·  @lucastshh
kind ......... loop / one-shot / texture pack
count ........ 6 loops live, room for more
format ....... single loops, no bundles, no sub
tempo range .. 72 → 160 bpm
license ...... per-loop NFT, minted on buy
ask .......... a nickel to a dime-and-a-half (USDC)
split ........ producer keeps the whole thing
```

Not a label release. Not a Splice folder. Just loops I cut between tickets at
the day job, dropped where you can grab one for the price of a stick of gum and
walk off with paperwork that proves it's yours. The store is the contract. The
contract is the store. This file is the back of the sleeve.

---

## the drop

Six loops are sitting on the chain right now — a 140 dark-drill perc line, a lofi
jazz chord thing at 82, a trap hat roll, an ambient pad in A#, a jersey bounce kit,
and a sad melodic bit in Gm. Each one has a title, a tempo, a key, some tags, and a
price between five and fifteen cents. You scroll, you find one that knocks, you buy
it. No cart, no checkout funnel, no "10 credits for $12.99."

A loop here is one row in a table that anyone can add to. I listed these six with an
owner-only batch route after deploy, but the listing function isn't mine alone — sign
`listLoop("your title", price)` from any wallet and your loop joins the shelf next to
mine. That's the whole hierarchy. There isn't one.

---

## in the crate

Hit BUY and one transaction does three jobs at once. The contract calls
`buyLoop(loopId)` and:

1. pulls exactly the listed price out of your USDC — `transferFrom(you, contract, l.price)`,
   to the cent, nothing padded on top;
2. mints you a license token — `licenseOwner[tokenId] = you`, `licenseLoop[tokenId] = the loop`
   — and fires `Transfer(address(0), you, tokenId)`, so it reads as a clean mint in any explorer;
3. parks the producer's money in `pendingRoyalty[producer] += l.price`, on the books, owed and counted.

So you leave with the loop unlocked and a token in your wallet that says, on a public
ledger, that you paid for the right to flip this sample. Two confirmations on the way
in — approve the spend, then the buy — both pennies.

---

## clearance

One buy = one token = one loop. The token is your commercial-use receipt for that
sample, and it's the only paperwork there is. Anyone can read it back with
`getLicense(tokenId)` and see who holds it and which loop it covers. That's the point:
when someone asks where the sample came from, you point at a chain entry, not a DM.

What's *not* in this contract: resale, royalties-on-resale, secondary splits. The
license doesn't chase you for a cut when you sell the track on. It's a flat grant —
you bought it, it's yours, go make something. (The on-page "Royalty Agent" talks a
bigger game; see the bottom for what's real versus what's a mock.)

Price has a hard rail baked in: `require(price >= 50000 && price <= 150000)` — five to
fifteen cents in USDC's six decimals, no exceptions. This is an impulse rack on purpose.
A nickel for a hat loop, a dime for a chord. If you're selling a forty-dollar construction
kit, go somewhere with a shopping cart; this isn't that store.

---

## buying a loop

```
[1]  connect a wallet — site bumps you to Arc testnet (id 5042002) if you're off it
[2]  scroll the table: bpm / key / tags / plays / price
[3]  BUY → approve the USDC spend → confirm the buy   (two pops, both pennies)
[4]  loop unlocks · license NFT lands in your wallet · ArcScan link shows the receipt
```

Selling is the mirror image: type a title and a price into the **upload a loop** box,
sign `listLoop(...)`, done. A producer can pull their own listing with `delistLoop(loopId)`
(so can the owner) — that flips it inactive and nothing more. No one in this contract can
touch the money; delist is the only lever and it doesn't reach the funds.

---

## why a dime has to land whole

Run the numbers and you'll see why nobody sells a single loop for ten cents anywhere
else. Card rails want a fixed fee plus a percent — on a dime that fee *is* the dime, so
the sale is upside down before the producer sees a cent. The stores that do exist solve
it the only way card rails let them: pool your sales, hold the payout behind a withdrawal
minimum, shave fifteen-to-fifty percent for the house, and cut you a check once a month if
you've cleared the floor. Your dime never moves on its own. It sits in a bucket with other
people's dimes waiting for permission to leave.

LoopDrop only makes sense because the cost of moving the money can be smaller than the
money. On Arc testnet a ten-cent USDC transfer settles in seconds for a sliver of a cent,
and the *entire* ten cents lands in `pendingRoyalty[producer]` — the literal `l.price`,
every buy, no pool, no minimum, no monthly delay, no house cut. `payRoyalty(producer)`
then flushes that balance straight to the producer's wallet in USDC. The contract holds
nothing back; there's no fee field to set and no skim path to exploit. Direct, instant,
and whole — that combination is the product, and it falls apart on any rail where a
ten-cent sale costs more than ten cents to clear. Cheap settlement isn't a nice-to-have
here; it's the thing that lets a dime be a real sale instead of a rounding error.

---

## specs

```
contract ..... LoopDrop.sol   (Solidity ^0.8.20, MIT, single file)
address ...... 0xb8458128dC2603f78637CE1a74A7ee744661cFE0   (verified on ArcScan)
chain ........ Arc testnet · id 5042002
money ........ USDC, 6 decimals · 0x3600…0000
scan ......... https://testnet.arcscan.app/address/0xb8458128dC2603f78637CE1a74A7ee744661cFE0
site ......... https://loopdrop-lilac.vercel.app
build ........ Next.js 16 + React 19 front end, ethers v6 to the wallet, Vercel host
```

functions that are actually on-chain — read `contracts/LoopDrop.sol`, don't take my word:

```
listLoop(title, price)        producer   list a loop; price clamped 50000–150000 (5–15¢)
buyLoop(loopId)               buyer      pull USDC, mint license, accrue producer's owed balance
payRoyalty(producer)          anyone     flush pendingRoyalty[producer] out in USDC
getLoop(loopId)               view       read a loop's producer / title / price / active flag
getLicense(tokenId)           view       read a license's holder + which loop it covers
delistLoop(loopId)            producer/owner  mark a loop inactive (cannot move funds)
```

**straight talk about the rest.** The page has a "Buyer Agent" and a "Royalty Agent"
panel both flashing ACTIVE, a recent-sales ticker, and a stats box. Those are front-end
mock-ups — the agent panels literally say *"Simulates purchase activity"*, the sales feed
and the volume/royalty numbers are hardcoded arrays animating a vibe. Nothing autonomous
is signing transactions or paying anyone on a schedule. `payRoyalty` is a real function you
can call today; it's just that *you* call it, not a bot. And there is no x402 anywhere in
this thing — no agent-to-agent payment handshake, no auto-proving. If you can't verify a
claim on ArcScan, treat it as a sketch of where this might go.

---

```
loops cut between IT tickets · testnet only · not financial advice
@lucastshh — go flip something
```
