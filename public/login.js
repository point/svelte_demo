
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':5001/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
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

    /* src/Login.svelte generated by Svelte v3.12.1 */

    const file = "src/Login.svelte";

    // (187:12) {#if email_error_shown}
    function create_if_block_2(ctx) {
    	var span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Field should be in proper format";
    			attr_dev(span, "class", "error svelte-64b0nq");
    			add_location(span, file, 187, 16, 5186);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(187:12) {#if email_error_shown}", ctx });
    	return block;
    }

    // (194:12) {#if password_error_shown}
    function create_if_block_1(ctx) {
    	var span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Password is required";
    			attr_dev(span, "class", "error svelte-64b0nq");
    			add_location(span, file, 194, 16, 5665);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(194:12) {#if password_error_shown}", ctx });
    	return block;
    }

    // (197:12) {#if wrong_password_error_shown}
    function create_if_block(ctx) {
    	var span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Wrong email or password";
    			attr_dev(span, "class", "error svelte-64b0nq");
    			add_location(span, file, 197, 16, 5792);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(197:12) {#if wrong_password_error_shown}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var form, h3, t1, div0, input0, t2, t3, div1, input1, t4, t5, t6, div2, button, t8, label, input2, t9, span, t10, a, dispose;

    	var if_block0 = (ctx.email_error_shown) && create_if_block_2(ctx);

    	var if_block1 = (ctx.password_error_shown) && create_if_block_1(ctx);

    	var if_block2 = (ctx.wrong_password_error_shown) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			h3 = element("h3");
    			h3.textContent = "Sign In";
    			t1 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Login";
    			t8 = space();
    			label = element("label");
    			input2 = element("input");
    			t9 = text("Remember");
    			span = element("span");
    			t10 = space();
    			a = element("a");
    			a.textContent = "Forgot Password?";
    			attr_dev(h3, "class", " svelte-64b0nq");
    			add_location(h3, file, 183, 2, 4853);
    			attr_dev(input0, "class", "email svelte-64b0nq");
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "placeholder", "E-mail");
    			attr_dev(input0, "name", "loginForm[email]");
    			input0.required = "required";
    			input0.value = "";
    			attr_dev(input0, "tabindex", "1");
    			attr_dev(input0, "aria-required", "true");
    			attr_dev(input0, "aria-invalid", "true");
    			attr_dev(input0, "aria-describedby", "loginForm\\[email\\]-error");
    			add_location(input0, file, 185, 12, 4927);
    			attr_dev(div0, "class", "field-wrapper svelte-64b0nq");
    			add_location(div0, file, 184, 8, 4887);
    			attr_dev(input1, "class", "password svelte-64b0nq");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "autocomplete", "off");
    			attr_dev(input1, "placeholder", "Password");
    			attr_dev(input1, "name", "loginForm[password]");
    			input1.required = "required";
    			input1.value = "";
    			attr_dev(input1, "tabindex", "2");
    			attr_dev(input1, "aria-required", "true");
    			attr_dev(input1, "aria-invalid", "false");
    			attr_dev(input1, "aria-describedby", "loginForm\\[password\\]-error");
    			add_location(input1, file, 192, 12, 5369);
    			attr_dev(div1, "class", "field-wrapper svelte-64b0nq");
    			add_location(div1, file, 191, 8, 5329);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn green uppercase svelte-64b0nq");
    			attr_dev(button, "tabindex", "4");
    			add_location(button, file, 202, 3, 5909);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "name", "loginForm[remember]");
    			input2.value = "1";
    			attr_dev(input2, "class", "svelte-64b0nq");
    			add_location(input2, file, 204, 4, 6022);
    			attr_dev(span, "tabindex", "3");
    			attr_dev(span, "class", "svelte-64b0nq");
    			add_location(span, file, 204, 72, 6090);
    			attr_dev(label, "class", "rememberme  svelte-64b0nq");
    			add_location(label, file, 203, 3, 5990);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "id", "forget-password");
    			attr_dev(a, "class", "forget-password svelte-64b0nq");
    			add_location(a, file, 206, 3, 6132);
    			attr_dev(div2, "class", "form-actions svelte-64b0nq");
    			add_location(div2, file, 201, 2, 5879);
    			attr_dev(form, "name", "loginForm");
    			attr_dev(form, "class", "login-form svelte-64b0nq");
    			attr_dev(form, "action", "/login");
    			attr_dev(form, "method", "post");
    			attr_dev(form, "autocomplete", "off");
    			form.noValidate = "novalidate";
    			add_location(form, file, 182, 0, 4693);
    			dispose = listen_dev(form, "submit", prevent_default(ctx.submit_handler), false, true);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, h3);
    			append_dev(form, t1);
    			append_dev(form, div0);
    			append_dev(div0, input0);
    			append_dev(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(form, t3);
    			append_dev(form, div1);
    			append_dev(div1, input1);
    			append_dev(div1, t4);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t5);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(form, t6);
    			append_dev(form, div2);
    			append_dev(div2, button);
    			append_dev(div2, t8);
    			append_dev(div2, label);
    			append_dev(label, input2);
    			append_dev(label, t9);
    			append_dev(label, span);
    			append_dev(div2, t10);
    			append_dev(div2, a);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.email_error_shown) {
    				if (!if_block0) {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.password_error_shown) {
    				if (!if_block1) {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div1, t5);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (ctx.wrong_password_error_shown) {
    				if (!if_block2) {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(form);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let email_error_shown = false;
        let password_error_shown = false;
        let wrong_password_error_shown = false;

        async function submit_handler(event) {
            $$invalidate('email_error_shown', email_error_shown = false);
            $$invalidate('password_error_shown', password_error_shown = false);
            $$invalidate('wrong_password_error_shown', wrong_password_error_shown = false);

            let email = document.querySelector("input.email");
            let password = document.querySelector("input.password");

            if(!email || !password) { return; }

            // check validation
            if(!event.target.checkValidity()) {
                if(!email.checkValidity()) {
                    $$invalidate('email_error_shown', email_error_shown = true);
                } else if(!password.checkValidity()){
                    $$invalidate('password_error_shown', password_error_shown = true);
                }
            } else {
              // check email and password
              
              let form_data = new FormData();
              form_data.append("email", email.value);
              form_data.append("password", password.value);

              let url = "https://test-api.clonedesk.com/api/v2/current-user/login-session";
              let xhr = new XMLHttpRequest();
              xhr.open('POST', url, true);
              /*xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");*/
              xhr.onload = function(event){
                  if(event.currentTarget.status == 200){
                      let result = JSON.parse(event.target.responseText);
                      if(!result || !result.success) {
                          $$invalidate('wrong_password_error_shown', wrong_password_error_shown = true);
                      } else {
                        window.location.replace("/dashboard");
                      }
                    } else {
                        $$invalidate('wrong_password_error_shown', wrong_password_error_shown = true);
                    }
              };
              xhr.send(form_data);
            }
        }

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('email_error_shown' in $$props) $$invalidate('email_error_shown', email_error_shown = $$props.email_error_shown);
    		if ('password_error_shown' in $$props) $$invalidate('password_error_shown', password_error_shown = $$props.password_error_shown);
    		if ('wrong_password_error_shown' in $$props) $$invalidate('wrong_password_error_shown', wrong_password_error_shown = $$props.wrong_password_error_shown);
    	};

    	return {
    		email_error_shown,
    		password_error_shown,
    		wrong_password_error_shown,
    		submit_handler
    	};
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Login", options, id: create_fragment.name });
    	}
    }

    const app = new Login({
    	target: document.getElementById("content"),
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=login.js.map
