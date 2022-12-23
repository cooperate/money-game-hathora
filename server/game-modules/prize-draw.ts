import { InternalPlayerInfo } from "../models/player";

class PrizeDrawPlayer extends InternalPlayerInfo {
    public tickets: number | undefined;
    public lockTickets = false;
    public winningsPerRound: number[] = [];
    public medallionsPerRound: number[] = [];

    constructor(id: string, money: number, medallions: number) {
        super(id);
        this.money = money;
        this.medallions = medallions;
    }

    resetValues(): void {
        this.tickets = undefined;
        this.lockTickets = false;
    }

    getRoundsWon(): boolean[] {
        return this.winningsPerRound.map((winnings) => winnings > 0);
    }
}

export class InternalPrizeDraw {
    public round = 0;
    private maxRounds: number;
    public potsPerRound: number[] = [];
    public medallionsPerRound: number[] = [];
    private minTicketNumber = 0;
    private maxTicketNumber = 20;
    public players: PrizeDrawPlayer[] = [];
    constructor(
        public _players: InternalPlayerInfo[],
        public _potsPerRound: number[],
        public _medallionsPerRound: number[],
    ) {
        this.maxRounds = _potsPerRound.length;
        this.setPotsPerRound(_potsPerRound);
        this.setMedallionsPerRound(_medallionsPerRound);
        this.players = this.createPrizeDrawPlayers(_players);
    }

    setPotsPerRound(potsPerRound: number[]): void {
        if (potsPerRound.length !== this.maxRounds) {
            throw new Error("Invalid number of pots per round");
        }
        this.potsPerRound = potsPerRound;
    }

    setMedallionsPerRound(medallionsPerRound: number[]): void {
        if (medallionsPerRound.length !== this.maxRounds) {
            throw new Error("Invalid number of medallions per round");
        }
        this.medallionsPerRound = medallionsPerRound;
    }

    advanceRound(): void {
        if (this.round === this.maxRounds) {
            throw new Error("Maximum number of rounds reached");
        }
        //iterate over players and reset values
        this.players.forEach((player) => player.resetValues());
        this.round++;
    }

    enterTicketsAmount(player: PrizeDrawPlayer, ticketAmount: number): void {
        if (player.lockTickets) {
            throw new Error("Player has already entered tickets");
        }
        if (ticketAmount < 0) {
            throw new Error("Ticket amount must be positive");
        }
        if (ticketAmount < this.minTicketNumber) {
            throw new Error(`Ticket amount must be greater than ${this.minTicketNumber}`);
        }
        if (ticketAmount > this.maxTicketNumber) {
            throw new Error(`Ticket amount must be less than ${this.maxTicketNumber}`);
        }
        player.tickets = ticketAmount;
    }

    public determineWinner(): PrizeDrawPlayer {
        //determine if all players numbers are locked
        if (this.players.some((player) => !player.lockTickets)) {
            throw new Error("Not all players have locked their numbers");
        }
        const winner = this.conductPrizeDraw();
        const totalTicketsInDraw = this.players.reduce((acc, player) => {
            if (player.tickets === undefined) {
                throw new Error("Player has not entered tickets");
            }
            return acc + player.tickets;
        }, 0);
        let winnings = this.potsPerRound[this.round] / totalTicketsInDraw;
        //round winnings down to nearest integer
        winnings = Math.floor(winnings);
        winner.winningsPerRound.push(winnings);
        //every other player gets zero
        this.players.forEach((player) => {
            if (player.id !== winner.id) {
                player.winningsPerRound.push(0);
            }
        });
        //award the winner the medallions for the current round
        winner.medallionsPerRound.push(this.medallionsPerRound[this.round]);
        //every other player gets zero
        this.players.forEach((player) => {
            if (player.id !== winner.id) {
                player.medallionsPerRound.push(0);
            }
        });
        return winner;
    }

    private conductPrizeDraw(): PrizeDrawPlayer {
        //given the number of tickets each player has, determine the winner by randomly selecting one of the tickets
        const tickets = this.players.reduce((acc, player) => {
            if (player.tickets === undefined) {
                throw new Error("Player has not entered tickets");
            }
            return acc.concat(Array(player.tickets).fill(player));
        }, [] as PrizeDrawPlayer[]);
        return tickets[Math.floor(Math.random() * tickets.length)];
    }

    private createPrizeDrawPlayers(players: InternalPlayerInfo[]): PrizeDrawPlayer[] {
        return players.map((player) => new PrizeDrawPlayer(player.id, player.money, player.medallions));
    }

    public lockTickets(player: PrizeDrawPlayer): void {
        if (player.tickets === undefined) {
            throw new Error("Player has not entered tickets");
        }
        player.lockTickets = true;
    }

    public getPrizeDrawPlayer(id: string): PrizeDrawPlayer {
        const player = this.players.find((player) => player.id === id);
        if (player === undefined) {
            throw new Error("Player not found");
        }
        return player;
    }
}