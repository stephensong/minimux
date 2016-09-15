# Minimux #
-----------

v1.0.0

## Description ##

Minimux was invented because I liked the ideology of Redux, but not the
implementation. This is my attempt to rebuild Redux with absolute minimal
functionality and to allow for absolute minimal bootstrapping in order to write
effective code.

## Why Not Redux? ##

If you're already using Redux, by all means: don't stop. It's a great library!

If you have never used Redux before and you're new to the concept of using a
library to manage your state, I believe that my library will prove more friendly
to newbies and will get you up and running with far less code.

This library started as a way to simplify a personal project of mine. I wanted
to learn React+Redux so I decided to create a simple incremental game using
these two technologies.

First, I learned React... and **I loved it**. Everything about it was perfect.
It turned your HTML into self-contained components just like Angular or Polymer,
but with 1/10th the bootstrapping of Angular and with twice the performance of
Polymer. The shadow DOM made apps blazingly fast no matter how many elements you
put on the page, and the fact that state could be passed down to elements as
properties... just amazing

Next, I learned Redux... it sounded **awesome**. You keep the full state of your
app (or game, in my case) in one place, then using the component properites you
hand it to the view and it's rendered by **stateless components**. Your view and
your state are entirely separate and always in sync. If you gain a level you
don't have to worry about the level over your head being correct but the level
in the stats menu being wrong: there's a single source of truth

Finally, I learned React-Redux. That pesky little library that binds the two
together. At first it didn't feel... **that** bad... So instead of just
components, if something is going to read state then it's a **container**...
Okay, I can work with that. And then a container needs a mapping function to
map the state to its properties... a bit awkward, but makes sense... But then
you **also** need a mapping function to map **actions** to properties. Now it's
getting silly... And then the whole thing didn't render because... I needed to
wrap the whole app in some phony "Provider" component? Where did that come from?

Suddenly React and Redux, both of which promised simplicity, felt like Angular:
which promises magic but only if you're willing to scale the vertical learning
curve. Personally? I wasn't willing. So I made this: **Minimux**

## Ideology ##

There are three guiding principles behind Redux:

 1. Single source of truth
 2. State is read-only
 3. Changes are made with pure functions

Each of these principles, you'll notice, has nothing to do with the Redux
library in particular. They are a set of best-practices that can be followed by
any code base without the need of an external library. All you need to do is
ensure that:

 1. You only have one global "state" object
 2. You overwrite the state with a new "state" object when it's modified
 3. All modifications are done through "reducers"

The simple Redux example of a counter with a `plus` and `minus` button could
therefore be build without the use of Redux at all using the following code:

```js
var state = { count: 0 }; // Single source of truth

function update(action) {
	if( action == 1 ) {
		state = { count: state.count + 1 }; // Overwrite the original object
	} else {
		state = { count: state.count - 1 };
	}
}

document.write('<button onclick="update(1)">+</button> <button onclick="update(-1)">+</button>');
```

Although this is a poor way to manage state (discussed in the next section), it
adhere to the three principles of Redux.

## Better State Management ##

Although additional concerns may be raised, the biggset issue with the code in
the previous section is simple: **it offers no way to inform display elements
that the state has changed**. You can update the count all day long but any
`<span>` or `<p>` rendering the current state will sit blissfully unaware at 0

For a state manager to be valuable, it needs to implement this one critical
feature: **Event Dispatching**

So to create a minimist state manager, I basically needed an event dispatcher.
When an action is thrown, update the state, then dispatch an event. Fortunately
we don't have to re-invent the wheel: [Event dispatchers are well documented](https://github.com/millermedeiros/js-signals/wiki/Comparison-between-different-Observer-Pattern-implementations)

As we want a **single source of truth**, and we want to keep this library
light-weight and simple, I favored the **Publish / Subscribe** pattern. Minimux
acts as a broadcaster and you can subscribe (listen) or publish (dispatch) for
any action.

The major advantage to this minimist approach is that the amount of code you
need to write in order to start using minimist is... well, **minimal**

Consider the following using React-Redux:

```js
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { createStore, applyMiddleware, bindActionCreators } from 'redux';

// Reducer
const reducer = (state = 0, action) => {
	switch (action.type) {
		case 'INCREMENT':
			return state + 1;
		case 'DECREMENT':
			return state - 1;
		default:
			return state;
	}
}

// Store
const store = createStore(reducer);

// Actions
const increment = () => {
	store.dispatch({ type: 'INCREMENT' });
}
const decrement = () => {
	store.dispatch({ type: 'DECREMENT' });
}

// Containers
class Counter extends Component {
	render() {
		return <ActualCounter value={this.props.value} onIncrement={this.props.increment} onDecrement={this.props.decrement} />;
	}
}
const mapStateToProps = (state) => {
	return {
		value: state
	};
}
const mapDispatchToProps = (dispatch) => {
	return bindActionCreators({ increment: increment, decrement: decrement }, dispatch);
}
let CounterContainer = connect(mapStateToProps, mapDispatchToProps)(Counter);

// Components
class ActualCounter extends Component {
	render() {
		return (
			<div>
				<button onClick={this.props.onIncrement}>+</button>
				<button onClick={this.props.onDecrement}>-</button>
				<p>{this.props.value}</p>
			</div>
		);
	}
}

// Render it all
ReactDOM.render(<Provider store={store}><CounterContainer /></Provider>, document.getElementById("container"));
```

Holy **crap** that was a mouthful. Now let's do the same thing in Minimux:

```
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { listen, dispatch, state } from 'minimux';

// Reducers
listen('INCREMENT', (state, action) => {
	return { count: count + 1 };
});
listen('DECREMENT', (state, action) => {
	return { count: count + 1 };
});

// Actions
const increment = () => {
	dispatch({ type: 'INCREMENT' });
}
const decrement = () => {
	dispatch({ type: 'DECREMENT' });
}

// Components
class Counter extends Component {
	render() {
		return (
			<div>
				<button onClick={increment}>+</button>
				<button onClick={decrement}>-</button>
				<p>{state.count}</p>
			</div>
		);
	}
}

// Render it all
connect(ReactDOM.render(<Counter />, document.getElementById("container"));
```

Notice that by connecting the root DOM node to Minimux we've **completely
eliminated the need for containers**. By making the state available to any part
of our code (via `import` statement) we avoid the mess of passing it through
components. By keeping it simple, we reduce the overall code written to
accomplish the same goal.

## But What About (Insert Redux Feature) ??? ##

Many people who switched to Redux did so because it offered some absolutely
magical abilities. Things like [time travel](https://github.com/gaearon/redux-devtools)
become really simple.

The same is possible with Minimux with a small adjustment. Since we follow the
three core principles of Redux, the state can be calculated by re-running all
reducers on a list of all past actions. Actions can be injected into this list
or removed from this list and the calculations run to get the exact same
behavior.

At first I had the action list a core part of Minimux, but I soon realized that
a videogame throwing events every tenth of a second from a timer and every time
someone clicks button or moves the mouse would quickly flood the memory with
events long-past that no one cares about anymore. I also realized that something
like time travel and undo aren't core features of state management, but they're
more like **add-ons**.

For this reason, I expanded Minimux with [middleware](http://www.nixtu.info/2013/03/middleware-pattern-in-javascript.html)

Using middleware we can do things like:

 - Record all actions before (or after) they are processed in order to undo / time travel
 - Prevent an action based on the state
 - Modify an action in flight or throw errors for invalid actions
 - Update the state after an action has occurred (consider: level up after experience is updated if experience exceeds a threshold)

To implement middleware in the most minimal way possible, I look at PHP's [Onion Library](https://github.com/esbenp/onion)

All of this for just **407 bytes minified and gzipped**

## Contributin' ##

This is the first time I've ever created a project with the intention of
maintaining it. If you find any issues, please open an issue and I'll try to
respond when I can (usually at night). If you want to contribute, don't
hesitate to send me your pull requests!

Since the purpose of this library is to be **minimist**, I don't plan to
integrate all sorts of functionality into the core. I **do**, however, want to
provide a multitude of "default" middleware to extend the functionality.