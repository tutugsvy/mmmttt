// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function totalSupply() external view returns (uint256);
    function balanceOf(address a) external view returns (uint256);
    function allowance(address a, address b) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MotiveLPBurner {
    address public constant DEAD = address(0x000000000000000000000000000000000000dEaD);
    event LPBurned(address indexed asset, uint256 amount);
    receive() external payable { payable(DEAD).transfer(msg.value); }
    function burnERC20(address asset, uint256 amount) external {
        require(IERC20Minimal(asset).transferFrom(msg.sender, DEAD, amount), "BURN_TRANSFER_FAILED");
        emit LPBurned(asset, amount);
    }
    function burnNative() external payable {
        payable(DEAD).transfer(msg.value);
        emit LPBurned(address(0), msg.value);
    }
}

contract MotiveTaxToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public immutable totalSupply;
    address public immutable curve;
    address public immutable creator;
    address public constant DEAD = address(0x000000000000000000000000000000000000dEaD);
    uint16 public immutable normalBuyTaxBps;
    uint16 public immutable normalSellTaxBps;
    uint256 public immutable antiSnipeEnd;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory n, string memory s, uint256 supply, address c, address cr, uint16 buyTax, uint16 sellTax, uint256 antiEnd) {
        require(bytes(n).length > 0 && bytes(s).length > 0, "EMPTY_METADATA");
        require(buyTax <= 1000 && sellTax <= 1000, "TAX_TOO_HIGH");
        name=n; symbol=s; totalSupply=supply; curve=c; creator=cr; normalBuyTaxBps=buyTax; normalSellTaxBps=sellTax; antiSnipeEnd=antiEnd;
        balanceOf[c] = supply; emit Transfer(address(0), c, supply);
    }
    function transfer(address to, uint256 amount) external returns (bool) { _move(msg.sender, to, amount); return true; }
    function approve(address spender, uint256 amount) external returns (bool) { allowance[msg.sender][spender]=amount; emit Approval(msg.sender, spender, amount); return true; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a=allowance[from][msg.sender]; require(a>=amount, "ALLOWANCE"); if(a!=type(uint256).max) allowance[from][msg.sender]=a-amount; _move(from,to,amount); return true;
    }
    function currentTaxBps(bool buy) public view returns (uint256) {
        if (block.timestamp < antiSnipeEnd) return 9900;
        return buy ? normalBuyTaxBps : normalSellTaxBps;
    }
    function quoteTransfer(address from, address to, uint256 amount) public view returns (uint256 tax, uint256 received) {
        bool buy = from == curve; bool sell = to == curve; uint256 bps = (buy || sell) ? currentTaxBps(buy) : 0;
        tax = amount * bps / 10000; received = amount - tax;
    }
    function _move(address from, address to, uint256 amount) internal {
        require(to != address(0) && balanceOf[from] >= amount, "BALANCE");
        (uint256 tax, uint256 received) = quoteTransfer(from,to,amount);
        balanceOf[from]-=amount; balanceOf[to]+=received; emit Transfer(from,to,received);
        if(tax>0) { balanceOf[DEAD]+=tax; emit Transfer(from,DEAD,tax); }
    }
}

contract MotiveBondingCurve {
    uint256 public constant BPS = 10000;
    uint256 public immutable targetRaise;
    uint256 public immutable tradeFeeBps;
    address public immutable creator;
    address public immutable feeRecipient;
    MotiveTaxToken public immutable token;
    MotiveLPBurner public immutable burner;
    uint256 public immutable virtualQuoteReserve;
    uint256 public immutable virtualTokenReserve;
    uint256 public quoteReserve;
    uint256 public tokenReserve;
    bool public graduated;
    bool private locked;
    event Bought(address indexed buyer, uint256 quoteIn, uint256 tokensOut, uint256 tax, uint256 fee);
    event Sold(address indexed seller, uint256 tokensIn, uint256 quoteOut, uint256 tax, uint256 fee);
    event Graduated(address indexed token, uint256 quoteBurned, uint256 tokenBurned);
    modifier nonReentrant(){ require(!locked,"REENTRANT"); locked=true; _; locked=false; }
    constructor(string memory n,string memory s,uint256 supply,address c,uint16 buyTax,uint16 sellTax,uint256 antiWindow,uint256 target,uint256 feeBps,address feeTo) payable {
        require(target>0 && feeBps<=1000,"BAD_CONFIG"); creator=c; targetRaise=target; tradeFeeBps=feeBps; feeRecipient=feeTo;
        burner=new MotiveLPBurner();
        token = new MotiveTaxToken(n,s,supply,address(this),c,buyTax,sellTax,block.timestamp+antiWindow);
        virtualQuoteReserve=target/10;
        virtualTokenReserve=supply/10;
        tokenReserve=supply;
    }
    receive() external payable { buy(0); }
    function spotQuote(uint256 quoteIn) public view returns(uint256 grossTokens,uint256 fee,uint256 tax,uint256 received) {
        fee=quoteIn*tradeFeeBps/BPS; uint256 net=quoteIn-fee; uint256 out=(net*(tokenReserve+virtualTokenReserve))/(quoteReserve+virtualQuoteReserve+net); if(out>tokenReserve) out=tokenReserve; (tax,received)=token.quoteTransfer(address(this),address(0),out); grossTokens=out;
    }
    function spotSell(uint256 tokensIn) public view returns(uint256 quoteOut,uint256 fee,uint256 tax,uint256 received) {
        (tax,received)=token.quoteTransfer(address(0),address(this),tokensIn); uint256 gross=(received*(quoteReserve+virtualQuoteReserve))/(tokenReserve+virtualTokenReserve+received); fee=gross*tradeFeeBps/BPS; quoteOut=gross-fee;
    }
    function buy(uint256 minTokensOut) public payable nonReentrant returns(uint256 received) {
        require(!graduated && msg.value>0,"NOT_ACTIVE"); (uint256 gross,uint256 fee,,uint256 out)=spotQuote(msg.value); require(out>=minTokensOut && gross<tokenReserve,"SLIPPAGE");
        quoteReserve += msg.value-fee; tokenReserve -= gross; received=out; require(token.transfer(msg.sender,gross),"TOKEN_TRANSFER");
        if(fee>0) payable(feeRecipient).transfer(fee); emit Bought(msg.sender,msg.value,received, gross-received, fee); if(quoteReserve>=targetRaise) _graduate();
    }
    function sell(uint256 tokensIn,uint256 minQuoteOut) external nonReentrant returns(uint256 out) {
        require(!graduated && tokensIn>0,"NOT_ACTIVE"); (uint256 quoteOut,uint256 fee,,uint256 received)=spotSell(tokensIn); require(quoteOut>=minQuoteOut && quoteOut<quoteReserve,"SLIPPAGE"); require(token.transferFrom(msg.sender,address(this),tokensIn),"TOKEN_TRANSFER");
        tokenReserve += received; quoteReserve -= quoteOut; out=quoteOut; if(fee>0) payable(feeRecipient).transfer(fee); payable(msg.sender).transfer(out); emit Sold(msg.sender,tokensIn,out,tokensIn-received,fee);
    }
    function _graduate() internal {
        graduated=true; uint256 q=address(this).balance; uint256 t=token.balanceOf(address(this)); if(q>0) burner.burnNative{value:q}(); if(t>0){ token.approve(address(burner),t); burner.burnERC20(address(token),t); } emit Graduated(address(token),q,t);
    }
}

contract MotiveGraduation {
    event GraduationConfigured(uint256 targetRaise);
    function target(uint256 amount) external { emit GraduationConfigured(amount); }
}

contract MotiveFactoryV2 {
    uint256 public constant MAX_SUPPLY=1_000_000_000 ether;
    uint256 public constant MAX_TAX_BPS=1000;
    uint256 public launchFee;
    uint256 public antiSnipeWindow;
    uint256 public targetRaise;
    uint256 public tradeFeeBps;
    address public owner;
    address payable public feeRecipient;
    address public immutable graduation;
    address[] public allTokens;
    mapping(address=>address) public tokenToCurve;
    event TokenLaunched(address indexed token,address indexed curve,address indexed creator,string name,string symbol,uint256 targetRaise);
    event ParamsUpdated(uint256 launchFee,uint256 antiSnipeWindow,uint256 targetRaise,uint256 tradeFeeBps);
    modifier onlyOwner(){require(msg.sender==owner,"NOT_OWNER");_;}
    constructor(address payable feeTo,uint256 fee,uint256 antiWindow,uint256 target,uint256 tradeBps){require(feeTo!=address(0) && tradeBps<=MAX_TAX_BPS,"BAD_CONFIG"); owner=msg.sender; feeRecipient=feeTo; launchFee=fee; antiSnipeWindow=antiWindow; targetRaise=target; tradeFeeBps=tradeBps; graduation=address(new MotiveGraduation());}
    function launch(string calldata n,string calldata s,uint256 supply,uint16 buyTax,uint16 sellTax,uint256 minOut) external payable returns(address token,address curve){
        require(msg.value==launchFee,"BAD_LAUNCH_FEE"); require(supply>0 && supply<=MAX_SUPPLY,"BAD_SUPPLY"); require(buyTax<=MAX_TAX_BPS && sellTax<=MAX_TAX_BPS,"BAD_TAX");
        MotiveBondingCurve c=new MotiveBondingCurve{value:0}(n,s,supply,msg.sender,buyTax,sellTax,antiSnipeWindow,targetRaise,tradeFeeBps,feeRecipient); curve=address(c); token=address(c.token()); allTokens.push(token); tokenToCurve[token]=curve;
        payable(feeRecipient).transfer(msg.value); emit TokenLaunched(token,curve,msg.sender,n,s,targetRaise);
        if(minOut>0){} // reserved for atomic initial buy in the next audited revision
    }
    function setParams(uint256 fee,uint256 antiWindow,uint256 target,uint256 tradeBps) external onlyOwner { require(tradeBps<=MAX_TAX_BPS,"BAD_FEE"); launchFee=fee; antiSnipeWindow=antiWindow; targetRaise=target; tradeFeeBps=tradeBps; emit ParamsUpdated(fee,antiWindow,target,tradeBps); }
    function setFeeRecipient(address payable to) external onlyOwner { require(to!=address(0)); feeRecipient=to; }
    function transferOwnership(address to) external onlyOwner { require(to!=address(0)); owner=to; }
    function allTokensLength() external view returns(uint256){return allTokens.length;}
}
