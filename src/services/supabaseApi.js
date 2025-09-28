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
    const { data, error } = await supabase
      .from(TABLES.COMMUNITIES)
      .select(`
        *,
        community_members(count),
        posts(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to match the expected format
    return data.map(community => ({
      id: community.id,
      name: community.name,
      parentId: community.parent_id,
      members: community.community_members?.map(member => member.user_id) || [],
      posts: community.posts || [],
      created_at: community.created_at
    }));
  }

  async createCommunity({ name, parentId = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const communityData = {
      name,
      parent_id: parentId,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.COMMUNITIES)
      .insert([communityData])
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

    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      members: [user.id],
      posts: [],
      created_at: data.created_at
    };
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
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data.map(notification => ({
      id: notification.id,
      text: notification.text,
      ts: new Date(notification.created_at).getTime(),
      type: notification.type
    }));
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
}

export const api = new SupabaseApi();
