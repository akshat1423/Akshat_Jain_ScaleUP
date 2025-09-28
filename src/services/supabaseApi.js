import { supabase, TABLES } from '../config/supabase';

class SupabaseApi {
  // User Management
  async getCurrentUser() {
    console.log('Getting current user from Supabase...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth user:', user, 'Auth error:', authError);
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    console.log('Looking up user in database...');
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('Database query result:', data, 'Error:', error);

    if (error) {
      console.log('User not found in database, creating new user...');
      // Create user if doesn't exist
      const newUser = {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        impact: 0,
        badges: [],
        created_at: new Date().toISOString()
      };

      console.log('Creating user with data:', newUser);
      const { data: createdUser, error: createError } = await supabase
        .from(TABLES.USERS)
        .insert([newUser])
        .select()
        .single();

      console.log('User creation result:', createdUser, 'Create error:', createError);
      return createError ? null : createdUser;
    }

    console.log('Returning existing user:', data);
    return data;
  }

  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    console.log('Signing in user:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log('Sign in response:', data, 'Error:', error);
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Community Management
  async listCommunities() {
    console.log('Listing communities...');
    try {
      // First try with all columns
      const { data, error } = await supabase
        .from(TABLES.COMMUNITIES)
        .select(`
          *,
          community_members(count),
          posts(count)
        `)
        .order('created_at', { ascending: false });

      console.log('Communities query result:', data, 'Error:', error);
      
      // If error due to missing columns, try with basic columns only
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('Retrying with basic columns only...');
        const { data: basicData, error: basicError } = await supabase
          .from(TABLES.COMMUNITIES)
          .select(`
            id,
            name,
            parent_id,
            created_by,
            created_at,
            updated_at,
            community_members(count),
            posts(count)
          `)
          .order('created_at', { ascending: false });
        
        console.log('Basic communities query result:', basicData, 'Error:', basicError);
        if (basicError) {
          console.error('Error fetching communities with basic columns:', basicError);
          throw basicError;
        }
        
        // Transform basic data
        const transformedBasicData = basicData.map(community => ({
          id: community.id,
          name: community.name,
          parentId: community.parent_id,
          description: '',
          logoUrl: null,
          privacySetting: 'public',
          memberCount: 0,
          maxMembers: null,
          rules: '',
          tags: [],
          isActive: true,
          members: community.community_members?.map(member => member.user_id) || [],
          posts: community.posts || [],
          created_at: community.created_at
        }));
        
        console.log('Transformed basic communities:', transformedBasicData);
        return transformedBasicData;
      }
      
      if (error) {
        console.error('Error fetching communities:', error);
        throw error;
      }

    // Transform the data to match the expected format
    const transformedData = data.map(community => ({
      id: community.id,
      name: community.name,
      parentId: community.parent_id,
      description: community.description,
      logoUrl: community.logo_url,
      privacySetting: community.privacy_setting || 'public',
      memberCount: community.member_count || 0,
      maxMembers: community.max_members,
      rules: community.rules,
      tags: community.tags || [],
      isActive: community.is_active !== false,
      members: community.community_members?.map(member => member.user_id) || [],
      posts: community.posts || [],
      created_at: community.created_at
    }));

    console.log('Transformed communities:', transformedData);
    return transformedData;
    } catch (error) {
      console.error('Error in listCommunities:', error);
      throw error;
    }
  }

  async createCommunity({ 
    name, 
    parentId = null, 
    description = '', 
    privacySetting = 'public', 
    logoUrl = null, 
    rules = '', 
    tags = [], 
    maxMembers = null 
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Start with basic data that should always exist
    const communityData = {
      name,
      parent_id: parentId,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    // Try to add enhanced fields, but don't fail if they don't exist
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITIES)
        .insert([{
          ...communityData,
          description,
          logo_url: logoUrl,
          privacy_setting: privacySetting,
          rules,
          tags,
          max_members: maxMembers
        }])
        .select()
        .single();

      if (error) throw error;
      return this.transformCommunityData(data);
    } catch (error) {
      console.log('Enhanced community creation failed, trying basic creation...', error.message);
      
      // Fallback to basic community creation
      const { data, error: basicError } = await supabase
        .from(TABLES.COMMUNITIES)
        .insert([communityData])
        .select()
        .single();

      if (basicError) throw basicError;
      return this.transformCommunityData(data);
    }
  }

  transformCommunityData(data) {
    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      description: data.description || '',
      logoUrl: data.logo_url || null,
      privacySetting: data.privacy_setting || 'public',
      memberCount: data.member_count || 0,
      maxMembers: data.max_members || null,
      rules: data.rules || '',
      tags: data.tags || [],
      isActive: data.is_active !== false,
      members: [],
      posts: [],
      created_at: data.created_at
    };
  }

  async createCommunityComplete({ 
    name, 
    parentId = null, 
    description = '', 
    privacySetting = 'public', 
    logoUrl = null, 
    rules = '', 
    tags = [], 
    maxMembers = null 
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Start with basic data that should always exist
    const communityData = {
      name,
      parent_id: parentId,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    // Try to add enhanced fields, but don't fail if they don't exist
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITIES)
        .insert([{
          ...communityData,
          description,
          logo_url: logoUrl,
          privacy_setting: privacySetting,
          rules,
          tags,
          max_members: maxMembers
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Add creator as member
      await this.joinCommunity({ userId: user.id, communityId: data.id });

      // Create notification
      await this.createNotification({
        text: `New community created: ${name}`,
        type: 'community_created',
        community_id: data.id
      });

      return this.transformCommunityData(data);
    } catch (error) {
      console.log('Enhanced community creation failed, trying basic creation...', error.message);
      
      // Fallback to basic community creation
      const { data, error: basicError } = await supabase
        .from(TABLES.COMMUNITIES)
        .insert([communityData])
        .select()
        .single();

      if (basicError) throw basicError;
      
      // Add creator as member
      await this.joinCommunity({ userId: user.id, communityId: data.id });

      // Create notification
      await this.createNotification({
        text: `New community created: ${name}`,
        type: 'community_created',
        community_id: data.id
      });

      return this.transformCommunityData(data);
    }
  }

  async joinCommunity({ userId, communityId }) {
    const { error } = await supabase
      .from(TABLES.COMMUNITY_MEMBERS)
      .insert([{
        user_id: userId,
        community_id: communityId,
        joined_at: new Date().toISOString()
      }]);

    if (error) throw error;

    // Get community name for notification
    const { data: community } = await supabase
      .from(TABLES.COMMUNITIES)
      .select('name')
      .eq('id', communityId)
      .single();

    if (community) {
      await this.createNotification({
        text: `Joined ${community.name}`,
        type: 'community_joined',
        community_id: communityId
      });
    }

    return { success: true };
  }

  async autoJoinChild({ userId, parentId }) {
    // Get all child communities of the parent
    const { data: childCommunities, error } = await supabase
      .from(TABLES.COMMUNITIES)
      .select('id, name')
      .eq('parent_id', parentId);

    if (error) throw error;

    if (childCommunities.length === 0) {
      return null;
    }

    // Join all child communities
    const memberships = childCommunities.map(child => ({
      user_id: userId,
      community_id: child.id,
      joined_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from(TABLES.COMMUNITY_MEMBERS)
      .insert(memberships);

    if (insertError) throw insertError;

    // Create notification
    await this.createNotification({
      text: `Auto-joined ${childCommunities.length} sub-communities`,
      type: 'auto_joined',
      community_id: parentId
    });

    return childCommunities[0]; // Return first child as example
  }

  // Post Management
  async createPost({ communityId, userId, text }) {
    const postData = {
      community_id: communityId,
      user_id: userId,
      text,
      upvotes: 0,
      downvotes: 0,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.POSTS)
      .insert([postData])
      .select()
      .single();

    if (error) throw error;

    // Get community name for notification
    const { data: community } = await supabase
      .from(TABLES.COMMUNITIES)
      .select('name')
      .eq('id', communityId)
      .single();

    if (community) {
      await this.createNotification({
        text: `New post in ${community.name}`,
        type: 'new_post',
        community_id: communityId,
        post_id: data.id
      });
    }

    return {
      id: data.id,
      text: data.text,
      userId: data.user_id,
      ts: new Date(data.created_at).getTime(),
      up: data.upvotes,
      down: data.downvotes
    };
  }

  async votePost({ communityId, postId, delta }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Update post votes
    const { data: post, error: postError } = await supabase
      .from(TABLES.POSTS)
      .select('upvotes, downvotes, user_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    const updateData = {};
    if (delta > 0) {
      updateData.upvotes = post.upvotes + 1;
    } else {
      updateData.downvotes = post.downvotes + 1;
    }

    const { error: updateError } = await supabase
      .from(TABLES.POSTS)
      .update(updateData)
      .eq('id', postId);

    if (updateError) throw updateError;

    // Update user impact
    const { error: userError } = await supabase
      .from(TABLES.USERS)
      .update({
        impact: Math.max(0, (post.user_id === user.id ? 0 : delta))
      })
      .eq('id', post.user_id);

    if (userError) throw userError;

    return { success: true };
  }

  // Notification Management
  async listNotifications() {
    console.log('Listing notifications...');
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('Notifications query result:', data, 'Error:', error);
    if (error) throw error;

    const transformedData = data.map(notification => ({
      id: notification.id,
      text: notification.text,
      ts: new Date(notification.created_at).getTime(),
      type: notification.type
    }));

    console.log('Transformed notifications:', transformedData);
    return transformedData;
  }

  async createNotification({ text, type, community_id, post_id = null }) {
    const notificationData = {
      text,
      type,
      community_id,
      post_id,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert([notificationData]);

    if (error) throw error;
  }

  // Helper method to check if user is member of community
  async isMemberOfCommunity(userId, communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_MEMBERS)
      .select('id')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .single();

    return !error && data;
  }

  // Enhanced Community Features

  // Join Request System
  async requestToJoinCommunity({ communityId, message = '' }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_JOIN_REQUESTS)
      .insert([{
        community_id: communityId,
        user_id: user.id,
        message,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getJoinRequests(communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_JOIN_REQUESTS)
      .select(`
        *,
        users(name, email)
      `)
      .eq('community_id', communityId)
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async approveJoinRequest(requestId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_JOIN_REQUESTS)
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async rejectJoinRequest(requestId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_JOIN_REQUESTS)
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Community Chat
  async getChatMessages(communityId, limit = 50) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_CHAT_MESSAGES)
      .select(`
        *,
        users(name, email)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async sendChatMessage({ communityId, message, messageType = 'text', fileUrl = null, replyTo = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_CHAT_MESSAGES)
      .insert([{
        community_id: communityId,
        user_id: user.id,
        message,
        message_type: messageType,
        file_url: fileUrl,
        reply_to: replyTo
      }])
      .select(`
        *,
        users(name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Community Events
  async createEvent({ 
    communityId, 
    title, 
    description = '', 
    eventDate, 
    location = '', 
    isVirtual = false, 
    meetingLink = '', 
    maxAttendees = null 
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_EVENTS)
      .insert([{
        community_id: communityId,
        created_by: user.id,
        title,
        description,
        event_date: eventDate,
        location,
        is_virtual: isVirtual,
        meeting_link: meetingLink,
        max_attendees: maxAttendees
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCommunityEvents(communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_EVENTS)
      .select(`
        *,
        users(name),
        community_event_attendees(count)
      `)
      .eq('community_id', communityId)
      .order('event_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  async attendEvent({ eventId, status = 'going' }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_EVENT_ATTENDEES)
      .upsert([{
        event_id: eventId,
        user_id: user.id,
        status
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Community Polls
  async createPoll({ 
    communityId, 
    question, 
    options, 
    allowMultipleVotes = false, 
    expiresAt = null 
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_POLLS)
      .insert([{
        community_id: communityId,
        created_by: user.id,
        question,
        options: JSON.stringify(options),
        allow_multiple_votes: allowMultipleVotes,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCommunityPolls(communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_POLLS)
      .select(`
        *,
        users(name),
        community_poll_votes(count)
      `)
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async votePoll({ pollId, selectedOptions }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_POLL_VOTES)
      .upsert([{
        poll_id: pollId,
        user_id: user.id,
        selected_options: JSON.stringify(selectedOptions)
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Community Announcements
  async createAnnouncement({ 
    communityId, 
    title, 
    content, 
    isPinned = false, 
    expiresAt = null 
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_ANNOUNCEMENTS)
      .insert([{
        community_id: communityId,
        created_by: user.id,
        title,
        content,
        is_pinned: isPinned,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCommunityAnnouncements(communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_ANNOUNCEMENTS)
      .select(`
        *,
        users(name)
      `)
      .eq('community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Community Members and Roles
  async getCommunityMembers(communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_MEMBERS)
      .select(`
        *,
        users(name, email),
        community_roles(role)
      `)
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateMemberRole({ communityId, userId, role }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_ROLES)
      .upsert([{
        community_id: communityId,
        user_id: userId,
        role,
        assigned_by: user.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeMember({ communityId, userId }) {
    const { error } = await supabase
      .from(TABLES.COMMUNITY_MEMBERS)
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }

  // Community Details
  async getCommunityDetails(communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITIES)
      .select(`
        *,
        community_members(count),
        posts(count)
      `)
      .eq('id', communityId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      description: data.description,
      logoUrl: data.logo_url,
      privacySetting: data.privacy_setting || 'public',
      memberCount: data.member_count || 0,
      maxMembers: data.max_members,
      rules: data.rules,
      tags: data.tags || [],
      isActive: data.is_active !== false,
      members: data.community_members?.map(member => member.user_id) || [],
      posts: data.posts || [],
      created_at: data.created_at
    };
  }
}

export const api = new SupabaseApi();
