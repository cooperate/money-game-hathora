import { InternalPlayerInfo } from "../models/player";

export class LowestUniqueBidPlayer extends InternalPlayerInfo {
    public winningsPerRound: number[] = [];
    public medallionsPerRound: number[] = [];
    public chosenPaddle: number | undefined;
    public lockPaddle = false;

    constructor(id: string, money: number, medallions: number) {
        super(id);
        this.money = money;
        this.medallions = medallions;
    }

    getRoundsWon(): boolean[] {
        return this.winningsPerRound.map((winnings) => winnings > 0);
    }

    resetValues(): void {
        this.chosenPaddle = undefined;
        this.lockPaddle = false;
    }
}

type RevealPaddle = {
    playerId: string;
    paddle: number;
};

export class InternalLowestUniqueBid {
    public round = 0;
    public maxRounds: number;
    public multiplierPerRound: number[] = [];
    public medallionsPerRound: number[] = [];
    public players: LowestUniqueBidPlayer[] = [];
    public revealedPaddles: RevealPaddle[] = [];
    public maxPaddle: number;
    public minPaddle = 1;
    constructor(
        public _players: InternalPlayerInfo[],
        public _multiplierPerRound: number[],
        public _medallionsPerRound: number[],
    ) {
        this.maxRounds = _multiplierPerRound.length;
        this.setMultiplierPerRound(_multiplierPerRound);
        this.setMedallionsPerRound(_medallionsPerRound);
        this.players = this.createLowestUniqueBidPlayers(_players);
        this.maxPaddle = this.players.length;
    }

    setMultiplierPerRound(multiplierPerRound: number[]): void {
        if (multiplierPerRound.length !== this.maxRounds) {
            throw new Error("Invalid number of pots per round");
        }
        this.multiplierPerRound = multiplierPerRound;
    }

    setMedallionsPerRound(medallionsPerRound: number[]): void {
        if (medallionsPerRound.length !== this.maxRounds) {
            throw new Error("Invalid number of medallions per round");
        }
        this.medallionsPerRound = medallionsPerRound;
    }

    createLowestUniqueBidPlayers(players: InternalPlayerInfo[]): LowestUniqueBidPlayer[] {
        return players.map((player) => new LowestUniqueBidPlayer(player.id, player.money, player.medallions));
    }

    getLowestUniqueBidPlayerById(playerId: string): LowestUniqueBidPlayer {
        const player = this.players.find((player) => player.id === playerId);
        if (!player) {
            throw new Error("Player not found");
        }
        return player;
    }

    advanceRound(): void {
        if (this.round === this.maxRounds) {
            throw new Error("Maximum number of rounds reached");
        }
        //iterate over players and reset values
        this.players.forEach((player) => player.resetValues());
        //clear revealed paddles (TODO: perhaps keep this in history)
        this.revealedPaddles = [];
        this.round++;
    }

    choosePaddle(playerId: string, paddle: number): void {
        const player = this.players.find((player) => player.id === playerId);
        if (!player) {
            throw new Error("Player not found");
        }
        if (player.lockPaddle) {
            throw new Error("Player has already locked paddle");
        }
        player.chosenPaddle = paddle;
    }

    lockPaddle(playerId: string): void {
        const player = this.players.find((player) => player.id === playerId);
        if (!player) {
            throw new Error("Player not found");
        }
        if (player.lockPaddle) {
            throw new Error("Player has already locked paddle");
        }
        player.lockPaddle = true;
    }

    revealPaddles(): void {
        const paddles = this.players.map((player) => {
            if (player.chosenPaddle === undefined) {
                throw new Error("Player has not chosen paddle");
            }
            return { playerId: player.id, paddle: player.chosenPaddle };
        });
        this.revealedPaddles = paddles;
    }

    determineWinner(): LowestUniqueBidPlayer {
        //the winner is the player who has the lowest paddle not chosen by any other player
        const chosenPaddles = this.revealedPaddles.map((paddle) => paddle.paddle);
        const uniquePaddles = [...new Set(chosenPaddles)];
        const lowestUniquePaddle = Math.min(...uniquePaddles);
        const winner = this.revealedPaddles.find((paddle) => paddle.paddle === lowestUniquePaddle);
        if (!winner) {
            throw new Error("Winner not found");
        }
        const winningPlayer = this.players.find((player) => player.id === winner.playerId)!;
        //set winnings for this round
        winningPlayer.winningsPerRound[this.round] = this.multiplierPerRound[this.round] * winner.paddle;
        //set winnings for all other players
        this.players.forEach((player) => {
            if (player.id !== winner.playerId) {
                player.winningsPerRound[this.round] = 0;
            }
        });
        //award the winner the medallions for the current round
        winningPlayer.medallionsPerRound.push(this.medallionsPerRound[this.round]);
        //every other player gets zero
        this.players.forEach((player) => {
            if (player.id !== winningPlayer.id) {
                player.medallionsPerRound.push(0);
            }
        });
        return winningPlayer;
    }
}