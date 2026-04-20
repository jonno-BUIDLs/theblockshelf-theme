/* =============================================================================
   blockshelf-pdp.js
   -----------------------------------------------------------------------------
   Progressive-enhancement script for the PDP. Two features:

   1. Sticky buy bar visibility
        Shows `.bs-sticky-buy` only once the merchant's buy column has scrolled
        past the top of the viewport. Uses IntersectionObserver with a sentinel
        element placed at the bottom of the buy block.

   2. "Stack-in-cart" animation
        When any `[data-bs-stack-trigger]` button (Add to cart inside the main
        form OR the sticky bar) is submitted, we clone the product's featured
        media and animate it into the cart icon in the header. Fallback: if
        either end of the animation isn't found, we skip silently — the add
        still proceeds.

   The script is self-contained and loads at end of body via theme.liquid
   injection. No deps on Harmony's JS.
   ========================================================================== */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  var doc = document;

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Sticky buy bar visibility --------------------------------- */

  function initStickyBuy() {
    var bar = doc.querySelector('[data-bs-sticky-buy]');
    if (!bar) return;

    // Sentinel: bottom of the main buy column. We prefer Harmony's
    // .product__info / .product__info-container; fall back to the AddToCart
    // button's parent.
    var sentinel =
      doc.querySelector('.product__info-container .buy-buttons-block') ||
      doc.querySelector('.product__info-container') ||
      doc.querySelector('.buy-buttons-block') ||
      doc.querySelector('[data-bs-main-buy-end]');

    if (!sentinel) return;

    if (!('IntersectionObserver' in window)) {
      // Old browser — just show always once user has scrolled a bit.
      window.addEventListener('scroll', function () {
        if (window.scrollY > 600) bar.classList.add('is-visible');
        else bar.classList.remove('is-visible');
      }, { passive: true });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        // When the main buy block is OFF screen (above the viewport), show the bar.
        if (e.boundingClientRect.top < 0 && !e.isIntersecting) {
          bar.classList.add('is-visible');
          bar.setAttribute('aria-hidden', 'false');
        } else if (e.isIntersecting) {
          bar.classList.remove('is-visible');
          bar.setAttribute('aria-hidden', 'true');
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -100% 0px' });

    io.observe(sentinel);
  }

  /* ---------- 2. Stack-in-cart animation ----------------------------------- */

  function getCartTarget() {
    // Try a few common Harmony cart-icon selectors in order.
    return (
      doc.querySelector('[data-cart-count]') ||
      doc.querySelector('.header__cart') ||
      doc.querySelector('a[href$="/cart"]') ||
      doc.querySelector('[aria-label*="cart" i]')
    );
  }

  function getSourceImage(trigger) {
    // Prefer an image inside the sticky bar when triggered from there.
    var scope = trigger.closest('[data-bs-sticky-buy]');
    if (scope) {
      var simg = scope.querySelector('img');
      if (simg) return simg;
    }
    // Else use the main product image (first .product__media img).
    return (
      doc.querySelector('.product__media-item.is-active img') ||
      doc.querySelector('.product__media img') ||
      doc.querySelector('.media img')
    );
  }

  function flyToCart(trigger) {
    if (prefersReduced) return;
    var src = getSourceImage(trigger);
    var dest = getCartTarget();
    if (!src || !dest) return;

    var srcRect  = src.getBoundingClientRect();
    var destRect = dest.getBoundingClientRect();

    // Clone the image into a floating ghost layer.
    var ghost = doc.createElement('div');
    ghost.className = 'bs-fly-ghost';
    ghost.style.cssText =
      'position:fixed;left:' + srcRect.left + 'px;top:' + srcRect.top + 'px;' +
      'width:' + srcRect.width + 'px;height:' + srcRect.height + 'px;' +
      'z-index:9998;pointer-events:none;will-change:transform,opacity;' +
      'border:1px solid rgba(250,250,250,0.18);background:#0a0a0a;' +
      'overflow:hidden;';

    var ghostImg = doc.createElement('img');
    ghostImg.src = src.currentSrc || src.src;
    ghostImg.alt = '';
    ghostImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    ghost.appendChild(ghostImg);
    doc.body.appendChild(ghost);

    // Compute deltas.
    var destCenterX = destRect.left + destRect.width / 2;
    var destCenterY = destRect.top  + destRect.height / 2;
    var srcCenterX  = srcRect.left  + srcRect.width / 2;
    var srcCenterY  = srcRect.top   + srcRect.height / 2;
    var dx = destCenterX - srcCenterX;
    var dy = destCenterY - srcCenterY;

    // Animate via WAAPI — two-step with a mid-arc for character.
    var anim = ghost.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)',  opacity: 1 },
        { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.15) + 'px) scale(0.55) rotate(-4deg)',
          opacity: 0.95, offset: 0.55 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.12) rotate(6deg)',
          opacity: 0 }
      ],
      {
        duration: 720,
        easing: 'cubic-bezier(0.6, 0, 0.2, 1)',
        fill: 'forwards'
      }
    );

    anim.addEventListener('finish', function () {
      ghost.remove();
      // Punch the cart icon once the ghost lands.
      dest.classList.add('bs-cart-bump');
      setTimeout(function () { dest.classList.remove('bs-cart-bump'); }, 400);
    });
  }

  function initStackInCart() {
    doc.addEventListener('click', function (e) {
      var t = e.target.closest('[data-bs-stack-trigger], product-form [type="submit"], .product-form__submit');
      if (!t) return;

      // Only fire if the submit is going to succeed — if the form has a disabled
      // state (sold out, missing variant), skip.
      if (t.disabled) return;

      // Fire the animation. The form submission continues in parallel —
      // Harmony's async add-to-cart finishes ~300–600ms later, so by the time
      // the ghost lands, the cart count has updated.
      flyToCart(t);
    }, { passive: true });
  }

  /* ---------- Reveal-on-scroll (shared util) ------------------------------- */

  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      doc.querySelectorAll('.bs-reveal').forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    doc.querySelectorAll('.bs-reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Boot --------------------------------------------------------- */

  function boot() {
    initStickyBuy();
    initStackInCart();
    initReveal();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
