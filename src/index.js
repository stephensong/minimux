/*
 * Minimux %VERSION%
 * Author: Steven Barnett (stevendesu) <steven.abarnett@gmail.com>
 * License: MIT +no-false-attribs (https://spdx.org/licenses/MITNFA.html)
 *
 * I made this library because I liked the ideology of Redux, but not the
 * implementation. This is my attempt to rebuild Redux with absolute minimal
 * functionality and to allow for absolute minimal bootstrapping in order to
 * write effective code.
 *
 * There are four main API endpoints:
 *  - dispatch(action, [data])
 *     This is the only valid way to modify the state
 *  - on(actions, reducer)
 *     When an action is thrown, apply the reducers
 *  - bind(callback)
 *     Callback will be called with the current state whenever state changes
 *  - apply(middleware, [priority])
 *     Applies middleware to the dispatch function (see documentation)
 *
 * Considerations:
 *  - Should it be possible to connect to a subset of the state? If you could
 *    bind reducers to subsets of state then it would be more modular
 */

const reducers = {};
const callbacks = [];
const middleware = [];

let state = {};
const mutableState = {};

// The "onion" describes the layers of middleware that we must parse through
// in order to execute our action.
let callbackOnion = null;

const coreFunction = (action) => {
	if (reducers[action.type]) {
		reducers[action.type].forEach((el) => {
			state = el(state, action);
			// This is a temporary (and hideous) hack to maintain backwards compatibility until I'm happy enough with
			// the API to release v2.0.0
			// Previously you could "import { state } from 'minimux'" and it was properly updated
			// This was poor practice because it allowed anyone to edit the state without using actions
			// A getState() function has been added to return only the most recent immutable state
			Object.keys(mutableState).forEach((key) => {
				delete mutableState[key];
			});
			Object.keys(state).forEach((key) => {
				mutableState[key] = state[key];
			});
		});
	}
	return state;
};

const dispatch = (action, rerender = true) => {
	if (process.env.NODE_ENV !== "production") {
		if (typeof action !== "object") {
			throw "Invalid type (" + (typeof action) + ") for argument \"action\" passed to dispatch. Expected " +
			      "object or array of objects.";
		}
		if (Array.isArray(action)) {
			action.forEach((el, idx) => {
				if (typeof el !== "object" || Array.isArray(el)) {
					throw "Invalid type (" + (typeof el) + ") for action at index " + idx + " passed to dispatch. " +
					      "Expected object.";
				}
				if (!el.hasOwnProperty("type")) {
					throw "Action at index " + idx + " passed to dispatch was missing required property: \"type\"";
				}
			});
		} else if (!action.hasOwnProperty("type")) {
			throw "Action passed to dispatch was missing required property: \"type\"";
		}
		if (typeof rerender !== "boolean") {
			throw "Invalid type (" + (typeof rerender) + ") for argument \"rerender\" passed to dispatch. Expected " +
			      "boolean.";
		}
	}
	if (callbackOnion === null) {
		middleware.sort((a, b) => {
			return a.priority - b.priority;
		});
		callbackOnion = middleware.reduce((nextLayer, layer) => {
			return (currentAction) => {
				return layer.func(currentAction, nextLayer);
			};
		}, coreFunction);
	}
	if (!Array.isArray(action)) {
		action = [action];
	}
	action.forEach((el) => {
		state = callbackOnion(el);
	});
	if (rerender) {
		callbacks.forEach((el) => {
			if (typeof el === "function") {
				el(state);
			} else {
				el.updater.enqueueForceUpdate(el);
			}
		});
	}
};

const register = (actions, reducer) => {
	if (process.env.NODE_ENV !== "production") {
		if (typeof actions !== "string" && (typeof actions !== "object" || !Array.isArray(actions))) {
			throw "Invalid type (" + (typeof actions) + ") for argument \"actions\" passed to listen. Expected string.";
		}
		if (typeof reducer !== "function") {
			throw "Invalid type (" + (typeof reducer) + ") for argument \"reducer\" passed to listen. Expected " +
			      "function.";
		}
	}
	if (typeof actions === "string") {
		actions = [actions];
	}
	actions.forEach((action) => {
		reducers[action] = reducers[action] || [];
		reducers[action].push(reducer);
	});
};

// https://www.reddit.com/r/javascript/comments/538wgm/suggestions_for_optimal_api_for_a_minimalist/
// /user/Strobljus made a good point that the ability to unbind middleware (or reducers) is effectively putting state
// into the middleware (and reducer) lists - instead of keeping all state in the store
/*
const unregister = (actions, reducer) => {
	if (process.env.NODE_ENV !== "production") {
		if (typeof actions !== "string" && (typeof actions !== "object" || !Array.isArray(actions))) {
			throw "Invalid type (" + (typeof actions) + ") for argument \"actions\" passed to listen. Expected string.";
		}
		if (typeof reducer !== "function") {
			throw "Invalid type (" + (typeof reducer) + ") for argument \"reducer\" passed to listen. Expected " +
			      "function.";
		}
	}
	if (typeof actions === "string") {
		actions = [actions];
	}
	actions.forEach((action) => {
		const index = reducers[action].indexOf(reducer);
		if (index !== -1) {
			reducers[action].splice(index, 1);
		}
	});
};
*/

const listen = (callback, reducer) => {
	if (reducer) {
		// Old, deprecated interpretation of "listen"
		return register(callback, reducer);
	}
	// New, spiffy interpretation of "listen"
	if (process.env.NODE_ENV !== "production") {
		if (typeof callback !== "object" && typeof callback !== "function") {
			throw "Invalid type (" + (typeof callback) + ") for argument \"callback\" passed to listen. Expected " +
			      "function (object accepted for now).";
		}
		// Importing React just to test instanceof means adding 14 kB of overhead for something I intend to deprecate
		/*
		if (typeof callback === "object" && !callback instanceof React.Component) {
			throw "Invalid type (object) for argument \"callback\" passed to listen. If an object is passed, it " +
			      "must be an instance of React.Component."
		}
		*/
	}
	callbacks.push(callback);
};
const connect = listen;

const unlisten = (callback) => {
	const index = callbacks.indexOf(callback);
	if (index !== -1) {
		callbacks.splice(index, 1);
	}
};

const use = (newMiddleware, priority = 0) => {
	if (process.env.NODE_ENV !== "production") {
		if (typeof newMiddleware !== "function") {
			throw "Invalid type (" + (typeof newMiddleware) + ") for argument \"newMiddleware\" passed to listen. " +
			      "Expected function.";
		}
		if (typeof priority !== "number") {
			throw "Invalid type (" + (typeof priority) + ") for argument \"priority\" passed to listen. Expected " +
			      "number.";
		}
	}
	middleware.unshift({ priority, func: newMiddleware });
	// Additional middleware was added. We need to recalulate this guy.
	callbackOnion = null;
};
const apply = use;

const getState = () => {
	return state;
};

// Switching to CommonJS allowed a bit better name mangling for dat mad compression
module.exports = {
	state: mutableState,
	getState,
	dispatch,
	register,
	//unregister,
	listen,
	unlisten,
	use,
	connect, // Deprecated
	apply // Deprecated
};
