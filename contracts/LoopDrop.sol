// SPDX-License-Identifier: MIT
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
    // ── State ──────────────────────────────────────────────────────────
    address public owner;
    IERC20  public usdc;

    uint256 public nextLoopId = 1;
    uint256 public nextTokenId = 1;

    struct Loop {
        address producer;
        string  title;
        uint256 price;   // USDC (6 decimals)
        bool    active;
    }

    mapping(uint256 => Loop)    public loops;
    mapping(uint256 => address) public licenseOwner;   // tokenId => holder
    mapping(uint256 => uint256) public licenseLoop;    // tokenId => loopId
    mapping(address => uint256) public pendingRoyalty; // producer => owed

    // ── Events ─────────────────────────────────────────────────────────
    event LoopListed(uint256 indexed loopId, address producer, string title, uint256 price);
    event LoopPurchased(uint256 indexed loopId, address buyer, uint256 tokenId, uint256 price);
    event RoyaltyPaid(address indexed producer, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    // ── Constructor ────────────────────────────────────────────────────
    constructor(address _usdc) {
        owner = msg.sender;
        usdc  = IERC20(_usdc);
    }

    // ── Producer: list a loop ──────────────────────────────────────────
    function listLoop(string calldata title, uint256 price) external returns (uint256 loopId) {
        require(price >= 50000 && price <= 150000, "price 0.05-0.15 USDC");
        loopId = nextLoopId++;
        loops[loopId] = Loop(msg.sender, title, price, true);
        emit LoopListed(loopId, msg.sender, title, price);
    }

    // ── Buyer: purchase loop, mint NFT license ─────────────────────────
    function buyLoop(uint256 loopId) external returns (uint256 tokenId) {
        Loop storage l = loops[loopId];
        require(l.active, "loop not active");

        // pull USDC from buyer
        bool ok = usdc.transferFrom(msg.sender, address(this), l.price);
        require(ok, "USDC transfer failed");

        // accrue royalty for producer
        pendingRoyalty[l.producer] += l.price;

        // mint NFT license
        tokenId = nextTokenId++;
        licenseOwner[tokenId] = msg.sender;
        licenseLoop[tokenId]  = loopId;

        emit Transfer(address(0), msg.sender, tokenId);
        emit LoopPurchased(loopId, msg.sender, tokenId, l.price);
    }

    // ── Royalty agent: pay out producer ───────────────────────────────
    function payRoyalty(address producer) external {
        uint256 amount = pendingRoyalty[producer];
        require(amount > 0, "nothing owed");
        pendingRoyalty[producer] = 0;
        bool ok = usdc.transfer(producer, amount);
        require(ok, "USDC payout failed");
        emit RoyaltyPaid(producer, amount);
    }

    // ── Views ──────────────────────────────────────────────────────────
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

    // ── Admin ─────────────────────────────────────────────────────────
    function delistLoop(uint256 loopId) external {
        require(msg.sender == loops[loopId].producer || msg.sender == owner, "unauthorized");
        loops[loopId].active = false;
    }
}
