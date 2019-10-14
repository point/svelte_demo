<script>
  export let organizations = null;
  import Organization from "./Organization.svelte";

  let nav_open = true;
</script>

<style>
ul {
    list-style: none;
    padding: 0;
    margin: 8px 0;
    display: none;
}
.nav-toggle {
    background: #36c6d3;
    border-top-color: transparent;
    color: #fff;
    display: block;
    margin: 0;
    padding: 10px 15px;
    text-decoration: none;
    font-weight: bold;
    position: relative;
}
.nav-toggle::before {
    width: 20px;
    text-align: center;
    display: inline;
    font-size: 16px;
    font-family: FontAwesome;
    height: auto;
    content: "\f104";
    font-weight: 300;
    text-shadow: none;
    position: absolute;
    top: 10px;
    right: 14px;
}
.nav-toggle.open::before {
    content: "\f107";
}
.nav-toggle.open + ul {
  display: block;
}
a > i {
    font-size: 16px;
    margin-right: 5px;
    text-shadow: none;
}
.nav-item-add a:hover {
    background: #3e4b5c;
}
</style>

<div class="organizations">
    {#if organizations}
    <a href="#" on:click|preventDefault="{() => nav_open = !nav_open}" class="nav-toggle {nav_open ? 'open' : ''}" id="sidebar-org">
        <i class="fa fa-building-o"></i>
        <span class="title">Organizations</span> <span class="arrow open"></span>
    </a>
        <ul>
            <li class="nav-item-add">
                <a href="/add-organisation" style="font-weight: bold;">
                    <i class="fa fa-plus" style="color: #b4bcc8;"></i>
                <span class="title">Add Organization</span>
                </a>
            </li>
            {#each organizations as org}
                <Organization name={org.name} tasksOverall={org.tasksOverall}/>
            {/each}
        </ul>
    {/if}
</div>
