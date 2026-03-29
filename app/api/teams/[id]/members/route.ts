/**
 * MODUL 6: Team Management - Team Members API
 * Routes: GET/POST /api/teams/[id]/members
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .single();

    const { data: owner } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (!membership && owner?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        id,
        team_id,
        user_id,
        role,
        joined_at,
        is_active,
        invited_by,
        invitation_accepted_at
      `)
      .eq('team_id', params.id)
      .order('joined_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', params.id)
      .eq('is_used', false)
      .eq('is_active', true);

    return NextResponse.json({
      members: members || [],
      invitations: invitations || [],
      total: (members?.length || 0) + (invitations?.length || 0)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .single();

    const { data: owner } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    const isAdmin = owner?.owner_id === user.id || member?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: params.id,
        email,
        role,
        invited_by: user.id
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'User already invited to this team' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from('team_audit_log')
      .insert({
        team_id: params.id,
        user_id: user.id,
        action: 'invitation_sent',
        entity_type: 'team_invitation',
        entity_id: invitation.id,
        new_values: { email, role }
      });

    return NextResponse.json(
      {
        success: true,
        invitation,
        message: 'Invitation sent successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
