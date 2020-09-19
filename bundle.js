
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
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
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
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
        $capture_state() { }
        $inject_state() { }
    }

    const {
      createLibrary,
      createMatrixPreviewAggregator,
      createMatrixCoverAggregator,
      createRepresentativeAggregator,
      createDbscan,
      createKmeans,
      createImageRenderer,
      createMatrixRenderer,
      createRepresentativeRenderer,
      createSvgRenderer,
    } = window.pilingJs;

    const createPilingJs = createLibrary;

    const create = async (element) =>
      createPilingJs(element, {
        renderer: createImageRenderer(),
        // prettier-ignore
        items: [
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000253413.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000533739.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000314530.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000418512.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000454273.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000219654.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000558596.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000392493.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000115639.jpg' },
          { src: 'https://storage.googleapis.com/pilingjs/coco-cars/000000228398.jpg' },
        ],
        darkMode: true,
      });

    /* src/App.svelte generated by Svelte v3.23.2 */
    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-jlq7a9-style";
    	style.textContent = ".header.svelte-jlq7a9.svelte-jlq7a9{position:absolute;top:0;left:0;right:0;height:6rem;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-size:2rem}.header.svelte-jlq7a9 a.svelte-jlq7a9{color:white;text-decoration:none;box-shadow:inset 0 -2px 0 0 #808080;transition:0.2s all ease}.header.svelte-jlq7a9 a.svelte-jlq7a9:hover{color:#ff7ff6;box-shadow:inset 0 -10px 0 0 #ff7ff6}.pilingjs-wrapper.svelte-jlq7a9.svelte-jlq7a9{position:absolute;top:6rem;left:0;right:0;bottom:0;border-top:1px solid #808080}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICBpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcbiAgaW1wb3J0IGNyZWF0ZVBpbGluZyBmcm9tICcuL3BpbGluZy1leGFtcGxlLmpzJ1xuXG4gIGxldCB3cmFwcGVyO1xuXG4gIG9uTW91bnQoKCkgPT4ge1xuICAgIGNyZWF0ZVBpbGluZyh3cmFwcGVyKTtcbiAgfSk7XG48L3NjcmlwdD5cblxuPHN0eWxlPlxuICAuaGVhZGVyIHtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgdG9wOiAwO1xuICAgIGxlZnQ6IDA7XG4gICAgcmlnaHQ6IDA7XG4gICAgaGVpZ2h0OiA2cmVtO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICBmb250LXNpemU6IDJyZW07XG4gIH1cblxuICAuaGVhZGVyIGEge1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgYm94LXNoYWRvdzogaW5zZXQgMCAtMnB4IDAgMCAjODA4MDgwO1xuICAgIHRyYW5zaXRpb246IDAuMnMgYWxsIGVhc2U7XG4gIH1cblxuICAuaGVhZGVyIGE6aG92ZXIge1xuICAgIGNvbG9yOiAjZmY3ZmY2O1xuICAgIGJveC1zaGFkb3c6IGluc2V0IDAgLTEwcHggMCAwICNmZjdmZjY7XG4gIH1cblxuICAucGlsaW5nanMtd3JhcHBlciB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogNnJlbTtcbiAgICBsZWZ0OiAwO1xuICAgIHJpZ2h0OiAwO1xuICAgIGJvdHRvbTogMDtcbiAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzgwODA4MDtcbiAgfVxuPC9zdHlsZT5cblxuPGhlYWRlciBjbGFzcz1cImhlYWRlclwiPlxuICA8cD5cbiAgICBBIHNpbXBsZSBleGFtcGxlIGRlbW9uc3RyYXRpbmcgaG93IHRvIHVzZXsnICd9XG4gICAgPGFcbiAgICAgIGNsYXNzPVwiQXBwLWxpbmtcIlxuICAgICAgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9mbGVrc2NoYXMvcGlsaW5nLmpzXCJcbiAgICAgIHRhcmdldD1cIl9ibGFua1wiXG4gICAgICByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCJcbiAgICA+XG4gICAgICBQaWxpbmcuanNcbiAgICA8L2E+eycgJ31cbiAgICBpbiBhIFN2ZWx0ZSBhcHAuXG4gIDwvcD5cbjwvaGVhZGVyPlxuPG1haW4gYmluZDp0aGlzPXt3cmFwcGVyfSBjbGFzcz1cInBpbGluZ2pzLXdyYXBwZXJcIiAvPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVlFLE9BQU8sNEJBQUMsQ0FBQyxBQUNQLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEdBQUcsQ0FBRSxDQUFDLENBQ04sSUFBSSxDQUFFLENBQUMsQ0FDUCxLQUFLLENBQUUsQ0FBQyxDQUNSLE1BQU0sQ0FBRSxJQUFJLENBQ1osT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsTUFBTSxDQUN0QixXQUFXLENBQUUsTUFBTSxDQUNuQixlQUFlLENBQUUsTUFBTSxDQUN2QixLQUFLLENBQUUsS0FBSyxDQUNaLFNBQVMsQ0FBRSxJQUFJLEFBQ2pCLENBQUMsQUFFRCxxQkFBTyxDQUFDLENBQUMsY0FBQyxDQUFDLEFBQ1QsS0FBSyxDQUFFLEtBQUssQ0FDWixlQUFlLENBQUUsSUFBSSxDQUNyQixVQUFVLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQ3BDLFVBQVUsQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQUFDM0IsQ0FBQyxBQUVELHFCQUFPLENBQUMsZUFBQyxNQUFNLEFBQUMsQ0FBQyxBQUNmLEtBQUssQ0FBRSxPQUFPLENBQ2QsVUFBVSxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxBQUN2QyxDQUFDLEFBRUQsaUJBQWlCLDRCQUFDLENBQUMsQUFDakIsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsR0FBRyxDQUFFLElBQUksQ0FDVCxJQUFJLENBQUUsQ0FBQyxDQUNQLEtBQUssQ0FBRSxDQUFDLENBQ1IsTUFBTSxDQUFFLENBQUMsQ0FDVCxVQUFVLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEFBQy9CLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function create_fragment(ctx) {
    	let header;
    	let p;
    	let t0;
    	let t1_value = " " + "";
    	let t1;
    	let t2;
    	let a;
    	let t4_value = " " + "";
    	let t4;
    	let t5;
    	let t6;
    	let main;

    	const block = {
    		c: function create() {
    			header = element("header");
    			p = element("p");
    			t0 = text("A simple example demonstrating how to use");
    			t1 = text(t1_value);
    			t2 = space();
    			a = element("a");
    			a.textContent = "Piling.js\n    ";
    			t4 = text(t4_value);
    			t5 = text("\n    in a Svelte app.");
    			t6 = space();
    			main = element("main");
    			attr_dev(a, "class", "App-link svelte-jlq7a9");
    			attr_dev(a, "href", "https://github.com/flekschas/piling.js");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener noreferrer");
    			add_location(a, file, 51, 4, 881);
    			add_location(p, file, 49, 2, 822);
    			attr_dev(header, "class", "header svelte-jlq7a9");
    			add_location(header, file, 48, 0, 796);
    			attr_dev(main, "class", "pilingjs-wrapper svelte-jlq7a9");
    			add_location(main, file, 62, 0, 1087);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, a);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, main, anchor);
    			/*main_binding*/ ctx[1](main);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(main);
    			/*main_binding*/ ctx[1](null);
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
    	let wrapper;

    	onMount(() => {
    		create(wrapper);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function main_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wrapper = $$value;
    			$$invalidate(0, wrapper);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, createPiling: create, wrapper });

    	$$self.$inject_state = $$props => {
    		if ("wrapper" in $$props) $$invalidate(0, wrapper = $$props.wrapper);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [wrapper, main_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-jlq7a9-style")) add_css();
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
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
