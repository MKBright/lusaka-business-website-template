const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWhatsAppLink } = require("../js/sitekit.js");

test("builds a wa.me link from a Zambia number written with spaces and a plus", () => {
  const link = buildWhatsAppLink("+260 97 000 0148", "Hello & welcome?");
  assert.equal(link, "https://wa.me/260970000148?text=Hello%20%26%20welcome%3F");
});

test("turns a local 10-digit number starting with 0 into country code 260", () => {
  assert.equal(buildWhatsAppLink("097 000 0148"), "https://wa.me/260970000148");
  assert.equal(buildWhatsAppLink("097-000-0148"), "https://wa.me/260970000148");
});

test("turns a 9-digit Zambia mobile number into country code 260", () => {
  assert.equal(buildWhatsAppLink("970000148"), "https://wa.me/260970000148");
});

test("drops the international 00 prefix", () => {
  assert.equal(buildWhatsAppLink("00260970000148"), "https://wa.me/260970000148");
});

test("leaves a number that already includes 260 unchanged", () => {
  assert.equal(buildWhatsAppLink("260970000148", "Hi"), "https://wa.me/260970000148?text=Hi");
});

test("omits the text query when the message is empty", () => {
  assert.equal(buildWhatsAppLink("+260970000226", ""), "https://wa.me/260970000226");
  assert.equal(buildWhatsAppLink("+260970000226", "   "), "https://wa.me/260970000226");
  assert.equal(buildWhatsAppLink("+260970000226"), "https://wa.me/260970000226");
});

test("trims the prefilled message", () => {
  assert.equal(
    buildWhatsAppLink("260970000226", "  Hello there  "),
    "https://wa.me/260970000226?text=Hello%20there"
  );
});

test("rejects a missing or too-short phone number", () => {
  assert.throws(() => buildWhatsAppLink(""), /required/);
  assert.throws(() => buildWhatsAppLink("   "), /required/);
  assert.throws(() => buildWhatsAppLink("12345"), /8 to 15/);
  assert.throws(() => buildWhatsAppLink(null), /required/);
});
