// ==UserScript==
// @name         X Profile Forensics (v6.0 Smart Anomaly)
// @namespace    http://tampermonkey.net/
// @version      6.0.0
// @description  Advanced forensics. Logic update: Farsi speakers in "West Asia" with direct access are flagged as high-probability Iran-based White SIM users.
// @author       A Pleasant Experience
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // --- 1. LOCALIZATION ---
    const PREF_LANG = localStorage.getItem("xf_lang_pref") || "auto";
    const DETECTED_LANG = (navigator.language || 'en').split('-')[0];
    const ACTIVE_LANG = PREF_LANG === "auto" ? DETECTED_LANG : PREF_LANG;
    const IS_RTL = (ACTIVE_LANG === 'fa' || ACTIVE_LANG === 'ar');

    const TRANSLATIONS = {
        en: {
            title: "Forensics v6.0",
            labels: { location: "Location", device: "Device", id: "Perm ID", created: "Created", renamed: "Renamed", identity: "Identity", lang: "Language", type: "Type" },
            risk: { safe: "SAFE", detected: "DETECTED", anomaly: "ANOMALY", caution: "CAUTION", normal: "NORMAL", verified: "VERIFIED ID" },
            status: {
                high_conf: "High Confidence",
                high_desc: "Connection matches organic traffic patterns.",
                shield: "Shield Active",
                shield_desc: "Traffic obfuscated via Proxy/VPN or flagged for relocation.",
                shield_norm: "Shield Active (Normal)",
                shield_norm_desc: "User identified as Iranian/West Asia using VPN. Standard behavior.",
                anomaly: "Anomaly Detected",
                anomaly_desc: "Direct access blocked in Iran. Likely causes: White SIM, Serverless config, or +98 Phone.",
                // NEW LOGIC TEXT
                hidden_anomaly: "Hidden Location Identity",
                hidden_anomaly_desc: "Farsi speaker in 'West Asia' with Direct Access. High probability of Iran-based White SIM/Gov Net usage.",
                renamed_msg: "Renamed {n}x"
            },
            btn: { view_avatar: "View Avatar", close: "Close" },
            values: { gov: "Government", unknown: "Unknown", west_asia: "West Asia", fa_script: "Farsi/Arabic" },
            lang_sel: "Lang:"
        },
        fa: {
            title: "تحلیلگر پروفایل ۶.۰",
            labels: { location: "موقعیت", device: "دستگاه", id: "شناسه", created: "ساخت", renamed: "تغییر نام", identity: "هویت", lang: "زبان", type: "نوع" },
            risk: { safe: "امن", detected: "هشدار", anomaly: "ناهنجاری", caution: "احتیاط", normal: "طبیعی", verified: "تایید شده" },
            status: {
                high_conf: "اطمینان بالا",
                high_desc: "اتصال طبیعی است.",
                shield: "سپر فعال",
                shield_desc: "استفاده از VPN/پروکسی تشخیص داده شد.",
                shield_norm: "سپر فعال (طبیعی)",
                shield_norm_desc: "کاربر ایران/غرب آسیا با VPN. رفتار طبیعی.",
                anomaly: "ناهنجاری",
                anomaly_desc: "دسترسی مستقیم در ایران مسدود است. دلایل: سیم‌کارت سفید، تانلینگ یا شماره ۹۸+.",
                // NEW LOGIC TEXT
                hidden_anomaly: "هویت مکانی مخفی",
                hidden_anomaly_desc: "فارسی‌زبان در «غرب آسیا» با اتصال مستقیم. احتمال بالا: استفاده از سیم‌کارت سفید/نت دولتی برای مخفی‌سازی.",
                renamed_msg: "{n} بار تغییر نام"
            },
            btn: { view_avatar: "آواتار اصلی", close: "بستن" },
            values: { gov: "دولتی", unknown: "نامشخص", west_asia: "غرب آسیا", fa_script: "فارسی/عربی" },
            lang_sel: "زبان:"
        }
    };

    const TEXT = TRANSLATIONS[ACTIVE_LANG] || TRANSLATIONS['en'];

    // --- 2. CONFIG & STYLES ---
    const CONFIG = {
        bearerToken: "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        queryId: "XRqGa7EeokUU5kppkh13EA",
        features: { hidden_profile_subscriptions_enabled: true, subscriptions_verification_info_is_identity_verified_enabled: true, subscriptions_verification_info_verified_since_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: true, responsive_web_graphql_timeline_navigation_enabled: true, responsive_web_graphql_timeline_navigation_enabled_elsewhere: true, responsive_web_enhance_cards_enabled: true, verified_phone_label_enabled: true, creator_subscriptions_tweet_preview_api_enabled: true, highlights_tweets_tab_ui_enabled: true, longform_notetweets_consumption_enabled: true, tweetypie_unmention_optimization_enabled: true, vibe_api_enabled: true }
    };

    const FONT_STACK = 'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    const STYLES = `
        :root { --xf-bg: rgba(0,0,0,0.9); --xf-border: rgba(255,255,255,0.15); --xf-blue: #1d9bf0; --xf-green: #00ba7c; --xf-red: #f91880; --xf-orange: #ffd400; --xf-text: #e7e9ea; --xf-dim: #71767b; }

        #xf-pill { display: inline-flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid var(--xf-border); border-radius: 99px; padding: 4px 12px; margin-right: 12px; margin-bottom: 4px; cursor: pointer; font-family: ${FONT_STACK}; font-size: 13px; user-select: none; direction: ltr; }
        #xf-pill:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
        .xf-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 6px currentColor; animation: xf-pulse 2s infinite; }
        @keyframes xf-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        #xf-card { position: fixed; z-index: 10000; width: 320px; background: var(--xf-bg); backdrop-filter: blur(12px); border: 1px solid var(--xf-border); border-radius: 16px; padding: 16px; color: var(--xf-text); font-family: ${FONT_STACK}; box-shadow: 0 15px 40px rgba(0,0,0,0.7); opacity: 0; transform: translateY(10px); transition: 0.2s; pointer-events: none; direction: ${IS_RTL?'rtl':'ltr'}; text-align: ${IS_RTL?'right':'left'}; }
        #xf-card.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }

        .xf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--xf-border); padding-bottom: 10px; margin-bottom: 10px; }
        .xf-title { font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--xf-dim); }
        .xf-badge { font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: var(--xf-border); color: #fff; }
        .xf-bar-bg { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 12px; overflow: hidden; }
        .xf-bar-fill { height: 100%; transition: width 0.5s; }
        .xf-status { padding: 10px; border-radius: 8px; font-size: 12px; line-height: 1.4; margin-bottom: 12px; background: rgba(255,255,255,0.03); border-${IS_RTL?'right':'left'}: 3px solid transparent; }
        .xf-grid { display: grid; gap: 6px; font-size: 13px; }
        .xf-row { display: flex; justify-content: space-between; }
        .xf-lbl { color: var(--xf-dim); }
        .xf-val { font-weight: 600; direction: ltr; }
        .xf-mono { font-family: monospace; background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 4px; }
        .xf-ftr { margin-top: 15px; text-align: center; }
        .xf-btn { display: block; padding: 8px; background: rgba(29,155,240,0.15); color: var(--xf-blue); border-radius: 8px; font-weight: bold; font-size: 12px; text-decoration: none; font-family: ${FONT_STACK}; }

        .xf-lang-row { margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--xf-border); display: flex; justify-content: center; gap: 8px; font-size: 11px; color: var(--xf-dim); }
        .xf-lang-opt { cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: 0.2s; }
        .xf-lang-opt:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .xf-lang-active { background: rgba(29,155,240,0.2); color: var(--xf-blue); font-weight: bold; }

        #xf-mob-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: none; align-items: flex-end; justify-content: center; backdrop-filter: blur(5px); direction: ${IS_RTL?'rtl':'ltr'}; }
        #xf-mob-sheet { width: 100%; max-width: 450px; background: #000; border-top: 1px solid var(--xf-border); border-radius: 20px 20px 0 0; padding: 20px; animation: xf-up 0.3s; font-family: ${FONT_STACK}; }
        @keyframes xf-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .xf-close { margin-top: 15px; padding: 12px; background: #eff3f4; color: #000; text-align: center; border-radius: 99px; font-weight: 700; font-size: 14px; cursor: pointer; user-select: none; }
    `;

    const styleEl = document.createElement("style");
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);

    // --- 3. STATE & DATA ---
    const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const SOURCE_REGEX = /^(.*?)\s+(App\s?Store|Google\s?Play|Play\s?Store|Android\s?App|iOS\s?App)$/i;
    const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF]/;

    const COUNTRY_MAP={AF:"Afghanistan",AL:"Albania",DZ:"Algeria",AD:"Andorra",AO:"Angola",AR:"Argentina",AM:"Armenia",AU:"Australia",AT:"Austria",AZ:"Azerbaijan",BS:"Bahamas",BH:"Bahrain",BD:"Bangladesh",BB:"Barbados",BY:"Belarus",BE:"Belgium",BZ:"Belize",BJ:"Benin",BT:"Bhutan",BO:"Bolivia",BA:"Bosnia",BW:"Botswana",BR:"Brazil",BG:"Bulgaria",BF:"Burkina Faso",BI:"Burundi",KH:"Cambodia",CM:"Cameroon",CA:"Canada",CL:"Chile",CN:"China",CO:"Colombia",CR:"Costa Rica",HR:"Croatia",CU:"Cuba",CY:"Cyprus",CZ:"Czechia",DK:"Denmark",DO:"Dominican Republic",EC:"Ecuador",EG:"Egypt",SV:"El Salvador",EE:"Estonia",ET:"Ethiopia",FI:"Finland",FR:"France",GE:"Georgia",DE:"Germany",GH:"Ghana",GR:"Greece",GT:"Guatemala",HN:"Honduras",HU:"Hungary",IS:"Iceland",IN:"India",ID:"Indonesia",IR:"Iran",IQ:"Iraq",IE:"Ireland",IL:"Israel",IT:"Italy",JM:"Jamaica",JP:"Japan",JO:"Jordan",KZ:"Kazakhstan",KE:"Kenya",KW:"Kuwait",LV:"Latvia",LB:"Lebanon",LY:"Libya",LT:"Lithuania",LU:"Luxembourg",MG:"Madagascar",MY:"Malaysia",MV:"Maldives",MX:"Mexico",MC:"Monaco",MA:"Morocco",NP:"Nepal",NL:"Netherlands",NZ:"New Zealand",NG:"Nigeria",NO:"Norway",OM:"Oman",PK:"Pakistan",PA:"Panama",PY:"Paraguay",PE:"Peru",PH:"Philippines",PL:"Poland",PT:"Portugal",QA:"Qatar",RO:"Romania",RU:"Russia",SA:"Saudi Arabia",SN:"Senegal",RS:"Serbia",SG:"Singapore",SK:"Slovakia",SI:"Slovenia",ZA:"South Africa",KR:"South Korea",ES:"Spain",LK:"Sri Lanka",SE:"Sweden",CH:"Switzerland",TW:"Taiwan",TH:"Thailand",TN:"Tunisia",TR:"Turkey",UA:"Ukraine",AE:"United Arab Emirates",GB:"United Kingdom",US:"United States",UY:"Uruguay",VE:"Venezuela",VN:"Vietnam",YE:"Yemen",ZW:"Zimbabwe"};

    const cache = {};
    let lastUrl = location.href;
    let tooltipEl = null, hideTimeout = null, isInjecting = false;

    // --- 4. LOGIC ---
    function getCsrf() { return document.cookie.match(/(?:^|; )ct0=([^;]+)/)?.[1] || ""; }
    function getUser() { return window.location.pathname.split('/')[1]; }
    function formatTime(ts) { return ts ? new Date(ts).toLocaleString(ACTIVE_LANG === 'en' ? 'en-US' : 'fa-IR') : "N/A"; }
    function setLang(lang) { localStorage.setItem("xf_lang_pref", lang); location.reload(); }

    function getCountryDisplay(code) {
        if (!code) return TEXT.values.unknown;
        if (code === "West Asia") return TEXT.values.west_asia;
        return COUNTRY_MAP[code] || code;
    }

    function renderCard(data) {
        let color = "var(--xf-green)", label = TEXT.risk.safe, pct = "5%",
            title = TEXT.status.high_conf, desc = TEXT.status.high_desc,
            bg = "rgba(0, 186, 124, 0.1)";

        // Logic Analysis
        const isTargetLoc = (data.countryCode === "Iran" || data.countryCode === "West Asia");
        const isTargetDev = (data.deviceFull || "").match(/Iran|West Asia/i);
        const isWestAsia = data.countryCode === "West Asia";

        if (!data.isAccurate) {
            // SHIELD ACTIVE (VPN)
            if (isTargetDev) {
                // Device Iran/West Asia + Shield = NORMAL
                label = TEXT.risk.normal; pct = "15%";
                title = TEXT.status.shield_norm; desc = TEXT.status.shield_norm_desc;
            } else {
                // Foreign Device + Shield = DETECTED
                color = "var(--xf-red)"; label = TEXT.risk.detected; pct = "90%";
                title = TEXT.status.shield; desc = TEXT.status.shield_desc;
                bg = "rgba(249, 24, 128, 0.1)";
            }
        } else if (isTargetLoc && data.isAccurate) {
            // NO SHIELD (DIRECT) + IRAN/WEST ASIA
            color = "var(--xf-orange)"; label = TEXT.risk.anomaly; pct = "70%";
            bg = "rgba(255, 212, 0, 0.1)";

            if (isWestAsia && data.isPersian) {
                // West Asia + Farsi + Direct = High Probability Hidden Identity
                title = TEXT.status.hidden_anomaly;
                desc = TEXT.status.hidden_anomaly_desc;
            } else {
                // Generic Anomaly
                title = TEXT.status.anomaly;
                desc = TEXT.status.anomaly_desc;
            }
        }

        if (data.renamed > 0 && label === TEXT.risk.safe) {
            color = "var(--xf-orange)"; label = TEXT.risk.caution; pct = "40%";
        }
        if (data.isIdVerified) { pct = "0%"; label = TEXT.risk.verified; color = "var(--xf-blue)"; }

        const langHtml = `
            <div class="xf-lang-row">
                <span>${TEXT.lang_sel}</span>
                <span class="xf-lang-opt ${PREF_LANG==='auto'?'xf-lang-active':''}" id="xf-l-auto">Auto</span>
                <span class="xf-lang-opt ${PREF_LANG==='en'?'xf-lang-active':''}" id="xf-l-en">En</span>
                <span class="xf-lang-opt ${PREF_LANG==='fa'?'xf-lang-active':''}" id="xf-l-fa">Fa</span>
            </div>
        `;

        return `
            <div class="xf-header"><span class="xf-title">${TEXT.title}</span><span class="xf-badge" style="background:${color}">${label}</span></div>
            <div class="xf-bar-bg"><div class="xf-bar-fill" style="width:${pct};background:${color}"></div></div>
            <div class="xf-status" style="border-${IS_RTL?'right':'left'}-color:${color};background:${bg}"><strong style="color:${color}">${title}</strong><br><span style="opacity:0.9">${desc}</span></div>
            <div class="xf-grid">
                ${data.country!==TEXT.values.unknown ? `<div class="xf-row"><span class="xf-lbl">${TEXT.labels.location}</span><span class="xf-val">📍 ${data.country}</span></div>` : ''}
                <div class="xf-row"><span class="xf-lbl">${TEXT.labels.device}</span><span class="xf-val">${data.deviceFull}</span></div>
                <div class="xf-row"><span class="xf-lbl">${TEXT.labels.id}</span><span class="xf-val xf-mono">${data.id}</span></div>
                <div class="xf-row"><span class="xf-lbl">${TEXT.labels.created}</span><span class="xf-val">${data.created}</span></div>
                ${data.isPersian ? `<div class="xf-row"><span class="xf-lbl">${TEXT.labels.lang}</span><span class="xf-val">🗣️ ${TEXT.values.fa_script}</span></div>` : ''}
                ${data.renamed>0 ? `<div class="xf-row"><span class="xf-lbl" style="color:var(--xf-orange)">${TEXT.labels.renamed}</span><span class="xf-val" style="color:var(--xf-orange)">${data.renamed}x</span></div>` : ''}
                ${data.isIdVerified ? `<div class="xf-row"><span class="xf-lbl">${TEXT.labels.identity}</span><span class="xf-val" style="color:var(--xf-green)">${TEXT.values.gov_id}</span></div>` : ''}
            </div>
            <div class="xf-ftr"><a href="${data.avatar}" target="_blank" class="xf-btn">${TEXT.btn.view_avatar}</a></div>
            ${langHtml}
        `;
    }

    // --- EVENTS ---
    function bindEvents(container) {
        const auto = container.querySelector('#xf-l-auto');
        const en = container.querySelector('#xf-l-en');
        const fa = container.querySelector('#xf-l-fa');
        if(auto) auto.onclick = () => setLang('auto');
        if(en) en.onclick = () => setLang('en');
        if(fa) fa.onclick = () => setLang('fa');
    }

    function showDesktop(e, html) {
        if (hideTimeout) clearTimeout(hideTimeout);
        if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "xf-card";
            tooltipEl.onmouseenter = () => clearTimeout(hideTimeout);
            tooltipEl.onmouseleave = hideDesktop;
            document.body.appendChild(tooltipEl);
        }
        tooltipEl.innerHTML = html;
        bindEvents(tooltipEl);
        tooltipEl.className = "visible";
        let top = e.clientY + 20, left = e.clientX;
        if (IS_RTL) left -= 320;
        if (left + 340 > window.innerWidth) left = window.innerWidth - 360;
        if (top + 400 > window.innerHeight) top = e.clientY - 400;
        tooltipEl.style.top = top + "px"; tooltipEl.style.left = left + "px";
    }
    function hideDesktop() { hideTimeout = setTimeout(() => { if (tooltipEl) tooltipEl.className = ""; }, 200); }

    function showMobile(html) {
        let overlay = document.getElementById("xf-mob-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "xf-mob-overlay";
            overlay.innerHTML = `<div id="xf-mob-sheet"></div>`;
            overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = "none"; };
            document.body.appendChild(overlay);
        }
        const sheet = document.getElementById("xf-mob-sheet");
        sheet.innerHTML = html;
        bindEvents(sheet);
        const closeBtn = document.createElement("div");
        closeBtn.className = "xf-close";
        closeBtn.textContent = TEXT.btn.close;
        closeBtn.onclick = () => { overlay.style.display = "none"; };
        sheet.appendChild(closeBtn);
        overlay.style.display = "flex";
    }

    async function fetchData(user) {
        if (cache[user]) return cache[user];
        const url = `https://${location.host}/i/api/graphql/${CONFIG.queryId}/AboutAccountQuery?variables=${encodeURIComponent(JSON.stringify({screenName:user}))}&features=${encodeURIComponent(JSON.stringify(CONFIG.features))}&fieldToggles=${encodeURIComponent(JSON.stringify({withAuxiliaryUserLabels:false}))}`;
        try {
            const resp = await fetch(url, { headers: { "authorization": `Bearer ${CONFIG.bearerToken}`, "x-csrf-token": getCsrf(), "content-type": "application/json" } });
            const json = await resp.json();
            const res = json?.data?.user?.result || json?.data?.user_result_by_screen_name?.result;
            if (!res) return null;

            const about = res.about_profile || res.aboutProfile || {};
            const verif = res.verification_info || {};
            const core = res.core || res.legacy || {};

            const sourceRaw = about.source || TEXT.values.unknown;
            let devShort = sourceRaw, devFull = sourceRaw;
            const match = sourceRaw.match(SOURCE_REGEX);

            if (match) {
                const region = match[1].trim();
                const type = match[2].toLowerCase();
                let tech = TEXT.labels.device;
                if (type.includes("app") || type.includes("ios")) tech = "iPhone";
                if (type.includes("play") || type.includes("android")) tech = "Android";
                devShort = tech;
                devFull = `${tech} (${region})`;
            } else if (IS_MOBILE && sourceRaw !== TEXT.values.unknown) {
                devShort = TEXT.labels.device;
            }

            const rawCountry = about.account_based_in;
            const countryDisplay = getCountryDisplay(rawCountry);

            const name = core.name || "";
            const bio = core.description || "";
            const isPersianSpeaker = ARABIC_SCRIPT_REGEX.test(name) || ARABIC_SCRIPT_REGEX.test(bio);

            const data = {
                country: countryDisplay,
                countryCode: rawCountry,
                device: devShort,
                deviceFull: devFull,
                id: res.rest_id,
                created: formatTime(res.core?.created_at || res.legacy?.created_at),
                renamed: parseInt(about.username_changes?.count || 0),
                isAccurate: about.location_accurate,
                isIdVerified: verif.is_identity_verified === true,
                isPersian: isPersianSpeaker,
                avatar: (res.avatar?.image_url || "").replace("_normal", "_400x400")
            };

            let pillText = `📍 ${data.country}`;
            if (data.country === TEXT.values.unknown) pillText = `📱 ${IS_MOBILE ? data.device : data.deviceFull}`;
            else if (!IS_MOBILE) pillText += ` | 📱 ${data.deviceFull}`;
            else pillText += ` | 📱 ${data.device}`;

            let color = "var(--xf-green)";
            const isTargetLoc = (data.countryCode === "Iran" || data.countryCode === "West Asia");
            const isTargetDev = (data.deviceFull || "").match(/Iran|West Asia/i);

            if (!data.isAccurate) {
                color = isTargetDev ? "var(--xf-green)" : "var(--xf-red)";
            } else if (isTargetLoc) {
                color = "var(--xf-orange)";
            }

            cache[user] = { data, pillText, color, html: renderCard(data) };
            return cache[user];
        } catch(e) { console.error(e); return null; }
    }

    async function inject(user) {
        if (isInjecting) return; isInjecting = true;
        try {
            const header = document.querySelector('[data-testid="UserProfileHeader_Items"]');
            if (!header) return;
            const info = await fetchData(user);
            if (getUser() !== user || !info) return;

            const old = document.getElementById("xf-pill");
            if (old) old.remove();

            const pill = document.createElement("div");
            pill.id = "xf-pill";
            pill.innerHTML = `<div class="xf-dot" style="color:${info.color}"></div><span>${info.pillText}</span>`;

            if (IS_MOBILE) {
                pill.onclick = (e) => { e.stopPropagation(); showMobile(info.html); };
            } else {
                pill.onmouseenter = (e) => showDesktop(e, info.html);
                pill.onmouseleave = hideDesktop;
            }
            header.insertBefore(pill, header.firstChild);
        } finally { isInjecting = false; }
    }

    new MutationObserver(() => {
        if (location.href !== lastUrl) { lastUrl = location.href; document.getElementById("xf-pill")?.remove(); if(tooltipEl) tooltipEl.className=""; }
        const user = getUser();
        if (user && document.querySelector('[data-testid="UserProfileHeader_Items"]') && !document.getElementById("xf-pill")) inject(user);
    }).observe(document.body, {childList:true, subtree:true});

})();
