import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const ShimmerEffect = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4, 
  style = {},
  children = null 
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
      {children}
    </View>
  );
};

export const ShimmerCard = ({ style = {} }) => (
  <View style={[styles.cardContainer, style]}>
    <ShimmerEffect height={20} width="70%" style={{ marginBottom: 8 }} />
    <ShimmerEffect height={16} width="100%" style={{ marginBottom: 8 }} />
    <ShimmerEffect height={16} width="85%" style={{ marginBottom: 12 }} />
    <View style={styles.cardFooter}>
      <ShimmerEffect height={14} width="30%" />
      <ShimmerEffect height={14} width="25%" />
    </View>
  </View>
);

export const ShimmerCommunityCard = ({ style = {} }) => (
  <View style={[styles.communityCardContainer, style]}>
    <View style={styles.communityHeader}>
      <ShimmerEffect height={40} width={40} borderRadius={20} style={{ marginRight: 12 }} />
      <View style={styles.communityTitleContainer}>
        <ShimmerEffect height={18} width="80%" style={{ marginBottom: 4 }} />
        <ShimmerEffect height={14} width="100%" style={{ marginBottom: 4 }} />
        <ShimmerEffect height={14} width="60%" />
      </View>
      <ShimmerEffect height={24} width={60} borderRadius={12} />
    </View>
    <View style={styles.communityStats}>
      <ShimmerEffect height={16} width="30%" />
      <ShimmerEffect height={16} width="25%" />
      <ShimmerEffect height={16} width="20%" />
    </View>
    <View style={styles.communityTags}>
      <ShimmerEffect height={24} width={60} borderRadius={12} style={{ marginRight: 6 }} />
      <ShimmerEffect height={24} width={80} borderRadius={12} style={{ marginRight: 6 }} />
      <ShimmerEffect height={24} width={70} borderRadius={12} />
    </View>
    <ShimmerEffect height={40} width="100%" borderRadius={10} style={{ marginTop: 12 }} />
  </View>
);

export const ShimmerMessage = ({ style = {} }) => (
  <View style={[styles.messageContainer, style]}>
    <ShimmerEffect height={32} width={32} borderRadius={16} style={{ marginRight: 12 }} />
    <View style={styles.messageContent}>
      <ShimmerEffect height={14} width="30%" style={{ marginBottom: 4 }} />
      <ShimmerEffect height={16} width="100%" style={{ marginBottom: 4 }} />
      <ShimmerEffect height={16} width="80%" />
    </View>
  </View>
);

export const ShimmerFeedItem = ({ style = {} }) => (
  <View style={[styles.feedItemContainer, style]}>
    <View style={styles.feedHeader}>
      <ShimmerEffect height={40} width={40} borderRadius={20} style={{ marginRight: 12 }} />
      <View style={styles.feedUserInfo}>
        <ShimmerEffect height={16} width="40%" style={{ marginBottom: 4 }} />
        <ShimmerEffect height={12} width="25%" />
      </View>
    </View>
    <ShimmerEffect height={18} width="100%" style={{ marginBottom: 8 }} />
    <ShimmerEffect height={16} width="100%" style={{ marginBottom: 4 }} />
    <ShimmerEffect height={16} width="90%" style={{ marginBottom: 12 }} />
    <View style={styles.feedFooter}>
      <ShimmerEffect height={14} width="20%" />
      <ShimmerEffect height={14} width="15%" />
    </View>
  </View>
);

export const ShimmerList = ({ count = 3, itemComponent, style = {} }) => (
  <View style={style}>
    {Array.from({ length: count }, (_, index) => (
      <View key={index} style={{ marginBottom: 16 }}>
        {itemComponent}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E2EDF1',
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    width: '100%',
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  communityCardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  communityTitleContainer: {
    flex: 1,
  },
  communityStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  communityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  messageContent: {
    flex: 1,
  },
  feedItemContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedUserInfo: {
    flex: 1,
  },
  feedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default ShimmerEffect;
