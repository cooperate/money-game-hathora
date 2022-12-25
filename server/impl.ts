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
  ILockPrizeSelectionRequest,
  LowestUniqueBidder,
  Prize,
  PrizeType,
  PickAPrize,
  MagicMoneyMachine
} from "../api/types";
import { Card, Cards, createDeck, drawCardsFromDeck, findHighestHands } from "@pairjacks/poker-cards";
import { InternalPlayerInfo } from "./models/player";
import { InternalPrizeDraw } from "./game-modules/prize-draw";
import { InternalLowestUniqueBid, LowestUniqueBidPlayer } from "./game-modules/lowest-unique-bid";
import { InternalMagicMoneyMachine, MagicMoneyMachinePlayer } from "./game-modules/magic-money-machine";
import { InternalPickAPrize, PickAPrizePlayer, InternalPrize, InternalPrizeType } from "./game-modules/pick-a-prize";

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
  gamesPlayed: GameModule[];
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
      gameStatus: 'waiting',
      gamesPlayed: []
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
    this.internalStartRound(state, ctx);
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
    //add the last game to the games played array
    if (state.currentRoundGameModule) {
      state.gamesPlayed.push(state.currentRoundGameModule);
    }
    state.roundStatus = RoundStatus.ACTIVE;
    this.selectARandomGameModule(state, ctx);
  }

  selectARandomGameModule(state: InternalState, ctx: Context): void {
    //create an array of all GameModule types
    let gameModules: GameModule[] = ['prize-draw', 'lowest-unique-bid', 'magic-money-machine', 'pick-a-prize'];
    //check state.gamesPlayed to see if any game modules have been played
    if (state.gamesPlayed.length > 0) {
      //if so, remove the game modules that have been played from the gameModules array
      state.gamesPlayed.forEach((gameModule) => {
        const index = gameModules.indexOf(gameModule);
        if (index > -1) {
          gameModules.splice(index, 1);
        }
      });
    }
    //select a random game module from the gameModules array
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
  /****
   * MAP TO USER STATE
   */
  //mapping internal server state to player state
  getUserState(state: InternalState, userId: UserId): PlayerState {
    return {
      self: state.players.find((player) => player.id === userId),
      players: state.players.map((player) => player),
      roundStatus: state.roundStatus,
      activePlayer: state.players.length > 0 ? state.players[state.activePlayerIdx].id : undefined,
      bank: state.bank,
      prizeDraw: this.mapPrizeDraw(state.prizeDrawGame, userId),
      lowestUniqueBidder: this.mapLowestUniqueBid(state.lowestUniqueBidGame, userId),
      pickAPrize: this.mapPickAPrize(state.pickAPrizeGame, userId),
      magicMoneyMachine: this.mapMagicMoneyMachine(state.magicMoneyMachineGame, userId),
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
  mapMagicMoneyMachine(magicMoneyMachine: InternalMagicMoneyMachine | undefined, userId: string): MagicMoneyMachine | undefined {
    if (magicMoneyMachine === undefined) {
      return undefined;
    }
    const selfMagicMoneyMachinePlayer = magicMoneyMachine.getMagicMoneyMachinePlayerById(userId);
    return {
      players: magicMoneyMachine.players.map((player) => ({
        id: player.id,
        lockedMoney: player.lockedMoney,
      })),
      round: magicMoneyMachine.round,
      interestPerRound: magicMoneyMachine.interestPerRound,
      totalInterestPerRound: magicMoneyMachine.totalInterestPerRound,
      totalPayoutPerRound: magicMoneyMachine.totalPayoutPerRound,
      moneyInHand: selfMagicMoneyMachinePlayer?.moneyInHand,
      moneyInBox: selfMagicMoneyMachinePlayer?.moneyInBox,
      lockedMoney: selfMagicMoneyMachinePlayer?.lockedMoney,
      winningsPerRound: selfMagicMoneyMachinePlayer?.winningsPerRound,
    };
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
      minTickets: prizeDraw.minTicketNumber,
      maxTickets: prizeDraw.maxTicketNumber,
      round: prizeDraw.round,
      potsPerRound: prizeDraw.potsPerRound,
      medallionsPerRound: prizeDraw.medallionsPerRound,
      ticketsEntered: selfPrizeDrawPlayer?.tickets,
      ticketsLocked: selfPrizeDrawPlayer?.lockTickets,
      winningsPerRound: selfPrizeDrawPlayer?.winningsPerRound,
      medallionsWonPerRound: selfPrizeDrawPlayer?.medallionsPerRound,
    };
  }

  mapLowestUniqueBid(lowestUniqueBid: InternalLowestUniqueBid | undefined, userId: string): LowestUniqueBidder | undefined {
    if (lowestUniqueBid === undefined) {
      return undefined;
    }
    const selfLowestUniqueBidPlayer = lowestUniqueBid.getLowestUniqueBidPlayerById(userId);
    return {
      players: lowestUniqueBid.players.map((player) => ({
        id: player.id,
        winningsPerRound: player.winningsPerRound,
        medallionsPerRound: player.medallionsPerRound,
        lockPaddle: player.lockPaddle,
      })),
      round: lowestUniqueBid.round,
      multipliersPerRound: lowestUniqueBid.multiplierPerRound,
      medallionsPerRound: lowestUniqueBid.medallionsPerRound,
      revealedPaddles: lowestUniqueBid.revealedPaddles,
      paddlesToChooseFrom: lowestUniqueBid.paddlesToChooseFrom,
      chosenPaddle: selfLowestUniqueBidPlayer?.chosenPaddle,
      lockedPaddle: selfLowestUniqueBidPlayer.lockPaddle,
    }
  }
  mapPickAPrize(pickAPrize: InternalPickAPrize | undefined, userId: string): PickAPrize | undefined {
    if (pickAPrize === undefined) {
      return undefined;
    }
    const selfPickAPrizePlayer = pickAPrize.getPickAPrizePlayerById(userId);
    return {
      players: pickAPrize.players.map((player) => ({
        id: player.id,
        winningsPerRound: player.winningsPerRound,
        medallionsPerRound: player.medallionsPerRound,
        lockPrizeSelection: player.lockPrizeSelection,
      })),
      round: pickAPrize.round,
      prizesPerRound: this.mapPrizesPerRound(pickAPrize.prizesPerRound),
      bonusPrizePerRound: pickAPrize.bonusPrizePerRound,
      chosenPrize: selfPickAPrizePlayer?.chosenPrize,
      lockPrizeSelection: selfPickAPrizePlayer?.lockPrizeSelection,
    }
  }
  mapInternalPrizeTypeToPrizeType(prizeType: InternalPrizeType): PrizeType {
    switch (prizeType) {
      case 'money':
        return PrizeType.MONEY;
      case 'medallions':
        return PrizeType.MEDALLION;
    }
  }
  mapPrizesPerRound(prizesPerRound: InternalPrize[][]): Prize[][] {
    return prizesPerRound.map((prizesForRound: InternalPrize[]): Prize[] => 
      prizesForRound.map((prize: InternalPrize) => ({
        prizeType: this.mapInternalPrizeTypeToPrizeType(prize.prizeType),
        amount: prize.amount,
      })
    ));
  }
  /*********
   * MONEY TRANSFER
   */
  transferMoneyFromBankToPlayer(state: InternalState, userId: UserId, amount: number, ctx: Context): void {
    //check if bank has enough money
    if (state.bank < amount) {
      throw new Error("Bank does not have enough money");
    }
    state.players.find((player) => player.id === userId)!.money += amount;
    state.bank -= amount;

    ctx.sendEvent(HathoraEventTypes.moneyTransfer, `You were just transfered $${amount}!`, userId);
  }
  transferMedallionsToPlayer(state: InternalState, userId: UserId, amount: number, ctx: Context): void {
    //check if there are enough medallions left
    if (state.medallionsAvailable < amount) {
      throw new Error("Not enough medallions left");
    }
    state.players.find((player) => player.id === userId)!.medallions += amount;
    state.medallionsAvailable -= amount;

    ctx.sendEvent(HathoraEventTypes.medallionTransfer, `You were just transfered ${amount} medallion!`, userId);
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
    let prizeDrawPlayer;
    try {
      prizeDrawPlayer = state.prizeDrawGame?.getPrizeDrawPlayer(userId);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not get prize draw player');
    }
    if (prizeDrawPlayer === undefined) {
      return Response.error('Player is not in the current prize draw game');
    }
    try {
      state.prizeDrawGame?.enterTicketsAmount(prizeDrawPlayer, request.tickets);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not enter tickets amount');
    }
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
    } catch (e: any) {
      return Response.error(e?.message || 'Could not get prize draw player');
    }
    if (prizeDrawPlayer === undefined) {
      return Response.error('Player is not in the current prize draw game');
    }
    try {
      state.prizeDrawGame?.lockTickets(prizeDrawPlayer);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not lock tickets');
    }
    //if all players have locked their tickets, send an event that all players have locked their tickets
    if (state.prizeDrawGame?.players.every((player) => player.lockTickets)) {
      ctx.broadcastEvent(HathoraEventTypes.prizeDrawPlayersLocked, 'All Players Have Locked In Selections, Determining Winner');
      //determine the winner
      let winner;
      try { 
        winner = state.prizeDrawGame?.determineWinner();
      } catch (e: any) {
        return Response.error(e?.message || 'Could not determine winner');
      }
      if (winner === undefined) {
        return Response.error('Could not determine winner');
      }
      //delegate winnings
      try {
        this.transferMoneyFromBankToPlayer(state, winner.id, winner.winningsPerRound[state.prizeDrawGame?.round || 0], ctx);
      } catch (e: any) {
        return Response.error(e?.message || 'Could not delegate winnings');
      }
      try {
        this.transferMedallionsToPlayer(state, winner.id, state.prizeDrawGame?.medallionsPerRound[state.prizeDrawGame?.round || 0], ctx);
      } catch (e: any) {
        return Response.error(e?.message || 'Could not delegate medallions');
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
        } catch (e: any) {
          return Response.error(e?.message || 'Could not advance round');
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
    } catch (e: any) {
      return Response.error(e?.message || e);
    }
    if (lowestUniqueBidPlayer === undefined) {
      return Response.error('Player is not in the lowest-unique-bid game');
    }
    try {
      state.lowestUniqueBidGame?.choosePaddle(userId, request.paddleNumber);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not choose paddle');
    }
    return Response.ok();
  }

  lockPaddle(state: InternalState, userId: string, ctx: Context, request: ILockPaddleRequest): Response {
    if (state.currentRoundGameModule !== 'lowest-unique-bid') {
      return Response.error('Current round is not lowest-unique-bid');
    }
    let lowestUniqueBidPlayer;
    try {
      lowestUniqueBidPlayer = state.lowestUniqueBidGame?.getLowestUniqueBidPlayerById(userId);
    } catch (e: any) {
      return Response.error(e?.message || e);
    }
    if (lowestUniqueBidPlayer === undefined) {
      return Response.error('Player is not in the lowest-unique-bid game');
    }
    try {
      state.lowestUniqueBidGame?.lockPaddle(userId);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not lock paddle');
    }
    //if all players have locked, determine the winner
    if (state.lowestUniqueBidGame?.players.every((player) => player.lockPaddle)) {
      ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidPlayersLocked, 'All Players Have Locked In Selections, Determining Winner');
      //reveal the paddles
      ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidRevealPaddles, 'Revealing Paddles');
      state.lowestUniqueBidGame?.revealPaddles();
      //determine the winner
      let winner;
      try {
        winner = state.lowestUniqueBidGame?.determineWinner();
      } catch (e: any) {
        return Response.error(e?.message || 'Could not determine winner');
      }
      //In this game there is a possibility of their being no winner
      if(winner) {
        //delegate winnings
        try {
          this.transferMoneyFromBankToPlayer(state, winner.id, winner.winningsPerRound[state.lowestUniqueBidGame?.round || 0], ctx);
        } catch (e: any) {
          return Response.error(e?.message || 'Could not transfer money to winner');
        }
        try {
          this.transferMedallionsToPlayer(state, winner.id, state.lowestUniqueBidGame?.medallionsPerRound[state.lowestUniqueBidGame?.round || 0], ctx);
        } catch (e: any) {
          return Response.error(e?.message || 'Could not transfer medallions to winner');
        }
        //send an event that the winner has been determined
        ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidPlayerWinnerDeclared, `Winner has been determined for the round: ${winner?.id}`);
      } else {
        ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidPlayerWinnerDeclared, 'No winners this round!');
      }
      //start the next round
      ctx.broadcastEvent(HathoraEventTypes.lowestUniqueBidNextRoundStarting, 'Starting Next Round');
      if ((state.lowestUniqueBidGame.maxRounds - 1) === state.lowestUniqueBidGame.round) {
        //start a new money game round with a new game module
        this.internalStartRound(state, ctx);
      } else {
        try {
          state.lowestUniqueBidGame?.advanceRound();
        } catch (e: any) {
          return Response.error(e?.message || 'Could not advance round');
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
    } catch (e: any) {
      return Response.error(e?.message || 'Could not put money in box');
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
    } catch (e: any) {
      return Response.error(e?.message || 'Could not remove money from box');
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
    } catch (e: any) {
      return Response.error(e?.message || 'Could not lock money');
    }
    //if all players have locked, payout the players
    if (state.magicMoneyMachineGame?.players.every((player) => player.lockedMoney)) {
      ctx.broadcastEvent(HathoraEventTypes.magicMoneyMachinePlayersLocked, 'All Players Have Locked In Selections, Payout Players');
      //payout players
      try {
        state.magicMoneyMachineGame?.payOutPlayersAtEndOfRound();
      } catch (e: any) {
        return Response.error(e?.message || 'Could not payout players');
      }
      //determine if we need to advance the round or start a new game module
      if ((state.magicMoneyMachineGame.getMaxRounds() - 1) === state.magicMoneyMachineGame.round) {
        //pay out the players from the bank given their earnings from the game
        state.magicMoneyMachineGame.players.forEach((player) => {
          try {
            this.transferMoneyFromBankToPlayer(state, player.id, player.moneyInHand, ctx);
          } catch (e: any) {
            return Response.error(e?.message || 'Could not transfer money in hand to player');
          }
          try {
            this.transferMoneyFromBankToPlayer(state, player.id, player.moneyInBox, ctx);
          } catch (e: any) {
            return Response.error(e?.message || 'Could not transfer money in box to player');
          }
        });
        //determine winner and award medallions
        let winner;
        try {
          winner = state.magicMoneyMachineGame.determineWinner();
        } catch (e: any) {
          return Response.error(e?.message || 'Could not determine winner');
        }
        if (winner === undefined) {
          return Response.error('Could not determine winner');
        }
        try {
          this.transferMedallionsToPlayer(state, winner.id, 2, ctx);
        } catch (e: any) {
          return Response.error(e?.message || 'Could not transfer medallions to winner');
        }
        //start a new money game round with a new game module
        this.internalStartRound(state, ctx);
      } else {
        try {
          state.magicMoneyMachineGame?.advanceRound();
        } catch (e: any) {
          return Response.error(e?.message || 'Could not advance round');
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
    let pickAPrizePlayer: PickAPrizePlayer | undefined;
    try {
      pickAPrizePlayer = state.pickAPrizeGame?.getPickAPrizePlayerById(userId);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not get pick-a-prize player');
    }
    if (pickAPrizePlayer === undefined) {
      return Response.error('Player is not in the pick-a-prize game');
    }
    try {
      state.pickAPrizeGame?.selectAPrize(request.prizeNumber, pickAPrizePlayer);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not select a prize');
    }
    return Response.ok();
  }
  lockPrizeSelection(state: InternalState, userId: string, ctx: Context, request: ILockPrizeSelectionRequest): Response {
    if (state.currentRoundGameModule !== 'pick-a-prize') {
      return Response.error('Current round is not pick-a-prize');
    }
    let pickAPrizePlayer: PickAPrizePlayer | undefined;
    try {
      pickAPrizePlayer = state.pickAPrizeGame?.getPickAPrizePlayerById(userId);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not get pick-a-prize player');
    }
    if (pickAPrizePlayer === undefined) {
      return Response.error('Player is not in the pick-a-prize game');
    }
    try {
     state.pickAPrizeGame?.lockPrizeSelection(pickAPrizePlayer);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not lock prize selection');
    }
    //if all players have locked, payout the players
    if (state.pickAPrizeGame?.players.every((player) => player.lockPrizeSelection)) {
      ctx.broadcastEvent(HathoraEventTypes.pickAPrizePlayersLocked, 'All Players Have Locked In Selections, Payout Players');
      //payout players
      try {
        state.pickAPrizeGame?.awardPrizesForRound();
      } catch (e: any) {
        return Response.error(e?.message || 'Could not award prizes for round');
      }
      //pay out winnings per round
      state.pickAPrizeGame.players.forEach((player) => {
        try {
          this.transferMoneyFromBankToPlayer(state, player.id, player.winningsPerRound[state.pickAPrizeGame?.round || 0], ctx);
        } catch (e: any) {
          return Response.error(e?.message || 'Could not transfer money to player');
        }
        try {
          this.transferMedallionsToPlayer(state, player.id, player.medallionsPerRound[state.pickAPrizeGame?.round || 0], ctx);
        } catch (e: any) {
          return Response.error(e?.message || 'Could not transfer medallions to player');
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
          return Response.error(e?.message || 'Could not advance round');
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
] as InternalPrize[];

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
] as InternalPrize[];

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
] as InternalPrize[];