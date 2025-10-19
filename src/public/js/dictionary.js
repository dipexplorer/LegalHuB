// src/public/js/dictionary.js
// Client-side logic for LegalHuB dictionary page
// - Posts to /dictionary/search (no full page reload)
// - Injects server-rendered partial HTML
// - Re-attaches Copy / Save / JSON toggle / Related handlers
// - Shows skeleton loader, toast notifications, and recent search chips
(() => {
    // Selectors & config
    const root = document.getElementById("legal-dictionary-root");
    const form = document.getElementById("ld-search-form");
    const input = document.getElementById("ld-term-input");
    const resultRoot = document.getElementById("ld-result");
    const skeletonWrap = document.getElementById("ld-skeleton");
    const spinner = document.getElementById("ld-search-spinner");
    const recentWrap = document.getElementById("ld-recent");
    const metaWrap = document.getElementById("ld-meta");
    const sourceBadge = document.getElementById("ld-source-badge");
    const relatedAside = document.getElementById("ld-related");
    const relatedList = document.getElementById("ld-related-list");
    const globalSaveBtn = document.getElementById("ld-save-global");

    const USER_LOGGED_IN = root && root.dataset && root.dataset.user === "true";
    const RECENT_KEY = "legalhub_recent_searches_v1";
    const MAX_RECENT = 8;

    /* -------------------------
     Utilities
     ------------------------- */
    function toast(msg, duration = 2400) {
        let el = document.querySelector(".ld-toast");
        if (!el) {
            el = document.createElement("div");
            el.className = "ld-toast";
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add("visible");
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove("visible"), duration);
    }

    function setLoading(on = true) {
        if (spinner) {
            if (on) spinner.classList.add("ld-spinner--active");
            else spinner.classList.remove("ld-spinner--active");
        }
        if (resultRoot) resultRoot.setAttribute("aria-busy", on ? "true" : "false");
        if (skeletonWrap) skeletonWrap.style.display = on ? "block" : "none";
    }

    function skeletonMarkup() {
        return `
      <div class="ld-card" role="status" aria-live="polite" aria-busy="true">
        <div class="skeleton" style="height:24px;width:45%;margin-bottom:12px;border-radius:8px"></div>
        <div class="skeleton" style="height:12px;width:100%;margin-bottom:8px;border-radius:6px"></div>
        <div class="skeleton" style="height:12px;width:92%;margin-bottom:8px;border-radius:6px"></div>
        <div class="skeleton" style="height:12px;width:60%;margin-top:12px;border-radius:6px"></div>
      </div>`;
    }

    function getRecent() {
        try {
            return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        } catch {
            return [];
        }
    }

    function pushRecent(term) {
        if (!term) return;
        const normalized = term.trim();
        if (!normalized) return;
        const list = getRecent().filter((t) => t.toLowerCase() !== normalized.toLowerCase());
        list.unshift(normalized);
        localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
        renderRecent();
    }

    function renderRecent() {
        if (!recentWrap) return;
        const list = getRecent();
        recentWrap.innerHTML = "";
        list.forEach((t) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ld-recent__chip";
            btn.textContent = t;
            btn.addEventListener("click", () => {
                input.value = t;
                submitSearch(t);
            });
            recentWrap.appendChild(btn);
        });
    }

    /* -------------------------
     Attach handlers for injected content
     ------------------------- */
    function attachCardHandlers(container = document) {
        // Copy definition
        container.querySelectorAll(".js-copy-def").forEach((btn) => {
            // avoid double-binding
            if (btn._bound) return;
            btn._bound = true;
            btn.addEventListener("click", async (e) => {
                const card = e.currentTarget.closest(".ld-card");
                // Prefer server-provided data-def if present
                let def = (btn.getAttribute("data-def") || "").trim();

                // If data-def empty, try definition-content text
                if (!def && card) {
                    const defEl = card.querySelector(".definition-content");
                    if (defEl) def = defEl.innerText.trim();
                }

                // If still empty, build a fallback (term + aspects + examples + notes)
                if (!def && card) {
                    const parts = [];
                    const termEl = card.querySelector(".card__term-title");
                    if (termEl) parts.push(termEl.innerText.trim());
                    const defEl2 = card.querySelector(".definition-content");
                    if (defEl2 && defEl2.innerText.trim()) parts.push(defEl2.innerText.trim());

                    const aspects = [];
                    card.querySelectorAll(".card__ordered-list li").forEach((li) => {
                        const txt = li.innerText.trim();
                        if (txt) aspects.push(txt.replace(/\s+/g, " "));
                    });
                    if (aspects.length) parts.push("Key aspects: " + aspects.join(" • "));

                    const examples = [];
                    card.querySelectorAll(".card__example").forEach((x) => {
                        const v = x.innerText.trim();
                        if (v) examples.push(v);
                    });
                    if (examples.length) parts.push("Examples: " + examples.join(" • "));

                    const notes = card.querySelector(".notes__box");
                    if (notes && notes.innerText.trim())
                        parts.push("Notes: " + notes.innerText.trim());

                    def = parts.filter(Boolean).join("\n\n").trim();
                }

                if (!def) {
                    toast("Nothing to copy");
                    return;
                }

                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(def);
                        const orig = btn.innerHTML;
                        btn.innerHTML = "✓";
                        toast("Copied!");
                        setTimeout(() => (btn.innerHTML = orig), 1200);
                    } else {
                        // fallback: execCommand
                        const ta = document.createElement("textarea");
                        ta.value = def;
                        // keep off-screen, readonly to avoid iOS keyboard
                        ta.setAttribute("readonly", "");
                        ta.style.position = "absolute";
                        ta.style.left = "-9999px";
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        ta.remove();
                        toast("Copied!");
                    }
                } catch (err) {
                    console.error("Copy error", err);
                    toast("Copy failed");
                }
            });
        });

        // Save term
        container.querySelectorAll(".js-save-term").forEach((btn) => {
            if (btn._bound) return;
            btn._bound = true;
            btn.addEventListener("click", async (e) => {
                const term =
                    btn.dataset.term ||
                    btn.closest(".ld-card")?.querySelector(".card__term-title")?.innerText;
                if (!term) return toast("Missing term");
                if (!USER_LOGGED_IN) return toast("Login to save terms");
                btn.disabled = true;
                try {
                    const resp = await fetch("/api/dictionary/save", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ term }),
                    });
                    const j = await resp.json().catch(() => ({}));
                    if (resp.ok) {
                        btn.setAttribute("aria-pressed", "true");
                        // small visual hint: slightly scale
                        btn.style.transform = "translateY(-2px) scale(1.02)";
                        setTimeout(() => (btn.style.transform = ""), 380);
                        toast("Saved!");
                    } else {
                        toast(j?.message || "Save failed");
                    }
                } catch {
                    toast("Save failed");
                } finally {
                    btn.disabled = false;
                }
            });
        });

        // Share term (Web Share API -> dialog -> clipboard fallback)
        container.querySelectorAll(".js-share-term").forEach((btn) => {
            if (btn._bound) return;
            btn._bound = true;
            btn.addEventListener("click", async (e) => {
                const term =
                    btn.getAttribute("data-term") ||
                    btn.closest(".ld-card")?.querySelector(".card__term-title")?.innerText ||
                    "";
                if (!term) return toast("Missing term to share");

                const url = window.location.origin + "/dictionary?term=" + encodeURIComponent(term);

                // native Web Share (mobile / supported browsers)
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: term,
                            text: "Definition from LegalHuB: " + term,
                            url,
                        });
                        return;
                    } catch (err) {
                        console.debug("navigator.share failed", err);
                    }
                }

                // dialog fallback (if partial includes <dialog>)
                const dialogId = "share-dialog-" + term.replace(/\s+/g, "-");
                const dialog = document.getElementById(dialogId);
                if (dialog && typeof dialog.showModal === "function") {
                    // make sure share link is absolute
                    const inputEl = dialog.querySelector(".share-link");
                    if (inputEl && inputEl.value.indexOf("/dictionary") === 0) {
                        inputEl.value = window.location.origin + inputEl.value;
                    }

                    // show modal and manage focus/close handlers only once
                    try {
                        dialog.showModal();
                    } catch (err) {
                        console.debug("dialog.showModal failed", err);
                    }

                    // focus & select link
                    if (inputEl) {
                        setTimeout(() => {
                            try {
                                inputEl.focus();
                                inputEl.select();
                            } catch (e) {}
                        }, 40);
                    }

                    // guard: only bind close handlers once per dialog instance
                    if (!dialog._shareHandlersBound) {
                        // close buttons
                        const closeBtn = dialog.querySelector(".share-dialog__close");
                        const closeInline = dialog.querySelector(".share-btn--close");
                        if (closeBtn) closeBtn.addEventListener("click", () => dialog.close());
                        if (closeInline)
                            closeInline.addEventListener("click", () => dialog.close());

                        // click outside (dialog itself) closes
                        dialog.addEventListener("click", function (ev) {
                            if (ev.target === dialog) dialog.close();
                        });

                        // Esc key & cancel already handled by dialog; ensure toast not shown
                        dialog.addEventListener("cancel", function () {
                            /* allow close */
                        });

                        dialog._shareHandlersBound = true;
                    }

                    return;
                }

                // final fallback: copy to clipboard
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(url);
                        toast("Share link copied");
                    } else {
                        const ta = document.createElement("textarea");
                        ta.value = url;
                        ta.setAttribute("readonly", "");
                        ta.style.position = "absolute";
                        ta.style.left = "-9999px";
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        ta.remove();
                        toast("Share link copied");
                    }
                } catch (err) {
                    console.error("Share fallback failed", err);
                    toast("Unable to share");
                }
            });
        });

        // JSON toggle
        container.querySelectorAll(".js-toggle-json").forEach((btn) => {
            if (btn._bound) return;
            btn._bound = true;
            btn.addEventListener("click", (e) => {
                const card = e.currentTarget.closest(".ld-card");
                const pre = card?.querySelector(".raw-json");
                if (!pre) return;
                const hidden = pre.classList.contains("hidden");
                pre.classList.toggle("hidden");
                btn.setAttribute("aria-expanded", hidden ? "true" : "false");
                btn.textContent = hidden ? "Hide JSON" : "JSON";
            });
        });

        // related chips inside card
        container.querySelectorAll(".related-chip").forEach((chip) => {
            if (chip._bound) return;
            chip._bound = true;
            chip.addEventListener("click", (e) => {
                const t = chip.dataset.term || chip.innerText;
                if (t) {
                    input.value = t;
                    submitSearch(t);
                }
            });
        });
    }

    /* -------------------------
     Inject result HTML
     ------------------------- */
    function injectResultHtml(html, meta) {
        // hide skeleton / spinner
        setLoading(false);
        // meta: optionally show source pill
        if (meta && meta.source && sourceBadge) {
            metaWrap.classList.remove("hidden");
            sourceBadge.textContent = meta.source;
        } else if (metaWrap) {
            metaWrap.classList.add("hidden");
        }

        if (!resultRoot) return;
        resultRoot.innerHTML = html || `<div class="ld-card error">No result</div>`;
        // attach handlers
        attachCardHandlers(resultRoot);

        // populate related aside if the injected content includes related chips
        const cardRelated = resultRoot.querySelectorAll(".related-chip");
        if (cardRelated && cardRelated.length) {
            relatedAside.classList.remove("hidden");
            relatedList.innerHTML = "";
            cardRelated.forEach((rc) => {
                const clone = rc.cloneNode(true);
                // remove any previously bound flag to allow new binding
                clone._bound = undefined;
                clone.addEventListener("click", () => {
                    const t = clone.dataset.term || clone.innerText;
                    if (t) {
                        input.value = t;
                        submitSearch(t);
                    }
                });
                relatedList.appendChild(clone);
            });
        } else {
            relatedAside.classList.add("hidden");
            relatedList.innerHTML = "";
        }
    }

    /* -------------------------
     Submit search (POST /dictionary/search)
     ------------------------- */
    async function submitSearch(term) {
        if (!term || !term.trim()) return;
        const t = term.trim();

        // UI work: spinner + skeleton
        setLoading(true);
        if (skeletonWrap) skeletonWrap.style.display = "block";
        if (resultRoot) resultRoot.innerHTML = skeletonMarkup();

        try {
            const resp = await fetch("/dictionary/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ term: t }),
            });
            const j = await resp.json().catch(() => null);

            if (!resp.ok || !j || !j.ok) {
                // Try to show helpful message from server
                const msg = (j && (j.message || j.error)) || "Search failed";
                resultRoot.innerHTML = `<div class="ld-card error">Error: ${msg}</div>`;
                toast(msg);
                setLoading(false);
                return;
            }

            // Insert HTML and meta
            injectResultHtml(j.html || "", j.meta || {});
            pushRecent(t);
        } catch (err) {
            resultRoot.innerHTML = `<div class="ld-card error">Network error while searching.</div>`;
            toast("Network error");
            setLoading(false);
        } finally {
            // ensure skeleton hidden
            if (skeletonWrap) skeletonWrap.style.display = "none";
        }
    }

    /* -------------------------
     Form bindings & global save
     ------------------------- */
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const t = input.value.trim();
            if (!t) {
                input.focus();
                return;
            }
            submitSearch(t);
        });
    }

    if (input) {
        input.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                form.dispatchEvent(new Event("submit", { bubbles: true }));
            }
        });
    }

    if (globalSaveBtn) {
        globalSaveBtn.addEventListener("click", async () => {
            const term = input.value.trim();
            if (!term) return toast("Type a term first");
            if (!USER_LOGGED_IN) return toast("Login to save terms");
            globalSaveBtn.disabled = true;
            try {
                const resp = await fetch("/api/dictionary/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ term }),
                });
                if (resp.ok) toast("Saved");
                else {
                    const j = await resp.json().catch(() => ({}));
                    toast(j?.message || "Save failed");
                }
            } catch {
                toast("Save failed");
            } finally {
                globalSaveBtn.disabled = false;
            }
        });
    }

    /* -------------------------
     Initial state
     ------------------------- */
    renderRecent();

    // Initial empty-state message already present in EJS; ensure related aside hidden
    if (relatedAside) relatedAside.classList.add("hidden");
})();
