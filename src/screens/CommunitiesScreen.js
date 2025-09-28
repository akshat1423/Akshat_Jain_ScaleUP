import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useStore } from '../state/store';
import CommunityCard from '../components/CommunityCard';
import { api } from '../services/supabaseApi';

export default function CommunitiesScreen({ navigation }){
  const { communities, api: storeApi, refresh, user, loading, authLoading } = useStore();
  // Show all communities as a flat list, no parent/child distinction
  
  console.log('CommunitiesScreen - loading:', loading, 'authLoading:', authLoading, 'user:', user, 'communities:', communities);
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
    if (c.members.includes(user.id)) {
      Alert.alert('Already Joined', 'You are already a member of this community');
      return;
    }
    setIsJoining(c.id);
    try {
      await storeApi.joinCommunity({ userId: user.id, communityId: c.id });
      await refresh();
      Alert.alert('Success', `Joined ${c.name}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join community');
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
    // For now, we'll use a simple alert. In a real app, you'd navigate to the detail screen
    Alert.alert(
      'Community Details',
      `Would you like to view details for ${c.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => {
            // TODO: Navigate to CommunityDetailScreen
            // For now, just show community info
            Alert.alert(
              'Community Info',
              `Name: ${c.name}\nDescription: ${c.description || 'No description'}\nMembers: ${c.memberCount || c.members?.length || 0}\nPrivacy: ${c.privacySetting || 'public'}`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  // Remove auto-join functionality since we're not showing parent/child relationships

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#08313B" />
        <Text style={styles.loadingText}>Authenticating...</Text>
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
                      {item.members.includes(user.id) ? 'Joined' : 
                       item.privacySetting === 'private' ? 'Request to Join' : 'Join'}
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
