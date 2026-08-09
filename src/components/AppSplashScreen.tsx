import React from 'react';
import SplashScreen from './SplashScreen';

interface AppSplashScreenProps {
  isLoading: boolean;
}

const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ isLoading }) => {
  if (!isLoading) return null;
  return <SplashScreen />;
};

export default AppSplashScreen;
