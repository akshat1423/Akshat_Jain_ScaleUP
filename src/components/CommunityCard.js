import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function CommunityCard({ item, onPress }){
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={{flex:1}}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.parentId ? 'Sub-community' : 'Parent community'} • {item.members.length} members • {item.posts.length} posts
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#E2EDF1' },
  name:{ fontSize:18, fontWeight:'700', color:'#08313B' },
  meta:{ fontSize:12, color:'#4B6A75', marginTop:4 }
});
