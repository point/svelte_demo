<script>
  export let name;
  export let id;
  export let tasksOverall;
  export let tasksOverallNotViewed;
  import { current_organization } from './stores.js';

  let set_current = ()=> {
      current_organization.set(id);
  };
</script>

<style>
</style>

<li class="nav-item show-edit-icon {$current_organization == id ? 'active' : ''}">
    <span class="edit-project-link " style="display: none; padding-left: 0px;">
        <a href="/hendrik-test/edit-organisation/8" class="" target="_blank">
            <i class="fa fa-pencil" aria-hidden="true"></i>
        </a>
    </span>
    <a href="#" on:click|preventDefault={set_current} class="nav-link">
        <span class="title">{name}</span>
        {#if parseInt(tasksOverall) > 0}
            <span class="badge {parseInt(tasksOverallNotViewed) == 0 ? 'badge-info' : 'badge-danger'}">{parseInt(tasksOverall) > 0 ? tasksOverall : ''}</span>
        {/if}
    </a>
</li>

