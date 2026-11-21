const test = require("node:test");
const assert = require("node:assert/strict");
const kit = require("../js/sitekit.js");

const shopHours = [
  { day: "Monday", open: "07:00", close: "20:00" },
  { day: "Tuesday", open: "07:00", close: "20:00" },
  { day: "Wednesday", open: "07:00", close: "20:00" },
  { day: "Thursday", open: "07:00", close: "20:00" },
  { day: "Friday", open: "07:00", close: "20:00" },
  { day: "Saturday", open: "07:00", close: "20:00" },
  { day: "Sunday", open: "08:00", close: "13:00" }
];

test("map links use the coordinates and an OpenStreetMap embed", () => {
  const embed = kit.buildOsmEmbedUrl(-15.4298, 28.2876);
  assert.equal(
    embed,
    "https://www.openstreetmap.org/export/embed.html?bbox=28.28160,-15.43580,28.29360,-15.42380&layer=mapnik&marker=-15.42980,28.28760"
  );
  assert.equal(
    kit.buildGoogleMapsLink(-15.4298, 28.2876),
    "https://www.google.com/maps/search/?api=1&query=-15.42980,28.28760"
  );
  assert.equal(
    kit.buildOsmLink(-15.4298, 28.2876),
    "https://www.openstreetmap.org/?mlat=-15.42980&mlon=28.28760#map=17/-15.42980/28.28760"
  );
});

test("telephone links keep a leading plus and drop spaces", () => {
  assert.equal(kit.buildTelLink("+260 97 000 0148"), "tel:+260970000148");
  assert.throws(() => kit.buildTelLink("123"), /8 to 15/);
});

test("demo query is an allow-list, not a file path", () => {
  assert.equal(kit.resolveConfigUrl("?demo=kamwala"), "demos/kamwala-grocer.json");
  assert.equal(kit.resolveConfigUrl("?demo=shop"), "demos/kamwala-grocer.json");
  assert.equal(kit.resolveConfigUrl("?demo=CHAPEL"), "demos/riverside-fellowship.json");
  assert.equal(kit.resolveConfigUrl("?demo=church"), "demos/riverside-fellowship.json");
  assert.equal(
    kit.resolveConfigUrl("?demo=../../etc/passwd", { siteConfig: "demos/kamwala-grocer.json" }),
    "demos/kamwala-grocer.json"
  );
  assert.equal(
    kit.resolveConfigUrl("?demo=chapel", { siteConfig: "site.json" }),
    "demos/riverside-fellowship.json"
  );
  assert.equal(kit.resolveConfigUrl("", { siteConfig: "site.json" }), "site.json");
  assert.equal(
    kit.resolveConfigUrl("?demo=nope", { siteConfig: "../secret.json" }),
    "demos/kamwala-grocer.json"
  );
  assert.equal(kit.resolveConfigUrl(""), "demos/kamwala-grocer.json");
});

test("prices format in kwacha, and free or labelled prices stay words", () => {
  assert.deepEqual(kit.formatPrice({ priceZmw: 280 }), { text: "K280", announceKwacha: true });
  assert.deepEqual(kit.formatPrice({ priceZmw: 1500 }), { text: "K1,500", announceKwacha: true });
  assert.deepEqual(kit.formatPrice({ priceZmw: 12.5 }), { text: "K12.50", announceKwacha: true });
  assert.deepEqual(kit.formatPrice({ priceZmw: null }), { text: "Free", announceKwacha: false });
  assert.deepEqual(kit.formatPrice({ priceZmw: 0 }), { text: "Free", announceKwacha: false });
  assert.deepEqual(kit.formatPrice({ priceZmw: null, priceLabel: "From K5" }), {
    text: "From K5",
    announceKwacha: false
  });
  assert.equal(kit.formatHours({ open: "07:00", close: "20:00" }), "07:00–20:00");
  assert.equal(kit.formatHours({ open: null, close: null }), "Closed");
});

test("opening status uses Africa/Lusaka time", () => {
  const before = kit.hoursStatus(shopHours, new Date("2026-01-05T04:30:00Z"));
  assert.equal(before.day, "Monday");
  assert.equal(before.label, "Opens today at 07:00");
  assert.equal(before.openNow, false);

  const during = kit.hoursStatus(shopHours, new Date("2026-01-05T06:00:00Z"));
  assert.equal(during.label, "Open today until 20:00");
  assert.equal(during.openNow, true);

  const closing = kit.hoursStatus(shopHours, new Date("2026-01-05T18:00:00Z"));
  assert.equal(closing.label, "Closed for today");

  const sunday = kit.hoursStatus(shopHours, new Date("2026-01-04T08:00:00Z"));
  assert.equal(sunday.day, "Sunday");
  assert.equal(sunday.label, "Open today until 13:00");

  const shut = kit.hoursStatus(
    [{ day: "Monday", open: null, close: null }],
    new Date("2026-01-05T06:00:00Z")
  );
  assert.equal(shut.label, "Closed today");
});

test("asset paths stay relative", () => {
  assert.equal(kit.isSafeAssetPath("assets/photos/kamwala-front.svg"), true);
  assert.equal(kit.isSafeAssetPath("/assets/photo.jpg"), false);
  assert.equal(kit.isSafeAssetPath("//cdn.example/a.jpg"), false);
  assert.equal(kit.isSafeAssetPath("https://example.com/a.jpg"), false);
  assert.equal(kit.isSafeAssetPath("../secret.json"), false);
  assert.equal(kit.isSafeAssetPath("assets/../../etc/passwd"), false);
  assert.equal(kit.isHttpUrl("https://example.com/shop"), true);
  assert.equal(kit.isHttpUrl("javascript:alert(1)"), false);
});
