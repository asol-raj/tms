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

/**
 * Reads the content of a file and returns it as a string.
 * Returns null if the file path is not provided or if the file does not exist.
 *
 * @param {string} filePath - The path to the file you want to read.
 * @returns {Promise<string|null>} A promise that resolves with the file content as a string,
 * or null if the file cannot be read (e.g., not found, path not provided).
 */

// let fn = path.join(__dirname, '..', 'sql', 'invmasterreport.sql'); log(fn);
async function readFileContent(fileName) {
  const filePath = path.join(__dirname, '..', 'sql', fileName + '.sql'); //log(filePath);
  // 1. Check if filePath is provided
  if (!filePath) {
    console.warn("readFileContent: File path was not provided.");
    return null;
  }

  try {
    // 2. Check if the file exists using fs.access
    // fs.constants.F_OK checks if the file is visible to the process
    await fs.access(filePath, fs.constants.F_OK);

    // 3. If file exists, read its content
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    // Handle specific errors
    if (error.code === 'ENOENT') { // 'ENOENT' means "Error No ENTry" (file or directory does not exist)
      console.warn(`readFileContent: File not found at "${filePath}".`);
      return null;
    } else {
      // For other errors (e.g., permissions issues), re-throw or log and return null
      console.error(`readFileContent: An unexpected error occurred reading "${filePath}":`, error.message);
      return null;
    }
  }
}


export {
     pool, runMysql, readFileContent, log
};