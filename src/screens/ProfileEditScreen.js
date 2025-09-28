import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Switch,
  Image,
  Linking
} from 'react-native';
import { useStore } from '../state/store';
import { 
  getFieldDisplayName, 
  getFieldDescription, 
  getPrivacyLevelOptions,
  getPrivacyLevelDisplayName,
  validatePrivacySettings,
  mergeWithDefaultPrivacySettings,
  PROFILE_FIELDS,
  PRIVACY_LEVELS
} from '../utils/privacy';

export default function ProfileEditScreen({ navigation }) {
  const { user, api, setUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  console.log('ProfileEditScreen - user data:', user);
  
  // Profile data state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    biography: user?.biography || '',
    major: user?.major || '',
    graduation_year: user?.graduation_year || '',
    location: user?.location || '',
    phone_number: user?.phone_number || '',
    linkedin_url: user?.linkedin_url || '',
    github_url: user?.github_url || '',
    interests: user?.interests || [],
    club_memberships: user?.club_memberships || [],
    enrolled_courses: user?.enrolled_courses || [],
  });
  
  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState(
    mergeWithDefaultPrivacySettings(user?.privacy_settings)
  );
  
  // Form state
  const [newInterest, setNewInterest] = useState('');
  const [newClub, setNewClub] = useState('');
  const [newCourse, setNewCourse] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        biography: user.biography || '',
        major: user.major || '',
        graduation_year: user.graduation_year || '',
        location: user.location || '',
        phone_number: user.phone_number || '',
        linkedin_url: user.linkedin_url || '',
        github_url: user.github_url || '',
        interests: user.interests || [],
        club_memberships: user.club_memberships || [],
        enrolled_courses: user.enrolled_courses || [],
      });
      setPrivacySettings(mergeWithDefaultPrivacySettings(user.privacy_settings));
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate privacy settings
      const validation = validatePrivacySettings(privacySettings);
      if (!validation.isValid) {
        Alert.alert('Invalid Privacy Settings', Object.values(validation.errors).join('\n'));
        setLoading(false);
        return;
      }

      // Update profile data
      const updatedUser = await api.updateUserProfile(profileData);
      
      // Update privacy settings
      await api.updatePrivacySettings(privacySettings);
      
      setUser(updatedUser);
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrivacyChange = (field, level) => {
    setPrivacySettings(prev => ({
      ...prev,
      [field]: level
    }));
  };

  const addArrayItem = (field, value, setter) => {
    if (value.trim()) {
      setProfileData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
      setter('');
    }
  };

  const removeArrayItem = (field, index) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const renderBasicInfo = () => {
    console.log('ProfileEditScreen - rendering basic info');
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Name *</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholder="Enter your name"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email *</Text>
        <TextInput
          style={[styles.textInput, styles.disabledInput]}
          value={profileData.email}
          editable={false}
          placeholder="Email cannot be changed"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Biography</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={profileData.biography}
          onChangeText={(value) => handleInputChange('biography', value)}
          placeholder="Tell others about yourself"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.location}
          onChangeText={(value) => handleInputChange('location', value)}
          placeholder="City, State, Country"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Phone Number</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.phone_number}
          onChangeText={(value) => handleInputChange('phone_number', value)}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
        />
      </View>
    </View>
    );
  };

  const renderAcademicInfo = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Academic Information</Text>
      
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Major</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.major}
          onChangeText={(value) => handleInputChange('major', value)}
          placeholder="Computer Science, Business, etc."
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Graduation Year</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.graduation_year?.toString()}
          onChangeText={(value) => handleInputChange('graduation_year', parseInt(value) || '')}
          placeholder="2024"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Enrolled Courses</Text>
        <View style={styles.arrayInputContainer}>
          <TextInput
            style={styles.arrayInput}
            value={newCourse}
            onChangeText={setNewCourse}
            placeholder="Add a course"
            onSubmitEditing={() => addArrayItem('enrolled_courses', newCourse, setNewCourse)}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addArrayItem('enrolled_courses', newCourse, setNewCourse)}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {profileData.enrolled_courses.map((course, index) => (
          <View key={index} style={styles.arrayItem}>
            <Text style={styles.arrayItemText}>{course}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeArrayItem('enrolled_courses', index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Interests</Text>
        <View style={styles.arrayInputContainer}>
          <TextInput
            style={styles.arrayInput}
            value={newInterest}
            onChangeText={setNewInterest}
            placeholder="Add an interest"
            onSubmitEditing={() => addArrayItem('interests', newInterest, setNewInterest)}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addArrayItem('interests', newInterest, setNewInterest)}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {profileData.interests.map((interest, index) => (
          <View key={index} style={styles.arrayItem}>
            <Text style={styles.arrayItemText}>{interest}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeArrayItem('interests', index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Club Memberships</Text>
        <View style={styles.arrayInputContainer}>
          <TextInput
            style={styles.arrayInput}
            value={newClub}
            onChangeText={setNewClub}
            placeholder="Add a club or organization"
            onSubmitEditing={() => addArrayItem('club_memberships', newClub, setNewClub)}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addArrayItem('club_memberships', newClub, setNewClub)}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {profileData.club_memberships.map((club, index) => (
          <View key={index} style={styles.arrayItem}>
            <Text style={styles.arrayItemText}>{club}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeArrayItem('club_memberships', index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  const renderContactInfo = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>LinkedIn URL</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.linkedin_url}
          onChangeText={(value) => handleInputChange('linkedin_url', value)}
          placeholder="https://linkedin.com/in/yourname"
          keyboardType="url"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>GitHub URL</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.github_url}
          onChangeText={(value) => handleInputChange('github_url', value)}
          placeholder="https://github.com/yourname"
          keyboardType="url"
        />
      </View>
    </View>
  );

  const renderPrivacySettings = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Privacy Settings</Text>
      <Text style={styles.privacyDescription}>
        Control who can see each piece of your profile information.
      </Text>
      
      {Object.values(PROFILE_FIELDS).map(field => {
        const options = getPrivacyLevelOptions(field);
        return (
          <View key={field} style={styles.privacyField}>
            <View style={styles.privacyFieldHeader}>
              <Text style={styles.privacyFieldLabel}>
                {getFieldDisplayName(field)}
              </Text>
              <Text style={styles.privacyFieldDescription}>
                {getFieldDescription(field)}
              </Text>
            </View>
            <View style={styles.privacyOptions}>
              {options.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.privacyOption,
                    privacySettings[field] === option.value && styles.privacyOptionSelected
                  ]}
                  onPress={() => handlePrivacyChange(field, option.value)}
                >
                  <Text style={[
                    styles.privacyOptionText,
                    privacySettings[field] === option.value && styles.privacyOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );

  const tabs = [
    { id: 'basic', label: 'Basic', icon: '👤' },
    { id: 'academic', label: 'Academic', icon: '🎓' },
    { id: 'personal', label: 'Personal', icon: '❤️' },
    { id: 'contact', label: 'Contact', icon: '📞' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
  ];

  console.log('ProfileEditScreen - rendering with activeTab:', activeTab);
  console.log('ProfileEditScreen - profileData:', profileData);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'basic' && renderBasicInfo()}
        {activeTab === 'academic' && renderAcademicInfo()}
        {activeTab === 'personal' && renderPersonalInfo()}
        {activeTab === 'contact' && renderContactInfo()}
        {activeTab === 'privacy' && renderPrivacySettings()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDF1',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#08313B',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#8B9BA3',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDF1',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B6A75',
  },
  activeTabLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#08313B',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2EDF1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#F8F9FA',
    color: '#8B9BA3',
  },
  arrayInputContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  arrayInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  arrayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  arrayItemText: {
    flex: 1,
    fontSize: 14,
    color: '#08313B',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 20,
    lineHeight: 20,
  },
  privacyField: {
    marginBottom: 24,
  },
  privacyFieldHeader: {
    marginBottom: 12,
  },
  privacyFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#08313B',
    marginBottom: 4,
  },
  privacyFieldDescription: {
    fontSize: 12,
    color: '#4B6A75',
  },
  privacyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  privacyOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  privacyOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  privacyOptionText: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '500',
  },
  privacyOptionTextSelected: {
    color: '#fff',
  },
});
