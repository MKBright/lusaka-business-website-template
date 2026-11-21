const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const kit = require("../js/sitekit.js");

const root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function loadJson(rel) {
  return JSON.parse(read(rel));
}

function luminance(hex) {
  const channels = [0, 2, 4].map((index) => {
    const value = parseInt(hex.slice(index + 1, index + 3), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const left = luminance(a);
  const right = luminance(b);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

const demos = [
  ["demos/kamwala-grocer.json", "kamwala", "GroceryStore"],
  ["demos/riverside-fellowship.json", "chapel", "Church"]
];

test("both fictional demos are valid configs", () => {
  for (const [file, demoId, schemaType] of demos) {
    const config = loadJson(file);
    const errors = kit.validateConfig(config);
    assert.deepEqual(errors, [], file + " " + errors.join("; "));
    assert.equal(config.fictional, true);
    assert.equal(config.demoId, demoId);
    assert.equal(config.schemaType, schemaType);
    assert.match(config.fictionalNote, /not a real/i);
    assert.match(config.contact.whatsappMessage, /fictional/i);
    assert.ok(config.services.length >= 3);
    assert.ok(config.gallery.length >= 3);
    assert.ok(config.seo.title.length <= 60, config.seo.title);
    assert.ok(config.seo.description.length <= 160, config.seo.description);
    assert.ok(config.location.lat < -15.35 && config.location.lat > -15.55);
    assert.ok(config.location.lng > 28.22 && config.location.lng < 28.4);
    assert.equal(config.location.city, "Lusaka");
    const providers = config.payments.map((payment) => payment.provider);
    assert.ok(providers.includes("MTN MoMo"));
    assert.ok(providers.includes("Airtel Money"));
    for (const social of config.socials) {
      assert.equal(new URL(social.url).hostname, "example.com");
    }
    const link = kit.buildWhatsAppLink(config.contact.whatsapp, config.contact.whatsappMessage);
    assert.match(link, /^https:\/\/wa\.me\/260\d+\?text=/);
    assert.match(link, /fictional/);
    assert.equal(kit.buildTelLink(config.contact.phone).startsWith("tel:+260"), true);
  }
});

test("demo colours meet WCAG AA contrast", () => {
  for (const [file] of demos) {
    const { theme } = loadJson(file);
    assert.ok(contrast(theme.ink, theme.paper) >= 7, file + " ink on paper");
    assert.ok(contrast(theme.muted, theme.paper) >= 4.5, file + " muted on paper");
    assert.ok(contrast(theme.onPrimary, theme.primary) >= 4.5, file + " button text");
    assert.ok(contrast(theme.primary, theme.paper) >= 4.5, file + " primary on paper");
    assert.ok(contrast(theme.ink, theme.soft) >= 4.5, file + " today row");
  }
});

test("demo images and logos are small relative files", () => {
  let total = 0;
  for (const [file] of demos) {
    const config = loadJson(file);
    const paths = [
      config.logo.src,
      config.favicon,
      config.seo.image,
      ...config.gallery.map((photo) => photo.src)
    ];
    for (const rel of paths) {
      assert.equal(kit.isSafeAssetPath(rel), true, rel);
      const absolute = path.join(root, rel);
      assert.equal(fs.existsSync(absolute), true, rel);
      const size = fs.statSync(absolute).size;
      assert.ok(size > 80, rel + " looks empty");
      assert.ok(size < 40 * 1024, rel + " is too heavy for a slow connection");
      total += size;
    }
  }
  assert.ok(total < 200 * 1024, "demo art should stay under 200KB combined");
});

test("the shell uses relative paths, basic SEO, and a self-contained 404", () => {
  const index = read("index.html");
  assert.match(index, /lang="en"/);
  assert.match(index, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.match(index, /name="description"/);
  assert.match(index, /property="og:title"/);
  assert.match(index, /property="og:description"/);
  assert.match(index, /property="og:image"/);
  assert.match(index, /rel="icon"/);
  assert.match(index, /href="css\/styles.css"/);
  assert.match(index, /src="js\/sitekit.js"/);
  assert.match(index, /src="js\/app.js"/);
  assert.match(index, /name="site-config" content="demos\/kamwala-grocer.json"/);
  assert.equal(fs.existsSync(path.join(root, "demos/kamwala-grocer.json")), true);

  for (const match of index.matchAll(/(?:src|href)="([^"]*)"/g)) {
    const url = match[1];
    if (url.startsWith("#")) continue;
    assert.equal(url.startsWith("/"), false, url);
    assert.equal(url.includes("://"), false, url);
  }

  const notFound = read("404.html");
  assert.match(notFound, /Page not found/);
  assert.match(notFound, /id="home"/);
  assert.match(notFound, /lusaka-business-website-template/);
  assert.doesNotMatch(notFound, /<link[^>]+stylesheet/i);

  const app = read("js/app.js");
  const css = read("css/styles.css");
  assert.match(app, /Website by Wankumbu Musunga/);
  assert.match(app, /https:\/\/github\.com\/MKBright/);
  assert.doesNotMatch(app, /innerHTML/);
  assert.doesNotMatch(index + css + app, /fonts\.googleapis|cdnjs|unpkg|jsdelivr/i);

  assert.ok(fs.statSync(path.join(root, "css/styles.css")).size < 30 * 1024);
  assert.ok(fs.statSync(path.join(root, "js/app.js")).size < 40 * 1024);
  assert.ok(fs.statSync(path.join(root, "js/sitekit.js")).size < 30 * 1024);
  assert.equal(fs.existsSync(path.join(root, ".nojekyll")), true);

  const workflow = read(".github/workflows/test.yml");
  assert.match(workflow, /node --test/);
});

test("the readme includes phone screenshots and marks the prices as estimates", () => {
  const readme = read("README.md");
  assert.match(readme, /docs\/screenshots\/kamwala-mobile\.png/);
  assert.match(readme, /docs\/screenshots\/chapel-mobile\.png/);
  assert.match(readme, /estimates, not a quote/i);
  for (const file of ["docs/screenshots/kamwala-mobile.png", "docs/screenshots/chapel-mobile.png"]) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
    assert.ok(bytes.length > 20 * 1024, file);
    assert.ok(bytes.length < 800 * 1024, file);
  }
});

test("a broken config reports the field to fix", () => {
  const config = loadJson("demos/kamwala-grocer.json");
  config.name = "";
  config.services[0].priceZmw = "280";
  config.gallery[0].src = "../secret.jpg";
  config.contact.whatsapp = "123";
  const errors = kit.validateConfig(config);
  assert.ok(errors.some((error) => error.includes("name")));
  assert.ok(errors.some((error) => error.includes("priceZmw")));
  assert.ok(errors.some((error) => error.includes("gallery")));
  assert.ok(errors.some((error) => error.includes("whatsapp")));
});
