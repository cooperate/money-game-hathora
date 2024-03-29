import { ServerError } from "../impl";
import { InternalPlayerInfo } from "../models/player";

export class MedallionMajorityVotePlayer extends InternalPlayerInfo {
    public votePerRound: boolean[] = [];
    public lockVote = false;
    public moneyInBoxPerRound: number[] = [];

    constructor(id: string, money: number, medallions: number) {
        super(id);
        this.money = money;
        this.medallions = medallions;
    }

    resetValues(): void {
        this.lockVote = false;
    }
}

export type InternalPlayerBox = {
    playerId: string;
    moneyInBox: number;
}

export class MedallionMajorityDecisionPlayer {
    public lockDeposit = false;
    public moneyInBoxesPerRound: InternalPlayerBox[][] = [];

    constructor(public id: string) {}

    resetValues(): void {
        this.lockDeposit = false;
    }
}

export type PhasingPlayer = 'MEDALLION_PLAYER' | 'VOTE_PLAYERS';

export class InternalMedallionMajorityVote {
    public round = 0;
    public maxRounds: number;
    public playersVoting: MedallionMajorityVotePlayer[] = [];
    public decisionPlayer: MedallionMajorityDecisionPlayer;
    public phasingPlayer: PhasingPlayer;
    public moneyAllocation: number;
    constructor(
        public _playersVoting: InternalPlayerInfo[],
        public _decisionPlayer: InternalPlayerInfo,
        public _maxRounds: number,
        public _bank: number
    ) {
        this.maxRounds = _maxRounds;
        this.playersVoting = this.createMedallionPlayers(_playersVoting);
        this.decisionPlayer = new MedallionMajorityDecisionPlayer(_decisionPlayer.id);
        this.phasingPlayer = 'MEDALLION_PLAYER';
        this.moneyAllocation = _bank;
    }

    createMedallionPlayers(players: InternalPlayerInfo[]): MedallionMajorityVotePlayer[] {
        return players.map((player) => new MedallionMajorityVotePlayer(player.id, player.money, player.medallions));
    }

    getMedallionMajorityVotePlayerById(playerId: string): MedallionMajorityVotePlayer {
        const player = this.playersVoting.find((player) => player.id === playerId);
        if (!player) {
            throw new Error("Player not found");
        }
        return player;
    }

    getMedallionMajorityVoteDecisionPlayer(): MedallionMajorityDecisionPlayer {
        return this.decisionPlayer;
    }

    advanceRound(): void | ServerError {
        if (this.round === (this.maxRounds -1)) {
            return "Maximum number of rounds reached. No deal reached!";
        }
        this.round++;
        //iterate over players and reset values
        this.playersVoting.forEach((player) => player.resetValues());
        //if moneyinBoxesPerRound does not exist for this round, create it
        if(!this.decisionPlayer.moneyInBoxesPerRound[this.round]) {
            this.decisionPlayer.moneyInBoxesPerRound[this.round] = [];
        }
        //iterate over decisionPlayer moneyinBoxesPerRound
        this.decisionPlayer.moneyInBoxesPerRound[this.round] = this.decisionPlayer.moneyInBoxesPerRound[this.round - 1];
        this.decisionPlayer.resetValues();
        //switch phasing players
        this.phasingPlayer = 'MEDALLION_PLAYER';
    }

    placeMoneyInPlayerBox(playerId: string, money: number): ServerError | undefined {
        const player = this.playersVoting.find((player) => player.id === playerId);
        if (!player) {
            throw new Error("Player not found");
        }
        //if already locked
        if(this.decisionPlayer.lockDeposit) {
            return "Already locked deposit.";
        }
        //if any votes are locked, return early
        if(this.playersVoting.some((player) => player.lockVote)) {
            return undefined;
        }
        //if phasing player is not the medallion player, return early
        if(this.phasingPlayer == 'VOTE_PLAYERS') {
            return undefined;
        }
        //if moneyAllocation is less than money, return early
        if(this.moneyAllocation < money) {
            return 'Not enough money in bank.';
        }
        //check if playerId already exists in moneyinBoxesPerRound
        const playerBox = this.decisionPlayer?.moneyInBoxesPerRound[this.round]?.find((playerBox) => playerBox.playerId === playerId);
        if(playerBox) {
            playerBox.moneyInBox += money;
        } else {
            //check if moneyinBoxesPerRound exists for this round
            if(!this.decisionPlayer.moneyInBoxesPerRound[this.round]) {
                this.decisionPlayer.moneyInBoxesPerRound[this.round] = [];
                this.decisionPlayer.moneyInBoxesPerRound[this.round]?.push({playerId: playerId, moneyInBox: money});
            } else {
                this.decisionPlayer.moneyInBoxesPerRound[this.round]?.push({playerId: playerId, moneyInBox: money});
            }
        }
        this.moneyAllocation -= money;
    }

    removeMoneyFromPlayerBox(playerId: string, money: number): ServerError | undefined {
        const player = this.playersVoting.find((player) => player.id === playerId);
        if (!player) {
            throw new Error("Player not found");
        }
        //if already locked
        if(this.decisionPlayer.lockDeposit) {
            return "Already locked deposit.";
        }
        //if any votes are locked, return early
        if(this.playersVoting.some((player) => player.lockVote)) {
            return undefined;
        }
        //if phasing player is not the medallion player, return early
        if(this.phasingPlayer == 'VOTE_PLAYERS') {
            return undefined;
        }
        //if playerid does not exist in moneyinBoxesPerRound, return early
        const playerBox = this.decisionPlayer?.moneyInBoxesPerRound[this.round]?.find((playerBox) => playerBox.playerId === playerId);
        if(!playerBox) {
            return 'Have not added money to box.';
        }
        //if playerBox.moneyInBox is less than money, return early
        if(playerBox.moneyInBox < money) {
            return 'Not enough money in box.';
        }
        playerBox.moneyInBox -= money;
        this.moneyAllocation += money;
    }

    lockDeposits(): void {
        this.decisionPlayer.lockDeposit = true;
        //switch phasing players
        this.phasingPlayer = 'VOTE_PLAYERS';
        //iterate over players and set moneyInBoxPerRound
        this.playersVoting.forEach((player) => {
            const playerBox = this.decisionPlayer?.moneyInBoxesPerRound[this.round]?.find((playerBox) => playerBox?.playerId === player.id);
            if(playerBox) {
                player.moneyInBoxPerRound[this.round] = playerBox.moneyInBox;
            } else {
                //if moneyInBoxPerRound is empty, create an entry for decision player
                if(!this.decisionPlayer?.moneyInBoxesPerRound[this.round]) {
                    this.decisionPlayer.moneyInBoxesPerRound[this.round] = [];
                }
                //this players moneyInBoxesPerRound hasn't been set, create an entry for decision player
                this.decisionPlayer.moneyInBoxesPerRound[this.round].push({playerId: player.id, moneyInBox: 0});
                player.moneyInBoxPerRound[this.round] = 0;
            }
        });
    }

    submitVote(playerId: string, vote: boolean): undefined | ServerError {
        const player = this.playersVoting.find((player) => player.id === playerId);
        if (!player) {
            return "Player not found";
        }
        if (player.lockVote) {
            return "Player has already locked vote";
        }
        player.votePerRound[this.round] = vote;
    }

    lockVote(playerId: string): ServerError | undefined {
        const player = this.playersVoting.find((player) => player.id === playerId);
        if (!player) {
            //throw new Error("Player not found");
            return "Player not found";
        }
        if(player.votePerRound[this.round] === undefined) {
            //throw new Error("Player has not chosen paddle");
            return "Player has not made a vote this round.";
        }
        if (player.lockVote) {
            //throw new Error("Player has already locked paddle");
            return "Player has already locked-in vote.";
        }
        player.lockVote = true;
        return undefined;
    }

    getVoteResultForRound(round: number): boolean {
        const playerCount = this.playersVoting.length;
        let yesCount = 0;
        //if the majority of players have accepted the deal, return true
        this.playersVoting.forEach((player) => {
            if(player.votePerRound[round] === undefined) {
                throw new Error("Player has not made a decision this round.");
            }
            if(player.votePerRound[round]) {
                yesCount++;
            }
        });
        return yesCount > Math.floor(playerCount / 2);
    }
}