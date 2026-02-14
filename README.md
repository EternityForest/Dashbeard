# Dashbeard

A lightweight web-based dashboard and presentation creator. Build interactive data-driven interfaces by connecting components via a bidirectional data flow system.

Build your dashboard declaratively with two way bindings between data sources and components.

Data sources are just hidden components.  One abstraction for everything.


## Usage

```
npm run dev
```

Go to http://localhost:3000/examples/editor-example.html

## Testing

Run tests:
```bash
npm test -- --run
```


## Port Graph System

A port is essentially an observable that pushes
objects with a data value, a timestamp, and an arbitrary "annotation".

Ports can be connected with a binding.  The "upstream" side is towards the "owner" of some data,
and the downstream is "away", but the binding is bidirectional.

Messages from upstream keep going upstream,
Messages going downstream keep going downstream.

The uppermost node generally acts as a "hub" and
will retransmit the message downstream to reflect
it's new state.

A port can only have one upstream facing connection.

