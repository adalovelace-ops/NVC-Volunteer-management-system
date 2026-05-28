import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PhotoMapMarkerProps = {
  accentColor: string;
  count?: number;
};

// Renders a plain pin marker for native maps.
export default function PhotoMapMarker({ accentColor, count }: PhotoMapMarkerProps) {
  const countLabel = typeof count === 'number' && count >= 0 ? String(Math.min(count, 99)) : '';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bubble, { backgroundColor: accentColor }]}>
        <View style={styles.innerDot} />
        {countLabel ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{countLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.pointer, { backgroundColor: accentColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  innerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  countBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  pointer: {
    width: 14,
    height: 14,
    marginTop: -5,
    borderBottomLeftRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
});
