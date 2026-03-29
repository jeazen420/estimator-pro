/**
 * MODUL 6: Team Management - Team Detail API
 * Routes: GET /api/teams/[id], PUT /api/teams/[id], DELETE /api/teams/[id]
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

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(id, user_id, role, joined_at, is_active),
        team_settings(*),
        team_invitations(id, email, role, invited_at, is_used)
      `)
      .eq('id', params.id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const hasAccess = team.owner_id === user.id ||
      team.team_members.some(m => m.user_id === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: stats } = await supabase.rpc('get_team_stats', {
      p_team_id: params.id
    });

    return NextResponse.json({
      team,
      stats: stats?.[0],
      userRole: team.owner_id === user.id ? 'owner' :
        team.team_members.find(m => m.user_id === user.id)?.role || 'member'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const isAdmin = team.owner_id === user.id || member?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, logo_url } = body;

    const { data: updated, error } = await supabase
      .from('teams')
      .update({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(logo_url && { logo_url })
      })
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from('team_audit_log')
      .insert({
        team_id: params.id,
        user_id: user.id,
        action: 'team_updated',
        entity_type: 'team',
        entity_id: params.id,
        new_values: { name, description, logo_url }
      });

    return NextResponse.json({ team: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only owner can delete team' }, { status: 403 });
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
