# SimpleCache code review

The basic `get()` and `put()` calls are thread-safe because the map is a `ConcurrentHashMap`, and each cache entry has immutable fields. That said, I wouldn't deploy this version at the expected traffic levels. The biggest issues are expiration, memory limits, and a few unclear parts of the cache contract.

## Issues to address

**1. Expired entries never leave the map.** `get()` returns `null` after a minute, but the entry stays in memory. Keys that aren't read again could accumulate indefinitely, increasing heap usage and GC pressure. I'd add expiration cleanup, including a way to remove expired entries that are never accessed again. If cleanup happens during a read, it must not accidentally remove a newer value written by another thread. A plain `remove(key)` is unsafe in that case.

**2. There is no capacity limit.** Even if expiration is fixed, hundreds of inserts per second could fill the cache with distinct keys during the one-minute TTL. I'd set a maximum entry count or weight and use an eviction policy. This is the main reason I'd choose a tested cache library rather than build concurrent eviction myself.

**3. TTL uses the system clock.** `System.currentTimeMillis()` can jump forward or backward after a clock adjustment. That could expire entries too soon or keep stale entries around too long. I'd use a monotonic clock such as `System.nanoTime()` to measure elapsed time, and make the TTL configurable.

**4. `size()` doesn't mean active entries.** It counts expired entries that are still physically in the map, and the count can change immediately under concurrent writes. If callers need an active-item count, that behavior should be defined and measured separately. I wouldn't scan the entire map on every read just for an exact count.

**5. Null keys and values need a clear contract.** With nullable generic arguments, a null key reaches `ConcurrentHashMap` and fails at runtime. A cached null value is also indistinguishable from a miss because `get()` returns `V?`. If null caching isn't required, use `K : Any, V : Any`. Otherwise, use an explicit hit/miss result.

**6. Cache misses may cause duplicate database loads.** The class doesn't load data itself, so this isn't a race inside `get()` or `put()`. But if callers fetch from a database after every miss, multiple threads can request the same expired key simultaneously. If that's the intended usage, use per-key load coalescing or a loading cache.

**7. Cache freshness isn't defined.** There is no invalidate/remove operation for when the underlying data changes. Two concurrent fetches can also complete out of order and an older result can overwrite a newer one. I'd decide whether serving data up to one minute old is acceptable, and add invalidation or version-aware writes if it isn't.

**8. Cached values aren't necessarily thread-safe.** A `val` prevents replacing the value reference, but `V` might be a mutable list or object shared across threads. Prefer immutable values or establish a synchronization rule for mutable ones.

**9. No visibility into cache behavior.** The TTL is hard-coded, and there are no hit/miss/eviction metrics. I'd expose configuration and basic stats so it's possible to tune the cache and spot issues in production.

## Recommendation

I'd use **Caffeine** with a maximum size (or weight), `expireAfterWrite`, and basic statistics. If reads need to load from a backing store, a loading cache also helps avoid duplicate concurrent loads. This keeps the hot read path efficient without custom eviction locks. I'd test the TTL boundary, lots of unique keys, concurrent replacement during expiry, and the expected read/write workload before rollout.
