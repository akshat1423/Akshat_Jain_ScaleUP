// React Native File Picker Utility
// This is a mock implementation for demonstration purposes
// In a real app, you would use libraries like:
// - react-native-document-picker for documents
// - react-native-image-picker for images
// - react-native-audio-recorder-player for audio

import { Alert } from 'react-native';

export const pickFile = async (type) => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      'File Selection',
      `Select ${type} file`,
      [
        { text: 'Cancel', onPress: () => reject(new Error('User cancelled')) },
        { 
          text: 'Simulate Upload', 
          onPress: () => {
            // Create a mock file object for demonstration
            const mockFile = createMockFile(type);
            resolve(mockFile);
          }
        }
      ]
    );
  });
};

const createMockFile = (type) => {
  const fileTypes = {
    image: {
      name: 'sample_image.jpg',
      type: 'image/jpeg',
      size: Math.floor(Math.random() * 3000000) + 500000, // 0.5-3MB
      uri: 'file://mock_image.jpg'
    },
    audio: {
      name: 'sample_audio.mp3',
      type: 'audio/mpeg',
      size: Math.floor(Math.random() * 8000000) + 1000000, // 1-8MB
      uri: 'file://mock_audio.mp3'
    },
    document: {
      name: 'sample_document.pdf',
      type: 'application/pdf',
      size: Math.floor(Math.random() * 5000000) + 500000, // 0.5-5MB
      uri: 'file://mock_document.pdf'
    }
  };

  return fileTypes[type] || {
    name: 'sample_file.txt',
    type: 'text/plain',
    size: 1024,
    uri: 'file://mock_file.txt'
  };
};

export const validateFile = (file, expectedType) => {
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  const validTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  };

  if (!validTypes[expectedType]?.includes(file.type)) {
    throw new Error(`Invalid file type. Expected ${expectedType} file.`);
  }

  return true;
};

// Real implementation would use these libraries:
/*
import DocumentPicker from 'react-native-document-picker';
import ImagePicker from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

export const pickDocument = async () => {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
    });
    return result[0];
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      throw new Error('User cancelled');
    } else {
      throw err;
    }
  }
};

export const pickImage = async () => {
  return new Promise((resolve, reject) => {
    ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    }, (response) => {
      if (response.didCancel) {
        reject(new Error('User cancelled'));
      } else if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};

export const pickAudio = async () => {
  // Implementation would depend on the audio library used
  // This is just a placeholder
  throw new Error('Audio picker not implemented');
};
*/
