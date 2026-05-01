/**
 * Carousel, scroll spy, reveal, stat counters, nav; AJAX footer.
 */
(function ($) {
  "use strict";

  var NAV_OFFSET = 88;
  var SECTION_SELECTOR = "main section[id]";

  function getSections() {
    return $(SECTION_SELECTOR)
      .map(function () {
        return this.id;
      })
      .get()
      .filter(Boolean);
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") return;
    var $target = $(hash);
    if (!$target.length) return;
    var top = $target.offset().top - NAV_OFFSET;
    $("html, body").animate({ scrollTop: top }, 450);
  }

  function updateActiveNav() {
    var scrollTop = $(window).scrollTop() + NAV_OFFSET + 12;
    var sections = getSections();
    var current = sections[0] || "inicio";

    for (var i = 0; i < sections.length; i++) {
      var id = sections[i];
      var $sec = $("#" + id);
      if (!$sec.length) continue;
      if ($sec.offset().top <= scrollTop) {
        current = id;
      }
    }

    $(".nav-list a").removeClass("is-active");
    $('.nav-list a[data-section="' + current + '"]').addClass("is-active");
  }

  function wireCarousel() {
    var $carousel = $("[data-carousel]");
    if (!$carousel.length) return;

    var $slides = $carousel.find(".carousel__slide");
    var n = $slides.length;
    var idx = 0;
    var $dots = $("#carouselDots");
    $dots.empty();

    for (var d = 0; d < n; d++) {
      $dots.append(
        '<button type="button" class="carousel__dot' +
          (d === 0 ? " is-active" : "") +
          '" role="tab" aria-selected="' +
          (d === 0) +
          '" aria-label="Slide ' +
          (d + 1) +
          '"></button>'
      );
    }

    var $dotBtns = $dots.find(".carousel__dot");

    function show(i) {
      idx = (i + n) % n;
      $slides.removeClass("is-active").attr("aria-hidden", "true").attr("hidden", true);
      var $cur = $slides.eq(idx);
      $cur.addClass("is-active").attr("aria-hidden", "false").removeAttr("hidden");
      $dotBtns.removeClass("is-active").attr("aria-selected", "false");
      $dotBtns.eq(idx).addClass("is-active").attr("aria-selected", "true");
    }

    $("#carouselPrev").on("click", function () {
      show(idx - 1);
    });
    $("#carouselNext").on("click", function () {
      show(idx + 1);
    });

    $dotBtns.on("click", function () {
      show($(this).index());
    });

    var timer;

    function startAutoplay() {
      clearInterval(timer);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = setInterval(function () {
          show(idx + 1);
        }, 5800);
      }
    }

    startAutoplay();
    $carousel.on("mouseenter", function () {
      clearInterval(timer);
    });
    $carousel.on("mouseleave", startAutoplay);
  }

  function wireRevealOnScroll() {
    var nodes = document.querySelectorAll(".reveal-on-scroll");
    if (!nodes.length) return;

    if (!("IntersectionObserver" in window)) {
      $(nodes).addClass("is-revealed");
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -24px 0px" }
    );

    Array.prototype.forEach.call(nodes, function (el) {
      io.observe(el);
    });
  }

  function wireStatCounters() {
    $(".hero-stat__plus[data-count]").each(function () {
      var $el = $(this);
      var t = $el.attr("data-count");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        $el.text(t + "+");
      } else {
        $el.text("0+");
      }
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var el = document.querySelector(".hero-stats");
    if (!el) return;

    var fired = false;

    function run() {
      if (fired) return;
      fired = true;
      $(".hero-stat__plus[data-count]").each(function () {
        var $el = $(this);
        var target = parseInt($el.attr("data-count"), 10);
        if (isNaN(target)) return;

        var start = 0;
        var dur = 950;
        var t0 = null;

        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var ease = 1 - Math.pow(1 - p, 3);
          var val = Math.round(start + (target - start) * ease);
          $el.text(val + "+");
          if (p < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
      });
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              run();
              io.disconnect();
            }
          });
        },
        { threshold: 0.25 }
      );
      io.observe(el);
    } else {
      run();
    }
  }

  function loadAjaxMeta() {
    var $box = $("#ajaxMeta");
    if (!$box.length) return;

    $box.removeAttr("hidden").text("Carregando...");

    $.ajax({
      url: "JS/data.json",
      dataType: "json",
      cache: false,
    })
      .done(function (data) {
        var pills = "";
        if (data.stackDestaque && data.stackDestaque.length) {
          pills =
            '<div class="stack-pills">' +
            data.stackDestaque
              .map(function (s) {
                return "<span>" + $("<span>").text(s).html() + "</span>";
              })
              .join("") +
            "</div>";
        }
        $box.removeClass("is-error").html(
          "<strong>Metadados (AJAX)</strong><br />" +
            $("<span>").text(data.resumoAjax || "").html() +
            "<br /><strong>Ultima atualizacao declarada:</strong> " +
            $("<span>").text(data.ultimaAtualizacao || "-").html() +
            pills
        );
      })
      .fail(function () {
        $box
          .addClass("is-error")
          .html(
            "<strong>Arquivo JS/data.json</strong><br />No GitHub Pages o AJAX funciona. Localmente use um servidor HTTP (ex.: npx serve)."
          );
      });
  }

  function wireNavClicks() {
    $(".nav-list a[href^='#']").on("click", function (e) {
      var hash = this.getAttribute("href");
      if (hash && hash.length > 1 && $(hash).length) {
        e.preventDefault();
        scrollToHash(hash);
        $("#navList").removeClass("is-open");
        $("#navToggle").attr("aria-expanded", "false");
      }
    });
  }

  function wireMobileNav() {
    $("#navToggle").on("click", function () {
      var $list = $("#navList");
      var open = $list.hasClass("is-open");
      $list.toggleClass("is-open", !open);
      $(this).attr("aria-expanded", !open);
    });
  }

  function wireLogoSmoothScroll() {
    $('.logo[href^="#"]').on("click", function (e) {
      var hash = this.getAttribute("href");
      if (hash === "#inicio" && $("#inicio").length) {
        e.preventDefault();
        scrollToHash(hash);
      }
    });
  }

  $(function () {
    $("#year").text(new Date().getFullYear());

    wireCarousel();
    wireRevealOnScroll();
    wireStatCounters();

    wireNavClicks();
    wireMobileNav();
    wireLogoSmoothScroll();

    $(window).on("scroll", updateActiveNav);
    updateActiveNav();

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $(".project-card").on("mouseenter", function () {
        $(this).stop(true).animate({ marginTop: "-3px" }, 160);
      });
      $(".project-card").on("mouseleave", function () {
        $(this).stop(true).animate({ marginTop: "0" }, 160);
      });
    }

    loadAjaxMeta();
  });
})(jQuery);
