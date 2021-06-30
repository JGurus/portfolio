
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
                start_hydrating();
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
            end_hydrating();
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
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

    /* src\components\Intro.svelte generated by Svelte v3.38.3 */

    const file$7 = "src\\components\\Intro.svelte";

    function create_fragment$8(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let svg0;
    	let defs0;
    	let linearGradient;
    	let stop0;
    	let stop1;
    	let path0;
    	let svg0_class_value;
    	let t1;
    	let svg1;
    	let defs1;
    	let g;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;
    	let use;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			svg0 = svg_element("svg");
    			defs0 = svg_element("defs");
    			linearGradient = svg_element("linearGradient");
    			stop0 = svg_element("stop");
    			stop1 = svg_element("stop");
    			path0 = svg_element("path");
    			t1 = space();
    			svg1 = svg_element("svg");
    			defs1 = svg_element("defs");
    			g = svg_element("g");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			use = svg_element("use");
    			attr_dev(div0, "class", "bola svelte-celwcc");
    			set_style(div0, "display", /*noneBola*/ ctx[1]);
    			add_location(div0, file$7, 26, 0, 571);
    			attr_dev(stop0, "stop-color", "#5A9FD4");
    			add_location(stop0, file$7, 38, 8, 958);
    			attr_dev(stop1, "offset", "1");
    			attr_dev(stop1, "stop-color", "#EEB4C0");
    			add_location(stop1, file$7, 39, 8, 997);
    			attr_dev(linearGradient, "id", "paint0_linear");
    			attr_dev(linearGradient, "x1", "25.6393");
    			attr_dev(linearGradient, "y1", "0");
    			attr_dev(linearGradient, "x2", "25.6393");
    			attr_dev(linearGradient, "y2", "66.748");
    			attr_dev(linearGradient, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient, file$7, 30, 6, 775);
    			add_location(defs0, file$7, 29, 4, 761);
    			attr_dev(path0, "d", "M39.4615 66.748C35.8806 66.748 32.9443 65.6976 30.6525 63.5968C28.3607 61.496 27.2149 58.5358 27.2149 54.7162C27.2149 54.0955 27.2387 53.4509 27.2865 52.7825C27.3342 52.1618 27.4058 51.5172 27.5013 50.8488C23.634 51.0875 20.0292 50.634 16.687 49.4881C13.3448 48.3422 10.4085 46.6472 7.87798 44.4032C5.39523 42.1114 3.46154 39.366 2.07692 36.1671C0.692308 32.9204 0 29.3634 0 25.496C0 21.9629 0.596817 18.6684 1.79045 15.6127C2.98409 12.5093 4.70292 9.7878 6.94695 7.44827C9.23873 5.10875 11.9363 3.29443 15.0398 2.0053C18.191 0.668435 21.7241 0 25.6393 0C29.5066 0 33.0159 0.644561 36.1671 1.93368C39.3183 3.22281 42.0159 5.03713 44.2599 7.37666C46.504 9.66843 48.2228 12.3422 49.4164 15.3979C50.6578 18.4058 51.2785 21.6286 51.2785 25.0663V53.9284C51.2785 57.7958 50.2281 60.8992 48.1273 63.2387C46.0265 65.5782 43.1379 66.748 39.4615 66.748ZM25.6393 44.9761C26.4032 44.9761 27.1194 44.9523 27.7878 44.9045C28.4562 44.809 29.1724 44.6658 29.9363 44.4748C30.9867 42.0398 32.6101 39.557 34.8064 37.0265C37.0504 34.496 40.2493 32.1326 44.4032 29.9363V25.0663C44.4032 21.4377 43.5915 18.191 41.9682 15.3263C40.3448 12.4615 38.1008 10.1936 35.2361 8.52254C32.4191 6.85146 29.2202 6.01591 25.6393 6.01591C22.0106 6.01591 18.7878 6.87533 15.9708 8.59416C13.1538 10.313 10.9337 12.6286 9.31034 15.5411C7.687 18.4536 6.87533 21.7719 6.87533 25.496C6.87533 29.1724 7.687 32.4907 9.31034 35.4509C10.9337 38.3634 13.1538 40.679 15.9708 42.3979C18.7878 44.1167 22.0106 44.9761 25.6393 44.9761ZM39.0318 60.5889C40.5597 60.5889 41.8249 60.0159 42.8276 58.87C43.878 57.7719 44.4032 56.1724 44.4032 54.0716V37.0265C41.9204 38.6021 39.9629 40.2016 38.5305 41.8249C37.0981 43.4483 36.0477 45.0239 35.3793 46.5517C34.7109 48.0796 34.2573 49.4881 34.0186 50.7772C33.8276 52.0663 33.7321 53.1406 33.7321 54C33.7321 56.1008 34.2573 57.7241 35.3077 58.87C36.4058 60.0159 37.6472 60.5889 39.0318 60.5889Z");
    			attr_dev(path0, "fill", "url(#paint0_linear)");
    			add_location(path0, file$7, 42, 4, 1081);
    			attr_dev(svg0, "class", svg0_class_value = "isotipo " + /*moverIsotipo*/ ctx[0] + " svelte-celwcc");
    			attr_dev(svg0, "viewBox", "0 0 52 67");
    			add_location(svg0, file$7, 28, 2, 699);
    			attr_dev(path1, "d", "M78.2259 51.8515C74.8837 51.8515 71.9235 51.183 69.3453 49.8462C66.8148 48.4615 64.8095 46.5517 63.3294 44.1167C61.8493 41.6817 61.1092 38.8408 61.1092 35.5942V14.4668H67.6981V35.5225C67.6981 37.7188 68.1755 39.6286 69.1304 41.252C70.1331 42.8276 71.4222 44.0451 72.9978 44.9045C74.6211 45.7639 76.34 46.1936 78.1543 46.1936C80.0164 46.1936 81.7352 45.7639 83.3108 44.9045C84.9341 44.0451 86.2233 42.8276 87.1782 41.252C88.1808 39.6286 88.6822 37.7188 88.6822 35.5225V14.4668H95.271V35.5942C95.271 38.8408 94.531 41.6817 93.0509 44.1167C91.6185 46.5517 89.6132 48.4615 87.0349 49.8462C84.4567 51.183 81.5204 51.8515 78.2259 51.8515Z");
    			add_location(path1, file$7, 50, 8, 3155);
    			attr_dev(path2, "d", "M105.586 50.992V24.8515C105.586 21.6048 106.493 19.0743 108.307 17.2599C110.169 15.3979 112.724 14.4668 115.97 14.4668H123.49V20.1247H117.188C115.564 20.1247 114.323 20.6021 113.464 21.557C112.604 22.4642 112.175 23.7056 112.175 25.2812V50.992H105.586Z");
    			add_location(path2, file$7, 53, 8, 3830);
    			attr_dev(path3, "d", "M146.697 51.8515C143.355 51.8515 140.394 51.183 137.816 49.8462C135.286 48.4615 133.28 46.5517 131.8 44.1167C130.32 41.6817 129.58 38.8408 129.58 35.5942V14.4668H136.169V35.5225C136.169 37.7188 136.646 39.6286 137.601 41.252C138.604 42.8276 139.893 44.0451 141.469 44.9045C143.092 45.7639 144.811 46.1936 146.625 46.1936C148.487 46.1936 150.206 45.7639 151.782 44.9045C153.405 44.0451 154.694 42.8276 155.649 41.252C156.652 39.6286 157.153 37.7188 157.153 35.5225V14.4668H163.742V35.5942C163.742 38.8408 163.002 41.6817 161.522 44.1167C160.089 46.5517 158.084 48.4615 155.506 49.8462C152.927 51.183 149.991 51.8515 146.697 51.8515Z");
    			add_location(path3, file$7, 56, 8, 4125);
    			attr_dev(path4, "d", "M174.148 21.1989L177.8 9.31034C176.75 8.97612 175.938 8.37931 175.365 7.51989C174.84 6.61273 174.577 5.68169 174.577 4.72679C174.577 3.43766 175.031 2.33952 175.938 1.43236C176.893 0.525198 178.015 0.0716171 179.304 0.0716171C180.737 0.0716171 181.882 0.572943 182.742 1.57559C183.601 2.5305 184.031 3.67639 184.031 5.01326C184.031 5.92042 183.935 6.77984 183.744 7.59151C183.601 8.35544 183.363 9.23873 183.028 10.2414L179.734 21.1989H174.148Z");
    			add_location(path4, file$7, 59, 8, 4799);
    			attr_dev(path5, "d", "M191.465 50.992V45.3342H208.939C210.658 45.3342 211.995 44.809 212.95 43.7586C213.953 42.6605 214.454 41.4191 214.454 40.0345C214.454 38.7454 214 37.6233 213.093 36.6684C212.234 35.6658 210.969 35.1645 209.298 35.1645H201.921C198.388 35.1645 195.547 34.305 193.398 32.5862C191.298 30.8196 190.247 28.2653 190.247 24.9231C190.247 23.061 190.701 21.3422 191.608 19.7666C192.515 18.191 193.78 16.9257 195.404 15.9708C197.027 14.9682 198.889 14.4668 200.99 14.4668H217.82V20.1247H201.634C200.202 20.1247 199.032 20.6021 198.125 21.557C197.266 22.4642 196.836 23.5146 196.836 24.7082C196.836 25.9019 197.266 26.9523 198.125 27.8594C199.032 28.7188 200.298 29.1485 201.921 29.1485H208.939C212.855 29.1485 215.839 30.0796 217.892 31.9416C219.993 33.8037 221.043 36.4297 221.043 39.8196C221.043 41.7772 220.565 43.6154 219.611 45.3342C218.656 47.0053 217.319 48.366 215.6 49.4164C213.881 50.4668 211.924 50.992 209.727 50.992H191.465Z");
    			add_location(path5, file$7, 62, 8, 5286);
    			attr_dev(g, "id", "logo");
    			attr_dev(g, "fill", "#6E7376");
    			add_location(g, file$7, 49, 6, 3117);
    			add_location(defs1, file$7, 48, 4, 3103);
    			attr_dev(use, "id", "use-logotipo");
    			attr_dev(use, "href", "#logo");
    			attr_dev(use, "x", "0");
    			add_location(use, file$7, 67, 4, 6276);
    			attr_dev(svg1, "class", "logo svelte-celwcc");
    			set_style(svg1, "opacity", /*uno*/ ctx[4]);
    			attr_dev(svg1, "viewBox", "0 0 222 67");
    			add_location(svg1, file$7, 47, 2, 3034);
    			attr_dev(div1, "class", "logo-container svelte-celwcc");
    			set_style(div1, "opacity", /*cero*/ ctx[3]);
    			set_style(div1, "display", /*noneLogo*/ ctx[2]);
    			add_location(div1, file$7, 27, 0, 622);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, svg0);
    			append_dev(svg0, defs0);
    			append_dev(defs0, linearGradient);
    			append_dev(linearGradient, stop0);
    			append_dev(linearGradient, stop1);
    			append_dev(svg0, path0);
    			append_dev(div1, t1);
    			append_dev(div1, svg1);
    			append_dev(svg1, defs1);
    			append_dev(defs1, g);
    			append_dev(g, path1);
    			append_dev(g, path2);
    			append_dev(g, path3);
    			append_dev(g, path4);
    			append_dev(g, path5);
    			append_dev(svg1, use);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*noneBola*/ 2) {
    				set_style(div0, "display", /*noneBola*/ ctx[1]);
    			}

    			if (dirty & /*moverIsotipo*/ 1 && svg0_class_value !== (svg0_class_value = "isotipo " + /*moverIsotipo*/ ctx[0] + " svelte-celwcc")) {
    				attr_dev(svg0, "class", svg0_class_value);
    			}

    			if (dirty & /*uno*/ 16) {
    				set_style(svg1, "opacity", /*uno*/ ctx[4]);
    			}

    			if (dirty & /*cero*/ 8) {
    				set_style(div1, "opacity", /*cero*/ ctx[3]);
    			}

    			if (dirty & /*noneLogo*/ 4) {
    				set_style(div1, "display", /*noneLogo*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let noneBola;
    	let noneLogo;
    	let cero;
    	let uno;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Intro", slots, []);
    	let ocultarBola;
    	let ocultarLogo;
    	let moverIsotipo;
    	let aparecerLogo;
    	let desvanecer;

    	setTimeout(
    		() => {
    			$$invalidate(5, ocultarBola = "none");
    			$$invalidate(0, moverIsotipo = "left");

    			setTimeout(
    				() => {
    					$$invalidate(7, aparecerLogo = 1);

    					setTimeout(
    						() => {
    							$$invalidate(8, desvanecer = 0);

    							setTimeout(
    								() => {
    									$$invalidate(6, ocultarLogo = "none");
    								},
    								1000
    							);
    						},
    						2000
    					);
    				},
    				2000
    			);
    		},
    		2000
    	);

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Intro> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ocultarBola,
    		ocultarLogo,
    		moverIsotipo,
    		aparecerLogo,
    		desvanecer,
    		noneBola,
    		noneLogo,
    		cero,
    		uno
    	});

    	$$self.$inject_state = $$props => {
    		if ("ocultarBola" in $$props) $$invalidate(5, ocultarBola = $$props.ocultarBola);
    		if ("ocultarLogo" in $$props) $$invalidate(6, ocultarLogo = $$props.ocultarLogo);
    		if ("moverIsotipo" in $$props) $$invalidate(0, moverIsotipo = $$props.moverIsotipo);
    		if ("aparecerLogo" in $$props) $$invalidate(7, aparecerLogo = $$props.aparecerLogo);
    		if ("desvanecer" in $$props) $$invalidate(8, desvanecer = $$props.desvanecer);
    		if ("noneBola" in $$props) $$invalidate(1, noneBola = $$props.noneBola);
    		if ("noneLogo" in $$props) $$invalidate(2, noneLogo = $$props.noneLogo);
    		if ("cero" in $$props) $$invalidate(3, cero = $$props.cero);
    		if ("uno" in $$props) $$invalidate(4, uno = $$props.uno);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ocultarBola*/ 32) {
    			$$invalidate(1, noneBola = ocultarBola || "block");
    		}

    		if ($$self.$$.dirty & /*ocultarLogo*/ 64) {
    			$$invalidate(2, noneLogo = ocultarLogo || "block");
    		}

    		if ($$self.$$.dirty & /*desvanecer*/ 256) {
    			$$invalidate(3, cero = desvanecer && 1);
    		}

    		if ($$self.$$.dirty & /*aparecerLogo*/ 128) {
    			$$invalidate(4, uno = aparecerLogo || 0);
    		}
    	};

    	return [
    		moverIsotipo,
    		noneBola,
    		noneLogo,
    		cero,
    		uno,
    		ocultarBola,
    		ocultarLogo,
    		aparecerLogo,
    		desvanecer
    	];
    }

    class Intro extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Intro",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\components\Header.svelte generated by Svelte v3.38.3 */
    const file$6 = "src\\components\\Header.svelte";

    function create_fragment$7(ctx) {
    	let header;
    	let h2;
    	let a0;
    	let span;
    	let t2;
    	let nav;
    	let ul;
    	let a1;
    	let li0;
    	let t4;
    	let a2;
    	let li1;
    	let t6;
    	let a3;
    	let li2;
    	let t8;
    	let a4;
    	let li3;
    	let header_transition;
    	let current;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h2 = element("h2");
    			a0 = element("a");
    			a0.textContent = "G";
    			span = element("span");
    			span.textContent = "uru's";
    			t2 = space();
    			nav = element("nav");
    			ul = element("ul");
    			a1 = element("a");
    			li0 = element("li");
    			li0.textContent = "About me";
    			t4 = space();
    			a2 = element("a");
    			li1 = element("li");
    			li1.textContent = "Skills";
    			t6 = space();
    			a3 = element("a");
    			li2 = element("li");
    			li2.textContent = "Proyects";
    			t8 = space();
    			a4 = element("a");
    			li3 = element("li");
    			li3.textContent = "Contact";
    			attr_dev(a0, "href", "#home");
    			add_location(a0, file$6, 5, 22, 116);
    			attr_dev(span, "class", "svelte-57xcjr");
    			add_location(span, file$6, 5, 43, 137);
    			attr_dev(h2, "class", "isotipo svelte-57xcjr");
    			add_location(h2, file$6, 5, 2, 96);
    			attr_dev(li0, "class", "svelte-57xcjr");
    			add_location(li0, file$6, 8, 23, 204);
    			attr_dev(a1, "href", "#about");
    			attr_dev(a1, "class", "svelte-57xcjr");
    			add_location(a1, file$6, 8, 6, 187);
    			attr_dev(li1, "class", "svelte-57xcjr");
    			add_location(li1, file$6, 9, 24, 251);
    			attr_dev(a2, "href", "#skills");
    			attr_dev(a2, "class", "svelte-57xcjr");
    			add_location(a2, file$6, 9, 6, 233);
    			attr_dev(li2, "class", "svelte-57xcjr");
    			add_location(li2, file$6, 10, 26, 298);
    			attr_dev(a3, "href", "#proyects");
    			attr_dev(a3, "class", "svelte-57xcjr");
    			add_location(a3, file$6, 10, 6, 278);
    			attr_dev(li3, "class", "svelte-57xcjr");
    			add_location(li3, file$6, 11, 25, 346);
    			attr_dev(a4, "href", "#contact");
    			attr_dev(a4, "class", "svelte-57xcjr");
    			add_location(a4, file$6, 11, 6, 327);
    			attr_dev(ul, "class", "svelte-57xcjr");
    			add_location(ul, file$6, 7, 4, 175);
    			attr_dev(nav, "class", "svelte-57xcjr");
    			add_location(nav, file$6, 6, 2, 164);
    			attr_dev(header, "class", "svelte-57xcjr");
    			add_location(header, file$6, 4, 0, 68);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h2);
    			append_dev(h2, a0);
    			append_dev(h2, span);
    			append_dev(header, t2);
    			append_dev(header, nav);
    			append_dev(nav, ul);
    			append_dev(ul, a1);
    			append_dev(a1, li0);
    			append_dev(ul, t4);
    			append_dev(ul, a2);
    			append_dev(a2, li1);
    			append_dev(ul, t6);
    			append_dev(ul, a3);
    			append_dev(a3, li2);
    			append_dev(ul, t8);
    			append_dev(ul, a4);
    			append_dev(a4, li3);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!header_transition) header_transition = create_bidirectional_transition(header, fade, {}, true);
    				header_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!header_transition) header_transition = create_bidirectional_transition(header, fade, {}, false);
    			header_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching && header_transition) header_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ fade });
    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\components\ToDown.svelte generated by Svelte v3.38.3 */

    const file$5 = "src\\components\\ToDown.svelte";

    function create_fragment$6(ctx) {
    	let svg;
    	let g1;
    	let g0;
    	let circle;
    	let path;
    	let defs;
    	let filter0;
    	let feFlood0;
    	let feColorMatrix0;
    	let feOffset0;
    	let feGaussianBlur0;
    	let feColorMatrix1;
    	let feBlend0;
    	let feBlend1;
    	let filter1;
    	let feFlood1;
    	let feColorMatrix2;
    	let feMorphology;
    	let feOffset1;
    	let feGaussianBlur1;
    	let feColorMatrix3;
    	let feBlend2;
    	let feBlend3;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			circle = svg_element("circle");
    			path = svg_element("path");
    			defs = svg_element("defs");
    			filter0 = svg_element("filter");
    			feFlood0 = svg_element("feFlood");
    			feColorMatrix0 = svg_element("feColorMatrix");
    			feOffset0 = svg_element("feOffset");
    			feGaussianBlur0 = svg_element("feGaussianBlur");
    			feColorMatrix1 = svg_element("feColorMatrix");
    			feBlend0 = svg_element("feBlend");
    			feBlend1 = svg_element("feBlend");
    			filter1 = svg_element("filter");
    			feFlood1 = svg_element("feFlood");
    			feColorMatrix2 = svg_element("feColorMatrix");
    			feMorphology = svg_element("feMorphology");
    			feOffset1 = svg_element("feOffset");
    			feGaussianBlur1 = svg_element("feGaussianBlur");
    			feColorMatrix3 = svg_element("feColorMatrix");
    			feBlend2 = svg_element("feBlend");
    			feBlend3 = svg_element("feBlend");
    			attr_dev(circle, "cx", "44");
    			attr_dev(circle, "cy", "40");
    			attr_dev(circle, "r", "40");
    			attr_dev(circle, "fill", "#5A9FD4");
    			add_location(circle, file$5, 5, 6, 155);
    			attr_dev(g0, "filter", "url(#filter1_d)");
    			add_location(g0, file$5, 4, 4, 119);
    			attr_dev(path, "d", "M20.5 32C38.6143 63.8884 49.0243 64.0559 68 32");
    			attr_dev(path, "stroke", "white");
    			attr_dev(path, "stroke-width", "4");
    			attr_dev(path, "stroke-linecap", "round");
    			attr_dev(path, "stroke-linejoin", "round");
    			add_location(path, file$5, 7, 4, 219);
    			attr_dev(g1, "filter", "url(#filter0_d)");
    			add_location(g1, file$5, 3, 2, 85);
    			attr_dev(feFlood0, "flood-opacity", "0");
    			attr_dev(feFlood0, "result", "BackgroundImageFix");
    			add_location(feFlood0, file$5, 25, 6, 606);
    			attr_dev(feColorMatrix0, "in", "SourceAlpha");
    			attr_dev(feColorMatrix0, "type", "matrix");
    			attr_dev(feColorMatrix0, "values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0");
    			add_location(feColorMatrix0, file$5, 26, 6, 671);
    			attr_dev(feOffset0, "dy", "4");
    			add_location(feOffset0, file$5, 31, 6, 812);
    			attr_dev(feGaussianBlur0, "stdDeviation", "2");
    			add_location(feGaussianBlur0, file$5, 32, 6, 839);
    			attr_dev(feColorMatrix1, "type", "matrix");
    			attr_dev(feColorMatrix1, "values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0");
    			add_location(feColorMatrix1, file$5, 33, 6, 882);
    			attr_dev(feBlend0, "mode", "normal");
    			attr_dev(feBlend0, "in2", "BackgroundImageFix");
    			attr_dev(feBlend0, "result", "effect1_dropShadow");
    			add_location(feBlend0, file$5, 37, 6, 998);
    			attr_dev(feBlend1, "mode", "normal");
    			attr_dev(feBlend1, "in", "SourceGraphic");
    			attr_dev(feBlend1, "in2", "effect1_dropShadow");
    			attr_dev(feBlend1, "result", "shape");
    			add_location(feBlend1, file$5, 42, 6, 1118);
    			attr_dev(filter0, "id", "filter0_d");
    			attr_dev(filter0, "x", "0");
    			attr_dev(filter0, "y", "0");
    			attr_dev(filter0, "width", "88");
    			attr_dev(filter0, "height", "88");
    			attr_dev(filter0, "filterUnits", "userSpaceOnUse");
    			attr_dev(filter0, "color-interpolation-filters", "sRGB");
    			add_location(filter0, file$5, 16, 4, 421);
    			attr_dev(feFlood1, "flood-opacity", "0");
    			attr_dev(feFlood1, "result", "BackgroundImageFix");
    			add_location(feFlood1, file$5, 58, 6, 1451);
    			attr_dev(feColorMatrix2, "in", "SourceAlpha");
    			attr_dev(feColorMatrix2, "type", "matrix");
    			attr_dev(feColorMatrix2, "values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0");
    			add_location(feColorMatrix2, file$5, 59, 6, 1516);
    			attr_dev(feMorphology, "radius", "4");
    			attr_dev(feMorphology, "operator", "erode");
    			attr_dev(feMorphology, "in", "SourceAlpha");
    			attr_dev(feMorphology, "result", "effect1_dropShadow");
    			add_location(feMorphology, file$5, 64, 6, 1657);
    			add_location(feOffset1, file$5, 70, 6, 1797);
    			attr_dev(feGaussianBlur1, "stdDeviation", "2");
    			add_location(feGaussianBlur1, file$5, 71, 6, 1817);
    			attr_dev(feColorMatrix3, "type", "matrix");
    			attr_dev(feColorMatrix3, "values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0");
    			add_location(feColorMatrix3, file$5, 72, 6, 1860);
    			attr_dev(feBlend2, "mode", "normal");
    			attr_dev(feBlend2, "in2", "BackgroundImageFix");
    			attr_dev(feBlend2, "result", "effect1_dropShadow");
    			add_location(feBlend2, file$5, 76, 6, 1976);
    			attr_dev(feBlend3, "mode", "normal");
    			attr_dev(feBlend3, "in", "SourceGraphic");
    			attr_dev(feBlend3, "in2", "effect1_dropShadow");
    			attr_dev(feBlend3, "result", "shape");
    			add_location(feBlend3, file$5, 81, 6, 2096);
    			attr_dev(filter1, "id", "filter1_d");
    			attr_dev(filter1, "x", "4");
    			attr_dev(filter1, "y", "0");
    			attr_dev(filter1, "width", "80");
    			attr_dev(filter1, "height", "80");
    			attr_dev(filter1, "filterUnits", "userSpaceOnUse");
    			attr_dev(filter1, "color-interpolation-filters", "sRGB");
    			add_location(filter1, file$5, 49, 4, 1266);
    			add_location(defs, file$5, 15, 2, 409);
    			attr_dev(svg, "width", "88");
    			attr_dev(svg, "height", "88");
    			attr_dev(svg, "viewBox", "0 0 88 88");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "class", "svelte-aaafr6");
    			add_location(svg, file$5, 2, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			append_dev(g0, circle);
    			append_dev(g1, path);
    			append_dev(svg, defs);
    			append_dev(defs, filter0);
    			append_dev(filter0, feFlood0);
    			append_dev(filter0, feColorMatrix0);
    			append_dev(filter0, feOffset0);
    			append_dev(filter0, feGaussianBlur0);
    			append_dev(filter0, feColorMatrix1);
    			append_dev(filter0, feBlend0);
    			append_dev(filter0, feBlend1);
    			append_dev(defs, filter1);
    			append_dev(filter1, feFlood1);
    			append_dev(filter1, feColorMatrix2);
    			append_dev(filter1, feMorphology);
    			append_dev(filter1, feOffset1);
    			append_dev(filter1, feGaussianBlur1);
    			append_dev(filter1, feColorMatrix3);
    			append_dev(filter1, feBlend2);
    			append_dev(filter1, feBlend3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ToDown", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ToDown> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ToDown extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ToDown",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\About.svelte generated by Svelte v3.38.3 */

    const file$4 = "src\\components\\About.svelte";

    function create_fragment$5(ctx) {
    	let section;
    	let div1;
    	let div0;
    	let t0;
    	let div2;
    	let p;
    	let t1;
    	let br0;
    	let t2;
    	let br1;
    	let t3;
    	let br2;
    	let t4;
    	let br3;
    	let t5;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			p = element("p");
    			t1 = text("Hi,");
    			br0 = element("br");
    			t2 = text(" I am a young enthusiast addicted to knowledge.");
    			br1 = element("br");
    			t3 = text("I like to\r\n      teach and learn from others.");
    			br2 = element("br");
    			t4 = text(" Teamwork is my pasion");
    			br3 = element("br");
    			t5 = text(" Share and understand\r\n      others blablateishon");
    			attr_dev(div0, "class", "photo svelte-83ewuk");
    			add_location(div0, file$4, 1, 31, 53);
    			attr_dev(div1, "class", "photo-container svelte-83ewuk");
    			add_location(div1, file$4, 1, 2, 24);
    			add_location(br0, file$4, 4, 9, 132);
    			add_location(br1, file$4, 4, 62, 185);
    			add_location(br2, file$4, 5, 34, 236);
    			add_location(br3, file$4, 5, 62, 264);
    			attr_dev(p, "class", "svelte-83ewuk");
    			add_location(p, file$4, 3, 4, 118);
    			attr_dev(div2, "class", "text-container svelte-83ewuk");
    			add_location(div2, file$4, 2, 2, 84);
    			attr_dev(section, "id", "about");
    			attr_dev(section, "class", "svelte-83ewuk");
    			add_location(section, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, div0);
    			append_dev(section, t0);
    			append_dev(section, div2);
    			append_dev(div2, p);
    			append_dev(p, t1);
    			append_dev(p, br0);
    			append_dev(p, t2);
    			append_dev(p, br1);
    			append_dev(p, t3);
    			append_dev(p, br2);
    			append_dev(p, t4);
    			append_dev(p, br3);
    			append_dev(p, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\Skills.svelte generated by Svelte v3.38.3 */

    const file$3 = "src\\components\\Skills.svelte";

    function create_fragment$4(ctx) {
    	let section;
    	let div1;
    	let h40;
    	let t1;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let img2;
    	let img2_src_value;
    	let t4;
    	let img3;
    	let img3_src_value;
    	let t5;
    	let img4;
    	let img4_src_value;
    	let t6;
    	let img5;
    	let img5_src_value;
    	let t7;
    	let img6;
    	let img6_src_value;
    	let t8;
    	let img7;
    	let img7_src_value;
    	let t9;
    	let div3;
    	let h41;
    	let t11;
    	let div2;
    	let img8;
    	let img8_src_value;
    	let t12;
    	let img9;
    	let img9_src_value;
    	let t13;
    	let img10;
    	let img10_src_value;
    	let t14;
    	let img11;
    	let img11_src_value;
    	let t15;
    	let img12;
    	let img12_src_value;
    	let t16;
    	let div5;
    	let h42;
    	let t18;
    	let div4;
    	let img13;
    	let img13_src_value;
    	let t19;
    	let img14;
    	let img14_src_value;
    	let t20;
    	let img15;
    	let img15_src_value;
    	let t21;
    	let img16;
    	let img16_src_value;
    	let t22;
    	let img17;
    	let img17_src_value;
    	let t23;
    	let img18;
    	let img18_src_value;
    	let t24;
    	let img19;
    	let img19_src_value;
    	let t25;
    	let img20;
    	let img20_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Frontend";
    			t1 = space();
    			div0 = element("div");
    			img0 = element("img");
    			t2 = space();
    			img1 = element("img");
    			t3 = space();
    			img2 = element("img");
    			t4 = space();
    			img3 = element("img");
    			t5 = space();
    			img4 = element("img");
    			t6 = space();
    			img5 = element("img");
    			t7 = space();
    			img6 = element("img");
    			t8 = space();
    			img7 = element("img");
    			t9 = space();
    			div3 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Backend";
    			t11 = space();
    			div2 = element("div");
    			img8 = element("img");
    			t12 = space();
    			img9 = element("img");
    			t13 = space();
    			img10 = element("img");
    			t14 = space();
    			img11 = element("img");
    			t15 = space();
    			img12 = element("img");
    			t16 = space();
    			div5 = element("div");
    			h42 = element("h4");
    			h42.textContent = "Design & Others";
    			t18 = space();
    			div4 = element("div");
    			img13 = element("img");
    			t19 = space();
    			img14 = element("img");
    			t20 = space();
    			img15 = element("img");
    			t21 = space();
    			img16 = element("img");
    			t22 = space();
    			img17 = element("img");
    			t23 = space();
    			img18 = element("img");
    			t24 = space();
    			img19 = element("img");
    			t25 = space();
    			img20 = element("img");
    			attr_dev(h40, "class", "svelte-1e34u5a");
    			add_location(h40, file$3, 26, 4, 815);
    			if (img0.src !== (img0_src_value = /*html*/ ctx[0])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "html5");
    			add_location(img0, file$3, 28, 6, 851);
    			if (img1.src !== (img1_src_value = /*css*/ ctx[1])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "css3");
    			add_location(img1, file$3, 29, 6, 889);
    			if (img2.src !== (img2_src_value = /*js*/ ctx[2])) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "javascript");
    			add_location(img2, file$3, 30, 6, 925);
    			if (img3.src !== (img3_src_value = /*svg*/ ctx[3])) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "svg");
    			add_location(img3, file$3, 31, 6, 966);
    			if (img4.src !== (img4_src_value = /*angular*/ ctx[4])) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "angular");
    			add_location(img4, file$3, 32, 6, 1001);
    			if (img5.src !== (img5_src_value = /*svelt*/ ctx[5])) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "svelte");
    			add_location(img5, file$3, 33, 6, 1044);
    			if (img6.src !== (img6_src_value = /*react*/ ctx[6])) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "react");
    			add_location(img6, file$3, 34, 6, 1084);
    			if (img7.src !== (img7_src_value = /*vue*/ ctx[7])) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "vue");
    			add_location(img7, file$3, 35, 6, 1123);
    			attr_dev(div0, "class", "svelte-1e34u5a");
    			add_location(div0, file$3, 27, 4, 838);
    			attr_dev(div1, "class", "frontend-container svelte-1e34u5a");
    			add_location(div1, file$3, 25, 2, 777);
    			attr_dev(h41, "class", "svelte-1e34u5a");
    			add_location(h41, file$3, 39, 4, 1213);
    			if (img8.src !== (img8_src_value = /*node*/ ctx[8])) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "node");
    			add_location(img8, file$3, 41, 6, 1248);
    			if (img9.src !== (img9_src_value = /*python*/ ctx[9])) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "python");
    			add_location(img9, file$3, 42, 6, 1285);
    			if (img10.src !== (img10_src_value = /*dotnet*/ ctx[10])) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "dotnet");
    			add_location(img10, file$3, 43, 6, 1326);
    			if (img11.src !== (img11_src_value = /*java*/ ctx[11])) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "java");
    			add_location(img11, file$3, 44, 6, 1367);
    			if (img12.src !== (img12_src_value = /*go*/ ctx[12])) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "go");
    			add_location(img12, file$3, 45, 6, 1404);
    			attr_dev(div2, "class", "svelte-1e34u5a");
    			add_location(div2, file$3, 40, 4, 1235);
    			attr_dev(div3, "class", "backend-container svelte-1e34u5a");
    			add_location(div3, file$3, 38, 2, 1176);
    			attr_dev(h42, "class", "svelte-1e34u5a");
    			add_location(h42, file$3, 49, 4, 1491);
    			if (img13.src !== (img13_src_value = /*ai*/ ctx[13])) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "alt", "adobe illustrator");
    			add_location(img13, file$3, 51, 6, 1534);
    			if (img14.src !== (img14_src_value = /*ps*/ ctx[14])) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "adobe photoshop");
    			add_location(img14, file$3, 52, 6, 1582);
    			if (img15.src !== (img15_src_value = /*xd*/ ctx[15])) attr_dev(img15, "src", img15_src_value);
    			attr_dev(img15, "alt", "adobe xd");
    			add_location(img15, file$3, 53, 6, 1628);
    			if (img16.src !== (img16_src_value = /*figma*/ ctx[16])) attr_dev(img16, "src", img16_src_value);
    			attr_dev(img16, "alt", "figma");
    			add_location(img16, file$3, 54, 6, 1667);
    			if (img17.src !== (img17_src_value = /*ae*/ ctx[17])) attr_dev(img17, "src", img17_src_value);
    			attr_dev(img17, "alt", "adobe after effects");
    			add_location(img17, file$3, 55, 6, 1706);
    			if (img18.src !== (img18_src_value = /*pr*/ ctx[18])) attr_dev(img18, "src", img18_src_value);
    			attr_dev(img18, "alt", "adobe premiere");
    			add_location(img18, file$3, 56, 6, 1756);
    			if (img19.src !== (img19_src_value = /*au*/ ctx[19])) attr_dev(img19, "src", img19_src_value);
    			attr_dev(img19, "alt", "adobe audition");
    			add_location(img19, file$3, 57, 6, 1801);
    			if (img20.src !== (img20_src_value = /*pt*/ ctx[20])) attr_dev(img20, "src", img20_src_value);
    			attr_dev(img20, "alt", "protools");
    			add_location(img20, file$3, 58, 6, 1846);
    			attr_dev(div4, "class", "svelte-1e34u5a");
    			add_location(div4, file$3, 50, 4, 1521);
    			attr_dev(div5, "class", "design-container svelte-1e34u5a");
    			add_location(div5, file$3, 48, 2, 1455);
    			attr_dev(section, "id", "skills");
    			attr_dev(section, "class", "svelte-1e34u5a");
    			add_location(section, file$3, 24, 0, 752);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, h40);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t2);
    			append_dev(div0, img1);
    			append_dev(div0, t3);
    			append_dev(div0, img2);
    			append_dev(div0, t4);
    			append_dev(div0, img3);
    			append_dev(div0, t5);
    			append_dev(div0, img4);
    			append_dev(div0, t6);
    			append_dev(div0, img5);
    			append_dev(div0, t7);
    			append_dev(div0, img6);
    			append_dev(div0, t8);
    			append_dev(div0, img7);
    			append_dev(section, t9);
    			append_dev(section, div3);
    			append_dev(div3, h41);
    			append_dev(div3, t11);
    			append_dev(div3, div2);
    			append_dev(div2, img8);
    			append_dev(div2, t12);
    			append_dev(div2, img9);
    			append_dev(div2, t13);
    			append_dev(div2, img10);
    			append_dev(div2, t14);
    			append_dev(div2, img11);
    			append_dev(div2, t15);
    			append_dev(div2, img12);
    			append_dev(section, t16);
    			append_dev(section, div5);
    			append_dev(div5, h42);
    			append_dev(div5, t18);
    			append_dev(div5, div4);
    			append_dev(div4, img13);
    			append_dev(div4, t19);
    			append_dev(div4, img14);
    			append_dev(div4, t20);
    			append_dev(div4, img15);
    			append_dev(div4, t21);
    			append_dev(div4, img16);
    			append_dev(div4, t22);
    			append_dev(div4, img17);
    			append_dev(div4, t23);
    			append_dev(div4, img18);
    			append_dev(div4, t24);
    			append_dev(div4, img19);
    			append_dev(div4, t25);
    			append_dev(div4, img20);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Skills", slots, []);

    	let html = "images/html5.svg",
    		css = "images/css3.svg",
    		js = "images/javascript.svg",
    		svg = "images/svg.svg",
    		angular = "images/angular.svg",
    		svelt = "images/svelte.svg",
    		react = "images/react.svg",
    		vue = "images/vuedotjs.svg",
    		node = "images/nodedotjs.svg",
    		python = "images/python.svg",
    		dotnet = "images/dotnet.svg",
    		java = "images/java.svg",
    		go = "images/go.svg",
    		ai = "images/adobeillustrator.svg",
    		ps = "images/adobephotoshop.svg",
    		xd = "images/adobexd.svg",
    		figma = "images/figma.svg",
    		ae = "images/adobeaftereffects.svg",
    		pr = "images/adobepremierepro.svg",
    		au = "images/adobeaudition.svg",
    		pt = "images/protools.svg";

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Skills> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		html,
    		css,
    		js,
    		svg,
    		angular,
    		svelt,
    		react,
    		vue,
    		node,
    		python,
    		dotnet,
    		java,
    		go,
    		ai,
    		ps,
    		xd,
    		figma,
    		ae,
    		pr,
    		au,
    		pt
    	});

    	$$self.$inject_state = $$props => {
    		if ("html" in $$props) $$invalidate(0, html = $$props.html);
    		if ("css" in $$props) $$invalidate(1, css = $$props.css);
    		if ("js" in $$props) $$invalidate(2, js = $$props.js);
    		if ("svg" in $$props) $$invalidate(3, svg = $$props.svg);
    		if ("angular" in $$props) $$invalidate(4, angular = $$props.angular);
    		if ("svelt" in $$props) $$invalidate(5, svelt = $$props.svelt);
    		if ("react" in $$props) $$invalidate(6, react = $$props.react);
    		if ("vue" in $$props) $$invalidate(7, vue = $$props.vue);
    		if ("node" in $$props) $$invalidate(8, node = $$props.node);
    		if ("python" in $$props) $$invalidate(9, python = $$props.python);
    		if ("dotnet" in $$props) $$invalidate(10, dotnet = $$props.dotnet);
    		if ("java" in $$props) $$invalidate(11, java = $$props.java);
    		if ("go" in $$props) $$invalidate(12, go = $$props.go);
    		if ("ai" in $$props) $$invalidate(13, ai = $$props.ai);
    		if ("ps" in $$props) $$invalidate(14, ps = $$props.ps);
    		if ("xd" in $$props) $$invalidate(15, xd = $$props.xd);
    		if ("figma" in $$props) $$invalidate(16, figma = $$props.figma);
    		if ("ae" in $$props) $$invalidate(17, ae = $$props.ae);
    		if ("pr" in $$props) $$invalidate(18, pr = $$props.pr);
    		if ("au" in $$props) $$invalidate(19, au = $$props.au);
    		if ("pt" in $$props) $$invalidate(20, pt = $$props.pt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		html,
    		css,
    		js,
    		svg,
    		angular,
    		svelt,
    		react,
    		vue,
    		node,
    		python,
    		dotnet,
    		java,
    		go,
    		ai,
    		ps,
    		xd,
    		figma,
    		ae,
    		pr,
    		au,
    		pt
    	];
    }

    class Skills extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skills",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\Proyects.svelte generated by Svelte v3.38.3 */

    const file$2 = "src\\components\\Proyects.svelte";

    function create_fragment$3(ctx) {
    	let section;

    	const block = {
    		c: function create() {
    			section = element("section");
    			attr_dev(section, "id", "proyects");
    			attr_dev(section, "class", "svelte-19u041y");
    			add_location(section, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Proyects", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Proyects> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Proyects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Proyects",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Contact.svelte generated by Svelte v3.38.3 */

    const file$1 = "src\\components\\Contact.svelte";

    function create_fragment$2(ctx) {
    	let footer;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let img3;
    	let img3_src_value;
    	let t3;
    	let img4;
    	let img4_src_value;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			img0 = element("img");
    			t0 = space();
    			div = element("div");
    			img1 = element("img");
    			t1 = space();
    			img2 = element("img");
    			t2 = space();
    			img3 = element("img");
    			t3 = space();
    			img4 = element("img");
    			if (img0.src !== (img0_src_value = /*logo*/ ctx[0])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "logotipo");
    			add_location(img0, file$1, 9, 2, 231);
    			if (img1.src !== (img1_src_value = /*linkedin*/ ctx[1])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "linkedin");
    			add_location(img1, file$1, 11, 4, 279);
    			if (img2.src !== (img2_src_value = /*github*/ ctx[2])) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "github");
    			add_location(img2, file$1, 12, 4, 322);
    			if (img3.src !== (img3_src_value = /*gmail*/ ctx[3])) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "gmail");
    			add_location(img3, file$1, 13, 4, 361);
    			if (img4.src !== (img4_src_value = /*whatsaap*/ ctx[4])) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "whatsapp");
    			add_location(img4, file$1, 14, 4, 398);
    			attr_dev(div, "class", "svelte-1mwxn91");
    			add_location(div, file$1, 10, 2, 268);
    			attr_dev(footer, "id", "contact");
    			attr_dev(footer, "class", "svelte-1mwxn91");
    			add_location(footer, file$1, 8, 0, 206);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, img0);
    			append_dev(footer, t0);
    			append_dev(footer, div);
    			append_dev(div, img1);
    			append_dev(div, t1);
    			append_dev(div, img2);
    			append_dev(div, t2);
    			append_dev(div, img3);
    			append_dev(div, t3);
    			append_dev(div, img4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Contact", slots, []);

    	let logo = "images/logotipo.svg",
    		linkedin = "images/linkedin.svg",
    		github = "images/github.svg",
    		gmail = "images/gmail.svg",
    		whatsaap = "images/whatsapp.svg";

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ logo, linkedin, github, gmail, whatsaap });

    	$$self.$inject_state = $$props => {
    		if ("logo" in $$props) $$invalidate(0, logo = $$props.logo);
    		if ("linkedin" in $$props) $$invalidate(1, linkedin = $$props.linkedin);
    		if ("github" in $$props) $$invalidate(2, github = $$props.github);
    		if ("gmail" in $$props) $$invalidate(3, gmail = $$props.gmail);
    		if ("whatsaap" in $$props) $$invalidate(4, whatsaap = $$props.whatsaap);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [logo, linkedin, github, gmail, whatsaap];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\pages\Home.svelte generated by Svelte v3.38.3 */
    const file = "src\\pages\\Home.svelte";

    function create_fragment$1(ctx) {
    	let header;
    	let t0;
    	let section;
    	let div;
    	let h1;
    	let t2;
    	let h3;
    	let t4;
    	let a;
    	let todown;
    	let section_transition;
    	let t5;
    	let about;
    	let t6;
    	let skills;
    	let t7;
    	let proyects;
    	let t8;
    	let contact;
    	let current;
    	header = new Header({ $$inline: true });
    	todown = new ToDown({ $$inline: true });
    	about = new About({ $$inline: true });
    	skills = new Skills({ $$inline: true });
    	proyects = new Proyects({ $$inline: true });
    	contact = new Contact({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			section = element("section");
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Joel Gurumendi";
    			t2 = space();
    			h3 = element("h3");
    			h3.textContent = "Full Stack Developer";
    			t4 = space();
    			a = element("a");
    			create_component(todown.$$.fragment);
    			t5 = space();
    			create_component(about.$$.fragment);
    			t6 = space();
    			create_component(skills.$$.fragment);
    			t7 = space();
    			create_component(proyects.$$.fragment);
    			t8 = space();
    			create_component(contact.$$.fragment);
    			attr_dev(h1, "class", "svelte-12jy1ny");
    			add_location(h1, file, 14, 4, 477);
    			attr_dev(h3, "class", "svelte-12jy1ny");
    			add_location(h3, file, 15, 4, 506);
    			attr_dev(div, "class", "name-container svelte-12jy1ny");
    			add_location(div, file, 13, 2, 443);
    			attr_dev(a, "href", "#about");
    			attr_dev(a, "class", "to-down-container svelte-12jy1ny");
    			add_location(a, file, 17, 2, 549);
    			attr_dev(section, "id", "home");
    			attr_dev(section, "class", "svelte-12jy1ny");
    			add_location(section, file, 12, 0, 404);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section, anchor);
    			append_dev(section, div);
    			append_dev(div, h1);
    			append_dev(div, t2);
    			append_dev(div, h3);
    			append_dev(section, t4);
    			append_dev(section, a);
    			mount_component(todown, a, null);
    			insert_dev(target, t5, anchor);
    			mount_component(about, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(skills, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(proyects, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(contact, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(todown.$$.fragment, local);

    			add_render_callback(() => {
    				if (!section_transition) section_transition = create_bidirectional_transition(section, fade, {}, true);
    				section_transition.run(1);
    			});

    			transition_in(about.$$.fragment, local);
    			transition_in(skills.$$.fragment, local);
    			transition_in(proyects.$$.fragment, local);
    			transition_in(contact.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(todown.$$.fragment, local);
    			if (!section_transition) section_transition = create_bidirectional_transition(section, fade, {}, false);
    			section_transition.run(0);
    			transition_out(about.$$.fragment, local);
    			transition_out(skills.$$.fragment, local);
    			transition_out(proyects.$$.fragment, local);
    			transition_out(contact.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section);
    			destroy_component(todown);
    			if (detaching && section_transition) section_transition.end();
    			if (detaching) detach_dev(t5);
    			destroy_component(about, detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(skills, detaching);
    			if (detaching) detach_dev(t7);
    			destroy_component(proyects, detaching);
    			if (detaching) detach_dev(t8);
    			destroy_component(contact, detaching);
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
    	validate_slots("Home", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		fade,
    		Header,
    		ToDown,
    		About,
    		Skills,
    		Proyects,
    		Contact
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.3 */

    // (12:0) {:else}
    function create_else_block(ctx) {
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(12:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (10:0) {#if intro}
    function create_if_block(ctx) {
    	let intro_1;
    	let current;
    	intro_1 = new Intro({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(intro_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(intro_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(intro_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(intro_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(intro_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(10:0) {#if intro}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*intro*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	validate_slots("App", slots, []);
    	let intro = true;

    	setTimeout(
    		() => {
    			$$invalidate(0, intro = false);
    		},
    		7000
    	);

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Intro, Home, intro });

    	$$self.$inject_state = $$props => {
    		if ("intro" in $$props) $$invalidate(0, intro = $$props.intro);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [intro];
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
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
