// Migration utility to help transition from mockDB to Supabase
// This file provides helper functions to migrate data and test the setup

import { api as supabaseApi, auth } from './supabaseClient';
import { db as mockDb, api as mockApi } from './mockDB';

export const migration = {
  // Test Supabase connection
  async testConnection() {
    try {
      console.log('Testing Supabase connection...');
      
      // Test database connection
      const communities = await supabaseApi.listCommunities();
      console.log('✅ Database connection successful');
      console.log('Communities found:', communities.length);
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      console.error('❌ Connection failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Migrate mock data to Supabase (for development/testing)
  async migrateMockData(userEmail, userPassword) {
    try {
      console.log('Starting mock data migration...');

      // Step 1: Create user account
      console.log('Creating user account...');
      const { user } = await auth.signUp(userEmail, userPassword, {
        name: mockDb.users[0].name,
        major: mockDb.users[0].major,
        year: mockDb.users[0].year,
        bio: mockDb.users[0].bio,
        interests: mockDb.users[0].interests,
        clubs: mockDb.users[0].clubs,
        courses: mockDb.users[0].courses,
        privacy_settings: mockDb.users[0].privacySettings
      });

      if (!user) {
        throw new Error('Failed to create user account');
      }

      console.log('✅ User account created');

      // Step 2: Create communities
      console.log('Creating communities...');
      const communityMap = {};

      for (const community of mockDb.communities) {
        if (!community.parentId) {
          // Create parent community first
          const created = await supabaseApi.createCommunity({
            name: community.name,
            parentId: null
          });
          communityMap[community.id] = created.id;
          console.log(`✅ Created parent community: ${community.name}`);
        }
      }

      // Create child communities
      for (const community of mockDb.communities) {
        if (community.parentId) {
          const parentSupabaseId = communityMap[community.parentId];
          const created = await supabaseApi.createCommunity({
            name: community.name,
            parentId: parentSupabaseId
          });
          communityMap[community.id] = created.id;
          console.log(`✅ Created child community: ${community.name}`);
        }
      }

      console.log('✅ Mock data migration completed');
      return {
        success: true,
        message: 'Migration completed successfully',
        communityMap
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Compare mock data with Supabase data
  async compareData() {
    try {
      console.log('Comparing mock data with Supabase data...');

      const mockCommunities = mockDb.communities;
      const supabaseCommunities = await supabaseApi.listCommunities();

      console.log('Mock communities:', mockCommunities.length);
      console.log('Supabase communities:', supabaseCommunities.length);

      const mockNotifications = mockDb.notifications;
      const supabaseNotifications = await supabaseApi.listNotifications();

      console.log('Mock notifications:', mockNotifications.length);
      console.log('Supabase notifications:', supabaseNotifications.length);

      return {
        mock: {
          communities: mockCommunities.length,
          notifications: mockNotifications.length
        },
        supabase: {
          communities: supabaseCommunities.length,
          notifications: supabaseNotifications.length
        }
      };

    } catch (error) {
      console.error('❌ Comparison failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test all API methods
  async testAllAPIMethods() {
    const results = {};

    // Test methods
    const tests = [
      { name: 'listCommunities', fn: () => supabaseApi.listCommunities() },
      { name: 'listNotifications', fn: () => supabaseApi.listNotifications() },
      { name: 'currentUser', fn: () => supabaseApi.currentUser() }
    ];

    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}...`);
        const result = await test.fn();
        results[test.name] = { success: true, data: result };
        console.log(`✅ ${test.name} passed`);
      } catch (error) {
        results[test.name] = { success: false, error: error.message };
        console.log(`❌ ${test.name} failed:`, error.message);
      }
    }

    return results;
  },

  // Backup current Supabase data
  async backupData() {
    try {
      console.log('Creating backup of Supabase data...');

      const backup = {
        timestamp: new Date().toISOString(),
        communities: await supabaseApi.listCommunities(),
        notifications: await supabaseApi.listNotifications(),
        currentUser: await supabaseApi.currentUser()
      };

      // In a real app, you might want to save this to local storage or send to a server
      console.log('Backup created:', backup);
      
      // Save to local storage for browser
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('scaleup_backup', JSON.stringify(backup));
        console.log('✅ Backup saved to local storage');
      }

      return backup;

    } catch (error) {
      console.error('❌ Backup failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// Utility to switch between mock and Supabase based on environment
export function getApiClient() {
  const useSupabase = process.env.REACT_APP_USE_SUPABASE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  if (useSupabase || isProduction) {
    console.log('Using Supabase API');
    return supabaseApi;
  } else {
    console.log('Using Mock API');
    return mockApi;
  }
}

// Development helper to test migration
export async function runMigrationTest() {
  console.log('🚀 Starting migration test...');

  // Test connection
  const connectionTest = await migration.testConnection();
  if (!connectionTest.success) {
    console.error('Connection test failed, stopping migration test');
    return;
  }

  // Test API methods
  const apiTests = await migration.testAllAPIMethods();
  const passedTests = Object.values(apiTests).filter(test => test.success).length;
  const totalTests = Object.keys(apiTests).length;

  console.log(`API tests: ${passedTests}/${totalTests} passed`);

  // Compare data
  const comparison = await migration.compareData();
  console.log('Data comparison:', comparison);

  console.log('🏁 Migration test completed');
}