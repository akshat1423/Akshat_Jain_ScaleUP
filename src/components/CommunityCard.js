import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function CommunityCard({ item, onPress, isMember = false }){
  const getCommunityType = () => {
    if (item.parentId) {
      return 'Sub-community';
    }
    return 'Parent community';
  };

  const getMemberCountText = () => {
    const count = item.members.length;
    if (count === 0) return 'No members';
    if (count === 1) return '1 member';
    return `${count} members`;
  };

  const getPostCountText = () => {
    const count = item.posts.length;
    if (count === 0) return 'No posts';
    if (count === 1) return '1 post';
    return `${count} posts`;
  };

  return (
    <TouchableOpacity style={[styles.card, isMember && styles.cardJoined]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name}>{item.name}</Text>
          {isMember && (
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>Joined</Text>
            </View>
          )}
        </View>
        <View style={[styles.typeBadge, item.parentId ? styles.subCommunityBadge : styles.parentCommunityBadge]}>
          <Text style={[styles.typeText, item.parentId ? styles.subCommunityText : styles.parentCommunityText]}>
            {getCommunityType()}
          </Text>
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
      </View>
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
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#08313B',
    flex: 1,
  },
  memberBadge: {
    backgroundColor: '#00D1B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  memberBadgeText: {
    color: '#042a2a',
    fontSize: 12,
    fontWeight: '600',
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
  stats: {
    flexDirection: 'row',
    gap: 16,
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
});
