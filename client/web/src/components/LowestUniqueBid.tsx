import styled, { css, keyframes } from "styled-components";
import { useEffect, useState } from "react";
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
import Card from "./Card";

interface PaddleContainer {
  chosen: boolean;
  animation: boolean;
}

const PaddleContainer = styled.div<PaddleContainer>`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #5c5c5c;
  border-radius: 20px;
  padding: 10px;
  width: 100px;
  height: 50px;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease-in-out;
  &:hover {
    cursor: pointer;
    transform: scale(1.1);
    background-color: #ffa600;
  }
  ${({ chosen }) =>
    chosen &&
    css`
      &:hover {
        cursor: pointer;
        transform: scale(1.1);
        background-color: #4caf50;
      }
      background-color: #4caf50;
    `}
  ${({ animation }) =>
    animation &&
    css`
      &:hover {
        cursor: default;
      }
      animation: ripple 1s ease-in-out;
      @keyframes ripple {
        0% {
          transform: scale(0);
          background-color: transparent;
          border: 2px solid #4caf50;
        }
        70% {
          transform: scale(1);
          background-color: #4caf50;
          border: none;
        }
        100% {
          transform: scale(1);
          background-color: transparent;
          border: none;
        }
      }
    `}
`;

const PaddleText = styled.p`
  color: white;
  font-size: 1.2rem;
`;
const Paddle = ({ text, onClick, chosen }: { text: string; onClick?: () => void; chosen?: boolean }) => {
  const [animation, setAnimation] = useState(false);
  useEffect(() => {
    if (chosen) {
      setAnimation(true);
      setTimeout(() => {
        setAnimation(false);
      }, 300);
    }
  }, [chosen]);
  const handleClick = () => {
    onClick && onClick();
  };
  return (
    <PaddleContainer onClick={() => handleClick()} chosen={chosen || false} animation={animation}>
      <PaddleText>{text}</PaddleText>
    </PaddleContainer>
  );
};

const PlayerStatus = ({
  multipliersPerRound,
  medallionsPerRound,
}: {
  multipliersPerRound: number[];
  medallionsPerRound: number[];
}) => {
  return (
    <div className="flex flex-row justify-center gap-4 mb-4">
      <div className="flex flex-row justify-center bg-moneyBlack player-statusblock max-w-sm p-6 border bg-white border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-white-800 dark:border-gray-700 dark:hover:bg-gray-700 gap-4">
        {multipliersPerRound.map((multiplier: number, index: number) => (
          <Card key={index}>
            <div className="flex flex-row">
              <div className="flex flex-row items-center text-sm font-bold">{moneySvg()} X</div>
              <div className="text-2xl font-bold">{multiplier}</div>
            </div>
            <div className="flex flex-row items-center">
              <div className="text-sm font-bold">{medallionSvg()}</div>
              <div className="text-sm font-bold">{medallionsPerRound[index]}</div>
            </div>
          </Card>
        ))}
      </div>
      <GameInfoModal
        title={"Lowest Unique Bid Rules"}
        text={
          "Each player selects one paddle to make a bid.  The winner is the player who selects the lowest value paddle not chosen by anyone else.  The winner receives the paddle value multiplied by the current rounds pot."
        }
      />
    </div>
  );
};

const SelectionArea = ({
  lowestUniqueBidder,
  getUserName,
}: {
  lowestUniqueBidder: LowestUniqueBidder | undefined;
  getUserName: any;
}) => {
  const { choosePaddle, lockPaddle, playerState } = useHathoraContext();
  const [keepRevealedPaddlesDisplayed, setKeepRevealedPaddlesDisplayed] = useState(false);

  useEffect(() => {
    //if the revealed paddles changes to be greater than 0 in the current round, then we need to reveal the paddle
    if (lowestUniqueBidder?.revealedPaddles[lowestUniqueBidder?.round]?.length || 0 > 0) {
      setKeepRevealedPaddlesDisplayed(true);
      //after 3 seconds of the revealed paddles being displayed, setKeepRevealedPaddlesDisplayed to false
      setTimeout(() => {
        setKeepRevealedPaddlesDisplayed(false);
      }, 3000);
    }
  }, lowestUniqueBidder?.revealedPaddles[lowestUniqueBidder?.round]);
  return (
    <div className="flex flex-col gap-4 mb-4">
      <Card>
        {(lowestUniqueBidder?.revealedPaddles[lowestUniqueBidder?.round]?.length || 0) === 0 &&
        !keepRevealedPaddlesDisplayed ? (
          <div className="flex flex-col">
            <div className="flex flex-col gap-2 justify-center items-center">
              <span className={"text-2xl font-bold"}>Choose a Paddle</span>
              <div className="flex flex-row justify-center items-center gap-2">
                {lowestUniqueBidder?.paddlesToChooseFrom.map((paddle: number) =>
                  playerState?.lowestUniqueBidder?.chosenPaddle === paddle ? (
                    <Paddle key={paddle} onClick={() => choosePaddle(paddle)} text={paddle.toString()} chosen={true} />
                  ) : (
                    <Paddle key={paddle} onClick={() => choosePaddle(paddle)} text={paddle.toString()} />
                  )
                )}
              </div>
            </div>
            {(lowestUniqueBidder?.round || 0) > 0 && (
              <div className="flex flex-col">
                <span className={"text-2xl font-bold"}>
                  Paddles Revealed In Round {(lowestUniqueBidder?.round || 0) - 1}{" "}
                </span>
                <div className="flex flex-row justify-center items-center gap-2">
                  {lowestUniqueBidder?.revealedPaddles[lowestUniqueBidder?.round - 1]?.map(
                    (revealedPaddle: RevealedPaddle, index: number) => (
                      <div
                        key={index}
                        className="rounded-lg justify-center items-center border bg-white border-gray-200 p-5 hover:-translate-y-1"
                      >
                        <div className="flex flex-col justify-center items-center gap-2">
                          <div className="text-2xl font-bold">Player</div>
                          <div className="text-2xl font-bold">
                            {nameAbbreviation(getUserName(revealedPaddle.playerId))}
                          </div>
                          <Paddle text={revealedPaddle.paddle.toString()} />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <span className={"text-2xl font-bold"}>Paddles Are Revealed!</span>
            {lowestUniqueBidder?.revealedPaddles[lowestUniqueBidder?.round]?.map(
              (revealedPaddle: RevealedPaddle, index: number) => (
                <div key={index} className="rounded-lg justify-center items-center border bg-white border-gray-200 p-5">
                  <div className="flex flex-col justify-center items-center gap-2">
                    <div className="text-2xl font-bold">Player</div>
                    <div className="text-2xl font-bold">{getUserName(revealedPaddle.playerId)}</div>
                    <Paddle text={revealedPaddle.paddle.toString()} />
                  </div>
                </div>
              )
            )}
          </>
        )}
      </Card>
      <LockButton
        callbackToLock={() => lockPaddle()}
        isLocked={lowestUniqueBidder?.lockedPaddle || false}
        lockText={"Paddle is locked."}
        unlockText={"Paddle is not locked."}
      />
    </div>
  );
};

const Winnings = ({
  winningsPerRound,
  medallionsPerRound,
}: {
  winningsPerRound: number[] | undefined;
  medallionsPerRound: number[] | undefined;
}) => (
  <Card>
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
  </Card>
);

const PlayerArea = ({
  players,
  getUserName,
}: {
  players: LowestUniqueBidderPlayers[] | undefined;
  getUserName: any;
}) => {
  const cardCss = "block max-w-sm p-6 bg-moneyBlack text-moneyText rounded-lg shadow-md";
  const headerTextCss = "mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white";
  return (
    <div className="flex flex-wrap m-8 gap-4">
      {players?.map((player: LowestUniqueBidderPlayers, index) => (
        <div key={index} className={cardCss}>
          <div className="flex flex-col items-center">
            <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
          </div>
          <div className="flex flex-col items-center">
            <Winnings winningsPerRound={player.winningsPerRound} medallionsPerRound={player.medallionsPerRound} />
          </div>
          <LockButtonNoInteraction
            isLocked={player.lockPaddle}
            lockText="Paddle has been locked."
            unlockText="Paddle not locked yet."
          />
        </div>
      ))}
    </div>
  );
};

export default function LowestUniqueBidComponent() {
  const { playerState, user, getUserName, startRound, endGame } = useHathoraContext();

  const getSelfPlayerStatus = (): LowestUniqueBidderPlayers | undefined => {
    return playerState?.lowestUniqueBidder?.players.find((player) => player.id === user?.id);
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <Winnings
        winningsPerRound={getSelfPlayerStatus()?.winningsPerRound}
        medallionsPerRound={getSelfPlayerStatus()?.medallionsPerRound}
      />
      <PlayerStatus
        multipliersPerRound={playerState?.lowestUniqueBidder?.multipliersPerRound || []}
        medallionsPerRound={playerState?.lowestUniqueBidder?.medallionsPerRound || []}
      />
      <SelectionArea lowestUniqueBidder={playerState?.lowestUniqueBidder} getUserName={getUserName} />
      <PlayerArea
        players={playerState?.lowestUniqueBidder?.players.filter((player) => player.id != user?.id)}
        getUserName={getUserName}
      />
    </div>
  );
}
