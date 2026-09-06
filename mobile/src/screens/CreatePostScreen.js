import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, ActivityIndicator, Alert, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { postAPI, mediaAPI } from '../services/api';
import StickerPicker from '../components/StickerPicker';

export default function CreatePostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [stickerUrl, setStickerUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !media && !stickerUrl) return;
    setLoading(true);
    try {
      let mediaData = null;
      if (media) {
        const formData = new FormData();
        const localUri = media.uri;
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `${media.type}/${match[1]}` : `${media.type}`;

        formData.append('media', { uri: localUri, name: filename, type });
        
        const uploadRes = await mediaAPI.upload(formData);
        mediaData = uploadRes.data.data;
      }

      const payload = { content };
      if (stickerUrl) payload.stickerUrl = stickerUrl;
      
      if (mediaData) {
        payload.mediaUrl = mediaData.filename;
        payload.mediaType = mediaData.type;
        payload.mimeType = mediaData.mimeType;
        payload.mediaSize = mediaData.sizeBytes;
      }

      await postAPI.create(payload);
      setContent('');
      setMedia(null);
      setStickerUrl(null);
      Alert.alert('Success', 'Post submitted for AI review!');
      navigation.navigate('Feed');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>What's on your mind?</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={6}
        value={content}
        onChangeText={setContent}
        placeholder="Write your post here..."
        textAlignVertical="top"
      />
      
      {media && (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
          <TouchableOpacity style={styles.removeMedia} onPress={() => setMedia(null)}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
          </TouchableOpacity>
        </View>
      )}

      {stickerUrl && (
        <View style={styles.stickerContainer}>
          <Image source={{ uri: stickerUrl }} style={styles.stickerPreview} resizeMode="contain" />
          <TouchableOpacity style={styles.removeMedia} onPress={() => setStickerUrl(null)}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <Button title="Attach Image/Video" onPress={pickMedia} color="#666" />
          <StickerPicker onSelect={setStickerUrl} style={{ justifyContent: 'center' }} />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0052cc" />
        ) : (
          <Button title="Publish Post" onPress={handleSubmit} color="#0052cc" disabled={!content.trim() && !media && !stickerUrl} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
  },
  mediaContainer: { position: 'relative', marginBottom: 20 },
  stickerContainer: { position: 'relative', marginBottom: 20, alignItems: 'center' },
  mediaPreview: { width: '100%', height: 200, borderRadius: 8 },
  stickerPreview: { width: 120, height: 120 },
  removeMedia: { position: 'absolute', top: -10, right: -10, backgroundColor: 'red', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actions: { gap: 12 },
});
