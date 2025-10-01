-- Test the policy fix function
-- This script tests if the create_policy_safely function works correctly

-- Create a test function to verify the fix
CREATE OR REPLACE FUNCTION test_policy_fix() RETURNS void AS $$
BEGIN
    -- Test with a table that exists (should work)
    PERFORM create_policy_safely('profiles', 'test_policy', 'FOR SELECT', 'USING (true)');
    RAISE NOTICE 'Test with existing table: SUCCESS';
    
    -- Test with a table that doesn't exist (should skip)
    PERFORM create_policy_safely('nonexistent_table', 'test_policy', 'FOR SELECT', 'USING (true)');
    RAISE NOTICE 'Test with non-existent table: SUCCESS (skipped)';
    
    -- Clean up test policy
    DROP POLICY IF EXISTS test_policy ON profiles;
    
    RAISE NOTICE 'Policy fix test completed successfully!';
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_policy_fix();

-- Clean up test function
DROP FUNCTION IF EXISTS test_policy_fix();
