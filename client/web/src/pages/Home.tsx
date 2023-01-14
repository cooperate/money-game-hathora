import { useState } from "react";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";

import { useHathoraContext } from "../context/GameContext";
import Logo from "../assets/hathora-hammer-logo-light.png";
import Card from "../components/Card";
import styled from 'styled-components';
import styles from "../constants/defaultStyles";

const BackgroundStyle = styled.div`
background-color: #ad9494;
`
export default function Home() {
  const navigate = useNavigate();
  const { createGame } = useHathoraContext();
  const [gameId, setGameId] = useState<string>();
  const {button} = styles;

  return (
    <div className="h-full flex justify-center bg-moneyPrimary dark:bg-moneyPrimaryDark items-center">
      <Card>
        <div className="flex flex-col justify-center items-center h-4/6 w-full text-2xl lg:text-4xl md:text-2xl font-semibold">
          <img src={`https://i.imgur.com/TFnR73a.png`} style={{ width: 300 }} alt="money-game" />
        </div>
        <div className="flex flex-col rounded bg-white dark:bg-black justify-center items-center h-2/6 w-full">
          <div className="flex md:flex-row flex-col w-full lg:w-3/4 w-3/4 md:mb-10 my-3">
            <input
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Room code here..."
              className="w-full flex-1 px-5 shadow py-3 border placeholder-gray-500 focus:ring-moneyPrimary focus:border-moneySecondary-500 focus:border-r-0 border-moneyPrimary-300 rounded-l md:rounder-r-0 md:mb-0 mb-5"
            />
            <button
              disabled={!gameId}
              onClick={() => {
                gameId && navigate(`/game/${gameId}`);
              }}
              className={classNames(
                `block bg-blue-800 border border-blue-800 rounded-r p-2 text-xl font-semibold text-white text-center hover:bg-blue-900 shadow`,
                {
                  "opacity-50": !gameId,
                }
              )}
            >
              Join Existing Game
            </button>
          </div>
          <div className="w-3/4 lg:w-3/4 flex justify-center items-center">
            <button
              onClick={() => {
                createGame().then((stateId) => {
                  navigate(`/game/${stateId}`);
                });
              }}
              className={`${button.default} ${button.backgroundColor} ${button.fontColor} h-fit`}
            >
              Create Game
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
