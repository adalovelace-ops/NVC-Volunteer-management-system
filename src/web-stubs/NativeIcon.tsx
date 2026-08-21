import React from 'react';
import { Text } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

function NativeIcon({ name, size = 24, color = 'black', style, ...props }: IconProps) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          color: color,
        },
        style,
      ]}
      {...props}
    >
      ▪
    </Text>
  );
}

NativeIcon.glyphMap = {};

export default NativeIcon;
