/* =============================================
   OCEAN WISH SYSTEM — Projector Local Mode (Premium Deep Sea)
   ============================================= */

/* --- Configuration --- */
const prizes = [
    { name: "Rank 5 (General)", count: 50, color: "#65d4a0" },
    { name: "Rank 4 (Rare)",    count: 30, color: "#c084fc" },
    { name: "Rank 3 (Epic)",    count: 15, color: "#f472b6" },
    { name: "Rank 2 (Vice)",    count: 5,  color: "#fbbf24" },
    { name: "Rank 1 (Grand)",   count: 3,  color: "#f59e0b" }
];

/* --- Game State --- */
let participants   = [];
let headers        = [];
let currentTier    = 0;
let isWarping      = false;
let currentTierColor = "#65d4a0";
let winnersHistory = {};

// ระบบคลื่นน้ำมหาเสน่ห์แผ่ซ่านครอบคลุมหน้าจอ (Deep Sea Tidal Engine)
let waterTides = [];
let tideAlpha = 0;
let targetTideAlpha = 0;

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzya9mZ86bYNaZdXLgr46DjX1afWMxEs10kjyWdnT77C3vcxO2hA6APWco3Pz5vnTIW/exec";

/* =============================================
   HELPER
   ============================================= */
function getDisplayData(winner) {
    if (winner.displayId !== undefined && winner.displayName !== undefined) {
        return { id: winner.displayId, name: winner.displayName, details: winner.displayDetails || [] };
    }
    let keys = (headers && headers.length > 0) ? headers : Object.keys(winner).filter(k => k !== '_id');
    const idVal   = winner._id || winner[keys[0]] || "-";
    const nameVal = keys.length > 1 ? winner[keys[1]] : winner[keys[0]];
    let detailList = [];
    const startSubIndex = keys.length > 1 ? 2 : 1;
    keys.slice(startSubIndex).forEach(k => {
        if (winner[k] && winner[k] !== "-" && String(winner[k]).trim() !== "")
            detailList.push(`${k}: ${winner[k]}`);
    });
    return { id: idVal, name: nameVal, details: detailList };
}

/* =============================================
   1. INIT SYSTEM
   ============================================= */
window.onload = function () {
    console.log("Ocean Wish System — Premium Deep Sea Mode Built Completed");
    prizes.forEach(p => { if (!winnersHistory[p.name]) winnersHistory[p.name] = []; });

    initOceanEngine();
    animate();

    document.getElementById('setupContainer').style.display = 'flex';
    document.getElementById('adminControls').style.display  = 'block';
    document.getElementById('resultControls').style.display = 'flex';
};

/* =============================================
   2. ACTIONS (LOCAL RUN)
   ============================================= */
function loadData() {
    const url = document.getElementById('sheetUrl').value.trim();
    if (!url) return alert("กรุณาใส่ลิงก์ CSV");

    const btn = document.querySelector('#setupContainer button');
    btn.innerText = "กำลังโหลด…"; btn.disabled = true;

    fetch(url)
        .then(r => { if (!r.ok) throw new Error("เข้าถึงไฟล์ไม่ได้"); return r.text(); })
        .then(csv => {
            const lines = csv.split(/\r?\n/).filter(l => l.trim() !== "");
            if (lines.length < 2) throw new Error("ไฟล์ CSV ว่างเปล่าหรือรูปแบบผิด");

            headers = lines[0].split(',').map(h => h.trim());
            participants = lines.slice(1).map(line => {
                const data = line.match(/(?:[^,]*|"(?:[^"]|\\")*")(?:,|$)/g).map(s => {
                    return s.replace(/,$/, '').replace(/^"|"$/g, '').replace(/\\"/g, '"').trim();
                });
                if (data.length < 1) return null;
                let obj = {};
                headers.forEach((h, i) => obj[h] = data[i] ? data[i] : "-");
                obj._id = data[0] ? data[0] : `ID-${Math.random().toString(36).substr(2, 5)}`;
                return obj;
            }).filter(item => item !== null);

            prizes.forEach(p => winnersHistory[p.name] = []);

            document.getElementById('setupContainer').style.display = 'none';
            document.getElementById('mainScreen').style.display     = 'block';

            updateUI(true);
            alert(`โหลดข้อมูลสำเร็จ! ผู้เข้าร่วม: ${participants.length} คน`);
        })
        .catch(err => {
            console.error(err);
            alert("❌ เกิดข้อผิดพลาด:\n" + err.message);
            btn.innerText = "Load Data (Admin Only)"; btn.disabled = false;
        });
}

function updateUI(showCount = false) {
    if (currentTier >= prizes.length) {
        let endHtml = `<h1 class="gold-text" style="font-family:'Cinzel Decorative',serif;">🔱 จบกิจกรรมเจ้าสมุทร! 🔱</h1>
                       <p style="color:#7fa6c7;margin-bottom:20px;">ขอบคุณผู้ร่วมสนุกทุกคน</p>
                       <button onclick="resetGame()" style="
                        padding:15px 40px;font-size:22px;font-family:'Kanit',sans-serif;
                        background:linear-gradient(45deg,#1e3f66,#2e5b88);
                        color:#e2f1f7;border:none;border-radius:50px;cursor:pointer;
                        box-shadow:0 0 20px rgba(45,212,191,0.4);font-weight:bold;transition:transform 0.2s;"
                        onmouseover="this.style.transform='scale(1.1)'"
                        onmouseout ="this.style.transform='scale(1)'">
                        🔄 เริ่มกิจกรรมใหม่
                       </button>`;
        document.getElementById('bannerDisplay').innerHTML = endHtml;
        document.getElementById('adminControls').style.display = 'none';
        return;
    }

    const tier = prizes[currentTier];
    currentTierColor = tier.color;
    document.getElementById('bannerDisplay').innerHTML = `
        <h1 style="color:${tier.color};font-family:'Cinzel Decorative',serif;
                   font-size:clamp(26px,5.5vw,54px);margin:0;
                   text-shadow:0 0 25px ${tier.color}88;">${tier.name}</h1>
        <p style="font-size:18px;color:#7fa6c7;">จำนวนรางวัล: ${tier.count}</p>`;

    document.getElementById('adminControls').style.display = 'block';
    if (showCount)
        document.getElementById('poolCount').innerText = `คงเหลือผู้ลุ้นรางวัล: ${participants.length} คน`;
}

function triggerWish() {
    if (participants.length === 0) return alert("รายชื่อหมดแล้ว!");

    const tier      = prizes[currentTier];
    const drawCount = Math.min(tier.count, participants.length);

    for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
    }
    const rawWinners = participants.slice(0, drawCount);
    participants = participants.slice(drawCount);

    const displayWinners = rawWinners.map(w => {
        const d = getDisplayData(w);
        return { _raw: w, displayId: d.id, displayName: d.name, displayDetails: d.details };
    });

    if (!winnersHistory[tier.name]) winnersHistory[tier.name] = [];
    winnersHistory[tier.name].push(...displayWinners);

    updateUI(true);

    if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL) {
        const sheetData = displayWinners.map(d => ({ id: d.displayId, name: d.displayName, dept: d.displayDetails[0] || "-" }));
        fetch(GOOGLE_SCRIPT_URL, {
            method: "POST", mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rank: tier.name, winners: sheetData })
        }).catch(err => console.error(err));
    }

    playDeepSeaTideAnimation(displayWinners);
}

/* =============================================
   🌊 THEME B: DEEP SEA TIDAL ECLIPSE (แอนิเมชันคลื่นน้ำซัดกลืนเต็มจอ)
   ============================================= */
function playDeepSeaTideAnimation(winners) {
    const tier = prizes[currentTier];
    const flash = document.getElementById('flashOverlay');
    const container = document.querySelector('.container');
    const histBtn = document.querySelector('.btn-history-toggle');

    isWarping = true;
    currentTierColor = tier.color;

    container.style.opacity = '0';
    histBtn.style.display   = 'none';

    // 1. สั่งให้มวลคลื่นน้ำพรูเข้ามาถมปิดหน้าจอออโต้ช้าๆ พรีเมียม
    targetTideAlpha = 1.0;

    // 2. (t=1200ms) มวลน้ำขึ้นหนาทึบ -> ดึงประมวลรายชื่อสุ่มโชว์บนบอร์ดหลังม่านน้ำ
    setTimeout(() => {
        flash.style.background = '#010611';
        flash.style.opacity    = '0.45';
        
        showResults(winners, tier);
    }, 1200);

    // 3. (t=2000ms) สลายคลื่นน้ำพรูออก เผยบัตรคิวคนโชคดีเรืองแสงอร่ามตา
    setTimeout(() => {
        targetTideAlpha = 0.0;
        flash.style.opacity = '0';
        
        setTimeout(() => {
            isWarping = false;
        }, 800);
    }, 2000);
}

/* =============================================
   SHOW RESULTS
   ============================================= */
function showResults(winners, tier) {
    const grid = document.getElementById('resultGrid');
    document.getElementById('resultTitle').innerText    = tier.name;
    document.getElementById('resultTitle').style.color  = tier.color;
    grid.innerHTML = "";

    winners.forEach((w, index) => {
        const data = getDisplayData(w);
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderColor      = tier.color + '88';
        card.style.animationDelay   = `${index * 0.045}s`;
        card.style.boxShadow        = `0 4px 15px rgba(0,0,0,0.6), 0 0 12px ${tier.color}22`;

        let subInfoHTML = "";
        data.details.forEach(info => { subInfoHTML += `<div class="info-sub">${info}</div>`; });

        card.innerHTML = `
            <div class="card-header" style="background:${tier.color}; color:#040914;">
                ${data.id}
            </div>
            <div class="card-body">
                <div class="info-main" style="color:${tier.color};">${data.name}</div>
                ${subInfoHTML}
            </div>`;
        grid.appendChild(card);
    });
    document.getElementById('resultScreen').style.display = 'flex';
}

function closeResult() {
    document.getElementById('resultScreen').style.display  = 'none';
    document.querySelector('.container').style.opacity     = '1';
    document.querySelector('.btn-history-toggle').style.display = 'block';
}

function nextRound() {
    closeResult();
    currentTier++;
    updateUI(true);
}

/* =============================================
   3. HISTORY & MODAL CONTROL
   ============================================= */
function toggleHistory() {
    const modal = document.getElementById('historyModal');
    const list  = document.getElementById('historyList');

    if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }

    const activePrizes = prizes.filter(p => winnersHistory[p.name] && winnersHistory[p.name].length > 0);

    if (activePrizes.length === 0) {
        list.innerHTML = `<p style="text-align:center;color:#43719c;margin-top:50px;">ยังไม่มีรายนามผู้รับพรแห่งวารี</p>`;
    } else {
        let tabsHtml    = `<div class="history-tabs" id="tabsContainer">`;
        let contentHtml = `<div class="history-content-wrapper">`;

        activePrizes.forEach((prize, index) => {
            const isActive = index === 0 ? 'active' : '';
            const winners  = winnersHistory[prize.name];

            tabsHtml += `<button class="tab-btn ${isActive}" onclick="switchTab(event,'tab-${index}')">
                ${prize.name} <span style="opacity:0.6">(${winners.length})</span></button>`;

            contentHtml += `<div id="tab-${index}" class="tab-content ${isActive}">`;
            winners.forEach(w => {
                const data    = getDisplayData(w);
                const subText = data.details.length > 0 ? data.details[0] : "-";
                contentHtml += `<div class="history-item">
                    <div style="font-weight:bold;">${data.name}</div>
                    <div style="font-size:0.8em;opacity:0.6;">${subText}</div>
                </div>`;
            });
            contentHtml += `</div>`;
        });

        tabsHtml    += `</div>`;
        contentHtml += `</div>`;
        list.innerHTML = tabsHtml + contentHtml;

        const slider = document.getElementById('tabsContainer');
        let isDown = false, startX, scrollLeft;
        slider.addEventListener('mousedown', e => {
            isDown = true; slider.classList.add('dragging');
            startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave',  () => { isDown = false; slider.classList.remove('dragging'); });
        slider.addEventListener('mouseup',     () => { isDown = false; slider.classList.remove('dragging'); });
        slider.addEventListener('mousemove',   e  => {
            if (!isDown) return; e.preventDefault();
            slider.scrollLeft = scrollLeft - (e.pageX - slider.offsetLeft - startX) * 2;
        });
    }
    modal.style.display = 'flex';
}

window.switchTab = function (event, tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
};

function resetGame() {
    if (!confirm("⚠️ WARNING: ต้องการล้างระบบทั้งหมด?\n(ประวัติจะหายไป และกลับสู่หน้าใส่ CSV)")) return;
    window.location.reload();
}

/* =============================================
   4. CANVAS — ETHEREAL SEA BUBBLES ENGINE (ระบบละอองฟองอากาศใต้สมุทร)
   ============================================= */
const canvas = document.getElementById('starCanvas');
const ctx    = canvas.getContext('2d');
let w, h;

function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize); resize();

/* ────────────────────────────────────────────
   🫧 CLASS: ETHEREAL SEA BUBBLE (ฟองอากาศเวทมนตร์ลอยเอื่อยขึ้นข้างบน)
   ──────────────────────────────────────────── */
class SeaBubble {
    constructor() { this.reset(); this.y = Math.random() * h; } // กระจายตัวนุ่มๆ ตั้งแต่เริ่ม
    reset() {
        this.x  = Math.random() * w;
        this.y  = h + Math.random() * 40; // ไปเกิดใหม่ใต้ก้นจอ
        
        // 🔥 ควบคุมให้ฟองลอยขึ้นแนวดิ่ง (vy ติดลบ) ช้าๆ ละมุนมาก
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = -(Math.random() * 0.4 + 0.15); 
        
        // ระยะตื้นลึกกึ่งโปร่งแสง
        this.r  = Math.random() * 2.8 + 0.5;
        this.glowR    = this.r * (Math.random() * 4 + 5);
        this.phase    = Math.random() * Math.PI * 2;
        this.wobbleS  = Math.random() * 0.02 + 0.005;
        
        const palette = ['#4db6ac','#80deea','#b2ebf2','#e0f7fa','#e0b84c'];
        this.color = palette[Math.floor(Math.random() * palette.length)];
    }
    update() {
        this.phase += this.wobbleS;
        this.brightness = (Math.sin(this.phase) + 1) / 2;

        if (isWarping) {
            // จังหวะคลื่นซัด คลื่นจะเหวี่ยงฟองอากาศวนเป็นวงกลมใต้กระแสน้ำวน
            this.vx += Math.sin(this.phase * 0.3) * 0.02;
            this.vy -= 0.01; // เร่งความเร็วลอยตัวขึ้นอีกนิด
        } else {
            // โยกเยกส่ายซ้ายขวาตามกระแสน้ำเนียนๆ ออร์แกนิก
            this.vx += Math.sin(this.phase * 0.5) * 0.005;
        }
        
        this.x += this.vx; this.y += this.vy;
        
        // หลุดขอบจอ -> รีเซ็ตไปเกิดใหม่ก้นมหาสมุทร
        if (this.x < -30) this.x = w + 30; if (this.x > w + 30) this.x = -30;
        if (this.y < -30) this.reset();
    }
    draw() {
        const alpha = this.brightness * 0.75 + 0.25;
        const gGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowR);
        gGrad.addColorStop(0, this.color + Math.floor(alpha * 120).toString(16).padStart(2,'0'));
        gGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gGrad;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.glowR, 0, Math.PI*2); ctx.fill();
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

/* ────────────────────────────────────────────
   🌊 CLASS: TIDE PARTICLE (มวลคลื่นวารีซัดปิดหน้าจอเมื่อกด Wish)
   ──────────────────────────────────────────── */
class TideParticle {
    constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.baseRadius = Math.random() * 180 + 180;
        this.radius = this.baseRadius;
        this.phase = Math.random() * Math.PI * 2;
        this.speedPhase = Math.random() * 0.015;
    }
    update() {
        this.phase += this.speedPhase;
        this.radius = this.baseRadius + Math.sin(this.phase) * 40;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -this.radius) this.x = w + this.radius;
        if (this.x > w + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = h + this.radius;
        if (this.y > h + this.radius) this.y = -this.radius;
    }
    draw(globalAlpha) {
        ctx.save();
        ctx.globalAlpha = globalAlpha * 0.32; 
        
        let tGrad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.05, this.x, this.y, this.radius);
        tGrad.addColorStop(0, '#020b18'); // แกนน้ำลึกทึบสีน้ำเงินเข้มข้น
        tGrad.addColorStop(0.6, '#062347'); // ออร่าสีครามผิวน้ำ
        tGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

/* ── ระบบเซ็ตค่าแอนิเมชันฝูงฟองสบู่เวทมนตร์และคลื่นน้ำ ── */
let seaBubbles = [];

function initOceanEngine() {
    // ฟองอากาศ 160 ตัวหนานุ่ม ลอยพริ้วไหว
    seaBubbles = Array.from({length: 160}, () => new SeaBubble());
    
    // มวลกระแสน้ำวน 25 ลูกใหญ่ พร้อมถมดำบดบังฉากอย่างนิ่มนวล
    waterTides = Array.from({length: 25}, () => new TideParticle());
}

/* =============================================
   5. MAIN RENDER LOOP
   ============================================= */
function animate() {
    ctx.clearRect(0, 0, w, h);

    // 1. วาดและประมวลผลฝูงฟองสบู่เวทมนตร์ชั้นลึกสุด
    seaBubbles.forEach(b => { b.update(); b.draw(); });

    // 2. คำนวณความหนาแน่นตัวแปรระดับมวลน้ำวน
    tideAlpha += (targetTideAlpha - tideAlpha) * 0.06;

    // 3. ปล่อยพลังมวลคลื่นวารีซัดสาดบดบังจอ
    if (tideAlpha > 0.001) {
        waterTides.forEach(t => {
            t.update();
            t.draw(tideAlpha);
        });
    }

    requestAnimationFrame(animate);
}
