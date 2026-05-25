// Freezer module — all screens for the design canvas.
// Reads shared design tokens from styles.css + freezer-styles.css.
// One file, many components: each exported to window so design-canvas.jsx
// can mount them inside <DCArtboard>.

// ─── Shared bits ───────────────────────────────────────────

const Snow = () => <span className="snowflake">❄</span>;

function MiniNav({ active = "freezer" }) {
  const items = [
  { id: "calendar", label: "Calendar" },
  { id: "dishes", label: "Dishes" },
  { id: "freezer", label: "Freezer" },
  { id: "planning", label: "Planning" },
  { id: "lists", label: "Shopping" },
  { id: "settings", label: "Settings" }];

  return (
    <header className="fz-nav">
      <div className="nav-brand">
        <span className="nav-brand-dot" />
        Meal Planner <i>&nbsp;for two</i>
      </div>
      <nav className="fz-nav-links">
        {items.map((n) =>
        <span key={n.id} className={"nav-link" + (n.id === active ? " active" : "")}>{n.label}</span>
        )}
      </nav>
      <div className="nav-meta">
        <span className="serif-it">Sun, May 24</span>
      </div>
    </header>);

}

function MobileStatus() {
  return (
    <div className="fz-status">
      <span>9:41</span>
      <span className="fz-status-glyphs">
        <span className="fz-status-bars"><span></span><span></span><span></span><span></span></span>
        <span style={{ marginLeft: 6 }}>5G</span>
        <span className="fz-status-batt" style={{ marginLeft: 6 }}></span>
      </span>
    </div>);

}

function MobileTop({ back = false, title = null, right = null }) {
  return (
    <div className="fz-mobile-top">
      {back ?
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: 13 }}>
          <span style={{ fontSize: 18 }}>‹</span> Freezer
        </span> :

      <div className="nav-brand">
          <span className="nav-brand-dot" />
          Meal Planner
        </div>
      }
      {right || <span style={{ fontSize: 18, color: "var(--ink-3)" }}>≡</span>}
    </div>);

}

// row used in dashboard buckets + freezer detail
function ItemRow({ name, urgent, urgentTone, when, category, dish, state }) {
  return (
    <div className={"fz-row" + (state ? " " + state : "")}>
      <div className="fz-row-main">
        <div className="fz-row-name">
          {name}
          {dish && <span className="fz-dish-chip"><Snow /> Linked: {dish}</span>}
        </div>
        <div className="fz-row-meta">
          {category && <span className="fz-cat">{category}</span>}
          {category && when && <span className="sep" />}
          {when && <span className="mono">{when}</span>}
        </div>
      </div>
      <div className="fz-row-right">
        <div className={"fz-row-prom" + (urgentTone === "expired" ? " expired-tone" : urgentTone === "warn" ? " warn" : "")}>
          {urgent}
        </div>
      </div>
    </div>);

}

// ─── 1. DASHBOARD ─────────────────────────────────────────

function FzDashboardDesktop({ withExpanded = false }) {
  return (
    <div className="fz-frame">
      <MiniNav active="freezer" />
      <div className="fz-desktop-scroll">
        <div className="fz-header">
          <div className="fz-eyebrow">FREEZER</div>
          <div className="fz-header-row">
            <div>
              <h1 className="fz-headline">Three freezers · <em>fifty-two items</em></h1>
            </div>
            <button className="fz-cta-primary">+ Add item</button>
          </div>
        </div>

        <section className="fz-bucket">
          <div className="fz-bucket-head">
            <div className="fz-eyebrow expired"><span className="glyph">⚠</span>EXPIRED — TOSS NOW <span className="count">· 2</span></div>
          </div>

          <div className="fz-group">
            <div className="fz-group-head">
              <div className="fz-group-name"><Snow />Garage <em>freezer</em></div>
              <div className="fz-group-meta">2 items</div>
            </div>
            {withExpanded ?
            <>
                <div className="fz-row expired expanded">
                  <div className="fz-row-top">
                    <div className="fz-row-main">
                      <div className="fz-row-name">Beef chili (double batch)</div>
                      <div className="fz-row-meta">
                        <span className="fz-cat">Soup &amp; stew</span>
                        <span className="sep" /><span className="mono">toss by 2026-05-22</span>
                      </div>
                    </div>
                    <div className="fz-row-right">
                      <div className="fz-row-prom expired-tone"><em>2 days</em> past</div>
                    </div>
                  </div>
                  <div className="fz-row-actions">
                    <button className="btn">Mark used</button>
                    <button className="btn">Mark wasted</button>
                    <button className="btn">Move</button>
                    <button className="btn btn-ghost">Edit</button>
                  </div>
                </div>
                <ItemRow state="expired" name="Frozen peas (bag)" category="Vegetable" when="toss by 2026-05-23" urgent={<><em>1 day</em> past</>} urgentTone="expired" />
              </> :

            <>
                <ItemRow state="expired" name="Beef chili (double batch)" category="Soup & stew" when="toss by 2026-05-22" urgent={<><em>2 days</em> past</>} urgentTone="expired" dish="Tuesday chili night" />
                <ItemRow state="expired" name="Frozen peas (bag)" category="Vegetable" when="toss by 2026-05-23" urgent={<><em>1 day</em> past</>} urgentTone="expired" />
              </>
            }
          </div>
        </section>

        <section className="fz-bucket">
          <div className="fz-bucket-head">
            <div className="fz-eyebrow"><span className="glyph">⏳</span>APPROACHING — NEXT 14 DAYS <span className="count">· 4</span></div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--mono)" }}>window: 14 days</div>
          </div>

          <div className="fz-group">
            <div className="fz-group-head">
              <div className="fz-group-name"><Snow />Kitchen <em>freezer</em></div>
              <div className="fz-group-meta">2 items</div>
            </div>
            <ItemRow name="Lasagna (half tray)" dish="Lasagna" category="Main" when="toss by 2026-05-30" urgent={<>in <em>6 days</em></>} urgentTone="warn" />
            <ItemRow name="Sourdough loaf, sliced" category="Bread" when="toss by 2026-06-04" urgent={<>in <em>11 days</em></>} />
          </div>

          <div className="fz-group">
            <div className="fz-group-head">
              <div className="fz-group-name"><Snow />Garage <em>freezer</em></div>
              <div className="fz-group-meta">2 items</div>
            </div>
            <ItemRow name="Chicken stock (4 cups)" dish="Chicken chickpea soup" category="Stock" when="toss by 2026-06-02" urgent={<>in <em>9 days</em></>} urgentTone="warn" />
            <ItemRow name="Pesto, basil" category="Sauce" when="toss by 2026-06-07" urgent={<>in <em>14 days</em></>} />
          </div>
        </section>

        <section className="fz-bucket">
          <div className="fz-bucket-head">
            <div className="fz-eyebrow"><span className="glyph">✚</span>RECENTLY ADDED — LAST 7 DAYS <span className="count">· 2</span></div>
          </div>
          <div className="fz-group">
            <div className="fz-row compact">
              <div className="fz-row-main">
                <div className="fz-row-name">Carnitas, 2 lb</div>
                <div className="fz-row-meta">
                  <span className="fz-cat">Cooked meat</span>
                  <span className="sep" /><span className="mono">added 2026-05-22 · Garage</span>
                </div>
              </div>
              <div className="fz-row-right">
                <div className="fz-row-prom">Aug 20</div>
              </div>
            </div>
            <div className="fz-row compact">
              <div className="fz-row-main">
                <div className="fz-row-name">Strawberries, 2 pints</div>
                <div className="fz-row-meta">
                  <span className="fz-cat">Fruit</span>
                  <span className="sep" /><span className="mono">added 2026-05-19 · Kitchen</span>
                </div>
              </div>
              <div className="fz-row-right">
                <div className="fz-row-prom">Nov 17</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>);

}

function FzDashboardDesktopEmpty() {
  return (
    <div className="fz-frame">
      <MiniNav active="freezer" />
      <div className="fz-desktop-scroll">
        <div className="fz-header">
          <div className="fz-eyebrow">FREEZER</div>
          <div className="fz-header-row">
            <div>
              <h1 className="fz-headline">Your freezer log starts <em>here</em>.</h1>
              <p className="fz-subhead">Add a freezer to begin.</p>
            </div>
          </div>
        </div>
        <div className="fz-empty" style={{ padding: "40px 32px 60px" }}>
          <div className="fz-empty-mark">❄</div>
          <div style={{ display: "inline-flex", gap: 10, marginTop: 12 }}>
            <button className="fz-cta-primary">Set up a freezer</button>
            <button className="btn">Read about NFC tags</button>
          </div>
        </div>
      </div>
    </div>);

}

function FzDashboardMobile() {
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <MobileTop />
      <div className="fz-mobile-scroll">
        <div className="fz-header mobile">
          <div className="fz-eyebrow">FREEZER</div>
          <h1 className="fz-headline mobile" style={{ marginTop: 8 }}>Three freezers · <em>fifty-two items</em></h1>
        </div>

        <section className="fz-bucket mobile">
          <div className="fz-bucket-head">
            <div className="fz-eyebrow expired"><span className="glyph">⚠</span>EXPIRED <span className="count">· 2</span></div>
          </div>
          <div className="fz-group">
            <div className="fz-group-head">
              <div className="fz-group-name"><Snow />Garage <em>freezer</em></div>
              <div className="fz-group-meta">2</div>
            </div>
            <ItemRow state="expired" name="Beef chili" category="Soup" when="toss 05-22" urgent={<><em>2d</em> past</>} urgentTone="expired" />
            <ItemRow state="expired" name="Frozen peas" category="Veg" when="toss 05-23" urgent={<><em>1d</em> past</>} urgentTone="expired" />
          </div>
        </section>

        <section className="fz-bucket mobile">
          <div className="fz-bucket-head">
            <div className="fz-eyebrow"><span className="glyph">⏳</span>APPROACHING <span className="count">· 4</span></div>
          </div>
          <div className="fz-group">
            <div className="fz-group-head">
              <div className="fz-group-name"><Snow />Kitchen <em>freezer</em></div>
              <div className="fz-group-meta">2</div>
            </div>
            <ItemRow name="Lasagna (half)" dish="Lasagna" when="05-30" urgent={<>in <em>6d</em></>} urgentTone="warn" />
            <ItemRow name="Sourdough, sliced" when="06-04" urgent={<>in <em>11d</em></>} />
          </div>
          <div className="fz-group">
            <div className="fz-group-head">
              <div className="fz-group-name"><Snow />Garage <em>freezer</em></div>
              <div className="fz-group-meta">2</div>
            </div>
            <ItemRow name="Chicken stock, 4c" dish="Soup" when="06-02" urgent={<>in <em>9d</em></>} urgentTone="warn" />
            <ItemRow name="Basil pesto" when="06-07" urgent={<>in <em>14d</em></>} />
          </div>
        </section>

        <section className="fz-bucket mobile">
          <div className="fz-bucket-head">
            <div className="fz-eyebrow"><span className="glyph">✚</span>RECENTLY ADDED <span className="count">· 2</span></div>
          </div>
          <div className="fz-group">
            <div className="fz-row compact">
              <div className="fz-row-main">
                <div className="fz-row-name">Carnitas, 2 lb</div>
                <div className="fz-row-meta"><span className="mono">added 05-22 · Garage</span></div>
              </div>
              <div className="fz-row-right"><div className="fz-row-prom">Aug 20</div></div>
            </div>
            <div className="fz-row compact">
              <div className="fz-row-main">
                <div className="fz-row-name">Strawberries, 2 pints</div>
                <div className="fz-row-meta"><span className="mono">added 05-19 · Kitchen</span></div>
              </div>
              <div className="fz-row-right"><div className="fz-row-prom">Nov 17</div></div>
            </div>
          </div>
        </section>
      </div>
      <div className="fz-fab"><span className="glyph">+</span> Add item</div>
    </div>);

}

function FzDashboardMobileExpanded() {
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <MobileTop />
      <div className="fz-mobile-scroll">
        <div className="fz-header mobile">
          <div className="fz-eyebrow">FREEZER</div>
          <h1 className="fz-headline mobile" style={{ marginTop: 8, fontSize: 26 }}>Three freezers · <em>fifty-two items</em></h1>
        </div>

        <section className="fz-bucket mobile">
          <div className="fz-bucket-head">
            <div className="fz-eyebrow expired"><span className="glyph">⚠</span>EXPIRED <span className="count">· 2</span></div>
          </div>
          <div className="fz-group">
            <div className="fz-group-head">
              <div className="fz-group-name"><Snow />Garage <em>freezer</em></div>
              <div className="fz-group-meta">2</div>
            </div>

            {/* expanded row */}
            <div className="fz-row expired expanded">
              <div className="fz-row-top">
                <div className="fz-row-main">
                  <div className="fz-row-name">Beef chili (double)</div>
                  <div className="fz-row-meta">
                    <span className="fz-cat">Soup</span><span className="sep" />
                    <span className="mono">toss 05-22</span>
                  </div>
                </div>
                <div className="fz-row-right">
                  <div className="fz-row-prom expired-tone"><em>2d</em> past</div>
                </div>
              </div>
              <div className="fz-row-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="btn">Mark used</button>
                <button className="btn">Mark wasted</button>
                <button className="btn">Move</button>
                <button className="btn btn-ghost">Edit</button>
              </div>
            </div>

            <ItemRow state="expired" name="Frozen peas" category="Veg" when="toss 05-23" urgent={<><em>1d</em> past</>} urgentTone="expired" />
          </div>
        </section>
        <div style={{ textAlign: "center", fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-3)", fontSize: 13, marginTop: 24 }}>
          tap a row to reveal actions in-place — no popovers
        </div>
      </div>
      <div className="fz-fab"><span className="glyph">+</span> Add item</div>
    </div>);

}

function FzDashboardMobileEmpty() {
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <MobileTop />
      <div className="fz-mobile-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="fz-empty">
          <div className="fz-empty-mark">❄</div>
          <h1 className="fz-empty-title">Your freezer log<br />starts <em>here</em>.</h1>
          <p className="fz-empty-sub">Add a freezer to begin.</p>
          <button className="fz-cta-primary" style={{ marginTop: 28 }}>Set up a freezer</button>
        </div>
      </div>
    </div>);

}

Object.assign(window, { Snow, MiniNav, MobileStatus, MobileTop, ItemRow,
  FzDashboardDesktop, FzDashboardDesktopEmpty, FzDashboardMobile, FzDashboardMobileExpanded, FzDashboardMobileEmpty });