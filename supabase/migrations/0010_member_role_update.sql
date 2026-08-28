-- ============================================================
-- TEAM MANAGEMENT — allow the warung owner to change a member's
-- role (updating warung_members had SELECT/INSERT/DELETE policies
-- from 0001, but no UPDATE policy at all, so role changes were
-- impossible from the app before this).
-- ------------------------------------------------------------
-- Guardrails, enforced in SQL (not just the app layer):
--   1. Only the warung owner can change a member's role.
--   2. The owner's own row can never be changed via this path —
--      ownership transfer is a deliberately separate, unbuilt
--      feature, not a side-effect of editing a role dropdown.
--   3. No row can be promoted to 'owner' through this path either,
--      for the same reason.
-- ============================================================

drop policy if exists "members_update" on public.warung_members;
create policy "members_update" on public.warung_members
  for update using (
    public.is_warung_owner(warung_id)
    and role <> 'owner'
  )
  with check (
    public.is_warung_owner(warung_id)
    and role <> 'owner'
  );
