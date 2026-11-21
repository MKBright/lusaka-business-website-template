(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SiteKit = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  var DEMOS = {
    kamwala: "demos/kamwala-grocer.json",
    shop: "demos/kamwala-grocer.json",
    chapel: "demos/riverside-fellowship.json",
    church: "demos/riverside-fellowship.json"
  };

  var WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  var HEX = /^#[0-9A-Fa-f]{6}$/;
  var TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  var SCHEMA_TYPES = {
    LocalBusiness: true,
    Store: true,
    GroceryStore: true,
    Church: true,
    HairSalon: true,
    LodgingBusiness: true
  };

  function digitsOnly(value) {
    return String(value == null ? "" : value).replace(/\D/g, "");
  }

  function normalizeWhatsAppPhone(phone) {
    if (phone == null || String(phone).trim() === "") {
      throw new Error("WhatsApp phone number is required");
    }
    var digits = digitsOnly(phone);
    if (!digits) {
      throw new Error("WhatsApp phone number is required");
    }
    var normalized = digits;
    if (normalized.indexOf("00") === 0) {
      normalized = normalized.slice(2);
    }
    if (normalized.indexOf("260") === 0) {
      // Already has the Zambia country code.
    } else if (normalized.charAt(0) === "0" && normalized.length === 10) {
      normalized = "260" + normalized.slice(1);
    } else if (normalized.length === 9) {
      normalized = "260" + normalized;
    }
    if (normalized.length < 8 || normalized.length > 15) {
      throw new Error("WhatsApp phone number must contain 8 to 15 digits");
    }
    return normalized;
  }

  function buildWhatsAppLink(phone, message) {
    var normalized = normalizeWhatsAppPhone(phone);
    var base = "https://wa.me/" + normalized;
    if (message == null || String(message).trim() === "") {
      return base;
    }
    return base + "?text=" + encodeURIComponent(String(message).trim());
  }

  function buildTelLink(phone) {
    if (phone == null || String(phone).trim() === "") {
      throw new Error("Phone number is required");
    }
    var cleaned = String(phone).trim().replace(/[^\d+]/g, "");
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      throw new Error("Phone number must contain 8 to 15 digits");
    }
    return "tel:" + cleaned;
  }

  function requireCoord(value, label) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(label + " must be a number");
    }
    return number;
  }

  function buildOsmEmbedUrl(lat, lng, delta) {
    var la = requireCoord(lat, "Latitude");
    var ln = requireCoord(lng, "Longitude");
    var span = delta == null ? 0.006 : Number(delta);
    if (!Number.isFinite(span) || span <= 0) {
      throw new Error("Map span must be a positive number");
    }
    var bbox = [ln - span, la - span, ln + span, la + span]
      .map(function (n) {
        return n.toFixed(5);
      })
      .join(",");
    return (
      "https://www.openstreetmap.org/export/embed.html?bbox=" +
      bbox +
      "&layer=mapnik&marker=" +
      la.toFixed(5) +
      "," +
      ln.toFixed(5)
    );
  }

  function buildOsmLink(lat, lng) {
    var la = requireCoord(lat, "Latitude").toFixed(5);
    var ln = requireCoord(lng, "Longitude").toFixed(5);
    return (
      "https://www.openstreetmap.org/?mlat=" +
      la +
      "&mlon=" +
      ln +
      "#map=17/" +
      la +
      "/" +
      ln
    );
  }

  function buildGoogleMapsLink(lat, lng) {
    var la = requireCoord(lat, "Latitude").toFixed(5);
    var ln = requireCoord(lng, "Longitude").toFixed(5);
    return "https://www.google.com/maps/search/?api=1&query=" + la + "," + ln;
  }

  function isSafeAssetPath(src) {
    if (typeof src !== "string" || !src.trim()) return false;
    if (src.charAt(0) === "/" || src.charAt(0) === "\\") return false;
    if (src.slice(0, 2) === "//") return false;
    if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(src)) return false;
    var parts = src.split(/[\\/]/);
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i] === "" || parts[i] === "." || parts[i] === "..") return false;
    }
    return true;
  }

  function isHttpUrl(url) {
    if (typeof url !== "string") return false;
    try {
      var parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch (error) {
      return false;
    }
  }

  function resolveConfigUrl(search, options) {
    var opts = options || {};
    var raw = search == null ? "" : String(search);
    var query = raw.indexOf("?") === -1 ? raw : raw.slice(raw.indexOf("?") + 1);
    var demo = "";
    try {
      demo = (new URLSearchParams(query).get("demo") || "").trim().toLowerCase();
    } catch (error) {
      demo = "";
    }
    if (Object.prototype.hasOwnProperty.call(DEMOS, demo)) {
      return DEMOS[demo];
    }
    if (opts.siteConfig && isSafeAssetPath(opts.siteConfig)) {
      return opts.siteConfig;
    }
    if (opts.siteJsonExists) return "site.json";
    return DEMOS.kamwala;
  }

  function formatGroupedInteger(value) {
    var sign = value < 0 ? "-" : "";
    var whole = String(Math.abs(Math.trunc(value)));
    return sign + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatPrice(service) {
    if (!service || typeof service !== "object") {
      return { text: "Free", announceKwacha: false };
    }
    if (typeof service.priceLabel === "string" && service.priceLabel.trim()) {
      return { text: service.priceLabel.trim(), announceKwacha: false };
    }
    if (service.priceZmw === null || service.priceZmw === undefined || service.priceZmw === "") {
      return { text: "Free", announceKwacha: false };
    }
    var amount = Number(service.priceZmw);
    if (!Number.isFinite(amount)) {
      return { text: "Free", announceKwacha: false };
    }
    if (amount === 0) {
      return { text: "Free", announceKwacha: false };
    }
    var text;
    if (Number.isInteger(amount)) {
      text = "K" + formatGroupedInteger(amount);
    } else {
      var negative = amount < 0;
      var fixed = Math.abs(amount).toFixed(2);
      var bits = fixed.split(".");
      text =
        (negative ? "-K" : "K") +
        formatGroupedInteger(Number(bits[0])) +
        "." +
        bits[1];
    }
    return { text: text, announceKwacha: true };
  }

  function formatHours(entry) {
    if (!entry || entry.open == null || entry.close == null) return "Closed";
    return entry.open + "–" + entry.close;
  }

  function lusakaClock(now) {
    var when = now || new Date();
    var day = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Africa/Lusaka"
    }).format(when);
    var parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Africa/Lusaka"
    }).formatToParts(when);
    var hour = "00";
    var minute = "00";
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i].type === "hour") hour = parts[i].value;
      if (parts[i].type === "minute") minute = parts[i].value;
    }
    return { day: day, hm: hour + ":" + minute };
  }

  function isOpenAt(entry, hm) {
    if (!entry || entry.open == null || entry.close == null) return false;
    if (entry.open >= entry.close) return false;
    if (entry.open === "00:00" && entry.close === "23:59") return true;
    var beforeClose = entry.close === "23:59" ? hm <= entry.close : hm < entry.close;
    return hm >= entry.open && beforeClose;
  }

  function hoursStatus(hours, now) {
    var clock = lusakaClock(now);
    var entry = null;
    if (Array.isArray(hours)) {
      for (var i = 0; i < hours.length; i += 1) {
        if (hours[i] && hours[i].day === clock.day) {
          entry = hours[i];
          break;
        }
      }
    }
    if (!entry || entry.open == null || entry.close == null) {
      return { day: clock.day, hm: clock.hm, openNow: false, label: "Closed today" };
    }
    if (isOpenAt(entry, clock.hm)) {
      var allDay = entry.open === "00:00" && entry.close === "23:59";
      return {
        day: clock.day,
        hm: clock.hm,
        openNow: true,
        label: allDay ? "Open today" : "Open today until " + entry.close
      };
    }
    if (clock.hm < entry.open) {
      return {
        day: clock.day,
        hm: clock.hm,
        openNow: false,
        label: "Opens today at " + entry.open
      };
    }
    return { day: clock.day, hm: clock.hm, openNow: false, label: "Closed for today" };
  }

  function sanitizeSchemaType(value) {
    if (typeof value === "string" && SCHEMA_TYPES[value]) return value;
    return "LocalBusiness";
  }

  function validateConfig(config) {
    var errors = [];
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return ["Config must be a JSON object"];
    }

    if (typeof config.fictional !== "boolean") {
      errors.push("fictional must be true or false");
    }
    if (config.fictional === true) {
      if (typeof config.fictionalNote !== "string" || config.fictionalNote.trim().length < 10) {
        errors.push("fictionalNote is required when fictional is true");
      }
    }

    ["name", "tagline"].forEach(function (key) {
      if (typeof config[key] !== "string" || !config[key].trim()) {
        errors.push(key + " is required");
      }
    });

    if (!config.theme || typeof config.theme !== "object") {
      errors.push("theme is required");
    } else {
      ["primary", "onPrimary", "accent", "ink", "paper", "muted", "soft"].forEach(function (key) {
        if (typeof config.theme[key] !== "string" || !HEX.test(config.theme[key])) {
          errors.push("theme." + key + " must be a #RRGGBB colour");
        }
      });
    }

    if (!Array.isArray(config.services) || config.services.length === 0) {
      errors.push("services must list at least one item");
    } else {
      config.services.forEach(function (service, index) {
        var where = "services[" + index + "]";
        if (!service || typeof service.name !== "string" || !service.name.trim()) {
          errors.push(where + ".name is required");
        }
        if (service && service.detail != null && typeof service.detail !== "string") {
          errors.push(where + ".detail must be text");
        }
        var price = service && service.priceZmw;
        var hasLabel = service && typeof service.priceLabel === "string" && service.priceLabel.trim();
        var priceOk =
          price === null ||
          (typeof price === "number" && Number.isFinite(price) && price >= 0);
        if (!priceOk) {
          errors.push(where + ".priceZmw must be a number or null");
        } else if (price === null && !hasLabel) {
          // null means free, which is valid even without a label
        }
        if (service && service.priceLabel != null && typeof service.priceLabel !== "string") {
          errors.push(where + ".priceLabel must be text");
        }
      });
    }

    if (!Array.isArray(config.hours) || config.hours.length !== 7) {
      errors.push("hours must list all 7 days");
    } else {
      var seen = {};
      config.hours.forEach(function (entry, index) {
        var where = "hours[" + index + "]";
        if (!entry || WEEKDAYS.indexOf(entry.day) === -1) {
          errors.push(where + ".day must be a weekday name");
          return;
        }
        if (seen[entry.day]) errors.push("hours lists " + entry.day + " more than once");
        seen[entry.day] = true;
        var openSet = entry.open != null;
        var closeSet = entry.close != null;
        if (openSet !== closeSet) {
          errors.push(where + " needs both open and close, or both null when closed");
          return;
        }
        if (!openSet) return;
        if (!TIME.test(entry.open) || !TIME.test(entry.close)) {
          errors.push(where + " open and close must be HH:MM");
          return;
        }
        if (entry.open >= entry.close) {
          errors.push(where + " close must be later than open on the same day");
        }
      });
      WEEKDAYS.forEach(function (day) {
        if (!seen[day]) errors.push("hours is missing " + day);
      });
    }

    if (!config.logo || !isSafeAssetPath(config.logo.src) || typeof config.logo.alt !== "string" || !config.logo.alt.trim()) {
      errors.push("logo.src must be a relative path and logo.alt is required");
    }
    if (config.favicon != null && !isSafeAssetPath(config.favicon)) {
      errors.push("favicon must be a relative path");
    }

    if (!Array.isArray(config.gallery) || config.gallery.length === 0) {
      errors.push("gallery must include at least one image");
    } else {
      config.gallery.forEach(function (photo, index) {
        if (!photo || !isSafeAssetPath(photo.src)) {
          errors.push("gallery[" + index + "].src must be a relative path");
        }
        if (!photo || typeof photo.alt !== "string" || !photo.alt.trim()) {
          errors.push("gallery[" + index + "].alt is required");
        }
      });
    }

    var location = config.location;
    if (!location || typeof location !== "object") {
      errors.push("location is required");
    } else {
      ["address", "area", "city"].forEach(function (key) {
        if (typeof location[key] !== "string" || !location[key].trim()) {
          errors.push("location." + key + " is required");
        }
      });
      if (typeof location.lat !== "number" || location.lat < -90 || location.lat > 90) {
        errors.push("location.lat must be a latitude");
      }
      if (typeof location.lng !== "number" || location.lng < -180 || location.lng > 180) {
        errors.push("location.lng must be a longitude");
      }
    }

    var contact = config.contact;
    if (!contact || typeof contact !== "object") {
      errors.push("contact is required");
    } else {
      ["phone", "phoneDisplay", "whatsapp", "whatsappMessage"].forEach(function (key) {
        if (typeof contact[key] !== "string" || !contact[key].trim()) {
          errors.push("contact." + key + " is required");
        }
      });
      if (contact.email != null && contact.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errors.push("contact.email must be an email address");
      }
      try {
        if (contact.whatsapp) normalizeWhatsAppPhone(contact.whatsapp);
      } catch (error) {
        errors.push("contact.whatsapp: " + error.message);
      }
      try {
        if (contact.phone) buildTelLink(contact.phone);
      } catch (error) {
        errors.push("contact.phone: " + error.message);
      }
    }

    if (!Array.isArray(config.payments) || config.payments.length === 0) {
      errors.push("payments must include at least one mobile-money number");
    } else {
      config.payments.forEach(function (payment, index) {
        if (!payment || typeof payment.provider !== "string" || !payment.provider.trim()) {
          errors.push("payments[" + index + "].provider is required");
        }
        if (!payment || typeof payment.number !== "string" || !payment.number.trim()) {
          errors.push("payments[" + index + "].number is required");
        }
      });
    }

    if (!Array.isArray(config.socials)) {
      errors.push("socials must be a list");
    } else {
      config.socials.forEach(function (social, index) {
        if (!social || typeof social.name !== "string" || !social.name.trim()) {
          errors.push("socials[" + index + "].name is required");
        }
        if (!social || !isHttpUrl(social.url)) {
          errors.push("socials[" + index + "].url must be an http(s) link");
        }
      });
    }

    if (!config.seo || typeof config.seo.title !== "string" || !config.seo.title.trim()) {
      errors.push("seo.title is required");
    }
    if (!config.seo || typeof config.seo.description !== "string" || !config.seo.description.trim()) {
      errors.push("seo.description is required");
    } else if (config.seo.description.length > 300) {
      errors.push("seo.description must be 300 characters or fewer");
    }
    if (!config.seo || !isSafeAssetPath(config.seo.image)) {
      errors.push("seo.image must be a relative path");
    }

    if (config.schemaType != null && !SCHEMA_TYPES[config.schemaType]) {
      errors.push("schemaType must be a supported business type");
    }

    return errors;
  }

  return {
    DEMOS: DEMOS,
    WEEKDAYS: WEEKDAYS,
    SCHEMA_TYPES: SCHEMA_TYPES,
    buildWhatsAppLink: buildWhatsAppLink,
    normalizeWhatsAppPhone: normalizeWhatsAppPhone,
    buildTelLink: buildTelLink,
    buildOsmEmbedUrl: buildOsmEmbedUrl,
    buildOsmLink: buildOsmLink,
    buildGoogleMapsLink: buildGoogleMapsLink,
    isSafeAssetPath: isSafeAssetPath,
    isHttpUrl: isHttpUrl,
    resolveConfigUrl: resolveConfigUrl,
    formatPrice: formatPrice,
    formatHours: formatHours,
    hoursStatus: hoursStatus,
    isOpenAt: isOpenAt,
    sanitizeSchemaType: sanitizeSchemaType,
    validateConfig: validateConfig
  };
});
