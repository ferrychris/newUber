-- Drop all existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.update_order_status(uuid, text);
DROP FUNCTION IF EXISTS public.update_order_status(uuid, order_status);
DROP FUNCTION IF EXISTS public.update_order_status;

DROP FUNCTION IF EXISTS public.update_order_status_v2(uuid, text);
DROP FUNCTION IF EXISTS public.update_order_status_v2(uuid, order_status);
DROP FUNCTION IF EXISTS public.update_order_status_v2;

-- Create order_status type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'pending',
            'accepted',
            'en_route',
            'arrived',
            'picked_up',
            'delivered',
            'cancelled'
        );
    END IF;
END $$;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_order_status_v2(text, uuid);

-- Create a function that accepts text status and converts it to the appropriate type
CREATE OR REPLACE FUNCTION public.update_order_status_v2(
    p_new_status text,
    p_order_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status text;
    v_result jsonb;
    v_user_id uuid;
    v_order_user_id uuid;
    v_driver_id uuid;

BEGIN
    -- Get current status and validate order exists
    SELECT status, user_id, driver_id INTO v_old_status, v_order_user_id, v_driver_id
    FROM orders
    WHERE id = p_order_id;

    IF v_old_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found'
        );
    END IF;

    -- Get current user ID for audit
    v_user_id := auth.uid();
    
    -- Validate user has permission to update this order
    -- Only order owner or assigned driver can update the status
    IF v_user_id != v_order_user_id AND 
       (v_driver_id IS NULL OR v_user_id != v_driver_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authorized to update this order. Only order owner or assigned driver can update status.'
        );
    END IF;

    BEGIN
        -- Update order with new status
        EXECUTE format('UPDATE orders SET status = %L, updated_at = NOW() WHERE id = %L', 
                     p_new_status, p_order_id);
        
        -- Get the updated order
        SELECT jsonb_build_object(
            'id', id,
            'status', status,
            'updated_at', updated_at
        ) INTO v_result
        FROM orders 
        WHERE id = p_order_id;

        -- Record status change in history if the status changed
        IF v_old_status != p_new_status THEN
            INSERT INTO order_status_history (
                order_id,
                old_status,
                new_status,
                updated_by
            ) VALUES (
                p_order_id,
                v_old_status,
                p_new_status,
                v_user_id
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'old_status', v_old_status,
            'new_status', p_new_status,
            'updated_at', NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
    END;
END;
$$;
