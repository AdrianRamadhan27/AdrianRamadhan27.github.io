-- ONE-TIME data fix. Run this ONCE in the Supabase SQL editor
-- (Project -> SQL Editor -> New query -> paste -> Run). Do NOT re-run it --
-- it reverses sort_order, so a second run puts everything back.
--
-- Why: the app's contract is that `experiences` and `projects` are stored
-- CHRONOLOGICALLY -- ascending sort_order = oldest first. The `chat` edge
-- function relies on this (get_experience(-1) / get_project(-1) = "the most
-- recent one"), and the website reverses the list itself to show
-- newest-first (see newestFirst() in src/hooks/useContent.tsx). The rows
-- were entered newest-first, which made the chatbot name the wrong entry as
-- "latest". This flips them to the chronological order the code expects.
--
-- After running: the CMS Experience/Projects tabs will list entries
-- oldest-first (#1 = your first role/project); that's expected.

update experiences e
set sort_order = s.n
from (
  select id, (row_number() over (order by sort_order desc)) - 1 as n
  from experiences
) s
where e.id = s.id;

update projects p
set sort_order = s.n
from (
  select id, (row_number() over (order by sort_order desc)) - 1 as n
  from projects
) s
where p.id = s.id;
