(function () {
  var CREDIT_TEXT = "Website by Wankumbu Musunga";
  var CREDIT_URL = "https://github.com/MKBright";
  var kit = window.SiteKit;
  if (!kit) {
    var missing = document.getElementById("app");
    if (missing) missing.textContent = "The page scripts did not load.";
    return;
  }

  var DEFAULT_LABELS = {
    services: "Services",
    servicesIntro: "Prices in Zambian kwacha.",
    gallery: "Photos",
    hours: "Opening hours",
    location: "Find us",
    contact: "Contact",
    payments: "Mobile money",
    paymentNote: "Pay the business on the number below. This page does not take the payment."
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    var props = attrs || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    });
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children == null) return;
    var list = Array.isArray(children) ? children : [children];
    list.forEach(function (child) {
      if (child == null || child === false) return;
      if (Array.isArray(child)) {
        appendChildren(node, child);
        return;
      }
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
  }

  function svgIcon(pathD) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", pathD);
    svg.append(path);
    return svg;
  }

  var ICONS = {
    phone:
      "M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11 11 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11 11 0 00.57 3.6 1 1 0 01-.25 1L6.6 10.8z",
    chat:
      "M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8A2.5 2.5 0 0117.5 16H9l-4.2 3.2A.8.8 0 013.4 18.6V5.5z",
    pin:
      "M12 2.8a6.2 6.2 0 00-6.2 6.2c0 4.7 6.2 12.2 6.2 12.2s6.2-7.5 6.2-12.2A6.2 6.2 0 0012 2.8zm0 8.4a2.2 2.2 0 110-4.4 2.2 2.2 0 010 4.4z"
  };

  function labelsOf(config) {
    var labels = Object.assign({}, DEFAULT_LABELS);
    if (config.labels && typeof config.labels === "object") {
      Object.keys(labels).forEach(function (key) {
        if (typeof config.labels[key] === "string" && config.labels[key].trim()) {
          labels[key] = config.labels[key].trim();
        }
      });
    }
    return labels;
  }

  function applyTheme(theme) {
    if (!theme) return;
    var map = {
      primary: "--primary",
      onPrimary: "--on-primary",
      accent: "--accent",
      ink: "--ink",
      paper: "--paper",
      muted: "--muted",
      soft: "--soft"
    };
    Object.keys(map).forEach(function (key) {
      var value = theme[key];
      if (typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)) {
        document.documentElement.style.setProperty(map[key], value);
      }
    });
    if (typeof theme.primary === "string" && /^#[0-9A-Fa-f]{6}$/.test(theme.primary)) {
      var themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.setAttribute("content", theme.primary);
    }
  }

  function upsertMeta(attr, key, content) {
    var selector = "meta[" + attr + '="' + key + '"]';
    var node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(attr, key);
      document.head.append(node);
    }
    node.setAttribute("content", content);
  }

  function applySeo(config) {
    var seo = config.seo || {};
    if (seo.title) document.title = seo.title;
    if (seo.description) upsertMeta("name", "description", seo.description);
    if (seo.title) upsertMeta("property", "og:title", seo.title);
    if (seo.description) upsertMeta("property", "og:description", seo.description);
    if (seo.image) upsertMeta("property", "og:image", seo.image);
    var heroAlt = config.gallery && config.gallery[0] ? config.gallery[0].alt : config.name;
    if (heroAlt) upsertMeta("property", "og:image:alt", heroAlt);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:locale", "en_GB");
    upsertMeta("name", "twitter:card", "summary_large_image");
    if (config.favicon && kit.isSafeAssetPath(config.favicon)) {
      var icon = document.querySelector('link[rel="icon"]');
      if (icon) icon.setAttribute("href", config.favicon);
    }
    var data = {
      "@context": "https://schema.org",
      "@type": kit.sanitizeSchemaType(config.schemaType),
      name: config.name,
      description: seo.description || config.tagline,
      telephone: config.contact.phone,
      image: seo.image,
      currenciesAccepted: "ZMW",
      address: {
        "@type": "PostalAddress",
        streetAddress: config.location.address,
        addressLocality: config.location.city,
        addressRegion: "Lusaka",
        addressCountry: "ZM"
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: config.location.lat,
        longitude: config.location.lng
      },
      openingHoursSpecification: (config.hours || [])
        .filter(function (entry) {
          return entry.open && entry.close;
        })
        .map(function (entry) {
          return {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: entry.day,
            opens: entry.open,
            closes: entry.close
          };
        })
    };
    var script = document.getElementById("structured-data");
    if (!script) {
      script = document.createElement("script");
      script.id = "structured-data";
      script.type = "application/ld+json";
      document.head.append(script);
    }
    script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  }

  function paymentDigits(payment) {
    return String(payment.digits || payment.number || "").replace(/\D/g, "");
  }

  function priceNode(service) {
    var price = kit.formatPrice(service);
    var node = el("p", { class: "price" }, price.text);
    if (price.announceKwacha) {
      node.append(el("span", { class: "visually-hidden" }, " Zambian kwacha"));
    }
    return node;
  }

  function linkButton(href, className, icon, text) {
    return el("a", { class: className, href: href }, [icon ? svgIcon(icon) : null, text]);
  }

  function renderBanner(config) {
    if (!config.fictional) return null;
    return el("div", { class: "banner", role: "region", "aria-label": "Sample notice" }, [
      el("p", {}, [el("strong", { text: "Fictional sample. " }), config.fictionalNote]),
      el("p", { class: "switcher" }, [
        "Switch sample: ",
        el(
          "a",
          {
            href: "?demo=kamwala",
            "aria-current": config.demoId === "kamwala" ? "page" : null
          },
          "Kamwala Corner Grocer"
        ),
        " · ",
        el(
          "a",
          {
            href: "?demo=chapel",
            "aria-current": config.demoId === "chapel" ? "page" : null
          },
          "Riverside Fellowship"
        )
      ])
    ]);
  }

  function renderHeader(config, telHref, waHref) {
    var area = config.location.area + ", " + config.location.city;
    return el("header", { class: "masthead" }, [
      el("div", { class: "masthead-inner wrap" }, [
        el("a", { class: "brand", href: "#hero" }, [
          el("img", {
            src: config.logo.src,
            alt: "",
            width: "64",
            height: "64"
          }),
          el("span", {}, [
            el("span", { class: "brand-name" }, config.name),
            el("span", { class: "brand-area" }, area)
          ])
        ]),
        el("div", { class: "mast-actions" }, [
          telHref ? linkButton(telHref, "btn btn-ghost", ICONS.phone, "Call") : null,
          waHref ? linkButton(waHref, "btn btn-primary", ICONS.chat, "WhatsApp") : null
        ])
      ])
    ]);
  }

  function renderNav() {
    var items = [
      ["#services", "Services"],
      ["#gallery", "Photos"],
      ["#hours", "Hours"],
      ["#location", "Map"],
      ["#contact", "Contact"]
    ];
    return el(
      "nav",
      { class: "section-nav wrap", "aria-label": "On this page" },
      items.map(function (item) {
        return el("a", { href: item[0] }, item[1]);
      })
    );
  }

  function renderHero(config, status, telHref, waHref) {
    var photo = config.gallery[0];
    var eyebrow = [];
    if (config.greeting) {
      var greetingAttrs = { class: "greeting" };
      if (config.greetingLang) greetingAttrs.lang = config.greetingLang;
      eyebrow.push(el("span", greetingAttrs, config.greeting));
      eyebrow.push(el("span", { class: "dotsep", "aria-hidden": "true" }, "·"));
    }
    eyebrow.push(config.location.area + ", " + config.location.city);
    return el("section", { class: "hero wrap", id: "hero" }, [
      el("div", { class: "hero-copy" }, [
        el("p", { class: "eyebrow" }, eyebrow),
        el("h1", {}, config.name),
        el("p", { class: "tagline" }, config.tagline),
        el("p", { class: status.openNow ? "status" : "status is-closed" }, [
          el("span", { class: "dot", "aria-hidden": "true" }),
          status.label
        ]),
        el("div", { class: "hero-actions" }, [
          waHref ? linkButton(waHref, "btn btn-primary", ICONS.chat, "WhatsApp") : null,
          telHref ? linkButton(telHref, "btn btn-ghost", ICONS.phone, "Call " + config.contact.phoneDisplay) : null
        ])
      ]),
      el("figure", { class: "hero-photo" }, [
        el("img", {
          src: photo.src,
          alt: photo.alt,
          width: String(photo.width || 800),
          height: String(photo.height || 600),
          fetchpriority: "high"
        }),
        config.heroCaption
          ? el("figcaption", {}, config.heroCaption)
          : null
      ])
    ]);
  }

  function renderServices(config, labels) {
    return el("section", { class: "band", id: "services" }, [
      el("div", { class: "wrap" }, [
        el("h2", {}, labels.services),
        el("p", { class: "intro" }, labels.servicesIntro),
        el(
          "div",
          { class: "service-list" },
          config.services.map(function (service) {
            return el("article", { class: "service" }, [
              el("h3", {}, service.name),
              priceNode(service),
              service.detail ? el("p", {}, service.detail) : null
            ]);
          })
        )
      ])
    ]);
  }

  function renderGallery(config, labels) {
    var dialog = el("dialog", { class: "lightbox", "aria-label": "Photo" });
    var image = el("img", { alt: "", width: "800", height: "600" });
    var caption = el("figcaption");
    var count = el("p", { class: "count" });
    var items = config.gallery.filter(function (photo) {
      return kit.isSafeAssetPath(photo.src);
    });
    var index = 0;

    function show(next) {
      index = (next + items.length) % items.length;
      var photo = items[index];
      image.src = photo.src;
      image.alt = photo.alt;
      caption.textContent = photo.alt;
      count.textContent = index + 1 + " of " + items.length;
    }

    dialog.append(
      el("div", { class: "lightbox-bar" }, [
        count,
        el("div", { class: "lightbox-actions" }, [
          el("button", { type: "button", class: "btn btn-ghost btn-small" }, "Previous"),
          el("button", { type: "button", class: "btn btn-ghost btn-small" }, "Next"),
          el("button", { type: "button", class: "btn btn-primary btn-small" }, "Close")
        ])
      ]),
      el("figure", {}, [image, caption])
    );

    var buttons = dialog.querySelectorAll("button");
    buttons[0].addEventListener("click", function () {
      show(index - 1);
    });
    buttons[1].addEventListener("click", function () {
      show(index + 1);
    });
    buttons[2].addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(index - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        show(index + 1);
      }
    });

    var scroller = el(
      "div",
      { class: "gallery-scroller" },
      items.map(function (photo, photoIndex) {
        var button = el("button", { type: "button", class: "shot" }, [
          el("img", {
            src: photo.src,
            alt: photo.alt,
            width: String(photo.width || 800),
            height: String(photo.height || 600),
            loading: photoIndex === 0 ? "eager" : "lazy"
          })
        ]);
        button.addEventListener("click", function () {
          show(photoIndex);
          if (typeof dialog.showModal === "function") dialog.showModal();
          else dialog.setAttribute("open", "");
        });
        return button;
      })
    );

    return el("section", { class: "band", id: "gallery" }, [
      el("div", { class: "wrap" }, [el("h2", {}, labels.gallery)]),
      scroller,
      dialog
    ]);
  }

  function renderHours(config, labels, status) {
    var rows = config.hours.map(function (entry) {
      var today = entry.day === status.day;
      return el("tr", { class: today ? "is-today" : null }, [
        el("th", { scope: "row" }, [
          entry.day,
          today ? el("span", { class: "badge" }, "Today") : null
        ]),
        el("td", {}, kit.formatHours(entry))
      ]);
    });
    return el("section", { class: "band", id: "hours" }, [
      el("div", { class: "wrap narrow" }, [
        el("h2", {}, labels.hours),
        el("p", { class: "intro" }, "Times are in Lusaka (Central Africa Time)."),
        el("table", { class: "hours" }, [
          el("caption", { class: "visually-hidden" }, "Opening hours for " + config.name),
          el("thead", { class: "visually-hidden" }, [
            el("tr", {}, [el("th", { scope: "col" }, "Day"), el("th", { scope: "col" }, "Hours")])
          ]),
          el("tbody", {}, rows)
        ])
      ])
    ]);
  }

  function renderLocation(config, labels) {
    var loc = config.location;
    var mapTitle = "Map of " + config.name + " in " + loc.area + ", " + loc.city;
    return el("section", { class: "band", id: "location" }, [
      el("div", { class: "wrap location-layout" }, [
        el("div", {}, [
          el("h2", {}, labels.location),
          el("address", {}, [
            loc.address,
            el("br"),
            loc.area + ", " + loc.city + ", " + (loc.country || "Zambia")
          ]),
          loc.hint ? el("p", { class: "intro" }, loc.hint) : null,
          el("div", { class: "hero-actions" }, [
            linkButton(kit.buildGoogleMapsLink(loc.lat, loc.lng), "btn btn-primary", ICONS.pin, "Google Maps"),
            el(
              "a",
              { class: "btn btn-ghost", href: kit.buildOsmLink(loc.lat, loc.lng) },
              "OpenStreetMap"
            )
          ])
        ]),
        el("div", { class: "map-frame" }, [
          el("iframe", {
            title: mapTitle,
            src: kit.buildOsmEmbedUrl(loc.lat, loc.lng),
            loading: "lazy",
            referrerpolicy: "no-referrer-when-downgrade"
          })
        ])
      ])
    ]);
  }

  function renderContact(config, labels, telHref, waHref) {
    var live = el("p", { id: "copy-status", class: "visually-hidden", "aria-live": "polite" });
    var actions = [];
    if (telHref) actions.push(linkButton(telHref, "btn btn-primary", ICONS.phone, "Call " + config.contact.phoneDisplay));
    if (waHref) actions.push(linkButton(waHref, "btn btn-primary", ICONS.chat, "WhatsApp"));
    if (config.contact.email) {
      actions.push(el("a", { class: "btn btn-ghost", href: "mailto:" + config.contact.email }, config.contact.email));
    }

    var cards = config.payments.map(function (payment) {
      var digits = paymentDigits(payment);
      var button = el("button", { type: "button", class: "btn btn-ghost btn-small" }, "Copy number");
      button.addEventListener("click", function () {
        copyText(digits, payment.provider).then(function () {
          live.textContent = payment.provider + " number " + digits + " copied";
          button.textContent = "Copied";
          window.setTimeout(function () {
            button.textContent = "Copy number";
          }, 2000);
        });
      });
      return el("article", { class: "pay-card" }, [
        el("h3", {}, payment.provider),
        el("p", { class: "pay-number" }, payment.number),
        button
      ]);
    });

    var socials =
      config.socials.length === 0
        ? null
        : el("div", {}, [
            el("h3", {}, "Social"),
            el(
              "ul",
              { class: "socials" },
              config.socials
                .filter(function (social) {
                  return kit.isHttpUrl(social.url);
                })
                .map(function (social) {
                  return el("li", {}, el("a", { href: social.url }, social.name));
                })
            )
          ]);

    return el("section", { class: "band", id: "contact" }, [
      el("div", { class: "wrap" }, [
        el("h2", {}, labels.contact),
        el("div", { class: "contact-actions" }, actions),
        el("h3", { class: "subhead" }, labels.payments),
        el("p", { class: "intro" }, labels.paymentNote),
        live,
        el("div", { class: "pay-grid" }, cards),
        socials
      ])
    ]);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-999px";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      resolve();
    });
  }

  function renderFooter(config) {
    return el("footer", { class: "site-footer" }, [
      el("div", { class: "wrap" }, [
        el("p", { class: "footer-name" }, config.name),
        el("p", { class: "footer-area" }, config.location.area + ", " + config.location.city),
        config.fictional ? el("p", {}, config.fictionalNote) : null,
        el("p", { class: "credit" }, el("a", { href: CREDIT_URL }, CREDIT_TEXT))
      ])
    ]);
  }

  function renderDock(telHref, waHref) {
    return el("nav", { class: "dock", "aria-label": "Quick actions" }, [
      telHref ? linkButton(telHref, "", ICONS.phone, "Call") : el("span"),
      waHref ? linkButton(waHref, "", ICONS.chat, "WhatsApp") : el("span"),
      linkButton("#location", "", ICONS.pin, "Map")
    ]);
  }

  function renderError(message, details) {
    var app = document.getElementById("app");
    app.replaceChildren(
      el("main", { id: "main", class: "wrap" }, [
        el("h1", {}, "This page needs a config file"),
        el("p", {}, message),
        details && details.length
          ? el(
              "ul",
              {},
              details.map(function (item) {
                return el("li", {}, item);
              })
            )
          : null,
        el("p", {}, "Open README.md for the 10-minute setup. Preview with a local server, not by double-clicking the file.")
      ]),
      el("footer", { class: "site-footer" }, [
        el("div", { class: "wrap" }, [
          el("p", { class: "credit" }, el("a", { href: CREDIT_URL }, CREDIT_TEXT))
        ])
      ])
    );
    document.body.dataset.ready = "error";
  }

  function render(config) {
    var labels = labelsOf(config);
    var status = kit.hoursStatus(config.hours, new Date());
    var telHref = null;
    var waHref = null;
    try {
      telHref = kit.buildTelLink(config.contact.phone);
    } catch (error) {
      telHref = null;
    }
    try {
      waHref = kit.buildWhatsAppLink(config.contact.whatsapp, config.contact.whatsappMessage);
    } catch (error) {
      waHref = null;
    }

    applyTheme(config.theme);
    applySeo(config);

    var app = document.getElementById("app");
    app.replaceChildren(
      renderBanner(config),
      renderHeader(config, telHref, waHref),
      el("div", { class: "stripe", "aria-hidden": "true" }),
      renderNav(),
      el("main", { id: "main" }, [
        renderHero(config, status, telHref, waHref),
        renderServices(config, labels),
        renderGallery(config, labels),
        renderHours(config, labels, status),
        renderLocation(config, labels),
        renderContact(config, labels, telHref, waHref)
      ]),
      renderFooter(config),
      renderDock(telHref, waHref)
    );
    document.body.dataset.ready = "true";
    document.body.dataset.demo = config.demoId || "";
    document.body.dataset.business = config.name;
  }

  function configUrl() {
    var meta = document.querySelector('meta[name="site-config"]');
    var siteConfig = meta ? meta.getAttribute("content") : "";
    return kit.resolveConfigUrl(window.location.search, { siteConfig: siteConfig });
  }

  function load() {
    var url = configUrl();
    return fetch(url, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Could not load " +
              url +
              " (" +
              response.status +
              "). If you are on your computer, start a local server. Opening the HTML file directly blocks the config."
          );
        }
        return response.json().catch(function () {
          throw new Error(url + " is not valid JSON. Check commas and quotes.");
        });
      })
      .then(function (config) {
        var errors = kit.validateConfig(config);
        if (errors.length) {
          renderError(url + " has " + errors.length + " problem" + (errors.length === 1 ? "" : "s") + ".", errors);
          return;
        }
        render(config);
      })
      .catch(function (error) {
        renderError(error.message || "Could not load the config.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
