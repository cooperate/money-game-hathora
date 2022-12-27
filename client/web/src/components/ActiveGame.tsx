import styled from "styled-components";
import { useState } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";

import { useHathoraContext } from "../context/GameContext";
import { PickAPrize, PlayerStatus, RoundGameModule, RoundStatus } from "../../../../api/types";
import TopBar from "./TopBar";
import PickAPrizeComponent from "./PickAPrize";
import PrizeDraw from "./PrizeDraw";
import LowestUniqueBid from "./LowestUniqueBid";
import MagicMoneyMachine from "./MagicMoneyMachine";
import TransferMoneyComponent from "./TransferMoney";
import FinalResultsComponent from "./FinalResults";

const PlayerBoard = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
`;

const OpponentWrapper = styled.div<{ index: number; size: number }>`
  background-color: white;
  min-width: 250px;
  position: absolute;
  left: 0;
`;


export default function ActiveGame() {
  const { playerState, user, getUserName, startRound, endGame } = useHathoraContext();

  const { outerWidth } = useWindowSize();

  const currentUserIndex = playerState?.players.findIndex((p) => p.id === user?.id);
  const currentUser = currentUserIndex !== undefined ? playerState?.players[currentUserIndex] : undefined;

  const players = [
    ...(playerState?.players.slice(currentUserIndex || 0, playerState.players.length) || []),
    ...(playerState?.players.slice(0, currentUserIndex) || []),
  ];

  const isRoundOver = playerState?.roundStatus === RoundStatus.COMPLETED;
  const isRoundActive = playerState?.roundStatus === RoundStatus.ACTIVE;
  const renderGameModule = () => {
    switch(playerState?.currentGame) {
      case RoundGameModule.PRIZE_DRAW:
        return (
          <PrizeDraw />
        );
      case RoundGameModule.LOWEST_UNIQUE_BID:
        return (
          <LowestUniqueBid />
        );
      case RoundGameModule.MAGIC_MONEY_MACHINE:
        return (
          <MagicMoneyMachine />
        );
      case RoundGameModule.PICK_A_PRIZE:
        return (
          <PickAPrizeComponent />
        );
      case RoundGameModule.TRADING:
        return (
          <TransferMoneyComponent />
        );
      case RoundGameModule.FINAL_RESULTS:
        return (
          <FinalResultsComponent />
        );
    }
  }
  return (
    <div className="flex flex-col items-center justify-center bg-slate-100">
      <PlayerBoard>
        <TopBar />
        {renderGameModule()}
      </PlayerBoard>
    </div>
  );
}
