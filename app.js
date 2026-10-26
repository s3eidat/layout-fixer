/* Layout Fixer — remaps keys between US QWERTY and Arabic (101). Pure string work, nothing leaves the page. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  function cp(n) { return String.fromCharCode(n); }

  // ---------- the layout: US key -> what Arabic (101) types on that key ----------
  var FATHA = cp(0x64E), FATHATAN = cp(0x64B), DAMMA = cp(0x64F), DAMMATAN = cp(0x64C), KASRA = cp(0x650),
    KASRATAN = cp(0x64D), SUKUN = cp(0x652), SHADDA = cp(0x651);
  var BASE = {
    "`": "ذ", q: "ض", w: "ص", e: "ث", r: "ق", t: "ف", y: "غ", u: "ع", i: "ه", o: "خ", p: "ح", "[": "ج", "]": "د",
    a: "ش", s: "س", d: "ي", f: "ب", g: "ل", h: "ا", j: "ت", k: "ن", l: "م", ";": "ك", "'": "ط",
    z: "ئ", x: "ء", c: "ؤ", v: "ر", b: "لا", n: "ى", m: "ة", ",": "و", ".": "ز", "/": "ظ"
  };
  var SHIFT = {
    "~": SHADDA, Q: FATHA, W: FATHATAN, E: DAMMA, R: DAMMATAN, T: "لإ", Y: "إ", U: cp(0x2018), I: "÷", O: "×", P: "؛",
    "{": "<", "}": ">", A: KASRA, S: KASRATAN, D: "]", F: "[", G: "لأ", H: "أ", J: "ـ", K: "،", L: "/",
    Z: "~", X: SUKUN, C: "}", V: "{", B: "لآ", N: "آ", M: cp(0x2019), "<": ",", ">": ".", "?": "؟", "(": ")", ")": "("
  };
  var E2A = Object.assign({}, BASE, SHIFT);
  var A2E = {};            // single Arabic char -> key
  var A2E_PAIR = {};       // lam + alef-with-hamza/madda (one key each)
  Object.keys(E2A).forEach(function (k) {
    var v = E2A[k];
    if (v.length === 1) A2E[v] = k; else if (k !== "b") A2E_PAIR[v] = k;
  });
  A2E["ی"] = "d"; A2E["ک"] = ";";                        // Persian ya / kaf typed by some phone keyboards
  // Presentation-form ligatures some keyboards emit for lam-alef keys.
  A2E["ﻻ"] = "b"; A2E["ﻼ"] = "b"; A2E["ﻷ"] = "G"; A2E["ﻸ"] = "G";
  A2E["ﻹ"] = "T"; A2E["ﻺ"] = "T"; A2E["ﻵ"] = "B"; A2E["ﻶ"] = "B";
  // Lone punctuation (no letters around it) gets its natural counterpart instead of the key it sits on.
  var PUNCT_A = { "?": "؟", ",": "،", ";": "؛" }, PUNCT_E = { "؟": "?", "،": ",", "؛": ";" };

  var AR_LETTER = /[ء-يٱ-ۓیکﻵ-ﻼ]/, LATIN = /[A-Za-z]/;
  function countOf(s, re) { var n = 0; for (var i = 0; i < s.length; i++) if (re.test(s[i])) n++; return n; }
  function detect(text) {
    var la = countOf(text, LATIN), ar = countOf(text, AR_LETTER);
    return la === 0 && ar === 0 ? null : la >= ar ? "ar" : "en";
  }

  function tokenToArabic(tok, lower) {
    var out = "";
    for (var i = 0; i < tok.length; i++) {
      var c = tok[i];
      if (lower && /[A-Z]/.test(c)) c = c.toLowerCase();
      out += E2A[c] != null ? E2A[c] : c;
    }
    return out;
  }

  // "لا" is both the B key and G+H. Pick "gh" where English spelling makes it likely (light, high, though).
  function lamAlef(prev2, next) {
    var p = prev2.slice(-1);
    if (next === "t") return "gh";
    if (!/[a-z]/i.test(next || "") && (p === "i" || /^(ou|au|ei)$/i.test(prev2))) return "gh";
    return "b";
  }
  function tokenToEnglish(tok) {
    var units = [];
    for (var i = 0; i < tok.length; i++) {
      var two = tok.substr(i, 2);
      if (two === "لا") { units.push(null); i++; continue; }
      if (A2E_PAIR[two]) { units.push(A2E_PAIR[two]); i++; continue; }
      units.push(A2E[tok[i]] != null ? A2E[tok[i]] : tok[i]);
    }
    var out = "";
    units.forEach(function (u, i) {
      if (u === null) {
        var next = null;
        for (var j = i + 1; j < units.length && next === null; j++) next = units[j] === null ? "b" : units[j][0];
        u = lamAlef(out.slice(-2), next);
      }
      out += u;
    });
    return out;
  }

  // ---------- which words were mistyped? (only needed when a text mixes both scripts) ----------
  // Tiny letter-pair models built from everyday English and Arabic sentences: "hgsghl" is a very unlikely
  // English word but "السلام" is a very likely Arabic one, so that word gets converted and "meeting" does not.
  var CORPUS_EN = "the quick brown fox jumps over the lazy dog. hello, how are you today? i think we should meet at the office tomorrow morning because there is a lot of work to do. please send me the file when you have time. thank you very much for your help, it was really nice to see you again. what time is the meeting? i don't know yet, but i will call you later tonight. we need to buy some bread, milk and water from the shop on the way home. this is a good idea and everyone agrees with it. my phone number changed last week, so write the new one down. can you check the email and tell me if anything is missing? the weather is great, let's go out for a walk in the park. people often forget to switch the keyboard language while they are typing a message. where are you going? i am going to the doctor with my brother. thanks, see you soon. ok, sounds good. what about the price? it depends on the size and the color. could you open the window please, it's getting hot in here. my friends and i played football after school yesterday. the train leaves at nine, so we have to hurry up.";
  var CORPUS_AR = "السلام عليكم ورحمة الله وبركاته. كيف حالك اليوم؟ أنا بخير والحمد لله. أين أنت الآن؟ أنا في البيت وسوف أذهب إلى العمل بعد قليل. هل يمكنك أن ترسل لي الملف عندما يكون عندك وقت؟ شكرا جزيلا على مساعدتك، كان من الجميل أن أراك مرة أخرى. متى موعد الاجتماع؟ لا أعرف حتى الآن، لكنني سأتصل بك في المساء. نحتاج أن نشتري خبزا وحليبا وماء من المحل في طريق العودة. هذه فكرة جيدة والجميع موافق عليها. تغير رقم هاتفي الأسبوع الماضي فاكتب الرقم الجديد. الجو جميل اليوم، هيا نخرج نتمشى في الحديقة. كثير من الناس ينسون تغيير لغة لوحة المفاتيح أثناء كتابة الرسائل. إلى أين أنت ذاهب؟ أنا ذاهب إلى الطبيب مع أخي. يعطيك العافية، نشوفك قريبا. تمام، ماشي الحال. شو الأخبار؟ والله مشتاقين كثير. صباح الخير، مساء النور. إن شاء الله نلتقي غدا. كم السعر؟ يعتمد على الحجم واللون. ممكن تساعدني لو سمحت؟ طبعا، بكل سرور. عيد مبارك وكل عام وأنتم بخير.";
  function model(text) {
    var big = {}, uni = {}, alpha = { "^": 1, "$": 1 }, V = 2;
    text.toLowerCase().split(/[^\p{L}']+/u).forEach(function (w) {
      if (!w) return;
      var s = ["^"].concat(Array.from(w), ["$"]);
      for (var i = 0; i < s.length - 1; i++) {
        big[s[i] + s[i + 1]] = (big[s[i] + s[i + 1]] || 0) + 1; uni[s[i]] = (uni[s[i]] || 0) + 1;
        if (!alpha[s[i + 1]]) { alpha[s[i + 1]] = 1; V++; }
      }
    });
    return function (w) {   // mean log-probability per letter pair, relative to random letters
      var s = ["^"].concat(Array.from(w.toLowerCase()), ["$"]), lp = 0;
      for (var i = 0; i < s.length - 1; i++) {
        var a = s[i], b = s[i + 1];
        lp += alpha[a] && alpha[b] ? Math.log(((big[a + b] || 0) + 0.1) / ((uni[a] || 0) + 0.1 * V)) : Math.log(1e-4);
      }
      return lp / (s.length - 1) + Math.log(V);
    };
  }
  var scoreEn = model(CORPUS_EN), scoreAr = model(CORPUS_AR);
  function core(s) { return s.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ""); }
  // gain = how much more plausible the converted word is than the word as typed
  function worthConverting(asTyped, converted, toArabic) {
    var a = core(asTyped), c = core(converted);
    if (!a || !c) return false;
    var gain = toArabic ? scoreAr(c) - scoreEn(a) : scoreEn(c) - scoreAr(a);
    var len = Math.max(Array.from(a).length, Array.from(c).length);
    return gain > (len <= 2 ? 1.2 : len === 3 ? 0.5 : 0.1);
  }

  // Converts token by token so text that is already right is left alone.
  function convert(text, dir, opt) {
    opt = opt || {};
    var tla = countOf(text, LATIN), tar = countOf(text, AR_LETTER), d = dir, n = 0;
    if (dir === "auto" || !dir) d = tla && tar ? "mixed" : tla ? "ar" : tar ? "en" : null;
    if (!d) return { text: text, dir: null, changed: 0 };
    var parts = text.split(/(\s+)/), lower = !!opt.lower;
    for (var i = 0; i < parts.length; i += 2) {
      var tok = parts[i];
      if (!tok) continue;
      var la = countOf(tok, LATIN), ar = countOf(tok, AR_LETTER), res = tok, cand;
      if (la === 0 && ar === 0) {
        var pm = d === "ar" ? PUNCT_A : d === "en" ? PUNCT_E : {};
        res = tok.replace(/[?,;؟،؛]/g, function (c) { return pm[c] || c; });
      } else if (d === "mixed") {
        if (la > ar) { cand = tokenToArabic(tok, lower); if (worthConverting(tok, cand, true)) res = cand; }
        else if (ar > la) { cand = tokenToEnglish(tok); if (worthConverting(tok, cand, false)) res = cand; }
      } else if (d === "ar" && la > ar) res = tokenToArabic(tok, lower);
      else if (d === "en" && ar > la) res = tokenToEnglish(tok);
      if (res !== tok) n++;
      parts[i] = res;
    }
    return { text: parts.join(""), dir: d, changed: n };
  }

  // ---------- UI ----------
  var input = $("#input"), out = $("#out"), status = $("#status"), statsEl = $("#stats");
  var st = { dir: S3.store("lf.dir") || "auto", caps: !!S3.store("lf.caps"), layer: "base", res: "" };
  if (!/^(auto|ar|en)$/.test(st.dir)) st.dir = "auto";

  function seg(el, value, onPick) {
    $$("button", el).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === value));
      b.addEventListener("click", function () {
        $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        onPick(b.dataset.v);
      });
    });
  }
  function stat(label, value) { return '<div class="stat"><b>' + S3.esc(value) + "</b><span>" + label + "</span></div>"; }
  function setStatus(cls, en, ar) {
    status.className = "chip " + cls;
    status.textContent = en + " ";
    status.appendChild(S3.h("span", { lang: "ar", text: "· " + ar }));
  }

  function render() {
    var t = input.value;
    statsEl.innerHTML = "";
    if (!t.trim()) { out.textContent = ""; st.res = ""; setStatus("", "Waiting for text", "بانتظار النص"); return; }
    var letters = t.replace(/[^A-Za-z]/g, ""), capsOn = st.caps || (letters.length >= 3 && letters === letters.toUpperCase() && /[A-Z]/.test(letters));
    var r = convert(t, st.dir, { lower: capsOn });
    st.res = r.text;
    out.textContent = r.text;
    out.setAttribute("dir", r.dir === "ar" ? "rtl" : r.dir === "en" ? "ltr" : "auto");
    out.setAttribute("lang", r.dir === "ar" ? "ar" : r.dir === "en" ? "en" : "");
    if (!r.dir) setStatus("", "No letters to convert", "لا توجد حروف للتحويل");
    else if (r.dir === "mixed") setStatus(r.changed ? "ok" : "", r.changed ? "Mixed text: fixed only the mistyped words" : "Mixed text: nothing looks mistyped",
      r.changed ? "نص مختلط: صُحّحت الكلمات الخاطئة فقط" : "نص مختلط: لا يبدو أن فيه أخطاء");
    else if (r.dir === "ar") setStatus("ok", "English keys → Arabic" + (capsOn && !st.caps ? " (Caps Lock ignored)" : ""), "من الإنجليزية إلى العربية");
    else setStatus("ok", "Arabic keys → English", "من العربية إلى الإنجليزية");
    var words = (r.text.match(/\S+/g) || []).length;
    statsEl.innerHTML = stat("words changed · كلمات مُصحّحة", r.changed.toLocaleString()) + stat("words · كلمات", words.toLocaleString()) +
      stat("characters · أحرف", Array.from(r.text).length.toLocaleString());
  }

  // Key map drawing
  var ROWS = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"];
  var SHIFTED = { "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&", "8": "*", "9": "(", "0": ")", "-": "_", "=": "+",
    "[": "{", "]": "}", "\\": "|", ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?" };
  var MARKS = /[ً-ْ]/;
  function drawKb() {
    var kb = $("#kb"); kb.innerHTML = "";
    ROWS.forEach(function (row, ri) {
      var r = S3.h("div", { "class": "lf-row lf-r" + ri });
      row.split("").forEach(function (k) {
        var key = st.layer === "shift" ? (SHIFTED[k] || k.toUpperCase()) : k;
        var ar = E2A[key] != null ? E2A[key] : key;
        var shown = MARKS.test(ar) ? "ـ" + ar : ar;  // show a lone haraka on a tatweel so it is visible
        var same = ar === key;
        r.appendChild(S3.h("div", { "class": "lf-key" + (same ? " same" : "") + (ar.length > 1 && !MARKS.test(ar) ? " wide" : "") }, [
          S3.h("b", { text: key }), S3.h("span", { lang: "ar", dir: "rtl", text: shown })
        ]));
      });
      kb.appendChild(r);
    });
  }

  seg($("#dir"), st.dir, function (v) { st.dir = v; S3.store("lf.dir", v); render(); });
  seg($("#layer"), st.layer, function (v) { st.layer = v; drawKb(); });
  $("#caps").checked = st.caps;
  $("#caps").addEventListener("change", function () { st.caps = this.checked; S3.store("lf.caps", st.caps); render(); });
  input.addEventListener("input", render);
  $("#clear").addEventListener("click", function () { input.value = ""; render(); input.focus(); });
  $("#sample").addEventListener("click", function () {
    var samples = ["hgsghl ugd;lK ;dt phg;?", "اثممخو اخص شقث غخع؟", "صباح الخير، ;dt phg;?"];
    var i = (S3.store("lf.sample") || 0) % samples.length; S3.store("lf.sample", i + 1);
    input.value = samples[i]; render();
  });
  $("#paste").addEventListener("click", function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { S3.toast("Paste with Ctrl+V / ⌘V", "error"); input.focus(); return; }
    navigator.clipboard.readText().then(function (t) { input.value = t; render(); }, function () { S3.toast("Paste with Ctrl+V / ⌘V", "error"); input.focus(); });
  });
  $("#copy").addEventListener("click", function () {
    if (!st.res) { S3.toast("Nothing to copy yet", "error"); return; }
    S3.copy(st.res); S3.done();
  });
  $("#use").addEventListener("click", function () { if (st.res) { input.value = st.res; render(); } });

  drawKb();
  render();

  window.S3_DEMO = function () { input.value = "hgsghl ugd;lK ;dt phg;? Hkh fodvK ,hgpl] ggi"; render(); };

  // Returns true, or the list of cases that failed (smoke.py prints it).
  window.S3_SELFTEST = function () {
    function A(s, o) { return convert(s, "ar", o).text; }
    function E(s) { return convert(s, "en").text; }
    function auto(s) { return convert(s, "auto").text; }
    var NL = String.fromCharCode(10);
    var cases = [
      // the basics (note: "عليكم" needs the ك key, so it is "ugd;l"; plain "ugdl" is "عليم")
      [A("hgsghl ugd;l"), "السلام عليكم"], [A("ugdl"), "عليم"], [E("اثممخ"), "hello"], [A("b"), "لا"],
      [auto("hgsghl ugd;l"), "السلام عليكم"], [auto("اثممخ"), "hello"],
      // shift layer
      [A("Hkh"), "أنا"], [A("Ylhl"), "إمام"], [A("lvpfhW"), "مرحباً"], [A("hgNk"), "الآن"], [A("G"), "لأ"], [A("T"), "لإ"],
      [A("B"), "لآ"], [A("p~"), "ح" + SHADDA], [A(";dt phg;?"), "كيف حالك؟"], [E("أثممخ"), "Hello"], [E("الآن"), "hBk"], [E("ﻻ"), "b"],
      // lam-alef: B key or G+H
      [E("مهلاف"), "light"], [E("شلاخعف"), "about"], [E("اهلا"), "high"], [E("فاخعلا"), "though"],
      // mixed text: only the mistyped words change
      [auto("مرحبا hgsghl"), "مرحبا السلام"], [auto("صباح الخير ;dt phg;?"), "صباح الخير كيف حالك؟"],
      [auto("عندي meeting بكرة"), "عندي meeting بكرة"], [auto("رايح meeting hgfdj"), "رايح meeting البيت"],
      [auto("ok, اثممخ صخقمي"), "ok, hello world"], [E("Hi اثممخ"), "Hi hello"], [A("hgsghl 2026 ugd;l"), "السلام 2026 عليكم"],
      [A("hgsghl ugd;l ?"), "السلام عليكم ؟"], [E("ok ؟"), "ok ?"],
      // caps lock, whitespace, nothing to do
      [A("HGSGHL", { lower: true }), "السلام"], [A("hgsghl" + NL + "  ugd;l"), "السلام" + NL + "  عليكم"], [String(detect("123 !!")), "null"], [auto(""), ""]
    ];
    var fails = [];
    cases.forEach(function (c, i) { if (c[0] !== c[1]) fails.push("case " + i + ": got " + c[0]); });
    // Round trips: Arabic -> keys -> Arabic is exact; English -> Arabic -> English for text without g-before-h or b.
    ["السلام عليكم ورحمة الله", "كيف حالك؟ أنا بخير، الحمد لله", "إلى اللقاء غداً", "مرحباً بالعالم الآن", "طائرة مؤجلة"]
      .forEach(function (t) { if (A(E(t)) !== t) fails.push("ar trip: " + t); });
    ["hello world", "the quick brown fox jumps over the lazy dog", "type, check; done.", "a/b [x] `q`", "about time"]
      .forEach(function (t) { if (E(A(t)) !== t) fails.push("en trip: " + t); });
    var keys = "`qwertyuiop[]asdfjkl;'zxcvnm,./ ", seed = 7;
    for (var t = 0; t < 300; t++) {
      var s = "";
      for (var c = 0; c < 12; c++) { seed = (seed * 1103515245 + 12345) % 2147483648; s += keys[seed % keys.length]; }
      s = s.replace(/\s+/g, " ").trim();
      if (!/[a-z]/.test(s)) continue;
      if (E(A(s)) !== s) fails.push("random trip: " + s);
    }
    return fails.length ? fails.slice(0, 6) : true;
  };
})();
