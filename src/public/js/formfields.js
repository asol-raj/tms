export default {
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