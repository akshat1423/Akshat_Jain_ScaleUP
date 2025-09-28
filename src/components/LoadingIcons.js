import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const LoadingSpinner = ({ size = 'large', color = '#08313B', text = 'Loading...' }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spin.start();

    return () => spin.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinnerSize = size === 'large' ? 40 : size === 'medium' ? 24 : 16;

  return (
    <View style={styles.spinnerContainer}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderColor: color,
            borderTopColor: 'transparent',
            transform: [{ rotate: spin }],
          },
        ]}
      />
      {text && <Text style={[styles.spinnerText, { color }]}>{text}</Text>}
    </View>
  );
};

const LoadingDots = ({ color = '#08313B', text = 'Loading...' }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot2, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot3, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot1, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot2, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot3, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => animateDots());
    };

    animateDots();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsContainer}>
      <View style={styles.dots}>
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: dot1,
              transform: [
                {
                  scale: dot1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: dot2,
              transform: [
                {
                  scale: dot2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: dot3,
              transform: [
                {
                  scale: dot3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      {text && <Text style={[styles.dotsText, { color }]}>{text}</Text>}
    </View>
  );
};

const LoadingPulse = ({ color = '#08313B', text = 'Loading...' }) => {
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseValue]);

  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.pulseContainer}>
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      {text && <Text style={[styles.pulseText, { color }]}>{text}</Text>}
    </View>
  );
};

const LoadingWave = ({ color = '#08313B', text = 'Loading...' }) => {
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateWave = () => {
      Animated.stagger(200, [
        Animated.loop(
          Animated.sequence([
            Animated.timing(wave1, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(wave1, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(wave2, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(wave2, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(wave3, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(wave3, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };

    animateWave();
  }, [wave1, wave2, wave3]);

  return (
    <View style={styles.waveContainer}>
      <View style={styles.waveBars}>
        <Animated.View
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              transform: [
                {
                  scaleY: wave1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              transform: [
                {
                  scaleY: wave2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              transform: [
                {
                  scaleY: wave3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      {text && <Text style={[styles.waveText, { color }]}>{text}</Text>}
    </View>
  );
};

const LoadingIcon = ({ type = 'spinner', size = 'large', color = '#08313B', text = 'Loading...' }) => {
  switch (type) {
    case 'dots':
      return <LoadingDots color={color} text={text} />;
    case 'pulse':
      return <LoadingPulse color={color} text={text} />;
    case 'wave':
      return <LoadingWave color={color} text={text} />;
    default:
      return <LoadingSpinner size={size} color={color} text={text} />;
  }
};

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 50,
    marginBottom: 12,
  },
  spinnerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
  },
  pulseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  waveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  waveBar: {
    width: 6,
    height: 20,
    borderRadius: 3,
  },
  waveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export {
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  LoadingWave,
  LoadingIcon,
};
