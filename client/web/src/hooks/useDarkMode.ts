import { useState, useEffect } from 'react';

function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDarkMode = getIsDarkModeOnPageLoad();
    setDarkMode(isDarkMode);
  }, []);

  function getIsDarkModeOnPageLoad() {
    //local storage is used to override OS theme settings
    if(localStorage.getItem("theme") == "dark" || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)){
        return true
    }
    return false;
  }

  function toggleDarkMode() {
    setDarkMode(!darkMode);
    
    document.body.classList.toggle('dark', !darkMode);
  }

  return { darkMode, toggleDarkMode };
}

export default useDarkMode;
