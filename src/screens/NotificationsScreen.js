import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { ShimmerCard, ShimmerList } from '../components/ShimmerEffect';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen(){
  const { notifications, refreshNotifications } = useStore();

  useEffect(() => {
    // Refresh notifications when the screen mounts
    refreshNotifications();
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_post':
        return '📝';
      case 'new_event':
        return '📅';
      case 'new_poll':
        return '📊';
      case 'new_announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'new_post':
        return '#4CAF50';
      case 'new_event':
        return '#2196F3';
      case 'new_poll':
        return '#FF9800';
      case 'new_announcement':
        return '#F44336';
      default:
        return '#FFC107';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={i=>i.id}
        renderItem={({item})=>(
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
              <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={styles.text}>{item.text}</Text>
              <Text style={styles.time}>{formatDistanceToNow(item.ts, {addSuffix:true})}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          notifications === null ? (
            <ShimmerList 
              count={4} 
              itemComponent={<ShimmerCard />}
              style={{ marginTop: 16 }}
            />
          ) : (
            <Text style={styles.empty}>No notifications yet.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F4FAFC', padding:16 },
  h1:{ fontSize:22, fontWeight:'800', color:'#08313B', marginBottom:10 },
  row:{ flexDirection:'row', gap:10, padding:12, backgroundColor:'#fff', borderRadius:14, borderWidth:1, borderColor:'#E2EDF1', marginBottom:10 },
  iconContainer:{ width:40, height:40, borderRadius:20, justifyContent:'center', alignItems:'center' },
  icon:{ fontSize:20 },
  text:{ color:'#08313B', fontWeight:'700' },
  time:{ color:'#5B7A86', fontSize:12 },
  empty:{ color:'#5B7A86', marginTop:20, textAlign:'center' }
});
