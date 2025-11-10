export default {
    tasks: {
        title: { label: 'Title', type: 'text', required: true },
        description: { label: 'Description', type: 'textarea', required: true },
        priority: {
            label: 'Priority', type: 'select', options: [
                { id: 'low', value: 'Low' },
                { id: 'medium', value: 'Medium' },
                { id: 'high', value: 'High' },
            ], default: 'low', required: true
        },
        status: {
            label: 'Status', type: 'select', options: [
                { id: 'pending', value: 'Pending' },
                { id: 'in_progress', value: 'In Progress' },
                { id: 'completed', value: 'Completed' },
            ], default: 'in_progress', required: true
        },
        assigned_to: { label: 'Assigned To', type: 'select', options: [], query: "select id, email as value from users where user_role = 'user' and is_active=true;", required: true },
        created_by: { type: 'hidden' },
        id: { type: 'hidden' },
    }
}