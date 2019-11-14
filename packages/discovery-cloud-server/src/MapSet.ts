export default class MapSet<A, B> {
  private map: Map<A, Set<B>> = new Map()

  add(key: A, val: B): boolean {
    return this.merge(key, [val])
  }

  set(key: A, val: Set<B>): void {
    this.map.set(key, val)
  }

  values(): Set<B>[] {
    return [...this.map.values()]
  }

  union(): Set<B> {
    const acc: B[] = []
    for (const set of this.map.values()) {
      acc.push(...set)
    }
    return new Set(acc)
  }

  keys(): A[] {
    return [...this.map.keys()]
  }

  merge(key: A, vals: B[]): boolean {
    const current = this.get(key)
    const change = vals.some((val) => !current.has(val))
    if (change) {
      this.map.set(key, new Set([...current, ...vals]))
    }
    return change
  }

  delete(key: A): Set<B> {
    const old = this.get(key)
    this.map.delete(key)
    return old
  }

  remove(key: A, val: B) {
    this.get(key).delete(val)
  }

  removeAll(key: A, vals: B[]) {
    for (const val of vals) {
      this.get(key).delete(val)
    }
  }

  keysWith(val: B): Set<A> {
    const keys = new Set<A>()
    for (const [key, vals] of this.map) {
      if (vals.has(val)) {
        keys.add(key)
        break
      }
    }
    return keys
  }

  get(key: A): Set<B> {
    return this.map.get(key) || new Set()
  }

  has(key: A, val: B): boolean {
    return this.get(key).has(val)
  }
}
