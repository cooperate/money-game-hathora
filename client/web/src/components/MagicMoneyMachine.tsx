import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { PickAPrizePlayers, Prize, PrizeType } from "../../../../api/types";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { lockedButtonClass, lockSvg, medallionSvg, moneySvg, unlockedButtonClass, unlockSvg } from "../App";
import LockButton from "./LockButton";
import GameInfoModal from "./GameInfoModal";
import { nameAbbreviation } from "./TopBar";


export default function MagicMoneyMachine() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();

    const getSelfPlayerStatus = (): PickAPrizePlayers | undefined => {
        return playerState?.pickAPrize?.players.find((player) => player.id === user?.id);
    }

    return (
        <div>
            <PlayerStatus winningsPerRound={getSelfPlayerStatus()?.winningsPerRound} totalInterestPerRound={playerState?.magicMoneyMachine?.totalInterestPerRound} totalPayoutPerRound={playerState?.magicMoneyMachine?.totalPayoutPerRound} />
            {/* <SelectionArea chosenPrize={playerState?.pickAPrize?.chosenPrize} prizes={playerState?.pickAPrize?.prizesPerRound[playerState?.pickAPrize?.round]} lockPrizeSelection={playerState?.pickAPrize?.lockPrizeSelection} lockPrize={lockPrize} selectAPrize={selectAPrize} />
            <PlayerArea players={playerState?.pickAPrize?.players.filter((player) => player.id != user?.id)} getUserName={getUserName} /> */}
        </div>
    )
}

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

const PlayerStatus = ({ winningsPerRound, totalInterestPerRound, totalPayoutPerRound }: { winningsPerRound: number[] | undefined, totalInterestPerRound: number[] | undefined, totalPayoutPerRound: number[] | undefined }) => (
    <div>
        <Winnings winningsPerRound={winningsPerRound} />
    </div>
)