/**
 * @module MinHeap
 * Generic binary min-heap (priority queue) keyed by a numeric priority.
 * Used by A* pathfinding to replace the O(n) linear open-list scan with
 * O(log n) insert/extract-min.
 */

export interface HeapNode {
  /** The priority value used for ordering (lower = higher priority). */
  f: number;
}

/**
 * Binary min-heap ordered by node.f.
 *
 * Operations:
 * - push:    O(log n)
 * - pop:     O(log n)
 * - peek:    O(1)
 * - size:    O(1)
 * - isEmpty: O(1)
 */
export class MinHeap<T extends HeapNode> {
  private heap: T[] = [];

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  push(node: T): void {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    const { heap } = this;
    if (heap.length === 0) return undefined;

    const top = heap[0];
    const last = heap.pop()!;

    if (heap.length > 0) {
      heap[0] = last;
      this._sinkDown(0);
    }

    return top;
  }

  /**
   * Update an existing node's priority and re-heapify.
   * Scans for the node by reference identity — O(n) worst case,
   * but typically called infrequently (only when a shorter path is found).
   */
  decreaseKey(node: T): void {
    const idx = this.heap.indexOf(node);
    if (idx >= 0) {
      this._bubbleUp(idx);
    }
  }

  private _bubbleUp(idx: number): void {
    const { heap } = this;
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (heap[idx].f >= heap[parentIdx].f) break;
      [heap[idx], heap[parentIdx]] = [heap[parentIdx], heap[idx]];
      idx = parentIdx;
    }
  }

  private _sinkDown(idx: number): void {
    const { heap } = this;
    const length = heap.length;

    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && heap[left].f < heap[smallest].f) {
        smallest = left;
      }
      if (right < length && heap[right].f < heap[smallest].f) {
        smallest = right;
      }
      if (smallest === idx) break;

      [heap[idx], heap[smallest]] = [heap[smallest], heap[idx]];
      idx = smallest;
    }
  }
}
