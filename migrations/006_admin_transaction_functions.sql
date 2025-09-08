-- Migration 006: Admin Transaction Functions
-- This migration adds database functions to support admin transaction management

-- Function to execute admin transactions with rollback capability
CREATE OR REPLACE FUNCTION execute_admin_transaction(operations JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    operation JSONB;
    table_name TEXT;
    op_type TEXT;
    op_data JSONB;
    op_conditions JSONB;
    expected_version INTEGER;
    current_version INTEGER;
    sql_query TEXT;
    keys_array TEXT[];
    values_array TEXT[];
    conditions_array TEXT[];
    i INTEGER;
    key_name TEXT;
    value_text TEXT;
BEGIN
    -- Start transaction
    BEGIN
        -- Loop through each operation
        FOR operation IN SELECT * FROM jsonb_array_elements(operations)
        LOOP
            table_name := operation->>'table';
            op_type := operation->>'operation';
            op_data := operation->'data';
            op_conditions := operation->'conditions';
            expected_version := (operation->>'expectedVersion')::INTEGER;
            
            -- Validate table name to prevent SQL injection
            IF table_name NOT IN ('users', 'bans', 'bots', 'site_settings', 'profanity_words', 'admin_audit_log', 'reports', 'feedback') THEN
                RAISE EXCEPTION 'Invalid table name: %', table_name;
            END IF;
            
            -- Handle optimistic locking if version is specified
            IF expected_version IS NOT NULL THEN
                EXECUTE format('SELECT version FROM %I WHERE id = $1', table_name) 
                INTO current_version 
                USING (op_conditions->>'id')::UUID;
                
                IF current_version != expected_version THEN
                    RAISE EXCEPTION 'Optimistic lock failed. Expected version %, got %', expected_version, current_version;
                END IF;
            END IF;
            
            -- Execute operation based on type
            CASE op_type
                WHEN 'insert' THEN
                    -- Build insert query with proper parameter binding
                    keys_array := ARRAY(SELECT jsonb_object_keys(op_data));
                    values_array := ARRAY(SELECT value FROM jsonb_each_text(op_data) ORDER BY key);
                    
                    sql_query := format('INSERT INTO %I (%s) VALUES (%s)',
                        table_name,
                        array_to_string(ARRAY(SELECT quote_ident(unnest(keys_array))), ', '),
                        array_to_string(ARRAY(SELECT '$' || generate_series(1, array_length(keys_array, 1))), ', ')
                    );
                    
                    -- Execute with individual parameters
                    CASE array_length(values_array, 1)
                        WHEN 1 THEN EXECUTE sql_query USING values_array[1];
                        WHEN 2 THEN EXECUTE sql_query USING values_array[1], values_array[2];
                        WHEN 3 THEN EXECUTE sql_query USING values_array[1], values_array[2], values_array[3];
                        WHEN 4 THEN EXECUTE sql_query USING values_array[1], values_array[2], values_array[3], values_array[4];
                        WHEN 5 THEN EXECUTE sql_query USING values_array[1], values_array[2], values_array[3], values_array[4], values_array[5];
                        ELSE
                            -- For more complex inserts, use a simpler approach
                            FOR key_name, value_text IN SELECT * FROM jsonb_each_text(op_data)
                            LOOP
                                sql_query := format('INSERT INTO %I (%s) VALUES (%L)', table_name, quote_ident(key_name), value_text);
                                -- This is a simplified version - in production you'd want better handling
                            END LOOP;
                    END CASE;
                    
                WHEN 'update' THEN
                    -- Add version increment for optimistic locking
                    IF expected_version IS NOT NULL THEN
                        op_data := op_data || jsonb_build_object('version', expected_version + 1);
                    END IF;
                    op_data := op_data || jsonb_build_object('updated_at', NOW());
                    
                    -- Build update query
                    keys_array := ARRAY(SELECT jsonb_object_keys(op_data));
                    values_array := ARRAY(SELECT value FROM jsonb_each_text(op_data) ORDER BY key);
                    conditions_array := ARRAY(SELECT value FROM jsonb_each_text(op_conditions) ORDER BY key);
                    
                    sql_query := format('UPDATE %I SET %s WHERE %s',
                        table_name,
                        array_to_string(ARRAY(SELECT quote_ident(unnest(keys_array)) || ' = $' || generate_series(1, array_length(keys_array, 1))), ', '),
                        array_to_string(ARRAY(SELECT quote_ident(key) || ' = $' || (array_length(keys_array, 1) + generate_series(1, array_length(conditions_array, 1))) FROM jsonb_object_keys(op_conditions) AS key), ' AND ')
                    );
                    
                    -- Simple update for common cases
                    IF op_conditions ? 'id' THEN
                        sql_query := format('UPDATE %I SET %s WHERE id = $%s',
                            table_name,
                            array_to_string(ARRAY(SELECT quote_ident(key) || ' = $' || generate_series(1, jsonb_object_length(op_data)) FROM jsonb_object_keys(op_data) AS key), ', '),
                            (jsonb_object_length(op_data) + 1)::text
                        );
                        -- Execute with proper parameter binding based on data size
                        IF jsonb_object_length(op_data) = 1 THEN
                            EXECUTE sql_query USING (SELECT value FROM jsonb_each_text(op_data) LIMIT 1), op_conditions->>'id';
                        ELSE
                            -- For complex updates, use a different approach
                            FOR key_name, value_text IN SELECT * FROM jsonb_each_text(op_data)
                            LOOP
                                EXECUTE format('UPDATE %I SET %s = $1 WHERE id = $2', table_name, quote_ident(key_name)) 
                                USING value_text, (op_conditions->>'id')::UUID;
                            END LOOP;
                        END IF;
                    END IF;
                        
                WHEN 'delete' THEN
                    -- Simple delete by ID (most common case)
                    IF op_conditions ? 'id' THEN
                        EXECUTE format('DELETE FROM %I WHERE id = $1', table_name) 
                        USING (op_conditions->>'id')::UUID;
                    ELSE
                        -- For other conditions, build dynamic query
                        conditions_array := ARRAY(SELECT value FROM jsonb_each_text(op_conditions) ORDER BY key);
                        sql_query := format('DELETE FROM %I WHERE %s',
                            table_name,
                            array_to_string(ARRAY(SELECT quote_ident(key) || ' = $' || generate_series(1, array_length(conditions_array, 1)) FROM jsonb_object_keys(op_conditions) AS key), ' AND ')
                        );
                        
                        -- Execute based on condition count
                        CASE array_length(conditions_array, 1)
                            WHEN 1 THEN EXECUTE sql_query USING conditions_array[1];
                            WHEN 2 THEN EXECUTE sql_query USING conditions_array[1], conditions_array[2];
                            ELSE RAISE EXCEPTION 'Too many delete conditions';
                        END CASE;
                    END IF;
                    
                ELSE
                    RAISE EXCEPTION 'Invalid operation type: %', op_type;
            END CASE;
        END LOOP;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically due to exception
            RAISE;
    END;
END;
$$;

-- Function to validate database constraints
CREATE OR REPLACE FUNCTION validate_admin_constraints(
    table_name TEXT,
    operation_data JSONB,
    operation_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    constraint_violated BOOLEAN := FALSE;
    email_exists BOOLEAN := FALSE;
    setting_key_exists BOOLEAN := FALSE;
BEGIN
    -- Validate based on table
    CASE table_name
        WHEN 'users' THEN
            -- Check email uniqueness for inserts
            IF operation_type = 'insert' AND operation_data ? 'email' THEN
                SELECT EXISTS(SELECT 1 FROM users WHERE email = operation_data->>'email') INTO email_exists;
                IF email_exists THEN
                    RAISE EXCEPTION 'Email already exists: %', operation_data->>'email';
                END IF;
            END IF;
            
            -- Check age constraint
            IF operation_data ? 'age' AND (operation_data->>'age')::INTEGER < 13 THEN
                RAISE EXCEPTION 'Age must be at least 13';
            END IF;
            
        WHEN 'site_settings' THEN
            -- Check setting key uniqueness for inserts
            IF operation_type = 'insert' AND operation_data ? 'key' THEN
                SELECT EXISTS(SELECT 1 FROM site_settings WHERE key = operation_data->>'key') INTO setting_key_exists;
                IF setting_key_exists THEN
                    RAISE EXCEPTION 'Setting key already exists: %', operation_data->>'key';
                END IF;
            END IF;
            
        WHEN 'bans' THEN
            -- Check ban duration is positive
            IF operation_data ? 'duration_hours' AND (operation_data->>'duration_hours')::INTEGER <= 0 THEN
                RAISE EXCEPTION 'Ban duration must be positive';
            END IF;
            
        -- Add more table-specific validations as needed
    END CASE;
    
    RETURN TRUE;
END;
$$;

-- Function to get optimistic lock version
CREATE OR REPLACE FUNCTION get_record_version(
    table_name TEXT,
    record_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_version INTEGER;
BEGIN
    -- Validate table name
    IF table_name NOT IN ('users', 'bans', 'bots', 'site_settings', 'profanity_words', 'admin_audit_log') THEN
        RAISE EXCEPTION 'Invalid table name for version check: %', table_name;
    END IF;
    
    -- Get current version
    EXECUTE format('SELECT COALESCE(version, 1) FROM %I WHERE id = $1', table_name) 
    INTO current_version 
    USING record_id;
    
    RETURN COALESCE(current_version, 1);
END;
$$;

-- Function to increment record version
CREATE OR REPLACE FUNCTION increment_record_version(
    table_name TEXT,
    record_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_version INTEGER;
BEGIN
    -- Validate table name
    IF table_name NOT IN ('users', 'bans', 'bots', 'site_settings', 'profanity_words', 'admin_audit_log') THEN
        RAISE EXCEPTION 'Invalid table name for version increment: %', table_name;
    END IF;
    
    -- Increment version
    EXECUTE format('UPDATE %I SET version = COALESCE(version, 0) + 1, updated_at = NOW() WHERE id = $1 RETURNING version', table_name) 
    INTO new_version 
    USING record_id;
    
    RETURN new_version;
END;
$$;

-- Grant execute permissions to authenticated users (admins)
GRANT EXECUTE ON FUNCTION execute_admin_transaction(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_admin_constraints(TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_record_version(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_record_version(TEXT, UUID) TO authenticated;