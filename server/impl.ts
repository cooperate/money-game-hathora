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
  HathoraEventTypes
} from "../api/types";
import { Card, Cards, createDeck, drawCardsFromDeck, findHighestHands } from "@pairjacks/poker-cards";
import { InternalPlayerInfo } from "./models/player";
import { InternalPrizeDraw } from "./game-modules/prize-draw";
import { InternalLowestUniqueBid } from "./game-modules/lowest-unique-bid";
import { InternalMagicMoneyMachine } from "./game-modules/magic-money-machine";
import { InternalPickAPrize, Prize } from "./game-modules/pick-a-prize";

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
      pickAPrizeGame: undefined
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

    return Response.ok();
  }
  startRound(state: InternalState, userId: UserId, ctx: Context): Response {
    state.roundStatus = RoundStatus.ACTIVE;
    state.players.forEach((player) => {
      player.status = PlayerStatus.WAITING;
    });
    this.selectARandomGameModule(state);
    return Response.ok();
  }

  selectARandomGameModule(state: InternalState): void {
    //create an array of all GameModule types
    const gameModules: GameModule[] = ['prize-draw', 'lowest-unique-bid', 'magic-money-machine', 'pick-a-prize'];
    //select a random game module
    const randomGameModule = gameModules[Math.floor(Math.random() * gameModules.length)];
    switch(randomGameModule) {
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
  }
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
    const prizeDrawPlayer = state.prizeDrawGame?.getPrizeDrawPlayer(userId);
    if (prizeDrawPlayer === undefined) {
      return Response.error('Player is not in the current prize draw game');
    }
    state.prizeDrawGame?.lockTickets(prizeDrawPlayer);

    //if all players have locked their tickets, send an event that all players have locked their tickets
    if (state.prizeDrawGame?.players.every((player) => player.lockTickets)) {
      ctx.broadcastEvent(HathoraEventTypes.prizeDrawPlayersLocked, 'All Players Have Locked In Selections, Determining Winner');
      //determine the winner
      const winner = state.prizeDrawGame?.determineWinner();
      if (winner === undefined) {
        return Response.error('Could not determine winner');
      }
      //delegate winnings
      this.transferMoneyFromBankToPlayer(state, winner.id, winner.winningsPerRound[state.prizeDrawGame?.round || 0]);
      this.transferMedallionsToPlayer(state, winner.id, state.prizeDrawGame?.medallionsPerRound[state.prizeDrawGame?.round || 0]);
      //send an event that the winner has been determined
      ctx.broadcastEvent(HathoraEventTypes.prizeDrawPlayerWinnerDeclared, `Winner has been determined for the round: ${winner.id}`);
      //start the next round
      ctx.broadcastEvent(HathoraEventTypes.prizeDrawNextRoundStarting, 'Starting Next Round');
      state.prizeDrawGame?.advanceRound();
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