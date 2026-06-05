import React from 'react';
import { StyleSheet, Image } from 'react-native';

type AppLogoProps = {
  width?: number;
};

// Displays the NVC logo image
export default function AppLogo({ width = 96 }: AppLogoProps) {
  const height = Math.round(width * 0.56); // NVC logo aspect ratio (approximately 1.77:1)

  return (
    <Image
      source={require('../assets/nvc-logo.png')}
      style={[styles.logo, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    resizeMode: 'contain',
  },
});
