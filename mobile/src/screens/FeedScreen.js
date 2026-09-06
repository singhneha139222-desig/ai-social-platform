import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, RefreshControl } from 'react-native';
import api, { postAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

export default function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { socket } = useSocket();

  const fetchPosts = async () => {
    try {
      const res = await postAPI.getFeed();
      if (res.data && res.data.data) {
        setPosts(res.data.data.posts || []);
      }
    } catch (err) {
      console.error('Error fetching posts', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleModerationUpdate = (data) => {
      setPosts((currentPosts) => 
        currentPosts.map((post) => 
          post._id === data.postId 
            ? { ...post, moderationStatus: data.status, moderationScores: data.scores }
            : post
        )
      );
    };

    socket.on('moderation:update', handleModerationUpdate);

    return () => {
      socket.off('moderation:update', handleModerationUpdate);
    };
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (post) => {
    try {
      if (post.isLikedByMe) {
        await postAPI.unlikePost(post._id);
        setPosts((currentPosts) => 
          currentPosts.map((p) => 
            p._id === post._id 
              ? { ...p, isLikedByMe: false, likesCount: Math.max(0, p.likesCount - 1) }
              : p
          )
        );
      } else {
        await postAPI.likePost(post._id);
        setPosts((currentPosts) => 
          currentPosts.map((p) => 
            p._id === post._id 
              ? { ...p, isLikedByMe: true, likesCount: p.likesCount + 1 }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Error toggling like', err);
    }
  };

  const renderPost = ({ item }) => {
    const isPending = item.moderationStatus === 'pending';
    const isRejected = item.moderationStatus === 'rejected';

    return (
      <View style={styles.postCard}>
        <View style={styles.header}>
          <Text style={styles.author}>{item.author?.displayName || item.author?.username || 'Unknown User'}</Text>
          {isPending && <Text style={styles.badgePending}>Pending AI Review</Text>}
          {isRejected && <Text style={styles.badgeRejected}>Rejected</Text>}
        </View>
        <Text style={styles.content}>{item.content}</Text>
        
        {item.media && item.media.url && item.media.type === 'image' && (
          <Image 
            source={{ uri: `${api.defaults.baseURL}/media/${item.media.url}` }} 
            style={styles.mediaImage} 
            resizeMode="cover"
          />
        )}
        
        <View style={styles.footer}>
          <Text 
            style={[styles.likes, item.isLikedByMe && styles.likedActive]} 
            onPress={() => handleLike(item)}
          >
            {item.isLikedByMe ? '❤️' : '🤍'} {item.likesCount || 0}
          </Text>
          <Text style={styles.comments}>💬 {item.commentsCount || 0}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  author: { fontWeight: 'bold', fontSize: 16 },
  content: { fontSize: 14, color: '#333', marginBottom: 12 },
  mediaImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  footer: { flexDirection: 'row', gap: 16 },
  likes: { color: '#666' },
  comments: { color: '#666' },
  badgePending: { backgroundColor: '#fff3cd', color: '#856404', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, overflow: 'hidden' },
  badgeRejected: { backgroundColor: '#f8d7da', color: '#721c24', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, overflow: 'hidden' },
});
