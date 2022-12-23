import { Context, Methods } from "./.hathora/methods";
import { Response } from "../api/base";
import {
  IEnterTicketsAmountRequest,
  ILockTicketsRequest,
  IStartGameRequest,
  IStartRoundRequest,
  ITransferMoneyRequest,
  PlayerInfo,
  PlayerState,
  PlayerStatus,
  RoundStatus,
  UserId,
  PrizeDraw,
  RoundGameModule,
  HathoraEventTypes,
  IChoosePaddleRequest,
  ILockPaddleRequest,
  IPutMoneyInBoxRequest,
  IRemoveMoneyFromBoxRequest,
  ILockMoneyRequest,
  ISelectAPrizeRequest,
  ILockPrizeSelectionRequest
} from "../api/types";
import { Card, Cards, createDeck, drawCardsFromDeck, findHighestHands } from "@pairjacks/poker-cards";
import { InternalPlayerInfo } from "./models/player";
import { InternalPrizeDraw } from "./game-modules/prize-draw";
import { InternalLowestUniqueBid, LowestUniqueBidPlayer } from "./game-modules/lowest-unique-bid";
import { InternalMagicMoneyMachine, MagicMoneyMachinePlayer } from "./game-modules/magic-money-machine";
import { InternalPickAPrize, PickAPrizePlayer, Prize } from "./game-modules/pick-a-prize";

const TOTAL_TURNS = 4;
type GameStatus = 'waiting' | 'in-progress' | 'finished';
type InternalState = {
  players: InternalPlayerInfo[];
  activePlayerIdx: number;
  roundStatus: RoundStatus;
  currentRoundGameModule?: GameModule;
  bank: number;
  medallionsAvailable: number;
  prizeDrawGame: InternalPrizeDraw | undefined;
  lowestUniqueBidGame: InternalLowestUniqueBid | undefined;
  magicMoneyMachineGame: InternalMagicMoneyMachine | undefined;
  pickAPrizeGame: InternalPickAPrize | undefined;
  turnNumber: number;
  gameStatus: GameStatus;
};

type GameModule = 'prize-draw' | 'lowest-unique-bid' | 'magic-money-machine' | 'pick-a-prize';

export class Impl implements Methods<InternalState> {
  initialize(): InternalState {
    return {
      players: [],
      activePlayerIdx: 0,
      roundStatus: RoundStatus.WAITING,
      currentRoundGameModule: undefined,
      bank: 10000,
      medallionsAvailable: 10,
      prizeDrawGame: undefined,
      lowestUniqueBidGame: undefined,
      magicMoneyMachineGame: undefined,
      pickAPrizeGame: undefined,
      turnNumber: 0,
      gameStatus: 'waiting'
    };
  }
  joinGame(state: InternalState, userId: UserId): Response {
    if (state.players.find((player) => player.id === userId) !== undefined) {
      return Response.error("Already joined");
    }
    if (state.players.length >= 8) {
      return Response.error("Maximum player count reached");
    }
    state.players.push(createPlayer(userId));
    return Response.ok();
  }
  startGame(state: InternalState, userId: string, ctx: Context, request: IStartGameRequest): Response {
    if (state.players.length < 2) {
      return Response.error("At least 2 players required");
    }
    state.gameStatus = 'in-progress';
    return Response.ok();
  }
  startRound(state: InternalState, userId: UserId, ctx: Context): Response {
    state.roundStatus = RoundStatus.ACTIVE;
    state.players.forEach((player) => {
      player.status = PlayerStatus.WAITING;
    });
    this.selectARandomGameModule(state, ctx);
    return Response.ok();
  }

  internalStartRound(state: InternalState, ctx: Context) {
    //increase the turn number
    state.turnNumber++;
    //if the turn number is greater than the total number of turns, end the game
    if (state.turnNumber > TOTAL_TURNS) {
      ctx.broadcastEvent(HathoraEventTypes.gameEnded, `Game Ended`);
      state.gameStatus = 'finished';
      return;
    }
    state.roundStatus = RoundStatus.ACTIVE;
    this.selectARandomGameModule(state, ctx);
  }

  selectARandomGameModule(state: InternalState, ctx: Context): void {
    //create an array of all GameModule types
    const gameModules: GameModule[] = ['prize-draw', 'lowest-unique-bid', 'magic-money-machine', 'pick-a-prize'];
    //select a random game module
    const randomGameModule = gameModules[Math.floor(Math.random() * gameModules.length)];
    switch (randomGameModule) {
      case 'prize-draw':
        //create a prize draw game
        state.prizeDrawGame = new InternalPrizeDraw(state.players, [100, 200, 300], [1, 2, 3]);
        //set the round game module
        state.currentRoundGameModule = 'prize-draw';
        break;
      case 'lowest-unique-bid':
        state.lowestUniqueBidGame = new InternalLowestUniqueBid(state.players, [20, 50, 100], [0, 1, 2]);
        state.currentRoundGameModule = 'lowest-unique-bid';
        break;
      case 'magic-money-machine':
        state.magicMoneyMachineGame = new InternalMagicMoneyMachine(state.players, [0.2, 0.5, 1]);
        state.currentRoundGameModule = 'magic-money-machine';
        break;
      case 'pick-a-prize':
        state.pickAPrizeGame = new InternalPickAPrize(state.players, [PRIZE_ROUND_0, PRIZE_ROUND_1, PRIZE_ROUND_2]);
        state.currentRoundGameModule = 'pick-a-prize';
        break;
      default:
        return;
    }
    ctx.broadcastEvent(HathoraEventTypes.newRound, `New Game Round: ${randomGameModule}`);
  }
  //mapping internal server state to player state
  getUserState(state: InternalState, userId: UserId): PlayerState {
    return {
      players: state.players.map((player) => player),
      roundStatus: state.roundStatus,
      activePlayer: state.players.length > 0 ? state.players[state.activePlayerIdx].id : undefined,
      bank: state.bank,
      prizeDraw: this.mapPrizeDraw(state.prizeDrawGame, userId),
      currentGame: this.mapToRoundGameModule(state.currentRoundGameModule),
    };
  }
  /*******
   * MAPPERS
   */
  mapToRoundGameModule(gameModule: GameModule | undefined): RoundGameModule | undefined {
    if (gameModule === undefined) {
      return undefined;
    }
    switch (gameModule) {
      case 'prize-draw':
        return RoundGameModule.PRIZE_DRAW;
      case 'lowest-unique-bid':
        return RoundGameModule.LOWEST_UNIQUE_BID;
      case 'magic-money-machine':
        return RoundGameModule.MAGIC_MONEY_MACHINE;
      case 'pick-a-prize':
        return RoundGameModule.PICK_A_PRIZE;
      default:
        return undefined;
    }
  }
  mapPrizeDraw(prizeDraw: InternalPrizeDraw | undefined, userId: string): PrizeDraw | undefined {
    if (prizeDraw === undefined) {
      return undefined;
    }
    const selfPrizeDrawPlayer = prizeDraw.getPrizeDrawPlayer(userId);
    return {
      players: prizeDraw.players.map((player) => ({
        id: player.id,
        ticketsLocked: player?.lockTickets,
        roundsWon: player.getRoundsWon(),
      })),
      round: prizeDraw.round,
      potsPerRound: prizeDraw.potsPerRound,
      medallionsPerRound: prizeDraw.medallionsPerRound,
      ticketsEntered: selfPrizeDrawPlayer?.tickets,
      ticketsLocked: selfPrizeDrawPlayer?.lockTickets,
      winningsPerRound: selfPrizeDrawPlayer?.winningsPerRound
    };
  }
  /*********
   * MONEY TRANSFER
   */
  transferMoneyFromBankToPlayer(state: InternalState, userId: UserId, amount: number): void {
    //check if bank has enough money
    if (state.bank < amount) {
      throw new Error("Bank does not have enough money");
    }
    state.players.find((player) => player.id === userId)!.money += amount;
    state.bank -= amount;
  }
  transferMedallionsToPlayer(state: InternalState, userId: UserId, amount: number): void {
    //check if there are enough medallions left
    if (state.medallionsAvailable < amount) {
      throw new Error("Not enough medallions left");
    }
    state.players.find((player) => player.id === userId)!.medallions += amount;
    state.medallionsAvailable -= amount;
  }

  transferMoney(state: InternalState, userId: string, ctx: Context, request: ITransferMoneyRequest): Response {
    //check if player has enough money to send
    if (state.players.find((player) => player.id === userId)!.money < request.amount) {
      return Response.error("Player does not have enough money");
    }
    //send money
    state.players.find((player) => player.id === userId)!.money -= request.amount;
    state.players.find((player) => player.id === request.playerIdToSendTo)!.money += request.amount;
    return Response.ok();
  }
  /**********
   * Prize Draw
   * ********/
  enterTicketsAmount(state: InternalState, userId: UserId, ctx: Context, request: IEnterTicketsAmountRequest): Response {
    //check if the current round is a prize draw
    if (state.currentRoundGameModule !== 'prize-draw') {
      return Response.error('Current round is not a prize draw');
    }
    const prizeDrawPlayer = state.prizeDrawGame?.getPrizeDrawPlayer(userId);
    if (prizeDrawPlayer === undefined) {
      return Response.error('Player is not in the current prize draw game');
    }
    state.prizeDrawGame?.enterTicketsAmount(prizeDrawPlayer, request.tickets);
    return Response.ok();
  }
  lockTickets(state: InternalState, userId: string, ctx: Context, request: ILockTicketsRequest): Response {
    //check if the current round is a prize draw
    if (state.currentRoundGameModule !== 'prize-draw') {
      return Response.error('Current round is not a prize draw');
    }
    
    let prizeDrawPlayer;
    try {
      prizeDrawPlayer = state.prizeDrawGame?.getPrizeDrawPlayer(userId);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    if (prizeDrawPlayer === undefined) {
      return Response.error('Player is not in the current prize draw game');
    }
    try {
      state.prizeDrawGame?.lockTickets(prizeDrawPlayer);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    //if all players have locked their tickets, send an event that all players have locked their tickets
    if (state.prizeDrawGame?.players.every((player) => player.lockTickets)) {
      ctx.broadcastEvent(HathoraEventTypes.prizeDrawPlayersLocked, 'All Players Have Locked In Selections, Determining Winner');
      //determine the winner
      let winner;
      try { 
        winner = state.prizeDrawGame?.determineWinner();
      } catch (e) {
        return Response.error(JSON.stringify(e));
      }
      if (winner === undefined) {
        return Response.error('Could not determine winner');
      }
      //delegate winnings
      try {
        this.transferMoneyFromBankToPlayer(state, winner.id, winner.winningsPerRound[state.prizeDrawGame?.round || 0]);
        this.transferMedallionsToPlayer(state, winner.id, state.prizeDrawGame?.medallionsPerRound[state.prizeDrawGame?.round || 0]);
      } catch (e) {
        return Response.error(JSON.stringify(e));
      }
      //send an event that the winner has been determined
      ctx.broadcastEvent(HathoraEventTypes.prizeDrawPlayerWinnerDeclared, `Winner has been determined for the round: ${winner.id}`);
      //start the next round
      ctx.broadcastEvent(HathoraEventTypes.prizeDrawNextRoundStarting, 'Starting Next Round');
      if ((state.prizeDrawGame.maxRounds - 1) === state.prizeDrawGame.round) {
        //start a new money game round with a new game module
        this.internalStartRound(state, ctx);
      } else {
        try {
          state.prizeDrawGame?.advanceRound();
        } catch (e) {
          return Response.error(JSON.stringify(e));
        }
      }
    }
    return Response.ok();
  }
  /*****
   * Lowest Unique Bid
   */
  choosePaddle(state: InternalState, userId: UserId, ctx: Context, request: IChoosePaddleRequest): Response {
    if (state.currentRoundGameModule !== 'lowest-unique-bid') {
      return Response.error('Current round is not lowest-unique-bid');
    }
    let lowestUniqueBidPlayer;
    try {
      lowestUniqueBidPlayer = state.lowestUniqueBidGame?.getLowestUniqueBidPlayerById(userId);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    if (lowestUniqueBidPlayer === undefined) {
      return Response.error('Player is not in the lowest-unique-bid game');
    }
    state.lowestUniqueBidGame?.choosePaddle(userId, request.paddleNumber);
    return Response.ok();
  }

  lockPaddle(state: InternalState, userId: string, ctx: Context, request: ILockPaddleRequest): Response {
    if (state.currentRoundGameModule !== 'lowest-unique-bid') {
      return Response.error('Current round is not lowest-unique-bid');
    }
    let lowestUniqueBidPlayer;
    try {
      lowestUniqueBidPlayer = state.lowestUniqueBidGame?.getLowestUniqueBidPlayerById(userId);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    if (lowestUniqueBidPlayer === undefined) {
      return Response.error('Player is not in the lowest-unique-bid game');
    }
    try {
      state.lowestUniqueBidGame?.lockPaddle(userId);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    //if all players have locked, determine the winner
    if (state.lowestUniqueBidGame?.players.every((player) => player.lockPaddle)) {
      ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidPlayersLocked, 'All Players Have Locked In Selections, Determining Winner');
      //determine the winner
      let winner;
      try {
        winner = state.lowestUniqueBidGame?.determineWinner();
      } catch (e) {
        return Response.error(JSON.stringify(e));
      }
      if (winner === undefined) {
        return Response.error('Could not determine winner');
      }
      //delegate winnings
      try {
        this.transferMoneyFromBankToPlayer(state, winner.id, winner.winningsPerRound[state.lowestUniqueBidGame?.round || 0]);
      } catch (e: any) {
        return Response.error(JSON.stringify(e));
      }
      try {
        this.transferMedallionsToPlayer(state, winner.id, state.lowestUniqueBidGame?.medallionsPerRound[state.lowestUniqueBidGame?.round || 0]);
      } catch (e: any) {
        return Response.error(JSON.stringify(e));
      }
      //send an event that the winner has been determined
      ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidPlayerWinnerDeclared, `Winner has been determined for the round: ${winner.id}`);
      //start the next round
      ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidNextRoundStarting, 'Starting Next Round');
      if ((state.lowestUniqueBidGame.maxRounds - 1) === state.lowestUniqueBidGame.round) {
        //start a new money game round with a new game module
        this.internalStartRound(state, ctx);
      } else {
        try {
          state.lowestUniqueBidGame?.advanceRound();
        } catch (e: any) {
          return Response.error(JSON.stringify(e));
        }
      }
    }
    return Response.ok();
  }
  /********
   * Magic Money Machine
   */
  putMoneyInBox(state: InternalState, userId: string, ctx: Context, request: IPutMoneyInBoxRequest): Response {
    if (state.currentRoundGameModule !== 'magic-money-machine') {
      return Response.error('Current round is not magic-money-machine');
    }
    const magicMoneyMachinePlayer: MagicMoneyMachinePlayer | undefined = state.magicMoneyMachineGame?.getMagicMoneyMachinePlayerById(userId);
    if (magicMoneyMachinePlayer === undefined) {
      return Response.error('Player is not in the magic-money-machine game');
    }
    try {
      state.magicMoneyMachineGame?.putMoneyInBox(request.amount, magicMoneyMachinePlayer);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    return Response.ok();
  }
  removeMoneyFromBox(state: InternalState, userId: string, ctx: Context, request: IRemoveMoneyFromBoxRequest): Response {
    if (state.currentRoundGameModule !== 'magic-money-machine') {
      return Response.error('Current round is not magic-money-machine');
    }
    const magicMoneyMachinePlayer: MagicMoneyMachinePlayer | undefined = state.magicMoneyMachineGame?.getMagicMoneyMachinePlayerById(userId);
    if (magicMoneyMachinePlayer === undefined) {
      return Response.error('Player is not in the magic-money-machine game');
    }
    try {
     state.magicMoneyMachineGame?.removeMoneyFromBox(request.amount, magicMoneyMachinePlayer);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    return Response.ok();
  }
  lockMoney(state: InternalState, userId: string, ctx: Context, request: ILockMoneyRequest): Response {
    if (state.currentRoundGameModule !== 'magic-money-machine') {
      return Response.error('Current round is not magic-money-machine');
    }
    const magicMoneyMachinePlayer: MagicMoneyMachinePlayer | undefined = state.magicMoneyMachineGame?.getMagicMoneyMachinePlayerById(userId);
    if (magicMoneyMachinePlayer === undefined) {
      return Response.error('Player is not in the magic-money-machine game');
    }
    try {
     state.magicMoneyMachineGame?.lockMoney(magicMoneyMachinePlayer);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    //if all players have locked, payout the players
    if (state.magicMoneyMachineGame?.players.every((player) => player.lockedMoney)) {
      ctx.broadcastEvent(HathoraEventTypes.magicMoneyMachinePlayersLocked, 'All Players Have Locked In Selections, Payout Players');
      //payout players
      try {
        state.magicMoneyMachineGame?.payOutPlayersAtEndOfRound();
      } catch (e) {
        return Response.error(JSON.stringify(e));
      }
      //determine if we need to advance the round or start a new game module
      if ((state.magicMoneyMachineGame.getMaxRounds() - 1) === state.magicMoneyMachineGame.round) {
        //pay out the players from the bank given their earnings from the game
        state.magicMoneyMachineGame.players.forEach((player) => {
          try {
            this.transferMoneyFromBankToPlayer(state, player.id, player.moneyInHand);
            this.transferMoneyFromBankToPlayer(state, player.id, player.moneyInBox);
          } catch (e: any) {
            return Response.error(JSON.stringify(e));
          }
        });
        //determine winner and award medallions
        const winner = state.magicMoneyMachineGame.determineWinner();
        if (winner === undefined) {
          return Response.error('Could not determine winner');
        }
        try {
          this.transferMedallionsToPlayer(state, winner.id, 2);
        } catch (e: any) {
          return Response.error(JSON.stringify(e));
        }
        //start a new money game round with a new game module
        this.internalStartRound(state, ctx);
      } else {
        try {
          state.magicMoneyMachineGame?.advanceRound();
        } catch (e: any) {
          return Response.error(JSON.stringify(e));
        }
      }
    }
    return Response.ok();
  }
  /********
   * Pick a Prize
   */
  selectAPrize(state: InternalState, userId: string, ctx: Context, request: ISelectAPrizeRequest): Response {
    if (state.currentRoundGameModule !== 'pick-a-prize') {
      return Response.error('Current round is not pick-a-prize');
    }
    const pickAPrizePlayer: PickAPrizePlayer | undefined = state.pickAPrizeGame?.getPickAPrizePlayerById(userId);
    if (pickAPrizePlayer === undefined) {
      return Response.error('Player is not in the pick-a-prize game');
    }
    try {
      state.pickAPrizeGame?.selectAPrize(request.prizeNumber, pickAPrizePlayer);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    return Response.ok();
  }
  lockPrizeSelection(state: InternalState, userId: string, ctx: Context, request: ILockPrizeSelectionRequest): Response {
    if (state.currentRoundGameModule !== 'pick-a-prize') {
      return Response.error('Current round is not pick-a-prize');
    }
    const pickAPrizePlayer: PickAPrizePlayer | undefined = state.pickAPrizeGame?.getPickAPrizePlayerById(userId);
    if (pickAPrizePlayer === undefined) {
      return Response.error('Player is not in the pick-a-prize game');
    }
    try {
     state.pickAPrizeGame?.lockPrizeSelection(pickAPrizePlayer);
    } catch (e) {
      return Response.error(JSON.stringify(e));
    }
    //if all players have locked, payout the players
    if (state.pickAPrizeGame?.players.every((player) => player.lockPrizeSelection)) {
      ctx.broadcastEvent(HathoraEventTypes.pickAPrizePlayersLocked, 'All Players Have Locked In Selections, Payout Players');
      //payout players
      try {
        state.pickAPrizeGame?.awardPrizesForRound();
      } catch (e) {
        return Response.error(JSON.stringify(e));
      }
      //pay out winnings per round
      state.pickAPrizeGame.players.forEach((player) => {
        try {
          this.transferMoneyFromBankToPlayer(state, player.id, player.winningsPerRound[state.pickAPrizeGame?.round || 0]);
          this.transferMedallionsToPlayer(state, player.id, player.medallionsPerRound[state.pickAPrizeGame?.round || 0]);
        } catch (e: any) {
          return Response.error(JSON.stringify(e));
        }
      });
      //determine if we need to advance the round or start a new game module
      if ((state.pickAPrizeGame.getMaxRounds() - 1) === state.pickAPrizeGame.round) {
        //start a new money game round with a new game module
        this.internalStartRound(state, ctx);
      } else {
        try {
          state.pickAPrizeGame?.advanceRound();
        } catch (e: any) {
          return Response.error(JSON.stringify(e));
        }
      }
    }
    return Response.ok();
  }
}

function createPlayer(id: UserId): InternalPlayerInfo {
  return new InternalPlayerInfo(id);
}


const PRIZE_ROUND_0 = [
  {
    prizeType: 'money',
    amount: 20,
  },
  {
    prizeType: 'money',
    amount: 40,
  },
  {
    prizeType: 'money',
    amount: 60,
  },
  {
    prizeType: 'money',
    amount: 80,
  },
  {
    prizeType: 'money',
    amount: 100,
  }
] as Prize[];

const PRIZE_ROUND_1 = [
  {
    prizeType: 'money',
    amount: 0,
  },
  {
    prizeType: 'money',
    amount: 50,
  },
  {
    prizeType: 'money',
    amount: 50,
  },
  {
    prizeType: 'money',
    amount: 200,
  },
  {
    prizeType: 'medallions',
    amount: 2
  }
] as Prize[];

const PRIZE_ROUND_2 = [
  {
    prizeType: 'money',
    amount: 0,
  },
  {
    prizeType: 'money',
    amount: 0,
  },
  {
    prizeType: 'money',
    amount: 150,
  },
  {
    prizeType: 'money',
    amount: 150,
  },
  {
    prizeType: 'medallions',
    amount: 1
  }
] as Prize[];