import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useStore } from '../state/store';
import { api } from '../services/supabaseApi';

const { width } = Dimensions.get('window');

export default function CommunityDetailScreen({ route, navigation }) {
  const { communityId } = route.params;
  const { user, api: storeApi } = useStore();
  const [community, setCommunity] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState('member');

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Events state
  const [events, setEvents] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    isVirtual: false,
    meetingLink: '',
    maxAttendees: '',
  });

  // Polls state
  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: '',
    options: ['', ''],
    allowMultipleVotes: false,
    expiresAt: '',
  });

  // Members state
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
  });

  // Sub-community creation state
  const [showCreateSubCommunity, setShowCreateSubCommunity] = useState(false);
  const [subCommunityForm, setSubCommunityForm] = useState({
    name: '',
    description: '',
    privacySetting: 'public',
    rules: '',
    tags: '',
    maxMembers: '',
  });

  useEffect(() => {
    loadCommunityData();
  }, [communityId]);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      const communityData = await api.getCommunityDetails(communityId);
      setCommunity(communityData);
      const memberStatus = communityData.members.includes(user.id);
      setIsMember(memberStatus);
      
      // Set user role - creator is admin, others are members for now
      if (communityData.createdBy === user.id) {
        setUserRole('admin');
      } else {
        setUserRole('member');
      }

      if (memberStatus) {
        // Load additional data only if user is a member
        await Promise.all([
          loadChatMessages(),
          loadEvents(),
          loadPolls(),
          loadMembers(),
          loadAnnouncements(),
        ]);
      }
    } catch (error) {
      console.error('Error loading community data:', error);
      Alert.alert('Error', 'Failed to load community details');
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async () => {
    try {
      const messages = await api.getChatMessages(communityId);
      setChatMessages(messages.reverse());
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const eventsData = await api.getCommunityEvents(communityId);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadPolls = async () => {
    try {
      const pollsData = await api.getCommunityPolls(communityId);
      setPolls(pollsData);
    } catch (error) {
      console.error('Error loading polls:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const membersData = await api.getCommunityMembers(communityId);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const announcementsData = await api.getCommunityAnnouncements(communityId);
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const handleJoinCommunity = async () => {
    if (community.privacySetting === 'private') {
      // Show join request modal
      Alert.prompt(
        'Request to Join',
        'This is a private community. Send a message to the admins:',
        async (message) => {
          try {
            await api.requestToJoinCommunity({
              communityId: community.id,
              message: message || '',
            });
            Alert.alert('Success', 'Join request sent!');
          } catch (error) {
            Alert.alert('Error', 'Failed to send join request');
          }
        }
      );
    } else {
      try {
        await storeApi.joinCommunity({ userId: user.id, communityId: community.id });
        setIsMember(true);
        await loadCommunityData();
        Alert.alert('Success', `Joined ${community.name}!`);
      } catch (error) {
        Alert.alert('Error', 'Failed to join community');
      }
    }
  };

  const handleLeaveCommunity = async () => {
    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave ${community.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeMember({ communityId: community.id, userId: user.id });
              setIsMember(false);
              Alert.alert('Success', 'Left community successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave community');
            }
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await api.sendChatMessage({
        communityId: community.id,
        message: newMessage.trim(),
      });
      setNewMessage('');
      await loadChatMessages();
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.eventDate) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await api.createEvent({
        communityId: community.id,
        title: eventForm.title,
        description: eventForm.description,
        eventDate: eventForm.eventDate,
        location: eventForm.location,
        isVirtual: eventForm.isVirtual,
        meetingLink: eventForm.meetingLink,
        maxAttendees: eventForm.maxAttendees ? parseInt(eventForm.maxAttendees) : null,
      });
      setShowCreateEvent(false);
      setEventForm({
        title: '',
        description: '',
        eventDate: '',
        location: '',
        isVirtual: false,
        meetingLink: '',
        maxAttendees: '',
      });
      await loadEvents();
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create event');
    }
  };

  const createPoll = async () => {
    if (!pollForm.question.trim() || pollForm.options.filter(opt => opt.trim()).length < 2) {
      Alert.alert('Error', 'Please provide a question and at least 2 options');
      return;
    }

    try {
      await api.createPoll({
        communityId: community.id,
        question: pollForm.question,
        options: pollForm.options.filter(opt => opt.trim()),
        allowMultipleVotes: pollForm.allowMultipleVotes,
        expiresAt: pollForm.expiresAt || null,
      });
      setShowCreatePoll(false);
      setPollForm({
        question: '',
        options: ['', ''],
        allowMultipleVotes: false,
        expiresAt: '',
      });
      await loadPolls();
      Alert.alert('Success', 'Poll created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create poll');
    }
  };

  const voteOnPoll = async (pollId, optionIndex) => {
    try {
      await api.votePoll({
        pollId: pollId,
        selectedOptions: [optionIndex],
      });
      await loadPolls(); // Refresh polls to show updated vote counts
      Alert.alert('Success', 'Vote recorded!');
    } catch (error) {
      console.error('Error voting on poll:', error);
      Alert.alert('Error', 'Failed to record vote');
    }
  };

  const createSubCommunity = async () => {
    if (!subCommunityForm.name.trim()) {
      Alert.alert('Error', 'Please enter a sub-community name');
      return;
    }

    try {
      const tagsArray = subCommunityForm.tags.trim() ? 
        subCommunityForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      
      await api.createCommunity({
        name: subCommunityForm.name.trim(),
        parentId: community.id, // This community becomes the parent
        description: subCommunityForm.description.trim(),
        privacySetting: subCommunityForm.privacySetting,
        rules: subCommunityForm.rules.trim(),
        tags: tagsArray,
        maxMembers: subCommunityForm.maxMembers ? parseInt(subCommunityForm.maxMembers) : null
      });
      
      setShowCreateSubCommunity(false);
      setSubCommunityForm({
        name: '',
        description: '',
        privacySetting: 'public',
        rules: '',
        tags: '',
        maxMembers: '',
      });
      
      Alert.alert('Success', 'Sub-community created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create sub-community');
    }
  };

  const createAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      Alert.alert('Error', 'Please provide both title and content');
      return;
    }

    try {
      await api.createAnnouncement({
        communityId: community.id,
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        priority: announcementForm.priority,
      });
      setShowCreateAnnouncement(false);
      setAnnouncementForm({
        title: '',
        content: '',
        priority: 'normal',
      });
      await loadAnnouncements();
      Alert.alert('Success', 'Announcement created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create announcement');
    }
  };

  const renderTabButton = (tab, label, icon) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {community.logoUrl && (
        <Image source={{ uri: community.logoUrl }} style={styles.communityLogo} />
      )}
      
      <Text style={styles.communityName}>{community.name}</Text>
      
      {community.description && (
        <Text style={styles.communityDescription}>{community.description}</Text>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{community.memberCount}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{community.posts?.length || 0}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{events.length}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{polls.length}</Text>
          <Text style={styles.statLabel}>Polls</Text>
        </View>
      </View>

      {isMember && (
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('chat')}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('events')}
            >
              <Text style={styles.quickActionIcon}>📅</Text>
              <Text style={styles.quickActionText}>Events</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('polls')}
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>Polls</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('announcements')}
            >
              <Text style={styles.quickActionIcon}>📢</Text>
              <Text style={styles.quickActionText}>Announcements</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('members')}
            >
              <Text style={styles.quickActionIcon}>👥</Text>
              <Text style={styles.quickActionText}>Members</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isMember && (userRole === 'admin' || userRole === 'moderator') && (
        <View style={styles.adminActionsContainer}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          <TouchableOpacity 
            style={styles.adminActionButton}
            onPress={() => setShowCreateSubCommunity(true)}
          >
            <Text style={styles.adminActionIcon}>🏘️</Text>
            <Text style={styles.adminActionText}>Create Sub-Community</Text>
          </TouchableOpacity>
        </View>
      )}

      {community.tags && community.tags.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {community.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {community.rules && (
        <View style={styles.rulesSection}>
          <Text style={styles.sectionTitle}>Community Rules</Text>
          <Text style={styles.rulesText}>{community.rules}</Text>
        </View>
      )}

      {!isMember && (
        <TouchableOpacity style={styles.joinButton} onPress={handleJoinCommunity}>
          <Text style={styles.joinButtonText}>
            {community.privacySetting === 'private' ? 'Request to Join' : 'Join Community'}
          </Text>
        </TouchableOpacity>
      )}

      {isMember && (
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveCommunity}>
          <Text style={styles.leaveButtonText}>Leave Community</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderChat = () => (
    <View style={styles.tabContent}>
      <View style={styles.chatHeader}>
        <Text style={styles.chatHeaderTitle}>Community Chat</Text>
        <Text style={styles.chatHeaderSubtitle}>
          {chatMessages.length} messages • {members.length} members online
        </Text>
      </View>

      <FlatList
        data={chatMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.messageItem,
            item.user_id === user.id && styles.ownMessage
          ]}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageAuthor}>{item.users?.name || 'Unknown'}</Text>
              <Text style={styles.messageTime}>
                {new Date(item.created_at).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.messageText}>{item.message}</Text>
            {item.message_type !== 'text' && (
              <Text style={styles.messageType}>
                {item.message_type === 'image' ? '📷 Image' : 
                 item.message_type === 'file' ? '📎 File' : 'System Message'}
              </Text>
            )}
          </View>
        )}
        style={styles.chatList}
        inverted
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.messageInputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <View style={styles.messageActions}>
          <Text style={styles.characterCount}>
            {newMessage.length}/500
          </Text>
          <TouchableOpacity
            style={[styles.sendButton, sendingMessage && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={sendingMessage || !newMessage.trim()}
          >
            {sendingMessage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEvents = () => (
    <View style={styles.tabContent}>
      <View style={styles.eventsHeader}>
        <Text style={styles.sectionTitle}>Community Events</Text>
        {userRole === 'admin' && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateEvent(true)}
          >
            <Text style={styles.createButtonText}>+ Create Event</Text>
          </TouchableOpacity>
        )}
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No events yet</Text>
          <Text style={styles.emptySubtext}>
            {userRole === 'admin' 
              ? 'Create the first event for this community!' 
              : 'Check back later for upcoming events!'}
          </Text>
        </View>
      ) : (
        events.map((event) => (
          <View key={event.id} style={styles.eventItem}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.eventStatus}>
                {new Date(event.event_date) > new Date() ? (
                  <Text style={styles.eventStatusText}>Upcoming</Text>
                ) : (
                  <Text style={[styles.eventStatusText, styles.eventStatusPast]}>Past</Text>
                )}
              </View>
            </View>
            
            <Text style={styles.eventDate}>
              📅 {new Date(event.event_date).toLocaleDateString()} at{' '}
              {new Date(event.event_date).toLocaleTimeString()}
            </Text>
            
            {event.location && (
              <Text style={styles.eventLocation}>📍 {event.location}</Text>
            )}
            
            {event.is_virtual && event.meeting_link && (
              <TouchableOpacity style={styles.eventLinkButton}>
                <Text style={styles.eventLinkText}>🔗 Join Virtual Event</Text>
              </TouchableOpacity>
            )}
            
            {event.description && (
              <Text style={styles.eventDescription}>{event.description}</Text>
            )}
            
            <View style={styles.eventFooter}>
              <Text style={styles.eventAttendees}>
                👥 {event.community_event_attendees?.length || 0} attending
              </Text>
              {event.max_attendees && (
                <Text style={styles.eventMaxAttendees}>
                  Max: {event.max_attendees}
                </Text>
              )}
            </View>
            
            <TouchableOpacity style={styles.attendButton}>
              <Text style={styles.attendButtonText}>RSVP</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderPolls = () => (
    <View style={styles.tabContent}>
      <View style={styles.pollsHeader}>
        <Text style={styles.sectionTitle}>Community Polls</Text>
        {userRole === 'admin' && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreatePoll(true)}
          >
            <Text style={styles.createButtonText}>+ Create Poll</Text>
          </TouchableOpacity>
        )}
      </View>

      {polls.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No polls yet</Text>
          <Text style={styles.emptySubtext}>
            {userRole === 'admin' 
              ? 'Create the first poll for this community!' 
              : 'Check back later for new polls!'}
          </Text>
        </View>
      ) : (
        polls.map((poll) => {
          const options = JSON.parse(poll.options || '[]');
          const totalVotes = poll.community_poll_votes?.length || 0;
          const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
          
          return (
            <View key={poll.id} style={styles.pollItem}>
              <View style={styles.pollHeader}>
                <Text style={styles.pollQuestion}>{poll.question}</Text>
                {isExpired && (
                  <View style={styles.pollExpiredBadge}>
                    <Text style={styles.pollExpiredText}>Expired</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.pollOptions}>
                {options.map((option, index) => {
                  // Get actual vote count for this option
                  const optionVotes = poll.community_poll_votes?.filter(vote => 
                    vote.selected_options?.includes(index)
                  ).length || 0;
                  const votePercentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;

                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.pollOption, isExpired && styles.pollOptionDisabled]}
                      disabled={isExpired}
                      onPress={() => voteOnPoll(poll.id, index)}
                    >
                      <View style={styles.pollOptionContent}>
                        <Text style={styles.pollOptionText}>{option}</Text>
                        <Text style={styles.pollOptionVotes}>
                          {optionVotes} votes ({votePercentage.toFixed(1)}%)
                        </Text>
                      </View>
                      <View 
                        style={[
                          styles.pollOptionBar, 
                          { width: `${votePercentage}%` }
                        ]} 
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <View style={styles.pollFooter}>
                <Text style={styles.pollVotes}>
                  📊 {totalVotes} total votes
                </Text>
                {poll.expires_at && (
                  <Text style={styles.pollExpiry}>
                    {isExpired ? 'Expired' : 'Expires'}: {new Date(poll.expires_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderMembers = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.membersButton}
        onPress={() => setShowMembers(true)}
      >
        <Text style={styles.membersButtonText}>
          View All Members ({members.length})
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showMembers}
        animationType="slide"
        onRequestClose={() => setShowMembers(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Community Members</Text>
            <TouchableOpacity onPress={() => setShowMembers(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberItem}>
                <Text style={styles.memberName}>{item.users?.name || 'Unknown'}</Text>
                <Text style={styles.memberEmail}>{item.users?.email}</Text>
                <Text style={styles.memberRole}>
                  {item.community_roles?.[0]?.role || 'member'}
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );

  const renderAnnouncements = () => (
    <View style={styles.tabContent}>
      {(userRole === 'admin' || userRole === 'moderator') && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateAnnouncement(true)}
        >
          <Text style={styles.createButtonText}>📢 Create Announcement</Text>
        </TouchableOpacity>
      )}

      {announcements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {userRole === 'admin' || userRole === 'moderator'
              ? 'No announcements yet. Create the first one!'
              : 'No announcements yet'}
          </Text>
        </View>
      ) : (
        announcements.map((announcement) => (
          <View key={announcement.id} style={styles.announcementItem}>
            <View style={styles.announcementHeader}>
              <Text style={styles.announcementTitle}>{announcement.title}</Text>
              <Text style={styles.announcementDate}>
                {new Date(announcement.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.announcementContent}>{announcement.content}</Text>
            <View style={styles.announcementFooter}>
              <Text style={styles.announcementAuthor}>
                By {announcement.users?.name || 'Unknown'}
              </Text>
              {announcement.priority === 'high' && (
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityText}>🔴 High Priority</Text>
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#08313B" />
        <Text style={styles.loadingText}>Loading community...</Text>
      </View>
    );
  }

  if (!community) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Community not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{community.name}</Text>
        <View style={styles.headerRight}>
          {isMember && userRole === 'admin' && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowCreateSubCommunity(true)}
            >
              <Text style={styles.headerButtonText}>+ Sub</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton('overview', 'Overview', '📋')}
        {isMember && renderTabButton('chat', 'Chat', '💬')}
        {isMember && renderTabButton('events', 'Events', '📅')}
        {isMember && renderTabButton('polls', 'Polls', '📊')}
        {isMember && renderTabButton('announcements', 'Announcements', '📢')}
        {isMember && renderTabButton('members', 'Members', '👥')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'chat' && isMember && renderChat()}
        {activeTab === 'events' && isMember && renderEvents()}
        {activeTab === 'polls' && isMember && renderPolls()}
        {activeTab === 'announcements' && isMember && renderAnnouncements()}
        {activeTab === 'members' && isMember && renderMembers()}
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={showCreateEvent} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Event</Text>
            <TouchableOpacity onPress={() => setShowCreateEvent(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Event Title *"
              value={eventForm.title}
              onChangeText={(text) => setEventForm({ ...eventForm, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={eventForm.description}
              onChangeText={(text) => setEventForm({ ...eventForm, description: text })}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Event Date & Time (YYYY-MM-DD HH:MM)"
              value={eventForm.eventDate}
              onChangeText={(text) => setEventForm({ ...eventForm, eventDate: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={eventForm.location}
              onChangeText={(text) => setEventForm({ ...eventForm, location: text })}
            />
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setEventForm({ ...eventForm, isVirtual: !eventForm.isVirtual })}
            >
              <Text style={styles.checkboxText}>
                {eventForm.isVirtual ? '☑️' : '☐'} Virtual Event
              </Text>
            </TouchableOpacity>
            {eventForm.isVirtual && (
              <TextInput
                style={styles.input}
                placeholder="Meeting Link"
                value={eventForm.meetingLink}
                onChangeText={(text) => setEventForm({ ...eventForm, meetingLink: text })}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Max Attendees (optional)"
              value={eventForm.maxAttendees}
              onChangeText={(text) => setEventForm({ ...eventForm, maxAttendees: text })}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.submitButton} onPress={createEvent}>
              <Text style={styles.submitButtonText}>Create Event</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Create Poll Modal */}
      <Modal visible={showCreatePoll} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Poll</Text>
            <TouchableOpacity onPress={() => setShowCreatePoll(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Poll Question *"
              value={pollForm.question}
              onChangeText={(text) => setPollForm({ ...pollForm, question: text })}
            />
            {pollForm.options.map((option, index) => (
              <TextInput
                key={index}
                style={styles.input}
                placeholder={`Option ${index + 1}`}
                value={option}
                onChangeText={(text) => {
                  const newOptions = [...pollForm.options];
                  newOptions[index] = text;
                  setPollForm({ ...pollForm, options: newOptions });
                }}
              />
            ))}
            <TouchableOpacity
              style={styles.addOptionButton}
              onPress={() => setPollForm({
                ...pollForm,
                options: [...pollForm.options, '']
              })}
            >
              <Text style={styles.addOptionText}>+ Add Option</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setPollForm({ ...pollForm, allowMultipleVotes: !pollForm.allowMultipleVotes })}
            >
              <Text style={styles.checkboxText}>
                {pollForm.allowMultipleVotes ? '☑️' : '☐'} Allow Multiple Votes
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Expires At (YYYY-MM-DD HH:MM) - Optional"
              value={pollForm.expiresAt}
              onChangeText={(text) => setPollForm({ ...pollForm, expiresAt: text })}
            />
            <TouchableOpacity style={styles.submitButton} onPress={createPoll}>
              <Text style={styles.submitButtonText}>Create Poll</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Create Announcement Modal */}
      <Modal visible={showCreateAnnouncement} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Announcement</Text>
            <TouchableOpacity onPress={() => setShowCreateAnnouncement(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Announcement Title *"
              value={announcementForm.title}
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, title: text })}
            />
            
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Announcement Content *" 
              value={announcementForm.content} 
              onChangeText={(text) => setAnnouncementForm({ ...announcementForm, content: text })}
              multiline
              numberOfLines={5}
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.prioritySelector}>
              {[
                { value: 'low', label: '🟢 Low', color: '#00D1B2' },
                { value: 'normal', label: '🟡 Normal', color: '#FFB400' },
                { value: 'high', label: '🔴 High', color: '#FF4757' }
              ].map((priority) => (
                <TouchableOpacity
                  key={priority.value}
                  style={[
                    styles.priorityOption,
                    announcementForm.priority === priority.value && styles.priorityOptionSelected,
                    { borderColor: priority.color }
                  ]}
                  onPress={() => setAnnouncementForm({ ...announcementForm, priority: priority.value })}
                >
                  <Text style={[
                    styles.priorityOptionText,
                    announcementForm.priority === priority.value && { color: priority.color }
                  ]}>
                    {priority.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={createAnnouncement}>
              <Text style={styles.submitButtonText}>Create Announcement</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Create Sub-Community Modal */}
      <Modal visible={showCreateSubCommunity} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Sub-Community</Text>
            <TouchableOpacity onPress={() => setShowCreateSubCommunity(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Sub-Community Name *"
              value={subCommunityForm.name}
              onChangeText={(text) => setSubCommunityForm({ ...subCommunityForm, name: text })}
              autoCapitalize="words"
            />
            
            <TextInput 
              style={styles.input} 
              placeholder="Description (optional)" 
              value={subCommunityForm.description} 
              onChangeText={(text) => setSubCommunityForm({ ...subCommunityForm, description: text })}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Privacy Setting</Text>
            <View style={styles.privacySelector}>
              {['public', 'private', 'restricted'].map((setting) => (
                <TouchableOpacity
                  key={setting}
                  style={[
                    styles.privacyOption,
                    subCommunityForm.privacySetting === setting && styles.privacyOptionSelected
                  ]}
                  onPress={() => setSubCommunityForm({ ...subCommunityForm, privacySetting: setting })}
                >
                  <Text style={[
                    styles.privacyOptionText,
                    subCommunityForm.privacySetting === setting && styles.privacyOptionTextSelected
                  ]}>
                    {setting === 'public' ? '🌐 Public' : 
                     setting === 'private' ? '🔒 Private' : '🛡️ Restricted'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="Rules (optional)" 
              value={subCommunityForm.rules} 
              onChangeText={(text) => setSubCommunityForm({ ...subCommunityForm, rules: text })}
              multiline
              numberOfLines={3}
            />
            
            <TextInput 
              style={styles.input} 
              placeholder="Tags (comma-separated, e.g., tech, programming)" 
              value={subCommunityForm.tags} 
              onChangeText={(text) => setSubCommunityForm({ ...subCommunityForm, tags: text })}
            />

            <TextInput 
              style={styles.input} 
              placeholder="Max Members (optional)" 
              value={subCommunityForm.maxMembers} 
              onChangeText={(text) => setSubCommunityForm({ ...subCommunityForm, maxMembers: text })}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.submitButton} onPress={createSubCommunity}>
              <Text style={styles.submitButtonText}>Create Sub-Community</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B6A75',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FAFC',
  },
  errorText: {
    fontSize: 18,
    color: '#4B6A75',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDF1',
  },
  backButton: {
    fontSize: 16,
    color: '#08313B',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#08313B',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    backgroundColor: '#00D1B2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerButtonText: {
    color: '#042a2a',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDF1',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTabButton: {
    backgroundColor: '#08313B',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  communityLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FBFC',
  },
  communityName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#08313B',
    textAlign: 'center',
    marginBottom: 8,
  },
  communityDescription: {
    fontSize: 16,
    color: '#4B6A75',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#08313B',
  },
  statLabel: {
    fontSize: 14,
    color: '#4B6A75',
    marginTop: 4,
  },
  tagsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  tagText: {
    fontSize: 14,
    color: '#4B6A75',
    fontWeight: '500',
  },
  rulesSection: {
    marginBottom: 20,
  },
  rulesText: {
    fontSize: 14,
    color: '#4B6A75',
    lineHeight: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  joinButton: {
    backgroundColor: '#08313B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  leaveButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  createButton: {
    backgroundColor: '#08313B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B6A75',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7aa0ac',
  },
  chatList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  messageItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  messageAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#08313B',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#7aa0ac',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    color: '#08313B',
    maxHeight: 80,
    paddingHorizontal: 8,
  },
  sendButton: {
    backgroundColor: '#08313B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#7aa0ac',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  eventItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 4,
  },
  eventLink: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#4B6A75',
    marginTop: 8,
    lineHeight: 18,
  },
  pollItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 8,
  },
  pollVotes: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 4,
  },
  pollExpiry: {
    fontSize: 12,
    color: '#7aa0ac',
  },
  membersButton: {
    backgroundColor: '#08313B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  membersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F4FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDF1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#08313B',
  },
  closeButton: {
    fontSize: 20,
    color: '#4B6A75',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCE1E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxText: {
    fontSize: 16,
    color: '#08313B',
    marginLeft: 8,
  },
  addOptionButton: {
    backgroundColor: '#F0F8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  addOptionText: {
    color: '#08313B',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#08313B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#08313B',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 12,
    color: '#7aa0ac',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  // Quick Actions Styles
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#08313B',
    textAlign: 'center',
  },
  // Enhanced Chat Styles
  chatHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EDF1',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 4,
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#4B6A75',
  },
  ownMessage: {
    backgroundColor: '#E8F5E8',
    alignSelf: 'flex-end',
    marginLeft: 40,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageType: {
    fontSize: 12,
    color: '#7aa0ac',
    fontStyle: 'italic',
    marginTop: 4,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: 12,
    color: '#7aa0ac',
  },
  // Enhanced Events Styles
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventStatus: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D5A2D',
  },
  eventStatusPast: {
    backgroundColor: '#FFE8E8',
    color: '#8B0000',
  },
  eventLinkButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  eventLinkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2EDF1',
  },
  eventAttendees: {
    fontSize: 14,
    color: '#4B6A75',
  },
  eventMaxAttendees: {
    fontSize: 12,
    color: '#7aa0ac',
  },
  attendButton: {
    backgroundColor: '#08313B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  attendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Enhanced Polls Styles
  pollsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pollExpiredBadge: {
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pollExpiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B0000',
  },
  pollOptions: {
    marginBottom: 12,
  },
  pollOption: {
    backgroundColor: '#F8FBFC',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    overflow: 'hidden',
    position: 'relative',
  },
  pollOptionDisabled: {
    opacity: 0.6,
  },
  pollOptionContent: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
    position: 'relative',
  },
  pollOptionText: {
    fontSize: 14,
    color: '#08313B',
    flex: 1,
  },
  pollOptionVotes: {
    fontSize: 12,
    color: '#7aa0ac',
    fontWeight: '600',
  },
  pollOptionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#E8F5FF',
    zIndex: 1,
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2EDF1',
  },
  voteButton: {
    backgroundColor: '#00D1B2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  voteButtonText: {
    color: '#042a2a',
    fontSize: 14,
    fontWeight: '700',
  },
  // Privacy Selector Styles
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 8,
    marginTop: 16,
  },
  privacySelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  privacyOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCE1E8',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  privacyOptionSelected: {
    backgroundColor: '#08313B',
    borderColor: '#08313B',
  },
  privacyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B6A75',
  },
  privacyOptionTextSelected: {
    color: '#fff',
  },
  // Announcement Styles
  announcementItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#08313B',
    flex: 1,
  },
  announcementDate: {
    fontSize: 12,
    color: '#7aa0ac',
    marginLeft: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#4B6A75',
    lineHeight: 20,
    marginBottom: 12,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementAuthor: {
    fontSize: 12,
    color: '#7aa0ac',
    fontStyle: 'italic',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFE8E8',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B0000',
  },
  prioritySelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priorityOptionSelected: {
    backgroundColor: '#F8FBFC',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B6A75',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  // Admin Actions Styles
  adminActionsContainer: {
    marginBottom: 20,
  },
  adminActionButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  adminActionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  adminActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
