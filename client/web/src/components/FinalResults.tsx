import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { PlayerScore } from "../../../../api/types";
import { nameAbbreviation } from "./TopBar";
import { useHathoraContext } from "../context/GameContext";

export default function FinalResultsComponent() {
    const { getUserName, playerState } = useHathoraContext();
    return (
        <div className="flex flex-col items-center">
            <div className="text-lg font-bold">Final Results</div>
            <div className="flex flex-col gap-2">
                {playerState?.finalResults?.map((playerScore: PlayerScore, index) => (
                    <div key={index} className="flex flex-row items-center">
                        <div className="text-2xl font-bold">{nameAbbreviation(getUserName(playerScore.id))}</div>
                        <div className="text-2xl font-bold">{playerScore.score}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}