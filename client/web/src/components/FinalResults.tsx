import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { PlayerScore } from "../../../../api/types";
import { nameAbbreviation } from "./TopBar";
import { useHathoraContext } from "../context/GameContext";

export default function FinalResultsComponent() {
    const { getUserName, playerState } = useHathoraContext();
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-black';
    
    return (
        <div className='flex flex-col gap-2 border-gray-200 rounded-lg dark:bg-gray-300 dark:border-gray-400 p-2'>
            <div className={headerTextCss}>Final Results</div>
            <div className="flex flex-col gap-2">
                {playerState?.finalResults?.map((playerScore: PlayerScore, index) => (
                    <div key={index} className={cardCss}>
                        <div className="text-lg font-bold text-slate-50">{nameAbbreviation(getUserName(playerScore.id))}</div>
                        <div className="text-lg font-bold text-slate-50">{playerScore.score}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}