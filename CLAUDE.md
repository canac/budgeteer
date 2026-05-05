## Helpers

Use collections helpers in `src/lib/collections.ts`

- Use `find(array, 'id', id)` instead of `array.find(item => item.id === id)`
- Use `pluck(arr, 'id')` instead of `arr.map(item => item.id`
- Use `range(100)` for an array of numbers

## Code Style

The only allowed abbreviations are:

- `i` for `index`
- `tx` for `transaction`

## Tests

Use helpers in `test/mocks.ts` to generate test data.
