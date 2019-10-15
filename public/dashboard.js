
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':5002/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
(function () {
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
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
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
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
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
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
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
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const organizations = writable(null);
    const current_organization = writable(null);

    const projects = writable(null);
    const current_project = writable(null);

    const channels = writable(null);
    const current_channel = writable(null);

    current_organization.subscribe(value => {
        if(value) {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', "https://test-api.clonedesk.com/api/v2/sidebar?organizationID=" + value, true);
            xhr.withCredentials = true;
            xhr.onload = function(event){
                if(event.currentTarget.status == 200){
                    let data = JSON.parse(event.target.responseText);
                    if(data && data.projects) {
                        projects.set(data.projects);
                    }
                    if(data && data.channels) {
                        channels.set(data.channels);
                    }
                }
            };
            xhr.send();
        }
    });


    let init_stores = () => {
        return new Promise((resolve, reject) => {

            let xhr = new XMLHttpRequest();
            xhr.open('GET', "https://test-api.clonedesk.com/api/v2/sidebar", true);
            xhr.withCredentials = true;
            xhr.onload = function(event){
                if(event.currentTarget.status == 200){
                    let data = JSON.parse(event.target.responseText);
                    if(data && data.organizations) {
                        organizations.set(data.organizations);
                        current_organization.set(data.organizations[0].id);
                        resolve("ok");
                    }
                } else {
                    reject(new Error("No data sent"));
                }
            };
            xhr.onerror = function(event){
                reject(new Error("Error making init"));
            };
            xhr.send();
        });
    };

    /* src/Organization.svelte generated by Svelte v3.12.1 */

    const file = "src/Organization.svelte";

    // (24:8) {#if parseInt(tasksOverall) > 0}
    function create_if_block(ctx) {
    	var span, t_value = parseInt(ctx.tasksOverall) > 0 ? ctx.tasksOverall : '' + "", t, span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", span_class_value = "badge " + (parseInt(ctx.tasksOverallNotViewed) == 0 ? 'badge-info' : 'badge-danger'));
    			add_location(span, file, 24, 12, 753);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tasksOverall) && t_value !== (t_value = parseInt(ctx.tasksOverall) > 0 ? ctx.tasksOverall : '' + "")) {
    				set_data_dev(t, t_value);
    			}

    			if ((changed.tasksOverallNotViewed) && span_class_value !== (span_class_value = "badge " + (parseInt(ctx.tasksOverallNotViewed) == 0 ? 'badge-info' : 'badge-danger'))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(24:8) {#if parseInt(tasksOverall) > 0}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var li, span0, a0, i, t0, a1, span1, t1, t2, show_if = parseInt(ctx.tasksOverall) > 0, li_class_value, dispose;

    	var if_block = (show_if) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			a0 = element("a");
    			i = element("i");
    			t0 = space();
    			a1 = element("a");
    			span1 = element("span");
    			t1 = text(ctx.name);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", "fa fa-pencil");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 18, 12, 513);
    			attr_dev(a0, "href", "/hendrik-test/edit-organisation/8");
    			attr_dev(a0, "class", "");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file, 17, 8, 431);
    			attr_dev(span0, "class", "edit-project-link ");
    			set_style(span0, "display", "none");
    			set_style(span0, "padding-left", "0px");
    			add_location(span0, file, 16, 4, 347);
    			attr_dev(span1, "class", "title");
    			add_location(span1, file, 22, 8, 666);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-link");
    			add_location(a1, file, 21, 4, 590);
    			attr_dev(li, "class", li_class_value = "nav-item show-edit-icon " + (ctx.$current_organization == ctx.id ? 'active' : ''));
    			add_location(li, file, 15, 0, 260);
    			dispose = listen_dev(a1, "click", prevent_default(ctx.set_current), false, true);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, a0);
    			append_dev(a0, i);
    			append_dev(li, t0);
    			append_dev(li, a1);
    			append_dev(a1, span1);
    			append_dev(span1, t1);
    			append_dev(a1, t2);
    			if (if_block) if_block.m(a1, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.name) {
    				set_data_dev(t1, ctx.name);
    			}

    			if (changed.tasksOverall) show_if = parseInt(ctx.tasksOverall) > 0;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(a1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((changed.$current_organization || changed.id) && li_class_value !== (li_class_value = "nav-item show-edit-icon " + (ctx.$current_organization == ctx.id ? 'active' : ''))) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $current_organization;

    	validate_store(current_organization, 'current_organization');
    	component_subscribe($$self, current_organization, $$value => { $current_organization = $$value; $$invalidate('$current_organization', $current_organization); });

    	let { name, id, tasksOverall, tasksOverallNotViewed } = $$props;

      let set_current = ()=> {
          current_organization.set(id);
      };

    	const writable_props = ['name', 'id', 'tasksOverall', 'tasksOverallNotViewed'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Organization> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('tasksOverall' in $$props) $$invalidate('tasksOverall', tasksOverall = $$props.tasksOverall);
    		if ('tasksOverallNotViewed' in $$props) $$invalidate('tasksOverallNotViewed', tasksOverallNotViewed = $$props.tasksOverallNotViewed);
    	};

    	$$self.$capture_state = () => {
    		return { name, id, tasksOverall, tasksOverallNotViewed, set_current, $current_organization };
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('tasksOverall' in $$props) $$invalidate('tasksOverall', tasksOverall = $$props.tasksOverall);
    		if ('tasksOverallNotViewed' in $$props) $$invalidate('tasksOverallNotViewed', tasksOverallNotViewed = $$props.tasksOverallNotViewed);
    		if ('set_current' in $$props) $$invalidate('set_current', set_current = $$props.set_current);
    		if ('$current_organization' in $$props) current_organization.set($current_organization);
    	};

    	return {
    		name,
    		id,
    		tasksOverall,
    		tasksOverallNotViewed,
    		set_current,
    		$current_organization
    	};
    }

    class Organization extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["name", "id", "tasksOverall", "tasksOverallNotViewed"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Organization", options, id: create_fragment.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<Organization> was created without expected prop 'name'");
    		}
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Organization> was created without expected prop 'id'");
    		}
    		if (ctx.tasksOverall === undefined && !('tasksOverall' in props)) {
    			console.warn("<Organization> was created without expected prop 'tasksOverall'");
    		}
    		if (ctx.tasksOverallNotViewed === undefined && !('tasksOverallNotViewed' in props)) {
    			console.warn("<Organization> was created without expected prop 'tasksOverallNotViewed'");
    		}
    	}

    	get name() {
    		throw new Error("<Organization>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Organization>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Organization>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Organization>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tasksOverall() {
    		throw new Error("<Organization>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasksOverall(value) {
    		throw new Error("<Organization>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tasksOverallNotViewed() {
    		throw new Error("<Organization>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasksOverallNotViewed(value) {
    		throw new Error("<Organization>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Organizations.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/Organizations.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.org = list[i];
    	return child_ctx;
    }

    // (12:0) {#if $organizations && $organizations.length > 0}
    function create_if_block$1(ctx) {
    	var a0, i0, t0, span0, t2, span1, a0_class_value, t3, ul, li, a1, i1, t4, span2, t6, current, dispose;

    	let each_value = ctx.$organizations;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			i0 = element("i");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "Organizations";
    			t2 = space();
    			span1 = element("span");
    			t3 = space();
    			ul = element("ul");
    			li = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t4 = space();
    			span2 = element("span");
    			span2.textContent = "Add Organization";
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(i0, "class", "fa fa-building-o");
    			add_location(i0, file$1, 13, 8, 353);
    			attr_dev(span0, "class", "title");
    			add_location(span0, file$1, 14, 8, 394);
    			attr_dev(span1, "class", "arrow open");
    			add_location(span1, file$1, 14, 49, 435);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", a0_class_value = "nav-toggle " + (ctx.nav_open ? 'open' : ''));
    			attr_dev(a0, "id", "sidebar-org");
    			add_location(a0, file$1, 12, 4, 216);
    			attr_dev(i1, "class", "fa fa-plus");
    			set_style(i1, "color", "#b4bcc8");
    			add_location(i1, file$1, 19, 16, 604);
    			attr_dev(span2, "class", "title");
    			add_location(span2, file$1, 20, 12, 667);
    			attr_dev(a1, "href", "/add-organisation");
    			set_style(a1, "font-weight", "bold");
    			add_location(a1, file$1, 18, 12, 532);
    			attr_dev(li, "class", "nav-item-add");
    			add_location(li, file$1, 17, 8, 494);
    			add_location(ul, file$1, 16, 4, 481);
    			dispose = listen_dev(a0, "click", prevent_default(ctx.click_handler), false, true);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			append_dev(a0, i0);
    			append_dev(a0, t0);
    			append_dev(a0, span0);
    			append_dev(a0, t2);
    			append_dev(a0, span1);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			append_dev(li, a1);
    			append_dev(a1, i1);
    			append_dev(a1, t4);
    			append_dev(a1, span2);
    			append_dev(ul, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.nav_open) && a0_class_value !== (a0_class_value = "nav-toggle " + (ctx.nav_open ? 'open' : ''))) {
    				attr_dev(a0, "class", a0_class_value);
    			}

    			if (changed.$organizations) {
    				each_value = ctx.$organizations;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a0);
    				detach_dev(t3);
    				detach_dev(ul);
    			}

    			destroy_each(each_blocks, detaching);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(12:0) {#if $organizations && $organizations.length > 0}", ctx });
    	return block;
    }

    // (24:8) {#each $organizations as org}
    function create_each_block(ctx) {
    	var current;

    	var organization = new Organization({
    		props: {
    		name: ctx.org.name,
    		tasksOverall: ctx.org.tasksOverall,
    		id: ctx.org.id,
    		tasksOverallNotViewed: ctx.org.tasksOverallNotViewed
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			organization.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(organization, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var organization_changes = {};
    			if (changed.$organizations) organization_changes.name = ctx.org.name;
    			if (changed.$organizations) organization_changes.tasksOverall = ctx.org.tasksOverall;
    			if (changed.$organizations) organization_changes.id = ctx.org.id;
    			if (changed.$organizations) organization_changes.tasksOverallNotViewed = ctx.org.tasksOverallNotViewed;
    			organization.$set(organization_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(organization.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(organization.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(organization, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(24:8) {#each $organizations as org}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$organizations && ctx.$organizations.length > 0) && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$organizations && ctx.$organizations.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
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
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $organizations;

    	validate_store(organizations, 'organizations');
    	component_subscribe($$self, organizations, $$value => { $organizations = $$value; $$invalidate('$organizations', $organizations); });

    	

      let nav_open = true;

    	const click_handler = () => $$invalidate('nav_open', nav_open = !nav_open);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('nav_open' in $$props) $$invalidate('nav_open', nav_open = $$props.nav_open);
    		if ('$organizations' in $$props) organizations.set($organizations);
    	};

    	return { nav_open, $organizations, click_handler };
    }

    class Organizations extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Organizations", options, id: create_fragment$1.name });
    	}
    }

    /* src/Project.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/Project.svelte";

    // (23:8) {#if parseInt(tasksOverall) > 0}
    function create_if_block$2(ctx) {
    	var span, t_value = parseInt(ctx.tasksOverall) > 0 ? ctx.tasksOverall : '' + "", t, span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", span_class_value = "badge " + (parseInt(ctx.tasksOverallNotViewed) == 0 ? 'badge-info' : 'badge-danger'));
    			add_location(span, file$2, 23, 12, 738);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tasksOverall) && t_value !== (t_value = parseInt(ctx.tasksOverall) > 0 ? ctx.tasksOverall : '' + "")) {
    				set_data_dev(t, t_value);
    			}

    			if ((changed.tasksOverallNotViewed) && span_class_value !== (span_class_value = "badge " + (parseInt(ctx.tasksOverallNotViewed) == 0 ? 'badge-info' : 'badge-danger'))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(23:8) {#if parseInt(tasksOverall) > 0}", ctx });
    	return block;
    }

    function create_fragment$2(ctx) {
    	var li, span0, a0, i, t0, a1, span1, t1, t2, show_if = parseInt(ctx.tasksOverall) > 0, li_class_value, dispose;

    	var if_block = (show_if) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			a0 = element("a");
    			i = element("i");
    			t0 = space();
    			a1 = element("a");
    			span1 = element("span");
    			t1 = text(ctx.name);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", "fa fa-pencil");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$2, 17, 12, 498);
    			attr_dev(a0, "href", "/hendrik-test/edit-organisation/8");
    			attr_dev(a0, "class", "");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$2, 16, 8, 416);
    			attr_dev(span0, "class", "edit-project-link ");
    			set_style(span0, "display", "none");
    			set_style(span0, "padding-left", "0px");
    			add_location(span0, file$2, 15, 4, 332);
    			attr_dev(span1, "class", "title");
    			add_location(span1, file$2, 21, 8, 651);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-link");
    			add_location(a1, file$2, 20, 4, 575);
    			attr_dev(li, "class", li_class_value = "nav-item show-edit-icon  " + (ctx.$current_project == ctx.id ? 'active' : ''));
    			add_location(li, file$2, 14, 0, 249);
    			dispose = listen_dev(a1, "click", prevent_default(ctx.set_current), false, true);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, a0);
    			append_dev(a0, i);
    			append_dev(li, t0);
    			append_dev(li, a1);
    			append_dev(a1, span1);
    			append_dev(span1, t1);
    			append_dev(a1, t2);
    			if (if_block) if_block.m(a1, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.name) {
    				set_data_dev(t1, ctx.name);
    			}

    			if (changed.tasksOverall) show_if = parseInt(ctx.tasksOverall) > 0;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(a1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((changed.$current_project || changed.id) && li_class_value !== (li_class_value = "nav-item show-edit-icon  " + (ctx.$current_project == ctx.id ? 'active' : ''))) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $current_project;

    	validate_store(current_project, 'current_project');
    	component_subscribe($$self, current_project, $$value => { $current_project = $$value; $$invalidate('$current_project', $current_project); });

    	let { name, id, tasksOverall, tasksOverallNotViewed } = $$props;
      let set_current = ()=> {
          current_project.set(id);
      };

    	const writable_props = ['name', 'id', 'tasksOverall', 'tasksOverallNotViewed'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Project> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('tasksOverall' in $$props) $$invalidate('tasksOverall', tasksOverall = $$props.tasksOverall);
    		if ('tasksOverallNotViewed' in $$props) $$invalidate('tasksOverallNotViewed', tasksOverallNotViewed = $$props.tasksOverallNotViewed);
    	};

    	$$self.$capture_state = () => {
    		return { name, id, tasksOverall, tasksOverallNotViewed, set_current, $current_project };
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('tasksOverall' in $$props) $$invalidate('tasksOverall', tasksOverall = $$props.tasksOverall);
    		if ('tasksOverallNotViewed' in $$props) $$invalidate('tasksOverallNotViewed', tasksOverallNotViewed = $$props.tasksOverallNotViewed);
    		if ('set_current' in $$props) $$invalidate('set_current', set_current = $$props.set_current);
    		if ('$current_project' in $$props) current_project.set($current_project);
    	};

    	return {
    		name,
    		id,
    		tasksOverall,
    		tasksOverallNotViewed,
    		set_current,
    		$current_project
    	};
    }

    class Project extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["name", "id", "tasksOverall", "tasksOverallNotViewed"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Project", options, id: create_fragment$2.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<Project> was created without expected prop 'name'");
    		}
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Project> was created without expected prop 'id'");
    		}
    		if (ctx.tasksOverall === undefined && !('tasksOverall' in props)) {
    			console.warn("<Project> was created without expected prop 'tasksOverall'");
    		}
    		if (ctx.tasksOverallNotViewed === undefined && !('tasksOverallNotViewed' in props)) {
    			console.warn("<Project> was created without expected prop 'tasksOverallNotViewed'");
    		}
    	}

    	get name() {
    		throw new Error("<Project>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Project>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Project>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Project>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tasksOverall() {
    		throw new Error("<Project>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasksOverall(value) {
    		throw new Error("<Project>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tasksOverallNotViewed() {
    		throw new Error("<Project>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasksOverallNotViewed(value) {
    		throw new Error("<Project>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Projects.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/Projects.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.pr = list[i];
    	return child_ctx;
    }

    // (11:0) {#if $projects && $projects.length > 0}
    function create_if_block$3(ctx) {
    	var a0, i0, t0, span0, t2, span1, a0_class_value, t3, ul, li, a1, i1, t4, span2, t6, current, dispose;

    	let each_value = ctx.$projects;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			i0 = element("i");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "Projects";
    			t2 = space();
    			span1 = element("span");
    			t3 = space();
    			ul = element("ul");
    			li = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t4 = space();
    			span2 = element("span");
    			span2.textContent = "Add Project";
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(i0, "class", "fa fa-lightbulb-o");
    			add_location(i0, file$3, 12, 8, 327);
    			attr_dev(span0, "class", "title");
    			add_location(span0, file$3, 13, 8, 369);
    			attr_dev(span1, "class", "arrow open");
    			add_location(span1, file$3, 13, 44, 405);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", a0_class_value = "nav-toggle " + (ctx.nav_open ? 'open' : ''));
    			attr_dev(a0, "id", "sidebar-org");
    			add_location(a0, file$3, 11, 4, 190);
    			attr_dev(i1, "class", "fa fa-plus");
    			set_style(i1, "color", "#b4bcc8");
    			add_location(i1, file$3, 18, 16, 569);
    			attr_dev(span2, "class", "title");
    			add_location(span2, file$3, 19, 12, 632);
    			attr_dev(a1, "href", "/add-project");
    			set_style(a1, "font-weight", "bold");
    			add_location(a1, file$3, 17, 12, 502);
    			attr_dev(li, "class", "nav-item-add");
    			add_location(li, file$3, 16, 8, 464);
    			add_location(ul, file$3, 15, 4, 451);
    			dispose = listen_dev(a0, "click", prevent_default(ctx.click_handler), false, true);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			append_dev(a0, i0);
    			append_dev(a0, t0);
    			append_dev(a0, span0);
    			append_dev(a0, t2);
    			append_dev(a0, span1);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			append_dev(li, a1);
    			append_dev(a1, i1);
    			append_dev(a1, t4);
    			append_dev(a1, span2);
    			append_dev(ul, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.nav_open) && a0_class_value !== (a0_class_value = "nav-toggle " + (ctx.nav_open ? 'open' : ''))) {
    				attr_dev(a0, "class", a0_class_value);
    			}

    			if (changed.$projects) {
    				each_value = ctx.$projects;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a0);
    				detach_dev(t3);
    				detach_dev(ul);
    			}

    			destroy_each(each_blocks, detaching);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(11:0) {#if $projects && $projects.length > 0}", ctx });
    	return block;
    }

    // (23:8) {#each $projects as pr}
    function create_each_block$1(ctx) {
    	var current;

    	var project = new Project({
    		props: {
    		name: "@" + ctx.pr.name,
    		tasksOverall: ctx.pr.tasksOverall,
    		id: ctx.pr.id,
    		tasksOverallNotViewed: ctx.pr.tasksOverallNotViewed
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			project.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(project, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var project_changes = {};
    			if (changed.$projects) project_changes.name = "@" + ctx.pr.name;
    			if (changed.$projects) project_changes.tasksOverall = ctx.pr.tasksOverall;
    			if (changed.$projects) project_changes.id = ctx.pr.id;
    			if (changed.$projects) project_changes.tasksOverallNotViewed = ctx.pr.tasksOverallNotViewed;
    			project.$set(project_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(project.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(project.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(project, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(23:8) {#each $projects as pr}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$projects && ctx.$projects.length > 0) && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$projects && ctx.$projects.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
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
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $projects;

    	validate_store(projects, 'projects');
    	component_subscribe($$self, projects, $$value => { $projects = $$value; $$invalidate('$projects', $projects); });

    	

      let nav_open = true;

    	const click_handler = () => $$invalidate('nav_open', nav_open = !nav_open);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('nav_open' in $$props) $$invalidate('nav_open', nav_open = $$props.nav_open);
    		if ('$projects' in $$props) projects.set($projects);
    	};

    	return { nav_open, $projects, click_handler };
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Projects", options, id: create_fragment$3.name });
    	}
    }

    /* src/Channel.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/Channel.svelte";

    // (24:8) {#if parseInt(tasksOverall) > 0}
    function create_if_block$4(ctx) {
    	var span, t_value = parseInt(ctx.tasksOverall) > 0 ? ctx.tasksOverall : '' + "", t, span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", span_class_value = "badge " + (parseInt(ctx.tasksOverallNotViewed) == 0 ? 'badge-info' : 'badge-danger'));
    			add_location(span, file$4, 24, 12, 738);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tasksOverall) && t_value !== (t_value = parseInt(ctx.tasksOverall) > 0 ? ctx.tasksOverall : '' + "")) {
    				set_data_dev(t, t_value);
    			}

    			if ((changed.tasksOverallNotViewed) && span_class_value !== (span_class_value = "badge " + (parseInt(ctx.tasksOverallNotViewed) == 0 ? 'badge-info' : 'badge-danger'))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$4.name, type: "if", source: "(24:8) {#if parseInt(tasksOverall) > 0}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var li, span0, a0, i, t0, a1, span1, t1, t2, show_if = parseInt(ctx.tasksOverall) > 0, li_class_value, dispose;

    	var if_block = (show_if) && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			a0 = element("a");
    			i = element("i");
    			t0 = space();
    			a1 = element("a");
    			span1 = element("span");
    			t1 = text(ctx.name);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", "fa fa-pencil");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$4, 18, 12, 498);
    			attr_dev(a0, "href", "/hendrik-test/edit-organisation/8");
    			attr_dev(a0, "class", "");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$4, 17, 8, 416);
    			attr_dev(span0, "class", "edit-project-link ");
    			set_style(span0, "display", "none");
    			set_style(span0, "padding-left", "0px");
    			add_location(span0, file$4, 16, 4, 332);
    			attr_dev(span1, "class", "title");
    			add_location(span1, file$4, 22, 8, 651);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-link");
    			add_location(a1, file$4, 21, 4, 575);
    			attr_dev(li, "class", li_class_value = "nav-item show-edit-icon " + (ctx.$current_channel == ctx.id ? 'active' : ''));
    			add_location(li, file$4, 15, 0, 250);
    			dispose = listen_dev(a1, "click", prevent_default(ctx.set_current), false, true);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, a0);
    			append_dev(a0, i);
    			append_dev(li, t0);
    			append_dev(li, a1);
    			append_dev(a1, span1);
    			append_dev(span1, t1);
    			append_dev(a1, t2);
    			if (if_block) if_block.m(a1, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.name) {
    				set_data_dev(t1, ctx.name);
    			}

    			if (changed.tasksOverall) show_if = parseInt(ctx.tasksOverall) > 0;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(a1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((changed.$current_channel || changed.id) && li_class_value !== (li_class_value = "nav-item show-edit-icon " + (ctx.$current_channel == ctx.id ? 'active' : ''))) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $current_channel;

    	validate_store(current_channel, 'current_channel');
    	component_subscribe($$self, current_channel, $$value => { $current_channel = $$value; $$invalidate('$current_channel', $current_channel); });

    	let { name, id, tasksOverall, tasksOverallNotViewed } = $$props;

      let set_current = ()=> {
          current_channel.set(id);
      };

    	const writable_props = ['name', 'id', 'tasksOverall', 'tasksOverallNotViewed'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Channel> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('tasksOverall' in $$props) $$invalidate('tasksOverall', tasksOverall = $$props.tasksOverall);
    		if ('tasksOverallNotViewed' in $$props) $$invalidate('tasksOverallNotViewed', tasksOverallNotViewed = $$props.tasksOverallNotViewed);
    	};

    	$$self.$capture_state = () => {
    		return { name, id, tasksOverall, tasksOverallNotViewed, set_current, $current_channel };
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('tasksOverall' in $$props) $$invalidate('tasksOverall', tasksOverall = $$props.tasksOverall);
    		if ('tasksOverallNotViewed' in $$props) $$invalidate('tasksOverallNotViewed', tasksOverallNotViewed = $$props.tasksOverallNotViewed);
    		if ('set_current' in $$props) $$invalidate('set_current', set_current = $$props.set_current);
    		if ('$current_channel' in $$props) current_channel.set($current_channel);
    	};

    	return {
    		name,
    		id,
    		tasksOverall,
    		tasksOverallNotViewed,
    		set_current,
    		$current_channel
    	};
    }

    class Channel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, ["name", "id", "tasksOverall", "tasksOverallNotViewed"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Channel", options, id: create_fragment$4.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<Channel> was created without expected prop 'name'");
    		}
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Channel> was created without expected prop 'id'");
    		}
    		if (ctx.tasksOverall === undefined && !('tasksOverall' in props)) {
    			console.warn("<Channel> was created without expected prop 'tasksOverall'");
    		}
    		if (ctx.tasksOverallNotViewed === undefined && !('tasksOverallNotViewed' in props)) {
    			console.warn("<Channel> was created without expected prop 'tasksOverallNotViewed'");
    		}
    	}

    	get name() {
    		throw new Error("<Channel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Channel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Channel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Channel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tasksOverall() {
    		throw new Error("<Channel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasksOverall(value) {
    		throw new Error("<Channel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tasksOverallNotViewed() {
    		throw new Error("<Channel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasksOverallNotViewed(value) {
    		throw new Error("<Channel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Channels.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/Channels.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.ch = list[i];
    	return child_ctx;
    }

    // (11:0) {#if $channels && $channels.length > 0}
    function create_if_block$5(ctx) {
    	var a0, i0, t0, span0, t2, span1, a0_class_value, t3, ul, li, a1, i1, t4, span2, t6, current, dispose;

    	let each_value = ctx.$channels;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			i0 = element("i");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "Channels";
    			t2 = space();
    			span1 = element("span");
    			t3 = space();
    			ul = element("ul");
    			li = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t4 = space();
    			span2 = element("span");
    			span2.textContent = "Add Channel";
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(i0, "class", "fa fas fa-bomb");
    			add_location(i0, file$5, 12, 8, 327);
    			attr_dev(span0, "class", "title");
    			add_location(span0, file$5, 13, 8, 366);
    			attr_dev(span1, "class", "arrow open");
    			add_location(span1, file$5, 13, 44, 402);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", a0_class_value = "nav-toggle " + (ctx.nav_open ? 'open' : ''));
    			attr_dev(a0, "id", "sidebar-org");
    			add_location(a0, file$5, 11, 4, 190);
    			attr_dev(i1, "class", "fa fa-plus");
    			set_style(i1, "color", "#b4bcc8");
    			add_location(i1, file$5, 18, 16, 566);
    			attr_dev(span2, "class", "title");
    			add_location(span2, file$5, 19, 12, 629);
    			attr_dev(a1, "href", "/add-channel");
    			set_style(a1, "font-weight", "bold");
    			add_location(a1, file$5, 17, 12, 499);
    			attr_dev(li, "class", "nav-item-add");
    			add_location(li, file$5, 16, 8, 461);
    			add_location(ul, file$5, 15, 4, 448);
    			dispose = listen_dev(a0, "click", prevent_default(ctx.click_handler), false, true);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			append_dev(a0, i0);
    			append_dev(a0, t0);
    			append_dev(a0, span0);
    			append_dev(a0, t2);
    			append_dev(a0, span1);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			append_dev(li, a1);
    			append_dev(a1, i1);
    			append_dev(a1, t4);
    			append_dev(a1, span2);
    			append_dev(ul, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.nav_open) && a0_class_value !== (a0_class_value = "nav-toggle " + (ctx.nav_open ? 'open' : ''))) {
    				attr_dev(a0, "class", a0_class_value);
    			}

    			if (changed.$channels) {
    				each_value = ctx.$channels;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a0);
    				detach_dev(t3);
    				detach_dev(ul);
    			}

    			destroy_each(each_blocks, detaching);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$5.name, type: "if", source: "(11:0) {#if $channels && $channels.length > 0}", ctx });
    	return block;
    }

    // (23:8) {#each $channels as ch}
    function create_each_block$2(ctx) {
    	var current;

    	var channel = new Channel({
    		props: {
    		name: "#" + ctx.ch.name,
    		tasksOverall: ctx.ch.tasksOverall,
    		id: ctx.ch.id,
    		tasksOverallNotViewed: ctx.ch.tasksOverallNotViewed
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			channel.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(channel, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var channel_changes = {};
    			if (changed.$channels) channel_changes.name = "#" + ctx.ch.name;
    			if (changed.$channels) channel_changes.tasksOverall = ctx.ch.tasksOverall;
    			if (changed.$channels) channel_changes.id = ctx.ch.id;
    			if (changed.$channels) channel_changes.tasksOverallNotViewed = ctx.ch.tasksOverallNotViewed;
    			channel.$set(channel_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(channel.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(channel.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(channel, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(23:8) {#each $channels as ch}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$channels && ctx.$channels.length > 0) && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$channels && ctx.$channels.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
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
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $channels;

    	validate_store(channels, 'channels');
    	component_subscribe($$self, channels, $$value => { $channels = $$value; $$invalidate('$channels', $channels); });

    	

      let nav_open = true;

    	const click_handler = () => $$invalidate('nav_open', nav_open = !nav_open);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('nav_open' in $$props) $$invalidate('nav_open', nav_open = $$props.nav_open);
    		if ('$channels' in $$props) channels.set($channels);
    	};

    	return { nav_open, $channels, click_handler };
    }

    class Channels extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Channels", options, id: create_fragment$5.name });
    	}
    }

    init_stores().catch((_err) => {
        window.location.replace("/");
    });

    new Organizations({
        target: document.querySelector("nav .organizations"),
        props: { }
    });
    new Projects({
        target: document.querySelector("nav .projects"),
        props: { }
    });
    new Channels({
        target: document.querySelector("nav .channels"),
        props: { }
    });

}());
//# sourceMappingURL=dashboard.js.map
