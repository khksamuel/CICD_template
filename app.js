const express = require('express');
const axios = require('axios');
const { Client } = require('pg');
const { config } = require('process');
const { exec } = require('child_process');
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

db.connect((err) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database:', err.stack);
    } else {
        console.log('Connected to PostgreSQL database');
    }
});

let alerts_insert_sql = `INSERT INTO alerts(id, created_at, url, html_url, state, dismissed_by, dismissed_at, dismissed_reason, rule, tool, instances)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10 , $11)
ON CONFLICT (id)
DO UPDATE SET
    created_at = excluded.created_at,
    url = excluded.url,
    html_url = excluded.html_url,
    state = excluded.state,
    dismissed_by = excluded.dismissed_by,
    dismissed_at = excluded.dismissed_at,
    dismissed_reason = excluded.dismissed_reason,
    rule = excluded.rule,
    tool = excluded.tool,
    instances = excluded.instances;
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
    url VARCHAR(255),
    html_url VARCHAR(255),
    state VARCHAR(255),
    dismissed_by VARCHAR(255),
    dismissed_at TIMESTAMP,
    dismissed_reason VARCHAR(255),
    rule VARCHAR(255),
    tool VARCHAR(255),
    instances VARCHAR(255));`;

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
}
);
db.query(insight_create_sql, function (err, result) {
    if (err) throw err;
});

app.get('/', (req, res) => {
    // navigate to the grafana dashboard located at http://localhost:3000 after 5 seconds
    setTimeout(() => {
        res.redirect('http://localhost:3000/d/5Jm0y9yMk/circleci-dashboard?orgId=1&refresh=5s');
    }, 5 * 1000);
});

app.get('/insights', async (req, res) => {
    try {
        console.log('Fetching insights...');
        // `https://circleci.com/api/v2/insights/${vcs}/${circleci_username}/${project_name}/workflows/`
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
            console.log('No insights found.');
            return;
        }

        for (let item of items) {
            db.query(insights_insert_sql, [item.id, item.branch, item.duration, item.created_at, item.stopped_at, item.credits_used, item.status, item.is_approval], function (err, result) {
                if (err) throw err;
                console.log("1 insights record inserted");
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while retrieving insights.');
    }
});

app.get('/alerts', async (req, res) => {
    try {
        console.log('Fetching alerts...');
        const response = await octokit.request(`GET /repos/${configs.repo_owner}/${configs.repo}/code-scanning/alerts`, {
            owner: configs.repo_owner,
            repo: configs.repo,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        let alerts = response.data.alerts;
        if ((alerts == null) || (alerts.length == 0)) {
            console.log('No alerts found.');
            return;
        }

        for (let alert of alerts) {
            db.query(alerts_insert_sql, [alert.id, alert.created_at, alert.url, alert.html_url, alert.state, alert.dismissed_by, alert.dismissed_at, alert.dismissed_reason, alert.rule.name, alert.tool.name, alert.instances[0].location.path], function (err, result) {
                if (err) throw err;
                console.log("1 alert record inserted");
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while retrieving alerts.');
    }
});

app.listen(3080, () => {
    console.log(`App listening at http://localhost:3080`);
    axios.get(`http://localhost:3080/insights`);
    axios.get(`http://localhost:3080/alerts`);

    setInterval(() => {
        axios.get(`http://localhost:3080/insights`)
            .catch(function (error) {
                console.log(error);
            });
    }, 30 * 1000);

    setInterval(() => {
        axios.get(`http://localhost:3080/alerts`)
            .catch(function (error) {
                console.log(error);
            });
    }, 3 * 60 * 1000);
});