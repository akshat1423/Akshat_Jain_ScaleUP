import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useStore } from '../state/store';

export default function ProfileScreen(){
  const { user, communities } = useStore();
  const myPosts = communities.flatMap(c => c.posts.filter(p => p.userId === user.id).map(p => ({...p, community:c.name})));
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.kpi}>Impact Points: <Text style={{color:'#08313B', fontWeight:'800'}}>{user.impact||0}</Text></Text>
        <Text style={styles.badge}>Badges: {user.badges?.length ? user.badges.join(', ') : '—'}</Text>
      </View>
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
        ListEmptyComponent={<Text style={styles.empty}>You haven’t posted yet. Join a community and post!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F4FAFC', padding:16 },
  h1:{ fontSize:22, fontWeight:'800', color:'#08313B', marginBottom:10 },
  card:{ backgroundColor:'#fff', borderRadius:14, padding:12, borderWidth:1, borderColor:'#E2EDF1', marginBottom:12 },
  name:{ fontSize:18, fontWeight:'800', color:'#08313B' },
  kpi:{ color:'#4B6A75', marginTop:4 },
  badge:{ color:'#4B6A75', marginTop:2 },
  section:{ marginTop:12, marginBottom:8, fontWeight:'800', color:'#08313B' },
  post:{ backgroundColor:'#fff', borderRadius:14, padding:12, borderWidth:1, borderColor:'#E2EDF1', marginBottom:10 },
  pTitle:{ color:'#08313B', fontWeight:'700' },
  pMeta:{ color:'#5B7A86', fontSize:12, marginTop:4 },
  empty:{ color:'#5B7A86', marginTop:20, textAlign:'center' }
});
