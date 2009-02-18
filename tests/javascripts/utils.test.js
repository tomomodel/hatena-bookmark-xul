/*
 * jsm じゃないほうの util
 */

var _global = this;
var hBookmark;

function warmUp() {
    utils.include('btil.js');
    var tempGlobal = loadAutoloader("chrome://hatenabookmark/content/unknown.xul");
    hBookmark = tempGlobal.hBookmark;
    hBookmark.extend(_global, hBookmark);
}

function setUp()
{
}

function testAsyncExecute()
{
    let index = -1;
    let loaded = { value: false };
    asyncExecute(Iterator([1,2,3,4,5], true), 2, function(e, i) {
        index = i;
    }, function(i) {
        loaded.value = true;
    });
    assert.equals(-1, index);
    yield 0;
    assert.equals(1, index);
    yield 0;
    assert.equals(3, index);
    yield 0;
    assert.equals(4, index);
    yield loaded;

    index = -1;
    asyncExecute(Iterator([1,2,3,4,5,6,7,8,9], true), 3, function(e, i) {
        index = i;
    });
    assert.equals(-1, index);
    yield 0;
    assert.equals(2, index);
    yield 0;
    assert.equals(5, index);
    yield 0;
    assert.equals(8, index);
}
