alter table public.signup_verifications
  add column if not exists code_hash text,
  add column if not exists attempts integer not null default 0;

create index if not exists signup_verifications_email_created_at_idx
  on public.signup_verifications (email, created_at desc);

comment on column public.signup_verifications.code_hash is
  'SHA-256 digest of a short-lived verification code; plaintext codes are never persisted.';

comment on column public.signup_verifications.attempts is
  'Number of failed verification attempts for the current code.';
