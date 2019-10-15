<script>
  import Organization from "./Organization.svelte";
  import { organizations } from './stores.js';

  let nav_open = true;

</script>

<style>
</style>

{#if $organizations && $organizations.length > 0}
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
        {#each $organizations as org}
            <Organization name={org.name} 
            tasksOverall={org.tasksOverall} id={org.id}
            tasksOverallNotViewed={org.tasksOverallNotViewed}/>
        {/each}
    </ul>
{/if}
