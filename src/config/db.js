import 'dotenv/config'; // Load .env variables
import mysql from 'mysql2/promise';

const log = console.log;

const dbConfig = {
    host: process.env.MYSQL_HOSTNAME,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWROD,
    database: process.env.MYSQL_DATABASE,
    port: 3306,
    connectionLimit: 10,
    waitForConnections: true,
};

// Create the MySQL connection pool using the promise-based API
const pool = mysql.createPool(dbConfig);

/**
 * Function to execute a MySQL query using the connection pool.
 * Leverages mysql2's built-in promise support.
 *
 * @param {string} query - The SQL query string to execute.
 * @param {Array} [values=[]] - An optional array of values to be escaped and
 * inserted into the query (prevents SQL injection).
 * @returns {Promise<[Array, Array]>} A promise that resolves to an array
 * containing [rows, fields]. For SELECT queries, `rows` will be the data.
 * For INSERT/UPDATE/DELETE queries, `rows` will contain information like
 * `insertId`, `affectedRows`, etc.
 * @throws {Error} Throws an error if the query fails.
 */
async function runMysql(query, values = []) {
    try {
        // console.log(`Executing query: "${query}" with values: [${values.join(', ')}]`);
        // Use pool.execute for prepared statements (recommended for security and performance)
        // or pool.query for simpler queries (also handles values for escaping)
        // const [rows, fields] = await pool.execute(query, values);
        const [rows, fields] = await pool.query(query, values);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.stack);
        throw error; // Re-throw the error to be caught by the caller
    }
}


export {
     pool, runMysql, log
};