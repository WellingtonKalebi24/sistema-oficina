ALTER TABLE "company_settings"
ADD COLUMN "agenda_view_mode" TEXT NOT NULL DEFAULT 'table';

ALTER TABLE "company_settings"
ADD CONSTRAINT "company_settings_agenda_view_mode_check"
CHECK ("agenda_view_mode" IN ('table', 'calendar', 'kanban'));
