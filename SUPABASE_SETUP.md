
# Supabase Integration Guide

## Overview
This guide explains how to migrate from the mock database (`mockDB.js`) to a production Supabase database.

## Files Overview

### Database Schema
- **`supabase_schema.sql`** - Main database schema with tables, policies, and basic triggers
- **`supabase_functions.sql`** - Additional SQL functions for all API operations
- **`src/state/supabaseClient.js`** - Supabase client integration replacing mockDB

### Configuration
- **`.env.example`** - Environment variables template

## Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to Settings > API to find your project URL and anon key

### 2. Set up Database Schema
Run the SQL files in your Supabase SQL editor in this order:

```sql
-- 1. First, run the main schema
-- Copy and paste the contents of supabase_schema.sql

-- 2. Then, run the additional functions  
-- Copy and paste the contents of supabase_functions.sql
```

### 3. Configure Environment Variables
1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase project URL and anon key:

```bash
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 5. Update Your Application Code

#### Option A: Switch Completely to Supabase (Recommended for Production)

Replace the import in your store file:

```javascript
// Before (mockDB)
import { api } from './mockDB';

// After (Supabase)
import { api } from './supabaseClient';
```

#### Option B: Conditional Usage (Good for Development)

You can use environment variables to switch between mock and Supabase:

```javascript
// In src/state/store.js
const isDevelopment = process.env.NODE_ENV === 'development';
const useSupabase = process.env.REACT_APP_USE_SUPABASE === 'true';

let api;
if (useSupabase && !isDevelopment) {
  api = require('./supabaseClient').api;
} else {
  api = require('./mockDB').api;
}
```

### 6. Authentication Setup

#### Enable Authentication in Supabase
1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your authentication providers
3. Set up email templates if using email auth

#### Update Your App for Authentication

Add authentication to your app:

```javascript
// Example: Add to App.js or create an AuthProvider
import { useEffect, useState } from 'react';
import { auth } from './src/state/supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    auth.getSession().then(setSession).finally(() => setLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!session) return <LoginScreen />;

  return <MainApp />;
}
```

## API Method Mapping

The Supabase client maintains the same interface as mockDB:

| mockDB Method | Supabase Method | Description |
|--------------|-----------------|-------------|
| `currentUser()` | `currentUser()` | Get current authenticated user |
| `listCommunities()` | `listCommunities()` | List all communities |
| `createCommunity({name, parentId})` | `createCommunity({name, parentId})` | Create new community |
| `joinCommunity({userId, communityId})` | `joinCommunity({userId, communityId})` | Join a community |
| `autoJoinChild({userId, parentId})` | `autoJoinChild({userId, parentId})` | Auto-join child communities |
| `createPost({communityId, userId, text})` | `createPost({communityId, userId, text})` | Create new post |
| `votePost({communityId, postId, delta})` | `votePost({communityId, postId, delta})` | Vote on post |
| `listNotifications()` | `listNotifications()` | Get user notifications |
| `updateUserProfile({userId, profileData})` | `updateUserProfile({userId, profileData})` | Update user profile |
| `updatePrivacySettings({userId, privacySettings})` | `updatePrivacySettings({userId, privacySettings})` | Update privacy settings |

## Additional Features in Supabase Version

### Real-time Subscriptions
```javascript
import { subscriptions } from './src/state/supabaseClient';

// Subscribe to new posts in a community
const postSubscription = subscriptions.subscribeToCommunityPosts(
  communityId, 
  (payload) => {
    console.log('New post:', payload.new);
  }
);

// Subscribe to user notifications
const notifSubscription = subscriptions.subscribeToNotifications(
  userId,
  (payload) => {
    console.log('New notification:', payload.new);
  }
);

// Clean up subscriptions
subscriptions.unsubscribe(postSubscription);
subscriptions.unsubscribe(notifSubscription);
```

### Enhanced Error Handling
All API methods in the Supabase client include proper error handling and will throw descriptive errors.

### Privacy-Aware Data Fetching
The `get_user_profile` function automatically respects privacy settings when fetching user data.

## Security Features

### Row Level Security (RLS)
- All tables have RLS policies that ensure users can only access data they're authorized to see
- Privacy settings are enforced at the database level
- Users can only modify their own data

### Function Security
- All SQL functions use `SECURITY DEFINER` to run with elevated privileges
- Functions validate user authentication and authorization
- Input validation and sanitization built-in

## Testing the Integration

### 1. Database Setup Verification
Run these queries in Supabase SQL editor to verify setup:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check functions exist  
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Test sample data
SELECT * FROM users;
SELECT * FROM communities;
```

### 2. Authentication Test
Create a test user in Authentication > Users in Supabase dashboard.

### 3. API Test
Test API calls in your browser console:

```javascript
import { api } from './src/state/supabaseClient';

// Test current user
api.currentUser().then(console.log);

// Test communities
api.listCommunities().then(console.log);
```

## Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Make sure your `.env.local` file is in the project root
   - Restart your development server after changing .env files

2. **RLS policy errors**
   - Ensure user is authenticated before making API calls
   - Check that your functions have proper `auth.uid()` checks

3. **Function not found errors**
   - Make sure you've run both SQL files in the correct order
   - Check function names match exactly (case-sensitive)

4. **CORS errors**
   - Supabase should handle CORS automatically
   - If issues persist, check your Supabase project settings

### Getting Help

- Check Supabase documentation: https://supabase.com/docs
- Review the SQL functions in `supabase_functions.sql` for implementation details
- Test individual functions in Supabase SQL editor

## Performance Considerations

- The functions include proper indexing for common queries
- Consider adding pagination for large datasets
- Use real-time subscriptions sparingly to avoid performance issues
- Monitor your Supabase usage in the dashboard

## Backup and Recovery

- Supabase automatically backs up your database
- You can export your schema and data from the Supabase dashboard
- Consider setting up additional backup strategies for production
=======
# Supabase Setup Guide

This guide will help you set up Supabase for the ScaleUp Ignite app.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `scaleup-ignite` (or any name you prefer)
   - **Database Password**: Create a strong password
   - **Region**: Choose the closest region to your users
6. Click "Create new project"
7. Wait for the project to be created (this may take a few minutes)

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Project API Key** (anon/public key)

## 3. Update Configuration

1. Open `src/config/supabase.js`
2. Replace the placeholder values:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your Project URL
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your API Key
   ```

## 4. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `database/schema.sql`
4. Click "Run" to execute the SQL
5. This will create all necessary tables, indexes, and security policies

## 5. Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your app's URL:
   - For development: `exp://localhost:19000` (or your Expo dev server URL)
   - For production: your app's production URL
3. Under **Redirect URLs**, add the same URLs
4. Enable **Email confirmations** if you want users to verify their email

## 6. Test the Setup

1. Start your React Native app: `npm start`
2. Try creating a new account
3. Check the **Authentication** → **Users** section in Supabase to see if the user was created
4. Check the **Table Editor** to see if data is being stored correctly

## 7. Database Tables Created

The schema creates the following tables:

- **users**: User profiles and impact points
- **communities**: Parent and sub-communities
- **community_members**: Many-to-many relationship between users and communities
- **posts**: Community posts with voting
- **notifications**: System notifications

## 8. Security Features

- **Row Level Security (RLS)** is enabled on all tables
- Users can only access their own data
- Communities and posts are publicly readable
- Proper authentication checks for write operations

## 9. Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Double-check your API key in the config file
2. **"Invalid URL"**: Make sure your Supabase URL is correct
3. **"User not authenticated"**: Check if the user is properly signed in
4. **Database errors**: Verify the schema was created correctly

### Debug Steps:

1. Check the browser console for error messages
2. Verify your Supabase project is active (not paused)
3. Check the Supabase logs in the dashboard
4. Ensure all environment variables are set correctly

## 10. Production Considerations

- Set up proper environment variables for production
- Configure proper CORS settings
- Set up database backups
- Monitor usage and performance
- Set up proper error logging

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [React Native + Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
- [Supabase Community](https://github.com/supabase/supabase/discussions)

