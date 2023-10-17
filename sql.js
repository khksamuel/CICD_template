
// export sql strings for use in other files
const alerts_insert_sql = `INSERT INTO alerts(id, context, severity, security_severity, created_at, updated_at, url, html_url, state, fixed_by, dismissed_by, dismissed_at, dismissed_reason, rule, tool)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
ON CONFLICT (id)
DO UPDATE SET
    context = excluded.context,
    severity = excluded.severity,
    security_severity = excluded.security_severity,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    url = excluded.url,
    html_url = excluded.html_url,
    state = excluded.state,
    fixed_by = excluded.fixed_by,
    dismissed_by = excluded.dismissed_by,
    dismissed_at = excluded.dismissed_at,
    dismissed_reason = excluded.dismissed_reason,
    rule = excluded.rule,
    tool = excluded.tool;
    `;

const insights_insert_sql = `INSERT INTO insights(id, branch, duration, created_at, stopped_at, credits_used, status, is_approval)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id)
    DO UPDATE SET
    branch = excluded.branch,
    duration = excluded.duration,
    created_at = excluded.created_at,
    stopped_at = excluded.stopped_at,
    credits_used = excluded.credits_used,
    status = excluded.status,
    is_approval = excluded.is_approval;
    `;

const alert_create_sql = `CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(255) PRIMARY KEY,
    context VARCHAR(255),
    severity VARCHAR(255),
    security_severity VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    url VARCHAR(255),
    html_url VARCHAR(255),
    state VARCHAR(255),
    fixed_by TIMESTAMP NULL,
    dismissed_by VARCHAR(255) NULL,
    dismissed_at TIMESTAMP NULL,
    dismissed_reason VARCHAR(255) NULL,
    rule VARCHAR(255),
    tool VARCHAR(255))`;

const insight_create_sql = `CREATE TABLE IF NOT EXISTS insights (
    id VARCHAR(255) PRIMARY KEY,
    branch VARCHAR(255),
    duration INT,
    created_at TIMESTAMP,
    stopped_at TIMESTAMP,
    credits_used INT,
    status VARCHAR(255),
    is_approval BOOLEAN
    );`;

const avg_duration_create_sql = `CREATE TABLE IF NOT EXISTS avg_durations (
    start_time TIMESTAMP UNIQUE PRIMARY KEY,
    avg_duration INT
);`;

const avg_duration_insert_sql = `INSERT INTO avg_durations (start_time, avg_duration) VALUES
    ($1, $2) ON CONFLICT (start_time) DO UPDATE SET
    start_time = excluded.start_time,
    avg_duration = excluded.avg_duration;
`;

const avg_time_between_runs_create_sql = `CREATE TABLE IF NOT EXISTS avg_time_between_runs (
    start_time TIMESTAMP UNIQUE PRIMARY KEY,
    avg_time_between INT
);`;

const avg_time_between_runs_insert_sql = `INSERT INTO avg_time_between_runs (start_time, avg_time_between) VALUES
    ($1, $2) ON CONFLICT (start_time) DO UPDATE SET
    start_time = excluded.start_time,
    avg_time_between = excluded.avg_time_between;
`;

module.exports = {
    alerts_insert_sql,
    insights_insert_sql,
    alert_create_sql,
    insight_create_sql,
    avg_duration_create_sql,
    avg_duration_insert_sql,
    avg_time_between_runs_create_sql,
    avg_time_between_runs_insert_sql,
};