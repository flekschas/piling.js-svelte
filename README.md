# Piling.js Svelte Template with Rollup

This template demonstrates how [piling.js](https://github.com/flekschas/piling.js) can be used within a [Svelte](https://svelte.dev/) app.

**Live Demo:** https://flekschas.github.io/piling.js-svelte/

## Getting Started

```
git clone https://github.com/flekschas/piling.js-svelte
cd piling.js-svelte
npm install
npm run dev
```

## How To

Everything works as expected except for one thing: you must import Piling.js from `src/piling.js` instead of a node module. Hence, do the following (pay attention to the `./` that preceds `piling.js`):

```javascript
import createPiling from './piling.js';
```

instead of 

```javascript
import createPiling from 'piling.js';
```

#### Why?

[Piling.js](https://github.com/flekschas/piling.js) uses [PixiJS](https://github.com/pixijs) for WebGL rendering. Unfortunately, PixiJS cannot be bundled with Rollup. (Or at least I haven't found out how...) However, Svelte apps are typically bundled with Rollup. Therefore, we cannot directly import Piling.js within our Svelte app as that would subsequently import PixiJS, which fails. To circumvent this issue, we are loading Piling.js from unpkg prior to loading the bundled Svelte app. In `src/piling.js`, we then expose the global exports from Piling.js to mimic the export from the Piling.js node modules.
