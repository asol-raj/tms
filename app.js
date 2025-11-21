import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import os from 'os';
import ejs from 'ejs';
import { fileURLToPath } from 'url'; // 1. Added for __dirname
import expressEjsLayouts from 'express-ejs-layouts'; // 2. Imported module
import router from './src/routes/_router.js'; // 3. Imported router (note the .js)

// Run config for dotenv
dotenv.config();

// --- Polyfill for __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ---

const app = express();
const port = process.env.PORT || 4004;

ejs.delimiter = '?';

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views')); // Uses new __dirname
app.use(expressEjsLayouts); // 2. Used imported module
app.use(express.static(path.join(__dirname, 'src', 'public'))); // Uses new __dirname

// 🔹 Middleware to set default navbar visibility
app.use((req, res, next) => {
    res.locals.hideNavbar = false; // default: show navbar
    res.locals.title = 'TMS';
    next();
});

app.use('/', router); // 3. Used imported router

// CATCH-ALL ROUTE (MUST be AFTER all other specific routes)
app.use((req, res, next) => {
    res.status(404).render('error', { title: 'Page Not Found', layout: false });
});

// Optional: General error handler for server errors (e.g., 500)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('<h1>500 - Server Error</h1><p>Something went wrong on our end!</p>');
});

app.listen(port, '0.0.0.0', ()=> {
    const networkInterfaces = os.networkInterfaces();
    let hostAddress;

    for (const name in networkInterfaces) {
        const interfaces = networkInterfaces[name];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                hostAddress = iface.address;
                break;
            }
        }
        if (hostAddress) break;
    }

    if (hostAddress) {
        console.log(`Server started at http://${hostAddress}:${port}`);
    } else {
        console.log(`Server started on port ${port}, but could not determine host IP address.`);
    }
});