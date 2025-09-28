import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useStore } from '../state/store';

export default function ProfileScreen(){
  const { user, communities, api, refresh } = useStore();
  const [editMode, setEditMode] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  
  // Profile edit state
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    major: user.major || '',
    year: user.year || '',
    bio: user.bio || '',
    interests: user.interests?.join(', ') || '',
    clubs: user.clubs?.join(', ') || '',
    courses: user.courses?.join(', ') || ''
  });

  // Privacy settings state with proper defaults
  const defaultPrivacySettings = {
    profileVisibility: 'public',
    showMajor: true,
    showYear: true,
    showInterests: true,
    showClubs: true,
    showCourses: false,
    showBio: true,
    showImpactPoints: true
  };
  const [privacySettings, setPrivacySettings] = useState({
    ...defaultPrivacySettings,
    ...user.privacySettings
  });

  const myPosts = communities.flatMap(c => c.posts.filter(p => p.userId === user.id).map(p => ({...p, community:c.name})));

  const handleSaveProfile = async () => {
    try {
      const updatedData = {
        ...profileData,
        interests: profileData.interests ? profileData.interests.split(',').map(s => s.trim()).filter(s => s) : [],
        clubs: profileData.clubs ? profileData.clubs.split(',').map(s => s.trim()).filter(s => s) : [],
        courses: profileData.courses ? profileData.courses.split(',').map(s => s.trim()).filter(s => s) : []
      };
      
      await api.updateUserProfile({ userId: user.id, profileData: updatedData });
      setEditMode(false);
      refresh();
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSavePrivacySettings = async () => {
    try {
      await api.updatePrivacySettings({ userId: user.id, privacySettings });
      setShowPrivacySettings(false);
      refresh();
      Alert.alert('Success', 'Privacy settings updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy settings. Please try again.');
    }
  };

  const renderProfileView = () => (
    <View>
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <Text style={styles.name}>{user.name}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        {user.privacySettings?.showImpactPoints !== false && (
          <Text style={styles.kpi}>Impact Points: <Text style={{color:'#08313B', fontWeight:'800'}}>{user.impact||0}</Text></Text>
        )}
        
        {user.privacySettings?.showMajor !== false && user.major && (
          <Text style={styles.detail}>📚 {user.major}</Text>
        )}
        
        {user.privacySettings?.showYear !== false && user.year && (
          <Text style={styles.detail}>🎓 Class of {user.year}</Text>
        )}
        
        {user.privacySettings?.showBio !== false && user.bio && (
          <Text style={styles.bio}>{user.bio}</Text>
        )}
        
        {user.privacySettings?.showInterests !== false && user.interests?.length > 0 && (
          <Text style={styles.detail}>💡 Interests: {user.interests.join(', ')}</Text>
        )}
        
        {user.privacySettings?.showClubs !== false && user.clubs?.length > 0 && (
          <Text style={styles.detail}>🏛️ Clubs: {user.clubs.join(', ')}</Text>
        )}
        
        {user.privacySettings?.showCourses !== false && user.courses?.length > 0 && (
          <Text style={styles.detail}>📖 Courses: {user.courses.join(', ')}</Text>
        )}
        
        <Text style={styles.badge}>Badges: {user.badges?.length ? user.badges.join(', ') : '—'}</Text>
      </View>

      <View style={styles.privacyRow}>
        <TouchableOpacity style={styles.privacyBtn} onPress={() => setShowPrivacySettings(true)}>
          <Text style={styles.privacyBtnText}>⚙️ Privacy Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileEdit = () => (
    <View style={styles.card}>
      <Text style={styles.editTitle}>Edit Profile</Text>
      
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={profileData.name}
        onChangeText={(text) => setProfileData({...profileData, name: text})}
        placeholder="Your name"
      />
      
      <Text style={styles.label}>Major</Text>
      <TextInput
        style={styles.input}
        value={profileData.major}
        onChangeText={(text) => setProfileData({...profileData, major: text})}
        placeholder="e.g., Computer Science Engineering"
      />
      
      <Text style={styles.label}>Graduation Year</Text>
      <TextInput
        style={styles.input}
        value={profileData.year}
        onChangeText={(text) => setProfileData({...profileData, year: text})}
        placeholder="e.g., 2025"
      />
      
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={profileData.bio}
        onChangeText={(text) => setProfileData({...profileData, bio: text})}
        placeholder="Tell us about yourself..."
        multiline
        numberOfLines={3}
      />
      
      <Text style={styles.label}>Interests (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={profileData.interests}
        onChangeText={(text) => setProfileData({...profileData, interests: text})}
        placeholder="e.g., Machine Learning, Web Development"
      />
      
      <Text style={styles.label}>Clubs (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={profileData.clubs}
        onChangeText={(text) => setProfileData({...profileData, clubs: text})}
        placeholder="e.g., Coding Club, Tech Society"
      />
      
      <Text style={styles.label}>Courses (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={profileData.courses}
        onChangeText={(text) => setProfileData({...profileData, courses: text})}
        placeholder="e.g., CS101, MA101"
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrivacySettings = () => (
    <View style={styles.card}>
      <Text style={styles.editTitle}>Privacy Settings</Text>
      <Text style={styles.privacySubtitle}>Choose what others can see in your profile</Text>
      
      {[
        { key: 'showMajor', label: 'Show Major' },
        { key: 'showYear', label: 'Show Graduation Year' },
        { key: 'showInterests', label: 'Show Interests' },
        { key: 'showClubs', label: 'Show Clubs' },
        { key: 'showCourses', label: 'Show Courses' },
        { key: 'showBio', label: 'Show Bio' },
        { key: 'showImpactPoints', label: 'Show Impact Points' }
      ].map(setting => (
        <TouchableOpacity 
          key={setting.key}
          style={styles.privacyOption}
          onPress={() => setPrivacySettings({
            ...privacySettings, 
            [setting.key]: !privacySettings[setting.key]
          })}
        >
          <Text style={styles.privacyOptionText}>{setting.label}</Text>
          <Text style={styles.toggle}>
            {privacySettings[setting.key] !== false ? '✅' : '❌'}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPrivacySettings(false)}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrivacySettings}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>Profile</Text>
      
      {showPrivacySettings ? renderPrivacySettings() : (editMode ? renderProfileEdit() : renderProfileView())}
      
      {!editMode && !showPrivacySettings && (
        <>
          <Text style={styles.section}>Your Posts</Text>
          <FlatList
            data={myPosts}
            keyExtractor={i=>i.id}
            renderItem={({item})=>(
              <View style={styles.post}>
                <Text style={styles.pTitle}>{item.text}</Text>
                <Text style={styles.pMeta}>{item.community} • ▲{item.up} ▼{item.down}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>You haven't posted yet. Join a community and post!</Text>}
            scrollEnabled={false}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F4FAFC', padding:16 },
  h1:{ fontSize:22, fontWeight:'800', color:'#08313B', marginBottom:10 },
  card:{ backgroundColor:'#fff', borderRadius:14, padding:12, borderWidth:1, borderColor:'#E2EDF1', marginBottom:12 },
  
  // Profile header
  profileHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  name:{ fontSize:18, fontWeight:'800', color:'#08313B' },
  editBtn:{ backgroundColor:'#08313B', paddingHorizontal:12, paddingVertical:6, borderRadius:8 },
  editBtnText:{ color:'#fff', fontSize:12, fontWeight:'600' },
  
  // Profile details
  kpi:{ color:'#4B6A75', marginTop:4 },
  detail:{ color:'#4B6A75', marginTop:6, fontSize:14 },
  bio:{ color:'#08313B', marginTop:8, fontStyle:'italic', fontSize:14, lineHeight:20 },
  badge:{ color:'#4B6A75', marginTop:8 },
  
  // Privacy button
  privacyRow:{ marginBottom:12 },
  privacyBtn:{ backgroundColor:'#E8F4F8', padding:10, borderRadius:10, alignItems:'center' },
  privacyBtnText:{ color:'#08313B', fontWeight:'600' },
  
  // Edit form
  editTitle:{ fontSize:18, fontWeight:'800', color:'#08313B', marginBottom:16 },
  label:{ fontSize:14, fontWeight:'600', color:'#08313B', marginBottom:6, marginTop:12 },
  input:{ borderWidth:1, borderColor:'#CCE1E8', borderRadius:8, padding:12, backgroundColor:'#fff', fontSize:14 },
  textArea:{ minHeight:80, textAlignVertical:'top' },
  
  // Privacy settings
  privacySubtitle:{ color:'#4B6A75', marginBottom:16, fontSize:14 },
  privacyOption:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#E2EDF1' },
  privacyOptionText:{ fontSize:14, color:'#08313B' },
  toggle:{ fontSize:16 },
  
  // Buttons
  buttonRow:{ flexDirection:'row', justifyContent:'space-between', marginTop:20, gap:10 },
  cancelBtn:{ flex:1, backgroundColor:'#E2EDF1', padding:12, borderRadius:8, alignItems:'center' },
  cancelBtnText:{ color:'#4B6A75', fontWeight:'600' },
  saveBtn:{ flex:1, backgroundColor:'#08313B', padding:12, borderRadius:8, alignItems:'center' },
  saveBtnText:{ color:'#fff', fontWeight:'600' },
  
  // Posts section
  section:{ marginTop:12, marginBottom:8, fontWeight:'800', color:'#08313B' },
  post:{ backgroundColor:'#fff', borderRadius:14, padding:12, borderWidth:1, borderColor:'#E2EDF1', marginBottom:10 },
  pTitle:{ color:'#08313B', fontWeight:'700' },
  pMeta:{ color:'#5B7A86', fontSize:12, marginTop:4 },
  empty:{ color:'#5B7A86', marginTop:20, textAlign:'center' }
});