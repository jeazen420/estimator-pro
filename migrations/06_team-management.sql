-- ========================================
-- MODUL 6: TEAM MANAGEMENT
-- ========================================
-- This module enables multi-user collaboration with role-based access control
-- Tables: teams, team_members, team_invitations, team_settings
-- RLS: Full multi-tenant isolation by team_id

-- ========================================
-- 1. TEAMS TABLE
-- ========================================
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  slug varchar(100) UNIQUE NOT NULL, -- for team URLs: /teams/{slug}
  logo_url text,
  is_active boolean DEFAULT true,
  subscription_tier varchar(50) DEFAULT 'free', -- free, pro, enterprise
  max_members integer DEFAULT 1, -- enforced by CHECK constraint
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Constraints
ALTER TABLE teams
  ADD CONSTRAINT check_team_name CHECK (name IS NOT NULL)
  ADD CONSTRAINT check_slug_format CHECK (slug ~ '^[a-z0-9_-]+$');

-- Indexes
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_slug ON teams(slug);

-- ========================================
-- 2. TEAM MEMBERS TABLE
-- ========================================
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
  permissions text[] DEFAULT '{}', -- custom permissions array
  joined_at timestamp DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  invitation_accepted_at timestamp,
  is_active boolean DEFAULT true,
  UNIQUE(team_id, user_id)
);

-- Constraints
ALTER TABLE team_members
  ADD CONSTRAINT check_role CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'accountant'));

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

-- ========================================
-- 3. TEAM INVITATIONS TABLE
-- ========================================
CREATE TABLE team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invited_at timestamp DEFAULT now(),
  accepted_at timestamp,
  is_used boolean DEFAULT false,
  is_active boolean DEFAULT true,
  UNIQUE(team_id, email)
);

-- Indexes
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_is_used ON team_invitations(is_used);

-- ========================================
-- 4. TEAM SETTINGS TABLE
-- ========================================
CREATE TABLE team_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  currency varchar(3) DEFAULT 'HUF',
  language varchar(10) DEFAULT 'hu',
  timezone varchar(50) DEFAULT 'Europe/Budapest',
  date_format varchar(20) DEFAULT 'YYYY-MM-DD',
  invoice_prefix varchar(20) DEFAULT 'INV',
  invoice_next_number integer DEFAULT 1,
  enable_stripe boolean DEFAULT true,
  enable_notifications boolean DEFAULT true,
  require_approval_for_invoices boolean DEFAULT false,
  auto_send_reminders boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb, -- for custom settings
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_team_settings_team_id ON team_settings(team_id);

-- ========================================
-- 5. TEAM AUDIT LOG
-- ========================================
CREATE TABLE team_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action varchar(100) NOT NULL, -- 'member_added', 'member_removed', 'role_changed', etc.
  entity_type varchar(50), -- 'team_member', 'team_settings', 'client', etc.
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_team_audit_log_team_id ON team_audit_log(team_id);
CREATE INDEX idx_team_audit_log_user_id ON team_audit_log(user_id);
CREATE INDEX idx_team_audit_log_action ON team_audit_log(action);

-- ========================================
-- 6. RLS POLICIES - TEAMS TABLE
-- ========================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Owners can view their teams
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (auth.uid() = owner_id OR id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Owners can create teams
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can update their teams
CREATE POLICY "Owners can update teams"
  ON teams FOR UPDATE
  USING (auth.uid() = owner_id OR (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))))
  WITH CHECK (auth.uid() = owner_id OR (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))));

-- Only owners can delete
CREATE POLICY "Only owners can delete teams"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);

-- ========================================
-- 7. RLS POLICIES - TEAM MEMBERS TABLE
-- ========================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team members can view other members
CREATE POLICY "Team members can view team members"
  ON team_members FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Team admins can add members
CREATE POLICY "Team admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Team admins can update members
CREATE POLICY "Team admins can update members"
  ON team_members FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Team admins can remove members
CREATE POLICY "Team admins can remove members"
  ON team_members FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ========================================
-- 8. RLS POLICIES - TEAM INVITATIONS
-- ========================================
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Team members can view invitations
CREATE POLICY "Team members can view invitations"
  ON team_invitations FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Invited users can view their own invitation
CREATE POLICY "Users can view their invitations"
  ON team_invitations FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- Team admins can create invitations
CREATE POLICY "Team admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ========================================
-- 9. RLS POLICIES - TEAM SETTINGS
-- ========================================
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- Team members can view settings
CREATE POLICY "Team members can view settings"
  ON team_settings FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Team admins can update settings
CREATE POLICY "Team admins can update settings"
  ON team_settings FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ========================================
-- 10. STORED PROCEDURES
-- ========================================

-- Create team with default settings
CREATE OR REPLACE FUNCTION create_team_with_settings(
  p_user_id uuid,
  p_team_name varchar,
  p_slug varchar
) RETURNS uuid AS $$
DECLARE
  v_team_id uuid;
BEGIN
  -- Create team
  INSERT INTO teams (owner_id, name, slug)
  VALUES (p_user_id, p_team_name, p_slug)
  RETURNING id INTO v_team_id;

  -- Add owner as team member
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_user_id, 'owner');

  -- Create default settings
  INSERT INTO team_settings (team_id)
  VALUES (v_team_id);

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
  p_invitation_id uuid,
  p_user_id uuid
) RETURNS uuid AS $$
DECLARE
  v_team_id uuid;
  v_role varchar;
  v_member_id uuid;
BEGIN
  -- Get invitation details
  SELECT team_id, role INTO v_team_id, v_role
  FROM team_invitations
  WHERE id = p_invitation_id AND is_active = true AND is_used = false;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Add user to team
  INSERT INTO team_members (team_id, user_id, role, invitation_accepted_at)
  VALUES (v_team_id, p_user_id, v_role, now())
  RETURNING id INTO v_member_id;

  -- Mark invitation as used
  UPDATE team_invitations
  SET is_used = true, accepted_at = now()
  WHERE id = p_invitation_id;

  -- Log action
  INSERT INTO team_audit_log (team_id, user_id, action, entity_type, entity_id, new_values)
  VALUES (v_team_id, p_user_id, 'member_added', 'team_member', v_member_id, jsonb_build_object('role', v_role));

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove team member
CREATE OR REPLACE FUNCTION remove_team_member(
  p_member_id uuid,
  p_requested_by uuid
) RETURNS void AS $$
DECLARE
  v_team_id uuid;
  v_role varchar;
  v_user_id uuid;
BEGIN
  -- Get member details
  SELECT team_id, role, user_id INTO v_team_id, v_role, v_user_id
  FROM team_members
  WHERE id = p_member_id;

  -- Check if requester is admin
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_team_id
    AND user_id = p_requested_by
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Cannot remove owner
  IF v_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove team owner';
  END IF;

  -- Delete member
  DELETE FROM team_members WHERE id = p_member_id;

  -- Log action
  INSERT INTO team_audit_log (team_id, user_id, action, entity_type, entity_id, old_values)
  VALUES (v_team_id, p_requested_by, 'member_removed', 'team_member', p_member_id, jsonb_build_object('user_id', v_user_id, 'role', v_role));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Change member role
CREATE OR REPLACE FUNCTION change_member_role(
  p_member_id uuid,
  p_new_role varchar,
  p_requested_by uuid
) RETURNS void AS $$
DECLARE
  v_team_id uuid;
  v_old_role varchar;
BEGIN
  -- Get member details
  SELECT team_id, role INTO v_team_id, v_old_role
  FROM team_members
  WHERE id = p_member_id;

  -- Check if requester is owner
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_team_id
    AND user_id = p_requested_by
    AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only team owners can change roles';
  END IF;

  -- Cannot change owner role
  IF v_old_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change owner role';
  END IF;

  -- Update role
  UPDATE team_members
  SET role = p_new_role
  WHERE id = p_member_id;

  -- Log action
  INSERT INTO team_audit_log (team_id, user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_team_id, p_requested_by, 'role_changed', 'team_member', p_member_id, jsonb_build_object('role', v_old_role), jsonb_build_object('role', p_new_role));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get team statistics
CREATE OR REPLACE FUNCTION get_team_stats(p_team_id uuid)
RETURNS TABLE (
  total_members bigint,
  active_members bigint,
  pending_invitations bigint,
  invoices_created bigint,
  clients_managed bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM team_members WHERE team_id = p_team_id),
    (SELECT COUNT(*) FROM team_members WHERE team_id = p_team_id AND is_active = true),
    (SELECT COUNT(*) FROM team_invitations WHERE team_id = p_team_id AND is_used = false AND is_active = true),
    (SELECT COUNT(*) FROM invoices WHERE team_id = p_team_id),
    (SELECT COUNT(*) FROM clients WHERE team_id = p_team_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 11. TRIGGERS
-- ========================================

-- Update team updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_team_timestamp();

-- Update team_settings updated_at timestamp
CREATE TRIGGER trigger_team_settings_updated_at
  BEFORE UPDATE ON team_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_team_timestamp();
