// src/context/ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const lightTheme = {
  name: 'light',
  darkMode: false,
  color: '#333',
  background: '#f0f0f0',
  menubarBg: '#ececec',
  panelBg: '#ffffff',
  borderColor: '#ccc',
  tableHeaderBg: '#f1f1f1',
  tableRowHover: 'rgba(0,0,0,0.04)',
  sideBg: '#efefef',
  tabActiveBg: '#ddd',
  tabActiveColor: '#000',
  inputBorder: '#ccc',
  inputBg: '#fff',
};

const darkTheme = {
  name: 'dark',
  darkMode: true,
  color: 'rgb(223,225,226)',
  background: 'rgb(44, 49, 54)',
  menubarBg: 'rgb(69,83,100)',
  panelBg: 'rgba(88, 90, 92, 0.81)',
  borderColor: 'transparent',
  tableHeaderBg: 'rgba(83, 83, 83, 0.91)',
  tableRowHover: 'rgba(168, 165, 165, 0.45)',
  sideBg: 'rgb(53, 58, 63)',
  tabActiveBg: '#777',
  tabActiveColor: '#fff',
  inputBorder: '#777',
  inputBg: 'rgba(25, 35, 45, 0)',
};

const ThemeContext = createContext();

function getInitialThemeName() {
  try {
    const saved = localStorage.getItem('app_theme');
    if (saved !== 'light' && saved !== 'dark') {
      return 'light'; 
    }
    return saved;
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(getInitialThemeName);

  useEffect(() => {
    try {
      localStorage.setItem('app_theme', themeName);
    } catch {}
  }, [themeName]);

  const currentTheme = themeName === 'dark' ? darkTheme : lightTheme;

  const setTheme = (newName) => {
    if (newName !== 'light' && newName !== 'dark') return;
    setThemeName(newName);
  };

  const toggleTheme = () => {
    setThemeName((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = {
    theme: currentTheme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
