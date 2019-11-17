<script>
    import {series, repetitions, isExercising} from "../store/excersise-counter.js";

    const ding = new Audio('/assets/ding.mp3');


    let repetitionsToGo = $repetitions;
    let seriesToGo = $series;
    $: hasFinishedRepetitions = !Boolean(seriesToGo);

    function handleRepetitionClick() {
        repetitionsToGo -= 1;
        if (repetitionsToGo === 0) {
            seriesToGo -= 1;
            repetitionsToGo = $repetitions;
            ding.play();
        }
    }

    function handleRestart() {
        repetitionsToGo = $repetitions;
        seriesToGo = $series;
    }
</script>

<style>
    .fc-clicker {
        width: 100%;
        height: 100%;
        user-select: none;
    }

    button {
        padding: 50px;
        background-color: #2f855a;
    }
</style>

{#if hasFinishedRepetitions}
    <button on:click={handleRestart}>Again!</button>
    <button on:click={()=> isExercising.set(false)}>Configure exercise!</button>
{:else}
    <div class="fc-clicker" on:click={handleRepetitionClick}>
        Series left: {seriesToGo}
        Repetitions left: {repetitionsToGo}
    </div>
{/if}
