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

export default function MedallionDeal() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();

    return (
        <div>
            <SelectionArea prizeDraw={playerState?.prizeDraw} />
            <PlayerArea players={playerState?.prizeDraw?.players.filter((player) => player.id != user?.id)} getUserName={getUserName} />
        </div>
    )
}