/**
 * MODUL 6: Team Management - Invitations API
 * Routes: POST /api/invitations/accept, POST /api/invitations/reject
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invitationId, action } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      const { data: memberId, error } = await supabase.rpc('accept_team_invitation', {
        p_invitation_id: invitationId,
        p_user_id: user.id
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const { data: invitation } = await supabase
        .from('team_invitations')
        .select('team_id')
        .eq('id', invitationId)
        .single();

      return NextResponse.json({
        success: true,
        message: 'Invitation accepted successfully',
        teamId: invitation?.team_id,
        memberId
      });
    } else if (action === 'reject') {
      const { error } = await supabase
        .from('team_invitations')
        .update({ is_active: false })
        .eq('id', invitationId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation rejected'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
