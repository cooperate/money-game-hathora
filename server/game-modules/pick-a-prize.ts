import { InternalPlayerInfo } from "../models/player";

export class PickAPrizePlayer extends InternalPlayerInfo {
    public winningsPerRound: number[] = [];
    public medallionsPerRound: number[] = [];
    public chosenPrize: number | undefined;
    public lockPrizeSelection = false;

    constructor(id: string, money: number, medallions: number) {
        super(id);
        this.money = money;
        this.medallions = medallions;
    }

    resetValues(): void {
        this.chosenPrize = undefined;
        this.lockPrizeSelection = false;
    }
}

export type InternalPrizeType = "money" | "medallions";
export type InternalPrize = {
    prizeType: InternalPrizeType,
    amount: number,
}

export class InternalPickAPrize {
    public round = 0;
    public players: PickAPrizePlayer[];
    public prizesPerRound: InternalPrize[][];
    public bonusPrizePerRound: boolean[];
    constructor(
        public _players: InternalPlayerInfo[],
        public _prizesPerRound: InternalPrize[][],
    ) {
        this.players = this.createPickAPrizePlayers(_players);
        this.prizesPerRound = _prizesPerRound;
        this.bonusPrizePerRound = this.prizesPerRound.map((prizes) => true);
    }

    createPickAPrizePlayers(players: InternalPlayerInfo[]): PickAPrizePlayer[] {
        return players.map((player) => new PickAPrizePlayer(player.id, player.money, player.medallions));
    }

    getPickAPrizePlayerById(id: string): PickAPrizePlayer {
        const player = this.players.find((player) => player.id === id);
        if (player === undefined) {
            throw new Error("Player not found");
        }
        return player;
    }

    getMaxRounds(): number {
        return this.prizesPerRound.length;
    }

    advanceRound(): void {
        if (this.round === this.prizesPerRound.length) {
            throw new Error("Maximum number of rounds reached");
        }
        //iterate over players and reset values
        this.players.forEach((player) => player.resetValues());
        this.round++;
    }

    selectAPrize(prize: number, player: PickAPrizePlayer): void {
        if (player.lockPrizeSelection) {
            throw new Error("You have already locked your prize selection");
        }
        if (prize < 0 || prize >= this.prizesPerRound[this.round].length) {
            console.log(prize < 0);
            console.log(prize >= this.prizesPerRound[this.round].length);
            throw new Error("Invalid prize selection");
        }
        player.chosenPrize = prize;
    }

    lockPrizeSelection(player: PickAPrizePlayer): void {
        if(player.chosenPrize == undefined) {
            throw new Error("You have not selected a prize");
        }
        if (player.lockPrizeSelection) {
            throw new Error("You have already locked your prize selection");
        }
        player.lockPrizeSelection = true;
    }

    awardPrizesForRound(): void {
        //all players who have selected a prize no other players have selected get that prize
        //iterate over players and award prizes
        this.players.forEach((player) => {
            if (player.chosenPrize !== undefined) {
                //ensure player.chosenPrize is unique in this round
                const otherPlayersWithSamePrize = this.players.filter((otherPlayer) => {
                    return otherPlayer.chosenPrize === player.chosenPrize;
                });
                if (otherPlayersWithSamePrize.length === 1) {
                    const prize = this.prizesPerRound[this.round][player.chosenPrize];
                    if (prize.prizeType === "money") {
                        player.winningsPerRound.push(prize.amount);
                        player.medallionsPerRound.push(0);
                    } else if (prize.prizeType === "medallions") {
                        player.medallionsPerRound.push(prize.amount);
                        player.winningsPerRound.push(0);
                    }
                } else {
                    //the bonus prize becomes nullified
                    this.bonusPrizePerRound[this.round] = false;
                }
                //if a player didn't receive any prize, both their winningsPerRound and medallionsPerRound are set to 0
                if (player.winningsPerRound.length === this.round) {
                    player.winningsPerRound.push(0);
                    player.medallionsPerRound.push(0);
                }
            }
        });
        //if the bonus prize is still available, randomly increase two prizes of type money by 50%
        if (this.bonusPrizePerRound[this.round] && this.round <= this.prizesPerRound.length) {
            const moneyPrizes = this.prizesPerRound[this.round + 1].filter((prize) => {
                return prize.prizeType === "money";
            });
            const randomNumber1 = Math.floor(Math.random() * moneyPrizes.length);
            const randomNumber2 = Math.floor(Math.random() * moneyPrizes.length);
            const prize1 = moneyPrizes[randomNumber1];
            const prize2 = moneyPrizes[randomNumber2];
            prize1.amount = Math.floor(prize1.amount + 50);
            prize2.amount = Math.floor(prize2.amount + 50);
        }
    }
}