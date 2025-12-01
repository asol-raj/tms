export default {
    users: {
        username: { label: 'Username', type: 'text', message: '' },
        fullname: { label: 'Full Name', type: 'text', required: true },
        email: { label: 'Email', type: 'email', required: true },
        user_role: { label: 'User Role', type: 'select', options: [{ id: 'admin', value: 'Admin' }, { id: 'manager', value: 'Manager' }, { id: 'user', value: 'User' }], default: 'user', required: true },
        is_active: { label: 'Is Active', type: 'select', options: [{ id: '1', value: 'Yes' }, { id: '0', value: 'No' }], default: 1, required: true },
        id: { type: 'hidden' }
    },

    tasks: {
        title: { label: 'Task Title', type: 'text', required: true },
        description: { label: 'Task Description', type: 'textarea', required: false },
        priority: {
            label: 'Priority', type: 'select', options: [
                { id: 'low', value: 'Low' },
                { id: 'medium', value: 'Medium' },
                { id: 'high', value: 'High' },
            ], default: 'low', required: true, blank: false
        },
        assigned_to: { label: 'Assigned To', type: 'select', query: "select id, fullname as value from users where user_role = 'user' and is_active=true;", required: false, blank: true },
        id: { type: 'hidden' },
    },

    create_user: {
        username: { label: 'Username', type: 'text', case: 'lower', helptext: 'Lowercase Unique with Minimum 3 letters long!' },
        fullname: { label: 'Full Name', type: 'text', required: true },
        email: { label: 'Email', type: 'email', required: true, case: 'lower' },
        password: { label: 'Password', type: 'text', default: 'cfc@123', required: true, helptext: 'Must be 6 letters long' },
        // confirm_pwd: { label: 'Confirm Password', type: 'password', required: true, },
        userrole: { label: 'User Role', type: 'select', options: [{ id: 'admin', value: 'Admin' }, { id: 'manager', value: 'Manager' }, { id: 'user', value: 'User' }], default: 'user', required: true },
        // is_active: { label: 'Is Active', type: 'select', options: [{ id: '1', value: 'Yes' }, { id: '0', value: 'No' }], default: 1, required: true },
    },

    register: {
        username: { label: 'Username', type: 'text', case: 'lower', message: 'Lowercase Unique with Minimum 3 letters long!' },
        fullname: { label: 'Full Name', type: 'text', required: true },
        email: { label: 'Email', type: 'email', required: true, case: 'lower' },
        password: { label: 'Password', type: 'text', default: 'cfc@123', required: true, message: 'Must be 6 letters long' },
        // confirm_pwd: { label: 'Confirm Password', type: 'password', required: true, },
        userrole: { label: 'User Role', type: 'select', options: [{ id: 'admin', value: 'Admin' }, { id: 'manager', value: 'Manager' }, { id: 'user', value: 'User' }], default: 'user', required: true },
        // is_active: { label: 'Is Active', type: 'select', options: [{ id: '1', value: 'Yes' }, { id: '0', value: 'No' }], default: 1, required: true },
    },



    edit_comment: {
        comments: { label: "Commetns", type: 'textarea' },
        id: { type: 'hidden' },
    },

    edit_remark: {
        remarks: { label: "Remarks", type: 'textarea' },
        id: { type: 'hidden' },
    },

    edit_UDT_description: {
        description: { label: "Description", type: 'textarea' },
        id: { type: 'hidden' },
    },

    user_profile: {
        phone: { label: 'Phone Number', type: 'text' },
        address_line1: { label: 'Address', type: 'textarea' },
        address_line2: { label: 'Address Line2', type: 'text' },
        city: { label: 'City', type: 'text' },
        state: { label: 'State', type: 'text' },
        zipcode: { label: 'Zipcode', type: 'text' },
        id: { type: 'hidden' }
    },

    changePwd: {
        currentPassword: { label: 'Old Password', type: 'password', required: true },
        newPassword: { label: 'New Password', type: 'password', message: 'Minimum 6 characters long!', required: true },
        confirmPwd: { label: 'Confirm New Password', type: 'password', required: true },
    },

    posts: {
        post: { label: 'Post Message', type: 'textarea', required: true }
    },

    dailyTasksForm: {
        user_id: {
            label: 'Assigned To',
            type: 'select',
            // prefer a query to populate users; adjust to your DB helper
            // this should return rows like [{ id: 45, value: 'Raj Shekhar Singh' }, ...]
            query: "select id, fullname as value from users where user_role = 'user' and is_active = true;",
            required: true,
            blank: true,
            message: 'Select the user responsible for this task'
        },

        title: {
            label: 'Title',
            type: 'text',
            required: true,
            message: 'Short descriptive title'
        },

        description: {
            label: 'Description',
            type: 'textarea',
            required: false,
            message: 'Optional details / instructions'
        },

        priority: {
            label: 'Priority',
            type: 'select',
            options: [
                { id: 'low', value: 'Low' },
                { id: 'medium', value: 'Medium' },
                { id: 'high', value: 'High' }
            ],
            default: 'low',
            required: true,
            blank: false
        },

        // assigned_by: {
        //     label: 'Assigned By',
        //     type: 'select',
        //     // typically the current admin/manager; you can populate same way as user_id
        //     query: "select id, fullname as value from users where is_active = true and user_role != 'user';",
        //     required: false,
        //     blank: true,
        //     message: 'Who assigned this task (optional)'
        // },

        recurrence_type: {
            label: 'Recurrence',
            type: 'select',
            options: [
                { id: 'daily', value: 'Daily' },
                { id: 'weekly', value: 'Weekly (specific weekdays)' },
                { id: 'weekends', value: 'WeekEnds Only (saturday & sunday)' },
                { id: 'weekdays', value: 'WeekDays (monday To friday)' },
                { id: 'once', value: 'Once (specific date)' },
            ],
            default: 'daily',
            required: true,
            message: 'Choose whether this is a daily task, weekly on selected weekdays, or a one-off'
        },

        // For weekly: use a multi-select or checkbox group in the UI.
        // createFrom should return an array like ['mon','wed','fri'] or a comma string 'mon,wed,fri'.
        recurrence_weekdays: {
            label: 'Weekdays',
            type: 'select', // or 'checkbox-group' depending on your form renderer
            options: [
                { id: 'mon', value: 'Mon' },
                { id: 'tue', value: 'Tue' },
                { id: 'wed', value: 'Wed' },
                { id: 'thu', value: 'Thu' },
                { id: 'fri', value: 'Fri' },
                { id: 'sat', value: 'Sat' },
                { id: 'sun', value: 'Sun' }
            ],
            required: false,
            multiple: true,
            blank: true,
            message: 'Select weekdays for weekly recurrence (leave blank if daily)'
        },

        // For once: pick a date
        once_date: {
            label: 'Once Date',
            type: 'date',
            required: false,
            blank: true,
            message: 'Select date for one-time tasks'
        },

        is_active: {
            label: 'Is Active',
            type: 'select',
            options: [
                { id: '1', value: 'Yes' },
                { id: '0', value: 'No' }
            ],
            default: 1,
            required: true
        },

        // hidden meta fields
        id: { type: 'hidden' },            // for updates
    },

    newTasklist: {      

        title: {
            label: 'Title',
            type: 'text',
            required: true,
            message: 'Short descriptive title'
        },

        description: {
            label: 'Description',
            type: 'textarea',
            required: false,
            message: 'Optional details / instructions'
        },

        priority: {
            label: 'Priority',
            type: 'select',
            options: [
                { id: 'low', value: 'Low' },
                { id: 'medium', value: 'Medium' },
                { id: 'high', value: 'High' }
            ],
            default: 'low',
            required: true,
            blank: false
        },      

        recurrence_type: {
            label: 'Recurrence',
            type: 'select',
            options: [
                { id: 'daily', value: 'Daily' },
                { id: 'weekly', value: 'Weekly (specific weekdays)' },
                { id: 'weekends', value: 'WeekEnds Only (saturday & sunday)' },
                { id: 'weekdays', value: 'WeekDays (monday To friday)' },
                { id: 'once', value: 'Once (specific date)' },
            ],
            default: 'daily',
            required: true,
            message: 'Choose whether this is a daily task, weekly on selected weekdays, or a one-off'
        },

        // For weekly: use a multi-select or checkbox group in the UI.
        // createFrom should return an array like ['mon','wed','fri'] or a comma string 'mon,wed,fri'.
        recurrence_weekdays: {
            label: 'Weekdays',
            type: 'select', // or 'checkbox-group' depending on your form renderer
            options: [
                { id: 'mon', value: 'Mon' },
                { id: 'tue', value: 'Tue' },
                { id: 'wed', value: 'Wed' },
                { id: 'thu', value: 'Thu' },
                { id: 'fri', value: 'Fri' },
                { id: 'sat', value: 'Sat' },
                { id: 'sun', value: 'Sun' }
            ],
            required: false,
            multiple: true,
            blank: true,
            message: 'Select weekdays for weekly recurrence (leave blank if daily)'
        },

        // For once: pick a date
        once_date: {
            label: 'Once Date',
            type: 'date',
            required: false,
            blank: true,
            message: 'Select date for one-time tasks'
        },

        is_active: {
            label: 'Is Active',
            type: 'select',
            options: [
                { id: '1', value: 'Yes' },
                { id: '0', value: 'No' }
            ],
            default: 1,
            required: true
        },

        // hidden meta fields
        id: { type: 'hidden' },            // for updates
    },

    

    task_completion_remark: {
        for_date: { label: 'Task Completed On', type: 'date', required: true },
        remarks: { label: 'Any Remarks', type: 'textarea', required: true },
        task_id: { type: 'hidden'},
    },


    specialTask: {
        task_name: { label: 'Task Name', type: 'text', requird: true },
        description: { label: 'Description', type: 'textarea' },
        // priority: { label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'], default: 'medium '},
        category: { label: 'Category', type: 'text' },
        files: { label: 'Attachment', type: 'file', multiple: true },
    },



}