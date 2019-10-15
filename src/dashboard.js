import Organizations from './Organizations.svelte';
import Projects from './Projects.svelte';
import Channels from './Channels.svelte';

import { init_stores } from './stores.js';

init_stores().catch((_err) => {
    window.location.replace("/");
});

new Organizations({
    target: document.querySelector("nav .organizations"),
    props: { }
});
new Projects({
    target: document.querySelector("nav .projects"),
    props: { }
});
new Channels({
    target: document.querySelector("nav .channels"),
    props: { }
});

