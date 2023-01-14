import React from "react";
import styles from "../constants/defaultStyles";
import styled from "styled-components";

interface CardProps {
  children: React.ReactNode;
  lightTheme?: boolean;
}

const StyledDiv = styled.div`
`;

const Card: React.FC<CardProps> = ({ children }) => {
  const { card, flat } = styles;
  return (
    <>
      <StyledDiv className={`${card} ${flat.shadow}`}>
        {children}
      </StyledDiv>
    </>
  );
};

export default Card;
