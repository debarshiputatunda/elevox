CREATE DATABASE IF NOT EXISTS elevox;
USE elevox;

-- =========================================
-- MASTER TABLES
-- =========================================

CREATE TABLE account_status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(255) NOT NULL
);

CREATE TABLE job_title (
    job_title_id INT AUTO_INCREMENT PRIMARY KEY,
    job_title_name VARCHAR(255) NOT NULL
);

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(255) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE country (
    country_id INT AUTO_INCREMENT PRIMARY KEY,
    country_name VARCHAR(255) NOT NULL
);

CREATE TABLE city (
    city_id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(255) NOT NULL
);

CREATE TABLE activity_status (
    activity_status_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_status_name VARCHAR(255) NOT NULL
);

CREATE TABLE box_health (
    health_status_id INT AUTO_INCREMENT PRIMARY KEY,
    health_status_name VARCHAR(255) NOT NULL
);

CREATE TABLE buckle_status (
    buckle_status_id INT AUTO_INCREMENT PRIMARY KEY,
    buckle_status_name VARCHAR(255) NOT NULL
);

CREATE TABLE tickets_status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_type VARCHAR(255) NOT NULL
);

CREATE TABLE tickets_type (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(255) NOT NULL
);

-- =========================================
-- LOCATION TABLES
-- =========================================

CREATE TABLE locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    city_id INT NOT NULL,
    location_name VARCHAR(255),
    CONSTRAINT fk_locations_country
        FOREIGN KEY (country_id)
        REFERENCES country(country_id),
    CONSTRAINT fk_locations_city
        FOREIGN KEY (city_id)
        REFERENCES city(city_id)
);

CREATE TABLE work_areas (
    work_area_id INT AUTO_INCREMENT PRIMARY KEY,
    work_area_name VARCHAR(255) NOT NULL,
    location_id INT NOT NULL,
    CONSTRAINT fk_workareas_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id)
);

-- =========================================
-- USERS
-- =========================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(255) UNIQUE,
    status_id INT,
    employee_name VARCHAR(255),
    job_title_id INT,
    email_id VARCHAR(255) UNIQUE,
    phonenumber VARCHAR(255) UNIQUE,
    work_area_id INT,
    location_id INT,
    photo LONGBLOB,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_employee (employee_id),

    CONSTRAINT fk_users_status
        FOREIGN KEY (status_id)
        REFERENCES account_status(status_id),

    CONSTRAINT fk_users_jobtitle
        FOREIGN KEY (job_title_id)
        REFERENCES job_title(job_title_id),

    CONSTRAINT fk_users_workarea
        FOREIGN KEY (work_area_id)
        REFERENCES work_areas(work_area_id),

    CONSTRAINT fk_users_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id)
);

CREATE TABLE user_role (
    user_role_id INT,
    role_id INT,
    user_id INT,
    PRIMARY KEY (user_role_id, role_id, user_id),

    CONSTRAINT fk_userrole_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id),

    CONSTRAINT fk_userrole_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

CREATE TABLE admin_level_user_multi_city_map (
    user_id INT PRIMARY KEY,
    city_id INT NOT NULL,

    CONSTRAINT fk_admincity_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_admincity_city
        FOREIGN KEY (city_id)
        REFERENCES city(city_id)
);

CREATE TABLE users_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    employee_id VARCHAR(255),
    role VARCHAR(255),
    status VARCHAR(255),
    employee_name VARCHAR(255),
    phonenumber VARCHAR(255),
    work_area VARCHAR(255),
    location VARCHAR(255),
    photo LONGBLOB,
    password VARCHAR(255),
    action VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_userlogs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

-- =========================================
-- BOX TABLES
-- =========================================

CREATE TABLE box_details (
    box_id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no VARCHAR(255),
    box_ip VARCHAR(255),
    box_details VARCHAR(500),
    location_id INT,
    work_area_id INT,
    last_seen TIMESTAMP NULL,
    activity_status INT,
    box_health_status INT,
    mfg_date DATE,
    hookA_threshold INT,
    hookB_threshold INT,
    is_assigned TINYINT NOT NULL DEFAULT 0,

    INDEX idx_box_location (location_id),

    CONSTRAINT fk_box_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id),

    CONSTRAINT fk_box_workarea
        FOREIGN KEY (work_area_id)
        REFERENCES work_areas(work_area_id),

    CONSTRAINT fk_box_activity
        FOREIGN KEY (activity_status)
        REFERENCES activity_status(activity_status_id),

    CONSTRAINT fk_box_health
        FOREIGN KEY (box_health_status)
        REFERENCES box_health(health_status_id)
);

CREATE TABLE box_assignments (
    box_id INT NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    work_area_id INT NOT NULL,

    UNIQUE KEY uq_assignment_user (user_id),
    INDEX idx_box_assignments_user (user_id),

    CONSTRAINT fk_assignment_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_assignment_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_workarea
        FOREIGN KEY (work_area_id)
        REFERENCES work_areas(work_area_id)
);

CREATE TABLE box_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    box_id INT NOT NULL,
    work_area_id INT,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_box_logs_box (box_id),
    INDEX idx_box_logs_user (user_id),
    INDEX idx_box_logs_created (created_at),

    CONSTRAINT fk_boxlogs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_boxlogs_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_boxlogs_workarea
        FOREIGN KEY (work_area_id)
        REFERENCES work_areas(work_area_id)
);

CREATE TABLE violation_details (
    box_id INT,
    user_id INT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    buckle1_status BOOLEAN,
    buckle2_status BOOLEAN,
    buckle3_status BOOLEAN,
    hookA_value INT,
    hookB_value INT,
    hookA_threshold INT,
    hookB_threshold INT,

    PRIMARY KEY (box_id, user_id, occurred_at),

    CONSTRAINT fk_violationdetails_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_violationdetails_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

CREATE TABLE violation_logs (
    box_id INT,
    user_id INT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(500),

    PRIMARY KEY (box_id, user_id, occurred_at),

    CONSTRAINT fk_violationlogs_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_violationlogs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

-- =========================================
-- TELEMETRY & NOTIFICATIONS
-- =========================================

CREATE TABLE telemetry_snapshots (
    box_id INT PRIMARY KEY,
    hook_a INT NOT NULL,
    hook_b INT NOT NULL,
    battery_percent INT NOT NULL,
    battery_voltage DECIMAL(5, 2) NOT NULL,
    buckle1 TINYINT NOT NULL,
    buckle2 TINYINT NOT NULL,
    buckle3 TINYINT NOT NULL,
    alarm_active TINYINT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_telemetry_snapshot_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE CASCADE
);

CREATE TABLE telemetry_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    box_id INT NOT NULL,
    hook_a INT NOT NULL,
    hook_b INT NOT NULL,
    battery_percent INT NOT NULL,
    battery_voltage DECIMAL(5, 2) NOT NULL,
    buckle1 TINYINT NOT NULL,
    buckle2 TINYINT NOT NULL,
    buckle3 TINYINT NOT NULL,
    alarm_active TINYINT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_telemetry_history_box_time (box_id, recorded_at),

    CONSTRAINT fk_telemetry_history_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE CASCADE
);

CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    box_id INT NULL,
    user_id INT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_notifications_created (created_at),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_box (box_id),
    INDEX idx_notifications_user (user_id),

    CONSTRAINT fk_notifications_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE TABLE alarm_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    box_id INT NOT NULL,
    user_id INT NOT NULL,
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    message VARCHAR(500) NULL,

    INDEX idx_alarm_logs_box (box_id),
    INDEX idx_alarm_logs_triggered (triggered_at),

    CONSTRAINT fk_alarm_logs_box
        FOREIGN KEY (box_id)
        REFERENCES box_details(box_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_alarm_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- =========================================
-- TICKETS
-- =========================================

CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    ticket_type_id INT,
    status_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,

    CONSTRAINT fk_tickets_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_tickets_type
        FOREIGN KEY (ticket_type_id)
        REFERENCES tickets_type(type_id),

    CONSTRAINT fk_tickets_status
        FOREIGN KEY (status_id)
        REFERENCES tickets_status(status_id)
);

CREATE TABLE tickets_logs (
    id INT,
    ticket_id INT,
    user_id INT,
    status_id INT,
    ticket_type_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,

    PRIMARY KEY (id, ticket_id, status_id, ticket_type_id),

    CONSTRAINT fk_ticketlogs_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
);

-- =========================================
-- IMPORT HISTORY
-- =========================================
-- Audit log for Excel bulk imports (locations, work areas, users, S-Boxes).
-- USED BY: POST /imports/* endpoints via app/services/import_service.py
--
-- One row is written after each import with a success/failure summary.
-- Does NOT store imported row data or per-row errors (those are returned in the API response only).
--
-- import_type values: locations | work-areas | users | sboxes
-- Required for import history logging; imports still work if this table is missing,
-- but the API will not return import_id and audit records will not be saved.

CREATE TABLE import_history (
    import_id INT AUTO_INCREMENT PRIMARY KEY,          -- returned as import_id in import API response
    import_type VARCHAR(50) NOT NULL,                  -- e.g. locations, users, sboxes
    user_id INT NULL,                                  -- admin who ran the import
    file_name VARCHAR(255) NULL,                       -- uploaded .xlsx filename
    total_rows INT NOT NULL,                           -- rows parsed from the file
    success_rows INT NOT NULL,                         -- rows inserted successfully
    failed_rows INT NOT NULL,                          -- rows that failed validation
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_import_history_type (import_type),
    INDEX idx_import_history_created (created_at),

    CONSTRAINT fk_import_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
