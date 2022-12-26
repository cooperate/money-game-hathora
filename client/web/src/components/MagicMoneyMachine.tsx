import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { PickAPrizePlayers, Prize, MagicMoneyMachine, MagicMoneyMachinePlayers } from "../../../../api/types";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { lockedButtonClass, lockSvg, medallionSvg, moneySvg, unlockedButtonClass, unlockSvg } from "../App";
import LockButton from "./LockButton";
import GameInfoModal from "./GameInfoModal";
import { nameAbbreviation } from "./TopBar";
import LockButtonNoInteraction from "./LockButtonNoInteraction";


const Winnings = ({ winningsPerRound }: { winningsPerRound: number[] | undefined }) => (
    <div className='block max-w-sm p-6 border bg-white border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700'>
        <div className="flex flex-col items-center">
            <div className="text-lg font-bold">Winnings</div>
            <div className="flex flex-row gap-2">
                {winningsPerRound?.map((winnings, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div className="text-2xl font-bold">{winnings}</div>
                        <div>{moneySvg()}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
)

const PlayerStatus = ({ totalInterestPerRound, totalPayoutPerRound }: { totalInterestPerRound: number[] | undefined, totalPayoutPerRound: number[] | undefined }) => (
    <div className="flex flex-wrap justify-center">
        <div className='block max-w-sm p-6 border bg-white border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700'>
            <div className="flex flex-col items-center">
                <div className="text-lg font-bold">Total Interest Paid Out Per Round</div>
                <div className="flex flex-row gap-2">
                    {totalInterestPerRound?.map((totalInterest, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div>{moneySvg()}</div>
                            <div className="text-2xl font-bold">{totalInterest}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div className='block max-w-sm p-6 border bg-white border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700'>
            <div className="flex flex-col items-center">
                <div className="text-lg font-bold">Total Payout Per Round</div>
                <div className="flex flex-row gap-2">
                    {totalPayoutPerRound?.map((totalPayout, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div>{moneySvg()}</div>
                            <div className="text-2xl font-bold">{totalPayout}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <GameInfoModal title={'Magic Money Machine Rules'} text={'Each player begins this game with a set amount of money.  Each round each player may deposit any amount of money in hand into their box.  After all players have locked their selections, their boxes are filled with money equivalent to the total money deposited by all players, in addition to the interest rate, which is divided evenly amongst all players into their boxes.'} />
    </div>
)

const ArrowLeftSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
    </svg>
)

const ArrowRightSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
    </svg>
)
const MoveMoneyButtons = () => {
    const { putMoneyInBox, removeMoneyFromBox } = useHathoraContext();
    return (
        <div className="flex flex-row gap-1">
            <div className="flex flex-col gap-1">
                <button onClick={() => putMoneyInBox(1)} className="flex flex-col items-center justify-center m-2 text-xl font-bold text-white bg-red-300 shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowRightSvg />
                        <div>{moneySvg()}</div>
                        <div>1</div>
                    </div>
                </button>
                <button onClick={() => putMoneyInBox(5)} className="flex flex-col items-center justify-center m-2 text-xl font-bold text-white bg-red-300 shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowRightSvg />
                        <div>{moneySvg()}</div>
                        <div>5</div>
                    </div>
                </button>
                <button onClick={() => putMoneyInBox(50)} className="flex flex-col items-center justify-center m-2 text-xl font-bold text-white bg-red-300 shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowRightSvg />
                        <div>{moneySvg()}</div>
                        <div>50</div>
                    </div>
                </button>
                <button onClick={() => putMoneyInBox(100)} className="flex flex-col items-center content-center justify-center m-2 text-xl font-bold text-white bg-red-300 shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowRightSvg />
                        <div>{moneySvg()}</div>
                        <div>100</div>
                    </div>
                </button>
            </div>
            <div className="flex flex-col gap-1">
                <button onClick={() => removeMoneyFromBox(1)} className="flex flex-col items-center justify-center m-2 text-xl font-bold text-white bg-blue-500 shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowLeftSvg />
                        <div>{moneySvg()}</div>
                        <div>1</div>
                    </div>
                </button>
                <button onClick={() => removeMoneyFromBox(5)} className="flex flex-col items-center justify-center m-2 text-xl font-bold text-white bg-blue-500 shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowLeftSvg />
                        <div>{moneySvg()}</div>
                        <div>5</div>
                    </div>
                </button>
                <button onClick={() => removeMoneyFromBox(50)} className="flex flex-col items-center justify-center m-2 text-xl font-bold text-white bg-blue-500 shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowLeftSvg />
                        <div>{moneySvg()}</div>
                        <div>50</div>
                    </div>
                </button>
                <button onClick={() => removeMoneyFromBox(100)} className="flex flex-col items-center justify-center m-2 text-xl font-bold text-white bg-blue-500 shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    <div className="flex flex-row gap-2">
                        <ArrowLeftSvg />
                        <div>{moneySvg()}</div>
                        <div>100</div>
                    </div>
                </button>
            </div>
        </div>
    )
}
const SelectionArea = ({ magicMoneyMachine }: { magicMoneyMachine: MagicMoneyMachine | undefined }) => {
    const { lockMoney } = useHathoraContext();
    return (
        <div className="flex flex-col justify-center">
            <div className='flex flex-col'>
                <p className="text-lg font-bold">Interest Per Round</p>
                {
                    magicMoneyMachine?.interestPerRound.map((interest, index) => {
                        return (
                            <div key={index} className='shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700 flex flex-col justify-center items-center'>
                                <p className="text-2xl font-bold">{interest.toFixed(2)}%</p>
                            </div>
                        )
                    })
                }
            </div>
            <div className="flex flex-row justify-between gap-1 w-95">
                <div className='grow rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700 flex flex-col justify-center items-center'>
                    <p className="text-lg font-bold">Money In Hand</p>
                    <p className="text-2xl font-bold">{magicMoneyMachine?.moneyInHand}</p>
                </div>
                <MoveMoneyButtons />
                <div className='grow rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700 flex flex-col justify-center items-center'>
                    <p className="text-lg font-bold">Box</p>
                    <div className="flex flex-row gap-2 items-center justify-center">
                        <div>{moneySvg()}</div>
                        <div className="text-2xl font-bold">{magicMoneyMachine?.moneyInBox}</div>
                    </div>
                </div>
            </div>
            <LockButton callbackToLock={() => lockMoney()} isLocked={magicMoneyMachine?.lockedMoney || false} lockText={"Money is locked in box."} unlockText={"Money is not locked yet."} />
        </div>
    )
}


const PlayerArea = ({ players, getUserName }: { players: MagicMoneyMachinePlayers[] | undefined, getUserName: any }) => {
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';
    return (
        <div className='flex flex-wrap m-8 gap-4'>
            {players?.map((player: MagicMoneyMachinePlayers, index) => (
                <div key={index} className={cardCss}>
                    <div className="flex flex-col items-center">
                        <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                    </div>
                    <LockButtonNoInteraction isLocked={player.lockedMoney} lockText="Box is locked."
                        unlockText="Box is not locked." />
                </div>
            ))}
        </div>
    )
}

export default function MagicMoneyMachineComponent() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();

    return (
        <div>

            <Winnings winningsPerRound={playerState?.magicMoneyMachine?.winningsPerRound} />
            <PlayerStatus totalInterestPerRound={playerState?.magicMoneyMachine?.totalInterestPerRound || []} totalPayoutPerRound={playerState?.magicMoneyMachine?.totalPayoutPerRound || []} />
            <SelectionArea magicMoneyMachine={playerState?.magicMoneyMachine} />
            <PlayerArea players={playerState?.magicMoneyMachine?.players.filter((player) => player.id != user?.id)} getUserName={getUserName} />
        </div>
    )
}
