import kotlin.test.*

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
