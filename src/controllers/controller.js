

// src/controllers/selectController.js
import { pool, runMysql, readFileContent, log } from '../config/db.js';
import { Queries } from './querys.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url'; // 1. Added for __dirname
import pkg from 'node-sql-parser';
const { Parser } = pkg;



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new Parser();


/**
 * Very strict validation to allow ONLY a single SELECT statement.
 * - Must start with SELECT
 * - No semicolons / multiple statements
 * - No comments
 * - No write/DDL keywords
 * - Optional: enforce a default LIMIT
 */
function validateSelectOnly(sql) {
    if (typeof sql !== 'string') return { ok: false, msg: 'SQL must be a string.' };

    const original = sql;
    sql = sql.trim();

    // Must start with SELECT (case-insensitive)
    if (!/^\s*select\b/i.test(sql)) {
        return { ok: false, msg: 'Only SELECT queries are allowed.' };
    }

    // Disallow semicolons to prevent multi-statements
    if (sql.includes(';')) {
        return { ok: false, msg: 'Multiple statements are not allowed.' };
    }

    // Disallow comments
    if (/--|\/\*/.test(sql)) {
        return { ok: false, msg: 'SQL comments are not allowed.' };
    }

    // Disallow dangerous keywords anywhere in the string
    const forbidden = /\b(insert|update|delete|drop|alter|create|truncate|replace|grant|revoke|call|exec|execute|handler|load|outfile|infile)\b/i;
    if (forbidden.test(sql)) {
        return { ok: false, msg: 'Forbidden keyword detected in query.' };
    }

    // Optional: enforce LIMIT if missing (to avoid huge scans)
    if (!/\blimit\s+\d+/i.test(sql)) {
        sql = `${sql} LIMIT 200`;
    }

    // Strip trailing spaces
    sql = sql.trim();

    return { ok: true, sql };
}

/**
 * POST /auth/query/select
 * Body: { sql: string, params?: any[] }
 */
export async function runSelect(req, res) {
    try {
        const { sql, params } = req.body || {};
        const v = validateSelectOnly(sql);
        if (!v.ok) {
            return res.status(400).json({ ok: false, error: v.msg });
        }

        // Basic sanity on params
        if (params !== undefined && !Array.isArray(params)) {
            return res.status(400).json({ ok: false, error: '`params` must be an array if provided.' });
        }
        if (Array.isArray(params) && params.length > 200) {
            return res.status(400).json({ ok: false, error: 'Too many parameters.' });
        }

        // Execute with a timeout to avoid long-running queries (ms)
        const [rows] = await pool.query({ sql: v.sql, timeout: 10000 }, params || []);

        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('SELECT controller error:', err);
        return res.status(500).json({ ok: false, error: 'Failed to execute query.' });
    }
}

function logRejectedQuery(ip, query, reason) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toISOString().slice(11, 19); // HH:MM:SS

  // Daily log file
  const dailyLogFile = path.join(__dirname, 'logs', `rejected_queries_${dateStr}.log`);

  const logEntry = [
    "------------------------------------------------------------",
    `Time   : ${timeStr}`,
    `IP     : ${ip}`,
    `Reason : ${reason}`,
    `Query  : ${query}`,
    "------------------------------------------------------------\n"
  ].join("\n");

  fs.appendFile(dailyLogFile, logEntry, (err) => {
    if (err) console.error("Failed to write to rejection log:", err);
  });
}

export const advanceMysqlQuery = async (req, res) => {
  try {
    let { key, values = [], type = null, srchterm = null, qry = null } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!key || !qry) throw new Error("Missing Query");

    let sql;

    if (qry) {
      sql = qry.trim().replace(/\s+/g, ' ');

      // 🚀 Quick pre-check
      if (!/^(SELECT|WITH)\b/i.test(sql)) {
        logRejectedQuery(clientIp, sql, "Does not start with SELECT/WITH");
        return res.status(400).json({
          success: false,
          message: "Only SELECT queries are allowed in external input."
        });
      }

      // Deep validation using SQL parser
      let ast;
      try {
        ast = parser.astify(sql, { database: 'mysql' });
      } catch (parseError) {
        logRejectedQuery(clientIp, sql, `Invalid SQL syntax: ${parseError.message}`);
        return res.status(400).json({
          success: false,
          message: "Invalid SQL syntax",
          error: parseError.message
        });
      }

      const statements = Array.isArray(ast) ? ast : [ast];
      for (const stmt of statements) {
        if (stmt.type !== 'select' && stmt.type !== 'with') {
          logRejectedQuery(clientIp, sql, `Statement type '${stmt.type}' not allowed`);
          return res.status(400).json({
            success: false,
            message: "Only SELECT queries are allowed in external input."
          });
        }
        if (stmt.type === 'with' && stmt.stmt.type !== 'select') {
          logRejectedQuery(clientIp, sql, "WITH query not ending in SELECT");
          return res.status(400).json({
            success: false,
            message: "WITH queries must end in a SELECT."
          });
        }
        const forbiddenTypes = [
          'insert', 'update', 'delete', 'drop',
          'alter', 'truncate', 'create', 'replace', 'merge'
        ];
        const hasForbidden = (node) => {
          if (!node || typeof node !== 'object') return false;
          if (forbiddenTypes.includes(node.type)) return true;
          return Object.values(node).some(hasForbidden);
        };
        if (hasForbidden(stmt)) {
          logRejectedQuery(clientIp, sql, "Contains forbidden SQL operation");
          return res.status(400).json({
            success: false,
            message: "Query contains forbidden operations."
          });
        }
      }
    } else {
      // Internal trusted query
      sql = Queries[key] || (await readFileContent(key));
    }

    if (!sql) throw new Error("Missing/Invalid Query");

    // Handle search replacement
    if (type === 'search') {
      if (!srchterm) {
        return res.status(400).json({ data: [] });
      }
      const searchTermWithWildcards = `%${srchterm}%`;
      const searchCount = (sql.match(/:search/g) || []).length;
      for (let i = 0; i < searchCount; i++) {
        values.push(searchTermWithWildcards);
      }
      sql = sql.replace(/:search/g, '?');
    }

    // log(values);
    const rsp = await runMysql(sql, values);
    res.status(200).json({ data: rsp });

  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: error.message,
      data: []
    });
  }
};



