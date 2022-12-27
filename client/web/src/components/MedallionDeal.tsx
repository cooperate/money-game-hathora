import styled, { css, keyframes } from "styled-components";
import { useState, useEffect } from "react";
import { useWindowSize } from "rooks";
import classNames from "classnames";
import { DecisionPlayerInfoPerspectiveVote, MedallionVoteDecisionPlayer, MedallionVotePlayersInfoPerspectiveDecision, MedallionVotePlayersInfoPerspectiveVote, MedallionVoteVotePlayer, PhasingPlayerMedallionVote, PickAPrizePlayers, PlayerBox, Prize, PrizeDraw, PrizeDrawPlayers, PrizeType } from "../../../../api/types";

import { getGameNameById, getGameRoundByActiveGame, useHathoraContext } from "../context/GameContext";
import { checkMarkSvg, lockedButtonClass, lockSvg, medallionSvg, moneySvg, unlockedButtonClass, unlockSvg, xMarkSvg } from "../App";
import LockButton from "./LockButton";
import GameInfoModal from "./GameInfoModal";
import { nameAbbreviation } from "./TopBar";
import LockButtonNoInteraction from "./LockButtonNoInteraction";

const SelectionAreaDecision = ({ medallionVoteDecisionPlayer }: { medallionVoteDecisionPlayer: MedallionVoteDecisionPlayer | undefined }) => {
    const { getUserName, putMoneyInBoxDecision, removeMoneyFromBoxDecision, lockDeposits } = useHathoraContext();
    const [moneyToDeposit, setMoneyToDeposit] = useState<PlayerBox[]>([]);
    const [moneyToWithdraw, setMoneyToWithdraw] = useState<PlayerBox[]>([]);
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';

    const componentEnterAmountDeposit = (id: string, money: number) => {
        //setMoneyToSend replace prevId with new amount
        const prevId = moneyToDeposit.find((player) => player.id === id);
        if (prevId) {
            const newMoneyToSend = moneyToDeposit.filter((player) => player.id !== id);
            setMoneyToDeposit([...newMoneyToSend, { id, money }]);
        } else {
            setMoneyToDeposit([...moneyToDeposit, { id, money }]);
        }
    }

    const componentEnterAmountWithdraw = (id: string, money: number) => {
        //setMoneyToSend replace prevId with new amount
        const prevId = moneyToWithdraw.find((player) => player.id === id);
        if (prevId) {
            const newMoneyToSend = moneyToWithdraw.filter((player) => player.id !== id);
            setMoneyToWithdraw([...newMoneyToSend, { id, money }]);
        } else {
            setMoneyToWithdraw([...moneyToWithdraw, { id, money }]);
        }
    }

    return (
        <div className='flex flex-col m-8 gap-4'>
            <div className='flex flex-row'>
                <span className='mb-2 text-lg font-bold'>Your Money {moneySvg()} {medallionVoteDecisionPlayer?.moneyAllocation}</span>
                <GameInfoModal title={'Medallion Majority Vote Rules'} text={'In this round the player with the most medallions (the decision player) is in charge of formulating a deal with other players (voter players) for the remaining money in the bank.  The player in the decision role is free to allocate as much money as they would like into each voter players box.  Each voter player will then observe the money in their box.  If the majority votes to approve the deal they have been given the money is distributed.  If the vote fails, a new round is started and the same process occurs again.  If a deal cannot be brokered over three rounds, no money is distributed.'} />
            </div>
            <div className="flex flex-col">
                <span className='mb-2 text-lg font-bold'>Deposit Money For Other Players To Make A Deal</span>
                <div className='flex flex-wrap'>
                    {medallionVoteDecisionPlayer?.votePlayers.map((player, index) => (
                        <div key={index} className='flex flex-col'>
                            <div className='flex flex-row'>
                                <input
                                    type="number"
                                    onChange={(e) => componentEnterAmountDeposit(player.id, parseFloat(e.target.value))}
                                    placeholder="Enter An Amount"
                                    className="w-full flex-1 px-5 shadow py-3 border placeholder-gray-500 border-gray-300 rounded-l md:rounder-r-0 md:mb-0 mb-5 in-range:border-green-500"
                                />
                                <button disabled={moneyToDeposit.find(playersMoney => playersMoney.id == player.id)?.money ? false : true} onClick={() => putMoneyInBoxDecision(player.id, moneyToDeposit.find(playerMoney => playerMoney.id == player.id)?.money || 0)} className={`block shadow-md ${moneyToDeposit.find(playersMoney => playersMoney.id == player.id)?.money ? 'bg-green-500 hover:bg-green-900' : 'bg-slate-500'} rounded p-2 font-semibold text-white text-center h-full`}>
                                    Place Money In Box
                                </button>
                            </div>
                            <div className={cardCss}>
                                <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                                <div className="flex flex-row items-center justify-center">
                                    <div className='flex flex-row'>
                                        <input
                                            type="number"
                                            onChange={(e) => componentEnterAmountWithdraw(player.id, parseFloat(e.target.value))}
                                            placeholder="Enter An Amount"
                                            className="w-full flex-1 px-5 shadow py-3 border placeholder-gray-500 border-gray-300 rounded-l md:rounder-r-0 md:mb-0 mb-5 in-range:border-green-500"
                                        />
                                        <button disabled={moneyToWithdraw.find(playersMoney => playersMoney.id == player.id)?.money ? false : true} onClick={() => removeMoneyFromBoxDecision(player.id, moneyToWithdraw.find(playerMoney => playerMoney.id == player.id)?.money || 0)} className={`block shadow-md ${moneyToWithdraw.find(playersMoney => playersMoney.id == player.id)?.money ? 'bg-green-500 hover:bg-green-900' : 'bg-slate-500'} rounded p-2 font-semibold text-white text-center h-full`}>
                                            Remove Money From Box
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <LockButton callbackToLock={() => lockDeposits()} lockText="Your Deal Has Been Locked" unlockText="Lock In Your Deal" isLocked={medallionVoteDecisionPlayer?.lockedDecision || false} />
            </div>
        </div>
    )
}
const PlayerAreaDecision = ({ players }: { players: MedallionVotePlayersInfoPerspectiveDecision[] | undefined }) => {
    const { getUserName } = useHathoraContext();
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';
    return (
        <div className='flex flex-wrap m-8 gap-4'>
            {players?.map((player: MedallionVotePlayersInfoPerspectiveDecision, index) => (
                <div key={index} className={cardCss}>
                    <div className="flex flex-col items-center">
                        <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                    </div>
                    <div className="flex flex-col items-center">

                        <div className="flex flex-col items-center">
                            Votes Per Round
                        </div>
                        <div className="flex flex-row items-center">
                            {player.votesPerRound.map((vote, index) => (
                                <span key={index} className="flex flex-col items-center">
                                    {vote ? checkMarkSvg() : xMarkSvg()}
                                </span>
                            ))}
                        </div>
                    </div>
                    <LockButtonNoInteraction isLocked={player.lockedVote} lockText="Has Locked Their Vote"
                        unlockText="Has Not Locked Vote" />
                </div>
            ))}
        </div>
    )
}

const SelectionAreaVoter = ({ medallionVoteVotePlayer }: { medallionVoteVotePlayer: MedallionVoteVotePlayer | undefined }) => {
    const { lockVote, submitVote } = useHathoraContext();
    return (
        <div className='flex flex-col'>
            {medallionVoteVotePlayer?.phasingPlayer === PhasingPlayerMedallionVote.VOTER ?
                <>
                    <span className='mb-2 text-lg font-bold'>Your Deal For This Round</span>
                    <div className='flex'>
                        <span>{moneySvg()} {medallionVoteVotePlayer?.moneyInBoxPerRound[medallionVoteVotePlayer?.round]}</span>
                    </div>
                    <span className='mb-2 text-lg font-bold'>Vote For This Deal</span>
                    <div className='flex flex-row'>
                        <button onClick={() => submitVote(true)} className='bg-green-500 hover:bg-green-900 text-white font-bold py-2 px-4 rounded'>
                            {checkMarkSvg()}
                        </button>
                        <button onClick={() => submitVote(false)} className='bg-red-500 hover:bg-red-900 text-white font-bold py-2 px-4 rounded'>
                            {xMarkSvg()}
                        </button>
                    </div>
                    <LockButton callbackToLock={() => lockVote()} isLocked={medallionVoteVotePlayer?.lockedVote} lockText="Lock Your Vote" unlockText="Unlock Your Vote" />
                </>
                :
                <>
                    <span className='mb-2 text-lg font-bold'>Waiting For Decision Player To Make A Deal</span>
                </>
            }
        </div>
    )
}

const PlayerAreaVoter = ({ votePlayers, decisionPlayer, phasingPlayer }: { votePlayers: MedallionVotePlayersInfoPerspectiveVote[] | undefined, decisionPlayer: DecisionPlayerInfoPerspectiveVote | undefined, phasingPlayer: PhasingPlayerMedallionVote | undefined }) => {
    const { getUserName } = useHathoraContext();
    const cardCss = 'block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700';
    const headerTextCss = 'mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white';
    return (
        <div className='flex flex-wrap m-8 gap-4'>
            {phasingPlayer === PhasingPlayerMedallionVote.VOTER ?
            votePlayers?.map((player: MedallionVotePlayersInfoPerspectiveVote, index) => (
                <div key={index} className={cardCss}>
                    <div className="flex flex-col items-center">
                        <div className={headerTextCss}>{nameAbbreviation(getUserName(player.id))}</div>
                    </div>
                    <LockButtonNoInteraction isLocked={player.lockedVote} lockText="Has Locked Their Vote"
                        unlockText="Has Not Locked Vote" />
                </div>
            ))
            :
            <div className={cardCss}>
                <div className="flex flex-col items-center">
                    <div className={headerTextCss}>{nameAbbreviation(getUserName(decisionPlayer?.id || ''))}</div>
                    <LockButtonNoInteraction isLocked={decisionPlayer?.lockDeposit || false} lockText="Has Locked Their Deal In." unlockText="Has Not Locked Their Deal In." />
                </div>
            </div>
            }
        </div>
    )
}

export default function MedallionDealComponent() {
    const { playerState, user, getUserName, startRound, endGame, lockPrize, selectAPrize } = useHathoraContext();
    //determine if player is decision or voter
    const [isDecision, setIsDecision] = useState(false);
    useEffect(() => {
        if (playerState?.medallionVoteDecisionPlayer) {
            setIsDecision(true);
        }
    }, [playerState]);
    return (
        <div>
            {isDecision ?
                <>
                    <SelectionAreaDecision medallionVoteDecisionPlayer={playerState?.medallionVoteDecisionPlayer} />
                    <PlayerAreaDecision players={playerState?.medallionVoteDecisionPlayer?.votePlayers} />
                </>
                :
                <>
                    <SelectionAreaVoter medallionVoteVotePlayer={playerState?.medallionVoteVotePlayer} />
                    <PlayerAreaVoter votePlayers={playerState?.medallionVoteVotePlayer?.votePlayers.filter((player) => player.id != user?.id)} decisionPlayer={playerState?.medallionVoteVotePlayer?.decisionPlayer} phasingPlayer={playerState?.medallionVoteVotePlayer?.phasingPlayer} />
                </>
            }
        </div>
    )
}