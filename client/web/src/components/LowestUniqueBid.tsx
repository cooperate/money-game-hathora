import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { LowestUniqueBidder, LowestUniqueBidderPlayers, RevealedPaddle } from "../../../../api/types";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { lockedButtonClass, lockSvg, medallionSvg, moneySvg, unlockedButtonClass, unlockSvg } from "../App";
import LockButton from "./LockButton";
import GameInfoModal from "./GameInfoModal";
import { nameAbbreviation } from "./TopBar";
import LockButtonNoInteraction from "./LockButtonNoInteraction";
import { getUserDisplayName } from "../../../../api/base";

const PlayerStatus = ({ multipliersPerRound, medallionsPerRound }: { multipliersPerRound: number[], medallionsPerRound: number[] }) => {
    return (
        <div className="flex flex-row justify-center gap-4">
            <div className="flex flex-row justify-center player-statusblock max-w-sm p-6 border bg-white border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700 gap-4">
                    {multipliersPerRound.map((multiplier: number, index: number) => (
                        <div key={index} className="flex flex-col items-center">
                            <div className="flex flex-row">
                                <div className="flex flex-row items-center text-sm font-bold">{moneySvg()} X</div>
                                <div className="text-2xl font-bold">{multiplier}</div>
                            </div>
                            <div className="flex flex-row items-center">
                                <div className="text-sm font-bold">{medallionSvg()}</div>
                                <div className="text-sm font-bold">{medallionsPerRound[index]}</div>
                            </div>
                        </div>
                    ))}
            </div>
            <GameInfoModal title={'Lowest Unique Bid Rules'} text={'Each player selects one paddle to make a bid.  The winner is the player who selects the lowest value paddle not chosen by anyone else.  The winner receives the paddle value multiplied by the current rounds pot.'} />
        </div>
    )
}

const SelectionArea = ({lowestUniqueBidder, getUserName} : {lowestUniqueBidder: LowestUniqueBidder | undefined, getUserName: any}) => {
    return (
        <div className="flex flex-col gap-4 m-5"> 
            <div className="flex flex-row justify-center items-center gap-4">
                {(lowestUniqueBidder?.revealedPaddles[lowestUniqueBidder?.round]?.length || 0) > 0 ?
                    <>
                    <span className={'text-2xl font-bold'}>Choose a Paddle</span>
                    {
                        lowestUniqueBidder?.paddlesToChooseFrom.map((paddle: number) => (
                            <div key={paddle} className="rounded-lg justify-center items-center border bg-white border-gray-200 p-5 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-200">
                                {paddle}
                            </div>
                        ))
                    } 
                    </>
                    :
                    <>
                    <span className={'text-2xl font-bold'}>Paddles Are Revealed!</span>
                    {
                        lowestUniqueBidder?.revealedPaddles[lowestUniqueBidder?.round]?.map((revealedPaddle: RevealedPaddle, index: number) => (
                            <div key={index} className="rounded-lg justify-center items-center border bg-white border-gray-200 p-5 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-200">
                                <div className="flex flex-col justify-center items-center gap-2">
                                    <div className="text-2xl font-bold">Player</div>
                                    <div className="text-2xl font-bold">{getUserName(revealedPaddle.playerId)}</div>
                                    <div className="rounded-lg justify-center items-center border bg-white border-gray-200 p-5 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-200">
                                        {revealedPaddle.paddle}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                    </>
                }
            </div>
            <LockButton callbackToLock={() => {}} isLocked={lowestUniqueBidder?.lockedPaddle || false} lockText={"Paddle is locked."} unlockText={"Paddle is not locked."} />
        </div>
    )
}

const Winnings = ({ winningsPerRound, medallionsPerRound }: { winningsPerRound: number[] | undefined, medallionsPerRound: number[] | undefined }) => (
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
        <div className="flex flex-col items-center">
            <div className="text-lg font-bold">Medallions</div>
            <div className="flex flex-row gap-2">
                {medallionsPerRound?.map((medallions, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div className="text-2xl font-bold">{medallions}</div>
                        <div>{medallionSvg()}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
)

const PlayerArea = ({ players, getUserName }: { players: LowestUniqueBidderPlayers[] | undefined, getUserName: any }) => {
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';
    return (
        <div className='flex flex-wrap m-8 gap-4'>
            {players?.map((player: LowestUniqueBidderPlayers, index) => (
                <div key={index} className={cardCss}>
                    <div className="flex flex-col items-center">
                        <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <Winnings winningsPerRound={player.winningsPerRound} medallionsPerRound={player.medallionsPerRound} />
                    </div>
                    <LockButtonNoInteraction isLocked={player.lockPaddle} lockText="Paddle has been locked."
                        unlockText="Paddle not locked yet." />
                </div>
            ))}
        </div>
    )
}

export default function LowestUniqueBidComponent() {
    const { playerState, user, getUserName, startRound, endGame } = useHathoraContext();

    const getSelfPlayerStatus = (): LowestUniqueBidderPlayers | undefined => {
        return playerState?.lowestUniqueBidder?.players.find((player) => player.id === user?.id);
    }

    return (
        <div className="flex flex-col">
            <Winnings winningsPerRound={getSelfPlayerStatus()?.winningsPerRound} medallionsPerRound={getSelfPlayerStatus()?.medallionsPerRound} />
            <PlayerStatus multipliersPerRound={playerState?.lowestUniqueBidder?.multipliersPerRound || []} medallionsPerRound={playerState?.lowestUniqueBidder?.medallionsPerRound || []} />
            <SelectionArea lowestUniqueBidder={playerState?.lowestUniqueBidder} getUserName={getUserName} />
            <PlayerArea players={playerState?.lowestUniqueBidder?.players.filter((player) => player.id != user?.id)} getUserName={getUserName} />
        </div>
    )
}