import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, Image, Linking } from 'react-native';
import { useStore } from '../state/store';
import { ShimmerCard, ShimmerList } from '../components/ShimmerEffect';
import { LoadingIcon } from '../components/LoadingIcons';
import { 
  getFieldDisplayName, 
  getFieldDescription, 
  calculateProfileCompletion,
  getProfileCompletionSuggestions,
  PRIVACY_LEVELS,
  PROFILE_FIELDS
} from '../utils/privacy';

export default function ProfileScreen({ navigation }){
  const { user, communities, api, setUser } = useStore();
  const [achievements, setAchievements] = useState([]);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const myPosts = communities.flatMap(c => c.posts.filter(p => p.userId === user.id).map(p => ({...p, community:c.name})));

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load achievements (with error handling for missing table)
      try {
        const userAchievements = await api.getUserAchievements();
        setAchievements(userAchievements);
      } catch (achievementError) {
        console.log('Achievements table not available yet:', achievementError.message);
        setAchievements([]);
      }
      
      // Calculate profile completion
      const completion = calculateProfileCompletion(user);
      setProfileCompletion(completion);
      
      // Get suggestions for profile completion
      const profileSuggestions = getProfileCompletionSuggestions(user);
      setSuggestions(profileSuggestions);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.signOut();
              setUser(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = async () => {
    console.log('ProfileScreen - navigation object:', navigation);
    console.log('ProfileScreen - attempting to navigate to ProfileEdit');
    
    // Refresh user data to get latest profile information
    try {
      const currentUser = await api.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        console.log('ProfileScreen - refreshed user data:', currentUser);
      }
    } catch (error) {
      console.error('ProfileScreen - error refreshing user data:', error);
    }
    
    if (navigation && navigation.navigate) {
      navigation.navigate('ProfileEdit');
    } else {
      console.error('ProfileScreen - navigation object is not available');
    }
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
              setLoading(true);
              const result = await api.autoJoinCommunitiesByDomain(user.id);
              
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
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleOpenLink = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const renderProfileField = (field, value, label) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    
    return (
      <View key={field} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>
          {Array.isArray(value) ? value.join(', ') : value}
        </Text>
      </View>
    );
  };

  const renderAchievement = ({ item }) => (
    <View style={styles.achievementItem}>
      <View style={styles.achievementIcon}>
        <Text style={styles.achievementIconText}>🏆</Text>
      </View>
      <View style={styles.achievementContent}>
        <Text style={styles.achievementName}>{item.achievement_name}</Text>
        <Text style={styles.achievementDescription}>{item.description}</Text>
        <Text style={styles.achievementDate}>
          {new Date(item.earned_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.h1}>Profile</Text>
        <ShimmerList 
          count={4} 
          itemComponent={<ShimmerCard />}
          style={{ paddingHorizontal: 16, marginTop: 16 }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>Profile</Text>
      
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          {user.profile_picture_url ? (
            <Image source={{ uri: user.profile_picture_url }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>
              Profile Completion: {profileCompletion}%
            </Text>
            <View style={styles.completionBar}>
              <View style={[styles.completionFill, { width: `${profileCompletion}%` }]} />
            </View>
          </View>
        </View>
        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.autoJoinButton} onPress={handleAutoJoin}>
            <Text style={styles.autoJoinButtonText}>Auto-Join</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Basic Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Basic Information</Text>
        <Text style={styles.kpi}>Impact Points: <Text style={{color:'#08313B', fontWeight:'800'}}>{user.impact||0}</Text></Text>
        <Text style={styles.badge}>Badges: {user.badges?.length ? user.badges.join(', ') : '—'}</Text>
        
        {renderProfileField(PROFILE_FIELDS.BIOGRAPHY, user.biography, getFieldDisplayName(PROFILE_FIELDS.BIOGRAPHY))}
        {renderProfileField(PROFILE_FIELDS.LOCATION, user.location, getFieldDisplayName(PROFILE_FIELDS.LOCATION))}
      </View>

      {/* Academic Information */}
      {(user.major || user.graduation_year || (user.enrolled_courses && user.enrolled_courses.length > 0)) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Academic Information</Text>
          {renderProfileField(PROFILE_FIELDS.MAJOR, user.major, getFieldDisplayName(PROFILE_FIELDS.MAJOR))}
          {renderProfileField(PROFILE_FIELDS.GRADUATION_YEAR, user.graduation_year, getFieldDisplayName(PROFILE_FIELDS.GRADUATION_YEAR))}
          {renderProfileField(PROFILE_FIELDS.ENROLLED_COURSES, user.enrolled_courses, getFieldDisplayName(PROFILE_FIELDS.ENROLLED_COURSES))}
        </View>
      )}

      {/* Personal Information */}
      {(user.interests?.length > 0 || user.club_memberships?.length > 0 || user.personal_preferences?.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          {renderProfileField(PROFILE_FIELDS.INTERESTS, user.interests, getFieldDisplayName(PROFILE_FIELDS.INTERESTS))}
          {renderProfileField(PROFILE_FIELDS.CLUB_MEMBERSHIPS, user.club_memberships, getFieldDisplayName(PROFILE_FIELDS.CLUB_MEMBERSHIPS))}
          {renderProfileField(PROFILE_FIELDS.PERSONAL_PREFERENCES, user.personal_preferences, getFieldDisplayName(PROFILE_FIELDS.PERSONAL_PREFERENCES))}
        </View>
      )}

      {/* Contact Information */}
      {(user.linkedin_url || user.github_url || user.phone_number) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          {user.linkedin_url && (
            <TouchableOpacity 
              style={styles.linkContainer} 
              onPress={() => handleOpenLink(user.linkedin_url)}
            >
              <Text style={styles.linkText}>LinkedIn: {user.linkedin_url}</Text>
            </TouchableOpacity>
          )}
          {user.github_url && (
            <TouchableOpacity 
              style={styles.linkContainer} 
              onPress={() => handleOpenLink(user.github_url)}
            >
              <Text style={styles.linkText}>GitHub: {user.github_url}</Text>
            </TouchableOpacity>
          )}
          {user.phone_number && (
            <Text style={styles.fieldValue}>Phone: {user.phone_number}</Text>
          )}
        </View>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Achievements</Text>
          <FlatList
            data={achievements}
            keyExtractor={item => item.id}
            renderItem={renderAchievement}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Profile Completion Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Complete Your Profile</Text>
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.suggestionItem}
              onPress={handleEditProfile}
            >
              <Text style={styles.suggestionText}>
                Add {suggestion.displayName.toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
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
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F4FAFC', padding:16 },
  h1:{ fontSize:22, fontWeight:'800', color:'#08313B', marginBottom:10 },
  
  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    marginBottom: 12,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2EDF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#08313B',
  },
  profileInfo: {
    flex: 1,
  },
  completionContainer: {
    marginTop: 8,
  },
  completionText: {
    fontSize: 12,
    color: '#4B6A75',
    marginBottom: 4,
  },
  completionBar: {
    height: 4,
    backgroundColor: '#E2EDF1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  autoJoinButton: {
    backgroundColor: '#00D1B2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  autoJoinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Cards
  card:{ 
    backgroundColor:'#fff', 
    borderRadius:14, 
    padding:16, 
    borderWidth:1, 
    borderColor:'#E2EDF1', 
    marginBottom:12 
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 12,
  },
  
  // Profile Fields
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B6A75',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 14,
    color: '#08313B',
    lineHeight: 20,
  },
  linkContainer: {
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  
  // Basic Info
  name:{ fontSize:18, fontWeight:'800', color:'#08313B' },
  email:{ fontSize:14, color:'#4B6A75', marginTop:2 },
  kpi:{ color:'#4B6A75', marginTop:4 },
  badge:{ color:'#4B6A75', marginTop:2 },
  
  // Achievements
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIconText: {
    fontSize: 20,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#08313B',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#4B6A75',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 10,
    color: '#8B9BA3',
  },
  
  // Suggestions
  suggestionItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  suggestionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  
  // Posts
  section:{ marginTop:12, marginBottom:8, fontWeight:'800', color:'#08313B' },
  post:{ backgroundColor:'#fff', borderRadius:14, padding:12, borderWidth:1, borderColor:'#E2EDF1', marginBottom:10 },
  pTitle:{ color:'#08313B', fontWeight:'700' },
  pMeta:{ color:'#5B7A86', fontSize:12, marginTop:4 },
  empty:{ color:'#5B7A86', marginTop:20, textAlign:'center' },
  
  // Sign Out
  signOutButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
