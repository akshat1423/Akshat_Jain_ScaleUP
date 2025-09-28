import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../state/store';
import CommunityCard from '../components/CommunityCard';
import { ShimmerCommunityCard, ShimmerList } from '../components/ShimmerEffect';
import { LoadingIcon } from '../components/LoadingIcons';
import { api } from '../services/supabaseApi';

export default function CommunitiesScreen({ navigation }){
  const { communities, api: storeApi, refresh, user, loading, authLoading } = useStore();
  // Show all communities as a flat list, no parent/child distinction
  
  console.log('CommunitiesScreen - loading:', loading, 'authLoading:', authLoading, 'user:', user, 'communities:', communities);

  // Track if we've already refreshed on this focus to prevent infinite loops
  const hasRefreshedRef = useRef(false);

  // Auto-refresh when screen comes into focus (including when app opens)
  useFocusEffect(
    useCallback(() => {
      console.log('CommunitiesScreen focused - checking if refresh needed');
      
      // Only refresh if we have a user, auth is complete, and we haven't already refreshed
      if (user && !authLoading && !hasRefreshedRef.current) {
        console.log('CommunitiesScreen focused - triggering refresh');
        hasRefreshedRef.current = true;
        
        // Add a small delay to prevent immediate re-triggering
        setTimeout(() => {
          refresh();
        }, 100);
      }
      
      // Reset the flag when the screen loses focus
      return () => {
        hasRefreshedRef.current = false;
      };
    }, [user, authLoading]) // Removed refresh from dependencies to prevent infinite loop
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacySetting, setPrivacySetting] = useState('public');
  const [rules, setRules] = useState('');
  const [tags, setTags] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);

  const create = async ()=>{
    if(!name.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }
    setIsCreating(true);
    try {
      const tagsArray = tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      await storeApi.createCommunityComplete({ 
        name: name.trim(), 
        parentId: null, // Always create top-level communities
        description: description.trim(),
        privacySetting,
        rules: rules.trim(),
        tags: tagsArray,
        maxMembers: maxMembers ? parseInt(maxMembers) : null
      });
      setName(''); 
      setDescription('');
      setRules('');
      setTags('');
      setMaxMembers('');
      setShowCreateForm(false);
      setShowAdvancedForm(false);
      await refresh();
      Alert.alert('Success', 'Community created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create community');
    } finally {
      setIsCreating(false);
    }
  };

  const join = async (c)=>{
    console.log('Attempting to join community:', c.name, 'User:', user.id, 'Members:', c.members);
    console.log('User ID type:', typeof user.id, 'Member IDs types:', c.members.map(id => typeof id));
    console.log('Includes check result:', c.members.includes(user.id));
    
    if (c.members.includes(user.id)) {
      Alert.alert('Already Joined', 'You are already a member of this community');
      return;
    }
    setIsJoining(c.id);
    try {
      console.log('Calling joinCommunity API...');
      await storeApi.joinCommunity({ userId: user.id, communityId: c.id });
      console.log('Join successful, refreshing data...');
      await refresh();
      Alert.alert('Success', `Joined ${c.name}!`);
    } catch (error) {
      console.error('Error joining community:', error);
      
      // Handle duplicate key error specifically
      if (error.code === '23505') {
        Alert.alert('Already Joined', 'You are already a member of this community. Refreshing data...');
        await refresh(); // Refresh to get updated member data
      } else {
        Alert.alert('Error', `Failed to join community: ${error.message}`);
      }
    } finally {
      setIsJoining(null);
    }
  };

  const handleJoinRequest = async (c) => {
    Alert.prompt(
      'Request to Join',
      `This is a ${c.privacySetting} community. Send a message to the admins:`,
      async (message) => {
        try {
          await api.requestToJoinCommunity({
            communityId: c.id,
            message: message || '',
          });
          Alert.alert('Success', 'Join request sent!');
        } catch (error) {
          Alert.alert('Error', 'Failed to send join request');
        }
      }
    );
  };

  const openCommunity = (c) => {
    // Navigate to CommunityDetailScreen
    navigation.navigate('CommunityDetail', { 
      communityId: c.id, 
      communityName: c.name 
    });
  };

  const handleAutoJoin = async () => {
    Alert.alert(
      'Auto-Join Communities',
      'This will automatically join communities that match your profile information (major, interests, courses, etc.). Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Auto-Join', 
          onPress: async () => {
            try {
              setIsAutoJoining(true);
              const result = await storeApi.autoJoinCommunitiesByDomain(user.id);
              
              if (result.joinedCommunities.length > 0) {
                Alert.alert(
                  'Auto-Join Complete!',
                  `Successfully joined ${result.joinedCommunities.length} communities:\n\n${result.joinedCommunities.map(c => `• ${c.name}`).join('\n')}`,
                  [{ text: 'OK' }]
                );
                // Refresh communities data
                await refresh();
              } else {
                Alert.alert(
                  'No Matches Found',
                  'No communities were found that match your profile. Try adding more details to your interests, major, or biography.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error in auto-join:', error);
              Alert.alert('Auto-Join Error', 'Failed to auto-join communities. Please try again later.');
            } finally {
              setIsAutoJoining(false);
            }
          }
        }
      ]
    );
  };

  // Remove auto-join functionality since we're not showing parent/child relationships

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingIcon type="pulse" color="#08313B" text="Authenticating..." />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to view communities</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            // Try to refresh user
            console.log('Retrying authentication...');
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.h1}>Communities</Text>
          <Text style={styles.sub}>Create, join, and manage communities</Text>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.section}>Communities</Text>
          <ShimmerList 
            count={3} 
            itemComponent={<ShimmerCommunityCard />}
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refresh}
          colors={['#08313B']}
          tintColor="#08313B"
        />
      } showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.h1}>Communities</Text>
        <Text style={styles.sub}>Create, join, and manage communities</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={() => setShowCreateForm(!showCreateForm)}
        >
          <Text style={styles.createButtonText}>
            {showCreateForm ? 'Cancel' : '+ Create New Community'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.autoJoinButton, isAutoJoining && styles.autoJoinButtonDisabled]} 
          onPress={handleAutoJoin}
          disabled={isAutoJoining}
        >
          {isAutoJoining ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.autoJoinButtonText}>Auto-Join</Text>
          )}
        </TouchableOpacity>
      </View>

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
          
          <TextInput 
            style={styles.input} 
            placeholder="Description (optional)" 
            value={description} 
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Privacy Setting</Text>
          <View style={styles.privacySelector}>
            {['public', 'private', 'restricted'].map((setting) => (
              <TouchableOpacity
                key={setting}
                style={[
                  styles.privacyOption,
                  privacySetting === setting && styles.privacyOptionSelected
                ]}
                onPress={() => setPrivacySetting(setting)}
              >
                <Text style={[
                  styles.privacyOptionText,
                  privacySetting === setting && styles.privacyOptionTextSelected
                ]}>
                  {setting === 'public' ? '🌐 Public' : 
                   setting === 'private' ? '🔒 Private' : '🛡️ Restricted'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          

          <TouchableOpacity 
            style={styles.advancedButton}
            onPress={() => setShowAdvancedForm(!showAdvancedForm)}
          >
            <Text style={styles.advancedButtonText}>
              {showAdvancedForm ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </Text>
          </TouchableOpacity>

          {showAdvancedForm && (
            <View style={styles.advancedForm}>
              <TextInput 
                style={styles.input} 
                placeholder="Community Rules (optional)" 
                value={rules} 
                onChangeText={setRules}
                multiline
                numberOfLines={3}
              />
              
              <TextInput 
                style={styles.input} 
                placeholder="Tags (comma-separated, e.g., tech, programming)" 
                value={tags} 
                onChangeText={setTags}
              />

              <TextInput 
                style={styles.input} 
                placeholder="Max Members (optional)" 
                value={maxMembers} 
                onChangeText={setMaxMembers}
                keyboardType="numeric"
              />
            </View>
          )}

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
        <Text style={styles.section}>Communities ({communities.length})</Text>
        {communities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No communities yet</Text>
            <Text style={styles.emptySubtext}>Create one to get started!</Text>
          </View>
        ) : (
          communities.map(item => (
            <View key={item.id} style={styles.communityItem}>
              <CommunityCard 
                item={item} 
                onPress={()=>openCommunity(item)}
                onJoinRequest={()=>handleJoinRequest(item)}
                onJoin={()=>join(item)}
                isMember={item.members.includes(user.id)}
                isJoining={isJoining === item.id}
              />
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
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  createButton: {
    backgroundColor: '#08313B',
    flex: 1,
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
  autoJoinButton: {
    backgroundColor: '#00D1B2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autoJoinButtonDisabled: {
    backgroundColor: '#7aa0ac',
  },
  autoJoinButtonText: {
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
  privacySelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  privacyOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCE1E8',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  privacyOptionSelected: {
    backgroundColor: '#08313B',
    borderColor: '#08313B',
  },
  privacyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B6A75',
  },
  privacyOptionTextSelected: {
    color: '#fff',
  },
  advancedButton: {
    backgroundColor: '#F8FBFC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCE1E8',
    alignItems: 'center',
    marginBottom: 16,
  },
  advancedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#08313B',
  },
  advancedForm: {
    backgroundColor: '#F8FBFC',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCE1E8',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#08313B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
