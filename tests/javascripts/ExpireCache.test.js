
var _global = this;
var hBookmark;

function warmUp() {
    utils.include("btil.js");
    var global = loadAutoloader("chrome://hatenabookmark/content/unknown.xul");
    hBookmark = global.hBookmark;
    hBookmark.extend(_global, hBookmark);
}

function testCache() {
    let cache = new ExpireCache();
    let cache2 = new ExpireCache('foo');
    cache.set('foo', 1);
    assert.isTrue(cache.has('foo'));
    assert.isFalse(cache.has('oooo'));
    assert.equals(cache.get('foo'), 1);
    assert.isNull(cache2.get('foo'));
    assert.isFalse(cache2.get('foo'));

    cache.set('f', 0);
    assert.isTrue(cache.has('f'));

    cache.set('bar', 1, 1);
    yield 2000;
    assert.isNull(cache.get('bar'));
    assert.isFalse(cache.has('bar'));
}


