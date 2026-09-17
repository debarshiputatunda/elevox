-- Optional patch for databases created before notification user indexes were added to 001.
-- Safe to run on fresh installs that already include these indexes in 001_initial_schema.sql.

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_box_assignments_user ON box_assignments(user_id);
CREATE INDEX idx_users_employee ON users(employee_id);
