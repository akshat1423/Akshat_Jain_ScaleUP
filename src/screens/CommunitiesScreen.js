import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useStore } from '../state/store';
import CommunityCard from '../components/CommunityCard';

export default function CommunitiesScreen(){
  const { communities, api, refresh, user } = useStore();
  const parents = useMemo(()=> communities.filter(c => !c.parentId), [communities]);
  const children = useMemo(()=> communities.filter(c => c.parentId), [communities]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  const create = async ()=>{
    if(!name.trim()) return;
    await api.createCommunity({ name: name.trim(), parentId: parentId || null });
    setName(''); setParentId('');
    refresh();
  };

  const join = async (c)=>{
    await api.joinCommunity({ userId: user.id, communityId: c.id });
    refresh();
  };

  const autoJoin = async (c)=>{
    await api.autoJoinChild({ userId: user.id, parentId: c.id });
    refresh();
  };

  const openCommunity = (c)=>{
    Alert.prompt('New Post in '+c.name, 'Type something to post', async (text)=>{
      if(!text) return;
      await api.createPost({ communityId: c.id, userId: user.id, text });
      refresh();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Communities</Text>
        <Text style={styles.sub}>Create parent or sub-communities; join & auto-join flows</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Create community</Text>
        <TextInput style={styles.input} placeholder="Name (e.g., Hostel 8)" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Parent community ID (optional)" value={parentId} onChangeText={setParentId} />
        <TouchableOpacity style={styles.btn} onPress={create}><Text style={styles.btnText}>Create</Text></TouchableOpacity>
      </View>

      <Text style={styles.section}>Parent communities</Text>
      <FlatList
        data={parents}
        keyExtractor={i=>i.id}
        renderItem={({item})=>(
          <View>
            <CommunityCard item={item} onPress={()=>openCommunity(item)} />
            <View style={styles.row}>
              <TouchableOpacity style={styles.smallBtn} onPress={()=>join(item)}><Text style={styles.smallText}>Join</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn,{backgroundColor:'#00D1B2'}]} onPress={()=>autoJoin(item)}><Text style={[styles.smallText,{color:'#042a2a'}]}>Auto-Join Child</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Text style={styles.section}>Sub-communities</Text>
      <FlatList
        data={children}
        keyExtractor={i=>i.id}
        renderItem={({item})=>(
          <View>
            <CommunityCard item={item} onPress={()=>openCommunity(item)} />
            <View style={styles.row}>
              <TouchableOpacity style={styles.smallBtn} onPress={()=>join(item)}><Text style={styles.smallText}>Join</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F4FAFC', padding:16 },
  header:{ marginBottom:8 },
  h1:{ fontSize:22, fontWeight:'800', color:'#08313B' },
  sub:{ color:'#4B6A75' },
  form:{ backgroundColor:'#fff', borderRadius:14, padding:12, borderWidth:1, borderColor:'#E2EDF1', marginBottom:12 },
  label:{ fontWeight:'700', color:'#08313B', marginBottom:6 },
  input:{ borderWidth:1, borderColor:'#CCE1E8', borderRadius:10, padding:10, marginBottom:8, backgroundColor:'#fff' },
  btn:{ backgroundColor:'#08313B', padding:12, borderRadius:10, alignItems:'center' },
  btnText:{ color:'#fff', fontWeight:'800' },
  section:{ marginTop:12, marginBottom:8, fontWeight:'800', color:'#08313B' },
  row:{ flexDirection:'row', gap:8, marginBottom:10 },
  smallBtn:{ backgroundColor:'#08313B', paddingVertical:8, paddingHorizontal:12, borderRadius:10 },
  smallText:{ color:'#fff', fontWeight:'700' }
});
