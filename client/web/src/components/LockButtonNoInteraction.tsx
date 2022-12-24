import styled, { css, keyframes } from "styled-components";
import { useState } from "react";
import { lockedButtonClass, lockSvg, unlockedButtonClass, unlockSvg } from "../App";

const clickFlashyAnimation = keyframes`
    0% {
        background-color: #fff;
    }
    50% {
        background-color: #000;
    }
    100% {
        background-color: #fff;
    }`;
const styles = css`
    animation: ${clickFlashyAnimation} 0.5s linear;
`;
const LockButtonStyled = styled.button`
    animation: ${({animate}: {animate: boolean}) => animate ? styles: ""};
`;
export default function LockButtonNoInteraction({
    isLocked,
    lockText,
    unlockText,
}: {
    isLocked: boolean;
    lockText: string;
    unlockText: string;
}) {
    const [animateNow, setAnimateNow] = useState(false);
    return (
        <LockButtonStyled
            animate={animateNow}
            className={isLocked ? lockedButtonClass : unlockedButtonClass}
        >
            {isLocked ? lockSvg() : unlockSvg()}
            {isLocked ? lockText : unlockText}
        </LockButtonStyled>
    );
}
