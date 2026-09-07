// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice MOTIVE testnet prototype: token launch + fixed native launch fee.
/// @dev This is deliberately a small testnet contract, not the production Pons V2 clone.
contract MotiveLaunchPrototype {
    string public constant VERSION = "MOTIVE-TESTNET-0.1";
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;
    uint256 public launchFee;
    address public owner;
    address payable public feeRecipient;

    struct Launch {
        address token;
        address creator;
        string name;
        string symbol;
        string metadataURI;
        uint256 createdAt;
    }
    Launch[] public launches;

    event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, string metadataURI, uint256 fee);
    event FeeRecipientUpdated(address indexed recipient);
    event LaunchFeeUpdated(uint256 fee);

    modifier onlyOwner() { require(msg.sender == owner, "MOTIVE: not owner"); _; }

    constructor(address payable initialFeeRecipient, uint256 initialLaunchFee) {
        require(initialFeeRecipient != address(0), "MOTIVE: zero recipient");
        owner = msg.sender;
        feeRecipient = initialFeeRecipient;
        launchFee = initialLaunchFee;
    }

    function launch(
        string calldata name_,
        string calldata symbol_,
        string calldata metadataURI_,
        uint256 supply_
    ) external payable returns (address token) {
        require(msg.value == launchFee, "MOTIVE: incorrect launch fee");
        require(bytes(name_).length > 0 && bytes(symbol_).length > 0, "MOTIVE: empty metadata");
        require(supply_ > 0 && supply_ <= MAX_SUPPLY, "MOTIVE: invalid supply");

        MotiveToken created = new MotiveToken(name_, symbol_, supply_, msg.sender);
        token = address(created);
        launches.push(Launch(token, msg.sender, name_, symbol_, metadataURI_, block.timestamp));
        (bool ok,) = feeRecipient.call{value: msg.value}("");
        require(ok, "MOTIVE: fee transfer failed");
        emit TokenLaunched(token, msg.sender, name_, symbol_, metadataURI_, msg.value);
    }

    function launchesLength() external view returns (uint256) { return launches.length; }

    function setFeeRecipient(address payable recipient) external onlyOwner {
        require(recipient != address(0), "MOTIVE: zero recipient");
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setLaunchFee(uint256 fee) external onlyOwner {
        launchFee = fee;
        emit LaunchFeeUpdated(fee);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MOTIVE: zero owner");
        owner = newOwner;
    }
}

contract MotiveToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    address public immutable creator;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 supply_, address creator_) {
        name = name_; symbol = symbol_; creator = creator_; totalSupply = supply_;
        balanceOf[creator_] = supply_;
        emit Transfer(address(0), creator_, supply_);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount); return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount; emit Approval(msg.sender, spender, amount); return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "MOTIVE: allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        _move(from, to, amount); return true;
    }
    function _move(address from, address to, uint256 amount) internal {
        require(to != address(0), "MOTIVE: zero recipient");
        require(balanceOf[from] >= amount, "MOTIVE: balance");
        balanceOf[from] -= amount; balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
