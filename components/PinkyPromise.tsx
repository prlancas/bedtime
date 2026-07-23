import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  sealed: boolean;
  onSeal: () => void;
}

/** A cute, wiggling pinky the child taps to seal a promise. */
export function PinkyPromise({ sealed, onSeal }: Props) {
  const wiggle = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!sealed) {
      wiggle.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withTiming(12, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      wiggle.value = withTiming(0);
    }
  }, [sealed, wiggle]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wiggle.value}deg` }, { scale: scale.value }],
  }));

  function handlePress() {
    if (sealed) return;
    // Reanimated shared values are mutated via `.value` by design.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSequence(
      withTiming(1.4, { duration: 150 }),
      withTiming(1, { duration: 200 }),
    );
    onSeal();
  }

  return (
    <View className="items-center">
      <Pressable onPress={handlePress} disabled={sealed} accessibilityRole="button">
        <Animated.Text style={style} className="text-8xl">
          {sealed ? '🤝' : '🤙'}
        </Animated.Text>
      </Pressable>
      <Text className={`mt-2 text-sm font-bold ${sealed ? 'text-good' : 'text-moon'}`}>
        {sealed ? 'Pinky promise sealed!' : 'Tap the pinky to promise'}
      </Text>
    </View>
  );
}
