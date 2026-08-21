import React from 'react';
import { Text } from 'react-native';

export function createIconSet(glyphMap: Record<string, number>, fontName: string, fontFile: string) {
  if (typeof document !== 'undefined') {
    const styleId = `react-native-vector-icons-${fontName}`;
    if (!document.getElementById(styleId)) {
      const fontStyle = `
        @font-face {
          font-family: '${fontName}';
          src: url(${fontFile}) format('truetype');
        }
      `;
      const styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.appendChild(document.createTextNode(fontStyle));
      document.head.appendChild(styleTag);
    }
  }

  function Icon({ name, size = 24, color = 'black', style, ...props }: any) {
    const codePoint = glyphMap[name];
    const glyph = codePoint ? String.fromCodePoint(codePoint) : '?';
    return (
      <Text
        style={[
          {
            fontFamily: fontName,
            fontSize: size,
            color: color,
            backgroundColor: 'transparent',
          },
          style,
        ]}
        {...props}
      >
        {glyph}
      </Text>
    );
  }

  Icon.glyphMap = glyphMap;
  return Icon;
}
