/**
 * Binary min-heap used by A* pathfinding.
 * Provides O(log n) insert and extract-min instead of O(n) linear scans.
 */
export class MinHeap<T> {
  private heap: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  get size() {
    return this.heap.length;
  }

  push(value: T) {
    this.heap.push(value);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(index: number) {
    const { heap, compare } = this;
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (compare(heap[index], heap[parentIndex]) >= 0) break;
      [heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]];
      index = parentIndex;
    }
  }

  private sinkDown(index: number) {
    const { heap, compare } = this;
    const length = heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < length && compare(heap[left], heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && compare(heap[right], heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === index) break;
      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
  }
}
