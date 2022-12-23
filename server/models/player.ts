import { PlayerStatus } from "../../api/types";

export class InternalPlayerInfo {
    public id: string;
    public money: number;
    public medallions: number;
    public status: PlayerStatus;

    constructor(id: string) {
        this.id = id;
        this.money = 0;
        this.medallions = 0;
        this.status = PlayerStatus.WAITING;
    }
}