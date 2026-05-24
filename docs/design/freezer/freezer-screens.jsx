// Freezer module — single freezer detail view, audit walkthrough, settings, chip sheet.

// ─── /freezer/[id] ────────────────────────────────────────

function FzDetailDesktop() {
  return (
    <div className="fz-frame">
      <MiniNav active="freezer" />
      <div className="fz-desktop-scroll">
        <div className="fz-header">
          <div className="fz-eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--ink-3)" }}>‹</span> FREEZER · GARAGE
          </div>
          <div className="fz-header-row">
            <div>
              <h1 className="fz-headline"><Snow />&nbsp;Garage <em>freezer</em></h1>
              <p className="fz-subhead">48 items · last audited 32 days ago · two items past toss-by.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn">+ Add item</button>
              <button className="fz-cta-primary">Audit this freezer →</button>
            </div>
          </div>
        </div>

        <div className="fz-filter-row">
          <div className="fz-tabs">
            <span className="fz-tab active">Active · 48</span>
            <span className="fz-tab">All · 214</span>
          </div>
          <span style={{ width: 1, height: 18, background: "var(--rule)", margin: "0 6px" }} />
          <span className="fz-filter-chip active">All categories</span>
          <span className="fz-filter-chip">Cooked meat · 8</span>
          <span className="fz-filter-chip">Soup &amp; stew · 6</span>
          <span className="fz-filter-chip">Vegetable · 11</span>
          <span className="fz-filter-chip">Fruit · 7</span>
          <span className="fz-filter-chip">Stock · 4</span>
          <span className="fz-filter-chip">Bread · 3</span>
          <span className="fz-filter-chip">Sauce · 2</span>
          <span className="fz-filter-chip">Raw meat · 7</span>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>
            sorted: toss-by ↑ · <a className="fz-change-link">edit mode</a>
          </div>
        </div>

        <div className="fz-group">
          <ItemRow state="expired" name="Beef chili (double batch)" category="Soup & stew" when="toss by 2026-05-22" urgent={<><em>2 days</em> past</>} urgentTone="expired" dish="Tuesday chili night" />
          <ItemRow state="expired" name="Frozen peas (bag)" category="Vegetable" when="toss by 2026-05-23" urgent={<><em>1 day</em> past</>} urgentTone="expired" />
          <ItemRow state="approaching" name="Chicken stock (4 cups)" category="Stock" when="toss by 2026-06-02" urgent={<>in <em>9 days</em></>} urgentTone="warn" dish="Chicken chickpea soup" />
          <ItemRow state="approaching" name="Pesto, basil" category="Sauce" when="toss by 2026-06-07" urgent={<>in <em>14 days</em></>} />
          <ItemRow name="Carnitas, 2 lb" category="Cooked meat" when="toss by 2026-08-20" urgent="Aug 20" />
          <ItemRow name="Pork shoulder, 4 lb" category="Raw meat" when="toss by 2026-11-12" urgent="Nov 12" />
          <ItemRow name="Roasted tomato sauce, 1 qt" category="Sauce" when="toss by 2026-08-04" urgent="Aug 04" />
          <ItemRow name="Strawberries, 2 pints" category="Fruit" when="toss by 2026-11-17" urgent="Nov 17" />
          <ItemRow name="Sourdough loaf, sliced" category="Bread" when="toss by 2026-06-04" urgent={<>in <em>11 days</em></>} urgentTone="warn" />
          <ItemRow name="Bone broth, 6 cups" category="Stock" when="toss by 2026-09-18" urgent="Sep 18" />
          <ItemRow name="Bolognese, 1 qt" category="Soup & stew" when="toss by 2026-08-12" urgent="Aug 12" dish="Pasta Bolognese" />
          <ItemRow name="Spinach, chopped" category="Vegetable" when="toss by 2026-10-30" urgent="Oct 30" />
        </div>
      </div>
    </div>);

}

function FzDetailMobileBulk() {
  // bulk select mode
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <MobileTop back={true} right={<span style={{ fontSize: 13, color: "var(--accent-ink)", fontWeight: 500 }}>Done</span>} />
      <div className="fz-mobile-scroll">
        <div className="fz-header mobile" style={{ paddingBottom: 14, marginBottom: 12 }}>
          <div className="fz-eyebrow">EDIT MODE</div>
          <h1 className="fz-headline mobile" style={{ marginTop: 6, fontSize: 24 }}>
            <Snow />&nbsp;Garage <em>freezer</em>
          </h1>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>3 selected · long-press to start</div>
        </div>

        <div className="fz-group">
          <div className="fz-row bulk">
            <span className="fz-check on">✓</span>
            <div className="fz-row-main">
              <div className="fz-row-name">Beef chili (double)</div>
              <div className="fz-row-meta"><span className="fz-cat">Soup</span><span className="sep" /><span className="mono">toss 05-22</span></div>
            </div>
            <div className="fz-row-right"><div className="fz-row-prom expired-tone"><em>2d</em> past</div></div>
          </div>
          <div className="fz-row bulk">
            <span className="fz-check on">✓</span>
            <div className="fz-row-main">
              <div className="fz-row-name">Frozen peas</div>
              <div className="fz-row-meta"><span className="fz-cat">Veg</span><span className="sep" /><span className="mono">toss 05-23</span></div>
            </div>
            <div className="fz-row-right"><div className="fz-row-prom expired-tone"><em>1d</em> past</div></div>
          </div>
          <div className="fz-row bulk">
            <span className="fz-check"></span>
            <div className="fz-row-main">
              <div className="fz-row-name">Chicken stock, 4c</div>
              <div className="fz-row-meta"><span className="fz-cat">Stock</span></div>
            </div>
            <div className="fz-row-right"><div className="fz-row-prom warn">in <em>9d</em></div></div>
          </div>
          <div className="fz-row bulk">
            <span className="fz-check on">✓</span>
            <div className="fz-row-main">
              <div className="fz-row-name">Pesto, basil</div>
              <div className="fz-row-meta"><span className="fz-cat">Sauce</span></div>
            </div>
            <div className="fz-row-right"><div className="fz-row-prom">in <em>14d</em></div></div>
          </div>
          <div className="fz-row bulk">
            <span className="fz-check"></span>
            <div className="fz-row-main">
              <div className="fz-row-name">Carnitas, 2 lb</div>
              <div className="fz-row-meta"><span className="fz-cat">Cooked meat</span></div>
            </div>
            <div className="fz-row-right"><div className="fz-row-prom">Aug 20</div></div>
          </div>
        </div>

        <div className="fz-bulk-bar">
          <div className="count"><b>3</b> selected</div>
          <div className="fz-bulk-bar-actions">
            <span className="fz-bulk-btn">Used</span>
            <span className="fz-bulk-btn">Wasted</span>
            <span className="fz-bulk-btn">Move</span>
          </div>
        </div>
      </div>
    </div>);

}

// ─── /freezer/[id]/audit ──────────────────────────────────

function FzAuditCard({ withResume = false }) {
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <div className="fz-audit-frame">
        <div className="fz-audit-head">
          <span className="where"><Snow />Auditing <em style={{ fontStyle: "italic", fontWeight: 400 }}>Garage</em></span>
          <span className="fz-audit-progress">3 / 18</span>
          <span className="fz-audit-discard">Discard</span>
        </div>

        {withResume &&
        <div className="fz-audit-resume">
            <span className="snowflake">❄</span>
            <div>Resuming audit. <b style={{ fontStyle: "normal", fontFamily: "var(--sans)" }}>14 items</b> remaining.</div>
          </div>
        }

        <div className="fz-audit-card">
          <div className="fz-audit-eyebrow">ITEM · COOKED MEAT</div>
          <h1 className="fz-audit-name">Carnitas, <em>two pounds</em></h1>

          <div className="fz-audit-meta">
            <div className="row"><span className="mono">added Aug 14</span><span style={{ width: 3, height: 3, background: "var(--ink-4)", borderRadius: "50%" }} /><span className="mono">toss by Nov 12</span></div>
            <div className="row urgency">in 21 days</div>
          </div>

          <div className="fz-audit-notes">
            "Double batch from Sunday cook. Bottom shelf, behind the<br />frozen peas. Use for tacos."
          </div>

          <div className="fz-audit-actions">
            <button className="fz-audit-btn primary"><span className="glyph">✓</span> Still here</button>
            <button className="fz-audit-btn"><span className="glyph">◉</span> Used</button>
            <button className="fz-audit-btn muted"><span className="glyph">×</span> Wasted</button>
            <div className="fz-audit-skip">Skip — decide later</div>
          </div>
        </div>
      </div>
    </div>);

}

function FzAuditFinish() {
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <div className="fz-audit-frame">
        <div className="fz-audit-head">
          <span className="where"><Snow />Auditing <em style={{ fontStyle: "italic", fontWeight: 400 }}>Garage</em></span>
          <span className="fz-audit-progress">18 / 18</span>
          <span style={{ width: 60 }}></span>
        </div>

        <div className="fz-audit-finish">
          <div className="glyph">❄</div>
          <h1>That's a <em>full sweep</em>.</h1>
          <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-2)", fontSize: 15, margin: 0 }}>
            You audited 18 items.
          </p>

          <div className="summary">
            <div className="stat"><span className="n">14</span><span className="l">STILL HERE</span></div>
            <div className="stat used"><span className="n">3</span><span className="l">USED</span></div>
            <div className="stat wasted"><span className="n">1</span><span className="l">WASTED</span></div>
          </div>

          <button className="fz-audit-btn primary" style={{ marginBottom: 10 }}>Finish audit</button>
          <div className="fz-audit-skip">View changes before saving</div>
        </div>
      </div>
    </div>);

}

// ─── /settings — Freezer card ─────────────────────────────

function FzSettings() {
  return (
    <div className="fz-frame">
      <MiniNav active="settings" />
      <div className="fz-desktop-scroll">
        <div className="fz-header">
          <div className="fz-eyebrow">SETTINGS</div>
          <div className="fz-header-row">
            <div>
              <h1 className="fz-headline">Household <em>settings</em></h1>
              <p className="fz-subhead"></p>
            </div>
          </div>
        </div>

        {/* one settings card shown — the new Freezer one */}
        <div className="fz-settings-card">
          <div className="fz-settings-head">
            <div>
              <h2 className="fz-settings-title"><Snow />&nbsp;<em>Freezer</em></h2>
              <div className="fz-settings-sub">Toss-by windows, categories, push notifications, export.</div>
            </div>
            <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-3)" }}>3 freezers · 52 items</div>
          </div>

          {/* Freezers */}
          <div className="fz-settings-section">
            <h3>Freezers</h3>
            <div className="fz-freezer-list">
              {[
                { name: "Garage", suffix: "freezer", items: 22, audited: "32 days", url: "/freezer/add?freezerId=garage" },
                { name: "Kitchen", suffix: "freezer", items: 18, audited: "4 days", url: "/freezer/add?freezerId=kitchen" },
                { name: "Basement", suffix: "chest", items: 12, audited: "11 days", url: "/freezer/add?freezerId=basement" },
              ].map((f) => (
                <div key={f.name} className="fz-freezer-row">
                  <div className="fz-freezer-top">
                    <div className="fz-freezer-name"><Snow/>{f.name} <em>{f.suffix}</em></div>
                    <div className="fz-freezer-actions">
                      <span className="btn btn-sm">Rename</span>
                      <span className="fz-freezer-del" title="Delete freezer">×</span>
                    </div>
                  </div>
                  <div className="fz-freezer-meta">
                    <span><b>{f.items}</b> active items</span>
                    <span className="sep"/>
                    <span>audited <b>{f.audited}</b> ago</span>
                  </div>
                  <div className="fz-nfc-chip">
                    <span className="fz-nfc-label">NFC</span>
                    <span className="fz-nfc-url">{f.url}</span>
                    <span className="fz-nfc-copy">Copy</span>
                  </div>
                </div>
              ))}
              <div className="fz-freezer-add">
                <span>Add a freezer</span>
                <span className="fz-freezer-add-hint">we'll mint an NFC tag URL for it</span>
              </div>
            </div>
          </div>

          {/* General */}
          <div className="fz-settings-section">
            <h3>General</h3>
            <div className="fz-settings-row">
              <div>
                <div className="fz-settings-name">Approaching toss-by window</div>
                <div className="fz-settings-desc">Items within this many days show up under <em>Approaching</em> on the dashboard.</div>
              </div>
              <div className="fz-num-input">
                <input defaultValue="14" />
                <span className="suffix">days</span>
              </div>
            </div>
            <div className="fz-settings-row">
              <div>
                <div className="fz-settings-name">Audit reminder threshold</div>
                <div className="fz-settings-desc">Freezers not audited in this many days get a nudge in the dashboard subhead.</div>
              </div>
              <div className="fz-num-input">
                <input defaultValue="60" />
                <span className="suffix">days</span>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="fz-settings-section">
            <h3>Categories</h3>
            <div className="fz-cat-table">
              <div className="fz-cat-row">
                <span className="field">Cooked meat</span>
                <span className="field mono">90 days</span>
                <span className="default">default</span>
                <span className="del">×</span>
              </div>
              <div className="fz-cat-row">
                <span className="field">Soup &amp; stew</span>
                <span className="field mono">90 days</span>
                <span className="default">default</span>
                <span className="del">×</span>
              </div>
              <div className="fz-cat-row">
                <span className="field">Vegetable</span>
                <span className="field mono">240 days</span>
                <span className="default">default</span>
                <span className="del">×</span>
              </div>
              <div className="fz-cat-row">
                <span className="field">Fruit</span>
                <span className="field mono">240 days</span>
                <span className="default">default</span>
                <span className="del">×</span>
              </div>
              <div className="fz-cat-row">
                <span className="field">Bread</span>
                <span className="field mono">60 days</span>
                <span className="default">default</span>
                <span className="del">×</span>
              </div>
              <div className="fz-cat-row">
                <span className="field">Stock</span>
                <span className="field mono">120 days</span>
                <span className="default">default</span>
                <span className="del">×</span>
              </div>
              <div className="fz-cat-row">
                <span className="field">Mom's pierogi</span>
                <span className="field mono">365 days</span>
                <span className="default" style={{ visibility: "hidden" }}>default</span>
                <span className="del">×</span>
              </div>
              <div className="fz-cat-add">
                <span>Add category</span>
                <span className="fz-cat-restore">↻ Restore defaults</span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="fz-settings-section">
            <h3>Notifications · ntfy.sh</h3>
            <div className="fz-settings-row">
              <div>
                <div className="fz-settings-name">Enable freezer notifications</div>
                <div className="fz-settings-desc">Weekly digest + same-day toss-by alerts pushed via ntfy.</div>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span className="btn btn-sm">Send test push</span>
                <span className="toggle on"><span></span></span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
              <div>
                <div className="fz-settings-name" style={{ marginBottom: 6 }}>Server URL</div>
                <input className="input" defaultValue="https://ntfy.sh" />
              </div>
              <div>
                <div className="fz-settings-name" style={{ marginBottom: 6 }}>Topic</div>
                <input className="input" defaultValue="rowan-household-freezer-9k3" />
              </div>
              <div>
                <div className="fz-settings-name" style={{ marginBottom: 6 }}>Auth token <span style={{ color: "var(--ink-3)", fontSize: 11, marginLeft: 4 }}>optional</span></div>
                <input className="input" placeholder="—" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div className="fz-settings-name" style={{ marginBottom: 6 }}>Digest day</div>
                  <div className="input" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>Sunday <span style={{ color: "var(--ink-3)" }}>⌄</span></div>
                </div>
                <div>
                  <div className="fz-settings-name" style={{ marginBottom: 6 }}>Hour</div>
                  <div className="input" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono)" }}>09 <span style={{ color: "var(--ink-3)" }}>⌄</span></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>);

}

// ─── Calendar chip variant sheet ──────────────────────────

function FzChipSheet() {
  return (
    <div className="fz-frame dim" style={{ height: "100%" }}>
      <div className="fz-sheet">
        <div>
          <div className="fz-eyebrow">CALENDAR CHIP · SMALL CHANGE</div>
          <h2 style={{ marginTop: 6 }}>The ❄ <em>badge</em> on linked dishes.</h2>
          <p className="fz-subhead" style={{ maxWidth: 600 }}>
            Calendar chips already exist. We add one thing: a small frost-tint ❄ badge in front of the dish name when the entry has any active freezer item linked to it. A long-press / hover affordance offers to mark the linked item used in-place.
          </p>
        </div>

        <div className="row">
          {/* No badge */}
          <div className="ctx">
            <div className="label">CHIP A · no freezer link</div>
            <div className="stage">
              <div className="head">DINNER · WED MAY 27</div>
              <div className="fz-chip">
                <div className="bar"></div>
                <div className="body">
                  <div className="name">Sheet-Pan Harissa Salmon</div>
                  <div className="meta"><span>35 min</span><span>·</span><span>2 servings</span></div>
                </div>
              </div>
            </div>
            <div className="caption">Plain chip, unchanged from today's calendar.</div>
          </div>

          {/* With badge */}
          <div className="ctx">
            <div className="label">CHIP B · linked to a freezer item</div>
            <div className="stage">
              <div className="head">DINNER · TUE MAY 26</div>
              <div className="fz-chip">
                <div className="bar"></div>
                <div className="body">
                  <div className="name"><span className="snowflake">❄</span> Pasta Bolognese</div>
                  <div className="meta"><span>20 min</span><span>·</span><span>4 servings</span></div>
                </div>
              </div>
            </div>
            <div className="caption">Frost ❄ in a soft chip in front of the name. Same height, no layout shift.</div>
          </div>

          {/* Hover, single linked item */}
          <div className="ctx">
            <div className="label">HOVER · one item linked</div>
            <div className="stage">
              <div className="head">LUNCH · MON MAY 25</div>
              <div className="fz-chip" style={{ boxShadow: "0 4px 12px oklch(0.2 0 0 / 0.08)", borderColor: "var(--ink-4)" }}>
                <div className="bar"></div>
                <div className="body">
                  <div className="name"><span className="snowflake">❄</span> Tuesday chili night</div>
                  <div className="meta"><span>reheat 10 min</span></div>
                </div>
              </div>
              <div className="fz-hover-tip">
                <div className="action"><span className="snowflake">❄</span> Mark used</div>
                <div className="target">Beef chili (double)</div>
              </div>
            </div>
            <div className="caption">Names the linked item. One tap completes the action.</div>
          </div>

          {/* Hover, multiple linked */}
          <div className="ctx">
            <div className="label">HOVER · multiple linked</div>
            <div className="stage">
              <div className="head">DINNER · THU MAY 28</div>
              <div className="fz-chip" style={{ boxShadow: "0 4px 12px oklch(0.2 0 0 / 0.08)", borderColor: "var(--ink-4)" }}>
                <div className="bar"></div>
                <div className="body">
                  <div className="name"><span className="snowflake">❄</span> Lasagna night</div>
                  <div className="meta"><span>3 items linked</span></div>
                </div>
              </div>
              <div className="fz-hover-tip">
                <span className="snowflake">❄</span> 3 linked items — open in Freezer ↗
              </div>
            </div>
            <div className="caption">Ambiguous → defers to the dashboard rather than guessing.</div>
          </div>
        </div>
      </div>
    </div>);

}

Object.assign(window, {
  FzDetailDesktop, FzDetailMobileBulk,
  FzAuditCard, FzAuditFinish,
  FzSettings, FzChipSheet
});