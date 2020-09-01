'use strict';

// For any third party dependencies, like jQuery, place them in the lib folder.

// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'src/javascript',
    paths: {
        app: '../dist'
    }
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['main'], function (main) {
    main.init();
});
'use strict';

define('main', ['components/overflow-menu', 'components/infinite-scroller', 'datasource/beer'], function (OverflowMenu, InfiniteScroller, Beer) {
    'use strict';

    return {
        init: function init() {
            /* eslint-disable no-console */
            console.log('App started');

            new OverflowMenu();

            var scroller = document.querySelector('#beers');
            var beerSource = new Beer({
                url: 'https://api.brewerydb.com/v2',
                menuEndpoint: '/menu',
                beersEndpoint: '/beers'
            });

            if (scroller) {
                this.infiniteScroller = new InfiniteScroller(scroller, beerSource);
            }
        }
    };
});
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

define('components/infinite-scroller', [], function () {
    'use strict';

    var PHYSICAL_ITEMS = 20;
    var PAGE_SIZE = 10;
    var PROXIMITY_BOUNDARY = 300;

    var InfiniteScroller = function () {
        function InfiniteScroller(scroller, dataSource, options) {
            _classCallCheck(this, InfiniteScroller);

            options || (options = {});

            this.scroller = scroller;
            this.dataSource = dataSource;

            // Options
            this.swipeable = options.swipeable;
            this.PHYSICAL_ITEMS = options.physicalItems || PHYSICAL_ITEMS;
            this.PAGE_SIZE = options.pageSize || PAGE_SIZE;
            this.PROXIMITY_BOUNDARY = options.proximityBoundary || PROXIMITY_BOUNDARY;

            // This will hold a cache of the data sent from server
            this.itemsCacheData = [];

            this.loadingItemHeight = 0;
            this.loadingItemWidth = 0;
            this.loadingItems = [];

            this.physicalItems = [];
            this.firstPhysicalItemIndex = -1;
            this.middlePhysicalItemIndex = -1;
            this.lastPhysicalItemIndex = -1;
            this.firstPhysicalItem = null;
            this.lastPhysicalItem = null;
            this.firstPhysicalItemTranslateY = 0;
            this.lastPhysicalItemTranslateY = 0;

            this.requestInProgress = false;

            // Reference to current item
            this.target = null;
            this.targetBCR = null;
            this.targetX = 0;
            this.startX = 0;
            this.currentX = 0;
            this.translateX = 0;
            this.draggingItem = false;

            // Create element to force scroll
            this.scrollRunway = document.createElement('div');
            this.scrollRunwayEndBefore = 0;
            this.scrollRunwayEnd = 0;
            this.scrollRunway.style.position = 'absolute';
            this.scrollRunway.style.height = '1px';
            this.scrollRunway.style.width = '1px';
            this.scrollRunway.style.transition = 'transform 0.2s';
            this.scroller.appendChild(this.scrollRunway);

            this.previousScrollTop = 0;

            this.itemsRemovedInSuccession = 0;

            this.addEventListeners();

            this.onResize();
            this.loadItems();
        }

        _createClass(InfiniteScroller, [{
            key: 'addEventListeners',
            value: function addEventListeners() {
                var _this = this;

                window.addEventListener('resize', function (e) {
                    return _this.onResize(e);
                });

                this.scroller.addEventListener('scroll', function (e) {
                    return _this.onScroll(e);
                });
            }
        }, {
            key: 'onResize',
            value: function onResize() {
                // On resize need to recalculate the translateY values for the elements
                var loadingItem = this.dataSource.createLoadingElement();
                this.scroller.appendChild(loadingItem);
                this.loadingItemHeight = loadingItem.offsetHeight;
                this.loadingItemWidth = loadingItem.offsetWidth;
                this.scroller.removeChild(loadingItem);

                // this.onScroll();
            }

            /**
             * It then updates the visible
             * elements, requesting more items from the dataSource if we have scrolled
             * past the end of currently available content.
             */

        }, {
            key: 'onScroll',
            value: function onScroll() {
                if (this.requestInProgress) {
                    return;
                }

                var delta = this.scroller.scrollTop - this.previousScrollTop;
                this.previousScrollTop = this.scroller.scrollTop;

                /**
                 * if delta is greater than 0 then user is scrolling down
                 */
                if (delta > 0) {
                    var actualLastPhysicalItemTranslateY = this.lastPhysicalItemTranslateY - (this.lastPhysicalItem.offsetHeight + 10);
                    var proximityToLastPhysicalItem = actualLastPhysicalItemTranslateY - (this.scroller.scrollTop + this.scroller.offsetHeight);

                    if (!this.requestInProgress && proximityToLastPhysicalItem < this.PROXIMITY_BOUNDARY) {
                        this.loadItems();
                    }
                } else if (delta < 0) {
                    var proximityToFirstPhysicalItem = this.scroller.scrollTop - this.firstPhysicalItemTranslateY;

                    if (!this.requestInProgress && this.firstPhysicalItemIndex !== 0 && proximityToFirstPhysicalItem < this.PROXIMITY_BOUNDARY) {
                        this.loadItemsUp();
                    }
                }
            }
        }, {
            key: 'loadItems',
            value: function loadItems() {
                var _this2 = this;

                this.requestInProgress = true;

                var loadingHeight = this.lastPhysicalItemTranslateY;

                // instead of appending 10 times, just append once
                // let addingElems = false;
                // const frag = document.createDocumentFragment();

                // Loading items
                for (var i = 0; i < this.PAGE_SIZE; i += 1) {
                    var hasLoadingItem = this.loadingItems[i];
                    var loadingItem = hasLoadingItem ? this.loadingItems[i] : this.dataSource.createLoadingElement();

                    loadingItem.style.position = 'absolute';
                    loadingItem.style.transform = 'translateY(' + loadingHeight + 'px)';
                    loadingItem.style.width = '92%';
                    loadingItem.classList.remove('invisible');

                    // If loading item not in DOM then add it
                    if (!hasLoadingItem) {
                        // addingElems = true;
                        // frag.appendChild(loadingItem);
                        this.scroller.appendChild(loadingItem);
                    }

                    this.loadingItems[i] = loadingItem;

                    loadingHeight += this.loadingItemHeight + 10; // loadingHeight is more of loadingTranslateYValue
                }

                // instead of appending 10 times, just append once
                // if (addingElems) {
                //     this.scroller.appendChild(frag);
                // }

                var nextIndexToPopulate = this.lastPhysicalItemIndex + 1;
                // Check the cache
                if (this.itemsCacheData[nextIndexToPopulate]) {
                    // use cache to populate items
                    this.populateItems(this.itemsCacheData.slice(nextIndexToPopulate, nextIndexToPopulate + 10), true);
                } else {
                    // 10 items
                    // this.dataSource.next().then((response) => {
                    //     this.populateItems(response, false);
                    // });

                    /* eslint-disable no-console */
                    this.dataSource.getStyles().then(function (response) {
                        console.log('Styles: ', response);
                    });

                    this.dataSource.getCategories().then(function (response) {
                        console.log('Categories: ', response);
                    });

                    this.dataSource.getBeer().then(function (response) {
                        console.log('Beer for Style 1: ', response);
                        _this2.populateItems(response, false);
                    });
                }
            }
        }, {
            key: 'populateItems',
            value: function populateItems(items, fromCache) {
                var currentCacheDataLength = this.itemsCacheData.length;
                var nextIndexToPopulate = this.lastPhysicalItemIndex + 1;

                // let itemTranslateY = 0;
                var itemTranslateY = this.lastPhysicalItemTranslateY;

                for (var i = 0; i < items.length; i += 1) {

                    if (this.loadingItems[i]) {
                        this.loadingItems[i].classList.add('invisible');
                    }

                    var itemIndex = (nextIndexToPopulate + i) % this.PHYSICAL_ITEMS;
                    var hasReusableItem = this.physicalItems[itemIndex];
                    var item = hasReusableItem ? this.dataSource.render(items[i], this.physicalItems[itemIndex]) : this.dataSource.render(items[i]);

                    item.style.position = 'absolute';
                    item.style.transform = 'translateY(' + itemTranslateY + 'px)';
                    item.dataset.translateY = itemTranslateY;
                    item.style.width = '92%';

                    if (!hasReusableItem) {
                        this.scroller.appendChild(item);
                    }

                    // We need to show right scrollbar size
                    if (!fromCache) {
                        this.scrollRunwayEnd += item.offsetHeight + 10; // make 10 a constant
                    }
                    itemTranslateY += item.offsetHeight + 10;

                    this.physicalItems[itemIndex] = item;
                    // this.itemsCacheData.push(items[i]);
                    this.itemsCacheData[currentCacheDataLength + i] = items[i];
                }

                // This uses the updated physicalItemIndex props
                this.calculatePhysicalItemsIndex(items.length);

                // Update runway translate to update scrollbar
                this.scrollRunway.style.transform = 'translate(0,' + this.scrollRunwayEnd + 'px)';
                this.requestInProgress = false;
            }
        }, {
            key: 'loadItemsUp',
            value: function loadItemsUp() {
                this.requestInProgress = true;

                var loadingItemTranslateY = this.firstPhysicalItemTranslateY;

                for (var i = 9; i >= 0; i -= 1) {

                    var hasLoadingItem = this.loadingItems[i];
                    var loadingItem = hasLoadingItem ? this.loadingItems[i] : this.dataSource.createLoadingElement();

                    loadingItem.style.position = 'absolute';
                    loadingItem.style.transform = 'translateY(' + loadingItemTranslateY + 'px)';
                    loadingItem.style.width = '92%';
                    loadingItem.classList.remove('invisible');

                    // If loading item not in DOM then add it
                    if (!hasLoadingItem) {
                        // addingElems = true;
                        // frag.appendChild(loadingItem);
                        this.scroller.appendChild(loadingItem);
                    }

                    this.loadingItems[i] = loadingItem;

                    loadingItemTranslateY -= this.loadingItemHeight + 10;
                }

                this.populateItemsTop();
            }
        }, {
            key: 'populateItemsTop',
            value: function populateItemsTop() {

                var itemBeforeFirstPhysicalItemIndex = this.firstPhysicalItemIndex - 1;

                var itemTranslateY = this.firstPhysicalItemTranslateY;

                for (var i = itemBeforeFirstPhysicalItemIndex; i > itemBeforeFirstPhysicalItemIndex - 10; i -= 1) {

                    if (this.loadingItems[i % 10]) {
                        this.loadingItems[i % 10].classList.add('invisible');
                    }

                    var reusableItemIndex = i % this.PHYSICAL_ITEMS;
                    var hasItem = this.physicalItems[reusableItemIndex];
                    var item = hasItem ? this.dataSource.render(this.itemsCacheData[i], this.physicalItems[reusableItemIndex]) : this.dataSource.render(this.itemsCacheData[i]);

                    item.style.position = 'absolute';
                    item.style.transform = 'translateY(' + itemTranslateY + 'px)';
                    // We need these values to animate elements when removed
                    item.dataset.translateY = itemTranslateY;
                    item.style.width = '92%';

                    // this should never go inside when scrolling up otherwise we messed up
                    if (!hasItem) {
                        this.scroller.appendChild(item);
                    }

                    itemTranslateY -= item.offsetHeight + 10;

                    this.physicalItems[reusableItemIndex] = item;
                }

                this.calculatePhysicalItemsIndex(-10);
                this.requestInProgress = false;
            }
        }, {
            key: 'calculatePhysicalItemsIndex',
            value: function calculatePhysicalItemsIndex(itemsLength) {
                this.lastPhysicalItemIndex += itemsLength;
                this.firstPhysicalItemIndex = Math.max(0, this.lastPhysicalItemIndex - (this.PHYSICAL_ITEMS - 1));
                this.middlePhysicalItemIndex = this.firstPhysicalItemIndex + (this.lastPhysicalItemIndex - this.firstPhysicalItemIndex + 1) / 2;

                this.firstPhysicalItem = this.physicalItems[this.firstPhysicalItemIndex % this.PHYSICAL_ITEMS] || this.physicalItems[(this.firstPhysicalItemIndex + this.itemsRemovedInSuccession) % this.PHYSICAL_ITEMS];
                this.lastPhysicalItem = this.physicalItems[this.lastPhysicalItemIndex % this.PHYSICAL_ITEMS] || this.physicalItems[(this.lastPhysicalItemIndex - this.itemsRemovedInSuccession) % this.PHYSICAL_ITEMS];

                // this is used for the next
                this.firstPhysicalItemTranslateY = parseInt(this.firstPhysicalItem.dataset.translateY, 10) - (this.firstPhysicalItem.offsetHeight + 10);
                this.lastPhysicalItemTranslateY = parseInt(this.lastPhysicalItem.dataset.translateY, 10) + (this.lastPhysicalItem.offsetHeight + 10);

                this.itemsRemovedInSuccession = 0;
            }
        }]);

        return InfiniteScroller;
    }();

    return InfiniteScroller;
});
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

define('components/overflow-menu', [], function () {
    'use strict';

    var OverflowMenu = function () {
        function OverflowMenu() {
            _classCallCheck(this, OverflowMenu);

            this.el = document.querySelector('.js-side-nav');
            this.menuShowEl = document.querySelector('.js-menu-show');
            this.menuHideEl = document.querySelector('.js-menu-hide');
            this.sideNavContainerEl = document.querySelector('.js-side-nav-container');

            // this.startX = 0;
            // this.currentX = 0;
            this.startY = 0;
            this.currentY = 0;
            this.touchingSideNav = false;

            this.supportsPassive = undefined;
            this.addEventListeners();
        }

        _createClass(OverflowMenu, [{
            key: 'addEventListeners',
            value: function addEventListeners() {
                var _this = this;

                this.menuShowEl.addEventListener('click', function () {
                    return _this.showSideNav();
                });
                this.menuHideEl.addEventListener('click', function () {
                    return _this.hideSideNav();
                });
                this.el.addEventListener('click', function () {
                    return _this.hideSideNav();
                });
                this.sideNavContainerEl.addEventListener('click', function (e) {
                    return _this.blockClicks(e);
                });

                this.el.addEventListener('touchstart', function (e) {
                    return _this.onTouchStart(e);
                });
                this.el.addEventListener('touchmove', function (e) {
                    return _this.onTouchMove(e);
                });
                this.el.addEventListener('touchend', function (e) {
                    return _this.onTouchEnd(e);
                });
            }
        }, {
            key: 'onTouchStart',
            value: function onTouchStart(e) {
                var _this2 = this;

                if (!this.el.classList.contains('side-nav--visible')) {
                    return;
                }

                // this.startX = e.touches[0].pageX;
                // this.currentX = this.startX;

                this.startY = e.touches[0].pageY;
                this.currentY = this.startY;

                this.touchingSideNav = true;
                requestAnimationFrame(function () {
                    return _this2.update();
                });
            }
        }, {
            key: 'onTouchMove',
            value: function onTouchMove(e) {
                if (!this.touchingSideNav) {
                    return;
                }

                // this.currentX = e.touches[0].pageX;
                this.currentY = e.touches[0].pageY;

                /**
                 * Instead of updating the translate here we make use of requestanimationframe
                 * Since it loads in a loop, and requestanimationFrame was called in touchstart
                 */
                // const translateX = Math.min(0, this.currentX - this.startX);
                // this.sideNavContainerEl.style.transform = `translateX(${translateX}px)`;
            }
        }, {
            key: 'onTouchEnd',
            value: function onTouchEnd() {
                if (!this.touchingSideNav) {
                    return;
                }

                this.touchingSideNav = false;

                // const translateX = Math.min(0, this.currentX - this.startX);
                var translateY = Math.max(0, this.currentY - this.startY);

                // const sideNavContainerWidth = this.sideNavContainerEl.offsetWidth;
                // const absTranslateX = Math.abs(translateX);

                var sideNavContainerHeight = this.sideNavContainerEl.offsetHeight;
                var absTranslateY = Math.abs(translateY);

                this.sideNavContainerEl.style.transform = '';

                // Some elasticity
                // if (absTranslateX > (sideNavContainerWidth / 3)) {
                //     this.hideSideNav();
                // } else {
                //     this.showSideNav();
                // }

                // Some elasticity
                if (absTranslateY > sideNavContainerHeight / 3) {
                    this.hideSideNav();
                } else {
                    this.showSideNav();
                }
            }
        }, {
            key: 'update',
            value: function update() {
                var _this3 = this;

                if (!this.touchingSideNav) {
                    return;
                }

                requestAnimationFrame(function () {
                    return _this3.update();
                });

                // const translateX = Math.min(0, this.currentX - this.startX);
                // this.sideNavContainerEl.style.transform = `translateX(${translateX}px)`;

                var translateY = Math.max(0, this.currentY - this.startY);
                this.sideNavContainerEl.style.transform = 'translateY(' + translateY + 'px)';
            }

            /**
             * this.el has the backdrop which hides the nav, we need to prevent hiding the menu
             * when the container is clicked.
             */

        }, {
            key: 'blockClicks',
            value: function blockClicks(e) {
                /**
                 * We stop the propagation to call hideNav
                 */
                e.stopPropagation();
            }
        }, {
            key: 'onTransitionEnd',
            value: function onTransitionEnd() {
                var _this4 = this;

                this.el.classList.remove('side-nav--animatable');
                this.el.removeEventListener('transitionend', function () {
                    return _this4.onTransitionEnd();
                });
            }
        }, {
            key: 'showSideNav',
            value: function showSideNav() {
                var _this5 = this;

                this.el.classList.add('side-nav--visible');
                this.el.classList.add('side-nav--animatable');
                this.el.addEventListener('transitionend', function () {
                    return _this5.onTransitionEnd();
                });
            }
        }, {
            key: 'hideSideNav',
            value: function hideSideNav() {
                var _this6 = this;

                this.el.classList.remove('side-nav--visible');
                this.el.classList.add('side-nav--animatable');
                this.el.addEventListener('transitionend', function () {
                    return _this6.onTransitionEnd();
                });
            }
        }]);

        return OverflowMenu;
    }();

    return OverflowMenu;
});
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

define('datasource/beer', [], function () {
    'use strict';

    var CORS_PROXY = 'https://crossorigin.me/';
    var API_KEY = 'a17db91bc77bfdd0d14b4053c5cc0a51';
    var STYLES_ENDPOINT = '/styles';
    var CATEGORIES_ENDPOINT = '/categories';

    var Beer = function () {
        function Beer(options) {
            _classCallCheck(this, Beer);

            options || (options = {});

            this.loadingTemplate = document.querySelector('#templates .scroller__item--loading');
            this.beerTemplate = document.querySelector('#templates .scroller__item');

            this.url = options.url;
            this.menuEndpoint = options.menuEndpoint;
            this.beersEndpoint = options.beersEndpoint;

            this.menuUrl = '' + this.url + this.menuEndpoint;
            this.beerUrl = '' + this.url + this.beersEndpoint;

            this.nextItem = 0;

            this.nextPageToken = null;
        }

        /**
         * Fetch items from datasource.
         */


        _createClass(Beer, [{
            key: 'fetch',
            value: function fetch(obj) {
                return new Promise(function (resolve, reject) {

                    var params = obj.params;
                    if (params && (typeof params === 'undefined' ? 'undefined' : _typeof(params)) === 'object') {
                        params = Object.keys(params).map(function (key) {
                            return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                        }).join('&');
                    }

                    var url = params ? obj.url + '?' + params : obj.url;

                    var xhr = new XMLHttpRequest();
                    xhr.open(obj.method || 'GET', url);

                    xhr.onload = function () {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(xhr.response);
                        } else {
                            reject(xhr.statusText);
                        }
                    };

                    xhr.onerror = function () {
                        reject(xhr.statusText);
                    };

                    // let params = obj.params;
                    // if (params && typeof params === 'object') {
                    //     params = Object.keys(params).map((key) => {
                    //         return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                    //     }).join('&');
                    // }
                    xhr.send();
                });
            }
        }, {
            key: 'getStyles',
            value: function getStyles() {
                var options = {
                    method: 'GET',
                    url: '' + CORS_PROXY + this.menuUrl + STYLES_ENDPOINT + '?key=' + API_KEY
                };

                return this.fetch(options).then(function (response) {
                    var jsonResponse = JSON.parse(response);
                    return jsonResponse.data || [];
                });
            }
        }, {
            key: 'getCategories',
            value: function getCategories() {
                var options = {
                    method: 'GET',
                    url: '' + CORS_PROXY + this.menuUrl + CATEGORIES_ENDPOINT + '?key=' + API_KEY
                };

                return this.fetch(options).then(function (response) {
                    var jsonResponse = JSON.parse(response);
                    return jsonResponse.data || [];
                });
            }
        }, {
            key: 'getBeer',
            value: function getBeer() {
                var _this = this;

                var options = {
                    method: 'GET',
                    url: '' + CORS_PROXY + this.beerUrl + '?key=' + API_KEY
                };

                if (this.nextPageToken) {
                    // options.params = {
                    //     styleId: 1
                    // };
                    Object.assign(options, {
                        params: {
                            styleId: 1
                        }
                    });
                }

                return this.fetch(options).then(function (response) {
                    var jsonResponse = JSON.parse(response);
                    _this.nextPageToken = jsonResponse.pageToken;
                    return jsonResponse.data || [];
                });
            }

            // next() {
            //     let options = {
            //         method: 'GET',
            //         url: this.dataUrl
            //     };

            //     if (this.nextPageToken) {
            //         options.params = {
            //             pageToken: this.nextPageToken
            //         };
            //         // Object.assign(options, {
            //         //     params: {
            //         //         pageToken: this.nextPageToken
            //         //     }
            //         // });
            //     }

            //     return this.fetch(options).then((response) => {
            //         let jsonResponse = JSON.parse(response);
            //         this.nextPageToken = jsonResponse.pageToken;
            //         return jsonResponse.messages;
            //     });

            //     // return this.fetch(options);
            // }

            /**
             * Create a loading element, all loading elements are identical
             */

        }, {
            key: 'createLoadingElement',
            value: function createLoadingElement() {
                return this.loadingTemplate.cloneNode(true);
            }

            /**
             * Render an item, reusing the provided div if provided
             */

        }, {
            key: 'render',
            value: function render(item, div) {
                div = div || this.beerTemplate.cloneNode(true);

                div.dataset.id = item.id;

                div.querySelector('.card__title').textContent = item.name;
                // div.querySelector('.card__subtitle').textContent = this.timeSince(new Date(item.updated)); //item.updated.toString();
                div.querySelector('.card__subtitle').textContent = item.style.shortName;
                div.querySelector('.card__note').textContent = item.abv + '% ABV' + (item.ibu ? ', ' + item.ibu + ' IBU' : '');
                div.querySelector('.card__content').textContent = item.description;

                return div;
            }
        }, {
            key: 'timeSince',
            value: function timeSince(date) {
                if ((typeof date === 'undefined' ? 'undefined' : _typeof(date)) !== 'object') {
                    date = new Date(date);
                }

                var seconds = Math.floor((new Date() - date) / 1000),
                    interval = Math.floor(seconds / 31536000);

                if (interval >= 1) {
                    return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
                }

                interval = Math.floor(seconds / 2592000);
                if (interval >= 1) {
                    return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
                }

                interval = Math.floor(seconds / 86400);
                if (interval >= 1) {
                    return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
                }

                interval = Math.floor(seconds / 3600);
                if (interval >= 1) {
                    return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
                }

                interval = Math.floor(seconds / 3600);
                if (interval >= 1) {
                    return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
                }

                return interval + ' second' + (interval > 1 ? 's' : '') + ' ago';
            }
        }]);

        return Beer;
    }();

    return Beer;
});