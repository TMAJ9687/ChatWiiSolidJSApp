// API endpoint for handling user disconnects
// This is called when users close their browser/tab

import { supabase } from "../config/supabase";

export async function POST(request: Request) {
  try {
    const { user_id, session_id } = await request.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Call the disconnect function
    const { error } = await supabase.rpc('handle_user_disconnect', {
      p_user_id: user_id,
      p_session_id: session_id
    });

    if (error) {
      console.error('Error handling user disconnect:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in user disconnect API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}