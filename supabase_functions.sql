-- Additional Supabase Functions for ScaleUp Community Platform
-- These are additional functions beyond the base schema to support all API operations

-- Function to get user profile with privacy filtering
CREATE OR REPLACE FUNCTION get_user_profile(target_user_id UUID, requesting_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    major TEXT,
    year TEXT,
    bio TEXT,
    interests TEXT[],
    clubs TEXT[],
    courses TEXT[],
    impact INTEGER,
    badges TEXT[],
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    user_privacy JSONB;
    is_public BOOLEAN;
    is_own_profile BOOLEAN;
BEGIN
    -- Get user privacy settings
    SELECT privacy_settings INTO user_privacy 
    FROM users 
    WHERE users.id = target_user_id;
    
    -- Check if profile is public or if it's the user's own profile
    is_public := (user_privacy->>'profileVisibility') = 'public';
    is_own_profile := target_user_id = requesting_user_id;
    
    -- Return filtered data based on privacy settings
    RETURN QUERY
    SELECT 
        u.id,
        CASE WHEN is_public OR is_own_profile THEN u.email ELSE NULL END,
        u.name,
        CASE WHEN (is_public OR is_own_profile) AND (user_privacy->>'showMajor')::boolean THEN u.major ELSE NULL END,
        CASE WHEN (is_public OR is_own_profile) AND (user_privacy->>'showYear')::boolean THEN u.year ELSE NULL END,
        CASE WHEN (is_public OR is_own_profile) AND (user_privacy->>'showBio')::boolean THEN u.bio ELSE NULL END,
        CASE WHEN (is_public OR is_own_profile) AND (user_privacy->>'showInterests')::boolean THEN u.interests ELSE '{}' END,
        CASE WHEN (is_public OR is_own_profile) AND (user_privacy->>'showClubs')::boolean THEN u.clubs ELSE '{}' END,
        CASE WHEN (is_public OR is_own_profile) AND (user_privacy->>'showCourses')::boolean THEN u.courses ELSE '{}' END,
        CASE WHEN (is_public OR is_own_profile) AND (user_privacy->>'showImpactPoints')::boolean THEN u.impact ELSE 0 END,
        u.badges,
        u.created_at,
        u.updated_at
    FROM users u
    WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    profile_data JSONB
) RETURNS users AS $$
DECLARE
    updated_user users;
    user_id UUID := auth.uid();
BEGIN
    -- Validate that user is updating their own profile
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update user profile
    UPDATE users SET
        name = COALESCE((profile_data->>'name'), name),
        major = COALESCE((profile_data->>'major'), major),
        year = COALESCE((profile_data->>'year'), year),
        bio = COALESCE((profile_data->>'bio'), bio),
        interests = CASE 
            WHEN profile_data ? 'interests' THEN 
                ARRAY(SELECT jsonb_array_elements_text(profile_data->'interests'))
            ELSE interests 
        END,
        clubs = CASE 
            WHEN profile_data ? 'clubs' THEN 
                ARRAY(SELECT jsonb_array_elements_text(profile_data->'clubs'))
            ELSE clubs 
        END,
        courses = CASE 
            WHEN profile_data ? 'courses' THEN 
                ARRAY(SELECT jsonb_array_elements_text(profile_data->'courses'))
            ELSE courses 
        END,
        updated_at = NOW()
    WHERE id = user_id
    RETURNING * INTO updated_user;
    
    -- Create notification
    PERFORM create_notification(user_id, 'Profile updated successfully');
    
    RETURN updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update privacy settings
CREATE OR REPLACE FUNCTION update_privacy_settings(
    new_privacy_settings JSONB
) RETURNS users AS $$
DECLARE
    updated_user users;
    user_id UUID := auth.uid();
BEGIN
    -- Validate that user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update privacy settings
    UPDATE users SET
        privacy_settings = privacy_settings || new_privacy_settings,
        updated_at = NOW()
    WHERE id = user_id
    RETURNING * INTO updated_user;
    
    -- Create notification
    PERFORM create_notification(user_id, 'Privacy settings updated');
    
    RETURN updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get communities with membership info
CREATE OR REPLACE FUNCTION get_communities_with_membership()
RETURNS TABLE(
    id UUID,
    name TEXT,
    parent_id UUID,
    member_count BIGINT,
    post_count BIGINT,
    is_member BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.parent_id,
        COUNT(DISTINCT cm.user_id) as member_count,
        COUNT(DISTINCT p.id) as post_count,
        EXISTS(
            SELECT 1 FROM community_members cm2 
            WHERE cm2.community_id = c.id AND cm2.user_id = user_id
        ) as is_member,
        c.created_at
    FROM communities c
    LEFT JOIN community_members cm ON c.id = cm.community_id
    LEFT JOIN posts p ON c.id = p.community_id
    GROUP BY c.id, c.name, c.parent_id, c.created_at
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a community
CREATE OR REPLACE FUNCTION join_community(community_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_id UUID := auth.uid();
    community_name TEXT;
    result JSONB;
BEGIN
    -- Validate user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get community name
    SELECT name INTO community_name FROM communities WHERE id = community_id;
    
    IF community_name IS NULL THEN
        RAISE EXCEPTION 'Community not found';
    END IF;
    
    -- Insert membership if not already exists
    INSERT INTO community_members (user_id, community_id)
    VALUES (user_id, community_id)
    ON CONFLICT (user_id, community_id) DO NOTHING;
    
    -- Create notification
    PERFORM create_notification(user_id, 'Joined ' || community_name);
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'message', 'Successfully joined ' || community_name,
        'community_id', community_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-join child communities
CREATE OR REPLACE FUNCTION auto_join_child_communities(parent_community_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_id UUID := auth.uid();
    child_community RECORD;
    joined_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Validate user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Join all child communities
    FOR child_community IN 
        SELECT id, name FROM communities WHERE parent_id = parent_community_id
    LOOP
        -- Insert membership if not already exists
        INSERT INTO community_members (user_id, community_id)
        VALUES (user_id, child_community.id)
        ON CONFLICT (user_id, community_id) DO NOTHING;
        
        -- Check if actually inserted (not conflicted)
        GET DIAGNOSTICS joined_count = ROW_COUNT;
        
        IF joined_count > 0 THEN
            -- Create notification for each joined community
            PERFORM create_notification(user_id, 'Auto-joined ' || child_community.name);
        END IF;
    END LOOP;
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'message', 'Auto-joined child communities',
        'parent_id', parent_community_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a post
CREATE OR REPLACE FUNCTION create_post(community_id UUID, post_text TEXT)
RETURNS posts AS $$
DECLARE
    user_id UUID := auth.uid();
    new_post posts;
    community_name TEXT;
BEGIN
    -- Validate user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate user is member of community
    IF NOT EXISTS(
        SELECT 1 FROM community_members 
        WHERE user_id = create_post.user_id AND community_id = create_post.community_id
    ) THEN
        RAISE EXCEPTION 'User must be a member of the community to post';
    END IF;
    
    -- Get community name for notification
    SELECT name INTO community_name FROM communities WHERE id = community_id;
    
    -- Create the post
    INSERT INTO posts (user_id, community_id, text)
    VALUES (user_id, community_id, post_text)
    RETURNING * INTO new_post;
    
    -- Note: Notification will be created automatically by the trigger notify_new_post
    
    RETURN new_post;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote on a post
CREATE OR REPLACE FUNCTION vote_on_post(post_id UUID, vote_value INTEGER)
RETURNS JSONB AS $$
DECLARE
    user_id UUID := auth.uid();
    result JSONB;
BEGIN
    -- Validate user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate vote value
    IF vote_value NOT IN (-1, 1) THEN
        RAISE EXCEPTION 'Vote value must be -1 or 1';
    END IF;
    
    -- Insert or update vote
    INSERT INTO post_votes (user_id, post_id, vote_type)
    VALUES (user_id, post_id, vote_value)
    ON CONFLICT (user_id, post_id) 
    DO UPDATE SET vote_type = vote_value;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'post_id', post_id,
        'vote', vote_value
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get posts for a community with vote info
CREATE OR REPLACE FUNCTION get_community_posts(community_id UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    id UUID,
    text TEXT,
    user_id UUID,
    user_name TEXT,
    up_votes INTEGER,
    down_votes INTEGER,
    user_vote INTEGER,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    requesting_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.text,
        p.user_id,
        u.name as user_name,
        p.up_votes,
        p.down_votes,
        COALESCE(pv.vote_type, 0) as user_vote,
        p.created_at
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN post_votes pv ON p.id = pv.post_id AND pv.user_id = requesting_user_id
    WHERE p.community_id = get_community_posts.community_id
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    id UUID,
    text TEXT,
    read BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    user_id UUID := auth.uid();
BEGIN
    -- Validate user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        n.id,
        n.text,
        n.read,
        n.created_at
    FROM notifications n
    WHERE n.user_id = get_user_notifications.user_id
    ORDER BY n.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    user_id UUID := auth.uid();
    updated_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update notifications
    UPDATE notifications 
    SET read = TRUE 
    WHERE id = ANY(notification_ids) 
    AND user_id = mark_notifications_read.user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new community
CREATE OR REPLACE FUNCTION create_community(community_name TEXT, parent_community_id UUID DEFAULT NULL)
RETURNS communities AS $$
DECLARE
    user_id UUID := auth.uid();
    new_community communities;
BEGIN
    -- Validate user is authenticated
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Create the community
    INSERT INTO communities (name, parent_id)
    VALUES (community_name, parent_community_id)
    RETURNING * INTO new_community;
    
    -- Automatically join the creator to the community
    INSERT INTO community_members (user_id, community_id)
    VALUES (user_id, new_community.id);
    
    -- Create notification
    PERFORM create_notification(user_id, 'New community created: ' || community_name);
    
    RETURN new_community;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_privacy_settings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_communities_with_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION join_community(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_join_child_communities(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_post(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION vote_on_post(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_posts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_read(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_community(TEXT, UUID) TO authenticated;