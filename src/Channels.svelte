<script>
  import Channel from "./Channel.svelte";
  import { channels } from './stores.js';

  let nav_open = true;
</script>

<style>
</style>

{#if $channels && $channels.length > 0}
    <a href="#" on:click|preventDefault="{() => nav_open = !nav_open}" class="nav-toggle {nav_open ? 'open' : ''}" id="sidebar-org">
        <i class="fa fas fa-bomb"></i>
        <span class="title">Channels</span> <span class="arrow open"></span>
    </a>
    <ul>
        <li class="nav-item-add">
            <a href="/add-channel" style="font-weight: bold;">
                <i class="fa fa-plus" style="color: #b4bcc8;"></i>
            <span class="title">Add Channel</span>
            </a>
        </li>
        {#each $channels as ch}
            <Channel name=#{ch.name} tasksOverall={ch.tasksOverall}
            id={ch.id}
            tasksOverallNotViewed={ch.tasksOverallNotViewed}/>
        {/each}
    </ul>
{/if}
