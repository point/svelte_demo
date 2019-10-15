<script>
  import Project from "./Project.svelte";
  import { projects } from './stores.js';

  let nav_open = true;
</script>

<style>
</style>

{#if $projects && $projects.length > 0}
    <a href="#" on:click|preventDefault="{() => nav_open = !nav_open}" class="nav-toggle {nav_open ? 'open' : ''}" id="sidebar-org">
        <i class="fa fa-lightbulb-o"></i>
        <span class="title">Projects</span> <span class="arrow open"></span>
    </a>
    <ul>
        <li class="nav-item-add">
            <a href="/add-project" style="font-weight: bold;">
                <i class="fa fa-plus" style="color: #b4bcc8;"></i>
            <span class="title">Add Project</span>
            </a>
        </li>
        {#each $projects as pr}
            <Project name=@{pr.name} tasksOverall={pr.tasksOverall}
            id={pr.id}
            tasksOverallNotViewed={pr.tasksOverallNotViewed} />
        {/each}
    </ul>
{/if}
