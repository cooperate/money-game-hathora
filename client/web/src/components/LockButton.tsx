import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { lockedButtonClass, lockSvg, unlockedButtonClass, unlockSvg } from "../App";

interface LockButtonProps {
    isLocked: boolean;
}

const LockButtonStyled = styled.button<LockButtonProps>`
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 20px;
  width: auto;
  height: 40px;
  font-size: 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 20px;
  text-transform: uppercase;
  font-weight: bold;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3);
  transition: background-color 0.2s ease-in-out;
  &:hover {
    cursor: pointer;
    background-color: #3e8e41;
  }
  ${({ isLocked }) => isLocked && css`
    background-color: #f44336;
    &:hover {
      background-color: #d32f2f;
    }
  `}
`
export default function LockButton({
    callbackToLock,
    isLocked,
    lockText,
    unlockText,
}: {
    callbackToLock: () => void;
    isLocked: boolean;
    lockText: string;
    unlockText: string;
}) {
    return (
        <LockButtonStyled
            isLocked={isLocked}
            onClick={callbackToLock}
        >
            {isLocked ? lockSvg() : unlockSvg()}
            {isLocked ? lockText : unlockText}
        </LockButtonStyled>
    );
}
