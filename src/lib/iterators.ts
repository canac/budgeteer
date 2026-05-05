export async function* chunks<T>(source: AsyncIterable<T>, size: number): AsyncGenerator<T[]> {
  if (size <= 0) {
    throw new RangeError("chunks size must be positive");
  }

  let chunk: T[] = [];
  for await (const item of source) {
    chunk.push(item);
    if (chunk.length === size) {
      yield chunk;
      chunk = [];
    }
  }

  if (chunk.length > 0) {
    yield chunk;
  }
}

export async function* filter<T>(
  source: AsyncIterable<T>,
  predicate: (item: T) => boolean,
): AsyncGenerator<T> {
  for await (const item of source) {
    if (predicate(item)) {
      yield item;
    }
  }
}
