import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ProfileEditScreenSimple({ navigation }) {
  console.log('ProfileEditScreenSimple - rendered with navigation:', navigation);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      <Text style={styles.subtitle}>This is a simple test screen</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          console.log('ProfileEditScreenSimple - goBack pressed');
          navigation.goBack();
        }}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAFC',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#08313B',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B6A75',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
