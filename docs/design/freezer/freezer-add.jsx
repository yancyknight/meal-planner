// Freezer module — Add item form (mobile-first) + first-run wizard.

function FzAddMobile({ fromNFC = true }) {
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <MobileTop back={true} right={<span style={{ fontSize: 13, color: "var(--ink-3)" }}>Cancel</span>} />

      <div className="fz-mobile-scroll" style={{ paddingBottom: 24 }}>
        <div className="fz-header mobile" style={{ paddingBottom: 14, marginBottom: 14 }}>
          <div className="fz-eyebrow">ADD ITEM</div>
          <h1 className="fz-headline mobile" style={{ marginTop: 6, fontSize: 26 }}>
            What's going <em>in</em>?
          </h1>
        </div>

        <div className="fz-form">
          {/* Freezer */}
          <div className="fz-form-section">
            <div className="fz-form-label">Freezer</div>
            <div className={"fz-dropdown" + (fromNFC ? " from-nfc" : "")}>
              <div className="name"><Snow />Garage <em style={{ fontStyle: "italic", fontWeight: 400 }}>freezer</em></div>
              <span className="fz-dropdown-arrow">⌄</span>
            </div>
            {fromNFC && <div className="fz-form-help">— from NFC tag · tap to change</div>}
          </div>

          {/* Name (the most important field) */}
          <div className="fz-form-section">
            <div className="fz-form-label">Name <span style={{ color: "var(--ink-4)", letterSpacing: 0, textTransform: "none", fontWeight: 400, fontStyle: "italic", fontFamily: "var(--serif)", marginLeft: 6 }}>autofocused</span></div>
            <div className="fz-input-big" style={{ fontFamily: "var(--serif)" }}>
              Beef chili, <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--accent-ink)" }}>double batch</em>
              <span className="fz-input-cursor"></span>
            </div>
          </div>

          {/* Category */}
          <div className="fz-form-section">
            <div className="fz-form-label">Category</div>
            <div className="fz-pill-grid">
              <div className="fz-pill"><div className="name">Cooked meat</div><div className="life">90 d</div></div>
              <div className="fz-pill selected"><div className="name">Soup &amp; stew</div><div className="life">90 d default</div></div>
              <div className="fz-pill"><div className="name">Vegetable</div><div className="life">240 d</div></div>
              <div className="fz-pill"><div className="name">Fruit</div><div className="life">240 d</div></div>
              <div className="fz-pill"><div className="name">Bread</div><div className="life">60 d</div></div>
              <div className="fz-pill"><div className="name">Stock</div><div className="life">120 d</div></div>
              <div className="fz-pill"><div className="name">Sauce</div><div className="life">90 d</div></div>
              <div className="fz-pill"><div className="name">Raw meat</div><div className="life">180 d</div></div>
              <div className="fz-pill-more">more categories…</div>
            </div>
          </div>

          {/* Date added */}
          <div className="fz-form-section">
            <div className="fz-form-label">Date added</div>
            <div className="fz-chip-row">
              <div className="fz-date-chip">
                <span className="val">Today</span>
                <span className="sep" style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-4)", display: "inline-block" }}></span>
                <span className="mono">May 24</span>
              </div>
              <span className="fz-change-link">Change</span>
            </div>
          </div>

          {/* Collapsed advanced */}
          <div className="fz-collapsed">
            <span className="name">Lifetime override</span>
            <span className="right">Toss by Aug 22 (90 d)</span>
          </div>
          <div className="fz-collapsed">
            <span className="name">Notes</span>
          </div>
          <div className="fz-collapsed has-help">
            <div className="left">
              <span className="name">Link to a dish</span>
              <span className="help">Surfaces in planner so it's used in time.</span>
            </div>
            <span className="right" style={{ color: "var(--frost-ink)" }}><Snow /></span>
          </div>
          <div className="fz-collapsed has-help">
            <div className="left">
              <span className="name">Link to an ingredient</span>
              <span className="help">Used in the shopping list as on-hand.</span>
            </div>
          </div>

          {/* Preview chip — system-computed confirmation of dates */}
          <div className="fz-preview">
            <span className="fz-preview-label">PREVIEW</span>
            <span>Toss by <b className="mono">Aug 22</b> · target use <b className="mono">Jul 02</b></span>
          </div>

          {/* Submit */}
          <button className="fz-submit"><span className="glyph">+</span> Add to freezer</button>

          {fromNFC &&
          <div style={{ textAlign: "center", fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-3)", fontSize: 13, marginTop: -4 }}>
              Stays open — log a few in a row.
            </div>
          }
        </div>
      </div>
    </div>);

}

function FzAddFirstRun() {
  return (
    <div className="fz-frame mobile">
      <MobileStatus />
      <MobileTop right={<span style={{ fontSize: 13, color: "var(--ink-3)" }}>Cancel</span>} />
      <div className="fz-mobile-scroll">
        <div className="fz-header mobile">
          <div className="fz-eyebrow">SET UP</div>
          <h1 className="fz-headline mobile" style={{ marginTop: 6, fontSize: 26 }}>
            Name your <em>freezer</em>.
          </h1>
          <p className="fz-subhead mobile">You can add more later. Most homes start with one.</p>
        </div>

        <div className="fz-wizard">
          <div>
            <label>Name</label>
            <div className="fz-input-big" style={{ fontFamily: "var(--serif)", marginTop: 8 }}>
              Garage <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--accent-ink)" }}>freezer</em>
              <span className="fz-input-cursor"></span>
            </div>
          </div>

          <button className="fz-submit" style={{ marginTop: 6 }}>
            Continue →
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--ink-3)" }}>

        </div>
      </div>
    </div>);

}

Object.assign(window, { FzAddMobile, FzAddFirstRun });