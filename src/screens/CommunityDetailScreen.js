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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../state/store';
import { ShimmerMessage, ShimmerFeedItem, ShimmerList } from '../components/ShimmerEffect';
import { LoadingIcon } from '../components/LoadingIcons';
import { pickFile, validateFile } from '../utils/filePicker';
import { api } from '../services/supabaseApi';

const { width } = Dimensions.get('window');

export default function CommunityDetailScreen({ route, navigation }) {
  const { communityId } = route.params;
  const { user, api: storeApi } = useStore();
  const [community, setCommunity] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateContent, setShowCreateContent] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState('member');

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showActionOptions, setShowActionOptions] = useState(false);
  const [showItemActions, setShowItemActions] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [messageLikes, setMessageLikes] = useState({});

  // Events state
  const [events, setEvents] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
    location: '',
    isVirtual: false,
    meetingLink: '',
    maxAttendees: '',
  });

  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());

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
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [roleManagementForm, setRoleManagementForm] = useState({
    newRole: 'member'
  });

  // Sub-communities state
  const [subCommunities, setSubCommunities] = useState([]);
  const [showSubCommunities, setShowSubCommunities] = useState(false);
  const [subCommunityMemberships, setSubCommunityMemberships] = useState({});

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    isPinned: false,
    expiresAt: null,
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

  useEffect(() => {
    if (chatMessages.length > 0) {
      loadMessageInteractions();
    }
  }, [chatMessages]);

  // Clear message input when replyingTo changes
  useEffect(() => {
    if (replyingTo) {
      setNewMessage('');
    }
  }, [replyingTo]);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      const communityData = await api.getCommunityDetails(communityId);
      setCommunity(communityData);
      const memberStatus = communityData.members.includes(user.id);
      setIsMember(memberStatus);
      
      // Set user role - check database for actual role
      try {
        const actualRole = await api.getUserRole(communityId, user.id);
        setUserRole(actualRole);
        console.log('User role for community:', actualRole);
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Fallback to creator check
        if (communityData.createdBy === user.id) {
          setUserRole('admin');
        } else {
          setUserRole('member');
        }
      }

      if (memberStatus) {
        // Load additional data only if user is a member
        await Promise.all([
          loadChatMessages(),
          loadEvents(),
          loadPolls(),
          loadMembers(),
          loadAnnouncements(),
          loadSubCommunities(),
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
      setChatMessages(messages);
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
      console.log('Loaded polls data:', pollsData);
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

  const loadSubCommunities = async () => {
    try {
      const subCommunitiesData = await api.getSubCommunities(communityId);
      setSubCommunities(subCommunitiesData);
      
      // Check membership status for each sub-community
      const memberships = {};
      for (const subCommunity of subCommunitiesData) {
        const isMember = await api.isSubCommunityMember({
          subCommunityId: subCommunity.id,
          userId: user.id
        });
        memberships[subCommunity.id] = isMember;
      }
      setSubCommunityMemberships(memberships);
    } catch (error) {
      console.error('Error loading sub-communities:', error);
    }
  };

  const joinSubCommunity = async (subCommunityId) => {
    try {
      await api.joinSubCommunity({
        subCommunityId: subCommunityId,
        userId: user.id
      });
      
      // Update membership status
      setSubCommunityMemberships(prev => ({
        ...prev,
        [subCommunityId]: true
      }));
      
      // Reload sub-communities to update member counts
      await loadSubCommunities();
      
      Alert.alert('Success', 'Joined sub-community successfully!');
    } catch (error) {
      console.error('Error joining sub-community:', error);
      Alert.alert('Error', 'Failed to join sub-community');
    }
  };

  const leaveSubCommunity = async (subCommunityId) => {
    try {
      await api.leaveSubCommunity({
        subCommunityId: subCommunityId,
        userId: user.id
      });
      
      // Update membership status
      setSubCommunityMemberships(prev => ({
        ...prev,
        [subCommunityId]: false
      }));
      
      // Reload sub-communities to update member counts
      await loadSubCommunities();
      
      Alert.alert('Success', 'Left sub-community successfully!');
    } catch (error) {
      console.error('Error leaving sub-community:', error);
      Alert.alert('Error', 'Failed to leave sub-community');
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    try {
      await api.updateMemberRole({
        communityId: communityId,
        userId: memberId,
        role: newRole
      });
      
      // Reload members to reflect changes
      await loadMembers();
      
      // Update user role if it's the current user
      if (memberId === user.id) {
        setUserRole(newRole);
      }
      
      Alert.alert('Success', `Role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating member role:', error);
      Alert.alert('Error', 'Failed to update member role');
    }
  };

  const openRoleManagement = (member) => {
    setSelectedMember(member);
    setRoleManagementForm({
      newRole: member.community_roles?.[0]?.role || 'member'
    });
    setShowRoleManagement(true);
  };

  const handleRoleUpdate = async () => {
    if (!selectedMember) return;
    
    try {
      await updateMemberRole(selectedMember.user_id, roleManagementForm.newRole);
      setShowRoleManagement(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error updating role:', error);
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

  const sendMessage = async (messageType = 'text', fileUrl = null, fileData = null) => {
    if (!newMessage.trim() && messageType === 'text') return;

    console.log('Sending message:', { messageType, fileUrl, fileData, message: newMessage.trim() });
    setSendingMessage(true);
    try {
      if (replyingTo) {
        await sendReply();
      } else {
        const result = await api.sendChatMessage({
          communityId: community.id,
          message: newMessage.trim(),
          messageType: messageType,
          fileUrl: fileUrl,
          fileData: fileData
        });
        console.log('Message sent successfully:', result);
        setNewMessage('');
        await loadChatMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handlePollRequest = () => {
    setShowActionOptions(false);
    setActiveTab('feed');
    setShowCreateContent(true);
    // Pre-select poll option
    setTimeout(() => {
      handleCreateContent('poll');
    }, 100);
  };

  const handleAnnouncementReminder = () => {
    setShowActionOptions(false);
    setActiveTab('feed');
    setShowCreateContent(true);
    // Pre-select announcement option
    setTimeout(() => {
      handleCreateContent('announcement');
    }, 100);
  };

  const sendPollRequestMessage = async (pollId, pollTitle) => {
    try {
      console.log('Sending poll request:', { pollId, pollTitle, communityId: community.id });
      
      // Try with poll_id first
      try {
        await api.sendChatMessage({
          communityId: community.id,
          message: `📊 Poll Request: "${pollTitle}" - Click to view and participate!`,
          messageType: 'poll_request',
          pollId: pollId
        });
      } catch (pollError) {
        console.warn('Failed to send with poll_id, trying without:', pollError);
        // Fallback: send without poll_id
        await api.sendChatMessage({
          communityId: community.id,
          message: `📊 Poll Request: "${pollTitle}" - Click to view and participate!`,
          messageType: 'poll_request'
        });
      }
      
      console.log('Poll request sent successfully');
      await loadChatMessages();
      Alert.alert('Success', 'Poll request sent to chat!');
    } catch (error) {
      console.error('Error sending poll request:', error);
      Alert.alert('Error', `Failed to send poll request: ${error.message}`);
    }
  };

  const sendAnnouncementReminder = async (announcementId, announcementTitle) => {
    try {
      console.log('Sending announcement reminder:', { announcementId, announcementTitle, communityId: community.id });
      
      // Try with announcement_id first
      try {
        await api.sendChatMessage({
          communityId: community.id,
          message: `📢 Announcement Reminder: "${announcementTitle}" - Click to view details!`,
          messageType: 'announcement_reminder',
          announcementId: announcementId
        });
      } catch (announcementError) {
        console.warn('Failed to send with announcement_id, trying without:', announcementError);
        // Fallback: send without announcement_id
        await api.sendChatMessage({
          communityId: community.id,
          message: `📢 Announcement Reminder: "${announcementTitle}" - Click to view details!`,
          messageType: 'announcement_reminder'
        });
      }
      
      console.log('Announcement reminder sent successfully');
      await loadChatMessages();
      Alert.alert('Success', 'Announcement reminder sent to chat!');
    } catch (error) {
      console.error('Error sending announcement reminder:', error);
      Alert.alert('Error', `Failed to send announcement reminder: ${error.message}`);
    }
  };

  const handleFeedItemAction = (action, item) => {
    setShowItemActions(null);
    
    if (action === 'poll_request') {
      sendPollRequestMessage(item.id, item.title);
    } else if (action === 'announcement_reminder') {
      sendAnnouncementReminder(item.id, item.title);
    }
  };

  const handleReminderMessageClick = (messageType, itemId) => {
    setActiveTab('feed');
    // Scroll to the specific item if needed
    // For now, just switch to feed tab
  };

  // Message Interactions
  const handleReaction = async (messageId, emoji) => {
    try {
      // Check if user already reacted with this emoji
      const existingReaction = messageReactions[messageId]?.find(
        reaction => reaction.emoji === emoji && reaction.user_id === user.id
      );

      if (existingReaction) {
        // Remove reaction
        await api.removeMessageReaction(messageId, emoji);
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: prev[messageId]?.filter(r => !(r.emoji === emoji && r.user_id === user.id)) || []
        }));
      } else {
        // Add reaction
        await api.addMessageReaction(messageId, emoji);
        const newReaction = {
          id: Date.now().toString(),
          message_id: messageId,
          user_id: user.id,
          emoji: emoji,
          created_at: new Date().toISOString(),
          users: { name: user.name || 'You', email: user.email }
        };
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), newReaction]
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update reaction');
    }
  };

  const handleLike = async (messageId) => {
    try {
      const isLiked = messageLikes[messageId]?.some(like => like.user_id === user.id);

      if (isLiked) {
        // Unlike
        await api.unlikeMessage(messageId);
        setMessageLikes(prev => ({
          ...prev,
          [messageId]: prev[messageId]?.filter(like => like.user_id !== user.id) || []
        }));
      } else {
        // Like
        await api.likeMessage(messageId);
        const newLike = {
          id: Date.now().toString(),
          message_id: messageId,
          user_id: user.id,
          created_at: new Date().toISOString(),
          users: { name: user.name || 'You', email: user.email }
        };
        setMessageLikes(prev => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), newLike]
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleReply = (messageId, messageText) => {
    setReplyingTo({ id: messageId, text: messageText });
    setNewMessage('');
  };

  const sendReply = async () => {
    if (!replyingTo || !newMessage.trim()) return;

    try {
      await api.replyToMessage(replyingTo.id, newMessage.trim());
      setNewMessage('');
      setReplyingTo(null);
      await loadChatMessages();
    } catch (error) {
      Alert.alert('Error', 'Failed to send reply');
    }
  };

  const loadMessageInteractions = async () => {
    try {
      // Load reactions and likes for all messages
      const messageIds = chatMessages.map(msg => msg.id);
      const reactionsPromises = messageIds.map(id => api.getMessageReactions(id));
      const likesPromises = messageIds.map(id => api.getMessageLikes(id));

      const reactionsResults = await Promise.all(reactionsPromises);
      const likesResults = await Promise.all(likesPromises);

      const reactionsMap = {};
      const likesMap = {};

      messageIds.forEach((id, index) => {
        reactionsMap[id] = reactionsResults[index] || [];
        likesMap[id] = likesResults[index] || [];
      });

      setMessageReactions(reactionsMap);
      setMessageLikes(likesMap);
    } catch (error) {
      console.error('Error loading message interactions:', error);
    }
  };

  const handleAttachmentSelect = async (type) => {
    setShowAttachmentOptions(false);
    
    try {
      console.log('Selecting file type:', type);
      // Use the file picker utility
      const file = await pickFile(type);
      console.log('File selected:', file);
      
      // Validate the file
      validateFile(file, type);
      console.log('File validated successfully');
      
      // Show uploading indicator
      setUploadingFile(true);
      
      // Send the message with the file
      setSendingMessage(true);
      await sendMessage(type, null, file);
      setNewMessage('');
      
    } catch (error) {
      console.error('Error in handleAttachmentSelect:', error);
      if (error.message !== 'User cancelled') {
        Alert.alert('File Selection Error', error.message);
      }
    } finally {
      setSendingMessage(false);
      setUploadingFile(false);
    }
  };


  // Date/Time picker handlers
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      const dateString = selectedDate.toISOString().split('T')[0];
      setEventForm({ ...eventForm, eventDate: dateString });
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
      const timeString = selectedTime.toTimeString().split(' ')[0].substring(0, 5);
      setEventForm({ ...eventForm, eventTime: timeString });
    }
  };

  const formatDateTime = () => {
    if (eventForm.eventDate && eventForm.eventTime) {
      return `${eventForm.eventDate} ${eventForm.eventTime}`;
    } else if (eventForm.eventDate) {
      return eventForm.eventDate;
    }
    return 'Select Date & Time';
  };

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.eventDate) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      // Combine date and time for the event
      const eventDateTime = eventForm.eventTime 
        ? `${eventForm.eventDate} ${eventForm.eventTime}:00`
        : `${eventForm.eventDate} 00:00:00`;

      await api.createEvent({
        communityId: community.id,
        title: eventForm.title,
        description: eventForm.description,
        eventDate: eventDateTime,
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
        eventTime: '',
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
      // Refresh all data to show updated vote counts in feed
      await Promise.all([
        loadPolls(),
        loadEvents(),
        loadAnnouncements()
      ]);
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
      
      // Reload sub-communities to show the new one
      await loadSubCommunities();
      
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
        isPinned: announcementForm.isPinned || false,
        expiresAt: announcementForm.expiresAt || null,
      });
      setShowCreateAnnouncement(false);
      setAnnouncementForm({
        title: '',
        content: '',
        isPinned: false,
        expiresAt: null,
      });
      await loadAnnouncements();
      Alert.alert('Success', 'Announcement created successfully!');
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', `Failed to create announcement: ${error.message}`);
    }
  };

  const handleCreateContent = (contentType) => {
    setSelectedContentType(contentType);
    setShowCreateContent(false);
    
    switch (contentType) {
      case 'event':
        setShowCreateEvent(true);
        break;
      case 'poll':
        setShowCreatePoll(true);
        break;
      case 'announcement':
        setShowCreateAnnouncement(true);
        break;
      case 'subcommunity':
        setShowCreateSubCommunity(true);
        break;
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {community.logoUrl && (
        <Image source={{ uri: community.logoUrl }} style={styles.communityLogo} />
      )}
      
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
              onPress={() => setActiveTab('feed')}
            >
              <Text style={styles.quickActionIcon}>📰</Text>
              <Text style={styles.quickActionText}>Feed</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('chat')}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Chat</Text>
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
    </ScrollView>
  );
  const renderChat = () => {
    return (
      <View style={styles.chatContainer}>
        {chatMessages.length === 0 ? (
          <View style={styles.chatList}>
            <ShimmerList
              count={4}
              itemComponent={<ShimmerMessage />}
              style={{ padding: 16 }}
            />
          </View>
        ) : (
          <FlatList
            data={chatMessages}
            keyExtractor={(item) => item.id}
            inverted={true}
            renderItem={({ item }) => {
              return (
                <View
                  style={[
                    styles.messageItem,
                    item.user_id === user.id && styles.ownMessage,
                  ]}
                >
                  <View style={styles.messageHeader}>
                    <Text
                      style={[
                        styles.messageAuthor,
                        item.user_id === user.id && styles.ownMessageAuthor,
                      ]}
                    >
                      {item.users?.name || 'Unknown'}
                    </Text>
                  </View>
  
                  {(item.message_type === 'poll_request' ||
                    item.message_type === 'announcement_reminder') ? (
                    <TouchableOpacity
                      style={styles.reminderMessage}
                      onPress={() =>
                        handleReminderMessageClick(
                          item.message_type,
                          item.poll_id || item.announcement_id
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.reminderMessageText,
                          item.user_id === user.id && styles.ownReminderMessageText,
                        ]}
                      >
                        {item.message}
                      </Text>
                      <Text
                        style={[
                          styles.reminderMessageAction,
                          item.user_id === user.id && styles.ownReminderMessageAction,
                        ]}
                      >
                        Tap to view →
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        item.user_id === user.id && styles.ownMessageText,
                      ]}
                    >
                      {item.message}
                    </Text>
                  )}
  
                  {item.message_type !== 'text' &&
                    item.message_type !== 'poll_request' &&
                    item.message_type !== 'announcement_reminder' && (
                      <View style={styles.messageAttachment}>
                        {item.message_type === 'image' && item.file_url ? (
                          <View style={styles.imagePreview}>
                            <Image
                              source={{ uri: item.file_url }}
                              style={styles.previewImage}
                              resizeMode="cover"
                            />
                            <View style={styles.imageOverlay}>
                              <Text style={styles.messageType}>📷 Image</Text>
                              <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={async () => {
                                  try {
                                    const downloadUrl = await api.downloadFile(
                                      item.file_url
                                    );
                                    Alert.alert('Download URL', downloadUrl);
                                  } catch (error) {
                                    Alert.alert('Download Error', 'Failed to download file');
                                  }
                                }}
                              >
                                <Text style={styles.downloadButtonText}>Download</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <React.Fragment>
                            <Text
                              style={[
                                styles.messageType,
                                item.user_id === user.id && styles.ownMessageType,
                              ]}
                            >
                              {item.message_type === 'audio'
                                ? '🎵 Audio'
                                : item.message_type === 'document'
                                ? '📄 Document'
                                : item.message_type === 'file'
                                ? '📎 File'
                                : 'System Message'}
                            </Text>
                            {item.file_url && (
                              <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={async () => {
                                  try {
                                    const downloadUrl = await api.downloadFile(
                                      item.file_url
                                    );
                                    Alert.alert('Download URL', downloadUrl);
                                  } catch (error) {
                                    Alert.alert('Download Error', 'Failed to download file');
                                  }
                                }}
                              >
                                <Text style={styles.downloadButtonText}>Download</Text>
                              </TouchableOpacity>
                            )}
                          </React.Fragment>
                        )}
                      </View>
                    )}
  
                  {/* Message Interactions */}
                  <View style={styles.messageInteractions}>
                    {/* Reactions */}
                    <View style={styles.reactionsContainer}>
                      {messageReactions[item.id]?.map((reaction, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.reactionButton}
                          onPress={() => handleReaction(item.id, reaction.emoji)}
                        >
                          <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                          <Text style={styles.reactionCount}>
                            {
                              messageReactions[item.id]?.filter(
                                (r) => r.emoji === reaction.emoji
                              ).length
                            }
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.addReactionButton}
                        onPress={() => setShowReactionPicker(item.id)}
                      >
                        <Text style={styles.addReactionIcon}>+</Text>
                      </TouchableOpacity>
                    </View>
  
                    {/* Action Buttons */}
                    <View style={styles.messageActionButtons}>
                      <TouchableOpacity
                        style={styles.messageActionButton}
                        onPress={() => handleLike(item.id)}
                      >
                        <Text
                          style={[
                            styles.messageActionIcon,
                            messageLikes[item.id]?.some(
                              (like) => like.user_id === user.id
                            ) && styles.likedIcon,
                          ]}
                        >
                          ❤️
                        </Text>
                        <Text style={styles.messageActionCount}>
                          {messageLikes[item.id]?.length || 0}
                        </Text>
                      </TouchableOpacity>
  
                      <TouchableOpacity
                        style={styles.messageActionButton}
                        onPress={() => handleReply(item.id, item.message)}
                      >
                        <Text style={styles.messageActionIcon}>💬</Text>
                      </TouchableOpacity>
                    </View>
  
                    {/* Timestamp at bottom */}
                    <Text
                      style={[
                        styles.messageTime,
                        item.user_id === user.id && styles.ownMessageTime,
                      ]}
                    >
                      {new Date(item.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              );
            }}
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
          />
        )}
  
        <View style={styles.messageInputContainer}>
          {/* Reply Indicator */}
          {replyingTo && (
            <View style={styles.replyIndicator}>
              <View style={styles.replyIndicatorContent}>
                <Text style={styles.replyIndicatorText}>
                  Replying to: {replyingTo.text.substring(0, 50)}...
                </Text>
                <TouchableOpacity
                  style={styles.cancelReplyButton}
                  onPress={() => {
                    setReplyingTo(null);
                    setNewMessage('');
                  }}
                >
                  <Text style={styles.cancelReplyIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
  
          <View style={styles.messageInputRow}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => setShowAttachmentOptions(!showAttachmentOptions)}
            >
              <Text style={styles.attachmentButtonText}>📎</Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowActionOptions(!showActionOptions)}
            >
              <Text style={styles.actionButtonText}>⚡</Text>
            </TouchableOpacity>
  
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
  
            <TouchableOpacity
              style={[
                styles.sendButton,
                (sendingMessage || uploadingFile) && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMessage()}
              disabled={sendingMessage || uploadingFile || !newMessage.trim()}
            >
              {sendingMessage || uploadingFile ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
  
          <View style={styles.messageActions}>
            <Text style={styles.characterCount}>{newMessage.length}/500</Text>
            {uploadingFile && (
              <Text style={styles.uploadingText}>Uploading file...</Text>
            )}
          </View>
  
          {/* Attachment Options */}
          {showAttachmentOptions && (
            <View style={styles.attachmentOptions}>
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleAttachmentSelect('image')}
              >
                <Text style={styles.attachmentOptionIcon}>📷</Text>
                <Text style={styles.attachmentOptionText}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleAttachmentSelect('audio')}
              >
                <Text style={styles.attachmentOptionIcon}>🎵</Text>
                <Text style={styles.attachmentOptionText}>Audio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleAttachmentSelect('document')}
              >
                <Text style={styles.attachmentOptionIcon}>📄</Text>
                <Text style={styles.attachmentOptionText}>Document</Text>
              </TouchableOpacity>
            </View>
          )}
  
          {/* Action Options */}
          {showActionOptions && (
            <View style={styles.actionOptions}>
              <TouchableOpacity style={styles.actionOption} onPress={handlePollRequest}>
                <Text style={styles.actionOptionIcon}>📊</Text>
                <Text style={styles.actionOptionText}>Request Poll</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionOption}
                onPress={handleAnnouncementReminder}
              >
                <Text style={styles.actionOptionIcon}>📢</Text>
                <Text style={styles.actionOptionText}>Announcement Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };
  

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
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.users?.name || 'Unknown'}</Text>
                  <Text style={styles.memberEmail}>{item.users?.email}</Text>
                  <View style={styles.memberRoleContainer}>
                    <Text style={[
                      styles.memberRole,
                      styles[`${item.community_roles?.[0]?.role || 'member'}Role`]
                    ]}>
                      {item.community_roles?.[0]?.role || 'member'}
                    </Text>
                  </View>
                </View>
                {(userRole === 'admin' && item.user_id !== user.id) && (
                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => openRoleManagement(item)}
                  >
                    <Text style={styles.roleButtonText}>Manage Role</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );

  const renderSubCommunities = () => (
    <View style={styles.tabContent}>
      <View style={styles.subCommunitiesHeader}>
        <Text style={styles.sectionTitle}>Sub-Communities</Text>
        {(userRole === 'admin' || userRole === 'moderator') && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateSubCommunity(true)}
          >
            <Text style={styles.createButtonText}>🏘️ Create Sub-Community</Text>
          </TouchableOpacity>
        )}
      </View>

      {subCommunities.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {userRole === 'admin' || userRole === 'moderator'
              ? 'No sub-communities yet. Create the first one!'
              : 'No sub-communities yet'}
          </Text>
        </View>
      ) : (
        subCommunities.map((subCommunity) => (
          <View key={subCommunity.id} style={styles.subCommunityItem}>
            <View style={styles.subCommunityHeader}>
              <View style={styles.subCommunityInfo}>
                <Text style={styles.subCommunityName}>{subCommunity.name}</Text>
                {subCommunity.description && (
                  <Text style={styles.subCommunityDescription} numberOfLines={2}>
                    {subCommunity.description}
                  </Text>
                )}
                <View style={styles.subCommunityStats}>
                  <Text style={styles.subCommunityStat}>
                    👥 {subCommunity.memberCount} members
                  </Text>
                  <Text style={styles.subCommunityStat}>
                    📝 {subCommunity.posts?.length || 0} posts
                  </Text>
                </View>
              </View>
              <View style={styles.subCommunityActions}>
                <TouchableOpacity
                  style={styles.viewSubCommunityButton}
                  onPress={() => navigation.navigate('CommunityDetail', { 
                    communityId: subCommunity.id,
                    isSubCommunity: true,
                    parentCommunity: community
                  })}
                >
                  <Text style={styles.viewSubCommunityButtonText}>View Details</Text>
                </TouchableOpacity>
                {subCommunityMemberships[subCommunity.id] ? (
                  <TouchableOpacity
                    style={styles.leaveSubCommunityButton}
                    onPress={() => leaveSubCommunity(subCommunity.id)}
                  >
                    <Text style={styles.leaveSubCommunityButtonText}>Leave</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.joinSubCommunityButton}
                    onPress={() => joinSubCommunity(subCommunity.id)}
                  >
                    <Text style={styles.joinSubCommunityButtonText}>Join</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderFeed = () => {
    // Combine all content types and sort by priority (pinned first) then by creation date
    const allContent = [
      ...events.map(event => ({ ...event, type: 'event', created_at: event.created_at, is_pinned: false })),
      ...polls.map(poll => ({ ...poll, type: 'poll', created_at: poll.created_at, is_pinned: false })),
      ...announcements.map(announcement => ({ ...announcement, type: 'announcement', created_at: announcement.created_at, is_pinned: announcement.is_pinned || false }))
    ].sort((a, b) => {
      // First sort by pinned status (pinned items first)
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // Then sort by creation date (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.feedHeader}>
          <Text style={styles.sectionTitle}>Community Feed</Text>
        </View>

        {allContent.length === 0 ? (
          !community ? (
            <ShimmerList 
              count={3} 
              itemComponent={<ShimmerFeedItem />}
              style={{ padding: 16 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No content yet</Text>
              <Text style={styles.emptySubtext}>
                {userRole === 'admin' || userRole === 'moderator'
                  ? 'Create the first post for this community!'
                  : 'Check back later for new content!'}
              </Text>
            </View>
          )
        ) : (
          allContent.map((item, index) => {
            if (item.type === 'event') {
              return (
                <View key={`event-${item.id}`} style={styles.feedItem}>
                  <View style={styles.feedItemHeader}>
                    <Text style={styles.feedItemType}>📅 Event</Text>
                    <View style={styles.feedItemHeaderRight}>
                      <Text style={styles.feedItemDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.feedItemMenuButton}
                        onPress={() => setShowItemActions(item.id)}
                      >
                        <Text style={styles.feedItemMenuIcon}>⋯</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.feedItemTitle}>{item.title}</Text>
                  <Text style={styles.feedItemDate}>
                    📅 {new Date(item.event_date).toLocaleDateString()} at{' '}
                    {new Date(item.event_date).toLocaleTimeString()}
                  </Text>
                  {item.location && (
                    <Text style={styles.feedItemLocation}>📍 {item.location}</Text>
                  )}
                  {item.description && (
                    <Text style={styles.feedItemDescription}>{item.description}</Text>
                  )}
                  <View style={styles.feedItemFooter}>
                    <Text style={styles.feedItemAuthor}>
                      By {item.users?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.feedItemStats}>
                      👥 {item.community_event_attendees?.length || 0} attending
                    </Text>
                  </View>
                </View>
              );
            } else if (item.type === 'poll') {
              const options = JSON.parse(item.options || '[]');
              const votes = item.community_poll_votes || [];
              const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
              
              // Calculate total votes - count all vote records
              const totalVotes = votes.length;
              
              return (
                <View key={`poll-${item.id}`} style={styles.feedItem}>
                  <View style={styles.feedItemHeader}>
                    <Text style={styles.feedItemType}>📊 Poll</Text>
                    <View style={styles.feedItemHeaderRight}>
                      <Text style={styles.feedItemDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.feedItemMenuButton}
                        onPress={() => setShowItemActions(item.id)}
                      >
                        <Text style={styles.feedItemMenuIcon}>⋯</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.feedItemTitle}>{item.question}</Text>
                  <View style={styles.pollOptions}>
                    {options.map((option, optionIndex) => {
                      // Count votes for this specific option
                      let optionVotes = 0;
                      votes.forEach(vote => {
                        const selectedOptions = Array.isArray(vote.selected_options) 
                          ? vote.selected_options 
                          : JSON.parse(vote.selected_options || '[]');
                        if (selectedOptions.includes(optionIndex)) {
                          optionVotes++;
                        }
                      });
                      
                      const votePercentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;

                      return (
                        <TouchableOpacity 
                          key={optionIndex} 
                          style={[styles.pollOption, isExpired && styles.pollOptionDisabled]}
                          disabled={isExpired}
                          onPress={() => voteOnPoll(item.id, optionIndex)}
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
                  <View style={styles.feedItemFooter}>
                    <Text style={styles.feedItemAuthor}>
                      By {item.users?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.feedItemStats}>
                      📊 {totalVotes} total votes
                    </Text>
                  </View>
                </View>
              );
            } else if (item.type === 'announcement') {
              return (
                <View key={`announcement-${item.id}`} style={[styles.feedItem, item.is_pinned && styles.pinnedFeedItem]}>
                  <View style={styles.feedItemHeader}>
                    <View style={styles.feedItemTypeContainer}>
                      <Text style={styles.feedItemType}>📢 Announcement</Text>
                      {item.is_pinned && (
                        <Text style={styles.pinnedBadge}>📌 Pinned</Text>
                      )}
                    </View>
                    <View style={styles.feedItemHeaderRight}>
                      <Text style={styles.feedItemDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.feedItemMenuButton}
                        onPress={() => setShowItemActions(item.id)}
                      >
                        <Text style={styles.feedItemMenuIcon}>⋯</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.feedItemTitle}>{item.title}</Text>
                  <Text style={styles.feedItemDescription}>{item.content}</Text>
                  <View style={styles.feedItemFooter}>
                    <Text style={styles.feedItemAuthor}>
                      By {item.users?.name || 'Unknown'}
                    </Text>
                  </View>
                </View>
              );
            }
            return null;
          })
        )}
      </ScrollView>
    );
  };

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
        <LoadingIcon type="dots" color="#08313B" text="Loading community..." />
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
          {isMember && (userRole === 'admin' || userRole === 'moderator') && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowCreateContent(true)}
            >
              <Text style={styles.headerButtonText}>+ Create</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

        <View style={styles.tabContainer}>
          {renderTabButton('overview', 'Overview', '📋')}
          {isMember && renderTabButton('feed', 'Feed', '📰')}
          {isMember && renderTabButton('chat', 'Chat', '💬')}
          {isMember && renderTabButton('subcommunities', 'Sub-Communities', '🏘️')}
          {isMember && renderTabButton('members', 'Members', '👥')}
        </View>

      <View style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'feed' && isMember && renderFeed()}
        {activeTab === 'chat' && isMember && renderChat()}
        {activeTab === 'subcommunities' && isMember && renderSubCommunities()}
        {activeTab === 'members' && isMember && renderMembers()}
      </View>

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
            {/* Date and Time Selection */}
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>
                  📅 {eventForm.eventDate || 'Select Date'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>
                  🕐 {eventForm.eventTime || 'Select Time'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Time Picker */}
            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
              />
            )}
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

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAnnouncementForm({ ...announcementForm, isPinned: !announcementForm.isPinned })}
            >
              <Text style={styles.checkboxText}>
                {announcementForm.isPinned ? '☑️' : '☐'} Pin Announcement
              </Text>
            </TouchableOpacity>

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

      {/* Role Management Modal */}
      <Modal visible={showRoleManagement} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Role</Text>
            <TouchableOpacity onPress={() => setShowRoleManagement(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {selectedMember && (
              <>
                <Text style={styles.label}>Member: {selectedMember.users?.name || 'Unknown'}</Text>
                <Text style={styles.label}>Current Role: {selectedMember.community_roles?.[0]?.role || 'member'}</Text>
                
                <Text style={styles.label}>Select New Role</Text>
                <View style={styles.roleSelector}>
                  {[
                    { value: 'member', label: '👤 Member', description: 'Can view and participate' },
                    { value: 'moderator', label: '🛡️ Moderator', description: 'Can moderate content and members' },
                    { value: 'admin', label: '👑 Admin', description: 'Full community management access' }
                  ].map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleOption,
                        roleManagementForm.newRole === role.value && styles.roleOptionSelected
                      ]}
                      onPress={() => setRoleManagementForm({ ...roleManagementForm, newRole: role.value })}
                    >
                      <Text style={[
                        styles.roleOptionText,
                        roleManagementForm.newRole === role.value && styles.roleOptionTextSelected
                      ]}>
                        {role.label}
                      </Text>
                      <Text style={[
                        styles.roleOptionDescription,
                        roleManagementForm.newRole === role.value && styles.roleOptionDescriptionSelected
                      ]}>
                        {role.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleRoleUpdate}>
                  <Text style={styles.submitButtonText}>Update Role</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Create Content Type Selection Modal */}
      <Modal visible={showCreateContent} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Content</Text>
            <TouchableOpacity onPress={() => setShowCreateContent(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>What would you like to create?</Text>
            <View style={styles.contentTypeSelector}>
              <TouchableOpacity
                style={styles.contentTypeOption}
                onPress={() => handleCreateContent('event')}
              >
                <Text style={styles.contentTypeIcon}>📅</Text>
                <Text style={styles.contentTypeTitle}>Event</Text>
                <Text style={styles.contentTypeDescription}>Create a community event</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.contentTypeOption}
                onPress={() => handleCreateContent('poll')}
              >
                <Text style={styles.contentTypeIcon}>📊</Text>
                <Text style={styles.contentTypeTitle}>Poll</Text>
                <Text style={styles.contentTypeDescription}>Create a community poll</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.contentTypeOption}
                onPress={() => handleCreateContent('announcement')}
              >
                <Text style={styles.contentTypeIcon}>📢</Text>
                <Text style={styles.contentTypeTitle}>Announcement</Text>
                <Text style={styles.contentTypeDescription}>Create a community announcement</Text>
              </TouchableOpacity>
              
              {(userRole === 'admin' || userRole === 'moderator') && (
                <TouchableOpacity
                  style={styles.contentTypeOption}
                  onPress={() => handleCreateContent('subcommunity')}
                >
                  <Text style={styles.contentTypeIcon}>🏘️</Text>
                  <Text style={styles.contentTypeTitle}>Sub-Community</Text>
                  <Text style={styles.contentTypeDescription}>Create a sub-community</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Feed Item Action Menu Modal */}
      <Modal visible={showItemActions !== null} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.actionMenuOverlay}
          onPress={() => setShowItemActions(null)}
        >
          <View style={styles.actionMenuContainer}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle}>Item Actions</Text>
            </View>
            <View style={styles.actionMenuContent}>
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  const item = [...events, ...polls, ...announcements].find(i => i.id === showItemActions);
                  console.log('Action menu - found item:', item);
                  if (item) {
                    // Check if it's a poll (has question property)
                    if (item.question) {
                      handleFeedItemAction('poll_request', item);
                    } else {
                      Alert.alert('Info', 'This item is not a poll');
                    }
                  }
                }}
              >
                <Text style={styles.actionMenuIcon}>📊</Text>
                <Text style={styles.actionMenuText}>Request Poll</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  const item = [...events, ...polls, ...announcements].find(i => i.id === showItemActions);
                  console.log('Action menu - found item:', item);
                  if (item) {
                    // Check if it's an announcement (has title and content properties)
                    if (item.title && item.content) {
                      handleFeedItemAction('announcement_reminder', item);
                    } else {
                      Alert.alert('Info', 'This item is not an announcement');
                    }
                  }
                }}
              >
                <Text style={styles.actionMenuIcon}>📢</Text>
                <Text style={styles.actionMenuText}>Send Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reaction Picker Modal */}
      <Modal visible={showReactionPicker !== null} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.reactionPickerOverlay}
          onPress={() => setShowReactionPicker(null)}
        >
          <View style={styles.reactionPickerContainer}>
            <View style={styles.reactionPickerHeader}>
              <Text style={styles.reactionPickerTitle}>Add Reaction</Text>
            </View>
            <View style={styles.reactionPickerContent}>
              {['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🔥'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionPickerEmoji}
                  onPress={() => {
                    handleReaction(showReactionPicker, emoji);
                    setShowReactionPicker(null);
                  }}
                >
                  <Text style={styles.reactionPickerEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
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
  loadingContent: {
    flex: 1,
    backgroundColor: '#F4FAFC',
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
  chatContainer: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  messageItem: {
    backgroundColor: '#D4F1D4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 0,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#D4F1D4',
    borderColor: '#D4F1D4',
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: 'black',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  // Own message text colors
  ownMessageAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: 'black',
    marginBottom: 6,
  },
  ownMessageText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageTime: {
    fontSize: 11,
    color: '#000000',
    textAlign: 'right',
    marginTop: 4,
  },
  messageInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    color: '#08313B',
    maxHeight: 80,
    paddingHorizontal: 8,
    marginHorizontal: 8,
  },
  attachmentButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
    marginRight: 4,
  },
  attachmentButtonText: {
    fontSize: 18,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFF0F5',
    marginRight: 4,
  },
  actionButtonText: {
    fontSize: 18,
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
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageAttachment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2EDF1',
  },
  messageType: {
    fontSize: 12,
    color: '#7aa0ac',
    fontStyle: 'italic',
  },
  ownMessageType: {
    color: '#000000',
  },
  downloadButton: {
    backgroundColor: '#08313B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    marginTop: 8,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
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
  uploadingText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  // Attachment and Action Options
  attachmentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2EDF1',
    marginTop: 8,
  },
  attachmentOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FBFC',
    minWidth: 60,
  },
  attachmentOptionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  attachmentOptionText: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '600',
  },
  actionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2EDF1',
    marginTop: 8,
  },
  actionOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF0F5',
    minWidth: 80,
  },
  actionOptionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionOptionText: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Feed Item Actions
  feedItemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedItemMenuButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: '#F0F8FF',
  },
  feedItemMenuIcon: {
    fontSize: 16,
    color: '#4B6A75',
    fontWeight: 'bold',
  },
  // Action Menu Modal
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionMenuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDF1',
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#08313B',
    textAlign: 'center',
  },
  actionMenuContent: {
    padding: 8,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  actionMenuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionMenuText: {
    fontSize: 16,
    color: '#08313B',
    fontWeight: '500',
  },
  // Reminder Messages
  reminderMessage: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  reminderMessageText: {
    fontSize: 14,
    color: '#08313B',
    fontWeight: '500',
  },
  reminderMessageAction: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
    fontStyle: 'italic',
  },
  ownReminderMessageText: {
    color: '#000000',
  },
  ownReminderMessageAction: {
    color: '#000000',
  },
  // Message Interactions
  messageInteractions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2EDF1',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '600',
  },
  addReactionButton: {
    backgroundColor: '#E2EDF1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  addReactionIcon: {
    fontSize: 14,
    color: '#4B6A75',
    fontWeight: 'bold',
  },
  messageActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    borderRadius: 6,
  },
  messageActionIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  messageActionCount: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '600',
  },
  likedIcon: {
    color: '#E91E63',
  },
  // Reply Indicator
  replyIndicator: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  replyIndicatorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  replyIndicatorText: {
    fontSize: 14,
    color: '#08313B',
    flex: 1,
  },
  cancelReplyButton: {
    padding: 4,
    marginLeft: 8,
  },
  cancelReplyIcon: {
    fontSize: 16,
    color: '#4B6A75',
  },
  // Reaction Picker
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reactionPickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDF1',
  },
  reactionPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#08313B',
    textAlign: 'center',
  },
  reactionPickerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'center',
  },
  reactionPickerEmoji: {
    padding: 12,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#F8FBFC',
  },
  reactionPickerEmojiText: {
    fontSize: 24,
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
  // Date/Time Picker Styles
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CCE1E8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeButtonText: {
    fontSize: 14,
    color: '#08313B',
    fontWeight: '600',
  },
  // Role Management Styles
  memberInfo: {
    flex: 1,
  },
  memberRoleContainer: {
    marginTop: 4,
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  adminRole: {
    backgroundColor: '#FF6B6B',
    color: '#fff',
  },
  moderatorRole: {
    backgroundColor: '#4ECDC4',
    color: '#fff',
  },
  memberRole: {
    backgroundColor: '#E2EDF1',
    color: '#4B6A75',
  },
  roleButton: {
    backgroundColor: '#08313B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  roleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  roleSelector: {
    marginBottom: 20,
  },
  roleOption: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2EDF1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  roleOptionSelected: {
    borderColor: '#08313B',
    backgroundColor: '#F0F8FF',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#08313B',
    marginBottom: 4,
  },
  roleOptionTextSelected: {
    color: '#08313B',
  },
  roleOptionDescription: {
    fontSize: 14,
    color: '#4B6A75',
  },
  roleOptionDescriptionSelected: {
    color: '#4B6A75',
  },
  // Sub-Communities Styles
  subCommunitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subCommunityItem: {
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
  subCommunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subCommunityInfo: {
    flex: 1,
    marginRight: 12,
  },
  subCommunityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 4,
  },
  subCommunityDescription: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 8,
    lineHeight: 18,
  },
  subCommunityStats: {
    flexDirection: 'row',
    gap: 16,
  },
  subCommunityStat: {
    fontSize: 12,
    color: '#7aa0ac',
    fontWeight: '500',
  },
  subCommunityActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  viewSubCommunityButton: {
    backgroundColor: '#08313B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewSubCommunityButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  joinSubCommunityButton: {
    backgroundColor: '#00D1B2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinSubCommunityButtonText: {
    color: '#042a2a',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveSubCommunityButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  leaveSubCommunityButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Feed Styles
  feedHeader: {
    marginBottom: 16,
  },
  feedItem: {
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
  pinnedFeedItem: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: '#FFFEF7',
  },
  feedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedItemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedItemType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B6A75',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedItemDate: {
    fontSize: 12,
    color: '#7aa0ac',
  },
  feedItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 8,
  },
  feedItemLocation: {
    fontSize: 14,
    color: '#4B6A75',
    marginBottom: 4,
  },
  feedItemDescription: {
    fontSize: 14,
    color: '#4B6A75',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2EDF1',
  },
  feedItemAuthor: {
    fontSize: 12,
    color: '#7aa0ac',
    fontStyle: 'italic',
  },
  feedItemStats: {
    fontSize: 12,
    color: '#4B6A75',
    fontWeight: '500',
  },
  pinnedBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B0000',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  // Content Type Selector Styles
  contentTypeSelector: {
    marginTop: 16,
  },
  contentTypeOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EDF1',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contentTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  contentTypeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#08313B',
    marginBottom: 4,
  },
  contentTypeDescription: {
    fontSize: 14,
    color: '#4B6A75',
    textAlign: 'center',
  },
  // Poll Options in Feed Styles
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
});
