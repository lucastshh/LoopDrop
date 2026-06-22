const fs = require("fs");

const src = fs.readFileSync("contracts/LoopDrop.sol", "utf8");

const standardJson = {
  language: "Solidity",
  sources: {
    "LoopDrop.sol": {
      content: src
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
      }
    }
  }
};

fs.writeFileSync("standard_input.json", JSON.stringify(standardJson, null, 2));
console.log("standard_input.json written");
console.log("size:", JSON.stringify(standardJson).length, "bytes");
