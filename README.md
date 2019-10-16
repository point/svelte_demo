# Few highlights on the decisions made:

The project split into 2 parts: the login screen and the rest of the app. I suppose the login page is a part of the landing. So to keep js bundle smaller, I serve only what needs to do log in routines.
* Login logic is in `src/Login.svelte` — code, styles and html for a component. I carefully ported your styles from the existing login page (the required ones only), and without  `!important`-s ;-)
The page itself is built with css flexboxes.
I use native html5 checks of email and required password fields. If something is not valid, the custom error message is shown.  When built-in checks passed, I do XHR via FetchAPI (because it sets cookies from the response correctly).  In case of failure, the ‘wrong password’ custom message is shown. When everything is OK, browser is redirected to `dashobard.html`
* The dashboard page `public/dashboard.html` is just a skeleton, which is built with css Grids. Dynamic components are made for `nav .organizations` `nav .projects` and `nav .channels` blocks.
* Initially Organizations component `src/Organizations.svelte` (which is a list of `Organization` components), and it’s brothers `Projects` and `Channels` components, were a simple ad-hoc blocks with the data passed though `props` (a notion similar to React). But then it becomes clear that I need to handle clicks on organizations and update downstream components appropriately with new data, this way of doing things turned out pretty ineffective.
* Now, `Organizations` , `Projects` and `Channels` components use reactive stores resided in `src/stores.js`  When the store changes, the new value from the store populates and all the dependent components are re-rendered. Initially, all stores are empty.  The `init_stores` is called once at the beginning to populate the organizations list with the initial data through `/sidebar` API call. The `Organizations` component catches theses changes and updates itself and its descending components appropriately. The `inti_stores` returns a promise and if something went wrong during the request (for example if the session is already expired or not even set), the invocation side catches an error and redirects back to login page.
* When user clicks on the particular organization, the subscription callback on `current_organization` store is invoked. It makes XHR with the proper organizationID and populates newer values for `projects` and `channels` stores. So appropriate components get updated reactively!

Overall, resulting components are self-sufficient, with code, styles and markup placed together. The reactive stores allow produce more consistent and readable code, despite the async nature of all events.



---

# svelte app

This is a project template for [Svelte](https://svelte.dev) apps. It lives at https://github.com/sveltejs/template.

To create a new project based on this template using [degit](https://github.com/Rich-Harris/degit):

```bash
npx degit sveltejs/template svelte-app
cd svelte-app
```

*Note that you will need to have [Node.js](https://nodejs.org) installed.*


## Get started

Install the dependencies...

```bash
cd svelte-app
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000). You should see your app running. Edit a component file in `src`, save it, and reload the page to see your changes.

By default, the server will only respond to requests from localhost. To allow connections from other computers, edit the `sirv` commands in package.json to include the option `--host 0.0.0.0`.


