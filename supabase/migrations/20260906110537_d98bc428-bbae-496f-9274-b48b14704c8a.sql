-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','moderator');
CREATE TYPE public.community_section AS ENUM ('boys','girls');
CREATE TYPE public.member_status AS ENUM ('pending','verification_required','in_review','approved','suspended','blocked','removed');
CREATE TYPE public.verification_status AS ENUM ('pending','in_review','verified','rejected','expired');
CREATE TYPE public.message_direction AS ENUM ('inbound','outbound');
CREATE TYPE public.message_status AS ENUM ('received','queued','sent','delivered','read','failed');
CREATE TYPE public.question_status AS ENUM ('pending','approved','rejected','published','hidden','closed','deleted');
CREATE TYPE public.answer_status AS ENUM ('pending','approved','rejected','published','hidden','deleted');
CREATE TYPE public.broadcast_status AS ENUM ('draft','queued','sending','sent','partially_failed','failed');
CREATE TYPE public.broadcast_target AS ENUM ('boys','girls','both','selected');

-- ============ ADMINS + ROLES ============
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles ar
    JOIN public.admins a ON a.user_id = ar.user_id AND a.is_active
    WHERE ar.user_id = _user_id
  );
$$;

-- ============ MEMBERS ============
CREATE SEQUENCE public.member_reference_seq START 101;

CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_member_id TEXT NOT NULL UNIQUE DEFAULT ('M' || nextval('public.member_reference_seq')::TEXT),
  whatsapp_user_id TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT,
  section public.community_section,
  status public.member_status NOT NULL DEFAULT 'pending',
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  verification_reference TEXT,
  consent_accepted_at TIMESTAMPTZ,
  onboarding_step TEXT NOT NULL DEFAULT 'welcome',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  suspended_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
);
CREATE INDEX idx_members_phone ON public.members(phone_number);
CREATE INDEX idx_members_wa ON public.members(whatsapp_user_id);
CREATE INDEX idx_members_section ON public.members(section);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_verification ON public.members(verification_status);
CREATE INDEX idx_members_created ON public.members(created_at DESC);

-- ============ VERIFICATION ============
CREATE TABLE public.verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'whatsapp_otp',
  status public.verification_status NOT NULL DEFAULT 'pending',
  otp_hash TEXT,
  attempts INT NOT NULL DEFAULT 0,
  requested_section public.community_section,
  reviewer_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  review_notes TEXT,
  expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_member ON public.verification_records(member_id);
CREATE INDEX idx_verification_status ON public.verification_records(status);
CREATE INDEX idx_verification_created ON public.verification_records(created_at DESC);

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT UNIQUE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  section public.community_section,
  direction public.message_direction NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_text TEXT,
  status public.message_status NOT NULL DEFAULT 'received',
  error_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);
CREATE INDEX idx_messages_member ON public.messages(member_id);
CREATE INDEX idx_messages_section ON public.messages(section);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ QUESTIONS / ANSWERS ============
CREATE SEQUENCE public.question_reference_seq START 101;

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_reference TEXT NOT NULL UNIQUE DEFAULT ('Q' || nextval('public.question_reference_seq')::TEXT),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  section public.community_section NOT NULL,
  question_text TEXT NOT NULL,
  status public.question_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);
CREATE INDEX idx_questions_section ON public.questions(section);
CREATE INDEX idx_questions_status ON public.questions(status);
CREATE INDEX idx_questions_created ON public.questions(created_at DESC);

CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  section public.community_section NOT NULL,
  answer_text TEXT NOT NULL,
  status public.answer_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);
CREATE INDEX idx_answers_question ON public.answers(question_id);
CREATE INDEX idx_answers_status ON public.answers(status);
CREATE INDEX idx_answers_created ON public.answers(created_at DESC);

-- ============ BROADCASTS ============
CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  target_type public.broadcast_target NOT NULL,
  section public.community_section,
  message_text TEXT NOT NULL,
  status public.broadcast_status NOT NULL DEFAULT 'draft',
  idempotency_key TEXT UNIQUE,
  recipient_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX idx_broadcasts_created ON public.broadcasts(created_at DESC);

CREATE TABLE public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status public.message_status NOT NULL DEFAULT 'queued',
  whatsapp_message_id TEXT,
  error_detail TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  UNIQUE (broadcast_id, member_id)
);
CREATE INDEX idx_bcr_broadcast ON public.broadcast_recipients(broadcast_id);

-- ============ MODERATION / AUDIT / SETTINGS ============
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  target_type TEXT,
  target_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_moderation_member ON public.moderation_actions(member_id);
CREATE INDEX idx_moderation_created ON public.moderation_actions(created_at DESC);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL DEFAULT 'system',
  event TEXT NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_event ON public.audit_logs(event);

CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.admins(id) ON DELETE SET NULL
);

INSERT INTO public.system_settings (key, value) VALUES
  ('community_rules', '"1. Be respectful. 2. No sharing of other members'' contact details. 3. Content stays inside your section. 4. Admin decisions are final."'::jsonb),
  ('welcome_message', '"Welcome to our private community. Reply START to begin registration."'::jsonb),
  ('auto_approve_members', 'false'::jsonb),
  ('require_admin_section_review', 'true'::jsonb),
  ('data_retention_days', '365'::jsonb);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT SELECT ON public.admin_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderation_actions TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============ RLS ============
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read own row" ON public.admins FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins update own row" ON public.admins FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "super admin manages admins" ON public.admins FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "read own roles" ON public.admin_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "admin all members" ON public.members FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin all verification" ON public.verification_records FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin all messages" ON public.messages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin read webhook events" ON public.webhook_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin all questions" ON public.questions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin all answers" ON public.answers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin all broadcasts" ON public.broadcasts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin all broadcast recipients" ON public.broadcast_recipients FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin all moderation" ON public.moderation_actions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin all settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER members_touch BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();