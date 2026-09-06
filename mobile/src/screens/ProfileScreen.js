import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function ProfileScreen({ route, navigation }) {
  const { user: currentUser, logout } = useAuth();
  const userId = route.params?.userId || currentUser._id;
  const isOwnProfile = userId === currentUser._id;
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get(`/users/${userId}`);
      setProfile(userRes.data.data.user);
      
      const postsRes = await api.get(`/posts/user/${userId}`);
      setPosts(postsRes.data.data.posts || []);
    } catch (err) {
      console.error('Error fetching profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (profile.isFollowedByMe) {
        await api.delete(`/users/${userId}/follow`);
        setProfile({ ...profile, isFollowedByMe: false, followersCount: profile.followersCount - 1 });
      } else {
        await api.post(`/users/${userId}/follow`);
        setProfile({ ...profile, isFollowedByMe: true, followersCount: profile.followersCount + 1 });
      }
    } catch (err) {
      console.error('Error following user', err);
    }
  };

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <Text style={styles.content}>{item.content}</Text>
      {item.media && item.media.url && item.media.type === 'image' && (
        <Image 
          source={{ uri: `${api.defaults.baseURL}/media/${item.media.url}` }} 
          style={styles.mediaImage} 
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.likes}>❤️ {item.likesCount || 0}</Text>
        <Text style={styles.comments}>💬 {item.commentsCount || 0}</Text>
      </View>
    </View>
  );

  if (loading || !profile) {
    return <View style={styles.container}><Text>Loading profile...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{profile.username.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.bio}>{profile.bio || 'No bio yet.'}</Text>
        
        <View style={styles.stats}>
          <Text style={styles.statText}><Text style={styles.bold}>{profile.followersCount}</Text> Followers</Text>
          <Text style={styles.statText}><Text style={styles.bold}>{profile.followingCount}</Text> Following</Text>
        </View>

        {!isOwnProfile ? (
          <TouchableOpacity style={[styles.followBtn, profile.isFollowedByMe && styles.unfollowBtn]} onPress={handleFollow}>
            <Text style={styles.btnText}>{profile.isFollowedByMe ? 'Unfollow' : 'Follow'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.btnText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        contentContainerStyle={styles.postsContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerInfo: { padding: 20, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  displayName: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  username: { fontSize: 14, color: '#666', marginBottom: 10 },
  bio: { fontSize: 14, color: '#444', textAlign: 'center', marginBottom: 15 },
  stats: { flexDirection: 'row', gap: 20, marginBottom: 15 },
  statText: { fontSize: 14, color: '#444' },
  bold: { fontWeight: 'bold', color: '#111' },
  followBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20 },
  unfollowBtn: { backgroundColor: '#9ca3af' },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20 },
  btnText: { color: '#fff', fontWeight: '600' },
  postsContainer: { padding: 15 },
  postCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  content: { fontSize: 16, color: '#333', marginBottom: 10 },
  mediaImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  likes: { fontSize: 14, color: '#666' },
  comments: { fontSize: 14, color: '#666' },
});
