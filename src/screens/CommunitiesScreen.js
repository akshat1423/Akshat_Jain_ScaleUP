import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useStore } from '../state/store';
import CommunityCard from '../components/CommunityCard';

export default function CommunitiesScreen(){
  const { communities, api, refresh, user, loading } = useStore();
  const parents = useMemo(()=> communities.filter(c => !c.parentId), [communities]);
  const children = useMemo(()=> communities.filter(c => c.parentId), [communities]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const create = async ()=>{
    if(!name.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }
    setIsCreating(true);
    try {
      await api.createCommunity({ name: name.trim(), parentId: parentId || null });
      setName(''); 
      setParentId('');
      setShowCreateForm(false);
      await refresh();
      Alert.alert('Success', 'Community created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create community');
    } finally {
      setIsCreating(false);
    }
  };

  const join = async (c)=>{
    if (c.members.includes(user.id)) {
      Alert.alert('Already Joined', 'You are already a member of this community');
      return;
    }
    setIsJoining(c.id);
    try {
      await api.joinCommunity({ userId: user.id, communityId: c.id });
      await refresh();
      Alert.alert('Success', `Joined ${c.name}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join community');
    } finally {
      setIsJoining(null);
    }
  };

  const autoJoin = async (c)=>{
    const childCommunities = children.filter(child => child.parentId === c.id);
    if (childCommunities.length === 0) {
      Alert.alert('No Sub-communities', 'This parent community has no sub-communities to auto-join');
      return;
    }
    
    Alert.alert(
      'Auto-Join Sub-communities', 
      `This will join you to all sub-communities of ${c.name}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join All', 
          onPress: async () => {
            setIsJoining(c.id);
            try {
              await api.autoJoinChild({ userId: user.id, parentId: c.id });
              await refresh();
              Alert.alert('Success', `Auto-joined sub-communities of ${c.name}!`);
            } catch (error) {
              Alert.alert('Error', 'Failed to auto-join sub-communities');
            } finally {
              setIsJoining(null);
            }
          }
        }
      ]
    );
  };

  const openCommunity = (c)=>{
    Alert.prompt('New Post in '+c.name, 'Type something to post', async (text)=>{
      if(!text) return;
      await api.createPost({ communityId: c.id, userId: user.id, text });
      refresh();
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#08313B" />
        <Text style={styles.loadingText}>Loading communities...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.h1}>Communities</Text>
        <Text style={styles.sub}>Create, join, and manage communities</Text>
      </View>

      <TouchableOpacity 
        style={styles.createButton} 
        onPress={() => setShowCreateForm(!showCreateForm)}
      >
        <Text style={styles.createButtonText}>
          {showCreateForm ? 'Cancel' : '+ Create New Community'}
        </Text>
      </TouchableOpacity>

      {showCreateForm && (
        <View style={styles.form}>
          <Text style={styles.label}>Create Community</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Community name (e.g., Hostel 8)" 
            value={name} 
            onChangeText={setName}
            autoCapitalize="words"
          />
          
          <Text style={styles.label}>Parent Community (Optional)</Text>
          <View style={styles.parentSelector}>
            <Text style={styles.parentText}>
              {parentId ? 
                parents.find(p => p.id === parentId)?.name || 'Invalid parent' : 
                'Select a parent community (leave empty for top-level)'
              }
            </Text>
            <TouchableOpacity 
              style={styles.selectorButton}
              onPress={() => {
                Alert.alert(
                  'Select Parent Community',
                  'Choose a parent community or create a top-level community',
                  [
                    { text: 'Top-level (No Parent)', onPress: () => setParentId('') },
                    ...parents.map(p => ({ 
                      text: p.name, 
                      onPress: () => setParentId(p.id) 
                    })),
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            >
              <Text style={styles.selectorButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.btn, isCreating && styles.btnDisabled]} 
            onPress={create}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Community</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={styles.section}>Parent Communities ({parents.length})</Text>
        {parents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No parent communities yet</Text>
            <Text style={styles.emptySubtext}>Create one to get started!</Text>
          </View>
        ) : (
          parents.map(item => (
            <View key={item.id} style={styles.communityItem}>
              <CommunityCard 
                item={item} 
                onPress={()=>openCommunity(item)}
                isMember={item.members.includes(user.id)}
              />
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    item.members.includes(user.id) && styles.actionBtnJoined
                  ]} 
                  onPress={()=>join(item)}
                  disabled={isJoining === item.id}
                >
                  {isJoining === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {item.members.includes(user.id) ? 'Joined' : 'Join'}
                    </Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.autoJoinBtn]} 
                  onPress={()=>autoJoin(item)}
                  disabled={isJoining === item.id}
                >
                  <Text style={[styles.actionBtnText, styles.autoJoinText]}>
                    Auto-Join Sub-communities
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.section}>Sub-communities ({children.length})</Text>
        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sub-communities yet</Text>
            <Text style={styles.emptySubtext}>Create some under parent communities!</Text>
          </View>
        ) : (
          children.map(item => (
            <View key={item.id} style={styles.communityItem}>
              <CommunityCard 
                item={item} 
                onPress={()=>openCommunity(item)}
                isMember={item.members.includes(user.id)}
              />
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    item.members.includes(user.id) && styles.actionBtnJoined
                  ]} 
                  onPress={()=>join(item)}
                  disabled={isJoining === item.id}
                >
                  {isJoining === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {item.members.includes(user.id) ? 'Joined' : 'Join'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FAFC' },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F4FAFC' 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: '#4B6A75' 
  },
  header: { 
    padding: 16, 
    paddingBottom: 8 
  },
  h1: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#08313B',
    marginBottom: 4
  },
  sub: { 
    fontSize: 16,
    color: '#4B6A75' 
  },
  createButton: {
    backgroundColor: '#08313B',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  form: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { 
    fontWeight: '700', 
    color: '#08313B', 
    marginBottom: 8,
    fontSize: 16
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#CCE1E8', 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 16, 
    backgroundColor: '#fff',
    fontSize: 16
  },
  parentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FBFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CCE1E8',
  },
  parentText: {
    flex: 1,
    fontSize: 16,
    color: '#4B6A75',
  },
  selectorButton: {
    backgroundColor: '#08313B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectorButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btn: { 
    backgroundColor: '#08313B', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: {
    backgroundColor: '#7aa0ac',
  },
  btnText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  section: { 
    fontSize: 20,
    fontWeight: '800', 
    color: '#08313B',
    marginBottom: 12
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B6A75',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7aa0ac',
  },
  communityItem: {
    marginBottom: 16,
  },
  actionRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8,
    marginBottom: 8
  },
  actionBtn: { 
    backgroundColor: '#08313B', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  actionBtnJoined: {
    backgroundColor: '#00D1B2',
  },
  actionBtnText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 14
  },
  autoJoinBtn: {
    backgroundColor: '#00D1B2',
  },
  autoJoinText: {
    color: '#042a2a',
  },
});
