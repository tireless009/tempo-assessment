# Hierarchy filter (Kotlin)

The solution is in `Hierarchy.kt`, with the original interface and tests together. The same implementation is available as a small Gradle project under `src/main/kotlin`, with the tests under `src/test/kotlin`.

Run the Gradle tests with:

```bash
gradle test
```

The filter walks the DFS array once. When a node fails the predicate, it remembers that node's depth and skips every following node below that depth. As soon as the depth returns to that level or higher, normal filtering resumes. Kept nodes retain their original depths because their ancestors were kept too. Runtime is O(n), with no recursion. The tests cover empty inputs, accepted/rejected roots, leaves and branches, sibling ordering, repeated filtering, avoiding predicate calls on skipped descendants, and deep trees.
