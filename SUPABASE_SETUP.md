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
