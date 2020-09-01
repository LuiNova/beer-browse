define('components/overflow-menu', [
], function(
    ) {
    'use strict';
    
    class OverflowMenu {

        constructor() {
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

        addEventListeners() {
            this.menuShowEl.addEventListener('click', () => this.showSideNav());
            this.menuHideEl.addEventListener('click', () => this.hideSideNav());
            this.el.addEventListener('click', () => this.hideSideNav());
            this.sideNavContainerEl.addEventListener('click', (e) => this.blockClicks(e));

            this.el.addEventListener('touchstart', (e) => this.onTouchStart(e));
            this.el.addEventListener('touchmove', (e) => this.onTouchMove(e));
            this.el.addEventListener('touchend', (e) => this.onTouchEnd(e));
        }

        onTouchStart(e) {
            if (!this.el.classList.contains('side-nav--visible')) {
                return;
            }

            // this.startX = e.touches[0].pageX;
            // this.currentX = this.startX;

            this.startY = e.touches[0].pageY;
            this.currentY = this.startY;

            this.touchingSideNav = true;
            requestAnimationFrame(() => this.update());
        }

        onTouchMove(e) {
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

        onTouchEnd() {
            if (!this.touchingSideNav) {
                return;
            }

            this.touchingSideNav = false;

            // const translateX = Math.min(0, this.currentX - this.startX);
            const translateY = Math.max(0, this.currentY - this.startY);
            
            // const sideNavContainerWidth = this.sideNavContainerEl.offsetWidth;
            // const absTranslateX = Math.abs(translateX);

            const sideNavContainerHeight = this.sideNavContainerEl.offsetHeight;
            const absTranslateY = Math.abs(translateY);

            this.sideNavContainerEl.style.transform = '';

            // Some elasticity
            // if (absTranslateX > (sideNavContainerWidth / 3)) {
            //     this.hideSideNav();
            // } else {
            //     this.showSideNav();
            // }

            // Some elasticity
            if (absTranslateY > (sideNavContainerHeight / 3)) {
                this.hideSideNav();
            } else {
                this.showSideNav();
            }
        }

        update() {
            if (!this.touchingSideNav) {
                return;
            }

            requestAnimationFrame(() => this.update());

            // const translateX = Math.min(0, this.currentX - this.startX);
            // this.sideNavContainerEl.style.transform = `translateX(${translateX}px)`;

            const translateY = Math.max(0, this.currentY - this.startY);
            this.sideNavContainerEl.style.transform = `translateY(${translateY}px)`;
        }

        /**
         * this.el has the backdrop which hides the nav, we need to prevent hiding the menu
         * when the container is clicked.
         */
        blockClicks(e) {
            /**
             * We stop the propagation to call hideNav
             */
            e.stopPropagation();
        }

        onTransitionEnd() {
            this.el.classList.remove('side-nav--animatable');
            this.el.removeEventListener('transitionend', () => this.onTransitionEnd());
        }

        showSideNav() {
            this.el.classList.add('side-nav--visible');
            this.el.classList.add('side-nav--animatable');
            this.el.addEventListener('transitionend', () => this.onTransitionEnd());
        }

        hideSideNav() {
            this.el.classList.remove('side-nav--visible');
            this.el.classList.add('side-nav--animatable');
            this.el.addEventListener('transitionend', () => this.onTransitionEnd());
        }
    }

    return OverflowMenu;
});