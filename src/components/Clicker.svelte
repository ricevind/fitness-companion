<script>
    import {onDestroy} from 'svelte'
    import {series, repetitions, isExercising} from "../store/excersise-counter.js";
    import WakeOn from "./WakeOn.svelte"

    const ding = new Audio('/assets/ding.mp3');
    const bang = new Audio('/assets/bang.ogg');


    let wakeOn = null;
    let repetitionsToGo = $repetitions;
    let seriesToGo = $series;
    $: hasFinishedRepetitions = !Boolean(seriesToGo);

    function handleRepetitionClick() {
        repetitionsToGo -= 1;
        bang.play();
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

    function handleWakeOn({detail}) {
        wakeOn = detail.wakeLock;
    }

    onDestroy(() => {
        if (wakeOn) {

            wakeOn.release()
            wakeOn = null
        }
    })
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

<WakeOn on:wake={handleWakeOn}></WakeOn>
{#if hasFinishedRepetitions}
    <button on:click={handleRestart}>Again!</button>
    <button on:click={()=> isExercising.set(false)}>Configure exercise!</button>
{:else}
    <div class="fc-clicker" on:click={handleRepetitionClick}>
        Series left: {seriesToGo}
        Repetitions left: {repetitionsToGo}
    </div>
{/if}
