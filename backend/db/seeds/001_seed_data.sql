INSERT INTO leave_types (name, default_days_per_year, requires_document, is_active) VALUES
  ('Annual',        21.0, 0, 1),
  ('Sick',          14.0, 1, 1),
  ('Maternity',     90.0, 0, 1),
  ('Paternity',     14.0, 0, 1),
  ('Compassionate',  5.0, 0, 1),
  ('Unpaid',        NULL, 0, 1);

INSERT INTO public_holidays (holiday_date, name) VALUES
  ('2026-01-01', 'New Years Day'),
  ('2026-03-20', 'Idd-ul-Fitr'),
  ('2026-04-03', 'Good Friday'),
  ('2026-04-06', 'Easter Monday'),
  ('2026-05-01', 'Labour Day'),
  ('2026-05-27', 'Idd-ul-Azha'),
  ('2026-06-01', 'Madaraka Day'),
  ('2026-10-10', 'Mazingira Day'),
  ('2026-10-20', 'Mashujaa Day'),
  ('2026-12-12', 'Jamhuri Day'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-26', 'Utamaduni Day');