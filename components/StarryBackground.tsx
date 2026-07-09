import { useMemo } from 'react';
import { View } from 'react-native';

/** Cheap decorative starfield rendered behind screens for a night-sky feel. */
export function StarryBackground() {
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        key: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.6 + 0.2,
      })),
    [],
  );

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {stars.map((s) => (
        <View
          key={s.key}
          style={{
            position: 'absolute',
            top: s.top as unknown as number,
            left: s.left as unknown as number,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: '#FDE68A',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}
