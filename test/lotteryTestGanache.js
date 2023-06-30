const{expect} = require("chai");
//using chai-bignumber library to handle extremly large numbers 
//9999966472442775136 like this number perform operations +-/*
const chai = require('chai');
const { use } = chai;
const BN = require('bn.js');
const chaiBN = require('chai-bn')(BN);
use(chaiBN);

//[] for array and {} for object
const hre = require("hardhat");


describe("lottery contract",function()
{
    this.timeout(60*60*1000); // Set timeout 10 mints(or adjust as needed)
    let _Lottery;//this is before deployment
    let _lottery;//this is actual deployed object
    let _allAddress;
    let _error;//as ganache don't revert it through expection to handle exception 
    const _gasLimit=6721975;//copy and past from ganache 
    let _maxParticipantsToPickWiner = 0;
    let _priceOfLottery = 0;
    let _winnerPicked;
    let _functionRun=0;
    let _eventPromise;
    let _message;

    this.beforeEach(async function()
        {
            _Lottery = await ethers.getContractFactory("lottery");
            _allAddress = await hre.ethers.getSigners();
            _lottery = await _Lottery.deploy();
             // event listener
            _eventPromise = fnCallEvent();
        });

    //output function for test so easily commented when not required the output as there are a lot of test
    function fnOutput(_output)
    {
        console.log(_output);
    }
    
    //event listener functions 
    async function fnCallEvent()
    {
        return new Promise((resolve, reject) => 
            {
                let eventListener = (_msg) => 
                {
                    const winnerAddressHex = _msg[0].toHexString();
                    // Access the converted address in hexadecimal form
                    _message=`Winner Address:${winnerAddressHex}`
                    fnOutput(_message);
                    // Access the other values emitted by the event
                    _message=`Transfer Amount to Winner:${ethers.utils.formatEther(_msg[1])}`
                    fnOutput(_message);
                    _message=`Transfer Amount to Owner:${ethers.utils.formatEther(_msg[2])}`
                    fnOutput(_message);
                    // Remove the event listener
                    _lottery.removeListener("evWinnerPicked", eventListener);
                    resolve();
                };
                _lottery.on("evWinnerPicked", eventListener);
            }).catch((error) => 
            {
                _message=`An error occurred:${error}`
                fnOutput(_message);
            });
    }

    //above code excuted automatically every time whenever we need start a test
    async function initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner)
    {
        await _lottery.initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner,{gasLimit: _gasLimit});
    }

    //buy a single lottery
    async function buyLottery(_maxLotteriesOneCanBuy)
    {
        _winnerPicked=await _lottery.winnerPicked();
        if(!_winnerPicked)
        {
            //randomly generating user 
            let min = 1;//minimum user
            let max = 9;//user for ganache
            let _user = Math.floor(Math.random()*(max - min + 1)) + min;
            //randomly genating lotteries quantity to buy but one can control maxlottries single user can buy
            max = _maxLotteriesOneCanBuy;
            let _numbOfLottriesToBuy = Math.floor(Math.random() * (max - min + 1)) + min;

            const {priceOfLottery} = await _lottery.completeActiveLottery();
            const _amountToBuy = ethers.BigNumber.from(priceOfLottery.toString()).mul(_numbOfLottriesToBuy);

            //before buying variables 
            let _UBalanceBefore = await ethers.provider.getBalance(_allAddress[_user].address);
            let _contractBalanceBeforeBuy=await _lottery.getBalance();
            let [participants] = await _lottery.completeActiveLottery();
            let _participantsBeforeBuy=participants.length;
            
            //lets buy lottery    
            let tx = await _lottery.connect(_allAddress[_user]).buyLottery({value:_amountToBuy,gasLimit: _gasLimit});
            let receipt = await tx.wait();
            let gasCost = receipt.gasUsed.mul(tx.gasPrice);

            //After buy variables
            let _UBalanceAfter = await ethers.provider.getBalance(_allAddress[_user].address);
            let _UBalanceAfterBuySumGasAndLotteryAmount=_UBalanceAfter.add(_amountToBuy).add(gasCost);
            let _contractBalanceAfterBuy=await _lottery.getBalance();
            [participants] = await _lottery.completeActiveLottery();
            let _participantsAfterBuy=participants.length;

            //logs 
            _message=`User:${_user} || address:${_allAddress[_user].address} || buy lottries:${_numbOfLottriesToBuy} || pay amount:${ethers.utils.formatEther(_amountToBuy)}`;
            fnOutput(_message);

            //verify all 
            //using chai-bignumber library to handle extremly large numbers 
            _winnerPicked=await _lottery.winnerPicked();
            if(!_winnerPicked)
            {
                expect(_UBalanceBefore.toString()).to.be.a.bignumber.deep.equal((_UBalanceAfterBuySumGasAndLotteryAmount.toString()).toString());
                expect(_contractBalanceBeforeBuy.toString()).to.be.a.bignumber.deep.equal((_contractBalanceAfterBuy.sub(_amountToBuy)).toString());
                expect(_participantsBeforeBuy).to.equal(_participantsAfterBuy-_numbOfLottriesToBuy);
            }
        }
    }

    //buy more than one lotteries
    async function buyLotteries(_priceOfSingleLottery,_maxParticipantsToBuy,_maxLotteriesOneCanBuy)
    {
        await initiateLottery(_priceOfSingleLottery,_maxParticipantsToBuy);
        for(let i=1;i<=20;i++)//on total it will run 20 times and buyLottery(_maxLotteriesOneCanBuy)
        {
            _winnerPicked=await _lottery.winnerPicked();
            if(!_winnerPicked)
            {
                await buyLottery(_maxLotteriesOneCanBuy);
            }
            else
            {
                break;
            }
        }
    }

    //buy lotries test
    async function buyLottriesTest(_priceOfSingleLottery,_maxParticipantsToBuy,_maxLotteriesOneCanBuy)
    {
        //buy Lottery 
        await buyLotteries(BigInt(_priceOfSingleLottery),_maxParticipantsToBuy,_maxLotteriesOneCanBuy);
        _winnerPicked=await _lottery.winnerPicked();
        if(_winnerPicked)
        {
            await Promise.resolve(_eventPromise);
        }
    }

    //to withdraw multi lottries it will give us multiple winners
    async function buyLotteriesMultiWinner(_priceOfLottery,_maxParticipants,_totalWinners,_maxLotteriesOneCanBuy)
    {
        await buyLottriesTest(_priceOfLottery,_maxParticipants,_maxLotteriesOneCanBuy);
        _message=`Contract Balance:${ethers.utils.formatEther(await _lottery.getBalance())}`;
        fnOutput(_message);
        _functionRun++;
        if(_functionRun<_totalWinners)
        {
            _eventPromise = fnCallEvent();
            await buyLotteriesMultiWinner(_priceOfLottery,_maxParticipants,_totalWinners,_maxLotteriesOneCanBuy);
        }
        _functionRun=0;
    }


    describe("Deployment on Ganache",function()
    {
        it("should check if owner is assigned",async function()
        {
            //allAddress[0] account is the owner 
            //allAddress[0] return us the account object which have many properties but we only access address hare
            expect(await _lottery.owner()).to.equal(_allAddress[0].address);
        });
    });

    describe("initial stage",function()
    {
        it("should check verify that currently i am connect to owner account",async function()
        {
            expect(await _lottery.owner()).to.equal(_allAddress[0].address);
            //below i will get account i am currently connected to 
        });

        it("should check balance of contract",async function()
        {
            //using owner account
            expect(await _lottery.getBalance()).to.equal(0);
            //using other account except owner
            await expect(_lottery.connect(_allAddress[1]).getBalance()).to.be.reverted;
            //ganache behavour is different for this exception as it is reverted without any reason 
            //so i am dealing it in this way
        });

        it("should check verify basic details of lottery which must be 0/undefined/null etc at initial ",async function()
        {
            const [priceOfLottery,maxParticipantsToPickWiner] = await _lottery.basicDetailsOfActiveLottery();
            expect(priceOfLottery).to.equal(0);
            expect(maxParticipantsToPickWiner).to.equal(0);
        });

        it("should check verify complete active details of lottery which must be 0/undefined/null etc at initial",async function()
        {
            const {participants,priceOfLottery,maxParticipantsToPickWiner} = await _lottery.completeActiveLottery();
            expect(participants).to.deep.equal([])
            expect(priceOfLottery).to.equal(0);
            expect(maxParticipantsToPickWiner).to.equal(0);
        });

        it("should check verify list of withdrawals lotteries which must be 0/undefined/null etc at initial",async function()
        {
            //for owner account
            const [withdrawLottries] = await _lottery.listOfWithdrawLottries();
            expect(withdrawLottries).to.equal(undefined);

            //for other than owner is not allowed so expecting revert
            await expect(_lottery.connect(_allAddress[1]).listOfWithdrawLottries()).to.be.reverted;
            //ganache behavour is different for this exception as it is reverted without any reason 
            //so i am dealing it in this way

        });
    });

    describe("initialize lottery",function()
    {
        //not testing them with ganache as ganache revert behavior is different
        //     a lottery is valid only if 
        //     1    owner account is used (owner is already tested)
        //     2    _priceOfLotteryInWei > 0
        //     3    _maxParticipants>2 && _maxParticipants<=10000000
        it("lets check out if other than owner try to initiate the lottery is it reverted",async function()
        {
            _priceOfLottery=1000;//price of lottery 1000 Wei (valid)
            _maxParticipantsToPickWiner=5;//maximum participant (valid)
            try
            {
                await _lottery.connect(_allAddress[1]).initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner,{gasLimit:_gasLimit});
            }
            catch (error) 
            {
                _error=error;
            }

            expect(_error.data.message).to.be.equal("revert");
            expect(_error.data.reason).to.be.equal("only owner is allowed.");
        });

        it("should provide inapporiate data so lottery reverted (isValidLottery).",async function()
        {
            _priceOfLottery=0;//invalid
            _maxParticipantsToPickWiner=5;//valid
            try
            {
                await _lottery.initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner,{gasLimit:_gasLimit});
            }
            catch (error) 
            {
                _error=error;
            }
            expect(_error.data.message).to.be.equal("revert");
            expect(_error.data.reason).to.be.equal("price of lottery must be greater than 0 Wei.");
            
            _priceOfLottery=225;//valid
            _maxParticipantsToPickWiner=2;//invalid under value
            try
            {
                await _lottery.initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner,{gasLimit:_gasLimit});
            }
            catch (error) 
            {
                _error=error;
            }
            expect(_error.data.message).to.be.equal("revert");
            expect(_error.data.reason).to.be.equal("participants must be between 3-10000000.");

            _priceOfLottery=225;//valid
            _maxParticipantsToPickWiner=10000001;//invalid over value
            try
            {
                await _lottery.initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner,{gasLimit:_gasLimit});
            }
            catch (error) 
            {
                _error=error;
            }
            expect(_error.data.message).to.be.equal("revert");
            expect(_error.data.reason).to.be.equal("participants must be between 3-10000000.");
        });

        it("initiate lottery with proper input",async function()
        {
            _priceOfLottery=1000;//price of lottery 1000 Wei
            _maxParticipantsToPickWiner=5;//maximum participant 
            await _lottery.initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner);
            const [priceOfLottery,maxParticipantsToPickWiner] = await _lottery.basicDetailsOfActiveLottery();
            expect(priceOfLottery).to.equal(_priceOfLottery);
            expect(maxParticipantsToPickWiner).to.equal(_maxParticipantsToPickWiner);
        });
    });

    describe("process the lottery",function()
    {
        it("can user buy tickets",async function()
        {
            var _priceOfSingleLottery="99999664724427751";
            var _maxParticipantsToBuy=200
            var _maxLotteriesOneCanBuy=2
            await buyLotteries(_priceOfSingleLottery,_maxParticipantsToBuy,_maxLotteriesOneCanBuy);       
        });

        it("pick the winner",async function()
        {
            var _priceOfSingleLottery="99999664724427751";
            var _maxParticipantsToBuy=30;
            var _maxLotteriesOneCanBuy=10;
            await buyLottriesTest(_priceOfSingleLottery,_maxParticipantsToBuy,_maxLotteriesOneCanBuy);
        });

        it("pick the multi winner",async function()
        {
            var _priceOfLottery="99999664724427751";
            var _maxParticipants=20;
            var _totalWinners=10;
            var _maxLotteriesOneCanBuy=10
            await buyLotteriesMultiWinner(_priceOfLottery,_maxParticipants,_totalWinners,_maxLotteriesOneCanBuy);
        });
    });

    describe("detail of lottery", function()
    {
        // check complete active lotery details;
        it("should check verify complete active details of lottery which must match",async function()
        {
            let _totalnumbOfLottriesToBuy=0;
            _priceOfLottery="99999664724427751";
            _maxParticipantsToPickWiner=7000;
            await initiateLottery(_priceOfLottery,_maxParticipantsToPickWiner);
            //buy first lottery
            let _maxLotteriesOneCanBuy=1;
            _totalnumbOfLottriesToBuy+=_maxLotteriesOneCanBuy;
            await buyLottery(_maxLotteriesOneCanBuy);

            //first lottery buy test
            var {participants,priceOfLottery,maxParticipantsToPickWiner} = await _lottery.completeActiveLottery();
            expect(participants.length).to.deep.equal(_maxLotteriesOneCanBuy);
            expect(priceOfLottery).to.equal(BigInt(_priceOfLottery));
            expect(maxParticipantsToPickWiner).to.equal(_maxParticipantsToPickWiner);

            priceOfLottery="Price of Lottery: "+ethers.utils.formatEther(priceOfLottery);
            maxParticipantsToPickWiner="Max Participants: "+ Number(maxParticipantsToPickWiner)
            for (let participant of participants)
            {
                _message=`${priceOfLottery} || ${maxParticipantsToPickWiner} || Participant: ${participant}`;
                fnOutput(_message);
            }

            //buy more lotteries
            _totalnumbOfLottriesToBuy+=_maxLotteriesOneCanBuy;
            await buyLottery(_maxLotteriesOneCanBuy);
            _totalnumbOfLottriesToBuy+=_maxLotteriesOneCanBuy;
            await buyLottery(_maxLotteriesOneCanBuy);
            _totalnumbOfLottriesToBuy+=_maxLotteriesOneCanBuy;
            await buyLottery(_maxLotteriesOneCanBuy);
            //now verify all of them together
            var { participants, priceOfLottery, maxParticipantsToPickWiner } = await _lottery.completeActiveLottery();
            expect(participants.length).to.deep.equal(_totalnumbOfLottriesToBuy)
            expect(priceOfLottery).to.equal(BigInt(_priceOfLottery));
            expect(maxParticipantsToPickWiner).to.equal(_maxParticipantsToPickWiner);
            
            priceOfLottery="Price of Lottery: "+ethers.utils.formatEther(priceOfLottery);
            maxParticipantsToPickWiner="Max Participants: "+ Number(maxParticipantsToPickWiner)
            for (let participant of participants)
            {
                _message=`${priceOfLottery} || ${maxParticipantsToPickWiner} || Participant: ${participant}`;
                fnOutput(_message);
            }
        });

        //chech and verify withdraw lotteries details
        it("should check withdraw lotteries details",async function()
        {
            var _maxParticipants=20;
            var _priceOfLottery="99999664724427751";
            var _totalWinners=10;
            var _maxLotteriesOneCanBuy=10
            await buyLotteriesMultiWinner(_priceOfLottery,_maxParticipants,_totalWinners,_maxLotteriesOneCanBuy);

            const [...withdrawLottries] = await _lottery.listOfWithdrawLottries();
            for (let i = 0; i < withdrawLottries.length; i++) 
            {
                let lottery = withdrawLottries[i];
                let priceOfLottery = lottery.priceOfLottery;
                let maxParticipantsToPickWiner = lottery.maxParticipantsToPickWiner;
                let participants = lottery.participants;
              
                _message=`Lottery No. ${i + 1}`;
                fnOutput(_message);
                priceOfLottery="Price of Lottery: "+ethers.utils.formatEther(priceOfLottery);
                maxParticipantsToPickWiner="Max Participants: "+ Number(maxParticipantsToPickWiner);
                for (let participant of participants)
                {
                    _message=`${priceOfLottery} || ${maxParticipantsToPickWiner} || Participant: ${participant}`;
                    fnOutput(_message);
                }
            }
        });
    });

    describe("transfer funds", function()
    {
        it("should verify other than owner not able to withdraw funds",async function()
        {
            try 
            {
                await _lottery.connect(_allAddress[1]).transfer({gasLimit: _gasLimit});
            } 
            catch (error) 
            {
                _error=error;
            }

            expect(_error.data.message).to.be.equal("revert");
            expect(_error.data.reason).to.be.equal("only owner is allowed.");
        });
        it("should verify owner is not allowed to withdraw funds if someone buy ticket", async function()
        {
            var _priceOfSingleLottery="99999664724427751";
            var _maxParticipantsToBuy=2000
            var _maxLotteriesOneCanBuy=5
            await buyLotteries(_priceOfSingleLottery,_maxParticipantsToBuy,_maxLotteriesOneCanBuy);       
            //now people buy tickets so owner is not allowed to withdraw any funds
            try
            {
               await _lottery.transfer({gasLimit: _gasLimit});
            }
            catch (error) 
            {
                _error=error;
            }
            expect(_error.data.message).to.be.equal("revert");
            expect(_error.data.reason).to.be.equal("someone buyed lottery, so you are not allowed.");
        });
        it("should verify owner is able to successfuly withdraw", async function()
        {
            var _priceOfLottery="99999664724427751";
            var _maxParticipants=20;
            var _totalWinners=5;
            var _maxLotteriesOneCanBuy=10;
            await buyLotteriesMultiWinner(_priceOfLottery,_maxParticipants,_totalWinners,_maxLotteriesOneCanBuy);
            _message="<--------------------------------------------------->";
            fnOutput(_message);

            var _contractBalanceBeforeTransfer=await _lottery.getBalance();
            var _ownerBalanceBeforeTransfer =await ethers.provider.getBalance(_allAddress[0].address);//0 is for owner
            //transfer funds and calculate gas
            var tx = await _lottery.transfer({gasLimit: _gasLimit});
            var receipt = await tx.wait();
            var gasCost = receipt.gasUsed.mul(tx.gasPrice);
            
            var _contractBalanceAfterTransfer=await _lottery.getBalance();//no need to convert as expecting 0
            var _ownerBalanceAfterTransfer = await ethers.provider.getBalance(_allAddress[0].address);//0 is for owner

            var _ownerBalanceDifference=_ownerBalanceAfterTransfer.sub(_ownerBalanceBeforeTransfer);
            var _ownerExpectedBalance=_ownerBalanceBeforeTransfer.add(_contractBalanceBeforeTransfer.sub(gasCost));
            var _gasCostAndAmountSended=_ownerBalanceDifference.add(gasCost);
            //verify
            expect(_contractBalanceAfterTransfer).to.equal(0);//as whole amount transfered
            expect(_ownerBalanceAfterTransfer.toString()).to.be.a.bignumber.deep.equal(_ownerExpectedBalance.toString());

            //convert to ethers not done before because .add and .sub functions work with BigNumber only
            _contractBalanceBeforeTransfer= ethers.utils.formatEther(_contractBalanceBeforeTransfer);
            _ownerBalanceBeforeTransfer= ethers.utils.formatEther(_ownerBalanceBeforeTransfer);
            _ownerBalanceAfterTransfer= ethers.utils.formatEther(_ownerBalanceAfterTransfer);
            gasCost= ethers.utils.formatEther(gasCost);
            _ownerBalanceDifference= ethers.utils.formatEther(_ownerBalanceDifference);
            _gasCostAndAmountSended= ethers.utils.formatEther(_gasCostAndAmountSended);
            _message=`contract balance before: ${_contractBalanceBeforeTransfer} , after:${_contractBalanceAfterTransfer}`;
            fnOutput(_message);
            _message=`owner balance before: ${_ownerBalanceBeforeTransfer} , after:${_ownerBalanceAfterTransfer}`;
            fnOutput(_message);
            _message=`owner balance difference: ${_ownerBalanceDifference} , gas cost:${gasCost}, sending amout + gas:${_gasCostAndAmountSended}`;
            fnOutput(_message);
        });
    });
});