// feedback-chat: a scripted mini chat for any site — feedback, a question, CV, contacts.
// Feedback and questions go to the Worker (worker/) → Telegram bot → the owner.
// Setup — README.md. Config: data-* on this <script> tag and/or window.FEEDBACK_CHAT = {...} (wins).
(() => {
  const script = document.currentScript;
  const TEXT = {
    ru: {
      open: "Написать", close: "Свернуть", sub: "ответ — обычно в течение дня",
      hello: "Привет! Это мини-чат. Чем помочь?",
      menu: { feedback: "Оставить отзыв", question: "Задать вопрос", cv: "Скачать CV", contact: "Связаться" },
      askFeedback: "Что понравилось, что нет? Пишите как есть — сообщение сразу придёт мне в Telegram.",
      askQuestion: "Какой вопрос? Про проект, сотрудничество — что угодно.",
      askContact: "Как с вами связаться для ответа? Telegram, почта — или пропустите.",
      skip: "Без ответа", send: "Отправить", ph: "Сообщение…", phContact: "@ник или почта",
      sending: "Отправляю…", sent: "Готово, сообщение доставлено.", sentMail: "Открыл письмо — осталось нажать «Отправить».",
      fail: "Не получилось отправить. Попробуйте ещё раз или напишите напрямую:", retry: "Ещё раз",
      cv: "Резюме в PDF:", cvRu: "CV на русском", cvEn: "CV in English",
      contact: "Пишите куда удобно:", more: "Что-то ещё?",
      subj: { question: "Вопрос с сайта", feedback: "Отзыв с сайта" },
    },
    en: {
      open: "Message me", close: "Minimize", sub: "usually replies within a day",
      hello: "Hi! This is a mini chat. How can I help?",
      menu: { feedback: "Leave feedback", question: "Ask a question", cv: "Download CV", contact: "Get in touch" },
      askFeedback: "What worked, what didn't? Be honest — it lands in my Telegram right away.",
      askQuestion: "What would you like to ask? A project, collaboration — anything.",
      askContact: "How can I reach you back? Telegram, email — or skip.",
      skip: "No reply needed", send: "Send", ph: "Message…", phContact: "@handle or email",
      sending: "Sending…", sent: "Done — your message is delivered.", sentMail: "Your email is ready — just hit Send.",
      fail: "Couldn't send it. Try again or write directly:", retry: "Try again",
      cv: "Resume as PDF:", cvRu: "CV in Russian", cvEn: "CV in English",
      contact: "Reach out wherever suits you:", more: "Anything else?",
      subj: { question: "A question from the site", feedback: "Feedback from the site" },
    },
  };

  const parse = (v) => { try { return JSON.parse(v); } catch { return v; } };
  const fromTag = {};
  for (const [k, v] of Object.entries(script?.dataset || {})) fromTag[k] = parse(v);
  const conf = () => ({ side: "right", lang: "auto", items: ["feedback", "question", "cv", "contact"], channels: [], ...fromTag, ...(window.FEEDBACK_CHAT || {}) });
  const lang = () => {
    const l = conf().lang;
    const v = l && l !== "auto" ? l : document.documentElement.lang || navigator.language || "en";
    return String(v).toLowerCase().startsWith("ru") ? "ru" : "en";
  };
  // texts: defaults, then the owner's overrides per language ({ ru: { hello: "…" } })
  const T = () => { const l = lang(), o = conf().texts?.[l] || {}; return { ...TEXT[l], ...o, menu: { ...TEXT[l].menu, ...(o.menu || {}) } }; };
  const L = (v) => (v && typeof v === "object" ? v[lang()] || v.en || v.ru || "" : v || "");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const shown = Date.now();

  function start() {
    const c = conf();
    const root = document.createElement("div");
    root.className = "fc";
    root.dataset.side = c.side;
    if (c.theme) root.dataset.theme = c.theme;
    root.innerHTML = `
      <button type="button" class="fc-launch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/></svg><span></span></button>
      <section class="fc-box" role="dialog">
        <header class="fc-head"><span class="fc-ava"></span><div><b></b><small></small></div>
          <button type="button" class="fc-x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></header>
        <div class="fc-log" aria-live="polite"></div>
        <div class="fc-foot"></div>
      </section>`;
    document.body.append(root);
    const btn = root.querySelector(".fc-launch"), box = root.querySelector(".fc-box");
    const log = root.querySelector(".fc-log"), foot = root.querySelector(".fc-foot");

    const label = () => {
      const t = T(), c = conf(), name = L(c.name);
      const open = L(c.button) || t.open;
      btn.querySelector("span").textContent = open;
      btn.setAttribute("aria-label", open);
      box.setAttribute("aria-label", open);
      box.querySelector(".fc-head b").textContent = name || open;
      box.querySelector(".fc-head small").textContent = L(c.sub) || t.sub;
      box.querySelector(".fc-ava").textContent = c.initials || name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "✉";
      box.querySelector(".fc-x").setAttribute("aria-label", t.close);
    };

    const scroll = () => log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    // the bot "types" a moment before each line, so the dialog reads like a chat, not a form
    const say = (html, wait = 420) => new Promise((res) => {
      const p = document.createElement("p");
      p.className = "fc-msg bot typing";
      p.innerHTML = "<i></i><i></i><i></i>";
      log.append(p); scroll();
      setTimeout(() => { p.innerHTML = html; p.classList.remove("typing"); scroll(); res(p); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : wait);
    });
    const me = (text) => { const p = document.createElement("p"); p.className = "fc-msg me"; p.textContent = text; log.append(p); scroll(); };

    const chip = ({ text, href, download, go }) => {
      const el = document.createElement(href ? "a" : "button");
      el.className = "fc-chip";
      el.textContent = text;
      if (href) { el.href = href; if (download) el.setAttribute("download", ""); else { el.target = "_blank"; el.rel = "noopener"; } }
      else el.type = "button";
      if (go) el.addEventListener("click", go);
      return el;
    };
    // answer buttons under the dialog (replaced by the next step)
    const chips = (items) => { foot.innerHTML = `<div class="fc-chips"></div>`; foot.firstChild.append(...items.map(chip)); };
    // links that stay in the dialog (CV, channels)
    const links = (items) => { const p = document.createElement("div"); p.className = "fc-msg bot links"; p.append(...items.map(chip)); log.append(p); scroll(); };

    // one text field; resolves with the trimmed text, or "" when skipped
    let hp = "";
    const ask = (ph, skip) => new Promise((res) => {
      const t = T();
      foot.innerHTML = `<form class="fc-form">
        <textarea rows="1" maxlength="2000" placeholder="${esc(ph)}"></textarea>
        <input class="fc-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="fc-send" type="submit" aria-label="${esc(t.send)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>
      </form>${skip ? `<button type="button" class="fc-skip">${esc(skip)}</button>` : ""}`;
      const form = foot.querySelector("form"), ta = form.querySelector("textarea");
      ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });
      ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = ta.value.trim();
        if (!v) { ta.focus(); return; }
        hp = form.querySelector(".fc-hp").value;
        res(v);
      });
      foot.querySelector(".fc-skip")?.addEventListener("click", () => res(""));
      if (matchMedia("(hover: hover)").matches) ta.focus();
    });

    const cvs = () => { const cv = conf().cv; return typeof cv === "string" ? { [lang()]: cv } : cv || {}; };
    const channels = () => (conf().channels || []).map((ch) => ({ text: L(ch.name), href: ch.href }));
    const mail = () => conf().email || (conf().channels || []).find((ch) => ch.href?.startsWith("mailto:"))?.href.slice(7) || "";

    const menu = async (first) => {
      const t = T(), on = conf().items.filter((k) => flows[k] && (k !== "cv" || Object.keys(cvs()).length) && (k !== "contact" || channels().length));
      if (!first) await say(esc(t.more));
      chips(on.map((k) => ({ text: t.menu[k], go: () => { foot.innerHTML = ""; me(t.menu[k]); flows[k](); } })));
    };

    const deliver = async (kind, text, contact) => {
      const t = T(), endpoint = conf().endpoint;
      foot.innerHTML = "";
      const note = await say(esc(t.sending), 200);
      if (!endpoint) { // no Worker yet: a prefilled email
        location.href = `mailto:${mail()}?subject=${encodeURIComponent(t.subj[kind])}&body=${encodeURIComponent(text + (contact ? `\n\n${contact}` : ""))}`;
        note.textContent = t.sentMail;
        return menu();
      }
      try {
        const r = await fetch(String(endpoint).replace(/\/$/, "") + "/msg", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind, text, contact, lang: lang(), page: location.pathname + location.search, hp, ms: Date.now() - shown }),
        });
        if (!r.ok) throw new Error(r.status);
        note.textContent = t.sent;
        menu();
      } catch {
        note.textContent = t.fail;
        chips([{ text: t.retry, go: () => deliver(kind, text, contact) }, ...channels()]);
      }
    };

    const message = (kind) => async () => {
      const t = T();
      await say(esc(kind === "question" ? t.askQuestion : t.askFeedback));
      const text = await ask(t.ph);
      me(text);
      await say(esc(t.askContact));
      const contact = await ask(t.phContact, t.skip);
      me(contact || t.skip);
      deliver(kind, text, contact);
    };

    const flows = {
      feedback: message("feedback"),
      question: message("question"),
      cv: async () => {
        const t = T(), cv = cvs(), l = lang(), other = l === "ru" ? "en" : "ru";
        await say(esc(t.cv));
        links([cv[l] && { text: l === "ru" ? t.cvRu : t.cvEn, href: cv[l], download: true },
          cv[other] && { text: l === "ru" ? t.cvEn : t.cvRu, href: cv[other], download: true }].filter(Boolean));
        menu();
      },
      contact: async () => {
        await say(esc(T().contact));
        links(channels());
        menu();
      },
    };

    let started = false;
    const toggle = (on) => {
      root.classList.toggle("open", on);
      btn.setAttribute("aria-expanded", on);
      if (on && !started) { started = true; label(); say(esc(L(conf().hello) || T().hello), 500).then(() => menu(true)); }
    };
    btn.addEventListener("click", () => toggle(true));
    root.querySelector(".fc-x").addEventListener("click", () => toggle(false));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("open")) toggle(false); });
    // the site switches its language via <html lang>: follow it (a running dialog stays as it was)
    new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    label();
    requestAnimationFrame(() => root.classList.add("in"));
    window.feedbackChat = { open: () => toggle(true), close: () => toggle(false) };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
