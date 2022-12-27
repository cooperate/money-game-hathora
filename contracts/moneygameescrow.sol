// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MoneyGameEscrow is Ownable, AccessControl {
    //create a mapping to store game roles
    mapping (uint => bytes32) public gameRolesDeployer;
    mapping (uint => bytes32) public gameRolesPlayer;
    
    struct GamePlayer {
        address wallet;
        uint256 tokenAmount;
    }

    struct GameDeployer {
        address wallet;
        uint256 tokenAmount;
    }

    struct Game {
        uint256 tokenAmount;
        address tokenContract;
        bool gameStatus;
        GamePlayer[] gamePlayers;
        GameDeployer gameDeployer;
    }

    //create a mapping to store game objects
    mapping(uint256 => Game) public games;

    //deployGame function to deploy a game
    function deployGame(
        uint256 _gameId,
        uint256 _tokenAmount,
        address _tokenContract
    ) public {
        //create a new game object
        Game memory newGame = Game(
            _tokenAmount,
            _tokenContract,
            true,
            new GamePlayer[](0),
            GameDeployer(msg.sender, 0)
        );
        //store the game object in the games mapping
        games[_gameId] = newGame;
        //create game role deployer
        bytes32 gameRoleDeployer = keccak256(abi.encodePacked(_gameId, msg.sender));
        //add game role to gameRoles mapping
        gameRolesDeployer[_gameId] = gameRoleDeployer;
        //add game role deployer to game role
        _grantRole(gameRoleDeployer[_gameId], msg.sender);
        //create game role player
        bytes32 gameRolePlayer = keccak256(abi.encodePacked(_gameId));
        //add game role to gameRoles mapping
        gameRolesPlayer[_gameId] = gameRolePlayer;
    }

    //addWalletToGame function to add a wallet to a game
    function addWalletToGame(uint256 _gameId, address _wallet) public {
        //ensure sender is game role deployer
        require(
            hasRole(gameRolesDeployer[_gameId], msg.sender),
            "Sender is not game role deployer"
        );
        //check if the game exists
        require(games[_gameId].gameStatus == true, "Game does not exist");
        //check if the wallet is already in the game
        require(
            games[_gameId].gamePlayers.length == 0 ||
                games[_gameId].gamePlayers[0].wallet != _wallet,
            "Wallet already in game"
        );
        //add the wallet to the game
        games[_gameId].gamePlayers.push(GamePlayer(_wallet, 0));
        //grant game role player to wallet
        _grantRole(gameRolesPlayer[_gameId], _wallet);
    }

    function distributeMoneyForGame(uint256 _gameId, GamePlayer[] memory moneyPaidOut) public {
        //ensure sender is game role deployer
        require(
            hasRole(gameRolesDeployer[_gameId], msg.sender),
            "Sender is not game role deployer"
        );
        //check if the game exists
        require(games[_gameId].gameStatus == true, "Game does not exist");
        //check if the game has at least 2 players
        require(
            games[_gameId].gamePlayers.length >= 2,
            "Game does not have enough players"
        );
        //get the total amount of tokens in the game
        uint256 totalAmount = games[_gameId].tokenAmount;
       //distribute moneyPaidOut
        for (uint256 i = 0; i < moneyPaidOut.length; i++) {
            //check if the wallet is in the game
            require(
                games[_gameId].gamePlayers[i].wallet == moneyPaidOut[i].wallet,
                "Wallet not in game"
            );
            //check if the amount is less than the total amount
            require(
                moneyPaidOut[i].tokenAmount <= totalAmount,
                "Amount is greater than total amount"
            );
            //subtract the amount from the total amount
            totalAmount -= moneyPaidOut[i].tokenAmount;
            //add the amount to the wallet
            games[_gameId].gamePlayers[i].tokenAmount += moneyPaidOut[i].tokenAmount;
        }
        //send the remaining tokens back to the game deployer
        games[_gameId].gameDeployer.tokenAmount = totalAmount;
    }

    function redeemTokens(uint256 _gameId) public {
         //ensure sender is game role gameRolePlayer
        require(
            hasRole(gameRolesPlayer[_gameId], msg.sender),
            "Sender is not game role player"
        );
        //check if the game exists
        require(games[_gameId].gameStatus == true, "Game does not exist");
        
        //get the index of the wallet in the game
        uint256 i = 0;
        for (i = 0; i < games[_gameId].gamePlayers.length; i++) {
            if (games[_gameId].gamePlayers[i].wallet == msg.sender) {
                break;
            }
        }
        //check if the wallet is in the game
        require(
            games[_gameId].gamePlayers[i].wallet == msg.sender,
            "Wallet not in game"
        );
        //get the amount of tokens in the wallet
        uint256 amount = games[_gameId].gamePlayers[i].tokenAmount;
        //set the amount of tokens in the wallet to 0
        games[_gameId].gamePlayers[i].tokenAmount = 0;
        //send the tokens to the wallet
        IERC20(games[_gameId].tokenContract).transfer(msg.sender, amount);
    }

    function redeemTokensDeployer(uint256 _gameId) public {
        //ensure sender is game role deployer
        require(
            hasRole(gameRolesDeployer[_gameId], msg.sender),
            "Sender is not game role deployer"
        );
        //check if msg sender is same as game deployer
        require(
            games[_gameId].gameDeployer.wallet == msg.sender,
            "Sender is not game deployer"
        );
        //check if the game exists
        require(games[_gameId].gameStatus == true, "Game does not exist");
        //get the amount of tokens in the wallet
        uint256 amount = games[_gameId].gameDeployer.tokenAmount;
        //set the amount of tokens in the wallet to 0
        games[_gameId].gameDeployer.tokenAmount = 0;
        //send the tokens to the wallet
        IERC20(games[_gameId].tokenContract).transfer(msg.sender, amount);
    }
}