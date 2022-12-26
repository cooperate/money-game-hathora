import styled from "styled-components";
import { useEffect, useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { medallionSvg, moneySvg } from "../App";
import { RoundGameModule } from "../../../../api/types";

export function nameAbbreviation(name: string) {
    //split name by spaces and hypens
    const nameArray = name.split(/[\s-]+/);
    let abbreviation = "";
    //if the name is only one word, return the first 3 letters
    if (nameArray.length === 1) {
        abbreviation = name.substring(0, 3);
    }
    //if the name is two words, return the first letter of each word
    if (nameArray.length === 2) {
        abbreviation = nameArray[0].substring(0, 1) + nameArray[1].substring(0, 1);
    }
    //if the name is three words, return the first letter of each word
    if (nameArray.length === 3) {
        abbreviation = nameArray[0].substring(0, 1) + nameArray[1].substring(0, 1) + nameArray[2].substring(0, 1);
    }
    return abbreviation.toUpperCase();
}

export default function TopBar() {
    const { playerState, user, getUserName, startRound, endGame } = useHathoraContext();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

    const updateMedia = () => {
        setIsMobile(window.innerWidth < 900);
    };

    useEffect(() => {
        window.addEventListener("resize", updateMedia);
        return () => window.removeEventListener("resize", updateMedia);
    });

    //create a top bar that shows the turn number, the bank total, the current game name, the current round in that game, and your name and money
    return (
        <div className="w-full flex-1 flex flex-col">
            <nav className="px-4 flex justify-between bg-white h-16 border-b-2">

                <div className="flex flex-row items-center gap-4">
                    <span className="hidden lg:block">Bank Total</span>
                    <span className="flex flex-row md:flex-column">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                        </svg>
                        {playerState?.bank}
                    </span>
                    <span className="hidden lg:block">Turn</span>
                    <span className="flex flex-row md:flex-column">
                        <span className="rounded-lg bg-indigo-400 p-2">{playerState?.turnNumber}</span>
                    </span>
                </div>

                <div className="flex flex-col justify-content lg:flex-row items-center gap-1 lg:gap-4">
                    <span className="lg:pl-0 text-gray-700">{getGameNameById(playerState?.currentGame)}</span>
                    {playerState?.currentGame !== RoundGameModule.TRADING ?
                    <>
                        <span className="hidden lg:block">|</span>
                        <span className="lg:pl-0 text-gray-700 flex flex-row gap-2">
                            <span>Round</span> {getGameRoundByActiveGame(playerState?.currentGame, playerState) + 1}
                        </span>
                    </> :
                    <span>
                        <span className="lg:pl-0 text-gray-700 flex flex-row gap-2">
                            Make Deals, Exchange Money    
                        </span>
                    </span>
                    }
                </div>

                <div className="flex flex-row items-center gap-4">
                    <div className="flex flex-col items-center">
                        <span className="hidden lg:block">{user?.name}</span>
                        <span className="flex flex-row lg:hidden">{nameAbbreviation(user?.name || 'Test')}</span>
                    </div>
                    <div className="grid-cols-2 items-center">
                        <div className="flex flex-row gap-4">
                            {moneySvg()}
                            {playerState?.self?.money}
                        </div>
                        <div className="flex flex-row gap-4">
                            {medallionSvg()}
                            {playerState?.self?.medallions}
                        </div>
                    </div>
                </div>
            </nav>
        </div>

    );
}