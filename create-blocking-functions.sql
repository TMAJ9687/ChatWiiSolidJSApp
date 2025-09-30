-- Create helper functions for blocking to bypass API issues

-- Function to create a block
CREATE OR REPLACE FUNCTION create_block(
    blocker_user_id UUID,
    blocked_user_id UUID,
    block_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Check if users are different
    IF blocker_user_id = blocked_user_id THEN
        RAISE EXCEPTION 'Cannot block yourself';
    END IF;

    -- Insert the block (will fail silently if already exists due to UNIQUE constraint)
    INSERT INTO public.blocks (blocker_id, blocked_id, reason)
    VALUES (blocker_user_id, blocked_user_id, block_reason)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a block
CREATE OR REPLACE FUNCTION remove_block(
    blocker_user_id UUID,
    blocked_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.blocks 
    WHERE blocker_id = blocker_user_id 
    AND blocked_id = blocked_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
    blocker_user_id UUID,
    blocked_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.blocks 
        WHERE blocker_id = blocker_user_id 
        AND blocked_id = blocked_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_block(UUID, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION remove_block(UUID, UUID) TO anon, authenticated; 
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO anon, authenticated;

SELECT 'Blocking functions created successfully';