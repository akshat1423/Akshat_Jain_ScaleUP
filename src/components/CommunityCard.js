import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function CommunityCard({ item, onPress, isMember = false, onJoinRequest = null }){
  const getCommunityType = () => {
    return 'Community';
  };

  const getMemberCountText = () => {
    const count = item.memberCount || item.members?.length || 0;
    if (count === 0) return 'No members';
    if (count === 1) return '1 member';
    return `${count} members`;
  };

  const getPostCountText = () => {
    const count = item.posts?.length || 0;
    if (count === 0) return 'No posts';
    if (count === 1) return '1 post';
    return `${count} posts`;
  };

  const getPrivacyIcon = () => {
    switch (item.privacySetting) {
      case 'private':
        return '🔒';
      case 'restricted':
        return '🛡️';
      default:
        return '🌐';
    }
  };

  const getPrivacyText = () => {
    switch (item.privacySetting) {
      case 'private':
        return 'Private';
      case 'restricted':
        return 'Restricted';
      default:
        return 'Public';
    }
  };

  const handleJoinPress = () => {
    if (item.privacySetting === 'private' && !isMember) {
      if (onJoinRequest) {
        onJoinRequest(item);
      }
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity style={[styles.card, isMember && styles.cardJoined]} onPress={handleJoinPress}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {item.logoUrl && (
            <Image source={{ uri: item.logoUrl }} style={styles.logo} />
          )}
          <View style={styles.titleTextContainer}>
            <Text style={styles.name}>{item.name}</Text>
            {item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          {isMember && (
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>Joined</Text>
            </View>
          )}
        </View>
        <View style={styles.badgeContainer}>
          <View style={[styles.privacyBadge, styles[`${item.privacySetting}Badge`]]}>
            <Text style={styles.privacyIcon}>{getPrivacyIcon()}</Text>
            <Text style={[styles.privacyText, styles[`${item.privacySetting}Text`]]}>
              {getPrivacyText()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statText}>{getMemberCountText()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📝</Text>
          <Text style={styles.statText}>{getPostCountText()}</Text>
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🏷️</Text>
            <Text style={styles.statText}>{item.tags.length} tags</Text>
          </View>
        )}
      </View>

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
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
  cardJoined: {
    borderColor: '#00D1B2',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F8FBFC',
  },
  titleTextContainer: {
    flex: 1,
  },
  name: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#08313B',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#4B6A75',
    lineHeight: 18,
  },
  memberBadge: {
    backgroundColor: '#00D1B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  memberBadgeText: {
    color: '#042a2a',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  parentCommunityBadge: {
    backgroundColor: '#08313B',
  },
  subCommunityBadge: {
    backgroundColor: '#E2EDF1',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  parentCommunityText: {
    color: '#fff',
  },
  subCommunityText: {
    color: '#4B6A75',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  publicBadge: {
    backgroundColor: '#E8F5E8',
  },
  privateBadge: {
    backgroundColor: '#FFE8E8',
  },
  restrictedBadge: {
    backgroundColor: '#FFF4E6',
  },
  privacyIcon: {
    fontSize: 12,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  publicText: {
    color: '#2D5A2D',
  },
  privateText: {
    color: '#8B0000',
  },
  restrictedText: {
    color: '#B8860B',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 16,
  },
  statText: {
    fontSize: 14,
    color: '#4B6A75',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  tagText: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#7aa0ac',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
});
