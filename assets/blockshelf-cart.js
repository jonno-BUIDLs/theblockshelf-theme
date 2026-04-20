/* =============================================================================
   blockshelf-cart.js
   -----------------------------------------------------------------------------
   Cart drawer behaviour + AJAX cart for The Blockshelf.

   Features:
   1. Cart drawer show/hide
        - Bottom-sheet slides up, scrim fades in.
        - Opens on: 'cart:open' custom event, add-to-cart intercept,
          explicit [data-bs-cart-open] trigger.
        - Auto-closes after `data-auto-close-ms` (default 2000ms) once opened
          by add-to-cart. Hover / focus / any click inside the sheet resets
          the timer. User-initiated opens (cart icon click) do NOT auto-close.
        - Close on: scrim click, [data-bs-cart-close] click, Esc.

   2. Add-to-cart interception
        Hijacks product-form submissions (main PDP form, sticky buy bar,
        quick-adds). Posts to /cart/add.js, then refreshes the drawer
        section via Shopify Section Rendering API, opens the drawer,
        starts the auto-close timer. Fails gracefully → falls back to
        native form submit.

   3. Line-item remove (drawer + /cart page)
        POST /cart/change.js with quantity=0, then swap the drawer section's
        HTML in place. Subtotal + count + free-ship bar all come for the
        ride.

   4. Quantity steppers (/cart page only)
        Debounced POST /cart/change.js on input change.

   Runs last; progressive enhancement. If JS fails, native forms still work
   (the checkout button is a real submit, the drawer just doesn't slide up).
   ========================================================================== */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  var doc = document;
  var CART_DRAWER_ID = 'cart-drawer';
  var MONEY_FORMAT = (window.theme && window.theme.moneyFormat) || '${{amount}}';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Utilities --------------------------------------------------- */

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function fetchJSON(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign(
      { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      opts.headers || {}
    );
    return fetch(url, opts).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw e; });
      return r.json();
    });
  }

  /* ---------- 1. Drawer open/close --------------------------------------- */

  var FOCUSABLE_SEL = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  var CartDrawer = {
    el: null,
    autoCloseTimer: null,
    autoCloseDelay: 2000,
    isOpen: false,
    isInteractive: false,
    _openerEl: null,
    _trapKeydown: null,

    init: function () {
      this.el = doc.getElementById(CART_DRAWER_ID);
      if (!this.el) return;

      this.autoCloseDelay = parseInt(this.el.getAttribute('data-auto-close-ms'), 10) || 2000;

      // Scrim + close buttons
      this.el.addEventListener('click', function (e) {
        if (e.target.closest('[data-bs-cart-close]')) {
          this.close();
        }
      }.bind(this));

      // Reset auto-close timer on any interaction inside the sheet
      var sheet = $('.bs-cart-drawer__sheet', this.el);
      if (sheet) {
        ['mouseenter', 'focusin', 'pointerdown', 'touchstart'].forEach(function (ev) {
          sheet.addEventListener(ev, function () {
            this.isInteractive = true;
            this.clearAutoClose();
          }.bind(this), { passive: true });
        }.bind(this));
      }

      // Esc to close
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && this.isOpen) this.close();
      }.bind(this));

      // Explicit openers (cart icon)
      doc.addEventListener('click', function (e) {
        var t = e.target.closest('[data-bs-cart-open]');
        if (!t) return;
        e.preventDefault();
        this.open({ autoClose: false });
      }.bind(this));

      // Listen for global events (compat with Harmony + our own code)
      doc.addEventListener('cart:open', function () { this.open({ autoClose: false }); }.bind(this));
      doc.addEventListener('cart:refresh', function () { this.refresh(); }.bind(this));
    },

    open: function (opts) {
      opts = opts || {};
      if (!this.el) return;
      this._openerEl = doc.activeElement;
      this.el.setAttribute('aria-hidden', 'false');
      this.el.classList.add('is-open');
      doc.body.classList.add('bs-cart-open');
      this.isOpen = true;
      this.isInteractive = false;
      this._buildFocusTrap();

      if (opts.autoClose !== false) {
        this.scheduleAutoClose();
      }
    },

    close: function () {
      if (!this.el) return;
      this.el.setAttribute('aria-hidden', 'true');
      this.el.classList.remove('is-open');
      doc.body.classList.remove('bs-cart-open');
      this.isOpen = false;
      this.clearAutoClose();
      this._removeFocusTrap();
      if (this._openerEl && this._openerEl.focus) {
        this._openerEl.focus();
        this._openerEl = null;
      }
    },

    scheduleAutoClose: function () {
      this.clearAutoClose();
      if (prefersReduced) return;
      // If the user is already hovering/interacting, don't start the timer
      if (this.isInteractive) return;
      this.autoCloseTimer = setTimeout(function () {
        if (!this.isInteractive) this.close();
      }.bind(this), this.autoCloseDelay);

      // Show the countdown visual
      if (this.el) this.el.classList.add('is-auto-closing');
    },

    clearAutoClose: function () {
      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer);
        this.autoCloseTimer = null;
      }
      if (this.el) this.el.classList.remove('is-auto-closing');
    },

    _buildFocusTrap: function () {
      var self = this;
      var el = this.el;
      if (!el) return;

      self._trapKeydown = function (e) {
        if (e.key !== 'Tab') return;
        var nodes = Array.prototype.slice.call(el.querySelectorAll(FOCUSABLE_SEL));
        if (!nodes.length) return;
        var first = nodes[0];
        var last = nodes[nodes.length - 1];
        if (e.shiftKey) {
          if (doc.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (doc.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };

      el.addEventListener('keydown', self._trapKeydown);
      var firstFocusable = el.querySelector(FOCUSABLE_SEL);
      if (firstFocusable) firstFocusable.focus();
    },

    _removeFocusTrap: function () {
      if (this.el && this._trapKeydown) {
        this.el.removeEventListener('keydown', this._trapKeydown);
        this._trapKeydown = null;
      }
    },

    refresh: function () {
      // Pull a fresh render of the cart-drawer section from Shopify's
      // Section Rendering API, then swap innerHTML.
      return fetch('/?section_id=' + CART_DRAWER_ID, { headers: { 'Accept': 'text/html' } })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var temp = doc.createElement('div');
          temp.innerHTML = html.trim();
          var fresh = temp.querySelector('#' + CART_DRAWER_ID);
          if (!fresh || !this.el) return;
          // Replace inner content, keep outer element + listeners
          this.el.innerHTML = fresh.innerHTML;
          this.updateHeaderCount();
        }.bind(this))
        .catch(function () { /* silent */ });
    },

    updateHeaderCount: function () {
      // Fetch cart.js for authoritative count, update any [data-cart-count] elements
      fetchJSON('/cart.js').then(function (cart) {
        $$('[data-cart-count]').forEach(function (el) {
          el.textContent = cart.item_count;
          el.setAttribute('data-count', cart.item_count);
          if (cart.item_count > 0) el.classList.add('has-items');
          else el.classList.remove('has-items');
        });
      }).catch(function () {});
    }
  };

  /* ---------- 2. Add-to-cart interception -------------------------------- */

  function interceptAddToCart() {
    doc.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      // Identify product forms: Harmony uses action="/cart/add" on
      // product-form elements. Be defensive.
      var action = (form.getAttribute('action') || '').split('?')[0];
      if (action.indexOf('/cart/add') === -1) return;

      // Don't intercept if the merchant has explicitly opted out
      if (form.hasAttribute('data-no-ajax')) return;

      e.preventDefault();

      var submit = form.querySelector('[type="submit"]');
      if (submit) submit.setAttribute('disabled', '');

      var fd = new FormData(form);

      fetchJSON('/cart/add.js', { method: 'POST', body: fd })
        .then(function () { return CartDrawer.refresh(); })
        .then(function () {
          CartDrawer.open({ autoClose: true });
        })
        .catch(function (err) {
          // Common failure: variant sold out. Show native error if present.
          var msg = (err && err.description) || (err && err.message) || 'Could not add to cart.';
          var errEl = form.querySelector('[data-bs-form-error]');
          if (errEl) {
            errEl.textContent = msg;
            errEl.hidden = false;
          } else {
            console.warn('[blockshelf-cart]', msg);
          }
        })
        .finally(function () {
          if (submit) submit.removeAttribute('disabled');
        });
    }, true);
  }

  /* ---------- 3. Line-item remove (AJAX) --------------------------------- */

  function wireRemoveHandlers() {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-bs-cart-remove]');
      if (!btn) return;
      e.preventDefault();
      var key = btn.getAttribute('data-line-key');
      if (!key) return;

      var line = btn.closest('[data-bs-cart-line]');
      if (line) line.classList.add('is-removing');

      fetchJSON('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: 0 })
      })
        .then(function () {
          // Refresh drawer
          CartDrawer.refresh();
          // If we're on /cart, also refresh that section
          if (doc.querySelector('[data-bs-cart-page]')) {
            refreshCartPage();
          }
        })
        .catch(function () {
          if (line) line.classList.remove('is-removing');
        });
    });
  }

  /* ---------- 4. Qty steppers (cart page only) --------------------------- */

  function wireQtySteppers() {
    var updateQty = debounce(function (input) {
      var line = input.closest('[data-bs-cart-line]');
      if (!line) return;
      var key = line.getAttribute('data-line-key');
      var qty = parseInt(input.value, 10);
      if (isNaN(qty) || qty < 0) qty = 0;

      line.classList.add('is-updating');

      fetchJSON('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: qty })
      })
        .then(function () {
          CartDrawer.refresh();
          refreshCartPage();
        })
        .catch(function () {
          line.classList.remove('is-updating');
        });
    }, 350);

    doc.addEventListener('click', function (e) {
      var dec = e.target.closest('[data-bs-qty-decrement]');
      var inc = e.target.closest('[data-bs-qty-increment]');
      if (!dec && !inc) return;

      var wrap = (dec || inc).closest('[data-bs-qty-stepper]');
      if (!wrap) return;
      var input = wrap.querySelector('[data-bs-qty-input]');
      if (!input) return;
      var current = parseInt(input.value, 10) || 0;
      input.value = Math.max(0, current + (inc ? 1 : -1));
      updateQty(input);
    });

    doc.addEventListener('change', function (e) {
      if (e.target && e.target.matches && e.target.matches('[data-bs-qty-input]')) {
        updateQty(e.target);
      }
    });
  }

  /* ---------- 5. Upsell add-to-cart ------------------------------------- */

  function wireUpsellButtons() {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-bs-upsell-add]');
      if (!btn) return;

      var variantId = btn.getAttribute('data-variant-id');
      if (!variantId) return;

      var origHtml = btn.innerHTML;
      btn.setAttribute('disabled', '');
      btn.innerHTML = 'Adding&hellip;';

      fetchJSON('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 })
      })
        .then(function () { return CartDrawer.refresh(); })
        .then(function () { refreshCartPage(); })
        .catch(function (err) {
          var msg = (err && err.description) || 'Could not add to cart.';
          console.warn('[blockshelf-cart]', msg);
          btn.innerHTML = origHtml;
          btn.removeAttribute('disabled');
        });
    });
  }

  /* ---------- Refresh /cart page section --------------------------------- */

  function refreshCartPage() {
    var page = doc.querySelector('[data-bs-cart-page]');
    if (!page) return;

    fetch('/cart?section_id=main-cart', { headers: { 'Accept': 'text/html' } })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var temp = doc.createElement('div');
        temp.innerHTML = html.trim();
        var fresh = temp.querySelector('[data-bs-cart-page]');
        if (fresh) page.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});
  }

  /* ---------- Boot ------------------------------------------------------- */

  function boot() {
    CartDrawer.init();
    interceptAddToCart();
    wireRemoveHandlers();
    wireQtySteppers();
    wireUpsellButtons();
    CartDrawer.updateHeaderCount();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose a tiny API for the stack-in-cart animation / other scripts
  window.BlockshelfCart = {
    open: function () { CartDrawer.open({ autoClose: false }); },
    openWithAutoClose: function () { CartDrawer.open({ autoClose: true }); },
    close: function () { CartDrawer.close(); },
    refresh: function () { return CartDrawer.refresh(); }
  };
})();
