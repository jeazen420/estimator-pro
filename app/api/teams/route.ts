/**
 * MODUL 6: Team Management - Teams API
 * Routes: GET /api/teams, POST /api/teams
 * Handles team listing, creation, and team selection
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
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

    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        slug,
        logo_url,
        subscription_tier,
        created_at,
        team_members!inner(role, user_id)
      `)
      .or(`owner_id.eq.${user.id},team_members.user_id.eq.${user.id}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentTeamId = request.headers.get('x-current-team-id');

    return NextResponse.json({
      teams: teams || [],
      currentTeamId,
      total: teams?.length || 0
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Team name and slug are required' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    const { data: result, error } = await supabase.rpc('create_team_with_settings', {
      p_user_id: user.id,
      p_team_name: name,
      p_slug: slug
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (description) {
      await supabase
        .from('teams')
        .update({ description })
        .eq('id', result);
    }

    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', result)
      .single();

    return NextResponse.json(
      {
        success: true,
        team,
        message: 'Team created successfully'
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
