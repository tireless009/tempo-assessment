import kotlin.test.*

// The task:
// 1. Read and understand the Hierarchy data structure described in this file.
// 2. Implement filter() function.
// 3. Implement more test cases.
//
// The task should take 30-90 minutes.
//
// When assessing the submission, we will pay attention to:
// - correctness, efficiency, and clarity of the code;
// - the test cases.

/**
 * A `Hierarchy` stores an arbitrary _forest_ (an ordered collection of ordered trees)
 * as an array of node IDs in the order of DFS traversal, combined with a parallel array of node depths.
 *
 * Parent-child relationships are identified by the position in the array and the associated depth.
 * Each tree root has depth 0, its children have depth 1 and follow it in the array, their children have depth 2 and follow them, etc.
 *
 * Example:
 * ```
 * nodeIds: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
 * depths:  0, 1, 2, 3, 1, 0, 1, 0, 1, 1, 2
 * ```
 *
 * the forest can be visualized as follows:
 * ```
 * 1
 * - 2
 * - - 3
 * - - - 4
 * - 5
 * 6
 * - 7
 * 8
 * - 9
 * - 10
 * - - 11
 *```
 * 1 is a parent of 2 and 5, 2 is a parent of 3, etc. Note that depth is equal to the number of hyphens for each node.
 *
 * Invariants on the depths array:
 *  * Depth of the first element is 0.
 *  * If the depth of a node is `D`, the depth of the next node in the array can be:
 *      * `D + 1` if the next node is a child of this node;
 *      * `D` if the next node is a sibling of this node;
 *      * `d < D` - in this case the next node is not related to this node.
 */
interface Hierarchy {
  /** The number of nodes in the hierarchy. */
  val size: Int

  /**
   * Returns the unique ID of the node identified by the hierarchy index. The depth for this node will be `depth(index)`.
   * @param index must be non-negative and less than [size]
   * */
  fun nodeId(index: Int): Int

  /**
   * Returns the depth of the node identified by the hierarchy index. The unique ID for this node will be `nodeId(index)`.
   * @param index must be non-negative and less than [size]
   * */
  fun depth(index: Int): Int

  fun formatString(): String {
    return (0 until size).joinToString(
      separator = ", ",
      prefix = "[",
      postfix = "]"
    ) { i -> "${nodeId(i)}:${depth(i)}" }
  }
}

/** A node is kept only when it and all its ancestors satisfy the predicate. */
fun Hierarchy.filter(nodeIdPredicate: (Int) -> Boolean): Hierarchy {
  val keptIds = IntArray(size)
  val keptDepths = IntArray(size)
  var keptCount = 0

  // Skip descendants until we return to the rejected node's depth or above.
  var rejectedSubtreeDepth = Int.MAX_VALUE

  for (index in 0 until size) {
    val depth = depth(index)
    if (depth > rejectedSubtreeDepth) continue

    val id = nodeId(index)
    if (nodeIdPredicate(id)) {
      keptIds[keptCount] = id
      keptDepths[keptCount] = depth
      keptCount++
      rejectedSubtreeDepth = Int.MAX_VALUE
    } else {
      rejectedSubtreeDepth = depth
    }
  }

  return ArrayBasedHierarchy(keptIds.copyOf(keptCount), keptDepths.copyOf(keptCount))
}

class ArrayBasedHierarchy(
  private val myNodeIds: IntArray,
  private val myDepths: IntArray,
) : Hierarchy {
  override val size: Int = myDepths.size

  override fun nodeId(index: Int): Int = myNodeIds[index]

  override fun depth(index: Int): Int = myDepths[index]
}


class FilterTest {
  private fun tree(vararg nodes: Pair<Int, Int>) = ArrayBasedHierarchy(
    IntArray(nodes.size) { nodes[it].first },
    IntArray(nodes.size) { nodes[it].second },
  )

  private fun assertNodes(source: Hierarchy, expected: Hierarchy, keep: (Int) -> Boolean) {
    assertEquals(expected.formatString(), source.filter(keep).formatString())
  }

  @Test
  fun exampleFromTask() {
    val source = tree(
      1 to 0, 2 to 1, 3 to 2, 4 to 3, 5 to 1,
      6 to 0, 7 to 1, 8 to 0, 9 to 1, 10 to 1, 11 to 2,
    )
    assertNodes(source, tree(1 to 0, 2 to 1, 5 to 1, 8 to 0, 10 to 1, 11 to 2)) { it % 3 != 0 }
  }

  @Test
  fun emptyHierarchy() {
    assertNodes(tree(), tree()) { true }
  }

  @Test
  fun allNodesAcceptedOrRejected() {
    val source = tree(1 to 0, 2 to 1, 3 to 0)
    assertNodes(source, source) { true }
    assertNodes(source, tree()) { false }
  }

  @Test
  fun rejectingRootSkipsOnlyItsTree() {
    val source = tree(1 to 0, 2 to 1, 3 to 2, 4 to 0, 5 to 1)
    assertNodes(source, tree(4 to 0, 5 to 1)) { it != 1 }
  }

  @Test
  fun rejectingBranchKeepsFollowingSiblings() {
    val source = tree(1 to 0, 2 to 1, 3 to 2, 4 to 1, 5 to 2, 6 to 0)
    assertNodes(source, tree(1 to 0, 4 to 1, 5 to 2, 6 to 0)) { it != 2 }
  }

  @Test
  fun predicateIsNotCalledOnSkippedDescendants() {
    val seen = mutableListOf<Int>()
    val source = tree(1 to 0, 2 to 1, 3 to 2, 4 to 1, 5 to 0)
    source.filter { seen.add(it); it != 2 }
    assertEquals(listOf(1, 2, 4, 5), seen)
  }

  @Test
  fun deepTreeWorksWithoutRecursion() {
    val size = 5000
    val source = ArrayBasedHierarchy(IntArray(size) { it }, IntArray(size) { it })
    val filtered = source.filter { it < 1000 }
    assertEquals(1000, filtered.size)
    assertEquals(999, filtered.depth(999))
  }
  @Test
  fun rejectingLeafDoesNotRejectItsParent() {
    val source = tree(1 to 0, 2 to 1, 3 to 2, 4 to 1)
    assertNodes(source, tree(1 to 0, 2 to 1, 4 to 1)) { it != 3 }
  }

  @Test
  fun rejectedConsecutiveSiblingsKeepNextValidSibling() {
    val source = tree(1 to 0, 2 to 1, 3 to 1, 4 to 1, 5 to 0)
    assertNodes(source, tree(1 to 0, 4 to 1, 5 to 0)) { it != 2 && it != 3 }
  }

  @Test
  fun filteringResultAgainWorks() {
    val source = tree(1 to 0, 2 to 1, 3 to 1, 4 to 0)
    val first = source.filter { it != 2 }
    assertNodes(first, tree(1 to 0, 4 to 0)) { it != 3 }
  }

  @Test
  fun filteringDoesNotChangeOriginalHierarchy() {
    val source = tree(1 to 0, 2 to 1, 3 to 0)
    val before = source.formatString()
    source.filter { it != 1 }
    assertEquals(before, source.formatString())
  }
}
