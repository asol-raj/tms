import formfields from './formfields.js';
import { log, jq, advanceMysqlQuery, createFormSmart } from './help.js';
import createForm from './_utils/createForm.esm.js';
import showModal from './_utils/modal.js';


document.addEventListener('DOMContentLoaded', async () => {
    // let rows = await advanceMysqlQuery({ key: 'na', qry: `select id, email as value from users where user_role = 'user' and is_active=true;`}); log(rows);

    jq('button.create-task').on('click', () => {
        const $modal = showModal('tasks', 'lg', true );
        const form = createFormSmart({ title: 'tasks' });
        const $body = $modal.find('div.modal-body');
        $body.html(form);
        const $form = $body.find('form');
        $modal.data('bs.modal').show();
    })
})