define('main', [
    'components/overflow-menu',
    'components/infinite-scroller',
    'datasource/beer'
], function(
        OverflowMenu,
        InfiniteScroller,
        Beer
    ) {
    'use strict';
    
    return {
        init: function() {
            /* eslint-disable no-console */
            console.log('App started');

            new OverflowMenu();

            const scroller = document.querySelector('#beers');
            const beerSource = new Beer({
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