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
import LockButtonNoInteraction from "./LockButtonNoInteraction";

const clickFlashyAnimation = keyframes`
    0% {
        background-color: #fff;
    }
    50% {
        background-color: #000;
    }
    100% {
        background-color: #fff;
    }`;
const styles = css`
    animation: ${clickFlashyAnimation} 0.5s linear;
`;
const PrizeSelection = styled.div`
    animation: ${({ animate }: { animate: boolean }) => animate ? styles : ""};
`;

export default function PickAPrize() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();

    const getSelfPlayerStatus = (): PickAPrizePlayers | undefined => {
        return playerState?.pickAPrize?.players.find((player) => player.id === user?.id);
    }

    return (
        <div>
            <PlayerStatus winningsPerRound={getSelfPlayerStatus()?.winningsPerRound} medallionsPerRound={getSelfPlayerStatus()?.medallionsPerRound} />
            <SelectionArea chosenPrize={playerState?.pickAPrize?.chosenPrize} prizes={playerState?.pickAPrize?.prizesPerRound[playerState?.pickAPrize?.round]} lockPrizeSelection={playerState?.pickAPrize?.lockPrizeSelection} lockPrize={lockPrize} selectAPrize={selectAPrize} />
            <PlayerArea players={playerState?.pickAPrize?.players.filter((player) => player.id != user?.id)} getUserName={getUserName} />
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


const PlayerStatus = ({ winningsPerRound, medallionsPerRound }: { winningsPerRound: number[] | undefined, medallionsPerRound: number[] | undefined }) => (
    <div className="flex flex-row justify-center gap-4">
        <Winnings winningsPerRound={winningsPerRound} medallionsPerRound={medallionsPerRound} />
        <GameInfoModal title={'Pick A Prize Rules'} text={'Each player selects any one of the prizes available each round.  Prizes are only awarded when only a single player has chosen any prize.  If everyone gets a prize, a bonus is applied to the next round.'} />
    </div>
)
const SelectionArea = ({ prizes, lockPrize, selectAPrize, chosenPrize, lockPrizeSelection }: { prizes: Prize[] | undefined, lockPrize: any, selectAPrize: any, chosenPrize: number | undefined, lockPrizeSelection: boolean | undefined }) => {
    const [animateNow, setAnimateNow] = useState(prizes?.map(() => false));
    const renderMedallions = (amount: number) => {
        let medallions = [];
        for (let i = 0; i < amount; i++) {
            medallions.push(medallionSvg())
        }
        return medallions;
    }
    const selectAPrizeClick = (index: number) => {
        if (animateNow) {
            setAnimateNow([...animateNow.map((_, i) => i === index ? true : false)]); //apply clickFlashyAnimation to class    
            //after 3 seconds remove animation
            setTimeout(() => {
                setAnimateNow([...animateNow.map((_, i) => i === index ? false : false)]);
            }, 3000);
        }
        //call callback
        selectAPrize(index);
    }
    const selectedPrizeClass = 'ring-2 ring-blue-500 transition ease-in-out delay-150 bg-orange-200 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-500 duration-150 rounded-xl p-8'
    const unselectedPrizeClass = 'ring-2 ring-blue-500 transition ease-in-out delay-150 bg-slate-300 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-500 duration-150 rounded-xl p-8';
    return (
        <div className="flex flex-col justify-center items-center">
            <div className="flex flex-wrap gap-6 justify-center m-10">
                {prizes && prizes.map((prize, index) => (
                    <PrizeSelection animate={animateNow?.[index] || false} className={index === chosenPrize ? selectedPrizeClass : unselectedPrizeClass} onClick={() => selectAPrizeClick(index)}>
                        {prize.prizeType == PrizeType.MONEY ?
                            <span className="flex flex-row inline-block text-xl items-center align-center">{moneySvg()} {prize.amount}</span> :
                            //iterate x times over amount
                            renderMedallions(prize.amount)
                        }
                    </PrizeSelection>
                ))}
            </div>
            <LockButton
                callbackToLock={lockPrize}
                isLocked={lockPrizeSelection || false}
                lockText="Prize Selection Is Locked"
                unlockText="Press to Lock Prize Selection"
            />
        </div>
    )
}

const PlayerArea = ({ players, getUserName }: { players: PickAPrizePlayers[] | undefined, getUserName: any }) => {
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';
    return (
        <div className='flex flex-wrap m-8 gap-4'>
            {players?.map((player: PickAPrizePlayers, index) => (
                <div key={index} className={cardCss}>
                    <div className="flex flex-col items-center">
                        <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                    </div>
                    <Winnings winningsPerRound={player.winningsPerRound} medallionsPerRound={player.medallionsPerRound} />
                    <LockButtonNoInteraction isLocked={player.lockPrizeSelection} lockText="Prize Selection Is Locked"
                        unlockText="Prize Selection Is Not Locked" />
                </div>
            ))}
        </div>
    )
}