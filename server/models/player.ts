import { PlayerStatus } from "../../api/types";

export class InternalPlayerInfo {
    public id: string;
    public money: number;
    public medallions: number;
    public status: PlayerStatus;
    public lockedTrade: boolean = false;

    constructor(id: string) {
        this.id = id;
        this.money = 0;
        this.medallions = 0;
        this.status = PlayerStatus.WAITING;
    }

    resetTrading(): void {
        this.lockedTrade = false;
    }

    lockTrading(): void {
        this.lockedTrade = true;
    }
}