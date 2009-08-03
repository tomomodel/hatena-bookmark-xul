const EXPORT = ["SearchEmbedder"];

function SearchEmbedder(doc) {
    this.doc = doc;
    this.site = SiteInfoSet.Search.get(doc);
    this.state = SearchEmbedder.STATE_INITIALIZED;
    if (this.site && this.isValidDomain())
        this.ready();
}

SearchEmbedder.STATE_INITIALIZED = 0x00;
SearchEmbedder.STATE_LOAD_DONE   = 0x01;
SearchEmbedder.STATE_SEARCH_DONE = 0x02;
SearchEmbedder.STATE_EMBED_READY = SearchEmbedder.STATE_LOAD_DONE |
                                   SearchEmbedder.STATE_SEARCH_DONE;

SearchEmbedder.STYLE = <![CDATA[
    #hBookmark-search {
        font-size: 1em;
        line-height: 1.4;
        color: #000;
        margin: 0 0 0.5em 1em;
        padding: 0;
        width: 30%;
        max-width: 25em;
        float: right;
    }
    #hBookmark-search span,
    #hBookmark-search a,
    #hBookmark-search b,
    #hBookmark-search em,
    #hBookmark-search img,
    #hBookmark-search div,
    #hBookmark-search dl,
    #hBookmark-search dt,
    #hBookmark-search dd {
        font: inherit;
        background: none;
        color: inherit;
        margin: 0;
        padding: 0;
        border: none;
    }
    #hBookmark-search :link {
        text-decoration: underline;
        color: #2200cc;
    }
    #hBookmark-search :visited {
        text-decoration: underline;
        color: #551a8b;
    }
    #hBookmark-search .hBookmark-search-heading {
        background: #4272c4 url("http://b.st-hatena.com/images/fx_addon_search_bg.gif") left center;
        border: 1px solid #2c6ebf;
        color: #fff;
        padding: 5px;
        -moz-border-radius-topleft: 5px;
        -moz-border-radius-topright: 5px;
        overflow: hidden;
        position: relative;
    }
    #hBookmark-search .hBookmark-search-title {
        background: url("http://b.st-hatena.com/images/favicon.gif") left center no-repeat;
        padding-left: 18px;
        font-weight:bold;
    }
    #hBookmark-search .hBookmark-search-user {
        color: inherit;
        text-decoration: none;
        font-size: 12px;
        display: inline-block;
        width: 50%;
        text-align: right;
        color: #666;
        float: right;
        /*margin-bottom: 1em;*/
    }
    #hBookmark-search a > img {
        margin: 0 3px -5px 0;
    }
    #hBookmark-search .hBookmark-search-status {
        display: block;
        text-align: left;
        float: left;
        display: inline-block;
        width: 50%;
        font-size: 12px;
        color: #666;
        /*margin-bottom: 1em;*/
    }
    #hBookmark-search .hBookmark-search-container > .hBookmark-search-info:after {
        content: "";
        display: block;
        clear: both;
    }
    #hBookmark-search div.hBookmark-search-container {
        border: 1px solid #ccc;
        -moz-border-radius-bottomleft: 5px;
        -moz-border-radius-bottomright: 5px;
        padding: 5px;
    }
    #hBookmark-search dl {
        margin: 0 0 0 20px;
        padding: 0 0 10px 0;
    }
    #hBookmark-search dt {
        margin-top: 1em;
    }
    #hBookmark-search dd {
        font-size: 90%;
        margin: 0.2em 0;
    }

    #hBookmark-search dd.hBookmark-search-info {
        /*margin-bottom: 1em;*/
    }
    #hBookmark-search .hBookmark-search-url {
        margin-right: 3px;
    }
    #hBookmark-search a.hBookmark-search-counter {
        display: inline-block;
    }

    #hBookmark-search dt a img {
        position: relative;
        margin-left: -20px;
    }
    #hBookmark-search .hBookmark-search-many {
        background-color: #fff0f0;
        color: #ff6666;
        font-weight: bold;
    }
    #hBookmark-search .hBookmark-search-too-many {
        background-color: #ffcccc;
        color: #ff0000;
        font-weight: bold;
    }
    #hBookmark-search .hBookmark-search-more {
        text-align: right;
        margin: 0 0.5em 0.5em 0;
    }
    #hBookmark-search .hBookmark-search-query,
    #hBookmark-search em {
        font-weight: bold;
    }
    #hBookmark-search .hBookmark-search-url {
        color: green;
    }
]]>.toString();

extend(SearchEmbedder.prototype, {
    strings: new Strings("chrome://hatenabookmark/locale/embed.properties"),

    get win SE_get_win() this.doc.defaultView,
    get url SE_get_url() this.win.location.href,

    isValidDomain: function SE_isValidDomain() {
        const TLDService = getService("@mozilla.org/network/effective-tld-service;1", Ci.nsIEffectiveTLDService);
        let domainPattern = this.site.data.baseDomain;
        if (!domainPattern) return false;
        if (typeof domainPattern === "string")
            domainPattern = new RegExp(domainPattern);
        let domain = TLDService.getBaseDomainFromHost(this.win.location.hostname);
        return domainPattern.test(domain);
    },

    ready: function SE_ready() {
        let url = this.url;
        let query = this.site.queryFirstString("query", url);
        if (!query) return;
        let encoding = this.site.queryFirstString("encoding", url) || "utf-8";
        let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
                        createInstance(Ci.nsIScriptableUnicodeConverter);
        query = unescape(query.replace(/\+/g, " "));
        try {
            converter.charset = encoding;
            query = converter.ConvertToUnicode(query);
        } catch (ex) {}
        this.query = query;
        this.doc.addEventListener("DOMContentLoaded", this, false);
        //this.win.addEventListener("pageshow", this, false);
        //this.win.addEventListener("load", this, false);
        SearchEmbedder.http.async_get(this.httpQuery, method(this, 'onSearch'));
    },

    get httpQuery SE_get_httpQuery() {
        return '?q=' + encodeURIComponent(this.query) +
               '&limit=' + Prefs.bookmark.get("embed.searchCount") +
               '&snip=' + Prefs.bookmark.get("embed.searchSnippetLength");
    },

    embed: function SE_embed() {
        if (this.state !== SearchEmbedder.STATE_EMBED_READY) return;
        let head = this.doc.getElementsByTagName("head")[0];
        let container = this.site.query("annotation", this.doc);
        if (!head || !container) return;

        let style = this.doc.createElement("style");
        style.textContent = SearchEmbedder.STYLE + (this.site.data.style || "");
        head.appendChild(style);

        let anchor = null;
        switch (this.site.data.annotationPosition || "last") {
        case "before":
            anchor = container;
            container = container.parentNode;
            break;
        case "after":
            anchor = container.nextSibing;
            container = container.parentNode;
            break;
        case "first":
            anchor = container.firstChild;
            break;
        case "last":
            break;
        }
        let search = this.createSearchResult(container);
        container.insertBefore(search, anchor);
    },

    createSearchResult: function SE_createSearchResult(container) {
        default xml namespace = XHTML_NS;
        // <></>.(See.mozilla.bug[330572].for.this.workaround);
        let data = this.data;
        let query = this.query;

        let result = <div id="hBookmark-search">
            <div class="hBookmark-search-heading">
                <span class="hBookmark-search-title">
                    { this.strings.get("search.title") }
                </span>
            </div>
            <div class="hBookmark-search-container">
                <div class="hBookmark-search-info">
                    <a class="hBookmark-search-user"
                       href={ User.user.bookmarkHomepage }>
                        <img src={ User.user.getProfileIcon() }
                             alt="" width="16" height="16"/>
                        { User.user.name }
                    </a>
                    <span class="hBookmark-search-status"/>
                </div>

                <dl class="hBookmark-search-results"/>
            </div>
        </div>;

        let status = result.div[1].div[0].span[0];
        status.parent().insertChildBefore(status, " ");
        let statusPattern = this.strings.get("search.statusPattern");
        this._appendFilledInContent(status, statusPattern, {
            query:   <b class="hBookmark-search-query">{ query }</b>,
            count:   <b>{ data.bookmarks.length }</b>,
            total:   <b>{ data.meta.total }</b>,
            elapsed: <b>{ data.meta.elapsed.toFixed(2) }</b>,
        });

        let dl = result.div[1].dl[0];
        data.bookmarks.forEach(function (bookmark) {
            let entry = bookmark.entry;

            let title = <dt>
                <a href={ entry.url }>
                    <img src={ 'http://favicon.st-hatena.com/?url=' + encodeURIComponent(entry.url) }
                         alt="" width="16" height="16"/>
                </a>
            </dt>;
            this._appendEmphasizedContent(title.a[0], entry.title, query);

            let snippet = <></>
            if (entry.snippet) {
                snippet = <dd class="hBookmark-search-snippet"/>;
                this._appendEmphasizedContent(snippet, entry.snippet, query);
            }

            let info = <dd class="hBookmark-search-info">
                <span class="hBookmark-search-url"/>
                <a class="hBookmark-search-counter"
                   href={ entryURL(entry.url) }>{
                    UIUtils.getUsersText(entry.count)
                }</a>
            </dd>;
            let displayURL = entry.url.replace(/^https?:\/\//, "");
            this._appendEmphasizedContent(info.span[0], displayURL, query);
            if (entry.count >= 3) {
                info.a[0].@class += (entry.count >= 10)
                    ? " hBookmark-search-too-many" : " hBookmark-search-many";
            }
            info.insertChildAfter(info.span[0], " ");

            dl.appendChild(title + snippet + info);
        }, this);

        if (data.meta.total > data.bookmarks.length) {
            result.div[1].* += <div class="hBookmark-search-more">
                <a href={ B_HTTP + User.user.name + '/search?q=' + encodeURIComponent(query) }>{
                    this.strings.get("search.showAllLabel")
                }</a>
            </div>;
        }

        return xml2dom(result, { document: this.doc, context: container });
    },

    _appendFilledInContent: function SE__appendFilledInContent(element,
                                                               pattern,
                                                               map) {
        pattern.split(/\{(.*?)\}/).forEach(function (key, i) {
            element.appendChild((i & 1) ? map[key] : key);
        });
        return element;
    },

    _appendEmphasizedContent: function SE__appendEmphasizedContent(element,
                                                                   text,
                                                                   keyword) {
        default xml namespace = XHTML_NS;
        text.split(keyword).forEach(function (fragment, i) {
            if (i) element.appendChild(<em>{ keyword }</em>);
            element.appendChild(fragment);
        });
        return element;
    },

    handleEvent: function SE_handleEvent(event) {
        switch (event.type) {
        case "DOMContentLoaded":
            this.state |= SearchEmbedder.STATE_LOAD_DONE;
            this.embed();
            break;

        case "pageshow":
        case "load":
            p(event.type + " " + this.state);
            break;
        }
    },

    onSearch: function SE_onSearch(data) {
        if (!data || !data.meta || data.meta.status !== 200 || !data.meta.total)
            return;
        this.data = data;
        this.state |= SearchEmbedder.STATE_SEARCH_DONE;
        this.embed();
    },
});

extend(SearchEmbedder, {
    progressListener: {
        __proto__: WebProgressListenerPrototype,

        onLocationChange: function SEPL_onLocationChange(progress, request,
                                                         location) {
            if (!User.user || !User.user.plususer ||
                !Prefs.bookmark.get("embed.search"))
                return;
            new SearchEmbedder(progress.DOMWindow.document);
        },
    },

    http: new HTTPCache('searchCache', {
        expire: 60 * 60,
        baseURL: {
            toString: function SE_s_cache_baseURL_toString() {
                return B_HTTP + User.user.name + '/search/json';
            },
        },
        seriarizer: 'uneval', // XXX The correct spell is "serializer"
        json: true,
    }),
});


window.addEventListener("load", function SetupSearchEmbedder() {
    gBrowser.addProgressListener(SearchEmbedder.progressListener,
                                 Ci.nsIWebProgress.NOTIFY_LOCATION);
}, false);

window.addEventListener("unload", function ShutdownSearchEmbedder() {
    gBrowser.removeProgressListener(SearchEmbedder.progressListener);
}, false);

EventService.createListener("UserChange", function () {
    SearchEmbedder.http.cache.clearAll();
});
