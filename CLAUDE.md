## Helpers

Use collections helpers in `src/lib/collections.ts`.

- Use `find(array, 'id', id)` instead of `array.find(item => item.id === id)`
- Use `pluck(arr, 'id')` instead of `arr.map(item => item.id`
- Use `range(100)` for an array of numbers

## Code Style

The only allowed abbreviations are:

- `i` for `index`
- `tx` for `transaction`
- `req`/`res` for `request`/`response`

## Tests

Use helpers in `test/mocks.ts` to generate test data.

## Package Manager

Use `pnpm` to manage dependencies and run scripts.

## Scroll Restoration

`@tanstack/router-core` is patched (`patches/`) so the router skips scroll restoration for anything inside `data-scroll-restoration="off"`. Put it on horizontal swipe scrollers, since the router restores positions by DOM position and writes them onto the wrong element.
