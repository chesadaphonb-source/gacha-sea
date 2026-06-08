/* =========================================================
   OCEAN WISH SYSTEM — ENGINE SCRIPT (INSTANT WAVE SWEEP UPDATE)
   ========================================================= */

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

// ระบบเอฟเฟกต์ตอนกดสุ่มรางวัล
let treasureState = "none"; 
let burstBubbles = []; 

// เอ็นจิ้นแพลงก์ตอนเวทมนตร์และฟองอากาศธรรมชาติ (Idle State)
let seaBubbles = [];
let planktons = [];

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYNML38mXJT-x_5ya7HXKh9ZuIt2yYpAc5FsR8rKjEWxtqm95GqSuBf72i61vXAHjIsA/exec";

/* =============================================
   ROBUST CSV PARSER (ดักเออเร่อตัดคำ ดูดมาครบ 466 คน)
   ============================================= */
function parseCSVLine(line) {
    let arr = [];
    let quote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
        let c = line[i];
        if (c === '"') {
            quote = !quote;
        } else if (c === ',' && !quote) {
            arr.push(cell.trim());
            cell = "";
        } else {
            cell += c;
        }
    }
    arr.push(cell.trim());
    return arr;
}

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
            detailList.push(winner[k]);
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
    document.getElementById('adminControls').style.display  = 'none';
    document.getElementById('resultControls').style.display = 'none';
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

            headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
            
            participants = lines.slice(1).map(line => {
                const data = parseCSVLine(line);
                if (data.length < 1 || data[0] === "") return null;
                
                let obj = {};
                headers.forEach((h, i) => obj[h] = data[i] !== undefined ? data[i] : "-");
                obj._id = data[0] ? data[0] : `ID-${Math.random().toString(36).substr(2, 5)}`;
                return obj;
            }).filter(item => item !== null);

            prizes.forEach(p => winnersHistory[p.name] = []);

            document.getElementById('setupContainer').style.display = 'none';
            document.getElementById('mainScreen').style.display     = 'block';

            updateUI(true);
            alert(`โหลดข้อมูลสำเร็จ! ดูดรายชื่อเข้าระบบ: ${participants.length} คนครบถ้วนโว้ยมึง!`);
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

    playAbyssalBubbleAnimation(displayWinners);
}

/* =========================================================
   🫧 FIXED EFFECT: INSTANT BUBBLE WAVE (พุ่งกวาดจากขอบล่างขึ้นบนทันที ไร้จุดค้าง)
   ========================================================= */
function playAbyssalBubbleAnimation(winners) {
    const tier = prizes[currentTier];
    const flash = document.getElementById('flashOverlay');
    const container = document.querySelector('.container');
    const histBtn = document.querySelector('.btn-history-toggle');

    isWarping = true;
    currentTierColor = tier.color;

    container.style.opacity = '0';
    histBtn.style.display   = 'none';

    treasureState = "bubble_burst";
    burstBubbles = [];

    // ดึงพิกัด Y ขึ้นมาสแตนด์บายชิดขอบล่างจอพอดี เพื่อให้กดสุ่มปุ๊บพุ่งตัดขึ้นบนทันที ไร้อาการดีเลย์ค้าง!
    for (let i = 0; i < 700; i++) {
        let size = Math.random() * 8 + 1.5;
        burstBubbles.push({
            x: Math.random() * w,
            y: h + Math.random() * 100, // ชิดเป้าขอบล่างสุดกิ๊ก
            r: size,
            vy: -(Math.random() * 12 + 10), // เร่งความเร็วการลอยพุ่งผ่านหน้าจอแบบลื่นไหล
            vx: (Math.random() - 0.5) * 2.5,
            alpha: Math.random() * 0.75 + 0.25,
            wobble: Math.random() * Math.PI,
            wobbleSpeed: Math.random() * 0.04 + 0.02,
            blur: size > 6.5 ? 1.5 : 0 
        });
    }

    // มวลฟองกวาดขึ้นพ้นขอบบนจอ (ใช้เวลา 1.3 วินาที) ค่อยฉายแผงรายชื่อกึ่งกลาง
    setTimeout(() => {
        flash.style.background = '#030914'; 
        flash.style.opacity    = '0.85';
        showResults(winners, tier);
    }, 1300);

    setTimeout(() => {
        treasureState = "none";
        flash.style.opacity = '0';
        isWarping = false;
    }, 2000);
}

/* =============================================
   SHOW RESULTS (ล็อกแสดงผล 3 ช่องเน้น ๆ ขาวคมชัด)
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
        card.style.borderColor      = tier.color + 'aa';
        card.style.animationDelay   = `${index * 0.06}s`;
        
        card.style.setProperty('--glow-color', tier.color);
        card.style.boxShadow        = `0 15px 35px rgba(0,0,0,0.8), 0 0 25px ${tier.color}33`;

        let affiliationText = data.details[0] !== undefined ? data.details[0] : "-";

        card.innerHTML = `
            <div class="card-glow-line" style="background:${tier.color}"></div>
            <div class="card-header" style="background: linear-gradient(135deg, ${tier.color} 0%, #040914 140%); color:#ffffff;">
                ${data.id}
            </div>
            <div class="card-body">
                <div class="info-main" style="color:${tier.color}; text-shadow: 0 0 10px ${tier.color}44;">${data.name}</div>
                <div class="info-sub">${affiliationText}</div>
            </div>
            <div class="card-shine-overlay"></div>`;
        grid.appendChild(card);
    });
    document.getElementById('resultScreen').style.display = 'flex';
    document.getElementById('resultControls').style.display = 'flex';
}

function closeResult() {
    document.getElementById('resultScreen').style.display  = 'none';
    document.getElementById('resultControls').style.display = 'none';
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

/* =========================================================
   4. CANVAS — LIFE BACKGROUND ENGINE (ไม่มีลำแสงกวนสายตา)
   ========================================================= */
const canvas = document.getElementById('starCanvas');
const ctx    = canvas.getContext('2d');
let w, h;

function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize); resize();

class BioPlankton {
    constructor() { this.reset(); this.y = Math.random() * h; }
    reset() {
        this.x = Math.random() * (w * 0.3);
        this.y = h * (0.7 + Math.random() * 0.25);
        this.baseVx = Math.random() * 0.2 + 0.15;
        this.baseVy = -(Math.random() * 0.3 + 0.1);
        this.vx = this.baseVx; this.vy = this.baseVy;
        this.r = Math.random() * 1.8 + 0.6;
        this.glowR = this.r * (Math.random() * 5 + 4);
        this.phase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.01 + 0.005;
        const colors = ['#2dd4bf', '#06b6d4', '#38bdf8', '#a5f3fc', '#34d399'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 1.0; this.decay = Math.random() * 0.0012 + 0.0005;
    }
    update() {
        this.phase += this.wobbleSpeed; this.life -= this.decay;
        this.vx = this.baseVx + Math.sin(this.phase) * 0.15;
        this.vy = this.baseVy + Math.cos(this.phase * 0.5) * 0.1;
        this.x += this.vx; this.y += this.vy;
        if (this.x > w + 20 || this.y < -20 || this.life <= 0) this.reset();
    }
    draw() {
        if (this.life <= 0) return;
        let pulseAlpha = (Math.sin(this.phase * 1.5) + 1) / 2;
        let finalAlpha = pulseAlpha * this.life * 0.8;

        let gGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowR);
        gGrad.addColorStop(0, this.color + Math.floor(finalAlpha * 140).toString(16).padStart(2,'0'));
        gGrad.addColorStop(1, 'transparent');
        
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gGrad; ctx.beginPath(); ctx.arc(this.x, this.y, this.glowR, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = finalAlpha; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

class SeaBubble {
    constructor() { this.reset(); this.y = Math.random() * h; }
    reset() {
        this.x  = Math.random() * w; this.y  = h + Math.random() * 40;
        this.vx = (Math.random() - 0.5) * 0.15; this.vy = -(Math.random() * 0.3 + 0.1); 
        this.r  = Math.random() * 2.2 + 0.5; this.phase = Math.random() * Math.PI * 2;
    }
    update() {
        this.phase += 0.01; this.x += this.vx + Math.sin(this.phase) * 0.05; this.y += this.vy;
        if (this.y < -20) this.reset();
    }
    draw() {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#80deea'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

function initOceanEngine() {
    seaBubbles = Array.from({length: 40}, () => new SeaBubble());
    planktons  = Array.from({length: 90}, () => new BioPlankton());
}

/* =============================================
   5. MAIN RENDER LOOP
   ============================================= */
function animate() {
    ctx.clearRect(0, 0, w, h);

    planktons.forEach(p => { p.update(); p.draw(); });
    seaBubbles.forEach(b => { b.update(); b.draw(); });

    if (treasureState === "bubble_burst") {
        burstBubbles.forEach(b => {
            b.y += b.vy;
            b.wobble += b.wobbleSpeed;
            b.x += b.vx + Math.sin(b.wobble) * 0.8;
            
            if (b.blur > 0) {
                ctx.save();
                ctx.filter = `blur(${b.blur}px)`;
            }
            
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180, 230, 250, ${b.alpha * 0.22})`; 
            ctx.fill();
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${b.alpha * 0.65})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * 0.95})`;
            ctx.fill();
            
            if (b.blur > 0) ctx.restore();
        });
    }

    requestAnimationFrame(animate);
}
