import { InternalPlayerInfo } from "../models/player";

export class MagicMoneyMachinePlayer extends InternalPlayerInfo {
    public winningsPerRound: number[] = [];
    public moneyInGame: number = 100;
    public moneyInBox: number = 0;
    public lockedMoney = false;

    constructor(id: string, money: number, medallions: number) {
        super(id);
        this.money = money;
        this.medallions = medallions;
    }

    resetValues(): void {
        this.lockedMoney = false;
    }
}

export class InternalMagicMoneyMachine {
    public round = 0;
    public players: MagicMoneyMachinePlayer[] = [];
    public interestPerRound: number[] = [];
    public totalInterestPerRound: number[] = [];
    public totalPayoutPerRound: number[] = [];

    constructor(
        public _players: InternalPlayerInfo[],
        public _interestPerRound: number[],
    ) {
        this.players = this.createMagicMoneyMachinePlayers(_players);
        this.interestPerRound = _interestPerRound;
    }

    createMagicMoneyMachinePlayers(players: InternalPlayerInfo[]): MagicMoneyMachinePlayer[] {
        return players.map((player) => new MagicMoneyMachinePlayer(player.id, player.money, player.medallions));
    }

    getMagicMoneyMachinePlayerById(id: string): MagicMoneyMachinePlayer {
        const player = this.players.find((player) => player.id === id);
        if (!player) {
            throw new Error("Player not found");
        }
        return player;
    }

    advanceRound(): void {
        if (this.round === this.interestPerRound.length) {
            throw new Error("Maximum number of rounds reached");
        }
        //iterate over players and reset values
        this.players.forEach((player) => player.resetValues());
        this.round++;
    }

    putMoneyInBox(amount: number, player: MagicMoneyMachinePlayer): void {
        if (player.lockedMoney) {
            throw new Error("You have already locked your money");
        }
        if (amount > player.moneyInGame) {
            throw new Error("You do not have that much money");
        }
        player.moneyInGame -= amount;
        player.moneyInBox += amount;
    }

    removeMoneyFromBox(amount: number, player: MagicMoneyMachinePlayer): void {
        if (player.lockedMoney) {
            throw new Error("You have already locked your money");
        }
        if (amount > player.moneyInBox) {
            throw new Error("You do not have that much money in your box");
        }
        player.moneyInGame += amount;
        player.moneyInBox -= amount;
    }
    lockMoney(player: MagicMoneyMachinePlayer): void {
        if (player.lockedMoney) {
            throw new Error("You have already locked your money");
        }
        player.lockedMoney = true;
    }

    payOutPlayersAtEndOfRound(): void {
        //iterate over players money in box and add it together
        let totalMoneyInBoxes = 0;
        this.players.forEach((player) => {
            totalMoneyInBoxes += player.moneyInBox;
        });
        //add interest to total money in box
        totalMoneyInBoxes += totalMoneyInBoxes * this.interestPerRound[this.round];
        this.totalInterestPerRound.push(totalMoneyInBoxes * this.interestPerRound[this.round]);
        this.totalPayoutPerRound.push(totalMoneyInBoxes);
        //divide total money in box by number of players
        const payoutPerPlayer = totalMoneyInBoxes / this.players.length;
        //iterate over players and add payout to money
        this.players.forEach((player) => {
            player.moneyInGame += payoutPerPlayer;
            player.winningsPerRound.push(payoutPerPlayer);
        });
    }

    determineWinner(): MagicMoneyMachinePlayer {
        //iterate over players and find player with most money
        let winner = this.players[0];
        this.players.forEach((player) => {
            if (player.moneyInGame > winner.moneyInGame) {
                winner = player;
            }
        });
        return winner;
    }
}