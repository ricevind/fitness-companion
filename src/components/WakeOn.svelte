<script>
    import {createEventDispatcher, onMount} from 'svelte'

    let wakeLock = null;
    const wakeCreated = createEventDispatcher();


    // Function that attempts to request a wake lock.
    const controller = new AbortController();
    const signal = controller.signal;

    window.WakeLock.request('screen', {signal})
            .catch((e) => {
                if (e.name === 'AbortError') {
                    console.log('Wake Lock was aborted');

                } else {
                    console.error(`${e.name}, ${e.message}`);
                }
            });

    onMount(() => {
        wakeCreated('wake', {wakeLock: signal})
    })
</script>
