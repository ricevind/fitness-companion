<script>
    import {series, repetitions, isExercising} from "../store/excersise-counter.js";
    import FullPageLayout from "./FullPageLayout.svelte"
    import Counter from "./Counter.svelte"
    import Clicker from "./Clicker.svelte"
</script>

<style type="text/postcss">
    button {
        padding: 50px;
        background-color: #2f855a;
    }
</style>

<FullPageLayout>
    {#if $isExercising}
        <Clicker></Clicker>
    {:else}
        <Counter counter={series}></Counter>
        <Counter counter={repetitions}></Counter>
        <button on:click={()=> isExercising.set(true)}>Start</button>
    {/if}
</FullPageLayout>
