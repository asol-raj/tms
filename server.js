import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import os from 'os';
import ejs from 'ejs';
import http from 'http';                    // 🔹 NEW
import { Server } from 'socket.io';         // 🔹 NEW
import { fileURLToPath } from 'url';
import expressEjsLayouts from 'express-ejs-layouts';
import router from './src/routes/_router.js';

dotenv.config();

// --- Polyfill for __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ---

const app = express();
const port = process.env.PORT || 4004;

// 🔹 Create HTTP server
const server = http.createServer(app);

// 🔹 Attach Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*', // tighten later if needed
        methods: ['GET', 'POST']
    }
});

// 🔹 EJS delimiter
ejs.delimiter = '?';

// 🔹 Express middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressEjsLayouts);

app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use('/static/special_tasks',
    express.static(path.join(process.cwd(), 'src', 'uploads', 'special_tasks'))
);

// 🔹 Default locals
app.use((req, res, next) => {
    res.locals.hideNavbar = false;
    res.locals.title = 'TMS';
    next();
});

// 🔹 Routes
app.use('/', router);

// 🔹 404
app.use((req, res) => {
    res.status(404).render('error', { title: 'Page Not Found', layout: false });
});

// 🔹 Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('<h1>500 - Server Error</h1>');
});


// =========================
// 🔌 SOCKET.IO SECTION
// =========================

io.on('connection', socket => {
    console.log('🔌 User connected:', socket.id);

    socket.on('chat:send', data => {
        // broadcast to everyone
        console.log('📨 MESSAGE RECEIVED FROM CLIENT:', data);
        io.emit('chat:receive', data);
    });

    socket.on('disconnect', (reason ) => {
        console.log('🔴 SOCKET DISCONNECTED:', socket.id, reason);
    });
});


// 🔹 Start server
server.listen(port, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    let hostAddress;

    for (const name in networkInterfaces) {
        for (const iface of networkInterfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                hostAddress = iface.address;
                break;
            }
        }
        if (hostAddress) break;
    }

    if (hostAddress) {
        console.log(`🚀 Server started at http://${hostAddress}:${port}`);
    } else {
        console.log(`🚀 Server started on port ${port}`);
    }
});

// 🔹 Export io (OPTIONAL, but recommended)
export { io };
