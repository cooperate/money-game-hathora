import { Response } from "../../api/base";
import { ServerError } from "../impl";
import { InternalPlayerInfo } from "../models/player";

export class PrizeDrawPlayer {
    public tickets: number | undefined;
    public lockTickets = false;
    public winningsPerRound: number[] = [];
    public medallionsPerRound: number[] = [];

    constructor(public id: string) { }

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
    public maxRounds: number;
    public potsPerRound: number[] = [];
    public medallionsPerRound: number[] = [];
    public minTicketNumber = 0;
    public maxTicketNumber = 20;
    public players: PrizeDrawPlayer[] = [];
    constructor(
        public _players: InternalPlayerInfo[],
        public _potsPerRound: number[],
        public _medallionsPerRound: number[]
    ) {
        this.maxRounds = _potsPerRound.length;
        this.setPotsPerRound(_potsPerRound);
        this.setMedallionsPerRound(_medallionsPerRound);
        this.players = this.createPrizeDrawPlayers(_players);
        //iterate through players and choose paddle 0
        this.players.forEach((player) => {
            this.enterTicketsAmount(player, 0);
        });
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
        this.players.forEach((player) => {
            this.enterTicketsAmount(player, 0);
        });
    }

    enterTicketsAmount(player: PrizeDrawPlayer, ticketAmount: number): void | ServerError {
        if (player.lockTickets) {
            return "Player has already entered tickets";
        }
        //ensure tickets is a number
        if (isNaN(ticketAmount)) {
            return "Ticket amount must be a number";
        }
        if (ticketAmount < 0) {
            return "Ticket amount must be positive";
        }
        if (ticketAmount < this.minTicketNumber) {
            return `Ticket amount must be greater than ${this.minTicketNumber}`;
        }
        if (ticketAmount > this.maxTicketNumber) {
            return `Ticket amount must be less than ${this.maxTicketNumber}`;
        }
        player.tickets = ticketAmount;
    }

    public determineWinner(): PrizeDrawPlayer | undefined {
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
        if (totalTicketsInDraw > 0) {
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
        } else {
            //if no tickets were entered, no one wins
            this.players.forEach((player) => {
                player.winningsPerRound.push(0);
                player.medallionsPerRound.push(0);
            });
            return undefined;
        }
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
        return players.map((player) => new PrizeDrawPlayer(player.id));
    }

    public lockTickets(player: PrizeDrawPlayer): void | ServerError {
        if (player.tickets === undefined) {
            return "Player has not entered tickets";
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
