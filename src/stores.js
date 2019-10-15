import { writable } from 'svelte/store';

export const organizations = writable(null);
export const current_organization = writable(null);

export const projects = writable(null);
export const current_project = writable(null);

export const channels = writable(null);
export const current_channel = writable(null);

current_organization.subscribe(value => {
    if(value) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', "https://test-api.clonedesk.com/api/v2/sidebar?organizationID=" + value, true);
        xhr.withCredentials = true;
        xhr.onload = function(event){
            if(event.currentTarget.status == 200){
                let data = JSON.parse(event.target.responseText)
                if(data && data.projects) {
                    projects.set(data.projects);
                }
                if(data && data.channels) {
                    channels.set(data.channels);
                }
            }
        };
        xhr.send();
    }
});


export let init_stores = () => {
    return new Promise((resolve, reject) => {

        let xhr = new XMLHttpRequest();
        xhr.open('GET', "https://test-api.clonedesk.com/api/v2/sidebar", true);
        xhr.withCredentials = true;
        xhr.onload = function(event){
            if(event.currentTarget.status == 200){
                let data = JSON.parse(event.target.responseText)
                if(data && data.organizations) {
                    organizations.set(data.organizations);
                    current_organization.set(data.organizations[0].id);
                    resolve("ok");
                }
            } else {
                reject(new Error("No data sent"));
            }
        };
        xhr.onerror = function(event){
            reject(new Error("Error making init"));
        };
        xhr.send();
    });
};
