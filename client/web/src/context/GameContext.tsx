import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useSessionstorageState } from "rooks";
import { HathoraClient, HathoraConnection } from "../../../.hathora/client";
import { ConnectionFailure } from "../../../.hathora/failures";
import { HathoraEvents, HathoraEventTypes, IInitializeRequest, PlayerState, RoundGameModule, RoundStatus } from "../../../../api/types";
import { lookupUser, Response, UserData } from "../../../../api/base";

export type HathoraEvent = {type: HathoraEventTypes.newRound; val: string} | {type: HathoraEventTypes.moneyTransfer; val: string} | {type: HathoraEventTypes.medallionTransfer; val: string}

interface GameContext {
  token?: string;
  login: () => Promise<string | undefined>;
  connect: (gameId: string) => Promise<HathoraConnection>;
  disconnect: () => void;
  createGame: () => Promise<string | undefined>;
  joinGame: (gameId: string) => Promise<void>;
  startGame: () => Promise<void>;
  startRound: () => Promise<void>;
  playerState?: PlayerState;
  connectionError?: ConnectionFailure;
  endGame: () => void;
  getUserName: (id: string) => string;
  user?: UserData;
  connecting?: boolean;
  loggingIn?: boolean;
  lockPrize: () => Promise<void>;
  selectAPrize: (prize: number) => Promise<void>;
  lockTickets: () => Promise<void>;
  enterTickets: (tickets: number) => Promise<void>;
  lockPaddle: () => Promise<void>;
  choosePaddle: (paddle: number) => Promise<void>;
  putMoneyInBox: (money: number) => Promise<void>;
  removeMoneyFromBox: (money: number) => Promise<void>;
  lockMoney: () => Promise<void>;
  lockTrading: () => Promise<void>;
  transferMoney: (amount: number, playerIdToSendTo: string) => Promise<void>;
}

export const getGameNameById = (roundGameModule: RoundGameModule | undefined): string => {
  switch (roundGameModule) {
    case RoundGameModule.LOWEST_UNIQUE_BID:
      return "Lowest Unique Bid";
    case RoundGameModule.PRIZE_DRAW:
      return "Prize Draw";
    case RoundGameModule.MAGIC_MONEY_MACHINE:
      return "Magic Money Machine";
    case RoundGameModule.PICK_A_PRIZE:
      return "Pick a Prize";
    default: 
      return "Money Game";
  }
};

export const getGameRoundByActiveGame = (roundGameModule: RoundGameModule | undefined, playerState: PlayerState | undefined): number => {
  switch (roundGameModule) {
    case RoundGameModule.LOWEST_UNIQUE_BID:
      return playerState?.lowestUniqueBidder?.round || 0;
    case RoundGameModule.PRIZE_DRAW:
      return playerState?.prizeDraw?.round || 0;
    case RoundGameModule.MAGIC_MONEY_MACHINE:
      return playerState?.magicMoneyMachine?.round || 0;
    case RoundGameModule.PICK_A_PRIZE:
      return playerState?.pickAPrize?.round || 0;
    default:
      return 0;
  }
};

interface HathoraContextProviderProps {
  children: ReactNode | ReactNode[];
}
const client = new HathoraClient();

const HathoraContext = createContext<GameContext | null>(null);

const handleResponse = async (prom?: Promise<Response>) => {
  const response = await prom;

  if (response?.type === "error") {
    toast.error(response.error, {
      position: "top-center",
      autoClose: 1000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  }

  return response;
};

export default function HathoraContextProvider({ children }: HathoraContextProviderProps) {
  const [token, setToken] = useSessionstorageState<string>(client.appId, "");
  const [connection, setConnection] = useState<HathoraConnection>();
  const [playerState, setPlayerState] = useState<PlayerState>();
  const [events, setEvents] = useState<HathoraEvents[]>();
  const [connectionError, setConnectionError] = useState<ConnectionFailure>();
  const [connecting, setConnecting] = useState<boolean>();
  const [loggingIn, setLoggingIn] = useState<boolean>();
  const [playerNameMapping, setPlayerNameMapping] = useSessionstorageState<Record<string, UserData>>(
    `${client.appId}_player_mapping`,
    {}
  );
  const [user, setUserInfo] = useState<UserData>();
  const isLoginIn = useRef(false);

  const login = async () => {
    if (!isLoginIn.current) {
      try {
        setLoggingIn(true);
        isLoginIn.current = true;
        const token = await client.loginAnonymous();
        if (token) {
          const user = HathoraClient.getUserFromToken(token);
          setUserInfo(user);
          setPlayerNameMapping((current) => ({ ...current, [user.id]: user }));
        }
        setToken(token);
        return token;
      } catch (e) {
        console.error(e);
      } finally {
        isLoginIn.current = false;
        setLoggingIn(false);
      }
    }
  };

  const connect = useCallback(
    async (stateId: string) => {
      setConnecting(true);
      const connection = await client.connect(token, stateId, ({ state, events } : { state: PlayerState, events: HathoraEvents[]}) => {
        setPlayerState(state)
        setEvents(events)
      }, setConnectionError);
      setConnection(connection);
      setConnecting(false);
      return connection;
    },
    [token]
  );

  const disconnect = useCallback(() => {
    if (connection !== undefined) {
      connection.disconnect();
      setConnection(undefined);
      setPlayerState(undefined);
      setEvents(undefined);
      setConnectionError(undefined);
    }
  }, [connection]);

  const createGame = useCallback(async () => {
    if (token) {
      return client.create(token, IInitializeRequest.default());
    } else {
      const token = (await login()) ?? "";

      return client.create(token, IInitializeRequest.default());
    }
  }, [token]);

  const joinGame = useCallback(
    async (gameId: string) => {
      const connection = await connect(gameId);
      await connection.joinGame({});
    },
    [token, connect]
  );

  const startRound = useCallback(async () => {
    if (connection) {
      await handleResponse(connection.startRound({}));
    }
  }, [connection]);

  const startGame = useCallback(
    async (startingChips = 1000, startingBlind = 10) => {
      if (connection) {
        if (playerState?.roundStatus === RoundStatus.WAITING) {
          await handleResponse(connection.startGame({ startingChips, startingBlind }));
        }
        await startRound();
      }
    },
    [connection, playerState]
  );

  const endGame = () => {
    setPlayerState(undefined);
    connection?.disconnect();
  };

  const lockTrading = useCallback(async () => {
    if (connection) {
      await handleResponse(connection.lockTrading({}));
    }
  }, [connection]);

  const transferMoney = useCallback(
    async (amount: number, playerIdToSendTo: string) => {
      if (connection) {
        await handleResponse(connection.transferMoney({ amount, playerIdToSendTo }));
      }
    },
    [connection]
  );

  const lockPrize = useCallback(async () => {
    if (connection) {
      await handleResponse(connection.lockPrizeSelection({}));
    }
  }, [connection]);

  const selectAPrize = useCallback(async (prizeNumber: number) => {
    if(connection) {
      await handleResponse(connection.selectAPrize({ prizeNumber }));
    }
  }, [connection]);

  const lockTickets = useCallback(async () => {
    if (connection) {
      await handleResponse(connection.lockTickets({}));
    }
  }, [connection]);

  const enterTickets = useCallback(async (tickets: number) => {
    if (connection) {
      await handleResponse(connection.enterTicketsAmount({ tickets }));
    }
  }, [connection]);

  //Lowest Unique Bid
  const choosePaddle = useCallback(async (paddleNumber: number) => {
    if (connection) {
      await handleResponse(connection.choosePaddle({ paddleNumber }));
    }
  }, [connection]);

  const lockPaddle = useCallback(async () => {
    if (connection) {
      await handleResponse(connection.lockPaddle({}));
    }
  }, [connection]);

  const putMoneyInBox = useCallback(async (amount: number) => {
    if (connection) {
      await handleResponse(connection.putMoneyInBox({ amount }));
    }
  }, [connection]);

  const removeMoneyFromBox = useCallback(async (amount: number) => {
    if (connection) {
      await handleResponse(connection.removeMoneyFromBox({ amount }));
    }
  }, [connection]);

  const lockMoney = useCallback(async () => {
    if (connection) {
      await handleResponse(connection.lockMoney({}));
    }
  }, [connection]);

  useEffect(() => {
    if (connectionError) {
      toast.error(connectionError?.message);
    }
  }, [connectionError]);

  const getUserName = useCallback(
    (userId: string) => {
      if (Boolean(playerNameMapping[userId])) {
        return playerNameMapping[userId].name;
      } else {
        lookupUser(userId).then((response) => {
          setPlayerNameMapping((curr) => ({ ...curr, [userId]: response }));
        });
        return userId;
      }
    },
    [playerNameMapping]
  );

  useEffect(() => {
    if (token) {
      setUserInfo(HathoraClient.getUserFromToken(token));
    }
  }, [token]);

  useEffect(() => {
    if (playerState?.activePlayer && playerState.roundStatus === RoundStatus.ACTIVE) {
    }
  }, [playerState?.activePlayer, playerState?.roundStatus]);

  useEffect(() => {
    //create a toast message for events
    //get last index from events array
    //iterate through events array and create a toast for each event
    events?.map((event: HathoraEvents) => {
      toast(event.val, { position: "top-center" });
    });
  }, [events]);

  return (
    <HathoraContext.Provider
      value={{
        token,
        login,
        createGame,
        connect,
        connecting,
        joinGame,
        disconnect,
        playerState,
        connectionError,
        startGame,
        startRound,
        loggingIn,
        user,
        endGame,
        getUserName,
        lockPrize,
        selectAPrize,
        lockTickets,
        enterTickets,
        lockPaddle,
        choosePaddle,
        putMoneyInBox,
        removeMoneyFromBox,
        lockMoney,
        lockTrading,
        transferMoney
      }}
    >
      {children}
      <ToastContainer
        autoClose={2000}
        limit={3}
        newestOnTop={true}
        position="top-center"
        pauseOnFocusLoss={false}
        hideProgressBar={true}
      />
    </HathoraContext.Provider>
  );
}

export function useHathoraContext() {
  const context = useContext(HathoraContext);
  if (!context) {
    throw new Error("Component must be within the HathoraContext");
  }
  return context;
}
