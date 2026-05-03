(function () {
  "use strict";

  /** @typedef {{ n: number, d: number }} Rat */

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  /** @returns {Rat} */
  function rat(n, d) {
    if (d === 0) throw new Error("Division by zero in rational.");
    if (n === 0) return { n: 0, d: 1 };
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  /** @param {number} z @returns {Rat} */
  function ratFromInt(z) {
    return rat(z, 1);
  }

  /** @param {Rat} a @param {Rat} b @returns {Rat} */
  function ratAdd(a, b) {
    return rat(a.n * b.d + b.n * a.d, a.d * b.d);
  }

  /** @param {Rat} a @param {Rat} b @returns {Rat} */
  function ratSub(a, b) {
    return rat(a.n * b.d - b.n * a.d, a.d * b.d);
  }

  /** @param {Rat} a @param {Rat} b @returns {Rat} */
  function ratMul(a, b) {
    return rat(a.n * b.n, a.d * b.d);
  }

  /** @param {Rat} a @param {Rat} b @returns {Rat} */
  function ratDiv(a, b) {
    return rat(a.n * b.d, a.d * b.n);
  }

  /** @param {Rat} a @returns {Rat} */
  function ratNeg(a) {
    return rat(-a.n, a.d);
  }

  /** @param {Rat} a */
  function ratIsZero(a) {
    return a.n === 0;
  }

  /** @param {Rat} a */
  function ratIsOne(a) {
    return a.n === a.d;
  }

  /** @param {Rat} a */
  function formatRat(a) {
    if (ratIsZero(a)) return "0";
    if (a.d === 1) return String(a.n);
    return `${a.n}/${a.d}`;
  }

  /**
   * Coefficient in a row-op label: integers plain, fractions in parentheses.
   * @param {Rat} a
   */
  function formatCoefLabel(a) {
    if (ratIsZero(a)) return "0";
    if (a.d === 1) return String(a.n);
    return `(${a.n}/${a.d})`;
  }

  function ratToFloat(r) {
    return r.n / r.d;
  }

  /** @returns {Rat[][]} */
  function cloneMatrix(M) {
    return M.map((row) => row.map((x) => rat(x.n, x.d)));
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /**
   * @param {number} rows
   * @param {number} cols
   * @param {number} rangeAbs
   * @returns {Rat[][]}
   */
  function randomMatrix(rows, cols, rangeAbs) {
    let M;
    do {
      M = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
          row.push(ratFromInt(randomInt(-rangeAbs, rangeAbs)));
        }
        M.push(row);
      }
    } while (isAllZero(M));
    return M;
  }

  /** @param {Rat[][]} M */
  function isAllZero(M) {
    return M.every((row) => row.every((v) => ratIsZero(v)));
  }

  /**
   * @param {Rat[][]} M
   * @param {HTMLElement} el
   */
  function renderMatrix(M, el) {
    if (!M.length) {
      el.textContent = "";
      return;
    }
    const cols = M[0].length;
    const wrap = document.createElement("div");
    wrap.className = "matrix";
    const lb = document.createElement("span");
    lb.className = "bracket";
    lb.textContent = "[";
    const rb = document.createElement("span");
    rb.className = "bracket";
    rb.textContent = "]";
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    for (let i = 0; i < M.length; i++) {
      for (let j = 0; j < cols; j++) {
        const c = document.createElement("span");
        c.className = "cell" + (j === cols - 1 ? " cell-rhs" : "");
        c.textContent = formatRat(M[i][j]);
        grid.appendChild(c);
      }
    }
    wrap.appendChild(lb);
    wrap.appendChild(grid);
    wrap.appendChild(rb);
    el.replaceChildren(wrap);
  }

  /**
   * @param {string} s
   * @returns {[string, string] | null}
   */
  function splitOnArrow(s) {
    const seps = [
      { p: "-->", len: 3 },
      { p: "=>", len: 2 },
      { p: "->", len: 2 },
      { p: "→", len: 1 },
      { p: "←", len: 1 },
      { p: "=", len: 1 },
    ];
    let best = -1;
    let blen = 0;
    for (const { p, len } of seps) {
      const idx = s.indexOf(p);
      if (idx !== -1 && (best === -1 || idx < best)) {
        best = idx;
        blen = len;
      }
    }
    if (best === -1) return null;
    return [s.slice(0, best).trim(), s.slice(best + blen).trim()];
  }

  /**
   * @param {string} inner
   * @returns {{ n: number, d: number } | { error: string }}
   */
  function parseFractionInner(inner) {
    const t = inner.replace(/\s+/g, "");
    if (!t) return { error: "Empty parentheses." };
    const parts = t.split("/");
    if (parts.length === 2) {
      const n = parseInt(parts[0], 10);
      const d = parseInt(parts[1], 10);
      if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
        return { error: `Bad fraction “${inner}”.` };
      }
      return { n, d };
    }
    const n = parseInt(t, 10);
    if (!Number.isFinite(n)) return { error: `Bad number “${inner}”.` };
    return { n, d: 1 };
  }

  /**
   * From s[i], consume a signed rational (or implicit 1 before R handled by caller).
   * @param {string} s
   * @param {number} i
   * @returns {{ r: Rat, nextI: number } | { error: string }}
   */
  function consumeRational(s, i) {
    let sign = 1;
    if (s[i] === "+") {
      i++;
    } else if (s[i] === "-") {
      sign = -1;
      i++;
    }
    if (i >= s.length) return { error: "Incomplete coefficient." };
    if (s[i] === "R" || s[i] === "r") {
      return { r: rat(sign, 1), nextI: i };
    }
    if (s[i] === "(") {
      const close = s.indexOf(")", i);
      if (close === -1) return { error: "Missing closing )." };
      const inner = s.slice(i + 1, close);
      const pr = parseFractionInner(inner);
      if ("error" in pr) return pr;
      return { r: rat(sign * pr.n, pr.d), nextI: close + 1 };
    }
    const start = i;
    while (i < s.length && /\d/.test(s[i])) i++;
    if (i === start) return { error: "Digit or ( expected in coefficient." };
    const numPart = parseInt(s.slice(start, i), 10);
    if (s[i] === "/") {
      i++;
      const d0 = i;
      while (i < s.length && /\d/.test(s[i])) i++;
      if (i === d0) return { error: "Denominator expected after /." };
      const den = parseInt(s.slice(d0, i), 10);
      if (den === 0) return { error: "Denominator cannot be 0." };
      return { r: rat(sign * numPart, den), nextI: i };
    }
    return { r: rat(sign * numPart, 1), nextI: i };
  }

  /**
   * @param {string} rhs
   * @param {number} numRows
   * @returns {{ coeffs: Rat[] } | { error: string }}
   */
  function parseLinearCombo(rhs, numRows) {
    let s = rhs
      .replace(/\s+/g, "")
      .replace(/\*/g, "")
      .replace(/\u2212/g, "-")    // − → -
      .replace(/\u00b7/g, "")     // · (middle dot) → remove
      .replace(/\.(?=[Rr])/g, "") // plain dot before R → remove
      .replace(/--/g, "+")        // double-negative → positive
      .replace(/\+-/g, "-")       // +-  → -
      .replace(/-\+/g, "-");      // -+  → -
    if (!s) return { error: "Right-hand side is empty." };
    /** @type {Rat[]} */
    const coeffs = Array.from({ length: numRows }, () => ratFromInt(0));
    let i = 0;
    while (i < s.length) {
      let coef;
      if (s[i] === "R" || s[i] === "r") {
        coef = ratFromInt(1);
      } else {
        const cr = consumeRational(s, i);
        if ("error" in cr) return cr;
        coef = cr.r;
        i = cr.nextI;
        if (i >= s.length || (s[i] !== "R" && s[i] !== "r")) {
          return { error: `Expected R after coefficient in “${rhs}”.` };
        }
      }
      i++;
      if (i >= s.length || !/\d/.test(s[i])) {
        return { error: "Row number missing after R." };
      }
      const start = i;
      while (i < s.length && /\d/.test(s[i])) i++;
      const rn = parseInt(s.slice(start, i), 10);
      if (rn < 1 || rn > numRows) {
        return { error: `R${rn} is out of range (1–${numRows}).` };
      }
      coeffs[rn - 1] = ratAdd(coeffs[rn - 1], coef);
    }
    return { coeffs };
  }

  /**
   * @param {string} raw
   * @param {number} numRows
   * @returns {{ ok: true, op: { kind: 'swap', a: number, b: number } | { kind: 'combine', target: number, coeffs: Rat[] } } | { ok: false, message: string }}
   */
  function parseRowOperation(raw, numRows) {
    const t = raw.trim().replace(/\u2212/g, "-");
    if (!t) return { ok: false, message: "Empty input." };

    const compact = t.replace(/\s+/g, "");
    let sm = /^R(\d+)(?:<->|↔)R(\d+)$/i.exec(compact);
    if (sm) {
      const a = parseInt(sm[1], 10) - 1;
      const b = parseInt(sm[2], 10) - 1;
      if (a < 0 || a >= numRows || b < 0 || b >= numRows) {
        return { ok: false, message: `Row numbers must be between 1 and ${numRows}.` };
      }
      if (a === b) return { ok: false, message: "Cannot swap a row with itself." };
      return { ok: true, op: { kind: "swap", a, b } };
    }
    sm = /^swapR(\d+)R(\d+)$/i.exec(compact);
    if (sm) {
      const a = parseInt(sm[1], 10) - 1;
      const b = parseInt(sm[2], 10) - 1;
      if (a < 0 || a >= numRows || b < 0 || b >= numRows) {
        return { ok: false, message: `Row numbers must be between 1 and ${numRows}.` };
      }
      if (a === b) return { ok: false, message: "Cannot swap a row with itself." };
      return { ok: true, op: { kind: "swap", a, b } };
    }

    const parts = splitOnArrow(t);
    if (!parts) {
      return {
        ok: false,
        message:
          "Use a swap (e.g. R1 <-> R2), or an assignment with ->, →, ←, or = (e.g. R1 -> R1 - (2/3)R2).",
      };
    }
    const [left, right] = parts;
    const lm = /^R(\d+)$/i.exec(left.replace(/\s+/g, ""));
    if (!lm) {
      return { ok: false, message: "Left side must be a single row, e.g. R2." };
    }
    const target = parseInt(lm[1], 10) - 1;
    if (target < 0 || target >= numRows) {
      return { ok: false, message: `R${target + 1} is out of range (1–${numRows}).` };
    }
    const pl = parseLinearCombo(right, numRows);
    if ("error" in pl) return { ok: false, message: pl.error };
    return { ok: true, op: { kind: "combine", target, coeffs: pl.coeffs } };
  }

  /**
   * @param {Rat[][]} M
   * @param {{ kind: 'swap', a: number, b: number } | { kind: 'combine', target: number, coeffs: Rat[] }} op
   * @returns {{ ok: true, label: string } | { ok: false, message: string }}
   */
  function applyOperation(M, op) {
    const m = M.length;
    const n = M[0].length;
    if (op.kind === "swap") {
      const tmp = M[op.a];
      M[op.a] = M[op.b];
      M[op.b] = tmp;
      return { ok: true, label: `R${op.a + 1} ↔ R${op.b + 1}` };
    }
    const old = cloneMatrix(M);
    /** @type {Rat[]} */
    const newRow = Array.from({ length: n }, () => ratFromInt(0));
    for (let r = 0; r < m; r++) {
      for (let k = 0; k < n; k++) {
        newRow[k] = ratAdd(newRow[k], ratMul(op.coeffs[r], old[r][k]));
      }
    }
    M[op.target] = newRow;
    const parts = [];
    for (let r = 0; r < m; r++) {
      const c = op.coeffs[r];
      if (ratIsZero(c)) continue;
      if (ratIsOne(c)) parts.push({ sign: "+", t: `R${r + 1}` });
      else if (ratIsOne(ratNeg(c))) parts.push({ sign: "-", t: `R${r + 1}` });
      else if (c.n > 0) parts.push({ sign: "+", t: `${formatCoefLabel(c)}·R${r + 1}` });
      else parts.push({ sign: "-", t: `${formatCoefLabel(ratNeg(c))}·R${r + 1}` });
    }
    let rhs = "0";
    if (parts.length) {
      rhs = parts[0].sign === "-" ? `-${parts[0].t}` : parts[0].t;
      for (let i = 1; i < parts.length; i++) {
        rhs += parts[i].sign === "-" ? ` − ${parts[i].t}` : ` + ${parts[i].t}`;
      }
    }
    return { ok: true, label: `R${op.target + 1} ← ${rhs}` };
  }

  /** @param {Rat[]} row */
  function leadingIndex(row) {
    for (let j = 0; j < row.length; j++) {
      if (!ratIsZero(row[j])) return j;
    }
    return -1;
  }

  /** Count non-zero rows (= rank) in a matrix already in REF. */
  function matrixRank(M) {
    return M.reduce((acc, row) => acc + (leadingIndex(row) !== -1 ? 1 : 0), 0);
  }

  /**
   * Classify the system represented by augmented REF matrix M.
   * Last column is the RHS (b). Returns type + supporting numbers.
   * @param {Rat[][]} M  — must already be in REF
   * @returns {{ type: 'no-solution'|'unique'|'infinite', rankCoeff: number, rankAug: number, numVars: number }}
   */
  function classifySolution(M) {
    if (!M.length || !M[0].length) return { type: "infinite", rankCoeff: 0, rankAug: 0, numVars: 0 };
    const numVars = M[0].length - 1; // columns excluding the RHS
    const rankAug = matrixRank(M);
    const coeffOnly = M.map((row) => row.slice(0, numVars));
    const rankCoeff = matrixRank(coeffOnly);
    if (rankCoeff < rankAug) return { type: "no-solution", rankCoeff, rankAug, numVars };
    if (rankCoeff === numVars) return { type: "unique", rankCoeff, rankAug, numVars };
    return { type: "infinite", rankCoeff, rankAug, numVars };
  }

  /**
   * Build a human-readable verdict + rank-formula explanation.
   * @param {{ type: string, rankCoeff: number, rankAug: number, numVars: number }} sol
   * @returns {{ label: string, reason: string, isOk: boolean }}
   */
  function solExplain(sol) {
    const { type, rankCoeff, rankAug, numVars } = sol;
    const r  = rankCoeff;
    const ra = rankAug;
    const n  = numVars;
    const free = n - r;

    if (type === "no-solution") {
      return {
        label:  "No solution (inconsistent system)",
        reason: `rank(A) = ${r} < rank([A|b]) = ${ra}  →  a row reads  0 = non-zero, so the system is inconsistent.`,
        isOk:   false,
      };
    }
    if (type === "unique") {
      return {
        label:  "Unique solution",
        reason: `rank(A) = rank([A|b]) = ${r} = n = ${n}  →  every unknown has exactly one pivot, so the solution is unique.`,
        isOk:   true,
      };
    }
    return {
      label:  `Infinitely many solutions`,
      reason: `rank(A) = rank([A|b]) = ${r} < n = ${n}  →  ${free} free variable${free !== 1 ? "s" : ""}, so infinitely many solutions exist.`,
      isOk:   true,
    };
  }

  /** @param {Rat[][]} M */
  function isRowEchelon(M) {
    const m = M.length;
    const pivCol = [];
    for (let i = 0; i < m; i++) {
      pivCol.push(leadingIndex(M[i]));
    }
    let seenZero = false;
    let prev = -1;
    for (let i = 0; i < m; i++) {
      const j = pivCol[i];
      if (j === -1) {
        seenZero = true;
        continue;
      }
      if (seenZero) return false;
      if (j <= prev) return false;
      for (let r = i + 1; r < m; r++) {
        if (!ratIsZero(M[r][j])) return false;
      }
      prev = j;
    }
    return true;
  }

  /** @param {Rat[][]} M */
  function isRREF(M) {
    if (!isRowEchelon(M)) return false;
    const m = M.length;
    for (let i = 0; i < m; i++) {
      const j = leadingIndex(M[i]);
      if (j === -1) continue;
      if (!ratIsOne(M[i][j])) return false;
      for (let r = 0; r < m; r++) {
        if (r === i) continue;
        if (!ratIsZero(M[r][j])) return false;
      }
    }
    return true;
  }

  /**
   * @param {Rat[][]} A
   * @param {boolean} wantRref
   * @returns {{ matrix: Rat[][], steps: string[], snapshots: Rat[][][] }}
   */
  function rowEchelonWithSteps(A, wantRref) {
    const M = cloneMatrix(A);
    const m = M.length;
    const n = M[0].length;
    const steps = [];
    const snapshots = [cloneMatrix(M)];

    function record() {
      snapshots.push(cloneMatrix(M));
    }

    let lead = 0;

    for (let r = 0; r < m; r++) {
      if (lead >= n) break;

      let i = r;
      while (i < m && ratIsZero(M[i][lead])) i++;
      if (i === m) {
        lead++;
        r--;
        continue;
      }

      if (i !== r) {
        const tmp = M[i];
        M[i] = M[r];
        M[r] = tmp;
        steps.push(`R${i + 1} ↔ R${r + 1}`);
        record();
      }

      const piv = M[r][lead];
      for (let j = r + 1; j < m; j++) {
        const x = M[j][lead];
        if (ratIsZero(x)) continue;
        const c = ratDiv(x, piv);
        for (let k = lead; k < n; k++) {
          M[j][k] = ratSub(M[j][k], ratMul(c, M[r][k]));
        }
        steps.push(`R${j + 1} ← R${j + 1} − ${formatCoefLabel(c)}·R${r + 1}`);
        record();
      }
      lead++;
    }

    if (wantRref) {
      const pivots = [];
      for (let r = 0; r < m; r++) {
        let c = -1;
        for (let j = 0; j < n; j++) {
          if (!ratIsZero(M[r][j])) {
            c = j;
            break;
          }
        }
        if (c >= 0) pivots.push({ r, c });
      }

      for (let p = pivots.length - 1; p >= 0; p--) {
        const { r, c } = pivots[p];
        const piv = M[r][c];
        if (!ratIsOne(piv)) {
          const inv = ratDiv(ratFromInt(1), piv);
          for (let k = c; k < n; k++) {
            M[r][k] = ratMul(M[r][k], inv);
          }
          steps.push(`R${r + 1} ← ${formatCoefLabel(inv)}·R${r + 1}`);
          record();
        }
        for (let rr = 0; rr < r; rr++) {
          const x = M[rr][c];
          if (ratIsZero(x)) continue;
          for (let k = c; k < n; k++) {
            M[rr][k] = ratSub(M[rr][k], ratMul(x, M[r][k]));
          }
          steps.push(`R${rr + 1} ← R${rr + 1} − ${formatCoefLabel(x)}·R${r + 1}`);
          record();
        }
      }
    }

    return { matrix: M, steps, snapshots };
  }

  const els = {
    rows: document.getElementById("rows"),
    cols: document.getElementById("cols"),
    range: document.getElementById("range"),
    rref: document.getElementById("rref"),
    showRefSteps: document.getElementById("show-ref-steps"),
    refTimelinePanel: document.getElementById("ref-timeline-panel"),
    timelineSlider: document.getElementById("timeline-slider"),
    timelineLabel: document.getElementById("timeline-label"),
    timelineSvg: document.getElementById("timeline-svg"),
    timelineOp: document.getElementById("timeline-op"),
    timelineHeatmap: document.getElementById("timeline-heatmap"),
    linePlotWrap: document.getElementById("line-plot-wrap"),
    linePlotCanvas: document.getElementById("line-plot-canvas"),
    btnNew: document.getElementById("btn-new"),
    btnSolve: document.getElementById("btn-solve"),
    btnStep: document.getElementById("btn-step"),
    btnReset: document.getElementById("btn-reset"),
    rowOpInput: document.getElementById("row-op-input"),
    btnApplyOp: document.getElementById("btn-apply-op"),
    btnUndoOp: document.getElementById("btn-undo-op"),
    btnResetWork: document.getElementById("btn-reset-work"),
    btnCheckRef: document.getElementById("btn-check-ref"),
    btnCheckRref: document.getElementById("btn-check-rref"),
    rowOpError: document.getElementById("row-op-error"),
    checkResult: document.getElementById("check-result"),
    original: document.getElementById("original"),
    work: document.getElementById("work"),
    final: document.getElementById("final"),
    steps: document.getElementById("steps"),
    userSteps: document.getElementById("user-steps"),
    userStepsEmpty: document.getElementById("user-steps-empty"),
    hint: document.getElementById("step-hint"),
    btnShowRank: document.getElementById("btn-show-rank"),
  };

  /** @type {Rat[][] | null} */
  let source = null;
  /** @type {Rat[][] | null} */
  let userWork = null;
  /** @type {Rat[][][]} */
  let undoStack = [];
  /** @type {string[]} */
  let userStepLabels = [];
  /** @type {string[]} */
  let fullSteps = [];
  /** @type {Rat[][][]} */
  let fullSnapshots = [];
  let stepIndex = 0;

  function updateRevealSpoilers() {
    els.refTimelinePanel.hidden = !els.showRefSteps.checked;
  }

  function resetRevealSpoilers() {
    els.showRefSteps.checked = false;
    updateRevealSpoilers();
  }

  const NS = "http://www.w3.org/2000/svg";

  function syncTimelineSlider() {
    const max = Math.max(0, fullSteps.length);
    els.timelineSlider.min = "0";
    els.timelineSlider.max = String(max);
    const k = Math.min(Math.max(0, stepIndex), max);
    els.timelineSlider.value = String(k);
    if (max === 0) {
      els.timelineLabel.textContent = "0 (no reference ops)";
    } else {
      els.timelineLabel.textContent = `${k} / ${max}`;
    }
    if (k === 0) {
      els.timelineOp.textContent = "Start: matrix before any reference row operation.";
    } else if (k <= fullSteps.length && fullSteps[k - 1]) {
      els.timelineOp.textContent = `After op ${k}: ${fullSteps[k - 1]}`;
    } else {
      els.timelineOp.textContent = "End: reference row echelon form.";
    }
  }

  function heatColorForRat(r) {
    if (ratIsZero(r)) return "rgba(45, 58, 77, 0.55)";
    const v = Math.abs(ratToFloat(r));
    const t = Math.min(1, Math.log10(1 + v) / 2.5);
    if (r.n >= 0) {
      const L = 42 + 28 * t;
      return `hsl(207, 58%, ${L}%)`;
    }
    const L = 40 + 30 * t;
    return `hsl(12, 55%, ${L}%)`;
  }

  function renderTimelineHeatmap() {
    const el = els.timelineHeatmap;
    el.replaceChildren();
    const M = currentSnapshot();
    if (!M || !M.length || !M[0]) return;
    const rows = M.length;
    const cols = M[0].length;
    el.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cell = document.createElement("div");
        cell.className = "hcell";
        cell.style.background = heatColorForRat(M[i][j]);
        const t = formatRat(M[i][j]);
        cell.textContent = t.length > 7 ? "…" : t;
        cell.title = t;
        el.appendChild(cell);
      }
    }
  }

  function renderTimelineChain() {
    const svg = els.timelineSvg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const num = fullSnapshots.length;
    if (!num) return;

    const gap = 48;
    const pad = 28;
    const h = 64;
    const w = Math.max(120, pad * 2 + (num - 1) * gap);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", String(w));

    for (let i = 0; i < num - 1; i++) {
      const x1 = pad + i * gap;
      const x2 = pad + (i + 1) * gap;
      const y = h / 2;
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y));
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-linecap", "round");
      if (i < stepIndex) {
        line.setAttribute("stroke", "#5b9fd4");
        line.setAttribute("opacity", "0.85");
      } else {
        line.setAttribute("stroke", "#3d4f66");
        line.setAttribute("opacity", "0.55");
      }
      svg.appendChild(line);
    }

    for (let i = 0; i < num; i++) {
      const cx = pad + i * gap;
      const cy = h / 2;
      const g = document.createElementNS(NS, "g");
      g.classList.add("node-hit");
      g.setAttribute("data-step", String(i));

      const ring = document.createElementNS(NS, "circle");
      ring.setAttribute("cx", String(cx));
      ring.setAttribute("cy", String(cy));
      ring.setAttribute("r", String(i === stepIndex ? 17 : 14));
      ring.setAttribute("fill", i <= stepIndex ? "#2a3d52" : "#1f2935");
      ring.setAttribute("stroke", i === stepIndex ? "#7eb8e8" : "#4a6282");
      ring.setAttribute("stroke-width", String(i === stepIndex ? 3 : 2));
      g.appendChild(ring);

      const label = document.createElementNS(NS, "text");
      label.setAttribute("x", String(cx));
      label.setAttribute("y", String(cy + 5));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "#e7edf4");
      label.setAttribute("font-size", "13");
      label.setAttribute("font-family", "IBM Plex Sans, system-ui, sans-serif");
      label.setAttribute("font-weight", "600");
      label.textContent = i === num - 1 && i > 0 ? "end" : String(i);
      g.appendChild(label);

      g.addEventListener("click", () => setStepIndexFromTimeline(i));
      g.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          setStepIndexFromTimeline(i);
        }
      });
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `Go to step ${i}`);

      svg.appendChild(g);
    }
  }

  function renderLinePlot2x3() {
    const wrap = els.linePlotWrap;
    const canvas = els.linePlotCanvas;
    const M = currentSnapshot();
    if (!M || M.length !== 2 || !M[0] || M[0].length !== 3) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;

    const W = 400;
    const H = 280;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#121820";
    ctx.fillRect(0, 0, W, H);

    const line = (r) => {
      const a = ratToFloat(M[r][0]);
      const b = ratToFloat(M[r][1]);
      const c = ratToFloat(M[r][2]);
      return { a, b, c };
    };
    const L0 = line(0);
    const L1 = line(1);

    let xmin = -6;
    let xmax = 6;
    let ymin = -6;
    let ymax = 6;
    const pts = [];
    for (let r = 0; r < 2; r++) {
      const { a, b, c } = r === 0 ? L0 : L1;
      if (Math.abs(b) > 1e-12) {
        for (let x = -12; x <= 12; x += 0.25) {
          const y = (c - a * x) / b;
          if (Number.isFinite(y) && Math.abs(y) < 80) pts.push(x, y);
        }
      } else if (Math.abs(a) > 1e-12) {
        const x = c / a;
        for (let y = -12; y <= 12; y += 0.25) {
          if (Number.isFinite(x) && Math.abs(x) < 80) pts.push(x, y);
        }
      }
    }
    if (pts.length) {
      for (let i = 0; i < pts.length; i += 2) {
        xmin = Math.min(xmin, pts[i]);
        xmax = Math.max(xmax, pts[i]);
        ymin = Math.min(ymin, pts[i + 1]);
        ymax = Math.max(ymax, pts[i + 1]);
      }
      const mx = Math.max((xmax - xmin) * 0.12, 0.6);
      const my = Math.max((ymax - ymin) * 0.12, 0.6);
      xmin -= mx;
      xmax += mx;
      ymin -= my;
      ymax += my;
    }

    const margin = 36;
    const plotW = W - 2 * margin;
    const plotH = H - 2 * margin;
    const sx = (x) => margin + ((x - xmin) / (xmax - xmin || 1)) * plotW;
    const sy = (y) => H - margin - ((y - ymin) / (ymax - ymin || 1)) * plotH;

    ctx.strokeStyle = "#2d3a4d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, sy(0));
    ctx.lineTo(W - margin, sy(0));
    ctx.moveTo(sx(0), margin);
    ctx.lineTo(sx(0), H - margin);
    ctx.stroke();

    ctx.fillStyle = "#6b7c90";
    ctx.font = "12px IBM Plex Sans, system-ui, sans-serif";
    ctx.fillText("x", W - margin - 4, sy(0) - 6);
    ctx.fillText("y", sx(0) + 6, margin + 12);

    function drawLine(L, stroke) {
      const { a, b, c } = L;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (Math.abs(b) > 1e-12) {
        const x1 = xmin;
        const x2 = xmax;
        const y1 = (c - a * x1) / b;
        const y2 = (c - a * x2) / b;
        ctx.moveTo(sx(x1), sy(y1));
        ctx.lineTo(sx(x2), sy(y2));
      } else if (Math.abs(a) > 1e-12) {
        const x = c / a;
        ctx.moveTo(sx(x), sy(ymin));
        ctx.lineTo(sx(x), sy(ymax));
      }
      ctx.stroke();
    }

    drawLine(L0, "#5b9fd4");
    drawLine(L1, "#c9a45c");

    ctx.fillStyle = "#8b9cb3";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("Row1 (blue) · Row2 (gold) · ax + by = c", margin, H - 10);
  }

  // ── 3D plane visualisation (Three.js, 3×4 matrices only) ─────────────────
  let _three = null; // { renderer, scene, camera, controls, planeGroup, animId }

  const PLANE_COLORS_3D = [0x5b9fd4, 0xc9a45c, 0x5bc478];

  function _stopThreeLoop() {
    if (_three && _three.animId) {
      cancelAnimationFrame(_three.animId);
      _three.animId = null;
    }
  }

  function renderPlanePlot3x4() {
    const wrap = document.getElementById("plane-plot-wrap");
    const M = currentSnapshot();

    if (!M || M.length !== 3 || !M[0] || M[0].length !== 4) {
      wrap.hidden = true;
      _stopThreeLoop();
      return;
    }
    wrap.hidden = false;

    const canvas = document.getElementById("plane-plot-canvas");

    // Build Three.js scene once
    if (!_three) {
      if (typeof THREE === "undefined") return; // CDN not loaded yet

      const W = 400, H = 320;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setClearColor(0x121820);
      renderer.setSize(W, H);

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
      camera.position.set(9, 7, 12);
      camera.lookAt(0, 0, 0);

      // Coloured axis lines (x=red, y=green, z=blue — dimmed)
      const axLen = 7;
      [
        { v: new THREE.Vector3(axLen, 0, 0), color: 0x7a3030 },
        { v: new THREE.Vector3(0, axLen, 0), color: 0x307a30 },
        { v: new THREE.Vector3(0, 0, axLen), color: 0x30307a },
      ].forEach(({ v, color }) => {
        const neg = v.clone().negate();
        const geo = new THREE.BufferGeometry().setFromPoints([neg, v]);
        scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
      });

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const dl = new THREE.DirectionalLight(0xffffff, 0.55);
      dl.position.set(5, 10, 7);
      scene.add(dl);

      const planeGroup = new THREE.Group();
      scene.add(planeGroup);

      let controls = null;
      if (typeof THREE.OrbitControls !== "undefined") {
        controls = new THREE.OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
      }

      _three = { renderer, scene, camera, controls, planeGroup, animId: null };
    }

    const { renderer, scene, camera, controls, planeGroup } = _three;

    // Remove old plane meshes
    while (planeGroup.children.length) {
      const m = planeGroup.children[0];
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
      planeGroup.remove(m);
    }

    // Add a plane for each row: ax + by + cz = d
    M.forEach((row, i) => {
      const a = ratToFloat(row[0]);
      const b = ratToFloat(row[1]);
      const c = ratToFloat(row[2]);
      const d = ratToFloat(row[3]);

      const normalLen2 = a * a + b * b + c * c;
      if (normalLen2 < 1e-14) return; // zero row – skip

      const normal = new THREE.Vector3(a, b, c).normalize();

      // Closest point on plane to the origin = (d / |n|²) * n_original
      const clamp = (v) => (isFinite(v) ? Math.max(-18, Math.min(18, v)) : 0);
      const pt = new THREE.Vector3(
        clamp((a * d) / normalLen2),
        clamp((b * d) / normalLen2),
        clamp((c * d) / normalLen2),
      );

      const geo = new THREE.PlaneGeometry(14, 14);
      const mat = new THREE.MeshPhongMaterial({
        color: PLANE_COLORS_3D[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      mesh.position.copy(pt);
      planeGroup.add(mesh);

      // Wireframe border
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: PLANE_COLORS_3D[i],
        transparent: true,
        opacity: 0.7,
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.quaternion.copy(mesh.quaternion);
      edges.position.copy(pt);
      planeGroup.add(edges);
    });

    // (Re)start render loop
    _stopThreeLoop();
    function animate() {
      _three.animId = requestAnimationFrame(animate);
      if (controls) controls.update();
      renderer.render(scene, camera);
    }
    animate();
  }

  function refreshTimeline() {
    if (!source) return;
    syncTimelineSlider();
    renderTimelineChain();
    renderTimelineHeatmap();
    renderLinePlot2x3();
    renderPlanePlot3x4();
  }

  function setStepIndexFromTimeline(k) {
    if (!source) return;
    const max = fullSteps.length;
    const v = Math.max(0, Math.min(max, k));
    if (v === stepIndex) {
      syncTimelineSlider();
      renderTimelineChain();
      renderTimelineHeatmap();
      renderLinePlot2x3();
      renderPlanePlot3x4();
      return;
    }
    stepIndex = v;
    renderAllMatrices();
    renderStepList();
    syncStepUi();
    refreshTimeline();
  }

  function clearCheckResult() {
    els.checkResult.textContent = "";
    els.checkResult.classList.remove("ok", "bad");
  }

  function recomputeSteps() {
    if (!source) return;
    const wantRref = els.rref.checked;
    const out = rowEchelonWithSteps(source, wantRref);
    fullSteps = out.steps;
    fullSnapshots = out.snapshots;
    renderMatrix(out.matrix, els.final);
  }

  function syncStepUi() {
    const has = source !== null;
    els.btnStep.disabled = !has || stepIndex >= fullSteps.length;
    els.btnReset.disabled = !has || stepIndex === 0;
    els.btnResetWork.disabled = !has;
    els.btnUndoOp.disabled = !has || undoStack.length === 0;
    els.btnCheckRef.disabled = !has;
    els.btnCheckRref.disabled = !has;
    els.btnShowRank.disabled = !has;
    els.hint.textContent = has
      ? stepIndex === 0
        ? 'Press Next step to reveal operations one at a time.'
        : stepIndex >= fullSteps.length
          ? 'All steps revealed. Press Reset to start over.'
          : `${stepIndex} of ${fullSteps.length} steps revealed.`
      : 'Generate a matrix to begin.';
  }

  function renderStepList() {
    els.steps.replaceChildren();
    fullSteps.forEach((text, idx) => {
      const li = document.createElement("li");
      li.textContent = text;
      if (idx < stepIndex) li.classList.add("done");
      els.steps.appendChild(li);
    });
  }

  function renderUserSteps() {
    els.userSteps.replaceChildren();
    userStepLabels.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      els.userSteps.appendChild(li);
    });
    if (els.userStepsEmpty) {
      els.userStepsEmpty.hidden = userStepLabels.length > 0;
    }
  }

  function currentSnapshot() {
    if (!fullSnapshots.length) return null;
    return fullSnapshots[Math.min(stepIndex, fullSnapshots.length - 1)];
  }

  function renderAllMatrices() {
    if (!source) return;
    renderMatrix(source, els.original);
    if (userWork) renderMatrix(userWork, els.work);
  }

  function newMatrix() {
    const rows = Math.max(2, Math.min(8, parseInt(els.rows.value, 10) || 3));
    const cols = Math.max(2, Math.min(8, parseInt(els.cols.value, 10) || 4));
    const rangeAbs = Math.max(1, parseInt(els.range.value, 10) || 9);
    els.rows.value = String(rows);
    els.cols.value = String(cols);
    els.range.value = String(rangeAbs);

    source = randomMatrix(rows, cols, rangeAbs);
    userWork = cloneMatrix(source);
    undoStack = [];
    userStepLabels = [];
    stepIndex = 0;
    els.rowOpInput.value = "";
    els.rowOpError.textContent = "";
    clearCheckResult();
    resetRevealSpoilers();
    recomputeSteps();
    renderAllMatrices();
    renderStepList();
    renderUserSteps();
    syncStepUi();
    refreshTimeline();
  }

  function showFullSolution() {
    if (!source) newMatrix();
    stepIndex = fullSteps.length;
    renderAllMatrices();
    renderStepList();
    syncStepUi();
    refreshTimeline();
  }

  function nextStep() {
    if (!source || stepIndex >= fullSteps.length) return;
    stepIndex++;
    renderAllMatrices();
    renderStepList();
    syncStepUi();
    refreshTimeline();
  }

  function resetSteps() {
    if (!source) return;
    stepIndex = 0;
    renderAllMatrices();
    renderStepList();
    syncStepUi();
    refreshTimeline();
  }

  function applyUserOp() {
    if (!source || !userWork) return;
    els.rowOpError.textContent = "";
    clearCheckResult();
    const raw = els.rowOpInput.value;

    const parts = raw.split(";").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;

    const parsed = parts.map((p) => ({ raw: p, result: parseRowOperation(p, userWork.length) }));
    const firstError = parsed.find((p) => !p.result.ok);
    if (firstError) {
      const idx = parsed.indexOf(firstError) + 1;
      const prefix = parts.length > 1 ? `Op ${idx}: ` : "";
      els.rowOpError.textContent = prefix + firstError.result.message;
      return;
    }

    undoStack.push(cloneMatrix(userWork));
    const labels = [];
    for (const { raw: partRaw, result } of parsed) {
      const res = applyOperation(userWork, result.op);
      if (!res.ok) {
        userWork = undoStack.pop();
        els.rowOpError.textContent = res.message;
        return;
      }
      labels.push(res.label);
    }

    const stepLabel = labels.join(" ; ");
    userStepLabels.push(stepLabel);
    renderMatrix(userWork, els.work);
    renderUserSteps();
    syncStepUi();
  }

  function undoUserOp() {
    if (!undoStack.length || !userWork) return;
    clearCheckResult();
    userWork = undoStack.pop();
    if (userStepLabels.length) userStepLabels.pop();
    renderMatrix(userWork, els.work);
    renderUserSteps();
    syncStepUi();
  }

  function resetUserWork() {
    if (!source) return;
    clearCheckResult();
    els.rowOpError.textContent = "";
    userWork = cloneMatrix(source);
    undoStack = [];
    userStepLabels = [];
    renderMatrix(userWork, els.work);
    renderUserSteps();
    syncStepUi();
  }

  function checkRef() {
    if (!userWork) return;
    clearCheckResult();
    if (isRowEchelon(userWork)) {
      const sol = classifySolution(userWork);
      const { label, reason, isOk } = solExplain(sol);
      els.checkResult.textContent = `✓ Row echelon form  ·  ${label}  —  ${reason}`;
      els.checkResult.classList.add(isOk ? "ok" : "bad");
    } else {
      els.checkResult.textContent = "Not in row echelon form yet.";
      els.checkResult.classList.add("bad");
    }
  }

  function checkRref() {
    if (!userWork) return;
    clearCheckResult();
    if (isRREF(userWork)) {
      const sol = classifySolution(userWork);
      const { label, reason, isOk } = solExplain(sol);
      els.checkResult.textContent = `✓ Reduced row echelon form  ·  ${label}  —  ${reason}`;
      els.checkResult.classList.add(isOk ? "ok" : "bad");
    } else {
      els.checkResult.textContent = "Not in reduced row echelon form.";
      els.checkResult.classList.add("bad");
    }
  }

  [els.showRefSteps].forEach((el) => {
    el.addEventListener("change", () => {
      updateRevealSpoilers();
      refreshTimeline();
    });
  });

  els.btnNew.addEventListener("click", newMatrix);
  els.btnSolve.addEventListener("click", showFullSolution);
  els.btnStep.addEventListener("click", nextStep);
  els.btnReset.addEventListener("click", resetSteps);
  els.btnApplyOp.addEventListener("click", applyUserOp);
  els.btnUndoOp.addEventListener("click", undoUserOp);
  els.btnResetWork.addEventListener("click", resetUserWork);
  els.btnCheckRef.addEventListener("click", checkRef);
  els.btnCheckRref.addEventListener("click", checkRref);
  els.btnShowRank.addEventListener("click", () => {
    if (!fullSnapshots.length) return;
    clearCheckResult();
    const refMatrix = fullSnapshots[fullSnapshots.length - 1];
    const r = matrixRank(refMatrix);
    const rows = refMatrix.length;
    const cols = refMatrix[0] ? refMatrix[0].length - 1 : 0;
    const sol = classifySolution(refMatrix);
    const { label, reason, isOk } = solExplain(sol);
    els.checkResult.textContent =
      `Rank = ${r}  (${cols} unknown${cols !== 1 ? "s" : ""}, ${rows} equation${rows !== 1 ? "s" : ""})  ·  ${label}  —  ${reason}`;
    els.checkResult.classList.add(isOk ? "ok" : "bad");
  });
  els.rowOpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyUserOp();
  });
  els.rref.addEventListener("change", () => {
    if (source) {
      stepIndex = 0;
      recomputeSteps();
      renderAllMatrices();
      renderStepList();
      syncStepUi();
      refreshTimeline();
    }
  });

  els.timelineSlider.addEventListener("input", () => {
    const v = parseInt(els.timelineSlider.value, 10) || 0;
    setStepIndexFromTimeline(v);
  });

  // ── Difficulty presets ────────────────────────────────────────
  const DIFFICULTY_LEVELS = {
    easy:   { rows: 2, cols: 3, range: 3,  rref: false },
    medium: { rows: 3, cols: 4, range: 9,  rref: false },
    hard:   { rows: 4, cols: 5, range: 15, rref: true  },
    custom: null,
    manual: null,
  };

  const customFields  = document.getElementById("custom-fields");
  const manualEntry   = document.getElementById("manual-entry");
  const manualGrid    = document.getElementById("manual-grid");
  const manualError   = document.getElementById("manual-error");
  const manualRowsEl  = document.getElementById("manual-rows");
  const manualColsEl  = document.getElementById("manual-cols");
  const btnUseMatrix  = document.getElementById("btn-use-matrix");

  function setActiveDiffButton(level) {
    document.querySelectorAll(".btn-diff").forEach((b) => {
      b.classList.toggle("btn-diff--active", b.dataset.level === level);
    });
  }

  // ── Manual matrix entry ──────────────────────────────────────
  function buildManualGrid() {
    const r = Math.max(2, Math.min(8, parseInt(manualRowsEl.value, 10) || 3));
    const c = Math.max(2, Math.min(8, parseInt(manualColsEl.value, 10) || 4));
    manualRowsEl.value = String(r);
    manualColsEl.value = String(c);
    manualGrid.style.gridTemplateColumns = `repeat(${c}, auto)`;
    manualGrid.replaceChildren();
    manualError.textContent = "";
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.inputMode = "text";
        inp.autocomplete = "off";
        inp.spellcheck = false;
        inp.className = "manual-cell" + (j === c - 1 ? " cell-rhs" : "");
        inp.dataset.row = String(i);
        inp.dataset.col = String(j);
        inp.setAttribute("aria-label", `Row ${i + 1} column ${j + 1}`);
        inp.placeholder = j === c - 1 ? "rhs" : "0";
        // Tab order: left-to-right, top-to-bottom (default)
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            btnUseMatrix.click();
          }
        });
        manualGrid.appendChild(inp);
      }
    }
    // Focus first cell
    const first = manualGrid.querySelector(".manual-cell");
    if (first) first.focus();
  }

  function parseCellValue(raw) {
    const t = raw.trim().replace(/\s+/g, "");
    if (!t || t === "0") return { ok: true, rat: ratFromInt(0) };
    // Handle optional leading sign then fraction: e.g. -3/4, 5, -7
    const m = t.match(/^([+-]?\d+)(?:\/([+-]?\d+))?$/);
    if (!m) return { ok: false };
    const n = parseInt(m[1], 10);
    const d = m[2] ? parseInt(m[2], 10) : 1;
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return { ok: false };
    return { ok: true, rat: rat(n, d) };
  }

  function loadManualMatrix() {
    manualError.textContent = "";
    const cells = Array.from(manualGrid.querySelectorAll(".manual-cell"));
    cells.forEach((c) => c.classList.remove("cell-error"));

    const r = parseInt(manualRowsEl.value, 10) || 3;
    const c = parseInt(manualColsEl.value, 10) || 4;
    const M = [];
    let hasError = false;

    for (let i = 0; i < r; i++) {
      const row = [];
      for (let j = 0; j < c; j++) {
        const cell = manualGrid.querySelector(`[data-row="${i}"][data-col="${j}"]`);
        const raw = cell ? cell.value : "";
        const parsed = parseCellValue(raw);
        if (!parsed.ok) {
          hasError = true;
          if (cell) cell.classList.add("cell-error");
        } else {
          row.push(parsed.rat);
        }
      }
      M.push(row);
    }

    if (hasError) {
      manualError.textContent = "Some cells have invalid values. Use integers or fractions like 3/4.";
      return;
    }

    // Apply the matrix to the app exactly like newMatrix()
    source = M;
    userWork = cloneMatrix(source);
    undoStack = [];
    userStepLabels = [];
    stepIndex = 0;
    els.rowOpInput.value = "";
    els.rowOpError.textContent = "";
    clearCheckResult();
    resetRevealSpoilers();
    recomputeSteps();
    renderAllMatrices();
    renderStepList();
    renderUserSteps();
    syncStepUi();
    refreshTimeline();
  }

  btnUseMatrix.addEventListener("click", loadManualMatrix);

  [manualRowsEl, manualColsEl].forEach((el) => {
    el.addEventListener("change", buildManualGrid);
  });

  // ── Difficulty button handler ─────────────────────────────────
  document.querySelectorAll(".btn-diff").forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = btn.dataset.level;
      setActiveDiffButton(level);

      // Show/hide panels
      customFields.setAttribute("hidden", "");
      manualEntry.setAttribute("hidden", "");
      els.btnNew.removeAttribute("hidden");

      if (level === "custom") {
        customFields.removeAttribute("hidden");
        return;
      }
      if (level === "manual") {
        manualEntry.removeAttribute("hidden");
        els.btnNew.setAttribute("hidden", "");
        buildManualGrid();
        return;
      }
      const lvl = DIFFICULTY_LEVELS[level];
      els.rows.value   = String(lvl.rows);
      els.cols.value   = String(lvl.cols);
      els.range.value  = String(lvl.range);
      els.rref.checked = lvl.rref;
      newMatrix();
    });
  });

  // Hide custom/manual fields initially (medium is default)
  customFields.setAttribute("hidden", "");

  newMatrix();
})();
