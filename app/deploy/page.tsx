"use client";
import { useState } from "react";
import { ethers } from "ethers";

// LoopDrop contract source (Solidity 0.8.20)
const CONTRACT_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title LoopDrop
 * @notice Micro-marketplace for audio loops/samples on ARC testnet.
 *         Producer lists a loop with a USDC price, buyer pays and gets
 *         an NFT license minted to their wallet. Royalty agent can
 *         trigger accumulated payout to producer.
 */
contract LoopDrop {
    address public owner;
    IERC20  public usdc;

    uint256 public nextLoopId = 1;
    uint256 public nextTokenId = 1;

    struct Loop {
        address producer;
        string  title;
        uint256 price;
        bool    active;
    }

    mapping(uint256 => Loop)    public loops;
    mapping(uint256 => address) public licenseOwner;
    mapping(uint256 => uint256) public licenseLoop;
    mapping(address => uint256) public pendingRoyalty;

    event LoopListed(uint256 indexed loopId, address producer, string title, uint256 price);
    event LoopPurchased(uint256 indexed loopId, address buyer, uint256 tokenId, uint256 price);
    event RoyaltyPaid(address indexed producer, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address _usdc) {
        owner = msg.sender;
        usdc  = IERC20(_usdc);
    }

    function listLoop(string calldata title, uint256 price) external returns (uint256 loopId) {
        require(price >= 50000 && price <= 150000, "price 0.05-0.15 USDC");
        loopId = nextLoopId++;
        loops[loopId] = Loop(msg.sender, title, price, true);
        emit LoopListed(loopId, msg.sender, title, price);
    }

    function buyLoop(uint256 loopId) external returns (uint256 tokenId) {
        Loop storage l = loops[loopId];
        require(l.active, "loop not active");
        bool ok = usdc.transferFrom(msg.sender, address(this), l.price);
        require(ok, "USDC transfer failed");
        pendingRoyalty[l.producer] += l.price;
        tokenId = nextTokenId++;
        licenseOwner[tokenId] = msg.sender;
        licenseLoop[tokenId]  = loopId;
        emit Transfer(address(0), msg.sender, tokenId);
        emit LoopPurchased(loopId, msg.sender, tokenId, l.price);
    }

    function payRoyalty(address producer) external {
        uint256 amount = pendingRoyalty[producer];
        require(amount > 0, "nothing owed");
        pendingRoyalty[producer] = 0;
        bool ok = usdc.transfer(producer, amount);
        require(ok, "USDC payout failed");
        emit RoyaltyPaid(producer, amount);
    }

    function getLoop(uint256 loopId) external view
        returns (address producer, string memory title, uint256 price, bool active)
    {
        Loop storage l = loops[loopId];
        return (l.producer, l.title, l.price, l.active);
    }

    function getLicense(uint256 tokenId) external view
        returns (address holder, uint256 loopId)
    {
        return (licenseOwner[tokenId], licenseLoop[tokenId]);
    }

    function delistLoop(uint256 loopId) external {
        require(msg.sender == loops[loopId].producer || msg.sender == owner, "unauthorized");
        loops[loopId].active = false;
    }
}`;

// ABI compiled with solc 0.8.20 optimizer 200 runs
const CONTRACT_ABI = [
  {"inputs":[{"internalType":"address","name":"_usdc","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loopId","type":"uint256"},{"indexed":false,"internalType":"address","name":"producer","type":"address"},{"indexed":false,"internalType":"string","name":"title","type":"string"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"}],"name":"LoopListed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loopId","type":"uint256"},{"indexed":false,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"}],"name":"LoopPurchased","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"producer","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RoyaltyPaid","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},
  {"inputs":[{"internalType":"uint256","name":"loopId","type":"uint256"}],"name":"buyLoop","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"loopId","type":"uint256"}],"name":"delistLoop","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getLicense","outputs":[{"internalType":"address","name":"holder","type":"address"},{"internalType":"uint256","name":"loopId","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"loopId","type":"uint256"}],"name":"getLoop","outputs":[{"internalType":"address","name":"producer","type":"address"},{"internalType":"string","name":"title","type":"string"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"licenseLoop","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"licenseOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"title","type":"string"},{"internalType":"uint256","name":"price","type":"uint256"}],"name":"listLoop","outputs":[{"internalType":"uint256","name":"loopId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"loops","outputs":[{"internalType":"address","name":"producer","type":"address"},{"internalType":"string","name":"title","type":"string"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"nextLoopId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"nextTokenId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"producer","type":"address"}],"name":"payRoyalty","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingRoyalty","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"usdc","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
];

// Bytecode compiled with solc 0.8.20, optimizer 200 runs
const CONTRACT_BYTECODE = "0x608060405260016002556001600355348015610019575f80fd5b50604051610d86380380610d868339810160408190526100389161006a565b5f8054336001600160a01b031991821617909155600180549091166001600160a01b0392909216919091179055610097565b5f6020828403121561007a575f80fd5b81516001600160a01b0381168114610090575f80fd5b9392505050565b610ce2806100a45f395ff3fe608060405234801561000f575f80fd5b50600436106100e5575f3560e01c806380e7fc19116100885780639950c64d116100635780639950c64d146101f45780639d4cd9ea14610213578063b2dd121214610226578063ef103ea41461027b575f80fd5b806380e7fc19146101ba5780638906e264146101cd5780638da5cb5b146101e2575f80fd5b80633e413bee116100c35780633e413bee14610155578063452dd0f7146101805780635bb00896146101a857806375794a3c146101b1575f80fd5b80631abe1bb8146100e95780632f50e472146101155780633c26d4dc14610142575b5f80fd5b6100fc6100f736600461098a565b61028e565b60405161010c94939291906109a1565b60405180910390f35b610134610123366004610a0c565b60076020525f908152604090205481565b60405190815260200161010c565b6100fc61015036600461098a565b610362565b600154610168906001600160a01b031681565b6040516001600160a01b03909116815260200161010c565b61016861018e36600461098a565b60056020525f90815260409020546001600160a01b031681565b61013460025481565b61013460035481565b6101346101c8366004610a39565b61041e565b6101e06101db366004610a0c565b610599565b005b5f54610168906001600160a01b031681565b61013461020236600461098a565b60066020525f908152604090205481565b61013461022136600461098a565b610700565b61025c61023436600461098a565b5f908152600560209081526040808320546006909252909120546001600160a01b0390911691565b604080516001600160a01b03909316835260208301919091520161010c565b6101e061028936600461098a565b610908565b5f8181526004602052604081208054600282015460038301546001840180546060958795869591946001600160a01b03909116939260ff9091169083906102d490610aaa565b80601f016020809104026020016040519081016040528092919081815260200182805461030090610aaa565b801561034b5780601f106103225761010080835404028352916020019161034b565b820191905f5260205f20905b81548152906001019060200180831161032e57829003601f168201915b505050505092509450945094509450509193509193565b60046020525f9081526040902080546001820180546001600160a01b03909216929161038d90610aaa565b80601f01602080910402602001604051908101604052809291908181526020018280546103b990610aaa565b80156104045780601f106103db57610100808354040283529160200191610404565b820191905f5260205f20905b8154815290600101906020018083116103e757829003601f168201915b50505050600283015460039093015491929160ff16905084565b5f61c35082101580156104345750620249f08211155b61047c5760405162461bcd60e51b8152602060048201526014602482015273707269636520302e30352d302e3135205553444360601b60448201526064015b60405180910390fd5b60028054905f61048b83610af6565b9190505590506040518060800160405280336001600160a01b0316815260200185858080601f0160208091040260200160405190810160405280939291908181526020018383808284375f9201829052509385525050506020808301869052600160409384018190528583526004825292909120835181546001600160a01b0319166001600160a01b0390911617815590830151909182019061052e9082610b70565b5060408281015160028301556060909201516003909101805460ff19169115159190911790555181907fb19e7de91e141aa9c18ca64416b280154c3c893412da220841947ad35dfd4e809061058a903390889088908890610c2c565b60405180910390a29392505050565b6001600160a01b0381165f90815260076020526040902054806105ed5760405162461bcd60e51b815260206004820152600c60248201526b1b9bdd1a1a5b99c81bddd95960a21b6044820152606401610473565b6001600160a01b038281165f81815260076020526040808220829055600154905163a9059cbb60e01b81526004810193909352602483018590529092169063a9059cbb906044016020604051808303815f875af1158015610650573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906106749190610c74565b9050806106b85760405162461bcd60e51b81526020600482015260126024820152711554d110c81c185e5bdd5d0819985a5b195960721b6044820152606401610473565b826001600160a01b03167fbc86de696edc3350c664d50abf25f24e7e1251f1469ad925b25fe36927270d43836040516106f391815260200190565b60405180910390a2505050565b5f818152600460205260408120600381015460ff166107535760405162461bcd60e51b815260206004820152600f60248201526e6c6f6f70206e6f742061637469766560881b6044820152606401610473565b60015460028201546040516323b872dd60e01b815233600482015230602482015260448101919091525f916001600160a01b0316906323b872dd906064016020604051808303815f875af11580156107ad573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906107d19190610c74565b9050806108175760405162461bcd60e51b81526020600482015260146024820152731554d110c81d1c985b9cd9995c8819985a5b195960621b6044820152606401610473565b600282015482546001600160a01b03165f9081526007602052604081208054909190610844908490610c93565b909155505060038054905f61085883610af6565b909155505f81815260056020908152604080832080546001600160a01b0319163390811790915560069092528083208890555192955085929091907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef908290a4600282015460408051338152602081018690529081019190915284907f4b6f489e649f93d99be5f99a8a5f6dd5c818001f161c9bdaad8eb8edcce6344c9060600160405180910390a25050919050565b5f818152600460205260409020546001600160a01b031633148061093557505f546001600160a01b031633145b6109705760405162461bcd60e51b815260206004820152600c60248201526b1d5b985d5d1a1bdc9a5e995960a21b6044820152606401610473565b5f908152600460205260409020600301805460ff19169055565b5f6020828403121561099a575f80fd5b5035919050565b60018060a01b03851681525f602060808184015285518060808501525f5b818110156109db5787810183015185820160a0015282016109bf565b505f60a0828601015260a0601f19601f83011685010192505050836040830152821515606083015295945050505050565b5f60208284031215610a1c575f80fd5b81356001600160a01b0381168114610a32575f80fd5b9392505050565b5f805f60408486031215610a4b575f80fd5b833567ffffffffffffffff80821115610a62575f80fd5b818601915086601f830112610a75575f80fd5b813581811115610a83575f80fd5b876020828501011115610a94575f80fd5b6020928301989097509590910135949350505050565b600181811c90821680610abe57607f821691505b602082108103610adc57634e487b7160e01b5f52602260045260245ffd5b50919050565b634e487b7160e01b5f52601160045260245ffd5b5f60018201610b0757610b07610ae2565b5060010190565b634e487b7160e01b5f52604160045260245ffd5b601f821115610b6b575f81815260208120601f850160051c81016020861015610b485750805b601f850160051c820191505b81811015610b6757828155600101610b54565b5050505b505050565b815167ffffffffffffffff811115610b8a57610b8a610b0e565b610b9e81610b988454610aaa565b84610b22565b602080601f831160018114610bd1575f8415610bba5750858301515b5f19600386901b1c1916600185901b178555610b67565b5f85815260208120601f198616915b82811015610bff57888601518255948401946001909101908401610be0565b5085821015610c1c57878501515f19600388901b60f8161c191681555b5050505050600190811b01905550565b6001600160a01b03851681526060602082018190528101839052828460808301375f608084830101525f6080601f19601f860116830101905082604083015295945050505050565b5f60208284031215610c84575f80fd5b81518015158114610a32575f80fd5b80820180821115610ca657610ca6610ae2565b9291505056fea2646970667358221220ec63fb8e617a2a5872ed284e074fc1a2470d8f76ad8cf1d8579ccc4d14d2209964736f6c63430008140033";

const ARC_CHAIN_ID = 5042002;
const ARC_RPC = "https://rpc.testnet.arc.network";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const ARCSCAN = "https://testnet.arcscan.app";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
    };
  }
}

export default function DeployPage() {
  const [status, setStatus] = useState<string>("");
  const [wallet, setWallet] = useState<string>("");
  const [contractAddr, setContractAddr] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [deploying, setDeploying] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("❌ No wallet detected. Install Rabby or MetaMask.");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      setWallet(accounts[0]);
      setStatus(`✓ Connected: ${accounts[0]}`);
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
    } catch (e: unknown) {
      setStatus("❌ " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function deployContract() {
    if (!wallet) { setStatus("❌ Connect wallet first."); return; }
    setDeploying(true);
    setStatus("⏳ Deploying LoopDrop contract...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, signer);
      setStatus("⏳ Sending deployment tx — confirm in wallet...");
      const contract = await factory.deploy(USDC_ADDRESS);
      setStatus("⏳ Waiting for confirmation...");
      const receipt = await contract.deploymentTransaction()?.wait();
      const addr = await contract.getAddress();
      setContractAddr(addr);
      setTxHash(receipt?.hash || "");
      setStatus(`✅ Deployed at ${addr}`);
    } catch (e: unknown) {
      setStatus("❌ Deploy failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setDeploying(false);
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 8px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: "#000", color: "#fff", padding: "4px 8px", marginBottom: 12, fontSize: 12 }}>
        ⚡ LOOPDROP / CONTRACT DEPLOY — internal tool — not linked from main site
      </div>

      <h2 style={{ fontFamily: "Courier New, monospace", fontSize: 18, margin: "0 0 8px 0" }}>
        Deploy LoopDrop Contract
      </h2>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
        Chain: ARC Testnet (5042002) · RPC: {ARC_RPC} · USDC: {USDC_ADDRESS}
      </div>

      {/* WALLET */}
      <div style={{ border: "2px solid #000", padding: 8, marginBottom: 12 }}>
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>1. Connect Wallet</div>
        <button className="btn-old" onClick={connectWallet} style={{ marginRight: 8 }}>
          {wallet ? `✓ ${wallet.slice(0, 8)}…${wallet.slice(-6)}` : "Connect Wallet (Rabby / MetaMask)"}
        </button>
        {wallet && <span style={{ fontSize: 11, color: "#008800" }}>wallet connected · ARC testnet</span>}
      </div>

      {/* CONTRACT SOURCE */}
      <div style={{ border: "2px solid #000", padding: 8, marginBottom: 12 }}>
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>2. Contract Source (Solidity 0.8.20)</div>
        <textarea
          readOnly
          value={CONTRACT_SOURCE}
          style={{
            width: "100%", height: 320, fontFamily: "Courier New, monospace",
            fontSize: 11, border: "1px inset #888", background: "#f4f4f4", padding: 6, resize: "vertical",
          }}
        />
        <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
          SPDX: MIT · Optimizer: 200 runs · USDC constructor arg: {USDC_ADDRESS}
        </div>
      </div>

      {/* DEPLOY */}
      <div style={{ border: "2px solid #ff0000", padding: 8, marginBottom: 12 }}>
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>3. Deploy Contract</div>
        <button
          className="btn-red"
          onClick={deployContract}
          disabled={deploying || !wallet}
          style={{ opacity: deploying || !wallet ? 0.5 : 1 }}
        >
          {deploying ? "Deploying…" : "Deploy Contract →"}
        </button>
        {status && (
          <div style={{
            marginTop: 8, padding: 6,
            background: status.startsWith("✅") ? "#e8ffe8" : status.startsWith("❌") ? "#ffe8e8" : "#fffbe8",
            border: "1px solid #ccc", fontFamily: "Courier New, monospace", fontSize: 12,
          }}>
            {status}
          </div>
        )}
      </div>

      {/* RESULT */}
      {contractAddr && (
        <div style={{ border: "2px solid #008800", padding: 8, marginBottom: 12, background: "#f0fff0" }}>
          <div style={{ fontWeight: "bold", marginBottom: 6, color: "#008800" }}>✅ Contract Deployed!</div>
          <table style={{ fontSize: 12, width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ color: "#555", paddingRight: 8, width: 140 }}>Contract address:</td>
                <td style={{ fontFamily: "Courier New, monospace" }}><strong>{contractAddr}</strong></td>
              </tr>
              <tr>
                <td style={{ color: "#555" }}>ArcScan:</td>
                <td>
                  <a href={`${ARCSCAN}/address/${contractAddr}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "Courier New, monospace", fontSize: 11 }}>
                    {ARCSCAN}/address/{contractAddr} ↗
                  </a>
                </td>
              </tr>
              {txHash && (
                <tr>
                  <td style={{ color: "#555" }}>Tx hash:</td>
                  <td>
                    <a href={`${ARCSCAN}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "Courier New, monospace", fontSize: 11 }}>
                      {txHash} ↗
                    </a>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 8, padding: 6, background: "#fffbe8", border: "1px solid #ccc", fontSize: 12 }}>
            📋 <strong>Next step:</strong> Send this contract address back to update the site with live data.
          </div>
        </div>
      )}

      {/* VERIFICATION GUIDE */}
      <div style={{ border: "2px dotted #000", padding: 8, fontSize: 12 }}>
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>Verification guide (after deploy)</div>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Go to <a href={`${ARCSCAN}/verifyContract`} target="_blank" rel="noopener noreferrer">{ARCSCAN}/verifyContract ↗</a></li>
          <li>Select <strong>Solidity (Standard JSON Input)</strong></li>
          <li>Enter contract address above</li>
          <li>Compiler: <code>v0.8.20+commit.a1b79de6</code></li>
          <li>License: <code>MIT</code></li>
          <li>Optimization: <code>Yes</code>, runs: <code>200</code></li>
          <li>Paste source code from textarea above</li>
          <li>Constructor arg: <code>address _usdc = {USDC_ADDRESS}</code></li>
        </ol>
      </div>
    </div>
  );
}
