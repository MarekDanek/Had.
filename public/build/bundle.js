
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Canvas.svelte generated by Svelte v3.59.2 */
    const file = "src\\Canvas.svelte";

    function create_fragment$1(ctx) {
    	let h1;
    	let t1;
    	let div0;
    	let canvas_1;
    	let t2;
    	let div1;
    	let p0;
    	let b0;
    	let t3;
    	let t4;
    	let t5;
    	let p1;
    	let b1;
    	let t6;
    	let t7;
    	let t8;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Had";
    			t1 = space();
    			div0 = element("div");
    			canvas_1 = element("canvas");
    			t2 = space();
    			div1 = element("div");
    			p0 = element("p");
    			b0 = element("b");
    			t3 = text("Počet snězeného jidla: ");
    			t4 = text(/*pocetJidla*/ ctx[1]);
    			t5 = space();
    			p1 = element("p");
    			b1 = element("b");
    			t6 = text("Musíš sníst ");
    			t7 = text(/*zbyvajiciJidlo*/ ctx[2]);
    			t8 = text(" jídla abys vyhrál.");
    			set_style(h1, "text-align", "center");
    			add_location(h1, file, 114, 2, 2932);
    			attr_dev(canvas_1, "width", "400");
    			attr_dev(canvas_1, "height", "400");
    			set_style(canvas_1, "border", "3px solid black");
    			set_style(canvas_1, "background-color", "lightgray");
    			add_location(canvas_1, file, 117, 4, 3007);
    			attr_dev(div0, "class", "divCanvas svelte-1h5x96v");
    			add_location(div0, file, 116, 2, 2978);
    			add_location(b0, file, 121, 7, 3203);
    			add_location(p0, file, 121, 4, 3200);
    			add_location(b1, file, 123, 7, 3260);
    			add_location(p1, file, 123, 4, 3257);
    			set_style(div1, "text-align", "center");
    			set_style(div1, "font-size", "larger");
    			add_location(div1, file, 120, 2, 3145);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, canvas_1);
    			/*canvas_1_binding*/ ctx[3](canvas_1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p0);
    			append_dev(p0, b0);
    			append_dev(b0, t3);
    			append_dev(b0, t4);
    			append_dev(div1, t5);
    			append_dev(div1, p1);
    			append_dev(p1, b1);
    			append_dev(b1, t6);
    			append_dev(b1, t7);
    			append_dev(b1, t8);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pocetJidla*/ 2) set_data_dev(t4, /*pocetJidla*/ ctx[1]);
    			if (dirty & /*zbyvajiciJidlo*/ 4) set_data_dev(t7, /*zbyvajiciJidlo*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			/*canvas_1_binding*/ ctx[3](null);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Canvas', slots, []);
    	let canvas;
    	let ctx;
    	let had = [{ x: 5, y: 5 }];
    	let smerX = 1;
    	let smerY = 0;
    	let velikostHada = 20;
    	let jidlo = { x: 10, y: 10 };
    	let pocetJidla = 0;
    	let zbyvajiciJidlo = 10;

    	function resetHry() {
    		had = [{ x: 5, y: 5 }];
    		novaPoziceJidla();
    		smerX = 1;
    		smerY = 0;
    	}

    	function novaPoziceJidla() {
    		jidlo.x = Math.floor(Math.random() * (canvas.width / velikostHada));
    		jidlo.y = Math.floor(Math.random() * (canvas.height / velikostHada));
    	}

    	function Kolize() {
    		if (had[0].x < 0 || had[0].x >= canvas.width / velikostHada || had[0].y < 0 || had[0].y >= canvas.height / velikostHada) {
    			alert('KONEC HRY :(, NARAZIL JSI DO ZDI. --> MOC TO NEUMÍŠ');
    			resetHry();
    			location.reload();
    		}

    		for (let i = 1; i < had.length; i++) {
    			if (had[0].x === had[i].x && had[0].y === had[i].y) {
    				alert('KONEC HRY :(, NARAZIL SI SÁM DO SEBE. --> MOC TO NEUMÍŠ');
    				resetHry();
    				location.reload();
    			}
    		}

    		if (had[0].x === jidlo.x && had[0].y === jidlo.y) {
    			had.push({});
    			novaPoziceJidla();
    			$$invalidate(1, pocetJidla += 1);
    			$$invalidate(2, zbyvajiciJidlo -= 1);

    			if (pocetJidla == 10 || zbyvajiciJidlo == 0) {
    				alert('VYHRÁL JSI:). --> JSI ŠIKULKA');
    				resetHry();
    				location.reload();
    			}
    		}
    	}

    	function updateHada() {
    		let hlava = { x: had[0].x + smerX, y: had[0].y + smerY };
    		had.unshift(hlava);
    		Kolize();
    		had.pop();
    		ctx.clearRect(0, 0, canvas.width, canvas.height);
    		ctx.fillStyle = 'blue';

    		had.forEach(cast => {
    			ctx.fillRect(cast.x * velikostHada, cast.y * velikostHada, velikostHada, velikostHada);
    		});

    		ctx.fillStyle = 'green';
    		ctx.fillRect(jidlo.x * velikostHada, jidlo.y * velikostHada, velikostHada, velikostHada);
    	}

    	onMount(() => {
    		ctx = canvas.getContext("2d");
    		novaPoziceJidla();
    		const hraInterval = setInterval(updateHada, 50);

    		window.addEventListener("keydown", event => {
    			switch (event.key) {
    				case "ArrowUp":
    					smerX = 0;
    					smerY = -1;
    					break;
    				case "ArrowDown":
    					smerX = 0;
    					smerY = 1;
    					break;
    				case "ArrowLeft":
    					smerX = -1;
    					smerY = 0;
    					break;
    				case "ArrowRight":
    					smerX = 1;
    					smerY = 0;
    					break;
    			}
    		});

    		onDestroy(() => {
    			window.removeEventListener("keydown", null);
    			clearInterval(hraInterval);
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		canvas,
    		ctx,
    		had,
    		smerX,
    		smerY,
    		velikostHada,
    		jidlo,
    		pocetJidla,
    		zbyvajiciJidlo,
    		resetHry,
    		novaPoziceJidla,
    		Kolize,
    		updateHada
    	});

    	$$self.$inject_state = $$props => {
    		if ('canvas' in $$props) $$invalidate(0, canvas = $$props.canvas);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('had' in $$props) had = $$props.had;
    		if ('smerX' in $$props) smerX = $$props.smerX;
    		if ('smerY' in $$props) smerY = $$props.smerY;
    		if ('velikostHada' in $$props) velikostHada = $$props.velikostHada;
    		if ('jidlo' in $$props) jidlo = $$props.jidlo;
    		if ('pocetJidla' in $$props) $$invalidate(1, pocetJidla = $$props.pocetJidla);
    		if ('zbyvajiciJidlo' in $$props) $$invalidate(2, zbyvajiciJidlo = $$props.zbyvajiciJidlo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [canvas, pocetJidla, zbyvajiciJidlo, canvas_1_binding];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let canvas;
    	let current;
    	canvas = new Canvas({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(canvas.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(canvas, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvas.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvas.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(canvas, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Canvas });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'Marku'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
