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
  MagicMoneyMachine,
  ILockTradingRequest,
  MedallionVoteDecisionPlayer,
  MedallionVoteVotePlayer,
  PlayerBox,
  ILockDecisionRequest,
  IPutMoneyInBoxDecisionRequest,
  IRemoveMoneyFromBoxDecisionRequest,
  ISubmitVoteRequest,
  ILockVoteRequest
} from "../api/types";
import { InternalPlayerInfo } from "./models/player";
import { InternalPrizeDraw, PrizeDrawPlayer } from "./game-modules/prize-draw";
import { InternalLowestUniqueBid, LowestUniqueBidPlayer } from "./game-modules/lowest-unique-bid";
import { InternalMagicMoneyMachine, MagicMoneyMachinePlayer } from "./game-modules/magic-money-machine";
import { InternalPickAPrize, PickAPrizePlayer, InternalPrize, InternalPrizeType } from "./game-modules/pick-a-prize";
import { InternalMedallionMajorityVote, InternalPlayerBox } from "./game-modules/medallion-majority-vote";

const TOTAL_TURNS = 4;

export type ServerError = string;
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
  medallionMajorityVote: InternalMedallionMajorityVote | undefined;
  turnNumber: number;
  gameStatus: GameStatus;
  gamesPlayed: GameModule[];
};

type GameModule = 'prize-draw' | 'lowest-unique-bid' | 'magic-money-machine' | 'pick-a-prize' | 'medallion-majority-vote' | 'trading';
const DEFAULT_ROUNDS = 3;
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
      medallionMajorityVote: undefined,
      turnNumber: 0,
      gameStatus: 'waiting',
      gamesPlayed: [],
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
    //start trading round
    this.startTradingRound(state, ctx);
  }

  startTradingRound(state: InternalState, ctx: Context) {
    //iterate through players and unlock trading
    state.players.forEach((player: PlayerInfo) => {
      player.lockedTrade = false;
    });
    state.currentRoundGameModule = 'trading';

    ctx.broadcastEvent(HathoraEventTypes.startTradingRound, `Trading Round Started`);
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
        state.pickAPrizeGame = new InternalPickAPrize(state.players, generatePrizes(state.players.length, 2000, 3));
        state.currentRoundGameModule = 'pick-a-prize';
        break;
      case 'medallion-majority-vote':
        //check which player has the most medallions
        const playerWithMostMedallions = state.players.reduce((prev, current) => (prev.medallions > current.medallions ? prev : current));
        //get all the other players
        const votePlayers = state.players.filter((player) => player.id !== playerWithMostMedallions.id);
        state.medallionMajorityVote = new InternalMedallionMajorityVote(votePlayers, playerWithMostMedallions, 3, state.bank);
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
      players: this.mapToPlayerInfo(state.players),
      roundStatus: state.roundStatus,
      activePlayer: state.players.length > 0 ? state.players[state.activePlayerIdx].id : undefined,
      bank: state.bank,
      prizeDraw: this.mapPrizeDraw(state.prizeDrawGame, userId),
      lowestUniqueBidder: this.mapLowestUniqueBid(state.lowestUniqueBidGame, userId),
      pickAPrize: this.mapPickAPrize(state.pickAPrizeGame, userId),
      magicMoneyMachine: this.mapMagicMoneyMachine(state.magicMoneyMachineGame, userId),
      currentGame: this.mapToRoundGameModule(state.currentRoundGameModule),
      turnNumber: state.turnNumber,
      ...this.mapMedallionVote(state.medallionMajorityVote, userId, state.players)
    };
  }
  /*******
   * MAPPERS
   */
  mapToPlayerInfo(players: InternalPlayerInfo[]): PlayerInfo[] {
    return players.map((player) => ({
      id: player.id,
      lockedTrade: player.lockedTrade,
    }));
  }
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
      case 'trading':
        return RoundGameModule.TRADING;
      default:
        return undefined;
    }
  }

  mapMedallionVote(medallionVote: InternalMedallionMajorityVote | undefined, userId: string, players: InternalPlayerInfo[]): MedallionVoteDecisionPlayer | MedallionVoteVotePlayer | undefined {
    if (medallionVote === undefined) {
      return undefined;
    }
    //check which player has the most medallions
    const playerWithMostMedallions = players.reduce((prev, current) => (prev.medallions > current.medallions) ? prev : current);
    //if the player with the most medallions is the current player, return the MedallionVoteDecisionPlayer
    if (playerWithMostMedallions.id === userId) {
      return {
        votePlayers: medallionVote.playersVoting.map((playerVoting) => ({
          id: playerVoting.id,
          lockedVote: playerVoting.lockVote,
          votesPerRound: playerVoting.votePerRound,
        })),
        round: medallionVote.round,
        moneyInBoxesPerRound: this.mapMoneyInBoxesPerRoundToPlayerBox(medallionVote?.decisionPlayer?.moneyinBoxesPerRound),
        moneyAllocation: medallionVote.moneyAllocation,
        lockedDecision: medallionVote?.decisionPlayer?.lockDeposit
      }
    } else //is a voting player
    {
      const selfVotePlayer = medallionVote.playersVoting.find((playerVoting) => playerVoting.id === userId);
      return {
        votePlayers: medallionVote.playersVoting.map((playerVoting) => ({
          id: playerVoting.id,
          lockedVote: playerVoting.lockVote
        })),
        decisionPlayer: {
          id: playerWithMostMedallions.id,
          lockDeposit: medallionVote?.decisionPlayer?.lockDeposit,
        },
        round: medallionVote.round,
        votesPerRound: selfVotePlayer?.votePerRound || [],
        moneyInBoxPerRound: selfVotePlayer?.moneyInBoxPerRound || [],
        lockedVote: selfVotePlayer?.lockVote || false
      }
    }
  }

  mapMoneyInBoxesPerRoundToPlayerBox(moneyInBoxesPerRound: InternalPlayerBox[][]): PlayerBox[][] {
    return moneyInBoxesPerRound.map((round) => round.map((playerBox) => ({
      id: playerBox.playerId,
      money: playerBox.moneyInBox
    }))
    );
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
    if (amount > 0) {
      ctx.sendEvent(HathoraEventTypes.moneyTransfer, `You were just transferred $${amount}!`, userId);
    }
  }
  transferMedallionsToPlayer(state: InternalState, userId: UserId, amount: number, ctx: Context): void {
    //check if there are enough medallions left
    if (state.medallionsAvailable < amount) {
      throw new Error("Not enough medallions left");
    }
    state.players.find((player) => player.id === userId)!.medallions += amount;
    state.medallionsAvailable -= amount;

    if (amount > 0) {
      ctx.sendEvent(HathoraEventTypes.medallionTransfer, `You were just transferred ${amount} medallion!`, userId);
    }
  }

  transferMoney(state: InternalState, userId: string, ctx: Context, request: ITransferMoneyRequest): Response {
    if (state.currentRoundGameModule !== 'trading') {
      return Response.error("Current round is not a trading round");
    }
    //check if player has enough money to send
    if (state.players.find((player) => player.id === userId)!.money < request.amount) {
      return Response.error("Player does not have enough money");
    }
    //send money
    state.players.find((player) => player.id === userId)!.money -= request.amount;
    state.players.find((player) => player.id === request.playerIdToSendTo)!.money += request.amount;
    if (request?.amount > 0) {
      ctx.sendEvent(HathoraEventTypes.moneyTransfer, `You were just transferred $${request?.amount}!`, request?.playerIdToSendTo);
    }
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
    let prizeDrawPlayer: PrizeDrawPlayer | undefined;
    try {
      prizeDrawPlayer = state.prizeDrawGame?.getPrizeDrawPlayer(userId);
    } catch (e: any) {
      return Response.error(e?.message || 'Could not get prize draw player');
    }

    if (prizeDrawPlayer === undefined) {
      return Response.error('Player is not in the current prize draw game');
    }
    const enterTickets = state.prizeDrawGame?.enterTicketsAmount(prizeDrawPlayer, request.tickets);
    if (typeof enterTickets === 'string') {
      return Response.error(enterTickets);
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

    const lockTickets = state.prizeDrawGame?.lockTickets(prizeDrawPlayer);
    if (typeof lockTickets === 'string') {
      return Response.error(lockTickets);
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
      if (winner != undefined) {
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
      }
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
    const choosePaddle = state.lowestUniqueBidGame?.choosePaddle(userId, request.paddleNumber);
    if (typeof choosePaddle === 'string') {
      return Response.error(choosePaddle);
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
    const lockedPaddle = state.lowestUniqueBidGame?.lockPaddle(userId);
    if (lockedPaddle !== undefined) {
      return Response.error('Could not lock paddle');
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
      if (winner) {
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
    const putMoneyInBox = state.magicMoneyMachineGame?.putMoneyInBox(request.amount, magicMoneyMachinePlayer);
    if (typeof putMoneyInBox === 'string') {
      return Response.error(putMoneyInBox);
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
    const removeMoneyFromBox = state.magicMoneyMachineGame?.removeMoneyFromBox(request.amount, magicMoneyMachinePlayer);
    if (typeof removeMoneyFromBox === 'string') {
      return Response.error(removeMoneyFromBox);
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

    const lockMoney = state.magicMoneyMachineGame?.lockMoney(magicMoneyMachinePlayer);
    if (typeof lockMoney === 'string') {
      return Response.error(lockMoney);
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
    const selectAPrize = state.pickAPrizeGame?.selectAPrize(request.prizeNumber, pickAPrizePlayer);
    if (typeof selectAPrize === 'string') {
      return Response.error(selectAPrize);
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
    const lockPrizeSelection = state.pickAPrizeGame?.lockPrizeSelection(pickAPrizePlayer);
    if (typeof lockPrizeSelection === 'string') {
      return Response.error(lockPrizeSelection);
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

  /********
   * Trading
   */
  lockTrading(state: InternalState, userId: string, ctx: Context, request: ILockTradingRequest): Response {
    if (state.currentRoundGameModule !== 'trading') {
      return Response.error('Current round is not pick-a-prize');
    }
    const player = state?.players?.find((player) => player.id === userId);
    player?.lockTrading();
    //check if all players locked trading
    if (state.players.every((player) => player.lockedTrade)) {
      ctx.broadcastEvent(HathoraEventTypes.tradingAllPlayersLocked, 'All Players Are Finished Trading, Next Game Starting');
      this.selectARandomGameModule(state, ctx);
    }
    return Response.ok();
  }

  /*******
   * Medallion Majority Vote
   */
  lockDecision(state: InternalState, userId: string, ctx: Context, request: ILockDecisionRequest): Response {
      return Response.ok();
  }
  putMoneyInBoxDecision(state: InternalState, userId: string, ctx: Context, request: IPutMoneyInBoxDecisionRequest): Response {
      return Response.ok();
  }
  removeMoneyFromBoxDecision(state: InternalState, userId: string, ctx: Context, request: IRemoveMoneyFromBoxDecisionRequest): Response {
      return Response.ok();
  }
  submitVote(state: InternalState, userId: string, ctx: Context, request: ISubmitVoteRequest): Response {
      return Response.ok();
  }
  lockVote(state: InternalState, userId: string, ctx: Context, request: ILockVoteRequest): Response {
      return Response.ok();
  }
}

function createPlayer(id: UserId): InternalPlayerInfo {
  return new InternalPlayerInfo(id);
}

function generatePrizes(playerCount: number, moneyForPrizes: number, totalMedallions: number) {
  const prizes: InternalPrize[][] = [];
  //given the playercount, each round should have an equivalent number of prizes as there are players
  const prizeCountPerRound = playerCount;
  //round 1 will have 15% of the moneyForPrizes, round 2 will have 30%, round 3 will have 45%
  const moneyForPrizesPerRound = [moneyForPrizes * 0.15, moneyForPrizes * 0.3, moneyForPrizes * 0.45];
  //given the playerCount, prizes should have weighted tiers
  const prizeTiersPerRound = (playerCount: number): number[][] => {
    switch (playerCount) {
      case 2:
        return [[0.3, 0.7], [0, 1], [0.1, 0.9]];
      case 3:
        return [[0.2, 0.3, 0.5], [0.1, 0.4, 0.5], [0, 0.3, 0.7]];
      case 4:
        return [[0.15, 0.25, 0.2, 0.4], [0.1, 0.2, 0.3, 0.4], [0.05, 0.15, 0.3, 0.5]];
      case 5:
        return [[0.1, 0.2, 0.2, 0.2, 0.3], [0.05, 0.15, 0.2, 0.3, 0.3], [0.05, 0.1, 0.2, 0.3, 0.35]];
      case 6:
        return [[0.1, 0.15, 0.15, 0.2, 0.2, 0.2], [0.05, 0.1, 0.15, 0.2, 0.25, 0.25], [0.05, 0.1, 0.15, 0.2, 0.25, 0.25]];
      case 7:
        return [[0.1, 0.1, 0.15, 0.15, 0.15, 0.2, 0.15], [0.05, 0.1, 0.1, 0.15, 0.15, 0.2, 0.2], [0.05, 0.1, 0.1, 0.15, 0.15, 0.2, 0.2]];
      case 8:
        return [[0.1, 0.1, 0.1, 0.1, 0.15, 0.15, 0.15, 0.15], [0.05, 0.1, 0.1, 0.1, 0.1, 0.15, 0.15, 0.2], [0.05, 0.1, 0.1, 0.1, 0.1, 0.15, 0.15, 0.2]];
      case 9:
        return [[0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], [0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], [0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]];
      case 10:
        return [[0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], [0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], [0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]];
      default:
        return []
    }
  }

  //each round will have no more than a single prize of medallions, which is subtracted from the total medallions
  //iterate through rounds
  for (let i = 0; i < DEFAULT_ROUNDS; i++) {
    let _prizes: InternalPrize[] = [];
    //iterate through prizeCountPerRound
    for (let j = 0; j < prizeCountPerRound; j++) {
      //if this is the last prize, make a 50/50 decision to add medallions or money
      if (i === prizeCountPerRound - 1) {
        if (Math.random() > 0.5) {
          const medallionCount = Math.floor(Math.random() * totalMedallions);
          //add medallions
          const prize: InternalPrize = {
            prizeType: 'medallions',
            amount: medallionCount
          };
          _prizes.push(prize);
          totalMedallions -= medallionCount;
        } else {
          //get the last tier from the prizeTiersPerRound
          const amount = prizeTiersPerRound(playerCount)[i][j] * moneyForPrizesPerRound[i];
          const prize: InternalPrize = {
            prizeType: 'money',
            amount
          };
          _prizes.push(prize);
        }
      } else {
        //get the last tier from the prizeTiersPerRound
        const amount = prizeTiersPerRound(playerCount)[i][j] * moneyForPrizesPerRound[i];
        const prize: InternalPrize = {
          prizeType: 'money',
          amount
        };
        _prizes.push(prize);
      }
    }
    prizes.push(_prizes);
  }
  return prizes;
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