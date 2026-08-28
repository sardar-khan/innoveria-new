/* Innovaria Tech — menu, animations, form validation. No dependencies. */
(function () {
  "use strict";

  /* Language switcher dropdown (globe button) */
  var langSwitch = document.querySelector(".lang-switch");
  var langToggle = langSwitch && langSwitch.querySelector(".lang-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = langSwitch.classList.toggle("open");
      langToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".lang-switch")) {
        langSwitch.classList.remove("open");
        langToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && langSwitch.classList.contains("open")) {
        langSwitch.classList.remove("open");
        langToggle.setAttribute("aria-expanded", "false");
        langToggle.focus();
      }
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Mobile menu ---------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Nav dropdowns ---------------------------------------------------------- */
  var navItems = [].slice.call(document.querySelectorAll(".nav-item"));

  function closeMenus(except) {
    navItems.forEach(function (item) {
      if (item === except) return;
      if (except && except.parentNode && except.parentNode.closest && except.parentNode.closest(".nav-item") === item) return;
      item.classList.remove("open");
      var c = item.querySelector(":scope > .nav-caret");
      if (c) c.setAttribute("aria-expanded", "false");
    });
  }

  navItems.forEach(function (item) {
    var caret = item.querySelector(":scope > .nav-caret");
    if (!caret) return;
    caret.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var willOpen = !item.classList.contains("open");
      closeMenus(willOpen ? item : null);
      item.classList.toggle("open", willOpen);
      caret.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  if (navItems.length) {
    // Click anywhere else closes any open menu
    document.addEventListener("click", function (e) {
      if (!e.target.closest || !e.target.closest(".nav-item")) closeMenus(null);
    });
    // Escape closes and hands focus back to the toggle
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var openItem = document.querySelector(".nav-item.open");
      if (!openItem) return;
      var caret = openItem.querySelector(":scope > .nav-caret");
      closeMenus(null);
      if (caret) caret.focus();
    });
  }

  /* Mark the current page in the nav, including its dropdown parent -------- */
  (function markCurrent() {
    var here = window.location.pathname.replace(/\/index\.html?$/, "/").replace(/\.html$/, "");
    if (here.length > 1 && here.slice(-1) === "/") here = here.slice(0, -1);
    if (here === "") here = "/";
    var nav = document.getElementById("site-nav");
    if (!nav) return;
    var exact = null;
    [].slice.call(nav.querySelectorAll("a[href]")).forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "/") return;
      var path = href.replace(/\.html$/, "");
      if (path.length > 1 && path.slice(-1) === "/") path = path.slice(0, -1);
      if (path === here) exact = exact || a;
    });
    if (exact) {
      exact.setAttribute("aria-current", "page");
      var parentItem = exact.closest(".nav-item");
      while (parentItem) {
        var top = parentItem.querySelector(":scope > a");
        if (top && top !== exact) top.setAttribute("aria-current", "true");
        parentItem = parentItem.parentNode.closest ? parentItem.parentNode.closest(".nav-item") : null;
      }
    }
  })();

  /* Scroll reveal --------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Stat counters (elements with data-count) ------------------------------ */
  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400;
    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (counters.length) {
    if ("IntersectionObserver" in window && !reduceMotion) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            cio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(function (el) {
        el.textContent = (el.getAttribute("data-prefix") || "") +
          el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
      });
    }
  }

  /* Rotating industry word in the hero ------------------------------------ */
  /* The width is measured per word so the space before the next word hugs the
     text instead of sitting at a fixed size. The CSS width transition turns
     the resize into a smooth slide rather than a jump. */
  var rotator = document.getElementById("rotator");
  if (rotator) {
    // Localized pages set window.__i18n.rotatorWords; English falls back here.
    var words = (window.__i18n && window.__i18n.rotatorWords) || ["real estate", "clinic", "ecommerce", "law firm"];
    var wi = 0;

    var ruler = document.createElement("span");
    ruler.setAttribute("aria-hidden", "true");
    ruler.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;";
    document.body.appendChild(ruler);

    function syncRulerFont() {
      var cs = window.getComputedStyle(rotator);
      ruler.style.fontFamily = cs.fontFamily;
      ruler.style.fontSize = cs.fontSize;
      ruler.style.fontWeight = cs.fontWeight;
      ruler.style.fontStyle = cs.fontStyle;
      ruler.style.letterSpacing = cs.letterSpacing;
      ruler.style.textTransform = cs.textTransform;
    }

    function fitTo(word) {
      syncRulerFont();
      ruler.textContent = word;
      rotator.style.width = Math.ceil(ruler.getBoundingClientRect().width) + "px";
    }

    fitTo(words[wi]);
    // The heading uses clamp() sizing, so remeasure when the viewport changes.
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { fitTo(words[wi]); }, 120);
    });
    // Webfonts can land after first paint and change metrics.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fitTo(words[wi]); });
    }

    if (!reduceMotion) {
      setInterval(function () {
        var next = (wi + 1) % words.length;
        rotator.classList.add("swap");
        fitTo(words[next]);
        setTimeout(function () {
          wi = next;
          rotator.textContent = words[wi];
          rotator.classList.remove("swap");
        }, 260);
      }, 2600);
    }
  }

  /* Live automation feed in the hero terminal ----------------------------- */
  var feed = document.getElementById("feed");
  if (feed) {
    // Localized pages set window.__i18n.feed; English falls back here.
    var script = (window.__i18n && window.__i18n.feed) || [
      ["t-info", "new lead captured", "portal enquiry, 3 bed listing"],
      ["t-ok", "CRM record created", "source tagged, agent assigned"],
      ["t-ok", "instant reply sent", "SMS + email in 41 seconds"],
      ["t-info", "AI call answered", "caller asked for a viewing"],
      ["t-ok", "viewing booked", "Saturday 11:00, calendar synced"],
      ["t-ok", "reminder scheduled", "24h and 1h before the visit"],
      ["t-warn", "no reply after 2 days", "follow up sequence step 2 sent"],
      ["t-ok", "lead replied", "handed to a human with full context"]
    ];
    var li = 0;
    var clock = 9 * 3600 + 41 * 60 + 12;

    function fmt(s) {
      var h = Math.floor(s / 3600) % 24;
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      function p(n) { return (n < 10 ? "0" : "") + n; }
      return p(h) + ":" + p(m) + ":" + p(sec);
    }

    function addLine() {
      if (li >= script.length) {
        setTimeout(function () {
          feed.innerHTML = "";
          li = 0;
          addLine();
        }, 4200);
        return;
      }
      var row = script[li];
      clock += 3 + (li * 7) % 40;
      var div = document.createElement("div");
      div.className = "tline";
      div.innerHTML = '<span class="t-time">' + fmt(clock) + "</span>" +
        '<span class="' + row[0] + '">' + row[1] + "</span>" +
        '<span class="t-text">' + row[2] + "</span>";
      feed.appendChild(div);
      li++;
      setTimeout(addLine, reduceMotion ? 0 : 900);
    }
    addLine();
  }

  /* 3D tilt cards: follow the cursor with perspective rotation ------------- */
  var tiltCards = document.querySelectorAll(".card-3d");
  if (tiltCards.length && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
    tiltCards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", ((px - 0.5) * 10).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - py) * 10).toFixed(2) + "deg");
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      });
      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* Reading progress bar on blog posts ------------------------------------- */
  if (document.querySelector("article.section")) {
    var bar = document.createElement("div");
    bar.className = "progress-bar";
    document.body.appendChild(bar);
    var ticking = false;
    function updateBar() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateBar); }
    }, { passive: true });
    updateBar();
  }

  /* Load more on the blog listing ------------------------------------------ */
  /* Every post ships in the HTML so crawlers and no-JS visitors see the full
     list. This trims it to one page and reveals the rest in batches. */
  var postGrid = document.getElementById("post-grid");
  var loadMoreWrap = document.getElementById("load-more-wrap");
  var loadMoreBtn = document.getElementById("load-more");

  if (postGrid && loadMoreWrap && loadMoreBtn) {
    var PAGE_SIZE = 6;
    var posts = [].slice.call(postGrid.children);
    var countEl = document.getElementById("load-more-count");
    var shown = Math.min(PAGE_SIZE, posts.length);
    var bx = (window.__i18n && window.__i18n.blog) || {};

    function describe(n) {
      if (n === 1) return bx.guide1 || "1 guide";
      return bx.guides ? bx.guides.replace("{n}", n) : n + " guides";
    }

    function updateCount() {
      if (!countEl) return;
      countEl.textContent = shown >= posts.length
        ? (bx.allShown ? bx.allShown.replace("{all}", describe(posts.length)) : "All " + describe(posts.length) + " shown")
        : (bx.showing ? bx.showing.replace("{shown}", shown).replace("{total}", describe(posts.length)) : "Showing " + shown + " of " + describe(posts.length));
    }

    if (posts.length > PAGE_SIZE) {
      posts.slice(PAGE_SIZE).forEach(function (card) {
        card.classList.add("is-hidden");
      });
      loadMoreWrap.removeAttribute("hidden");
      updateCount();

      loadMoreBtn.addEventListener("click", function () {
        var batch = posts.slice(shown, shown + PAGE_SIZE);
        if (!batch.length) return;

        batch.forEach(function (card) { card.classList.remove("is-hidden"); });

        /* The cards carry .reveal, so they start faded out and the scroll
           observer will never fire for them: they were display:none when it
           began watching. Flush the layout so the display change commits, then
           add .in so the fade runs rather than collapsing into one repaint. */
        void postGrid.offsetHeight;
        batch.forEach(function (card) { card.classList.add("in"); });

        shown += batch.length;
        updateCount();

        /* While the button survives, focus stays on it so a second batch is one
           more press away; the live region announces the new count. Once it goes
           away, focus would fall back to the body, so move it into the first new
           card instead. Deferred, because hiding the button resets focus after
           the click finishes. */
        if (shown < posts.length) return;
        loadMoreBtn.setAttribute("hidden", "");
        var firstLink = batch[0].querySelector("h3 a, a");
        if (firstLink) {
          setTimeout(function () { firstLink.focus({ preventScroll: true }); }, 0);
        }
      });
    }
  }

  /* Contact form validation ------------------------------------------------ */
  var form = document.getElementById("audit-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  // Localized form messages (window.__i18n.form); English fallback below.
  var fx = (window.__i18n && window.__i18n.form) || {};

  function setInvalid(field, invalid) {
    var wrap = field.closest(".form-field");
    if (wrap) wrap.classList.toggle("invalid", invalid);
    return invalid;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  form.addEventListener("submit", function (e) {
    var name = form.elements.name;
    var email = form.elements.email;
    var company = form.elements.company;
    var bottleneck = form.elements.bottleneck;
    var hasError = false;

    hasError = setInvalid(name, name.value.trim().length < 2) || hasError;
    hasError = setInvalid(email, !validEmail(email.value.trim())) || hasError;
    hasError = setInvalid(company, company.value.trim().length < 2) || hasError;
    hasError = setInvalid(bottleneck, bottleneck.value.trim().length < 10) || hasError;

    if (hasError) {
      e.preventDefault();
      if (status) {
        status.textContent = fx.fixFields || "Please fix the highlighted fields and try again.";
        status.className = "form-status err";
      }
      return;
    }

    /* Submit to the built-in Vercel function (api/lead.js). Leads appear
       in admin.html. Requires the Upstash Redis store + ADMIN_KEY env var
       described in README.md under "Leads admin portal". */
    e.preventDefault();
    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    if (status) {
      status.textContent = fx.sending || "Sending...";
      status.className = "form-status ok";
    }

    var firstName = name.value.trim().split(" ")[0];

    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.value.trim(),
        email: email.value.trim(),
        company: company.value.trim(),
        bottleneck: bottleneck.value.trim(),
        website: form.elements.website ? form.elements.website.value : "",
        page: window.location.pathname
      })
    }).then(function (r) {
      if (r.ok) {
        return r.json().then(function (data) { return data || {}; }, function () { return {}; })
          .then(function (data) {
            if (status) {
              if (data.confirmationEmailed) {
                // The automated confirmation actually went out: say so plainly,
                // which is the "confirms it in seconds" promise made good.
                status.textContent = (fx.thanksConfirmed && fx.thanksConfirmed.replace("{name}", firstName)) ||
                  ("Thanks, " + firstName +
                  ". A confirmation just went to your inbox. A human follows up during business hours.");
              } else {
                // Received, but the email did not send. Never claim it did.
                status.textContent = (fx.thanksReceived && fx.thanksReceived.replace("{name}", firstName)) ||
                  ("Thanks, " + firstName +
                  ". Your request reached us and the team can see it. Our automated email " +
                  "confirmation did not go through this time, so please email info@innovariatech.space " +
                  "directly to be sure.");
              }
              status.className = "form-status ok";
            }
            if (typeof gtag === "function") gtag("event", "generate_lead");
            form.reset();
          });
      }
      return r.json().then(function (data) {
        throw new Error((data && data.error) || "Something went wrong.");
      }, function () {
        throw new Error("Something went wrong.");
      });
    }).catch(function (err) {
      if (status) {
        status.textContent = (err && err.message ? err.message + " " : "") +
          (fx.errorSuffix || "You can also email us directly at info@innovariatech.space.");
        status.className = "form-status err";
      }
    }).then(function () {
      if (submitBtn) submitBtn.disabled = false;
    });
  });

  form.addEventListener("input", function (e) {
    var wrap = e.target.closest(".form-field");
    if (wrap) wrap.classList.remove("invalid");
  });
})();
