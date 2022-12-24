import styled, { css, keyframes } from "styled-components";
import { useState, useEffect } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { PickAPrizePlayers, Prize, PrizeDraw, PrizeDrawPlayers, PrizeType } from "../../../../api/types";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { lockedButtonClass, lockSvg, medallionSvg, moneySvg, unlockedButtonClass, unlockSvg } from "../App";
import LockButton from "./LockButton";
import GameInfoModal from "./GameInfoModal";
import { nameAbbreviation } from "./TopBar";
import LockButtonNoInteraction from "./LockButtonNoInteraction";

const Winnings = ({ winningsPerRound, medallionsPerRound }: { winningsPerRound: number[] | undefined, medallionsPerRound: number[] | undefined }) => (
    <div className='block max-w-sm p-6 border bg-white border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700'>
        <div className="flex flex-col items-center">
            <div className="text-lg font-bold">Winnings</div>
            <div className="flex flex-row gap-2">
                {winningsPerRound?.map((winnings, index) => (
                    <div key={index} className="flex flex-row items-center gap-2">
                        <div>{moneySvg()}</div>
                        <div className="text-2xl font-bold">{winnings}</div>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex flex-col items-center">
            <div className="text-lg font-bold">Medallions</div>
            <div className="flex flex-row gap-2">
                {medallionsPerRound?.map((medallions, index) => (
                    <div key={index} className="flex flex-row items-center gap-2">
                        <div>{medallionSvg()}</div>
                        <div className="text-2xl font-bold">{medallions}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
)

const PlayerStatus = ({ winningsPerRound, medallionsPerRound }: { winningsPerRound: number[] | undefined, medallionsPerRound: number[] | undefined }) => (
    <div className="flex flex-row justify-center gap-4">
        <Winnings winningsPerRound={winningsPerRound} medallionsPerRound={medallionsPerRound} />
        <GameInfoModal title={'Prize Draw Rules'} text={'Each player selects how many tickets they would like to enter into a draw.  One ticket is drawn at random and the player who owns this ticket wins.  The player wins a sum of money.  The winnings are calculated by dividing the current rounds pot by the total amount of tickets entered by all players.  In some rounds, a medallion may be awarded as bonus.'} />
    </div>
)

const SelectionArea = ({ prizeDraw }: { prizeDraw: PrizeDraw | undefined }) => {
    const [tickets, setTickets] = useState<number | undefined>(undefined);
    const { user, lockTickets, enterTickets } = useHathoraContext();
    const currentRoundPotStyle = 'block max-w-sm p-6 border bg-white border-gray-200 rounded-lg shadow-md hover:bg-green-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-green-500';
    function componentEnterTickets(tickets: number) {
        if (user?.id) {
            setTickets(tickets);
            enterTickets(tickets);
        }
    }
    useEffect(() => {
        if(prizeDraw?.ticketsLocked) {
            setTickets(undefined);
        }
    }, [prizeDraw?.ticketsLocked])
    return (
        <div className="flex flex-col justify-center">
            <div className="flex flex-row justify-between">
                {prizeDraw?.potsPerRound.map((pot, index) => (
                    <div key={index} className={`flex flex-col gap-2 justify-center items-center ${(index == prizeDraw?.round && currentRoundPotStyle)}`}>
                        <div className="text-lg font-bold">Pot {index + 1}</div>
                        <div className="flex flex-row gap-2">
                            <div>{moneySvg()}</div>
                            <div className="text-2xl font-bold">{pot}</div>
                        </div>
                        <div className="flex flex-row gap-2">
                            <div>{medallionSvg()}</div>
                            <div className="text-2xl font-bold">{prizeDraw?.medallionsPerRound[index]}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div>
                <span className="text-lg font-bold">Enter Tickets For Prize Draw. Minimum Tickets: {prizeDraw?.minTickets}. Maximum Tickets: {prizeDraw?.maxTickets}. (Round {prizeDraw?.round})</span>
                {prizeDraw?.ticketsLocked ?
                    <div className="flex flex-row gap-2 justify-center">
                        <div className="text-xl font-bold">Tickets Entered: {prizeDraw?.ticketsEntered}</div>
                    </div>
                    :
                    <input
                        type="number"
                        min={prizeDraw?.minTickets}
                        max={prizeDraw?.maxTickets}
                        value={tickets}
                        onChange={(e) => componentEnterTickets(parseFloat(e.target.value))}
                        placeholder="Enter Tickets For Prize Draw"
                        className="w-full flex-1 px-5 shadow py-3 border placeholder-gray-500 border-gray-300 rounded-l md:rounder-r-0 md:mb-0 mb-5 in-range:border-green-500"
                    />
                }
            </div>
            <LockButton callbackToLock={lockTickets} isLocked={prizeDraw?.ticketsLocked || false} lockText="Ticket Number Is Locked" unlockText="Lock Your Ticket Number" />
        </div>
    )
}

const PlayerArea = ({ players, getUserName }: { players: PrizeDrawPlayers[] | undefined, getUserName: any }) => {
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';
    return (
        <div className='flex flex-wrap m-8 gap-4'>
            {players?.map((player: PrizeDrawPlayers, index) => (
                <div key={index} className={cardCss}>
                    <div className="flex flex-col items-center">
                        <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="text-lg font-bold dark:text-white">Rounds Won</div>
                        <div className="flex flex-row gap-2">
                            {player.roundsWon.map((roundWon, index) => (
                                <div key={index} className="text-2xl font-bold dark:text-white">{roundWon ? "W" : "L"}</div>
                            ))}
                        </div>
                    </div>
                    <LockButtonNoInteraction isLocked={player.ticketsLocked} lockText="Prize Selection Is Locked"
                        unlockText="Prize Selection Is Not Locked" />
                </div>
            ))}
        </div>
    )
}

export default function PrizeDrawComponent() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();

    return (
        <div>
            <PlayerStatus winningsPerRound={playerState?.prizeDraw?.winningsPerRound} medallionsPerRound={playerState?.prizeDraw?.medallionsWonPerRound} />
            <SelectionArea prizeDraw={playerState?.prizeDraw} />
            <PlayerArea players={playerState?.prizeDraw?.players.filter((player) => player.id != user?.id)} getUserName={getUserName} />
        </div>
    )
}