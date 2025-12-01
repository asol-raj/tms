import showCanvas from "./_utils/canvas.js";
import { jq, log, advanceMysqlQuery } from "./help.js";
const currentPath = window.location.pathname; 

async function countFeeds(){
    try {
        if(['/login', '/admin/register'].includes(currentPath)) return;
        let sql = "SELECT COUNT(*) AS cnt FROM posts WHERE DATE(created_at) = CURDATE();";
        let res = await advanceMysqlQuery({ key: 'na', qry: sql }); 
        let cnt = res?.data[0]?.cnt || 0;
        let pst = cnt ? `+${cnt}`: 0;
        jq('#newPosts').html(pst);
    } catch (error) {
        log(error);
    }
}

async function loadPosts() {
    try {
        // Your new query is now much longer, so I'll format it for readability
        let qry = `
            SELECT 
                p.id, p.post, p.publish, 
                u.fullname AS created_by, 
                p.created_at, p.updated_at 
            FROM posts p 
            JOIN users u ON u.id = p.created_by 
            WHERE p.publish=true
            ORDER BY p.id DESC 
            LIMIT 100;
        `;

        let res = await advanceMysqlQuery({ key: 'na', qry });
        let posts = res?.data || [];

        if (!posts.length) {
            jq('div.view-posts').html('<p>No posts found.</p>');
            return;
        }

        let $div = jq('<div>', { class: 'd-flex flex-column gap-4' });

        posts.forEach(post => {
            // Main container for this single post
            let $postItem = jq('<div>', {
                class: 'border-bottom rounded shadow-sm p-2'
            });

            // 1. Add the post content
            let $postContent = jq('<div>', { class: 'h6' });
            $postContent.text(post.post);

            // 2. Create the footer container
            //    'mt-2' adds a little space above the footer
            let $postFooter = jq('<div>', {
                class: 'd-flex justify-content-between mt-4'
            });

            // 3. Create "created by" element (bottom-left)
            //    'post.created_by' now holds the user's fullname from your query
            let $postAuthor = jq('<span>', { class: 'text-secondary small' });
            $postAuthor.text(`By: ${post.created_by}`);

            // 4. Create "created at" date element (bottom-right)
            let date = new Date(post.created_at);
            let formattedDate = date.toLocaleString();
            let $postDate = jq('<span>', { class: 'text-secondary small' });
            $postDate.text(formattedDate);

            // 5. Add author and date to the footer
            $postFooter.append($postAuthor);
            $postFooter.append($postDate);

            // 6. Add the content and the footer to the main post item
            $postItem.append($postContent);
            $postItem.append($postFooter);

            // 7. Add this post item to the list
            $div.append($postItem);
        });

        // jq('div.view-posts').html($div);
        jq('#viewPosts').html($div);

    } catch (error) {
        log(error);
        jq('div.view-posts').html('<p>Error loading posts.</p>');
    }
}

document.addEventListener('DOMContentLoaded', ()=>{
    countFeeds();

    jq('#showFeeds').off('click').on('click', async ()=>{
        const $canvas = showCanvas('Posts & Feeds', { 
            staticBackdrop: false, 
            width: '560px',
            side: 'end'
        });

        const $body = $canvas.find('div.offcanvas-body');
        $canvas.data("bs.offcanvas").show();
        const [feeds] = jq('<div>', { class: 'my-4', id: 'viewPosts'});
        $body.empty().html(feeds)
        await loadPosts();
    })
})