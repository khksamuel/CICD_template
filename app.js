const express = require('express');
const axios = require('axios');
const { Client } = require('pg');
const { Octokit } = require("@octokit/core");
const app = express();
const fs = require('fs');
const path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname, 'env.json'), 'utf8'));
const sql = require('./sql.js');
let db = new Client({
    host: configs.database_host,
    user: configs.database_user,
    password: configs.database_password,
    database: configs.database
});
const octokit = new Octokit({ auth: configs.github_token });

function log(message) {
    // clear log file if it's too big
    fs.stat(configs.log_destination, function (err, stats) {
        if (err) throw err;
        if (stats.size > 1024 * 1024 * 10) { // 10 MB
            fs.writeFile(configs.log_destination, '', function (err) {
                if (err) throw err;
            });
        }
    });
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


db.query(sql.alert_create_sql, function (err, result) {
    if (err) throw err;
});
db.query(sql.insight_create_sql, function (err, result) {
    if (err) throw err;
});
db.query(sql.avg_duration_create_sql, function (err, result) {
    if (err) throw err;
});
db.query(sql.avg_time_between_runs_create_sql, function (err, result) {
    if (err) throw err;
});

app.get('/', (req, res) => {
    // navigate to the grafana dashboard located at http://localhost:3000 after 5 seconds
    // allow time for the database to be populated
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

        var last_ts = null;
        for (let item of items) {

            // get the last time stamp for created at
            if (last_ts == null || item.created_at > last_ts) {
                last_ts = new Date(item.created_at);
            }

            db.query(sql.insights_insert_sql, [item.id, item.branch, item.duration, item.created_at, item.stopped_at, item.credits_used, item.status, item.is_approval], function (err, result) {
                if (err) throw err;
            });
        }
        log(`Inserted ${items.length} insights.`);
    } catch (error) {
        log('An error occurred while retrieving insights. ' + error);
        console.error(error);
        res.status(500).send('An error occurred while retrieving insights.');
    }

    // estimate average duration for the last 3 days
    let avg_duration = 0;
    let avg_duration_count = 0;
    let avg_duration_start_time = new Date();
    avg_duration_start_time.setDate(avg_duration_start_time.getDate() - 3);
    let avg_duration_end_time = new Date();
    db.query(`SELECT * FROM insights WHERE created_at >= '${avg_duration_start_time.toISOString()}' AND created_at <= '${avg_duration_end_time.toISOString()}'`, async function (err, result) {
        if (err) throw err;
        for (let insight of result.rows) {
            avg_duration += insight.duration;
            avg_duration_count++;
        }
        avg_duration = Math.round(avg_duration / avg_duration_count);
        log(`Average duration for the last 3 days: ${avg_duration} seconds.`);
        // add average duration to database with start time of 3 days after the last time stamp in insights
        for (let estimate = 1; estimate < 4; estimate++) {
            let estimiated_avg_duration_start_time = last_ts;
            estimiated_avg_duration_start_time.setDate(estimiated_avg_duration_start_time.getDate() + (estimate * 3));
            await new Promise((resolve, reject) => {
                db.query(sql.avg_duration_insert_sql, [estimiated_avg_duration_start_time, avg_duration], function (err, result) {
                    if (err) reject(err);
                    resolve(result);
                });
            });
        }
        log(`Inserted estimated average duration.`);
    });


    // estimate average time between runs for the last 3 days
    var avg_time_between_runs = 0;
    let avg_time_between_runs_count = 0;
    var avg_time_between_runs_start_time = new Date();
    avg_time_between_runs_start_time.setDate(avg_time_between_runs_start_time.getDate() - 3);
    let avg_time_between_runs_end_time = new Date();
    db.query(`SELECT * FROM insights WHERE created_at >= '${avg_time_between_runs_start_time.toISOString()}' AND created_at <= '${avg_time_between_runs_end_time.toISOString()}'`, async function (err, result) {
        if (err) throw err;
        let last_created_at = null;
        for (let insight of result.rows) {
            if (last_created_at != null) {
                avg_time_between_runs += (insight.created_at - last_created_at) / 1000;
                avg_time_between_runs_count++;
            }
            last_created_at = insight.created_at;
        }
        avg_time_between_runs = Math.abs(Math.round(avg_time_between_runs / avg_time_between_runs_count));
        // convert into hours
        avg_time_between_runs = Math.round(avg_time_between_runs / 3600);
        log(`Average time between runs for the last 3 days: ${avg_time_between_runs} seconds.`);
        // add average time between runs to database with start time of 3 days later
        for (let estimate = 1; estimate < 4; estimate++) {
            let estimiated_avg_time_between_runs_start_time = last_ts;
            estimiated_avg_time_between_runs_start_time.setDate(estimiated_avg_time_between_runs_start_time.getDate() + (estimate * 3));
            await new Promise((resolve, reject) => {
                db.query(sql.avg_time_between_runs_insert_sql, [estimiated_avg_time_between_runs_start_time, avg_time_between_runs], function (err, result) {
                    if (err) reject(err);
                    resolve(result);
                });
            });
        }
        log(`Inserted estimated average time between runs.`);
    });

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
            let context = alert.context;
            let severity = alert.rule.severity;
            let security_severity = alert.rule.security_severity_level;

            // fix optional null values
            if (dismissed_by == undefined) { dismissed_by = null; }
            if (dismissed_by != null) { dismissed_by = dismissed_by.login; }
            if (alert.dismissed_at == undefined) { alert.dismissed_at = null; }
            if (alert.dismissed_reason == undefined) { alert.dismissed_reason = null; }
            if (alert.dismissed_comment == undefined) { alert.dismissed_comment = null; }
            if (alert.rule == undefined) { alert.rule = null; }
            if (alert.rule != null) {
                context = alert.rule.name;
                severity = alert.rule.severity;
                security_severity = alert.rule.security_severity_level;
            }

            if (alert.fixed_by && alert.fixed_by.length > 255) { alert.fixed_by = alert.fixed_by.substring(0, 255); }
            if (alert.dismissed_reason && alert.dismissed_reason.length > 255) { alert.dismissed_reason = alert.dismissed_reason.substring(0, 255); }
            if (alert.dismissed_comment && alert.dismissed_comment.length > 255) { alert.dismissed_comment = alert.dismissed_comment.substring(0, 255); }
            if (alert.url.length > 255) { alert.url = alert.url.substring(0, 255); }
            if (alert.html_url.length > 255) { alert.html_url = alert.html_url.substring(0, 255); }
            if (alert.state.length > 255) { alert.state = alert.state.substring(0, 255); }
            if (alert.rule.length > 255) { alert.rule = alert.rule.substring(0, 255); }
            if (alert.tool.name.length > 255) { alert.tool.name = alert.tool.name.substring(0, 255); }

            db.query(sql.alerts_insert_sql, [alert.number, context, severity, security_severity, alert.created_at, alert.updated_at, alert.url, alert.html_url, alert.state, alert.fixed_by, dismissed_by, alert.dismissed_at, alert.dismissed_reason, alert.rule, alert.tool.name], function (err, result) {
                if (err) throw err;
            });
            log(`finished processing alert ${i + 1}/${alerts.length}.`);
        }
        log(`Inserted ${alerts.length} alerts.`);


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