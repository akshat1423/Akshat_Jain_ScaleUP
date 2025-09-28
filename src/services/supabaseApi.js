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
      // Create user if doesn't exist with enhanced profile fields
      const newUser = {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        impact: 0,
        badges: [],
        // Enhanced profile fields with defaults
        major: null,
        graduation_year: null,
        enrolled_courses: [],
        biography: null,
        interests: [],
        club_memberships: [],
        profile_picture_url: null,
        phone_number: null,
        linkedin_url: null,
        github_url: null,
        location: null,
        timezone: null,
        privacy_settings: {
          email: 'public',
          phone_number: 'private',
          location: 'public',
          biography: 'public',
          interests: 'public',
          club_memberships: 'public',
          major: 'public',
          graduation_year: 'public',
          enrolled_courses: 'public',
          linkedin_url: 'public',
          github_url: 'public',
          profile_picture_url: 'public'
        },
        profile_completion_percentage: 0,
        created_at: new Date().toISOString(),
        profile_updated_at: new Date().toISOString()
      };

      console.log('Creating user with enhanced data:', newUser);
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
    
    // If user was created successfully, create enhanced profile
    if (data.user) {
      try {
        const enhancedUser = {
          id: data.user.id,
          name: fullName || data.user.email?.split('@')[0] || 'User',
          email: data.user.email,
          impact: 0,
          badges: [],
          // Enhanced profile fields with defaults
          major: null,
          graduation_year: null,
          enrolled_courses: [],
          biography: null,
          interests: [],
          club_memberships: [],
          profile_picture_url: null,
          phone_number: null,
          linkedin_url: null,
          github_url: null,
          location: null,
          timezone: null,
          privacy_settings: {
            email: 'public',
            phone_number: 'private',
            location: 'public',
            biography: 'public',
            interests: 'public',
            club_memberships: 'public',
            major: 'public',
            graduation_year: 'public',
            enrolled_courses: 'public',
            linkedin_url: 'public',
            github_url: 'public',
            profile_picture_url: 'public'
          },
          profile_completion_percentage: 0,
          created_at: new Date().toISOString(),
          profile_updated_at: new Date().toISOString()
        };

        await supabase
          .from(TABLES.USERS)
          .insert([enhancedUser]);
      } catch (profileError) {
        console.log('Failed to create enhanced profile (this is okay):', profileError.message);
      }
    }
    
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

  // Enhanced User Profile Management
  async updateUserProfile(profileData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Calculate profile completion before updating
    const currentUser = await this.getCurrentUser();
    const updatedProfile = { ...currentUser, ...profileData };
    const completionPercentage = this.calculateProfileCompletion(updatedProfile);

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({
        ...profileData,
        profile_completion_percentage: completionPercentage,
        profile_updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Helper method to calculate profile completion
  calculateProfileCompletion(profile) {
    const fields = [
      'name', 'email', 'biography', 'major', 'graduation_year', 
      'location', 'phone_number', 'linkedin_url', 'github_url',
      'interests', 'club_memberships', 'enrolled_courses', 'profile_picture_url'
    ];
    
    const completedFields = fields.filter(field => {
      const value = profile[field];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  }

  async updatePrivacySettings(privacySettings) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({
        privacy_settings: privacySettings,
        profile_updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserProfile(userId, requestingUserId = null) {
    // Use the database function for privacy filtering
    const { data, error } = await supabase.rpc('get_user_profile_with_privacy', {
      target_user_id: userId,
      requesting_user_id: requestingUserId
    });

    if (error) throw error;
    return data;
  }

  async searchUsers(query, filters = {}) {
    let queryBuilder = supabase
      .from(TABLES.USERS)
      .select('id, name, email, major, graduation_year, location, profile_picture_url, profile_completion_percentage')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,major.ilike.%${query}%`);

    // Apply filters
    if (filters.major) {
      queryBuilder = queryBuilder.eq('major', filters.major);
    }
    if (filters.graduation_year) {
      queryBuilder = queryBuilder.eq('graduation_year', filters.graduation_year);
    }
    if (filters.location) {
      queryBuilder = queryBuilder.ilike('location', `%${filters.location}%`);
    }

    const { data, error } = await queryBuilder.limit(20);
    if (error) throw error;
    return data;
  }

  async addUserConnection(connectedUserId, connectionType = 'friend') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_connections')
      .insert([{
        user_id: user.id,
        connected_user_id: connectedUserId,
        connection_type: connectionType,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async respondToConnection(connectionId, status) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_connections')
      .update({ status })
      .eq('id', connectionId)
      .eq('connected_user_id', user.id) // Only the recipient can respond
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserConnections(status = 'accepted') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_connections')
      .select(`
        *,
        users!user_connections_connected_user_id_fkey(id, name, email, profile_picture_url, major, graduation_year)
      `)
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .eq('status', status);

    if (error) throw error;
    return data;
  }

  async addUserAchievement(achievementType, achievementName, description, pointsAwarded = 0, iconUrl = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_achievements')
      .insert([{
        user_id: user.id,
        achievement_type: achievementType,
        achievement_name: achievementName,
        description,
        points_awarded: pointsAwarded,
        icon_url: iconUrl
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserAchievements(userId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const targetUserId = userId || user.id;
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_visible', true)
      .order('earned_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === '42P01') {
        console.log('user_achievements table does not exist yet');
        return [];
      }
      throw error;
    }
    return data;
  }

  async updateProfilePicture(imageUrl) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({
        profile_picture_url: imageUrl,
        profile_updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Community Management
  async initializeMemberCounts() {
    console.log('Initializing member counts for all communities...');
    try {
      const { data: communities, error: communitiesError } = await supabase
        .from(TABLES.COMMUNITIES)
        .select('id');

      if (communitiesError) throw communitiesError;

      for (const community of communities) {
        const { data: members, error: membersError } = await supabase
          .from(TABLES.COMMUNITY_MEMBERS)
          .select('id')
          .eq('community_id', community.id);

        if (membersError) {
          console.error(`Error fetching members for community ${community.id}:`, membersError);
          continue;
        }

        const memberCount = members?.length || 0;
        
        const { error: updateError } = await supabase
          .from(TABLES.COMMUNITIES)
          .update({ member_count: memberCount })
          .eq('id', community.id);

        if (updateError) {
          console.error(`Error updating member count for community ${community.id}:`, updateError);
        } else {
          console.log(`Updated member count for community ${community.id}: ${memberCount}`);
        }
      }
    } catch (error) {
      console.error('Error initializing member counts:', error);
    }
  }

  async listCommunities() {
    console.log('Listing communities...');
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Communities query timeout')), 15000)
      );
      
      // First try with all columns
      const queryPromise = supabase
        .from(TABLES.COMMUNITIES)
        .select(`
          *,
          community_members(user_id),
          posts(count)
        `)
        .is('parent_id', null)  // Only show main communities, not sub-communities
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      console.log('Communities query result:', data, 'Error:', error);
      
      // If error due to missing columns, try with basic columns only
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('Retrying with basic columns only...');
        const basicQueryPromise = supabase
          .from(TABLES.COMMUNITIES)
          .select(`
            id,
            name,
            parent_id,
            created_by,
            created_at,
            updated_at,
            community_members(user_id),
            posts(count)
          `)
          .is('parent_id', null)  // Only show main communities, not sub-communities
          .order('created_at', { ascending: false });
        
        const { data: basicData, error: basicError } = await Promise.race([basicQueryPromise, timeoutPromise]);
        
        console.log('Basic communities query result:', basicData, 'Error:', basicError);
        if (basicError) {
          console.error('Error fetching communities with basic columns:', basicError);
          throw basicError;
        }
        
        // Transform basic data
        const transformedBasicData = basicData.map(community => {
          console.log('Transforming basic community:', community.name, 'Raw members:', community.community_members);
          
          const members = community.community_members?.map(member => {
            console.log('Basic member data:', member);
            return member.user_id;
          }).filter(id => id !== undefined) || [];
          
          console.log('Processed basic members for', community.name, ':', members);
          
          return {
            id: community.id,
            name: community.name,
            parentId: community.parent_id,
            description: '',
            logoUrl: null,
            privacySetting: 'public',
            memberCount: members.length,
            maxMembers: null,
            rules: '',
            tags: [],
            isActive: true,
            members: members,
            posts: community.posts || [],
            created_at: community.created_at
          };
        });
        
        console.log('Transformed basic communities:', transformedBasicData);
        return transformedBasicData;
      }
      
      if (error) {
        console.error('Error fetching communities:', error);
        throw error;
      }

    // Transform the data to match the expected format
    const transformedData = data.map(community => {
      console.log('Transforming community:', community.name, 'Raw members:', community.community_members);
      
      const members = community.community_members?.map(member => {
        console.log('Member data:', member);
        return member.user_id;
      }).filter(id => id !== undefined) || [];
      
      console.log('Processed members for', community.name, ':', members);
      
      return {
      id: community.id,
      name: community.name,
      parentId: community.parent_id,
        description: community.description,
        logoUrl: community.logo_url,
        privacySetting: community.privacy_setting || 'public',
        memberCount: community.member_count || members.length,
        maxMembers: community.max_members,
        rules: community.rules,
        tags: community.tags || [],
        isActive: community.is_active !== false,
        members: members,
      posts: community.posts || [],
      created_at: community.created_at
      };
    });

    console.log('Transformed communities:', transformedData);
    return transformedData;
    } catch (error) {
      console.error('Error in listCommunities:', error);
      // Return empty array instead of throwing to prevent app from hanging
      console.log('Returning empty communities array due to error');
      return [];
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

    console.log('Creating community with data:', { name, description, privacySetting, rules, tags, maxMembers });

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

      console.log('Community creation result:', data, 'Error:', error);
      if (error) throw error;
      
      // Add creator as member (this might fail due to RLS, but that's okay)
      try {
        await this.joinCommunity({ userId: user.id, communityId: data.id });
      } catch (joinError) {
        console.log('Failed to auto-join community (this is okay):', joinError.message);
      }

      // Add creator as admin role
      try {
        await supabase
          .from(TABLES.COMMUNITY_ROLES)
          .insert([{
            user_id: user.id,
            community_id: data.id,
            role: 'admin',
            assigned_at: new Date().toISOString()
          }]);
      } catch (roleError) {
        console.log('Failed to assign admin role (this is okay):', roleError.message);
      }

      // Create notification (this might also fail, but that's okay)
      try {
        await this.createNotification({
          text: `New community created: ${name}`,
          type: 'community_created',
          community_id: data.id
        });
      } catch (notifError) {
        console.log('Failed to create notification (this is okay):', notifError.message);
      }

      return this.transformCommunityData(data);
    } catch (error) {
      console.log('Enhanced community creation failed, trying basic creation...', error.message);
      
      // Fallback to basic community creation
      const { data, error: basicError } = await supabase
        .from(TABLES.COMMUNITIES)
        .insert([communityData])
        .select()
        .single();

      console.log('Basic community creation result:', data, 'Error:', basicError);
      if (basicError) throw basicError;
      
      // Add creator as member (this might fail due to RLS, but that's okay)
      try {
        await this.joinCommunity({ userId: user.id, communityId: data.id });
      } catch (joinError) {
        console.log('Failed to auto-join community (this is okay):', joinError.message);
      }

      // Add creator as admin role
      try {
        await supabase
          .from(TABLES.COMMUNITY_ROLES)
          .insert([{
            user_id: user.id,
            community_id: data.id,
            role: 'admin',
            assigned_at: new Date().toISOString()
          }]);
      } catch (roleError) {
        console.log('Failed to assign admin role (this is okay):', roleError.message);
      }

      // Create notification (this might also fail, but that's okay)
      try {
        await this.createNotification({
          text: `New community created: ${name}`,
          type: 'community_created',
          community_id: data.id
        });
      } catch (notifError) {
        console.log('Failed to create notification (this is okay):', notifError.message);
      }

      return this.transformCommunityData(data);
    }
  }

  async joinCommunity({ userId, communityId }) {
    console.log('Joining community:', { userId, communityId });
    
    try {
      const { data, error } = await supabase
      .from(TABLES.COMMUNITY_MEMBERS)
      .insert([{
        user_id: userId,
        community_id: communityId,
        joined_at: new Date().toISOString()
        }])
        .select();

      console.log('Join community result:', data, 'Error:', error);
      if (error) {
        console.error('Error joining community:', error);
        throw error;
      }

    // Get community name for notification
      try {
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
      } catch (notifError) {
        console.log('Failed to create join notification (this is okay):', notifError.message);
    }

    return { success: true };
    } catch (error) {
      console.error('Error in joinCommunity:', error);
      throw error;
    }
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
      .select('*')
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
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Fetch user data for each message
    const messagesWithUsers = await Promise.all(
      data.map(async (message) => {
        const { data: userData } = await supabase
          .from(TABLES.USERS)
          .select('name, email')
          .eq('id', message.user_id)
          .single();
        
        return {
          ...message,
          users: userData || { name: 'Unknown', email: 'unknown@example.com' }
        };
      })
    );
    
    return messagesWithUsers;
  }

  async sendChatMessage({ communityId, message, messageType = 'text', fileUrl = null, replyTo = null, fileData = null, pollId = null, announcementId = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let fileUrlToStore = fileUrl;

    // Handle file upload if fileData is provided
    if (fileData && messageType !== 'text') {
      try {
        fileUrlToStore = await this.uploadFile(fileData, messageType);
      } catch (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }

    // Prepare the message data
    const messageData = {
      community_id: communityId,
      user_id: user.id,
      message,
      message_type: messageType,
      file_url: fileUrlToStore,
      reply_to: replyTo
    };

    // Only add poll_id and announcement_id if they exist and are valid
    if (pollId && pollId !== null) {
      messageData.poll_id = pollId;
    }
    if (announcementId && announcementId !== null) {
      messageData.announcement_id = announcementId;
    }

    console.log('Sending chat message with data:', messageData);

    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_CHAT_MESSAGES)
      .insert([messageData])
      .select('*')
      .single();

    if (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
    
    // Fetch user data for the message
    const { data: userData } = await supabase
      .from(TABLES.USERS)
      .select('name, email')
      .eq('id', user.id)
      .single();
    
    return {
      ...data,
      users: userData || { name: 'Unknown', email: 'unknown@example.com' }
    };
  }

  async uploadFile(fileData, fileType) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Determine bucket based on file type
    let bucketName;
    switch (fileType) {
      case 'image':
        bucketName = 'community-images';
        break;
      case 'audio':
        bucketName = 'community-audio';
        break;
      case 'document':
        bucketName = 'community-documents';
        break;
      default:
        throw new Error('Invalid file type');
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomString = Math.random().toString(36).substring(2, 10);
    const fileExtension = fileData.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = `chat-uploads/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  async downloadFile(fileUrl) {
    // Extract bucket and path from URL
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'storage' || part === 'object');
    
    if (bucketIndex === -1) {
      throw new Error('Invalid file URL');
    }

    const bucketName = urlParts[bucketIndex + 2];
    const filePath = urlParts.slice(bucketIndex + 4).join('/');

    // Get signed URL for download
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;

    return data.signedUrl;
  }

  async deleteFile(fileUrl) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Extract bucket and path from URL
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'storage' || part === 'object');
    
    if (bucketIndex === -1) {
      throw new Error('Invalid file URL');
    }

    const bucketName = urlParts[bucketIndex + 2];
    const filePath = urlParts.slice(bucketIndex + 4).join('/');

    // Delete file from storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) throw error;
  }

  // Message Reactions
  async addMessageReaction(messageId, emoji) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('community_message_reactions')
      .insert([{
        message_id: messageId,
        user_id: user.id,
        emoji: emoji
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeMessageReaction(messageId, emoji) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('community_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) throw error;
  }

  async getMessageReactions(messageId) {
    const { data, error } = await supabase
      .from('community_message_reactions')
      .select(`
        *,
        users (name, email)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Message Likes
  async likeMessage(messageId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('community_message_likes')
      .insert([{
        message_id: messageId,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async unlikeMessage(messageId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('community_message_likes')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getMessageLikes(messageId) {
    const { data, error } = await supabase
      .from('community_message_likes')
      .select(`
        *,
        users (name, email)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Message Replies
  async replyToMessage(messageId, replyMessage) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the original message to get community_id
    const { data: originalMessage, error: fetchError } = await supabase
      .from('community_chat_messages')
      .select('community_id')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('community_chat_messages')
      .insert([{
        community_id: originalMessage.community_id,
        user_id: user.id,
        message: replyMessage,
        message_type: 'text',
        reply_to_message_id: messageId
      }])
      .select('*')
      .single();

    if (error) throw error;
    
    // Fetch user data for the reply
    const { data: userData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single();
    
    return {
      ...data,
      users: userData || { name: 'Unknown', email: 'unknown@example.com' }
    };
  }

  async getMessageReplies(messageId) {
    const { data, error } = await supabase
      .from('community_chat_messages')
      .select(`
        *,
        users (name, email)
      `)
      .eq('reply_to_message_id', messageId)
      .order('created_at', { ascending: true });

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
      .select('*')
      .eq('community_id', communityId)
      .order('event_date', { ascending: true });

    if (error) throw error;
    
    // Fetch user data for each event
    const eventsWithUsers = await Promise.all(
      data.map(async (event) => {
        const { data: userData } = await supabase
          .from(TABLES.USERS)
          .select('name, email')
          .eq('id', event.created_by)
          .single();
        
        return {
          ...event,
          users: userData || { name: 'Unknown', email: 'unknown@example.com' }
        };
      })
    );
    
    return eventsWithUsers;
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
        community_poll_votes (
          id,
          user_id,
          selected_options,
          voted_at
        )
      `)
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Fetch user data for each poll
    const pollsWithUsers = await Promise.all(
      data.map(async (poll) => {
        const { data: userData } = await supabase
          .from(TABLES.USERS)
          .select('name, email')
          .eq('id', poll.created_by)
          .single();
        
        return {
          ...poll,
          users: userData || { name: 'Unknown', email: 'unknown@example.com' }
        };
      })
    );
    
    return pollsWithUsers;
  }

  async votePoll({ pollId, selectedOptions }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, get the poll to check if multiple votes are allowed
    const { data: poll, error: pollError } = await supabase
      .from(TABLES.COMMUNITY_POLLS)
      .select('allow_multiple_votes')
      .eq('id', pollId)
      .single();

    if (pollError) throw pollError;

    if (poll.allow_multiple_votes) {
      // For multiple votes, just insert a new vote record
      const { data, error } = await supabase
        .from(TABLES.COMMUNITY_POLL_VOTES)
        .insert([{
          poll_id: pollId,
          user_id: user.id,
          selected_options: selectedOptions
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // For single votes, first try to delete existing vote, then insert new one
      await supabase
        .from(TABLES.COMMUNITY_POLL_VOTES)
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id);

      const { data, error } = await supabase
        .from(TABLES.COMMUNITY_POLL_VOTES)
        .insert([{
          poll_id: pollId,
          user_id: user.id,
          selected_options: selectedOptions
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
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
      .select('*')
      .eq('community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Fetch user data for each announcement
    const announcementsWithUsers = await Promise.all(
      data.map(async (announcement) => {
        const { data: userData } = await supabase
          .from(TABLES.USERS)
          .select('name, email')
          .eq('id', announcement.created_by)
          .single();
        
        return {
          ...announcement,
          users: userData || { name: 'Unknown', email: 'unknown@example.com' }
        };
      })
    );
    
    return announcementsWithUsers;
  }

  // Community Members and Roles
  async getCommunityMembers(communityId) {
    const { data, error } = await supabase
      .from(TABLES.COMMUNITY_MEMBERS)
      .select('*')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    
    // Fetch user data for each member
    const membersWithUsers = await Promise.all(
      data.map(async (member) => {
        const { data: userData } = await supabase
          .from(TABLES.USERS)
          .select('name, email')
          .eq('id', member.user_id)
          .single();
        
        // Fetch role data
        const { data: roleData } = await supabase
          .from(TABLES.COMMUNITY_ROLES)
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', member.user_id)
          .single();
        
        return {
          ...member,
          users: userData || { name: 'Unknown', email: 'unknown@example.com' },
          community_roles: roleData ? [roleData] : [{ role: 'member' }]
        };
      })
    );
    
    return membersWithUsers;
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

  async getUserRole(communityId, userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITY_ROLES)
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        // Fallback: check if user is community creator
        return await this.checkIfCreator(communityId, userId);
      }
      return data?.role || 'member';
    } catch (error) {
      console.error('Error in getUserRole:', error);
      // Fallback: check if user is community creator
      return await this.checkIfCreator(communityId, userId);
    }
  }

  async checkIfCreator(communityId, userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITIES)
        .select('created_by')
        .eq('id', communityId)
        .single();

      if (error) {
        console.error('Error checking creator:', error);
        return 'member';
      }

      return data?.created_by === userId ? 'admin' : 'member';
    } catch (error) {
      console.error('Error in checkIfCreator:', error);
      return 'member';
    }
  }

  async getCommunityRoles(communityId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITY_ROLES)
        .select(`
          *,
          users(id, name, email)
        `)
        .eq('community_id', communityId)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching community roles:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in getCommunityRoles:', error);
      return [];
    }
  }

  // Sub-Community Management
  async getSubCommunities(parentCommunityId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITIES)
        .select(`
          *,
          community_members(user_id),
          posts(count)
        `)
        .eq('parent_id', parentCommunityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sub-communities:', error);
        return [];
      }

      // Transform the data to match the expected format
      const transformedData = data.map(community => {
        const members = community.community_members?.map(member => member.user_id).filter(id => id !== undefined) || [];
        
        return {
          id: community.id,
          name: community.name,
          parentId: community.parent_id,
          createdBy: community.created_by,
          description: community.description,
          logoUrl: community.logo_url,
          privacySetting: community.privacy_setting || 'public',
          memberCount: community.member_count || members.length,
          maxMembers: community.max_members,
          rules: community.rules,
          tags: community.tags || [],
          isActive: community.is_active !== false,
          members: members,
          posts: community.posts || [],
          created_at: community.created_at,
          isSubCommunity: true
        };
      });

      return transformedData;
    } catch (error) {
      console.error('Error in getSubCommunities:', error);
      return [];
    }
  }

  async joinSubCommunity({ subCommunityId, userId }) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITY_MEMBERS)
        .insert([{
          user_id: userId,
          community_id: subCommunityId,
          joined_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error joining sub-community:', error);
      throw error;
    }
  }

  async leaveSubCommunity({ subCommunityId, userId }) {
    try {
      const { error } = await supabase
        .from(TABLES.COMMUNITY_MEMBERS)
        .delete()
        .eq('community_id', subCommunityId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error leaving sub-community:', error);
      throw error;
    }
  }

  async isSubCommunityMember({ subCommunityId, userId }) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMMUNITY_MEMBERS)
        .select('id')
        .eq('community_id', subCommunityId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking sub-community membership:', error);
      return false;
    }
  }

  // Community Details
  async getCommunityDetails(communityId) {
    console.log('Getting community details for:', communityId);
    const { data, error } = await supabase
      .from(TABLES.COMMUNITIES)
      .select(`
        *,
        community_members(user_id),
        posts(count)
      `)
      .eq('id', communityId)
      .single();

    console.log('Community details query result:', data, 'Error:', error);
    if (error) throw error;

    const members = data.community_members?.map(member => {
      console.log('Member data in getCommunityDetails:', member);
      return member.user_id;
    }).filter(id => id !== undefined) || [];

    console.log('Processed members for community details:', members);

    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      createdBy: data.created_by,
      description: data.description,
      logoUrl: data.logo_url,
      privacySetting: data.privacy_setting || 'public',
      memberCount: data.member_count || 0,
      maxMembers: data.max_members,
      rules: data.rules,
      tags: data.tags || [],
      isActive: data.is_active !== false,
      members: members,
      posts: data.posts || [],
      created_at: data.created_at
    };
  }
}

export const api = new SupabaseApi();
