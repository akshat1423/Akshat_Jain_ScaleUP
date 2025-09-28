// Supabase Client Integration for ScaleUp Community Platform
// This replaces mockDB.js for production use with Supabase

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Supabase API wrapper functions that match the mockDB interface
export const api = {
  // Get current authenticated user
  async currentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    // Get user profile data
    const { data, error } = await supabase.rpc('get_user_profile', {
      target_user_id: user.id,
      requesting_user_id: user.id
    })
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    
    return data[0] || null
  },

  // List all communities with membership info
  async listCommunities() {
    const { data, error } = await supabase.rpc('get_communities_with_membership')
    
    if (error) {
      console.error('Error listing communities:', error)
      return []
    }
    
    // Transform data to match mockDB format
    return data.map(community => ({
      id: community.id,
      name: community.name,
      parentId: community.parent_id,
      members: [], // We'll populate this separately if needed
      posts: [], // We'll populate this separately if needed
      memberCount: community.member_count,
      postCount: community.post_count,
      isMember: community.is_member
    }))
  },

  // Create a new community
  async createCommunity({ name, parentId = null }) {
    const { data, error } = await supabase.rpc('create_community', {
      community_name: name,
      parent_community_id: parentId
    })
    
    if (error) {
      console.error('Error creating community:', error)
      throw new Error('Failed to create community')
    }
    
    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      members: [],
      posts: []
    }
  },

  // Join a community
  async joinCommunity({ userId, communityId }) {
    const { data, error } = await supabase.rpc('join_community', {
      community_id: communityId
    })
    
    if (error) {
      console.error('Error joining community:', error)
      throw new Error('Failed to join community')
    }
    
    return data
  },

  // Auto-join child communities
  async autoJoinChild({ userId, parentId }) {
    const { data, error } = await supabase.rpc('auto_join_child_communities', {
      parent_community_id: parentId
    })
    
    if (error) {
      console.error('Error auto-joining child communities:', error)
      throw new Error('Failed to auto-join child communities')
    }
    
    return data
  },

  // Create a new post
  async createPost({ communityId, userId, text }) {
    const { data, error } = await supabase.rpc('create_post', {
      community_id: communityId,
      post_text: text
    })
    
    if (error) {
      console.error('Error creating post:', error)
      throw new Error('Failed to create post')
    }
    
    return {
      id: data.id,
      text: data.text,
      userId: data.user_id,
      ts: new Date(data.created_at).getTime(),
      up: data.up_votes,
      down: data.down_votes
    }
  },

  // Vote on a post
  async votePost({ communityId, postId, delta }) {
    const voteValue = delta > 0 ? 1 : -1
    
    const { data, error } = await supabase.rpc('vote_on_post', {
      post_id: postId,
      vote_value: voteValue
    })
    
    if (error) {
      console.error('Error voting on post:', error)
      throw new Error('Failed to vote on post')
    }
    
    return data
  },

  // Get posts for a community
  async getCommunityPosts(communityId) {
    const { data, error } = await supabase.rpc('get_community_posts', {
      community_id: communityId
    })
    
    if (error) {
      console.error('Error getting community posts:', error)
      return []
    }
    
    return data.map(post => ({
      id: post.id,
      text: post.text,
      userId: post.user_id,
      userName: post.user_name,
      up: post.up_votes,
      down: post.down_votes,
      userVote: post.user_vote,
      ts: new Date(post.created_at).getTime()
    }))
  },

  // List notifications
  async listNotifications() {
    const { data, error } = await supabase.rpc('get_user_notifications')
    
    if (error) {
      console.error('Error listing notifications:', error)
      return []
    }
    
    return data.map(notification => ({
      id: notification.id,
      text: notification.text,
      read: notification.read,
      ts: new Date(notification.created_at).getTime()
    }))
  },

  // Update user profile
  async updateUserProfile({ userId, profileData }) {
    const { data, error } = await supabase.rpc('update_user_profile', {
      profile_data: profileData
    })
    
    if (error) {
      console.error('Error updating user profile:', error)
      throw new Error('Failed to update profile')
    }
    
    return data
  },

  // Update privacy settings
  async updatePrivacySettings({ userId, privacySettings }) {
    const { data, error } = await supabase.rpc('update_privacy_settings', {
      new_privacy_settings: privacySettings
    })
    
    if (error) {
      console.error('Error updating privacy settings:', error)
      throw new Error('Failed to update privacy settings')
    }
    
    return data
  },

  // Mark notifications as read
  async markNotificationsRead(notificationIds) {
    const { data, error } = await supabase.rpc('mark_notifications_read', {
      notification_ids: notificationIds
    })
    
    if (error) {
      console.error('Error marking notifications as read:', error)
      throw new Error('Failed to mark notifications as read')
    }
    
    return data
  }
}

// Authentication helpers
export const auth = {
  // Sign up with email and password
  async signUp(email, password, userData = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    
    if (error) {
      console.error('Error signing up:', error)
      throw new Error('Failed to sign up')
    }
    
    return data
  },

  // Sign in with email and password
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Error signing in:', error)
      throw new Error('Failed to sign in')
    }
    
    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Error signing out:', error)
      throw new Error('Failed to sign out')
    }
  },

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to community posts
  subscribeToCommunityPosts(communityId, callback) {
    return supabase
      .channel(`community-${communityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `community_id=eq.${communityId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to user notifications
  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`user-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to community changes
  subscribeToCommunities(callback) {
    return supabase
      .channel('communities')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'communities'
      }, callback)
      .subscribe()
  },

  // Unsubscribe from a channel
  unsubscribe(subscription) {
    return supabase.removeChannel(subscription)
  }
}

export default supabase