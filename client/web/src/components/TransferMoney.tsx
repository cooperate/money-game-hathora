import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { PickAPrizePlayers, Prize, MagicMoneyMachine, MagicMoneyMachinePlayers, PlayerInfo } from "../../../../api/types";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { lockedButtonClass, lockSvg, medallionSvg, moneySvg, unlockedButtonClass, unlockSvg } from "../App";
import LockButton from "./LockButton";
import GameInfoModal from "./GameInfoModal";
import { nameAbbreviation } from "./TopBar";
import LockButtonNoInteraction from "./LockButtonNoInteraction";

interface PlayersMoney {
    playerId: string;
    amount: number;
}
const SelectionArea = ({ players }: { players: PlayerInfo[] | undefined }) => {
    const { getUserName, transferMoney, transferMedallions, playerState } = useHathoraContext();
    const [moneyToSend, setMoneyToSend] = useState<PlayersMoney[]>([]);
    const [medallionsToSend, setMedallionsToSend] = useState<PlayersMoney[]>([]);
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';

    const componentEnterAmount = (playerId: string, amount: number) => {
        //setMoneyToSend replace prevId with new amount
        const prevId = moneyToSend.find((player) => player.playerId === playerId);
        if (prevId) {
            const newMoneyToSend = moneyToSend.filter((player) => player.playerId !== playerId);
            setMoneyToSend([...newMoneyToSend, { playerId, amount }]);
        } else {
            setMoneyToSend([...moneyToSend, { playerId, amount }]);
        }
    }

    const componentEnterAmountMedallion = (playerId: string, amount: number) => {
        //setMedallionsToSend replace prevId with new amount
        const prevId = medallionsToSend.find((player) => player.playerId === playerId);
        if (prevId) {
            const newMedallionsToSend = medallionsToSend.filter((player) => player.playerId !== playerId);
            setMedallionsToSend([...newMedallionsToSend, { playerId, amount }]);
        } else {
            setMedallionsToSend([...medallionsToSend, { playerId, amount }]);
        }
    }


    const transferMoneyComponent = (playerId: string) => {
        const playerMoney = moneyToSend.find((player) => player.playerId === playerId);
        if (playerMoney) {
            transferMoney(playerMoney.amount, playerId);
        }
    }

    const transferMedallionsComponent = (playerId: string) => {
        const playerMedallions = medallionsToSend.find((player) => player.playerId === playerId);
        if (playerMedallions) {
            transferMedallions(playerMedallions.amount, playerId);
        }
    }

    return (
        <div className="flex flex-col justify-center">
            <div className="flex flex-wrap justify-center gap-1">
                {players?.map((player: PlayerInfo, index: number) => (
                    <div key={index} className={cardCss}>
                        <div className="flex flex-col items-center">
                            <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                        </div>
                        <div className="flex flex-row items-center justify-center">
                            <input
                                type="number"
                                onChange={(e) => componentEnterAmount(player.id, parseFloat(e.target.value))}
                                placeholder="Enter An Amount"
                                className="w-full flex-1 px-5 shadow py-3 border placeholder-gray-500 border-gray-300 rounded-l md:rounder-r-0 md:mb-0 mb-5 in-range:border-green-500"
                            />
                            <button disabled={moneyToSend.find(playersMoney => playersMoney.playerId == player.id)?.amount ? false : true} onClick={() => transferMoneyComponent(player.id)} className={`block shadow-md ${moneyToSend.find(playersMoney => playersMoney.playerId == player.id)?.amount ? 'bg-green-500 hover:bg-green-900' : 'bg-slate-500'} rounded p-2 font-semibold text-white text-center h-full`}>
                                Send Money
                            </button>
                        </div>
                        {playerState?.turnNumber == 5 &&
                            <div className="flex flex-row items-center justify-center">
                                <input
                                    type="number"
                                    onChange={(e) => componentEnterAmountMedallion(player.id, parseFloat(e.target.value))}
                                    placeholder="Enter An Amount"
                                    className="w-full flex-1 px-5 shadow py-3 border placeholder-gray-500 border-gray-300 rounded-l md:rounder-r-0 md:mb-0 mb-5 in-range:border-green-500"
                                />
                                <button disabled={medallionsToSend.find(playersMedallions => playersMedallions.playerId == player.id)?.amount ? false : true} onClick={() => transferMedallionsComponent(player.id)} className={`block shadow-md ${medallionsToSend.find(playersMedallions => playersMedallions.playerId == player.id)?.amount ? 'bg-green-500 hover:bg-green-900' : 'bg-slate-500'} rounded p-2 font-semibold text-white text-center h-full`}>
                                    Send Money
                                </button>
                            </div>
                        }
                        <LockButtonNoInteraction isLocked={player?.lockedTrade} lockText={"Has finished trading."} unlockText={"Still Trading."} />
                    </div>
                ))}
            </div>
        </div>
    )
}

const PlayerStatus = ({ money, lockedTrade }: { money: number | undefined, lockedTrade: boolean | undefined }) => {
    const { lockTrading } = useHathoraContext();
    return (
        <div className="flex flex-col justify-between gap-1 w-95">
            <div className='grow rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700 flex flex-col justify-center items-center'>
                <p className="text-lg font-bold">Money</p>
                <div className="flex flex-row gap-2 items-center justify-center">
                    <div>{moneySvg()}</div>
                    <div className="text-2xl font-bold">{money || 0}</div>
                </div>
            </div>
            <LockButton callbackToLock={() => lockTrading()} isLocked={lockedTrade || false} lockText={"Done trading."} unlockText={"Click To Finish Trading."} />
        </div>)
}
export default function TransferMoneyComponent() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();

    return (
        <div className="flex flex-col gap-4">
            <PlayerStatus money={playerState?.self?.money} lockedTrade={playerState?.self?.lockedTrade} />
            <SelectionArea players={playerState?.players.filter(player => player.id != user?.id)} />
        </div>
    )
}
