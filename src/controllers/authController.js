import { log } from '../config/db.js';
import User from '../models/UserModel.js'; // Adjust the path if needed

/**
 * Registers a new user.
 * Handles request validation, calls the user model, and sends a response.
 */
export const registerUser = async (req, res) => {
    try {
        // 1. Get user data from the request body
        const { email, password, username, fullname, userrole } = req.body;

        // 2. Simple Validation: Check for required fields
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        if (!password.length > 5) {
            return res.status(400).json({
                message: 'Password Must be 6 Characters Long'
            });
        }

        // 3. Call the model to create the user
        // The model (User.create) handles password hashing, transactions,
        // and checking for duplicate emails/usernames.
        const newUser = await User.create({
            email,
            password,
            username: username || null, // Pass null if username is empty/undefined
            fullname: fullname || null,
            userrole: userrole || 'user',
        });

        // 4. Send a success response
        res.status(201).json({
            message: 'User registered successfully!',
            userId: newUser.id,
            email: newUser.email
        });

    } catch (error) {
        // 5. Handle errors from the model

        // Check for the specific "duplicate" error we created in the model
        if (error.message.includes('already exists')) {
            return res.status(409).json({ message: error.message }); // 409 Conflict
        }

        // Handle other potential errors
        console.error('Error during user registration:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Logs in a user.
 * Handles request validation, calls the user model, and sends a token.
 */
export const loginUser = async (req, res) => {
    try {
        // 1. Get email and password from request body
        const { email, password } = req.body;

        // 2. Simple Validation
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        // 3. Call the model to log in
        // The User.login method will find the user, compare the password,
        // and return a JWT if successful.
        const token = await User.login(email, password);
        res.cookie('tms_token', token, { httpOnly: true, maxAge: 30 * 86400000 });
        // 4. Send the token back to the client
        res.status(200).json({
            message: 'Login successful!'
        });

    } catch (error) {
        // 5. Handle errors from the model

        // Check for the "Invalid email or password" error we created
        if (error.message.includes('Invalid')) {
            return res.status(401).json({ message: error.message }); // 401 Unauthorized
        }

        // Handle other potential errors
        console.error('Error during user login:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { userid, password } = req.body;

        if (!userid || !password) {
            return res.status(400).json({
                message: 'password is required.'
            });
        }

        if (!password.length > 5) {
            return res.status(400).json({
                message: 'Password Must be 6 Characters Long'
            });
        }

        const resp = User.resetPassword(adminId, userid, password);
        res.status(201).json({
            message: 'Password Changed successfully!',
        });

    } catch (error) {
        console.error('Error during reset Password:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

export async function changePasswor(req, res) {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        await User.changePassword(userId, currentPassword, newPassword);
        // optionally invalidate sessions/jwt tokens
        res.json({ ok: true, message: 'Password changed Successfully' });
    } catch (err) {
        res.status(400).json({ ok: false, error: err.message });
    }
}

export async function getUserprofile(req, res) {
    try {
        const userId = req.user.id;
        let profile = await User.getUserProfile(userId);
        res.json({ ok: true, profile });
    } catch (error) {
        res.status(400).json({ ok: false, error: err.message });
    }
}

export async function updteProfile(req, res) {
    try {
        let userid = req.user.id;
        let rsp = await User.updateProfile(userid, req.body);
        res.json(rsp);
    } catch (error) {
        res.status(400).json({ ok: false, error: err.message });
    }
}