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

export type PrizeType = "money" | "medallions";
export type Prize = {
    prizeType: PrizeType,
    amount: number,
}

export class InternalPickAPrize {
    public round = 0;
    public players: PickAPrizePlayer[];
    public prizesPerRound: Prize[][];
    public bonusPrizePerRound: boolean[];
    constructor(
        public _players: InternalPlayerInfo[],
        public _prizesPerRound: Prize[][],
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
        player.chosenPrize = prize;
    }

    lockPrizeSelection(player: PickAPrizePlayer): void {
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
                    } else if (prize.prizeType === "medallions") {
                        player.medallionsPerRound.push(prize.amount);
                    }
                } else {
                    //the bonus prize becomes nullified
                    this.bonusPrizePerRound[this.round] = false;
                }
            }
        });
        //if the bonus prize is still available, randomly increase two prizes of type money by 50%
        if (this.bonusPrizePerRound[this.round] && this.round < this.prizesPerRound.length - 1) {
            const moneyPrizes = this.prizesPerRound[this.round + 1].filter((prize) => {
                return prize.prizeType === "money";
            });
            const prize1 = moneyPrizes[Math.floor(Math.random() * moneyPrizes.length)];
            const prize2 = moneyPrizes[Math.floor(Math.random() * moneyPrizes.length)];
            prize1.amount = Math.floor(prize1.amount * 1.5);
            prize2.amount = Math.floor(prize2.amount * 1.5);
        }
    }
}