// Privacy utility functions for user profile fields

export const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  COMMUNITY_MEMBERS: 'community_members',
  FRIENDS: 'friends',
  PRIVATE: 'private'
};

export const PROFILE_FIELDS = {
  // Basic Info
  NAME: 'name',
  EMAIL: 'email',
  PROFILE_PICTURE_URL: 'profile_picture_url',
  
  // Academic Info
  MAJOR: 'major',
  GRADUATION_YEAR: 'graduation_year',
  ENROLLED_COURSES: 'enrolled_courses',
  
  // Personal Info
  BIOGRAPHY: 'biography',
  INTERESTS: 'interests',
  CLUB_MEMBERSHIPS: 'club_memberships',
  LOCATION: 'location',
  TIMEZONE: 'timezone',
  
  // Contact Info
  PHONE_NUMBER: 'phone_number',
  LINKEDIN_URL: 'linkedin_url',
  GITHUB_URL: 'github_url'
};

export const FIELD_DISPLAY_NAMES = {
  [PROFILE_FIELDS.NAME]: 'Name',
  [PROFILE_FIELDS.EMAIL]: 'Email',
  [PROFILE_FIELDS.PROFILE_PICTURE_URL]: 'Profile Picture',
  [PROFILE_FIELDS.MAJOR]: 'Major',
  [PROFILE_FIELDS.GRADUATION_YEAR]: 'Graduation Year',
  [PROFILE_FIELDS.ENROLLED_COURSES]: 'Enrolled Courses',
  [PROFILE_FIELDS.BIOGRAPHY]: 'Biography',
  [PROFILE_FIELDS.INTERESTS]: 'Interests',
  [PROFILE_FIELDS.CLUB_MEMBERSHIPS]: 'Club Memberships',
  [PROFILE_FIELDS.LOCATION]: 'Location',
  [PROFILE_FIELDS.TIMEZONE]: 'Timezone',
  [PROFILE_FIELDS.PHONE_NUMBER]: 'Phone Number',
  [PROFILE_FIELDS.LINKEDIN_URL]: 'LinkedIn',
  [PROFILE_FIELDS.GITHUB_URL]: 'GitHub'
};

export const FIELD_DESCRIPTIONS = {
  [PROFILE_FIELDS.NAME]: 'Your display name',
  [PROFILE_FIELDS.EMAIL]: 'Your email address',
  [PROFILE_FIELDS.PROFILE_PICTURE_URL]: 'Your profile picture',
  [PROFILE_FIELDS.MAJOR]: 'Your academic major or field of study',
  [PROFILE_FIELDS.GRADUATION_YEAR]: 'Year you expect to graduate',
  [PROFILE_FIELDS.ENROLLED_COURSES]: 'Courses you are currently taking',
  [PROFILE_FIELDS.BIOGRAPHY]: 'Tell others about yourself',
  [PROFILE_FIELDS.INTERESTS]: 'Your hobbies and interests',
  [PROFILE_FIELDS.CLUB_MEMBERSHIPS]: 'Clubs and organizations you belong to',
  [PROFILE_FIELDS.LOCATION]: 'Your current location',
  [PROFILE_FIELDS.TIMEZONE]: 'Your timezone',
  [PROFILE_FIELDS.PHONE_NUMBER]: 'Your phone number',
  [PROFILE_FIELDS.LINKEDIN_URL]: 'Your LinkedIn profile URL',
  [PROFILE_FIELDS.GITHUB_URL]: 'Your GitHub profile URL'
};

export const DEFAULT_PRIVACY_SETTINGS = {
  [PROFILE_FIELDS.NAME]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.EMAIL]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.PROFILE_PICTURE_URL]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.MAJOR]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.GRADUATION_YEAR]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.ENROLLED_COURSES]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.BIOGRAPHY]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.INTERESTS]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.CLUB_MEMBERSHIPS]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.LOCATION]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.TIMEZONE]: PRIVACY_LEVELS.PRIVATE,
  [PROFILE_FIELDS.PHONE_NUMBER]: PRIVACY_LEVELS.PRIVATE,
  [PROFILE_FIELDS.LINKEDIN_URL]: PRIVACY_LEVELS.PUBLIC,
  [PROFILE_FIELDS.GITHUB_URL]: PRIVACY_LEVELS.PUBLIC
};

export const PRIVACY_LEVEL_DESCRIPTIONS = {
  [PRIVACY_LEVELS.PUBLIC]: 'Visible to everyone',
  [PRIVACY_LEVELS.COMMUNITY_MEMBERS]: 'Visible to community members only',
  [PRIVACY_LEVELS.FRIENDS]: 'Visible to friends only',
  [PRIVACY_LEVELS.PRIVATE]: 'Only visible to you'
};

/**
 * Get the display name for a privacy level
 */
export const getPrivacyLevelDisplayName = (level) => {
  return PRIVACY_LEVEL_DESCRIPTIONS[level] || level;
};

/**
 * Get the display name for a profile field
 */
export const getFieldDisplayName = (field) => {
  return FIELD_DISPLAY_NAMES[field] || field;
};

/**
 * Get the description for a profile field
 */
export const getFieldDescription = (field) => {
  return FIELD_DESCRIPTIONS[field] || '';
};

/**
 * Check if a field should be visible based on privacy settings and relationship
 */
export const isFieldVisible = (field, privacySettings, relationship = 'public') => {
  const fieldPrivacy = privacySettings[field] || DEFAULT_PRIVACY_SETTINGS[field];
  
  switch (fieldPrivacy) {
    case PRIVACY_LEVELS.PUBLIC:
      return true;
    case PRIVACY_LEVELS.COMMUNITY_MEMBERS:
      return relationship === 'community_member' || relationship === 'friend';
    case PRIVACY_LEVELS.FRIENDS:
      return relationship === 'friend';
    case PRIVACY_LEVELS.PRIVATE:
      return relationship === 'self';
    default:
      return false;
  }
};

/**
 * Filter user profile data based on privacy settings
 */
export const filterProfileByPrivacy = (profile, privacySettings, relationship = 'public') => {
  const filteredProfile = {};
  
  Object.keys(profile).forEach(field => {
    if (isFieldVisible(field, privacySettings, relationship)) {
      filteredProfile[field] = profile[field];
    }
  });
  
  return filteredProfile;
};

/**
 * Get all profile fields that are visible to the current user
 */
export const getVisibleFields = (privacySettings, relationship = 'public') => {
  return Object.values(PROFILE_FIELDS).filter(field => 
    isFieldVisible(field, privacySettings, relationship)
  );
};

/**
 * Calculate profile completion percentage
 */
export const calculateProfileCompletion = (profile) => {
  const fields = Object.values(PROFILE_FIELDS);
  const completedFields = fields.filter(field => {
    const value = profile[field];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && value !== undefined && value !== '';
  });
  
  return Math.round((completedFields.length / fields.length) * 100);
};

/**
 * Get profile completion suggestions
 */
export const getProfileCompletionSuggestions = (profile) => {
  const suggestions = [];
  const fields = Object.values(PROFILE_FIELDS);
  
  fields.forEach(field => {
    const value = profile[field];
    const isEmpty = Array.isArray(value) ? value.length === 0 : (!value || value === '');
    
    if (isEmpty) {
      suggestions.push({
        field,
        displayName: getFieldDisplayName(field),
        description: getFieldDescription(field)
      });
    }
  });
  
  return suggestions;
};

/**
 * Validate privacy settings
 */
export const validatePrivacySettings = (privacySettings) => {
  const errors = {};
  
  Object.values(PROFILE_FIELDS).forEach(field => {
    const level = privacySettings[field];
    if (level && !Object.values(PRIVACY_LEVELS).includes(level)) {
      errors[field] = `Invalid privacy level: ${level}`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Merge privacy settings with defaults
 */
export const mergeWithDefaultPrivacySettings = (userPrivacySettings = {}) => {
  return {
    ...DEFAULT_PRIVACY_SETTINGS,
    ...userPrivacySettings
  };
};

/**
 * Get privacy level options for a field
 */
export const getPrivacyLevelOptions = (field) => {
  // Some fields might have restricted privacy options
  const restrictedFields = [PROFILE_FIELDS.NAME, PROFILE_FIELDS.EMAIL];
  
  if (restrictedFields.includes(field)) {
    return [
      { value: PRIVACY_LEVELS.PUBLIC, label: getPrivacyLevelDisplayName(PRIVACY_LEVELS.PUBLIC) },
      { value: PRIVACY_LEVELS.COMMUNITY_MEMBERS, label: getPrivacyLevelDisplayName(PRIVACY_LEVELS.COMMUNITY_MEMBERS) },
      { value: PRIVACY_LEVELS.FRIENDS, label: getPrivacyLevelDisplayName(PRIVACY_LEVELS.FRIENDS) }
    ];
  }
  
  return Object.values(PRIVACY_LEVELS).map(level => ({
    value: level,
    label: getPrivacyLevelDisplayName(level)
  }));
};
