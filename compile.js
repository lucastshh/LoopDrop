const solc = require("solc");
const fs = require("fs");

const src = fs.readFileSync("contracts/LoopDrop.sol", "utf8");

const input = {
  language: "Solidity",
  sources: {
    "LoopDrop.sol": { content: src }
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  output.errors.forEach(e => {
    if (e.severity === "error") console.error(e.formattedMessage);
    else console.warn(e.formattedMessage);
  });
}

const contract = output.contracts["LoopDrop.sol"]["LoopDrop"];
const bytecode = "0x" + contract.evm.bytecode.object;
const abi = contract.abi;

fs.writeFileSync("LoopDrop_compiled.json", JSON.stringify({ abi, bytecode }, null, 2));
console.log("bytecode length:", contract.evm.bytecode.object.length);
console.log("bytecode preview:", bytecode.slice(0, 80));
