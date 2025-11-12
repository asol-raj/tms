export default {
    users: {
        username: { label: 'Username', type: 'text', message: '' },
        fullname: { label: 'Full Name', type: 'text', required: true },
        email: { label: 'Email', type: 'email', required: true },
        user_role: { label: 'User Role', type: 'select', options: [{ id: 'admin', value: 'Admin' }, { id: 'manager', value: 'Manager' }, { id: 'user', value: 'User' }], default: 'user', required: true },
        is_active: { label: 'Is Active', type: 'select', options: [{ id: '1', value: 'Yes' }, { id: '0', value: 'No' }], default: 1, required: true },
        id: { type: 'hidden' }
    },
    create_user: {
        username: { label: 'Username', type: 'text', case: 'lower', helptext: 'Must be Unique with Minimum 3 letters long!' },
        fullname: { label: 'Full Name', type: 'text', required: true },
        email: { label: 'Email', type: 'email', required: true, case: 'lower' },
        password: { label: 'Password', type: 'text', default: 'cfc@123', required: true, helptext: 'Must be 6 letters long' },
        // confirm_pwd: { label: 'Confirm Password', type: 'password', required: true, },
        userrole: { label: 'User Role', type: 'select', options: [{ id: 'admin', value: 'Admin' }, { id: 'manager', value: 'Manager' }, { id: 'user', value: 'User' }], default: 'user', required: true },
        // is_active: { label: 'Is Active', type: 'select', options: [{ id: '1', value: 'Yes' }, { id: '0', value: 'No' }], default: 1, required: true },
    },

    tasks: {
        title: { label: 'Title', type: 'text', required: true },
        description: { label: 'Description', type: 'textarea', required: false },
        priority: {
            label: 'Priority', type: 'select', options: [
                { id: 'low', value: 'Low' },
                { id: 'medium', value: 'Medium' },
                { id: 'high', value: 'High' },
            ], default: 'low', required: true, blank: false
        },
        assigned_to: { label: 'Assigned To', type: 'select', query: "select id, email as value from users where user_role = 'user' and is_active=true;", required: false, blank: true },
        id: { type: 'hidden' },
    }
}