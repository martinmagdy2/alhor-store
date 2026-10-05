/* ═══════════════════════════════════════════════════
   ALHOR — assets/js/app.js
   Vanilla JS — cart, wishlist, hero, scene, search, UI
   ═══════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ─── UTILS ─── */
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const on = (el, ev, fn, opts) => el?.addEventListener(ev, fn, opts);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ─── STATE ─── */
  const state = {
    cart: [],           // [{id, name, price, img, qty}]
    wish: new Set(),
    heroIdx: 0,
    heroPaused: false,
  };

  /* ═══════════════════════════════
     HEADER — scroll / shrink
     ═══════════════════════════════ */
  const header = $('#header');
  const topBanner = $('.top-banner');
  let lastY = 0;
  const scrollHeader = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    // The announcement bar is sticky, so the header always sits right below it
    const topBannerH = topBanner ? topBanner.offsetHeight : 0;
    header.style.top = topBannerH + 'px';
    lastY = y;
  };
  on(window, 'resize', scrollHeader, { passive: true });
  on(window, 'scroll', scrollHeader, { passive: true });
  // Initial call
  scrollHeader();

  /* ═══════════════════════════════
     HERO — dual video + controls
     ═══════════════════════════════ */
  (() => {
    const videos = $$('.hero__video');
    if (!videos.length) return;

    let isPaused = false;

    const switchHero = (idx) => {
      if (idx === state.heroIdx) return;
      videos[state.heroIdx].classList.remove('is-active');
      videos[state.heroIdx].pause();
      videos[state.heroIdx].currentTime = 0; // reset
      
      state.heroIdx = idx;
      videos[idx].classList.add('is-active');
      if (!isPaused) videos[idx].play().catch(() => {});
    };

    const nextVideo = () => {
      switchHero((state.heroIdx + 1) % videos.length);
    };

    videos.forEach(v => {
      on(v, 'ended', nextVideo);
    });

    // We no longer have toggles/clips but just in case:
    const toggle = $('#hero-toggle');
    if (toggle) {
      on(toggle, 'click', () => {
        isPaused = !isPaused;
        toggle.classList.toggle('is-paused', isPaused);
        if (isPaused) {
          videos[state.heroIdx].pause();
        } else {
          videos[state.heroIdx].play().catch(() => {});
        }
      });
    }

  })();

  /* ═══════════════════════════════
     RISE / REVEAL — IntersectionObserver
     ═══════════════════════════════ */
  (() => {
    const els = $$('[data-rise], .reveal');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  })();

  /* ═══════════════════════════════
     PRODUCT FILTER — chips
     ═══════════════════════════════ */
  (() => {
    const chips = $$('#feat-chips .chip');
    const grid  = $('#product-grid');
    if (!grid) return;
    const cards = $$('.pcard', grid);

    chips.forEach(c => on(c, 'click', () => {
      chips.forEach(x => x.classList.remove('is-active'));
      c.classList.add('is-active');
      const f = c.dataset.filter;
      cards.forEach(card => {
        let show = false;
        if (f === 'all') show = true;
        else if (f === 'offers') show = card.dataset.offers === 'true';
        else if (f === 'bestseller') show = card.dataset.bestseller === 'true';
        else show = card.dataset.cat === f;
        card.style.display = show ? '' : 'none';
        card.classList.toggle('is-hidden', !show);
      });
    }));
  })();

  /* ═══════════════════════════════
     STORIES / CATEGORIES CAROUSEL
     ═══════════════════════════════ */
  (() => {
    const track = $('#stories-track');
    const prevBtn = $('#stories-btn-prev');
    const nextBtn = $('#stories-btn-next');
    const wrapper = $('.stories-wrapper');
    if (!track) return;

    const updateControls = () => {
      if (!wrapper) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      const currentScroll = Math.abs(track.scrollLeft);
      
      wrapper.classList.toggle('has-scroll-start', currentScroll > 15);
      wrapper.classList.toggle('has-scroll-end', currentScroll < maxScroll - 15);

      if (prevBtn) prevBtn.disabled = currentScroll <= 10;
      if (nextBtn) nextBtn.disabled = currentScroll >= maxScroll - 10;
    };

    on(track, 'scroll', updateControls, { passive: true });
    // Initial check
    setTimeout(updateControls, 100);

    const scrollAmount = 300;
    if (nextBtn) {
      on(nextBtn, 'click', () => {
        const isRtl = document.dir === 'rtl' || getComputedStyle(document.body).direction === 'rtl';
        const delta = isRtl ? -scrollAmount : scrollAmount;
        track.scrollBy({ left: delta, behavior: 'smooth' });
      });
    }

    if (prevBtn) {
      on(prevBtn, 'click', () => {
        const isRtl = document.dir === 'rtl' || getComputedStyle(document.body).direction === 'rtl';
        const delta = isRtl ? scrollAmount : -scrollAmount;
        track.scrollBy({ left: delta, behavior: 'smooth' });
      });
    }

    // Connect story clicks to product filter tabs
    const storyItems = $$('.story-item[data-cat-filter]');
    storyItems.forEach(item => {
      on(item, 'click', () => {
        const filter = item.dataset.catFilter;
        if (!filter) return;
        const targetChip = $(`#feat-chips .chip[data-filter="${filter}"]`);
        if (targetChip) {
          targetChip.click();
        }
      });
    });
  })();

  /* ═══════════════════════════════
     CART
     ═══════════════════════════════ */
  const cartBadges = $$('#cart-badge, #bn-cart .badge');
  const drawer = $('#drawer');
  const drawerItems = $('#drawer-items');
  const drawerTotal = $('#drawer-total');
  const drawerCount = $('#drawer-count');
  const shipRemain = $('#ship-remain');
  const shipBar = $('#ship-bar');
  const freeShipMin = 300;

  const updateCartUI = () => {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = state.couponDiscount ? Math.round(subtotal * state.couponDiscount) : 0;
    const total = Math.max(0, subtotal - discount);

    cartBadges.forEach(b => {
      b.textContent = count;
      b.dataset.empty = count === 0 ? 'true' : 'false';
    });
    if (drawerTotal) drawerTotal.textContent = total.toLocaleString('ar-AE') + ' د.إ';
    if (drawerCount) drawerCount.textContent = `(${count})`;
    if (drawer) drawer.classList.toggle('is-empty', count === 0);

    const discountRow = $('#drawer-discount-row');
    const discountVal = $('#drawer-discount-val');
    if (discountRow && discountVal) {
      if (discount > 0) {
        discountRow.style.display = 'flex';
        discountVal.textContent = `- ${discount.toLocaleString('ar-AE')} د.إ`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    const remain = Math.max(0, freeShipMin - subtotal);
    if (shipRemain) shipRemain.textContent = remain > 0 ? remain.toLocaleString('ar-AE') + ' د.إ' : '🎉 شحن مجاني!';
    if (shipBar) shipBar.style.width = Math.min(100, (subtotal / freeShipMin) * 100) + '%';

    // Render items
    drawerItems.innerHTML = state.cart.map((item, i) => `
      <div class="drawer-item" data-idx="${i}">
        <div class="drawer-item__img"><img src="${item.img}" alt="${item.name}"></div>
        <div class="drawer-item__info">
          <h4 class="drawer-item__name">${item.name}</h4>
          <div class="drawer-item__price">${item.price.toLocaleString('ar-AE')} <small>د.إ</small></div>
          <div class="drawer-item__qty">
            <button class="qty-btn" data-action="dec" aria-label="تقليل"><svg class="icon"><use href="#i-minus"/></svg></button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-action="inc" aria-label="زيادة"><svg class="icon"><use href="#i-plus"/></svg></button>
          </div>
        </div>
        <button class="drawer-item__rm" data-action="remove" aria-label="حذف"><svg class="icon"><use href="#i-trash"/></svg></button>
      </div>
    `).join('');
  };

  const addToCart = (data, silent = false) => {
    const existing = state.cart.find(i => i.id === data.id);
    if (existing) {
      existing.qty++;
    } else {
      state.cart.push({ ...data, qty: 1 });
    }
    updateCartUI();
    if (!silent) showToast(data);
  };

  // Drawer item actions
  on(drawerItems, 'click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const row = btn.closest('.drawer-item');
    const idx = +row.dataset.idx;
    const action = btn.dataset.action;
    if (action === 'inc') state.cart[idx].qty++;
    else if (action === 'dec') {
      state.cart[idx].qty--;
      if (state.cart[idx].qty < 1) state.cart.splice(idx, 1);
    } else if (action === 'remove') {
      state.cart.splice(idx, 1);
    }
    updateCartUI();
  });

  /* ─── Add-to-cart click delegation ─── */
  on(document, 'click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();

    // Find product data from card/article
    const card = btn.closest('[data-id]');
    if (!card) return;

    const data = {
      id: card.dataset.id,
      name: card.dataset.name,
      price: +card.dataset.price,
      img: card.dataset.img,
    };

    addToCart(data);

    // Animate check
    btn.classList.add('is-added');
    setTimeout(() => btn.classList.remove('is-added'), 1400);
  });

  /* ═══════════════════════════════
     WISHLIST
     ═══════════════════════════════ */
  on(document, 'click', (e) => {
    const btn = e.target.closest('[data-wish]');
    if (!btn) return;
    e.preventDefault();
    const pressed = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', !pressed);
    btn.classList.toggle('is-active', !pressed);
  });

  /* ═══════════════════════════════
     TOAST
     ═══════════════════════════════ */
  const toast = $('#toast');
  const toastImg = $('#toast-img img');
  const toastText = $('#toast-text');
  let toastTimer;
  const showToast = (data) => {
    toastImg.src = data.img;
    toastText.textContent = data.name;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
  };
  on($('#toast-view'), 'click', () => {
    toast.classList.remove('is-visible');
    openDrawer();
  });

  /* ═══════════════════════════════
     DRAWER (Cart sidebar)
     ═══════════════════════════════ */
  const backdrop = $('#backdrop');
  const openDrawer = () => {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('no-scroll');
  };
  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  };

  on($('#btn-cart'), 'click', openDrawer);
  on($('#bn-cart'), 'click', openDrawer);
  on($('#drawer-close'), 'click', closeDrawer);
  on($('#drawer-continue'), 'click', closeDrawer);
  on($('#drawer-shop'), 'click', () => {
    closeDrawer();
    document.getElementById('best-sellers')?.scrollIntoView({ behavior: 'smooth' });
  });
  on(backdrop, 'click', () => {
    closeDrawer();
    closeSearch();
    closeMobileSidebar();
  });

  /* ═══════════════════════════════
     SEARCH
     ═══════════════════════════════ */
  const searchPanel = $('#search-panel');
  const searchInput = $('#search-input');
  const searchResults = $('#search-results');
  const searchLabel = $('#search-label');

  const openSearch = () => {
    searchPanel.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('no-scroll');
    setTimeout(() => searchInput.focus(), 250);
  };
  const closeSearch = () => {
    searchPanel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchLabel.textContent = 'عمليات بحث شائعة';
  };

  on($('#btn-search'), 'click', openSearch);
  on($('#bn-search'), 'click', openSearch);
  on($('#search-close'), 'click', closeSearch);

  // Simple client-side search through products
  const products = $$('[data-id][data-name]').map(el => ({
    id: el.dataset.id,
    name: el.dataset.name,
    price: +el.dataset.price,
    img: el.dataset.img,
    cat: el.dataset.cat || '',
  }));
  // Deduplicate by id
  const uniqueProducts = [];
  const seenIds = new Set();
  products.forEach(p => { if (!seenIds.has(p.id)) { seenIds.add(p.id); uniqueProducts.push(p); }});

  on(searchInput, 'input', () => {
    const q = searchInput.value.trim();
    if (!q) {
      searchResults.innerHTML = '';
      searchLabel.textContent = 'عمليات بحث شائعة';
      return;
    }
    const results = uniqueProducts.filter(p => p.name.includes(q));
    searchLabel.textContent = results.length ? `${results.length} نتيجة` : 'لا توجد نتائج';
    searchResults.innerHTML = results.map(p => `
      <a href="#" class="search-hit">
        <div class="search-hit__img"><img src="${p.img}" alt="" loading="lazy"></div>
        <div class="search-hit__info">
          <span class="search-hit__name">${p.name}</span>
          <span class="search-hit__price">${p.price.toLocaleString('ar-AE')} د.إ</span>
        </div>
        <svg class="icon"><use href="#i-arrow-left"/></svg>
      </a>
    `).join('');
  });

  // Popular search chips
  $$('#search-popular .chip').forEach(chip => {
    on(chip, 'click', () => {
      searchInput.value = chip.dataset.q;
      searchInput.dispatchEvent(new Event('input'));
    });
  });

  // Header search bar -> live search dropdown
  (() => {
    const form = $('#header-search');
    const input = $('#header-search-input');
    const dropdown = $('#hsearch-dropdown');
    const resultsContainer = $('#hsearch-results');
    const label = $('#hsearch-label');
    if (!form || !input || !dropdown) return;

    on(input, 'input', () => {
      const q = input.value.trim();
      if (!q) {
        dropdown.style.display = 'none';
        return;
      }
      dropdown.style.display = 'block';
      const results = uniqueProducts.filter(p => p.name.includes(q));
      label.textContent = results.length ? `${results.length} نتيجة` : 'لا توجد نتائج';
      resultsContainer.innerHTML = results.map(p => `
        <a href="#" class="search-hit">
          <div class="search-hit__img"><img src="${p.img}" alt="" loading="lazy"></div>
          <div class="search-hit__info">
            <span class="search-hit__name">${p.name}</span>
            <span class="search-hit__price">${p.price.toLocaleString('ar-AE')} د.إ</span>
          </div>
          <svg class="icon"><use href="#i-arrow-left"/></svg>
        </a>
      `).join('');
    });
    
    on(document, 'click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
    
    on(input, 'focus', () => {
        if (input.value.trim()) dropdown.style.display = 'block';
    });
    
    on(form, 'submit', (e) => { e.preventDefault(); });
  })();

  /* ═══════════════════════════════
     MOBILE SIDEBAR NAVIGATION
     ═══════════════════════════════ */
  const mobileSidebar = $('#mobile-sidebar');
  const openMobileSidebar = () => {
    mobileSidebar?.classList.add('is-open');
    backdrop?.classList.add('is-open');
    document.body.classList.add('no-scroll');
  };
  const closeMobileSidebar = () => {
    mobileSidebar?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  };

  on($('#btn-mobile-nav'), 'click', openMobileSidebar);
  on($('#bn-cats'), 'click', openMobileSidebar);
  on($('#sidebar-close'), 'click', closeMobileSidebar);

  // Quick search button inside sidebar
  on($('#sidebar-search-btn'), 'click', () => {
    closeMobileSidebar();
    openSearch();
  });

  // Clicking category items inside sidebar
  $$('.sidebar__nav-item[data-cat-filter], .sidebar__quick-card, .sidebar__util-link').forEach(item => {
    on(item, 'click', () => {
      closeMobileSidebar();
      const filter = item.dataset.catFilter;
      if (filter) {
        const targetChip = $(`#feat-chips .chip[data-filter="${filter}"]`);
        if (targetChip) {
          targetChip.click();
        }
      }
    });
  });

  /* ═══════════════════════════════
     SCENE — Shop the Scene
     ═══════════════════════════════ */
  (() => {
    const pop = $('#scene-pop');
    const popName = $('#pop-name');
    const popCat = $('#pop-cat');
    const popPrice = $('#pop-price');
    const popImg = $('#pop-img');
    const spots = $$('.spot');
    const listBtns = $$('.scene-item');

    const sceneData = [
      { name: 'كرسي رحلات الحر', cat: 'لوازم التخييم', price: '289 د.إ', img: 'assets/img/products/chair.webp' },
      { name: 'طاولة شبك خشب', cat: 'لوازم التخييم', price: '199 د.إ', img: 'assets/img/products/mesh-table.webp' },
      { name: 'كشاف ثلاثي LED', cat: 'إضاءة', price: '179 د.إ', img: 'assets/img/products/tripod-light.webp' },
      { name: 'صندوق تخزين', cat: 'لوازم التخييم', price: '129 د.إ', img: 'assets/img/products/storage-box.webp' },
    ];

    const showPop = (idx) => {
      const d = sceneData[idx];
      popName.textContent = d.name;
      popCat.textContent = d.cat;
      popPrice.textContent = d.price;
      popImg.src = d.img;
      popImg.alt = d.name;

      // Position near the spot
      const spot = spots[idx];
      const frame = $('#scene-frame');
      if (spot && frame) {
        const sRect = spot.getBoundingClientRect();
        const fRect = frame.getBoundingClientRect();
        const x = sRect.left - fRect.left + sRect.width / 2;
        const y = sRect.top - fRect.top + sRect.height;
        pop.style.top = y + 12 + 'px';
        pop.style.left = clamp(x - 120, 10, fRect.width - 260) + 'px';
      }

      pop.classList.add('is-visible');
      spots.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      listBtns.forEach((b, i) => b.classList.toggle('is-active', i === idx));
    };

    spots.forEach((s, i) => on(s, 'click', () => showPop(i)));
    listBtns.forEach((b, i) => on(b, 'click', () => showPop(i)));
    on($('.pop__close'), 'click', () => {
      pop.classList.remove('is-visible');
      spots.forEach(s => s.classList.remove('is-active'));
      listBtns.forEach(b => b.classList.remove('is-active'));
    });
  })();

  /* ═══════════════════════════════
     BESTSELLERS — Rail scroll
     ═══════════════════════════════ */
  (() => {
    const rail = $('#rail');
    const prev = $('#rail-prev');
    const next = $('#rail-next');
    const bar  = $('#rail-bar');
    if (!rail) return;

    const updateNav = () => {
      const { scrollLeft, scrollWidth, clientWidth } = rail;
      // RTL: scrollLeft is negative or 0
      const maxScroll = scrollWidth - clientWidth;
      const absScroll = Math.abs(scrollLeft);
      prev.disabled = absScroll <= 4;
      next.disabled = absScroll >= maxScroll - 4;
      if (bar) bar.style.width = (clientWidth / scrollWidth * 100) + '%';
      if (bar) bar.style.transform = `translateX(${-(absScroll / maxScroll * 100 || 0)}%)`;
    };

    const scrollBy = (dir) => {
      const card = rail.firstElementChild;
      const step = card ? card.offsetWidth + 20 : 300;
      rail.scrollBy({ left: dir * step, behavior: 'smooth' });
    };

    on(prev, 'click', () => scrollBy(1));  // RTL, so positive = scroll right visually
    on(next, 'click', () => scrollBy(-1)); // negative = scroll left visually
    on(rail, 'scroll', updateNav, { passive: true });
    updateNav();
    // Recalc on resize
    on(window, 'resize', updateNav, { passive: true });
  })();

  /* ═══════════════════════════════
     FLASH DEALS — slider arrows + coupon copy
     ═══════════════════════════════ */
  (() => {
    const track = $('#fd-track');
    const prev = $('#fd-prev');
    const next = $('#fd-next');
    if (!track) return;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const pos = Math.abs(track.scrollLeft);
      if (prev) prev.disabled = pos <= 4;
      if (next) next.disabled = pos >= max - 4;
    };
    const step = () => {
      const card = track.firstElementChild;
      return card ? card.offsetWidth + 18 : 300;
    };
    // RTL: scrollLeft is 0 at the start and negative towards the end
    const dirSign = () => (getComputedStyle(track).direction === 'rtl' ? -1 : 1);
    on(next, 'click', () => track.scrollBy({ left: dirSign() * step(), behavior: 'smooth' }));
    on(prev, 'click', () => track.scrollBy({ left: -dirSign() * step(), behavior: 'smooth' }));
    on(track, 'scroll', update, { passive: true });
    on(window, 'resize', update, { passive: true });
    update();

    const coupon = $('#fd-coupon');
    on(coupon, 'click', () => {
      navigator.clipboard?.writeText('ALHOR15');
      coupon.classList.add('is-copied');
      const html = coupon.innerHTML;
      coupon.textContent = 'تم نسخ الكود ✓';
      setTimeout(() => { coupon.innerHTML = html; coupon.classList.remove('is-copied'); }, 1800);
    });
  })();

  /* ═══════════════════════════════
     COLLECTIONS — add whole bundle (15% off)
     ═══════════════════════════════ */
  on(document, 'click', (e) => {
    const btn = e.target.closest('[data-add-bundle]');
    if (!btn) return;
    const wrap = $(btn.dataset.addBundle);
    if (!wrap) return;
    const items = $$('.uc-item', wrap);
    items.forEach(el => addToCart({
      id: el.dataset.id + '-bundle',
      name: el.dataset.name,
      price: +el.dataset.price,
      img: el.dataset.img,
    }, true));
    const first = items[0];
    if (first) showToast({ img: first.dataset.img, name: `تمت إضافة ${items.length} منتجات من «${$('.uc__title', wrap).textContent}»` });
    btn.classList.add('is-added');
    setTimeout(() => btn.classList.remove('is-added'), 1400);
  });

  /* ═══════════════════════════════
     COLLECTIONS CAROUSEL & HOTSPOTS
     ═══════════════════════════════ */
  (() => {
    const slides = $$('.uc-carousel .uc-slide');
    const tabBtns = $$('.uc-nav-bar .uc-tab-btn');
    const counter = $('#uc-slide-counter');
    const prevBtn = $('#uc-prev-btn');
    const nextBtn = $('#uc-next-btn');

    if (!slides.length) return;

    let currentSlide = 0;

    function goToSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentSlide = index;

      // Update slides
      slides.forEach((slide, i) => {
        const isActive = i === currentSlide;
        slide.classList.toggle('is-active', isActive);
        // Reset open hotspots inside
        $$('.hotspot.is-active', slide).forEach(h => h.classList.remove('is-active'));
        $$('.uc-item.is-hotspot-highlighted', slide).forEach(it => it.classList.remove('is-hotspot-highlighted'));
      });

      // Update tabs
      tabBtns.forEach((btn, i) => {
        const isActive = i === currentSlide;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      // Update counter (e.g. 01 / 04)
      if (counter) {
        counter.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      }
    }

    // Tab buttons click
    tabBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => goToSlide(i));
    });

    // Next & Prev arrows
    if (prevBtn) {
      prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
    }

    // Touch swipe support for mobile
    const carouselEl = $('.uc-carousel');
    if (carouselEl) {
      let touchStartX = 0;
      let touchEndX = 0;
      carouselEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      carouselEl.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) {
          if (diff < -50) goToSlide(currentSlide + 1);
          else if (diff > 50) goToSlide(currentSlide - 1);
        }
      }, { passive: true });
    }

    // Hotspot Click & Hover Interactions
    on(document, 'click', (e) => {
      const pin = e.target.closest('.hotspot__pin');
      if (pin) {
        e.stopPropagation();
        const hotspot = pin.closest('.hotspot');
        if (!hotspot) return;

        const isCurrentlyActive = hotspot.classList.contains('is-active');
        const slide = hotspot.closest('.uc-slide');

        // Close all hotspots in current slide
        if (slide) {
          $$('.hotspot.is-active', slide).forEach(h => h.classList.remove('is-active'));
          $$('.uc-item.is-hotspot-highlighted', slide).forEach(it => it.classList.remove('is-hotspot-highlighted'));
        }

        if (!isCurrentlyActive) {
          hotspot.classList.add('is-active');
          const targetId = hotspot.dataset.target;
          if (targetId && slide) {
            const matchedItem = $(`.uc-item[data-id="${targetId}"]`, slide);
            if (matchedItem) {
              matchedItem.classList.add('is-hotspot-highlighted');
              matchedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
          }
        }
        return;
      }

      // Clicking a product card in the slide items highlights its hotspot
      const ucItem = e.target.closest('.uc-item');
      if (ucItem) {
        const slide = ucItem.closest('.uc-slide');
        if (slide) {
          const prodId = ucItem.dataset.id;
          const matchedHotspot = $(`.hotspot[data-target="${prodId}"]`, slide);
          if (matchedHotspot) {
            $$('.hotspot.is-active', slide).forEach(h => h.classList.remove('is-active'));
            $$('.uc-item.is-hotspot-highlighted', slide).forEach(it => it.classList.remove('is-hotspot-highlighted'));
            matchedHotspot.classList.add('is-active');
            ucItem.classList.add('is-hotspot-highlighted');
            return;
          }
        }
      }

      // Click outside closes open popovers
      if (!e.target.closest('.hotspot__popover')) {
        $$('.hotspot.is-active').forEach(h => h.classList.remove('is-active'));
        $$('.uc-item.is-hotspot-highlighted').forEach(it => it.classList.remove('is-hotspot-highlighted'));
      }
    });

    // Hover linking between hotspot and uc-item
    on(document, 'mouseenter', (e) => {
      const hotspot = e.target.closest('.hotspot');
      if (hotspot) {
        const slide = hotspot.closest('.uc-slide');
        const targetId = hotspot.dataset.target;
        if (targetId && slide) {
          const matched = $(`.uc-item[data-id="${targetId}"]`, slide);
          if (matched) matched.classList.add('is-hotspot-highlighted');
        }
        return;
      }

      const item = e.target.closest('.uc-item');
      if (item) {
        const slide = item.closest('.uc-slide');
        const targetId = item.dataset.id;
        if (targetId && slide) {
          const matchedHotspot = $(`.hotspot[data-target="${targetId}"]`, slide);
          if (matchedHotspot) matchedHotspot.classList.add('is-active');
        }
      }
    }, true);

    on(document, 'mouseleave', (e) => {
      const hotspot = e.target.closest('.hotspot');
      if (hotspot) {
        const slide = hotspot.closest('.uc-slide');
        const targetId = hotspot.dataset.target;
        if (targetId && slide) {
          const matched = $(`.uc-item[data-id="${targetId}"]`, slide);
          if (matched) matched.classList.remove('is-hotspot-highlighted');
        }
        return;
      }

      const item = e.target.closest('.uc-item');
      if (item) {
        const slide = item.closest('.uc-slide');
        const targetId = item.dataset.id;
        if (targetId && slide) {
          const matchedHotspot = $(`.hotspot[data-target="${targetId}"]`, slide);
          if (matchedHotspot) matchedHotspot.classList.remove('is-active');
        }
      }
    }, true);

  })();

  /* ═══════════════════════════════
     NEWSLETTER
     ═══════════════════════════════ */
  on($('#news-form'), 'submit', (e) => {
    e.preventDefault();
    const email = $('#news-email');
    const note = $('#news-note');
    if (!email.value || !email.validity.valid) {
      note.textContent = 'يرجى إدخال بريد إلكتروني صالح';
      note.className = 'news-note is-error';
      return;
    }
    note.textContent = 'شكرًا لك! تم تسجيل اشتراكك بنجاح 🎉';
    note.className = 'news-note is-success';
    email.value = '';
  });

  /* ═══════════════════════════════
     FLASH SALE COUNTDOWN TIMER
     ═══════════════════════════════ */
  (() => {
    const daysEl = $('#cd-days');
    const hoursEl = $('#cd-hours');
    const minsEl = $('#cd-mins');
    const secsEl = $('#cd-secs');
    if (!daysEl) return;

    // Target 3 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    targetDate.setHours(23, 59, 59);

    const updateCountdown = () => {
      const now = new Date();
      const diff = Math.max(0, targetDate - now);

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      daysEl.textContent = String(d).padStart(2, '0');
      hoursEl.textContent = String(h).padStart(2, '0');
      minsEl.textContent = String(m).padStart(2, '0');
      secsEl.textContent = String(s).padStart(2, '0');
    };

    updateCountdown();
    setInterval(updateCountdown, 1000);
  })();



  /* ═══════════════════════════════
     QUICK VIEW MODAL
     ═══════════════════════════════ */
  const quickModal = $('#quickview-modal');
  const quickImg = $('#quickview-img');
  const quickTitle = $('#quickview-title');
  const quickPrice = $('#quickview-price');
  const quickOldPrice = $('#quickview-oldprice');
  const quickCat = $('#quickview-cat');
  let currentQuickData = null;

  const openQuickView = (data) => {
    currentQuickData = data;
    if (quickTitle) quickTitle.textContent = data.name;
    if (quickPrice) quickPrice.textContent = data.price.toLocaleString('ar-AE') + ' د.إ';
    if (quickOldPrice) quickOldPrice.textContent = data.oldPrice ? data.oldPrice + ' د.إ' : '';
    if (quickCat) quickCat.textContent = data.cat || 'منتجات البر';
    if (quickImg) {
      quickImg.src = data.img;
      quickImg.alt = data.name;
    }
    quickModal?.classList.add('is-open');
    document.body.classList.add('no-scroll');
  };

  const closeQuickView = () => {
    quickModal?.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  };

  on($('#quickview-close'), 'click', closeQuickView);
  on($('#quickview-backdrop'), 'click', closeQuickView);
  on($('#quickview-add'), 'click', () => {
    if (currentQuickData) {
      addToCart(currentQuickData);
      closeQuickView();
    }
  });

  // Quick view delegation
  on(document, 'click', (e) => {
    const btn = e.target.closest('[data-quickview]');
    if (!btn) return;
    e.preventDefault();
    const card = btn.closest('[data-id]');
    if (!card) return;
    openQuickView({
      id: card.dataset.id,
      name: card.dataset.name,
      price: +card.dataset.price,
      oldPrice: card.dataset.oldprice || '',
      img: card.dataset.img,
      cat: card.dataset.catname || '',
    });
  });

  /* ═══════════════════════════════
     CART COUPON CODE (e.g. ALHOR15)
     ═══════════════════════════════ */
  (() => {
    const couponInput = $('#coupon-input');
    const couponBtn = $('#coupon-btn');
    const couponMsg = $('#coupon-msg');
    if (!couponBtn || !couponInput) return;

    on(couponBtn, 'click', (e) => {
      e.preventDefault();
      const code = couponInput.value.trim().toUpperCase();
      if (code === 'ALHOR15' || code === 'KASHTA15') {
        state.couponDiscount = 0.15;
        couponMsg.textContent = 'تم تطبيق خصم 15% بنجاح! 🎉';
        couponMsg.style.color = 'var(--accent-green)';
        updateCartUI();
      } else {
        couponMsg.textContent = 'كود الخصم غير صالح';
        couponMsg.style.color = '#b4553f';
      }
    });
  })();

  /* ═══════════════════════════════
     ESCAPE key — close overlays
     ═══════════════════════════════ */
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      closeSearch();
      closeMobileSidebar();
      closeQuickView();
    }
  });

  /* ═══════════════════════════════
     FOOTER — details toggle (mobile)
     ═══════════════════════════════ */
  if (window.innerWidth < 768) {
    $$('.footer__col').forEach(d => d.removeAttribute('open'));
  }

  /* ─── initial UI ─── */
  updateCartUI();
  scrollHeader();

})();

