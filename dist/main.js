
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
(function () {
    'use strict';

    function noop() {}

    function assign(tar, src) {
    	for (const k in src) tar[k] = src[k];
    	return tar;
    }

    function add_location(element, file, line, column, char) {
    	element.__svelte_meta = {
    		loc: { file, line, column, char }
    	};
    }

    function run(fn) {
    	return fn();
    }

    function blank_object() {
    	return Object.create(null);
    }

    function run_all(fns) {
    	fns.forEach(run);
    }

    function is_function(thing) {
    	return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
    	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function validate_store(store, name) {
    	if (!store || typeof store.subscribe !== 'function') {
    		throw new Error(`'${name}' is not a store with a 'subscribe' method`);
    	}
    }

    function subscribe(component, store, callback) {
    	const unsub = store.subscribe(callback);

    	component.$$.on_destroy.push(unsub.unsubscribe
    		? () => unsub.unsubscribe()
    		: unsub);
    }

    function create_slot(definition, ctx, fn) {
    	if (definition) {
    		const slot_ctx = get_slot_context(definition, ctx, fn);
    		return definition[0](slot_ctx);
    	}
    }

    function get_slot_context(definition, ctx, fn) {
    	return definition[1]
    		? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
    		: ctx.$$scope.ctx;
    }

    function get_slot_changes(definition, ctx, changed, fn) {
    	return definition[1]
    		? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
    		: ctx.$$scope.changed || {};
    }

    function append(target, node) {
    	target.appendChild(node);
    }

    function insert(target, node, anchor) {
    	target.insertBefore(node, anchor || null);
    }

    function detach(node) {
    	node.parentNode.removeChild(node);
    }

    function element(name) {
    	return document.createElement(name);
    }

    function text(data) {
    	return document.createTextNode(data);
    }

    function space() {
    	return text(' ');
    }

    function empty() {
    	return text('');
    }

    function listen(node, event, handler, options) {
    	node.addEventListener(event, handler, options);
    	return () => node.removeEventListener(event, handler, options);
    }

    function children(element) {
    	return Array.from(element.childNodes);
    }

    function set_data(text, data) {
    	data = '' + data;
    	if (text.data !== data) text.data = data;
    }

    function custom_event(type, detail) {
    	const e = document.createEvent('CustomEvent');
    	e.initCustomEvent(type, false, false, detail);
    	return e;
    }

    let current_component;

    function set_current_component(component) {
    	current_component = component;
    }

    function get_current_component() {
    	if (!current_component) throw new Error(`Function called outside component initialization`);
    	return current_component;
    }

    function onMount(fn) {
    	get_current_component().$$.on_mount.push(fn);
    }

    function onDestroy(fn) {
    	get_current_component().$$.on_destroy.push(fn);
    }

    function createEventDispatcher() {
    	const component = current_component;

    	return (type, detail) => {
    		const callbacks = component.$$.callbacks[type];

    		if (callbacks) {
    			// TODO are there situations where events could be dispatched
    			// in a server (non-DOM) environment?
    			const event = custom_event(type, detail);
    			callbacks.slice().forEach(fn => {
    				fn.call(component, event);
    			});
    		}
    	};
    }

    const dirty_components = [];

    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];

    function schedule_update() {
    	if (!update_scheduled) {
    		update_scheduled = true;
    		resolved_promise.then(flush);
    	}
    }

    function add_render_callback(fn) {
    	render_callbacks.push(fn);
    }

    function flush() {
    	const seen_callbacks = new Set();

    	do {
    		// first, call beforeUpdate functions
    		// and update components
    		while (dirty_components.length) {
    			const component = dirty_components.shift();
    			set_current_component(component);
    			update(component.$$);
    		}

    		while (binding_callbacks.length) binding_callbacks.shift()();

    		// then, once components are updated, call
    		// afterUpdate functions. This may cause
    		// subsequent updates...
    		while (render_callbacks.length) {
    			const callback = render_callbacks.pop();
    			if (!seen_callbacks.has(callback)) {
    				callback();

    				// ...so guard against infinite loops
    				seen_callbacks.add(callback);
    			}
    		}
    	} while (dirty_components.length);

    	while (flush_callbacks.length) {
    		flush_callbacks.pop()();
    	}

    	update_scheduled = false;
    }

    function update($$) {
    	if ($$.fragment) {
    		$$.update($$.dirty);
    		run_all($$.before_render);
    		$$.fragment.p($$.dirty, $$.ctx);
    		$$.dirty = null;

    		$$.after_render.forEach(add_render_callback);
    	}
    }

    let outros;

    function group_outros() {
    	outros = {
    		remaining: 0,
    		callbacks: []
    	};
    }

    function check_outros() {
    	if (!outros.remaining) {
    		run_all(outros.callbacks);
    	}
    }

    function on_outro(callback) {
    	outros.callbacks.push(callback);
    }

    function mount_component(component, target, anchor) {
    	const { fragment, on_mount, on_destroy, after_render } = component.$$;

    	fragment.m(target, anchor);

    	// onMount happens after the initial afterUpdate. Because
    	// afterUpdate callbacks happen in reverse order (inner first)
    	// we schedule onMount callbacks before afterUpdate callbacks
    	add_render_callback(() => {
    		const new_on_destroy = on_mount.map(run).filter(is_function);
    		if (on_destroy) {
    			on_destroy.push(...new_on_destroy);
    		} else {
    			// Edge case - component was destroyed immediately,
    			// most likely as a result of a binding initialising
    			run_all(new_on_destroy);
    		}
    		component.$$.on_mount = [];
    	});

    	after_render.forEach(add_render_callback);
    }

    function destroy(component, detaching) {
    	if (component.$$) {
    		run_all(component.$$.on_destroy);
    		component.$$.fragment.d(detaching);

    		// TODO null out other refs, including component.$$ (but need to
    		// preserve final state?)
    		component.$$.on_destroy = component.$$.fragment = null;
    		component.$$.ctx = {};
    	}
    }

    function make_dirty(component, key) {
    	if (!component.$$.dirty) {
    		dirty_components.push(component);
    		schedule_update();
    		component.$$.dirty = blank_object();
    	}
    	component.$$.dirty[key] = true;
    }

    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
    	const parent_component = current_component;
    	set_current_component(component);

    	const props = options.props || {};

    	const $$ = component.$$ = {
    		fragment: null,
    		ctx: null,

    		// state
    		props: prop_names,
    		update: noop,
    		not_equal: not_equal$$1,
    		bound: blank_object(),

    		// lifecycle
    		on_mount: [],
    		on_destroy: [],
    		before_render: [],
    		after_render: [],
    		context: new Map(parent_component ? parent_component.$$.context : []),

    		// everything else
    		callbacks: blank_object(),
    		dirty: null
    	};

    	let ready = false;

    	$$.ctx = instance
    		? instance(component, props, (key, value) => {
    			if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
    				if ($$.bound[key]) $$.bound[key](value);
    				if (ready) make_dirty(component, key);
    			}
    		})
    		: props;

    	$$.update();
    	ready = true;
    	run_all($$.before_render);
    	$$.fragment = create_fragment($$.ctx);

    	if (options.target) {
    		if (options.hydrate) {
    			$$.fragment.l(children(options.target));
    		} else {
    			$$.fragment.c();
    		}

    		if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
    		mount_component(component, options.target, options.anchor);
    		flush();
    	}

    	set_current_component(parent_component);
    }

    class SvelteComponent {
    	$destroy() {
    		destroy(this, true);
    		this.$destroy = noop;
    	}

    	$on(type, callback) {
    		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
    		callbacks.push(callback);

    		return () => {
    			const index = callbacks.indexOf(callback);
    			if (index !== -1) callbacks.splice(index, 1);
    		};
    	}

    	$set() {
    		// overridden by instance, if it has props
    	}
    }

    class SvelteComponentDev extends SvelteComponent {
    	constructor(options) {
    		if (!options || (!options.target && !options.$$inline)) {
    			throw new Error(`'target' is a required option`);
    		}

    		super();
    	}

    	$destroy() {
    		super.$destroy();
    		this.$destroy = () => {
    			console.warn(`Component was already destroyed`); // eslint-disable-line no-console
    		};
    	}
    }

    function noop$1() {}

    function safe_not_equal$1(a, b) {
    	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function writable(value, start = noop$1) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal$1(value, new_value)) {
                value = new_value;
                if (!stop) {
                    return; // not ready
                }
                subscribers.forEach((s) => s[1]());
                subscribers.forEach((s) => s[0](value));
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe$$1(run$$1, invalidate = noop$1) {
            const subscriber = [run$$1, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop$1;
            }
            run$$1(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                }
            };
        }
        return { set, update, subscribe: subscribe$$1 };
    }

    const number_of_repetitions = 8;
    const number_of_series = 3;
    const is_exercising = false;

    //Insert store variables here
    const series = writable(number_of_series);
    const repetitions = writable(number_of_repetitions);
    const isExercising = writable(is_exercising);

    /* src\components\FullPageLayout.svelte generated by Svelte v3.4.0 */

    const file = "src\\components\\FullPageLayout.svelte";

    function create_fragment(ctx) {
    	var div, current;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			div = element("div");

    			if (default_slot) default_slot.c();

    			div.className = "fc-full-page svelte-ayegxp";
    			add_location(div, file, 3, 0, 159);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (default_slot && default_slot.i) default_slot.i(local);
    			current = true;
    		},

    		o: function outro(local) {
    			if (default_slot && default_slot.o) default_slot.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	return { $$slots, $$scope };
    }

    class FullPageLayout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* src\components\Counter.svelte generated by Svelte v3.4.0 */

    const file$1 = "src\\components\\Counter.svelte";

    function create_fragment$1(ctx) {
    	var div1, button0, t1, div0, t2, t3, button1, dispose;

    	return {
    		c: function create() {
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "-";
    			t1 = space();
    			div0 = element("div");
    			t2 = text(ctx.$counter);
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "+";
    			button0.className = "fc-decrease svelte-a5qlz5";
    			add_location(button0, file$1, 10, 4, 412);
    			div0.className = "fc-counter-value svelte-a5qlz5";
    			add_location(div0, file$1, 11, 4, 502);
    			button1.className = "fc-increase svelte-a5qlz5";
    			add_location(button1, file$1, 12, 4, 554);
    			div1.className = "fc-counter-wrapper svelte-a5qlz5";
    			add_location(div1, file$1, 9, 0, 374);

    			dispose = [
    				listen(button0, "click", ctx.click_handler),
    				listen(button1, "click", ctx.click_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, button0);
    			append(div1, t1);
    			append(div1, div0);
    			append(div0, t2);
    			append(div1, t3);
    			append(div1, button1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.$counter) {
    				set_data(t2, ctx.$counter);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $counter;

    	let { counter = writable(0) } = $$props; validate_store(counter, 'counter'); subscribe($$self, counter, $$value => { $counter = $$value; $$invalidate('$counter', $counter); });

    	function click_handler() {
    		return counter.update((n => n - 1));
    	}

    	function click_handler_1() {
    		return counter.update((n => n + 1));
    	}

    	$$self.$set = $$props => {
    		if ('counter' in $$props) $$invalidate('counter', counter = $$props.counter);
    	};

    	return {
    		counter,
    		$counter,
    		click_handler,
    		click_handler_1
    	};
    }

    class Counter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["counter"]);
    	}

    	get counter() {
    		throw new Error("<Counter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set counter(value) {
    		throw new Error("<Counter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\WakeOn.svelte generated by Svelte v3.4.0 */

    function create_fragment$2(ctx) {
    	return {
    		c: noop,

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    function instance$2($$self) {
    	
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
            wakeCreated('wake', {wakeLock: signal});
        });

    	return {};
    }

    class WakeOn extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    /* src\components\Clicker.svelte generated by Svelte v3.4.0 */

    const file$2 = "src\\components\\Clicker.svelte";

    // (49:0) {:else}
    function create_else_block(ctx) {
    	var div, t0, t1, t2, t3, dispose;

    	return {
    		c: function create() {
    			div = element("div");
    			t0 = text("Series left: ");
    			t1 = text(ctx.seriesToGo);
    			t2 = text("\r\n        Repetitions left: ");
    			t3 = text(ctx.repetitionsToGo);
    			div.className = "fc-clicker svelte-rdp1p5";
    			add_location(div, file$2, 49, 4, 1423);
    			dispose = listen(div, "click", ctx.handleRepetitionClick);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    			append(div, t3);
    		},

    		p: function update(changed, ctx) {
    			if (changed.seriesToGo) {
    				set_data(t1, ctx.seriesToGo);
    			}

    			if (changed.repetitionsToGo) {
    				set_data(t3, ctx.repetitionsToGo);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    // (46:0) {#if hasFinishedRepetitions}
    function create_if_block(ctx) {
    	var button0, t_1, button1, dispose;

    	return {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Again!";
    			t_1 = space();
    			button1 = element("button");
    			button1.textContent = "Configure exercise!";
    			button0.className = "svelte-rdp1p5";
    			add_location(button0, file$2, 46, 4, 1278);
    			button1.className = "svelte-rdp1p5";
    			add_location(button1, file$2, 47, 4, 1332);

    			dispose = [
    				listen(button0, "click", ctx.handleRestart),
    				listen(button1, "click", ctx.click_handler)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, button0, anchor);
    			insert(target, t_1, anchor);
    			insert(target, button1, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button0);
    				detach(t_1);
    				detach(button1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var t, if_block_anchor, current;

    	var wakeon = new WakeOn({ $$inline: true });
    	wakeon.$on("wake", ctx.handleWakeOn);

    	function select_block_type(ctx) {
    		if (ctx.hasFinishedRepetitions) return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block = current_block_type(ctx);

    	return {
    		c: function create() {
    			wakeon.$$.fragment.c();
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(wakeon, target, anchor);
    			insert(target, t, anchor);
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			wakeon.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			wakeon.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			wakeon.$destroy(detaching);

    			if (detaching) {
    				detach(t);
    			}

    			if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $repetitions, $series;

    	validate_store(repetitions, 'repetitions');
    	subscribe($$self, repetitions, $$value => { $repetitions = $$value; $$invalidate('$repetitions', $repetitions); });
    	validate_store(series, 'series');
    	subscribe($$self, series, $$value => { $series = $$value; $$invalidate('$series', $series); });

    	

        const ding = new Audio('/assets/ding.mp3');
        const bang = new Audio('/assets/bang.ogg');


        let wakeOn = null;
        let repetitionsToGo = $repetitions;
        let seriesToGo = $series;

        function handleRepetitionClick() {
            $$invalidate('repetitionsToGo', repetitionsToGo -= 1);
            bang.play();
            if (repetitionsToGo === 0) {
                $$invalidate('seriesToGo', seriesToGo -= 1);
                $$invalidate('repetitionsToGo', repetitionsToGo = $repetitions);
                ding.play();
            }
        }

        function handleRestart() {
            $$invalidate('repetitionsToGo', repetitionsToGo = $repetitions);
            $$invalidate('seriesToGo', seriesToGo = $series);
        }

        function handleWakeOn({detail}) {
            $$invalidate('wakeOn', wakeOn = detail.wakeLock);
        }

        onDestroy(() => {
            if (wakeOn) {

                wakeOn.release();
                $$invalidate('wakeOn', wakeOn = null);
            }
        });

    	function click_handler() {
    		return isExercising.set(false);
    	}

    	let hasFinishedRepetitions;

    	$$self.$$.update = ($$dirty = { seriesToGo: 1 }) => {
    		if ($$dirty.seriesToGo) { $$invalidate('hasFinishedRepetitions', hasFinishedRepetitions = !Boolean(seriesToGo)); }
    	};

    	return {
    		repetitionsToGo,
    		seriesToGo,
    		handleRepetitionClick,
    		handleRestart,
    		handleWakeOn,
    		hasFinishedRepetitions,
    		click_handler
    	};
    }

    class Clicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    /* src\components\ExcersiseCounter.svelte generated by Svelte v3.4.0 */

    const file$3 = "src\\components\\ExcersiseCounter.svelte";

    // (13:4) {:else}
    function create_else_block$1(ctx) {
    	var t0, t1, button, current, dispose;

    	var counter0 = new Counter({
    		props: { counter: series },
    		$$inline: true
    	});

    	var counter1 = new Counter({
    		props: { counter: repetitions },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			counter0.$$.fragment.c();
    			t0 = space();
    			counter1.$$.fragment.c();
    			t1 = space();
    			button = element("button");
    			button.textContent = "Start";
    			button.className = "svelte-10pr9pg";
    			add_location(button, file$3, 15, 8, 529);
    			dispose = listen(button, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			mount_component(counter0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(counter1, target, anchor);
    			insert(target, t1, anchor);
    			insert(target, button, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var counter0_changes = {};
    			if (changed.series) counter0_changes.counter = series;
    			counter0.$set(counter0_changes);

    			var counter1_changes = {};
    			if (changed.repetitions) counter1_changes.counter = repetitions;
    			counter1.$set(counter1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			counter0.$$.fragment.i(local);

    			counter1.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			counter0.$$.fragment.o(local);
    			counter1.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			counter0.$destroy(detaching);

    			if (detaching) {
    				detach(t0);
    			}

    			counter1.$destroy(detaching);

    			if (detaching) {
    				detach(t1);
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (11:4) {#if $isExercising}
    function create_if_block$1(ctx) {
    	var current;

    	var clicker = new Clicker({ $$inline: true });

    	return {
    		c: function create() {
    			clicker.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(clicker, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			clicker.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			clicker.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			clicker.$destroy(detaching);
    		}
    	};
    }

    // (10:0) <FullPageLayout>
    function create_default_slot(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$1,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.$isExercising) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				on_outro(() => {
    					if_blocks[previous_block_index].d(1);
    					if_blocks[previous_block_index] = null;
    				});
    				if_block.o(1);
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				if_block.i(1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var current;

    	var fullpagelayout = new FullPageLayout({
    		props: {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			fullpagelayout.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(fullpagelayout, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var fullpagelayout_changes = {};
    			if (changed.$$scope || changed.$isExercising) fullpagelayout_changes.$$scope = { changed, ctx };
    			fullpagelayout.$set(fullpagelayout_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			fullpagelayout.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			fullpagelayout.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			fullpagelayout.$destroy(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $isExercising;

    	validate_store(isExercising, 'isExercising');
    	subscribe($$self, isExercising, $$value => { $isExercising = $$value; $$invalidate('$isExercising', $isExercising); });

    	function click_handler() {
    		return isExercising.set(true);
    	}

    	return { $isExercising, click_handler };
    }

    class ExcersiseCounter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.4.0 */

    function create_fragment$5(ctx) {
    	var current;

    	var helloworld = new ExcersiseCounter({ $$inline: true });

    	return {
    		c: function create() {
    			helloworld.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(helloworld, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			helloworld.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			helloworld.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			helloworld.$destroy(detaching);
    		}
    	};
    }

    function instance$5($$self) {
    	if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js');
          }

    	return {};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body
    });

}());
//# sourceMappingURL=main.js.map
