SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  password_hash   VARCHAR(100) NOT NULL,
  ivr_pin_hash    VARCHAR(100) NULL,
  role            ENUM('EMPLOYEE','MANAGER','HR_ADMIN') NOT NULL DEFAULT 'EMPLOYEE',
  manager_id      INT UNSIGNED NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email    (email),
  KEY        idx_users_manager (manager_id),
  KEY        idx_users_role    (role),
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_types (
  id                    INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  name                  VARCHAR(50)   NOT NULL,
  default_days_per_year DECIMAL(5,1)  NULL,
  requires_document     TINYINT(1)    NOT NULL DEFAULT 0,
  is_active             TINYINT(1)    NOT NULL DEFAULT 1,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_leave_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_balances (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL,
  leave_type_id       INT UNSIGNED NOT NULL,
  year                SMALLINT     NOT NULL,
  allocated_days      DECIMAL(5,1) NOT NULL DEFAULT 0,
  used_days           DECIMAL(5,1) NOT NULL DEFAULT 0,
  pending_days        DECIMAL(5,1) NOT NULL DEFAULT 0,
  max_carry_over_days DECIMAL(5,1) NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_balance (user_id, leave_type_id, year),
  KEY        idx_balances_type (leave_type_id),
  CONSTRAINT fk_balances_user FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_balances_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_applications (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  leave_type_id   INT UNSIGNED NOT NULL,
  start_date      DATE         NOT NULL,
  end_date        DATE         NOT NULL,
  working_days    DECIMAL(5,1) NOT NULL,
  reason          VARCHAR(500) NULL,
  status          ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  manager_id      INT UNSIGNED NULL,
  manager_comment VARCHAR(500) NULL,
  decided_at      DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_apps_user_status    (user_id,    status),
  KEY idx_apps_manager_status (manager_id, status),
  KEY idx_apps_leave_type     (leave_type_id),
  CONSTRAINT fk_apps_user    FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_apps_type    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_apps_manager FOREIGN KEY (manager_id)    REFERENCES users(id)       ON DELETE SET NULL,
  CONSTRAINT chk_apps_dates  CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS public_holidays (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE         NOT NULL,
  name         VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_holiday_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL,
  application_id      INT UNSIGNED NULL,
  channel             ENUM('SMS','EMAIL','IVR') NOT NULL,
  payload             TEXT         NOT NULL,
  status              ENUM('QUEUED','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'QUEUED',
  provider_message_id VARCHAR(100) NULL,
  sent_at             DATETIME     NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user        (user_id),
  KEY idx_notif_application (application_id),
  CONSTRAINT fk_notif_user        FOREIGN KEY (user_id)        REFERENCES users(id)             ON DELETE CASCADE,
  CONSTRAINT fk_notif_application FOREIGN KEY (application_id) REFERENCES leave_applications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ivr_call_log (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  caller_extension VARCHAR(20)  NOT NULL,
  employee_id      INT UNSIGNED NULL,
  outcome          VARCHAR(50)  NOT NULL,
  started_at       DATETIME     NOT NULL,
  ended_at         DATETIME     NULL,
  KEY idx_ivr_employee (employee_id),
  CONSTRAINT fk_ivr_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED    NULL,
  action        VARCHAR(50)     NOT NULL,
  entity_type   VARCHAR(50)     NOT NULL,
  entity_id     INT UNSIGNED    NOT NULL,
  before_json   JSON            NULL,
  after_json    JSON            NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_actor  (actor_user_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
