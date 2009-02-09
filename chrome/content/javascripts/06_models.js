
(function() {
    var Model = {};
    hBookmark.Model = Model;

    extend(Model, {
        MODELS: ['Bookmark', 'Tag'],
        init: function() {
            if (this._init) return;
            this._init = true;
        },
        get db() {
            if (!this._init) this.init();
            if (this._db) return this._db;

            var db = new Database('hatena.bookmark.sqlite');
            return this.db = db;
        },
        set db(db) {
            this._db = db;
            return db;
        },
        resetAll: function() {
            this.deleteAll();
            this.createAll();
        },
        deleteAll: function() {
            this.MODELS.forEach(function(m) {
            try { 
                Model[m].deinitialize() 
            } catch(e) {
                p('delete error:' + e);
            }}
            );
        },
        createAll: function() {
            var models = this.MODELS.forEach(function(m) Model[m].initialize());
        },
    });

    Model.Entity = function (def) {
        let model = extend(Entity(def), {
            get db() Model.db,
        });
        return model;
    };

    Model.Bookmark = Model.Entity({
        name : 'bookmarks',
        fields : {
            id           : 'INTEGER PRIMARY KEY',
            place_id     : 'INTEGER',
            url          : 'TEXT UNIQUE NOT NULL',
            title        : 'TEXT',
            search       : 'TEXT',
            date         : 'TIMESTAMP NOT NULL',
            last_visited : 'TIMESTAMP',
            comment      : 'TEXT',
        }
    });

    extend(Model.Bookmark, {
        parseTags: function(str) {
            /*
             * XXX: [hoge][huga] foo [baz] の baz もまっちしてしまう
             */
            let regex = new RegExp('\\[([^\:\\[\\]]+)\\]', 'g');
            let match;
            let tags = [];
            while (( match = regex.exec(str) )) {
                tags.push(match[1]);
            }
            return tags;
        },
        findByTags: function() {
            let bids = [];
            let res = [];
            for (var i = 0;  i < arguments.length; i++) {
                var tag = arguments[i];
                if (i == 0) {
                    res = Model.Tag.findByName(tag);
                    if (!res.length) return [];
                } else {
                    bids = res.map(function(t) t.bookmark_id);
                    res = Model.Tag.find({
                        where: 'name = :name AND bookmark_id IN (' + bids.join(',') + ')',
                        name: tag,
                    });
                }
            }
            return res;
        },
    });

    extend(Model.Bookmark.prototype, {
        get tags(comment) {
            return Model.Bookmark.parseTags(this.comment);
        },
        updateTags: function() {
            let tags = this.tags;
            if (this.id > 0) {
                Model.Tag.db.execute('delete from tags where bookmark_id = ' + this.id);
                //Model.Tag.delete({
                //    bookmark_id: this.id
                //});
            }
            for (var i = 0;  i < tags.length; i++) {
                var tag = tags[i];
                var t = new Model.Tag;
                t.bookmark_id = this.id;
                t.name = tag;
                t.save();
            }
        }
    });

    addAround(Model.Bookmark, 'initialize', function(proceed, args, target) {
        proceed(args);
        target.db.connection.executeSimpleSQL('CREATE INDEX "bookmarks_date" ON "bookmarks" ("date" DESC)');
        target.db.connection.executeSimpleSQL('CREATE INDEX "bookmarks_date_asc" ON "bookmarks" ("date" ASC)');
    });

    addAround(Model.Bookmark.prototype, 'save', function(proceed, args, target) {
        target.search = [target.title, target.comment, target.url].join("\0"); // SQLite での検索用
        proceed(args);
        target.updateTags();
    });

    Model.Tag = Model.Entity({
        name : 'tags',
        fields : {
            id           : 'INTEGER PRIMARY KEY',
            bookmark_id  : 'INTEGER NOT NULL',
            name         : 'TEXT',
        }
    });

})();


