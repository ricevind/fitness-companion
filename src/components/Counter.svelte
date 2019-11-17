<script>
    import {writable} from 'svelte/store'

    export let counter = writable(0)
</script>


<style lang="text/postcss">
    .fc-counter-wrapper {
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
        padding: 60px;
    }

    .fc-counter-value {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    button {
        padding: 60px;
        margin: 10px;
        background-color: #2b6cb0;
    }
</style>

<div class="fc-counter-wrapper">
    <button class="fc-decrease" on:click={() => counter.update((n => n - 1))}>-</button>
    <div class="fc-counter-value">{$counter}</div>
    <button class="fc-increase" on:click={() =>counter.update((n => n + 1))}>+</button>
</div>
