import React from 'react';
import useDarkMode from '../hooks/useDarkMode';
import styles from '../constants/defaultStyles';
import { moonSvg, sunSvg } from '../App';

function DarkModeButton() {
    const { darkMode, toggleDarkMode } = useDarkMode();
    const { shadow } = styles.flat;

  return (
    <button
      className={`fixed bottom-0 right-0 m-4 p-2 rounded-full ${styles.button.backgroundColor} ${styles.button.fontColor} ${shadow} ${styles.glossy}`}
      onClick={toggleDarkMode}
    >
      {darkMode ? moonSvg() : sunSvg()}
    </button>
  );
}

export default DarkModeButton;
