<script>
  export let name;
  export let tasksOverall;
</script>

<style>
</style>

<li class="nav-item show-edit-icon active">
    <span class="edit-project-link " style="display: none; padding-left: 0px;">
        <a href="/hendrik-test/edit-organisation/8" class="" target="_blank">
            <i class="fa fa-pencil" aria-hidden="true"></i>
        </a>
    </span>
    <a href="/hendrik-test/task" class="nav-link">
        <span class="title">{name}</span>
        {#if parseInt(tasksOverall) > 0}
            <span class="badge badge-danger">{parseInt(tasksOverall) > 0 ? tasksOverall : ''}</span>
        {/if}
    </a>
</li>

