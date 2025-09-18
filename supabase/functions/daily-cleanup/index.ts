// Supabase Edge Function for Daily User Cleanup
// Deploy with: supabase functions deploy daily-cleanup
// Schedule with cron: https://supabase.com/docs/guides/functions/schedule-functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify this is a scheduled request (optional security)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.includes('Bearer')) {
      // Allow cron jobs or add your own auth logic
      console.log('Daily cleanup triggered via cron')
    }

    // Delete anonymous users offline for 1+ hours
    const { data: deletedUsers, error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('role', 'user')  // Only anonymous users
      .eq('online', false)
      .is('email', null)   // Additional safety for anonymous users
      .lt('last_seen', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour ago
      .select('id, nickname, created_at')

    if (deleteError) {
      console.error('Cleanup error:', deleteError)
      throw deleteError
    }

    const deletedCount = deletedUsers?.length || 0

    // Log the cleanup operation
    const { error: logError } = await supabase
      .from('cleanup_logs')
      .insert({
        operation: 'automated_daily_cleanup',
        users_affected: deletedCount,
        details: `Cleaned up ${deletedCount} anonymous users offline for 1+ hours`,
        executed_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Logging error:', logError)
    }

    const result = {
      success: true,
      operation: 'automated_daily_cleanup',
      users_deleted: deletedCount,
      execution_time: new Date().toISOString(),
      details: `Successfully cleaned up ${deletedCount} anonymous users`,
      deleted_users: deletedUsers?.map(u => ({
        id: u.id.substring(0, 8) + '...',
        nickname: u.nickname,
        created_at: u.created_at
      }))
    }

    console.log('Cleanup completed:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Daily cleanup failed:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        operation: 'automated_daily_cleanup'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

/* Deploy and Schedule Instructions:

1. Deploy this function:
   supabase functions deploy daily-cleanup

2. Set up environment variables in Supabase Dashboard:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

3. Schedule with cron (in Supabase Dashboard > Edge Functions):
   - Function: daily-cleanup
   - Cron: 0 2 * * * (daily at 2 AM UTC)
   - HTTP Method: POST

4. Or call manually via HTTP:
   POST https://your-project.supabase.co/functions/v1/daily-cleanup
   Authorization: Bearer YOUR_ANON_KEY

*/