import Organizations from './Organizations.svelte';
import Projects from './Projects.svelte';
import Channels from './Channels.svelte';

let xhr = new XMLHttpRequest();
xhr.open('GET', "https://test-api.clonedesk.com/api/v2/sidebar?organizationID=8", true);
xhr.withCredentials = true;
xhr.onload = function(event){
    if(event.currentTarget.status == 200){
        let data = JSON.parse(event.target.responseText)
        create_organizations(data);
        create_projects(data);
        create_channels(data);
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
function create_channels(data) {
    new Channels({
        target: document.querySelector("nav .channels"),
        props: {
            channels: (data && data.channels) || null
        }
    });
}

create_organizations(null);
create_projects(null);
create_channels(null);

//export default orgs;

