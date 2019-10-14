import Organizations from './Organizations.svelte';
import Projects from './Projects.svelte';

let xhr = new XMLHttpRequest();
xhr.open('GET', "https://test-api.clonedesk.com/api/v2/sidebar?organizationID=8", true);
xhr.withCredentials = true;
xhr.onload = function(event){
    if(event.currentTarget.status == 200){
        create_organizations(JSON.parse(event.target.responseText));
        create_projects(JSON.parse(event.target.responseText));
    }
};
xhr.send();

function create_organizations(data) {
    new Organizations({
        target: document.querySelector("nav .organizations"),
        props: {
            organizations: (data && data.organizations) || null
        }
    });
}
function create_projects(data) {
    new Projects({
        target: document.querySelector("nav .projects"),
        props: {
            projects: (data && data.projects) || null
        }
    });
}

create_organizations(null);
create_projects(null);

//export default orgs;

