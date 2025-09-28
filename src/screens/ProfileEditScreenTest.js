import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert
} from 'react-native';
import { useStore } from '../state/store';

export default function ProfileEditScreenTest({ navigation }) {
  const { user, api, setUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    biography: user?.biography || '',
    major: user?.major || '',
    graduation_year: user?.graduation_year || '',
    location: user?.location || '',
  });

  console.log('ProfileEditScreenTest - user data:', user);
  console.log('ProfileEditScreenTest - profileData:', profileData);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        biography: user.biography || '',
        major: user.major || '',
        graduation_year: user.graduation_year || '',
        location: user.location || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log('Saving profile data:', profileData);
      
      // Filter out empty values and convert graduation_year to integer
      const cleanProfileData = {
        ...profileData,
        graduation_year: profileData.graduation_year ? parseInt(profileData.graduation_year) : null
      };
      
      const updatedUser = await api.updateUserProfile(cleanProfileData);
      setUser(updatedUser);
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message}`);
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

      <ScrollView style={styles.content}>
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
          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            style={styles.textInput}
            value={profileData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            placeholder="City, State, Country"
          />
        </View>
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
  content: {
    flex: 1,
    padding: 16,
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
});
