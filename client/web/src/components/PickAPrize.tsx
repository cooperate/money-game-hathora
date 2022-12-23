import styled from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { Prize, PrizeType } from "../../../../api/types";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { medallionSvg, moneySvg } from "../App";

export default function PickAPrize() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();

    return (
        <div>
            <SelectionArea prizes={playerState?.pickAPrize?.prizesPerRound[playerState?.pickAPrize?.round]} lockPrize={lockPrize} selectAPrize={selectAPrize} />
            <PlayerArea />
        </div>
    )
}

const SelectionArea = ({ prizes, lockPrize, selectAPrize }: { prizes: Prize[] | undefined, lockPrize: any, selectAPrize: any }) => {
    const [selectedPrize, setSelectedPrize] = useState<Prize | undefined>(undefined);
    const renderMedallions = (amount: number) => {
        let medallions = [];
        for (let i = 0; i < amount; i++) {
            medallions.push(medallionSvg())
        }
        return medallions;
    }
    const selectAPrizeClick = (index: number) => {
        console.log("clicked")
        //call callback
        selectAPrize(index)
    }
    return (
        <div className="flex flex-col justify-center items-center">
            <div className="flex flex-wrap gap-6 justify-center m-10">
                {prizes && prizes.map((prize, index) => {
                    return (
                        <div className="bg-slate-100 rounded-xl p-8 bg-slate-300" onClick={() => selectAPrizeClick(index)}>
                            {prize.prizeType == PrizeType.MONEY ?
                                <span className="flex flex-row inline-block text-xl items-center align-center">{moneySvg()} {prize.amount}</span> :
                                //iterate x times over amount
                                renderMedallions(prize.amount)
                            }
                        </div>
                    )
                })
                }
            </div>
            <button
                onClick={() => {
                    lockPrize()
                }}
                className="w-60 block bg-green-500 border border-green-500 rounded-md p-2 text-xl font-semibold text-white text-center hover:bg-green-500 h-fit"
            >
                Lock Prize Selection
            </button>
        </div>
    )
}

const PlayerArea = () => {
    return (
        <div>
            <h1>Player Area</h1>
        </div>
    )
}