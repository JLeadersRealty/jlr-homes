const $ = [
    "https://homes.jleadersrealty.org",
    "https://www.jleadersrealty.org",
    "https://jleadersrealty.org",
  ],
  j = "JLR Listing Website";
// Acreage/rural: never show an instant number (an $800K Persia acreage came back $422K in testing).
// Iowa rural addressing = 5-digit house number or a 100th+ numbered road. Skips the RentCast lookup entirely.
function isRural(s) {
  const addr = String(s.property_address || "").trim(),
    ia = String(s.property_state || "IA").toUpperCase() === "IA";
  if (ia && /^\d{5,}\b/.test(addr)) return true;
  const road = addr.match(/\b(\d{3,})(st|nd|rd|th)\b/i);
  return !!(ia && road && Number(road[1]) >= 100);
}
async function k(c, b, h) {
  if (!c.RENTCAST_API_KEY || !h) return null;
  const y = caches.default,
    i = h
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim(),
    s = new Request("https://avm.jlr.cache/" + encodeURIComponent(i));
  let e = await y
    .match(s)
    .then((t) => t && t.json())
    .catch(() => null);
  if (!e) {
    const t = b.headers.get("CF-Connecting-IP") || "x",
      m = new Request(
        "https://avm.jlr.cache/ip/" +
          t +
          "/" +
          new Date().toISOString().slice(0, 10),
      ),
      g =
        Number(
          await y
            .match(m)
            .then((d) => d && d.text())
            .catch(() => 0),
        ) || 0;
    if (g >= 3) return null;
    await y.put(
      m,
      new Response(String(g + 1), {
        headers: { "Cache-Control": "max-age=86400" },
      }),
    );
    const f = await fetch(
      "https://api.rentcast.io/v1/avm/value?compCount=6&address=" +
        encodeURIComponent(h),
      {
        headers: {
          "X-Api-Key": c.RENTCAST_API_KEY,
          Accept: "application/json",
        },
      },
    );
    (e = f.ok ? await f.json().catch(() => ({})) : { error: f.status }),
      console.log(
        "rentcast",
        f.status,
        e.price,
        e.priceRangeLow,
        e.priceRangeHigh,
        (e.comparables || []).length,
      ),
      await y.put(
        s,
        new Response(JSON.stringify(e), {
          headers: { "Cache-Control": "max-age=" + (f.ok ? 2592e3 : 86400) },
        }),
      );
  }
  const S = Number(e.price) || 0,
    C = Number(e.priceRangeLow) || 0,
    r = Number(e.priceRangeHigh) || 0,
    p = (e.comparables || []).filter((t) => t.price > 0);
  if (!S || p.length < 3 || !C || !r || (r - C) / S > 0.35) return null;
  const a = (t) => Math.round(t / 1e3) * 1e3,
    u = e.subjectProperty || {};
  if (!u.squareFootage && !u.bedrooms) return null; // home not found in records
  if (Number(u.lotSize) > 43560) return null; // over ~1 acre
  return {
    price: a(S),
    low: a(C),
    high: a(r),
    home: {
      address: u.formattedAddress || h,
      beds: u.bedrooms || null,
      baths: u.bathrooms || null,
      sqft: u.squareFootage || null,
      year: u.yearBuilt || null,
    },
    comps: p
      .sort((t, m) => (m.correlation || 0) - (t.correlation || 0))
      .slice(0, 5)
      .map((t) => ({
        address: t.formattedAddress,
        price: t.price,
        beds: t.bedrooms || null,
        baths: t.bathrooms || null,
        sqft: t.squareFootage || null,
        miles: t.distance != null ? Math.round(t.distance * 10) / 10 : null,
        status: t.status || "",
        date: (t.removedDate || t.listedDate || "").slice(0, 10),
      })),
  };
}
var P = {
  async fetch(c, b) {
    const h = c.headers.get("Origin") || "",
      y = {
        "Access-Control-Allow-Origin": $.includes(h) ? h : $[0],
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      },
      i = (o, l) =>
        new Response(JSON.stringify(l), {
          status: o,
          headers: { ...y, "Content-Type": "application/json" },
        });
    if (c.method === "OPTIONS") return new Response(null, { headers: y });
    if (c.method !== "POST") return i(405, { ok: !1 });
    if (!$.includes(h)) return i(403, { ok: !1 });
    let s;
    try {
      s = await c.json();
    } catch {
      return i(400, { ok: !1 });
    }
    if (s.website) return i(200, { ok: !0 });
    if (
      b.TURNSTILE_SECRET &&
      !(
        await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: new URLSearchParams({
              secret: b.TURNSTILE_SECRET,
              response: s["cf-turnstile-response"] || "",
              remoteip: c.headers.get("CF-Connecting-IP") || "",
            }),
          },
        ).then((l) => l.json())
      ).success
    )
      return i(400, { ok: !1, error: "spam-check" });
    const e = (o) =>
        String(o || "")
          .trim()
          .slice(0, 500),
      S = e(s.name),
      C = S.split(/\s+/);
    let r = e(s.email),
      p = e(s.phone);
    if (s.contact) {
      const o = e(s.contact);
      o.includes("@") ? (r = r || o) : (p = p || o);
    }
    if (!S || (!r && !p)) return i(400, { ok: !1, error: "missing" });
    const a = s.listing || {},
      u = [
        e(s.property_address),
        e(s.property_city),
        [e(s.property_state), e(s.property_zip)].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", "),
      isTest = /^TEST\b/.test(S), // name starting with TEST (caps): no Follow Up Boss, nothing saved
      t =
        s.form === "home_value" && !isRural(s)
          ? await k(b, c, u).catch(
              (o) => (console.log("avm error", String(o)), null),
            )
          : null,
      m = (o) => "$" + Number(o).toLocaleString("en-US"),
      g = [e(a.address), e(a.city), e(a.state)].filter(Boolean).join(", "),
      f = {
        showing: {
          type: "Property Inquiry",
          label: "Showing request",
          msg: `Wants a showing of ${g}. Best time: ${e(s.when) || "not given"}.`,
        },
        alerts: {
          type: "Property Inquiry",
          label: "Price/status alerts",
          msg: `Wants a heads-up if ${g} changes price or goes under contract.`,
        },
        question: {
          type: "Property Inquiry",
          label: "Question",
          msg: `Question about ${g}: ${e(s.message)}`,
        },
        home_value: {
          type: "Seller Inquiry",
          label: "Home value request",
          msg:
            `Wants the value of their home at ${u} (from ${g ? "the " + g + " listing site" : "the JLR website"}). ` +
            (t
              ? `Instant estimate shown on screen: ${m(t.price)} (range ${m(t.low)}-${m(t.high)}, RentCast). Follow up with a real comps-based range.`
              : "No instant number shown (not enough data); they were promised a range within 1 business day."),
        },
      },
      d = f[s.form] || f.question,
      I = s.utm || {},
      R = {
        source: e(a.source) || j,
        system: "JLR Listing Websites",
        type: d.type,
        message: d.msg,
        description: `${d.label} from ${e(s.page)}${I.utm_source ? ` (via ${e(I.utm_source)}/${e(I.utm_medium)})` : ""}`,
        pageUrl: e(s.page),
        person: {
          firstName: C[0],
          lastName: C.slice(1).join(" "),
          emails: r ? [{ value: r }] : [],
          phones: p ? [{ value: p }] : [],
          tags: ["Listing Website", e(a.slug), d.label].filter(Boolean),
        },
        campaign: {
          source: e(I.utm_source),
          medium: e(I.utm_medium),
          campaign: e(I.utm_campaign),
        },
      };
    d.type === "Property Inquiry"
      ? (R.property = {
          street: e(a.address),
          city: e(a.city),
          state: e(a.state),
          code: e(a.zip),
          mlsNumber: e(a.mls),
          price: Number(a.price) || void 0,
          url: e(s.page),
        })
      : ((R.property = {
          street: e(s.property_address),
          city: e(s.property_city),
          state: e(s.property_state),
          code: e(s.property_zip),
        }),
        t && (R.property.price = t.price));
    if (isTest) return i(200, { ok: !0, estimate: t, test: !0 });
    const _ = {
        Authorization: "Basic " + btoa(b.FUB_API_KEY + ":"),
        "Content-Type": "application/json",
        "X-System": "JLR-Listing-Websites",
      },
      w = await fetch("https://api.followupboss.com/v1/events", {
        method: "POST",
        headers: _,
        body: JSON.stringify(R),
      });
    if (!w.ok && w.status !== 204) return i(502, { ok: !1, error: "crm" });
    const T = Number(a.agentId) || (s.form === "home_value" ? 1 : 0);
    if (T && w.status !== 204) {
      const o = await w.json().catch(() => ({}));
      let l =
        o.personId ||
        (o.person && o.person.id) ||
        (o.firstName !== void 0 && o.id);
      if (!l) {
        const v = r
            ? `email=${encodeURIComponent(r)}`
            : `phone=${encodeURIComponent(p)}`,
          n = await fetch(
            `https://api.followupboss.com/v1/people?${v}&limit=1&sort=-created`,
            { headers: _ },
          )
            .then((O) => O.json())
            .catch(() => ({}));
        l = n.people && n.people[0] && n.people[0].id;
      }
      if (
        (console.log(
          "fub event",
          w.status,
          Object.keys(o).slice(0, 12).join(","),
          "person",
          l,
        ),
        l)
      ) {
        const v = async (n, O) => {
          const N = await fetch("https://api.followupboss.com/v1/tasks", {
            method: "POST",
            headers: _,
            body: JSON.stringify({
              personId: l,
              assignedUserId: T,
              type: "Follow Up",
              dueDate: O,
              name: n,
            }),
          });
          N.ok ||
            console.log(
              "task failed",
              N.status,
              (await N.text()).slice(0, 300),
            );
        };
        if (w.status === 201) {
          const n = await fetch(`https://api.followupboss.com/v1/people/${l}`, {
            method: "PUT",
            headers: _,
            body: JSON.stringify({ assignedUserId: T }),
          });
          n.ok ||
            console.log(
              "assign failed",
              n.status,
              (await n.text()).slice(0, 300),
            );
        }
        if (s.form === "home_value") {
          const n = new Date();
          for (
            n.setUTCDate(n.getUTCDate() + 1);
            [0, 6].includes(n.getUTCDay());

          )
            n.setUTCDate(n.getUTCDate() + 1);
          await v(
            `Home value follow-up for ${u}: ${t ? "saw instant estimate " + m(t.price) + "; call/send your comps-based range" : "no instant number; send their estimated range"} (promised within 1 business day). In Claude: "run comps on ${u}"`,
            n.toISOString().slice(0, 10),
          );
        } else
          w.status !== 201 &&
            (await v(
              `${d.label} on ${e(a.address)} listing site: follow up`,
              new Date().toISOString().slice(0, 10),
            ));
      }
    }
    return i(200, { ok: !0, estimate: t });
  },
};
export { P as default };
