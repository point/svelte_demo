import Organizations from './Organizations.svelte';

let xhr = new XMLHttpRequest();
xhr.open('GET', "https://test-api.clonedesk.com/api/v2/sidebar", true);
xhr.withCredentials = true;
xhr.onload = function(event){
    if(event.currentTarget.status == 200){
        create_organizations(JSON.parse(event.target.responseText));
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

create_organizations(null);

//export default orgs;

