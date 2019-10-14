<script>
  export let name;
  export let tasksOverall;
</script>

<style>
.nav-link {
display: flex;
}
.nav-item a:hover {
    background: #3e4b5c;
}
.nav-link .title {
flex-grow: 2;
}
.nav-link .badge {
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 600;
    padding: 2px 6px 2px;
    color: #fff;
    border-radius: 12px;
    text-shadow: none;
    text-align: center;
    vertical-align: middle;
    box-shadow: 0 1px 3px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.18);
    background-color: #ed6b75;
}
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

