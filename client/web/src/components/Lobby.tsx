import CopyToClipboard from "react-copy-to-clipboard";
import QRCode from "react-qr-code";
import { ClipboardCopyIcon } from "@heroicons/react/outline";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import classNames from "classnames";
import styled, { keyframes } from "styled-components";
import { useHathoraContext } from "../context/GameContext";
import { RoundStatus } from "../../../../api/types";
import { useState } from "react";
import Card from "./Card";
import styles from '../constants/defaultStyles';
interface LobbyProps {
  status: RoundStatus;
}
const gradientAnimation = keyframes`
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
`;

const glowAnimation = keyframes`
    0% {
        box-shadow: 0 0 0px #ff0000;
    }
    100% {
        box-shadow: 0 0 10px #ff0000;
    }
`;

const AnimatedDiv = styled.div`
    position: relative;
    border: none;
    padding: 10px 15px;
    color: #fff;
    font-size: 18px;
    border-radius: 5px;
    &:hover .glow {
        animation: none;
        box-shadow: 0 0 10px #ff0000;
    }
`;

const AnimatedBackground = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, 
        #ff0000, #ff7f00, #ffff00, #00ff00, 
        #0000ff, #4b0082, #8b00ff);
    background-size: 400% 400%;
    background-position: 0% 50%;
    animation: ${gradientAnimation} 3s ease-in-out infinite;
    border-radius: 5px;
    z-index: -1;
`;

const Glow = styled.div`
    position: absolute;
    top: -5px;
    left: -5px;
    width: calc(100% + 10px);
    height: calc(100% + 10px);
    border-radius: 5px;
    box-shadow: 0 0 0px #ff0000;
    animation: ${glowAnimation} 2s ease-in-out infinite;
`;


export default function Lobby({ status }: LobbyProps) {
  const { gameId } = useParams();
  const { button } = styles;
  const { playerState, getUserName, startGame, user } = useHathoraContext();

  const playerCount = playerState?.players?.length ?? 0;
  const disableStartGame = playerCount < 2;
  return (
    <div className="flex items-center justify-center flex-col h-full bg-slate-100 py-5 h-full">
      <Card>
        <h2 className="text-xl tracking-tight font-bold text-gray-900 mb-2 text-center">Invite Friends</h2>
        <CopyToClipboard text={window.location.href} onCopy={() => toast.success("Copied room link to clipboard!")}>
          <div className="cursor-pointer w-full flex flex-col items-center">
            <QRCode className="m-0" value={window.location.href} />
            <div className="pl-5 mt-3 mb-3 text-md font-semibold flex items-center cursor-pointer">
              Room Code: {gameId} <ClipboardCopyIcon height={20} className={"h-fit mx-2"} />
            </div>
          </div>
        </CopyToClipboard>
        <div className="text-xl font-bold">Players in Lobby</div>
        {playerState?.players?.map((player) => (
          <div key={player.id} className="py-2 px-3 bg-slate-200 mx-1 border rounded border-solid shadow-gray-600 my-3">
            <div className="font-semibold">
              {player.id === user?.id ? "⭐ " : ""}
              {getUserName(player.id)}
            </div>
          </div>
        ))}
        <div className="flex flex-col my-4">
          <AnimatedDiv className="w-full text-center">
            <span className='text-white text-lg font-bold text-outline-red'>Bank ${playerState?.bank}</span>
            <AnimatedBackground />
            <Glow className='glow' />
          </AnimatedDiv>
          </div>
        <div className="flex flex-col gap-4">
          {disableStartGame && (
            <p className="text-xs text-gray-700">At least two players are required before starting the game</p>
          )}
          <button
            onClick={() => startGame()}
            disabled={disableStartGame}
            className={classNames(
              `h-fit w-full ${button.backgroundColor} ${button.default} ${button.fontColor} ${disableStartGame ? "bg-gray-500" : "bg-green-500"}`,
              {
                "opacity-50": disableStartGame,
              }
            )}
          >
            {status === RoundStatus.WAITING ? "Start Game" : "Start Round"}
          </button>
        </div>
      </Card>
    </div>
  );
}
