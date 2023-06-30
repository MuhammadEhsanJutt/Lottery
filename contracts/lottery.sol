// SPDX-License-Identifier: MIT
pragma solidity ^ 0.8.9;
//openzeppelin libraries are safe to use as they are opensource and properly tested world wide
import "@openzeppelin/contracts/utils/Strings.sol";// npm install @openzeppelin/contracts
import "@openzeppelin/contracts/utils/math/SafeMath.sol";//this library help us to convert into to string


//this contract implement the lottery system
//in this lottery owner can initiate lottery, set the price and  set maximum participants
//system automatically pick the winner randomly and as it reached to maximum participant without owner permission which makes it decenterlize
//owner can't initiate new one while one is already running
//owner can't withdraw anything while lottery is running
//winner will get 90% of total lottery as reward
//owner will get 5% of total lottery as reward
//remaining 5% is for functionality of the contract
//owner can withdraw remaining funds from contract but only when lottery is not runing 
//if lottery is not running awner can't withdraw anything from contract account


contract lottery 

{
    using SafeMath for uint;

    address payable public owner;
    bool public winnerPicked;
    struct structLottery
    {
        address payable[]   participants;//address of all participants who buy any lottery
        ////total number of lottries sold are equal to participants.length
        uint  maxParticipantsToPickWiner;//this should me be minimum 3
        uint  priceOfLottery;//this price must be in wei
    }
    structLottery private activeLottery;
    structLottery[] private withdrawLottries;

    constructor()
    {
        owner=payable(msg.sender);
        winnerPicked=false;
    }

    //this give the owner a power to initiate the lottery based on demand and set lottery price
    function initiateLottery(uint _priceOfLotteryInWei,uint _maxParticipants) public onlyowner isSomeoneBuyTickets isValidLottery(_priceOfLotteryInWei,_maxParticipants)
    {
           activeLottery.maxParticipantsToPickWiner=_maxParticipants;
           activeLottery.priceOfLottery=_priceOfLotteryInWei;
           winnerPicked=false;
    }

    //only owner is allowed to perform specific task such as lottery initiate and get balance
    modifier onlyowner()
    {
        require(msg.sender==owner,"only owner is allowed.");
        _;
    }

    //verifies some credential before initiating lottery like price and maximum participants
    modifier isValidLottery(uint _priceOfLotteryInWei,uint _maxParticipants)
    {
        require(_priceOfLotteryInWei>0,"price of lottery must be greater than 0 Wei.");
        require(_maxParticipants>2 && _maxParticipants<=10000000,"participants must be between 3-10000000.");
        _;
    }

    //validate weather someone buy tickets
    modifier isSomeoneBuyTickets()
    {
        require(activeLottery.participants.length==0,"someone buyed lottery, so you are not allowed.");
        _;
    }

    //Now build the buy part of the lottery
    function buyLottery() external payable enoughBalance//here we receive the value in wei and buy lottery
    {
        //number of lottery units he can buy with his sent ammount
        if(activeLottery.priceOfLottery>0)
        {
            uint _numbOfTickets = (msg.value).div(activeLottery.priceOfLottery);
            //access address previous total lottries and sum with new one
            for(uint i=1;i<=_numbOfTickets;i++)   
            {
                activeLottery.participants.push(payable(msg.sender));
            }
            if(activeLottery.participants.length>0 && activeLottery.participants.length>=activeLottery.maxParticipantsToPickWiner)
            {
                pickWinner();
            }
        }
    }

    //verify thats user have sent enough amount to buy lottery
    modifier enoughBalance()
    {
        require
        (msg.value>=activeLottery.priceOfLottery,
            string
            (
                abi.encodePacked
                (
                    "insufficient funds to buy the lottery as price of single lottery is: ",
                    Strings.toString(activeLottery.priceOfLottery)
                )
            )
        ); 
        _;
    }

    //pick our winner of lottery which is totaly random
    //if(activeLottery.participants.length>=activeLottery.maxParticipantsToPickWiner)
    //above code from buyLottery already insure that we have reached to maxParticipantsToPickWiner
    //so no need any modifier
    event evWinnerPicked(uint[3] _message);
    function pickWinner() public  
    {
        //winner index could not be greater than maximum participants which is uint
        uint _totalSales=activeLottery.participants.length.mul(activeLottery.priceOfLottery);
        if(_totalSales>0)
        {
            require(address(this).balance>=_totalSales,"something went wrong as aspected amount not available.");
            address payable _winnerAddress=activeLottery.participants[uint(random()%activeLottery.participants.length)];
            uint _transferAmountToWinner;
            uint _transferAmountToOwner;
            _transferAmountToWinner=(_totalSales.mul(90)).div(100);//which is going to 90% of total sales
            _transferAmountToOwner=(_totalSales.mul(5)).div(100);//which is going to 5% of total sales as reward
            //remaining is 5% for functionality of contract but owner can withdraw it if wants
            _winnerAddress.transfer(_transferAmountToWinner);
            owner.transfer(_transferAmountToOwner);
            //before resting activeLottery puch its detail inside withdrawLottries so we can keep track all of the lottries
            withdrawLottries.push(activeLottery);
            resetAll();
            uint[3] memory _returnsWinnerDetails=[uint160(address(_winnerAddress)),_transferAmountToWinner,_transferAmountToOwner];
            emit evWinnerPicked(_returnsWinnerDetails);
            winnerPicked=true;
        }
    }

    //generate the random winner
    function random() internal view returns(uint)
    {
      return uint(keccak256(abi.encodePacked(block.difficulty,block.timestamp,activeLottery.participants.length)));
    }

    //reset all of the parameter of lottery
    function resetAll() internal 
    {
        activeLottery.maxParticipantsToPickWiner=0;
        activeLottery.priceOfLottery=0; 
        delete activeLottery.participants;
    }
     
     //some extra functionality like check balance of the contract
    function getBalance() view public onlyowner returns(uint) 
    {
        return address(this).balance;
    }

    //transfer fund from contract to owner only lottery is not running
    function transfer() public onlyowner isSomeoneBuyTickets
    {
        owner.transfer(getBalance());
    }

    //this will return currently runing lottery price and maximum participants
    function basicDetailsOfActiveLottery() public view returns(uint256[2] memory)
    {
        uint256[2] memory _priceAndMaxParticipantsOfLottery=[activeLottery.priceOfLottery,activeLottery.maxParticipantsToPickWiner];
        return _priceAndMaxParticipantsOfLottery;
    }

    //this will return currently runing lottery complete details 
    function completeActiveLottery() public view returns(structLottery memory)
    {
        return activeLottery;
    }

    //when lottery pickup the winner insert complete detail inside withdrawLottries
    function listOfWithdrawLottries() external view onlyowner returns(structLottery[] memory )
    {
        return withdrawLottries;
    }
}