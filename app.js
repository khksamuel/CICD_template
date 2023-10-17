const express = require('express');
const axios = require('axios');
const { Client } = require('pg');
const { Octokit } = require("@octokit/core");
const app = express();
const fs = require('fs');
const path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname, 'env.json'), 'utf8'));
let db = new Client({
    host: configs.database_host,
    user: configs.database_user,
    password: configs.database_password,
    database: configs.database
});
const octokit = new Octokit({ auth: configs.github_token });

function log(message) {
    // write to log file
    fs.appendFile(configs.log_destination, `[${new Date().toLocaleString()}] ${message}\n`, function (err) {
        if (err) throw err;
    });
}

db.connect((err) => {
    if (err) {
        log('Error connecting to PostgreSQL database: ' + err.stack);
        console.error('Error connecting to PostgreSQL database:', err.stack);
    } else {
        log('Connected to PostgreSQL database');
    }
});

let alerts_insert_sql = `INSERT INTO alerts(id, created_at, updated_at, url, html_url, state, fixed_by, dismissed_by, dismissed_at, dismissed_reason, rule, tool)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
ON CONFLICT (id)
DO UPDATE SET
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

let insights_insert_sql = `INSERT INTO insights(id, branch, duration, created_at, stopped_at, credits_used, status, is_approval)
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

let alert_create_sql = `CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(255) PRIMARY KEY,
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

let insight_create_sql = `CREATE TABLE IF NOT EXISTS insights (
    id VARCHAR(255) PRIMARY KEY,
    branch VARCHAR(255),
    duration INT,
    created_at TIMESTAMP,
    stopped_at TIMESTAMP,
    credits_used INT,
    status VARCHAR(255),
    is_approval BOOLEAN
    );`;

db.query(alert_create_sql, function (err, result) {
    if (err) throw err;
});
db.query(insight_create_sql, function (err, result) {
    if (err) throw err;
});

app.get('/', (req, res) => {
    // navigate to the grafana dashboard located at http://localhost:3000 after 5 seconds
    setTimeout(() => {
        res.redirect('http://localhost:3000');
    }, 5 * 1000);
});

app.get('/insights', async (req, res) => {
    try {
        log('Fetching insights...');
        let vcs = configs.vcs;
        let circleci_username = configs.circleci_username;
        let project_name = configs.project_name;
        let workflow_name = configs.workflow_name;
        let project_slug = `${vcs}/${circleci_username}/${project_name}`;
        let api_request = `https://circleci.com/api/v2/insights/${project_slug}/workflows/${workflow_name}`;
        const response = await axios.get(api_request, {
            headers: {
                'Circle-Token': configs.circleci_token
            }
        });

        let data = response.data;
        let items = data.items;

        if ((items == null) || (items.length == 0)) {
            log('No insights found.');
            return;
        }

        for (let item of items) {
            for (itemm in items) {
                // see which fields are too long
                try {
                    if (alert[item].length > 255) {
                        log(`${item} is too long: ${alert[item]}`);
                    }
                } catch (error) {
                    // log(error);
                }
            }
            db.query(insights_insert_sql, [item.id, item.branch, item.duration, item.created_at, item.stopped_at, item.credits_used, item.status, item.is_approval], function (err, result) {
                if (err) throw err;
            });
        }
        log(`Inserted ${items.length} insights.`)
    } catch (error) {
        log('An error occurred while retrieving insights. ' + error);
        console.error(error);
        res.status(500).send('An error occurred while retrieving insights.');
    }
});

app.get('/alerts', async (req, res) => {
    try {
        log('Fetching alerts...');
        const response = await octokit.request(`GET /repos/${configs.repo_owner}/${configs.repo}/code-scanning/alerts`, {
            owner: configs.repo_owner,
            repo: configs.repo,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        let alerts = response.data;
        if ((alerts == null) || (alerts.length == 0)) {
            log('No alerts found.');
            return;
        }

        // for (let alert of alerts) {
        for (let i = 0; i < alerts.length; i++) {
            log(`Processing alert ${i + 1}/${alerts.length}...`);
            const alert = alerts[i];
            let dismissed_by = alert.dismissed_by;
            
            // fix optional null values
            if (dismissed_by == undefined) { dismissed_by = null; }
            if (dismissed_by != null) { dismissed_by = dismissed_by.login; }
            if (alert.dismissed_at == undefined) { alert.dismissed_at = null; }
            if (alert.dismissed_reason == undefined) { alert.dismissed_reason = null; }
            if (alert.dismissed_comment == undefined) { alert.dismissed_comment = null; }

            if (alert.fixed_by && alert.fixed_by.length > 255) { alert.fixed_by = alert.fixed_by.substring(0, 255); }
            if (alert.dismissed_reason && alert.dismissed_reason.length > 255) { alert.dismissed_reason = alert.dismissed_reason.substring(0, 255); }
            if (alert.dismissed_comment && alert.dismissed_comment.length > 255) { alert.dismissed_comment = alert.dismissed_comment.substring(0, 255); }
            if (alert.url.length > 255) { alert.url = alert.url.substring(0, 255); }
            if (alert.html_url.length > 255) { alert.html_url = alert.html_url.substring(0, 255); }
            if (alert.state.length > 255) { alert.state = alert.state.substring(0, 255); }
            if (alert.rule.length > 255) { alert.rule = alert.rule.substring(0, 255); }
            if (alert.tool.name.length > 255) { alert.tool.name = alert.tool.name.substring(0, 255); }

            db.query(alerts_insert_sql, [alert.number, alert.created_at, alert.updated_at, alert.url, alert.html_url, alert.state, alert.fixed_by, dismissed_by, alert.dismissed_at, alert.dismissed_reason, alert.rule, alert.tool.name], function (err, result) {
                if (err) throw err;
            });
            log(`finished processing alert ${i + 1}/${alerts.length}.`);
        }
        log(`Inserted ${alerts.length} alerts.`)
        
        
    } catch (error) {
        log('An error occurred while retrieving alerts. ' + error);
        console.error(error);
        res.status(500).send('An error occurred while retrieving alerts.');
    }
});

app.listen(3080, () => {
    console.log(`App started at http://localhost:3080`);
    log(`App started at http://localhost:3080`);
    axios.get(`http://localhost:3080/insights`);
    axios.get(`http://localhost:3080/alerts`);

    setInterval(() => {
        axios.get(`http://localhost:3080/insights`)
            .catch(function (error) {
                log(error);
            });
    }, 30 * 1000); // 30 seconds

    setInterval(() => {
        axios.get(`http://localhost:3080/alerts`)
            .catch(function (error) {
                log(error);
            });
    }, 3 * 60 * 1000); // 3 minutes
});