// Socket.IO shared instance
// This file should be imported ONCE per page

// eslint-disable-next-line no-undef
const socket = io({
    transports: ['websocket'],   // preferred
    autoConnect: true
});

/**
 * Emit event safely
 */
function emit(event, data) {
    if (!socket.connected) {
        console.warn('Socket not connected. Event skipped:', event);
        return;
    }
    socket.emit(event, data);
}

/**
 * Listen to event
 */
function on(event, callback) {
    socket.on(event, callback);
}

/**
 * Disconnect socket (optional)
 */
function disconnect() {
    socket.disconnect();
}

/**
 * Get socket id (useful for debugging)
 */
function id() {
    return socket.id;
}

// 🔹 Export only what is needed
export {
    socket,
    emit,
    on,
    disconnect,
    id
};
