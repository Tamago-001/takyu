// --- 初期データ定義 ---
const DEFAULT_DATA = {
    news: "県総体予選の日程が決定しました。詳細は部員を通じて配布するプリントをご確認ください。",
    targetDate: getNextMonthFirstDay(),
    faqs: [
        { q: "卓球未経験ですが、ついていけますか？", a: "大丈夫です。ラケットの握り方から丁寧に一から教えます。" },
        { q: "部活の雰囲気はどうですか？", a: "メリハリがあります。「楽しみながらも頑張る」をモットーに、練習中は真剣に取り組んでいます。" },
        { q: "外部コーチはいますか？", a: "外部からの指導者はいません。顧問の先生が熱心に指導してくれます。" }
    ]
};

function getNextMonthFirstDay() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0);
    return next.toISOString().slice(0, 16);
}

// --- LocalStorage 管理 ---
function loadData() {
    return {
        news: localStorage.getItem('ttc_news') || DEFAULT_DATA.news,
        targetDate: localStorage.getItem('ttc_targetDate') || DEFAULT_DATA.targetDate,
        faqs: JSON.parse(localStorage.getItem('ttc_faqs')) || DEFAULT_DATA.faqs
    };
}

// --- 画面表示の更新 ---
function renderUI() {
    const data = loadData();
    
    document.getElementById('news-text').innerText = data.news;

    const faqContainer = document.getElementById('faq-list');
    faqContainer.innerHTML = '';
    data.faqs.forEach(item => {
        const div = document.createElement('div');
        div.className = 'faq-item';
        div.innerHTML = `
            <div class="faq-q" onclick="toggleFaq(this)">${escapeHTML(item.q)} <span>＋</span></div>
            <div class="faq-a">${escapeHTML(item.a)}</div>
        `;
        faqContainer.appendChild(div);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// --- テーマ切り替え ---
function toggleTheme() {
    document.body.classList.toggle('theme-red');
}

// --- FAQ アコーディオン ---
function toggleFaq(element) {
    const answer = element.nextElementSibling;
    const span = element.querySelector('span');
    if (answer.style.display === "block") {
        answer.style.display = "none";
        span.innerText = "＋";
    } else {
        answer.style.display = "block";
        span.innerText = "－";
    }
}

// --- カウントダウンタイマー ---
setInterval(function() {
    const data = loadData();
    const target = new Date(data.targetDate).getTime();
    const current = new Date().getTime();
    const distance = target - current;

    if (distance < 0) {
        document.getElementById("countdown").innerHTML = "大会開催中・終了";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("countdown").innerHTML = `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
}, 1000);

// --- 管理画面モーダル制御 ---
const modal = document.getElementById('admin-modal');
const loginForm = document.getElementById('login-form');
const dashboard = document.getElementById('admin-dashboard');

function openAdmin() {
    modal.style.display = 'flex';
    loginForm.style.display = 'block';
    dashboard.style.display = 'none';
    document.getElementById('admin-pass').value = '';
}

function closeAdmin() {
    modal.style.display = 'none';
}

function loginAdmin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "singitai") {
        loginForm.style.display = 'none';
        dashboard.style.display = 'block';
        loadAdminFields();
    } else {
        alert("パスワードが正しくありません。");
    }
}

function loadAdminFields() {
    const data = loadData();
    document.getElementById('edit-news').value = data.news;
    document.getElementById('edit-countdown').value = data.targetDate;

    const faqEditList = document.getElementById('admin-faq-list');
    faqEditList.innerHTML = '';
    data.faqs.forEach(faq => addAdminFaqField(faq.q, faq.a));
}

function addAdminFaqField(q = "", a = "") {
    const faqEditList = document.getElementById('admin-faq-list');
    const div = document.createElement('div');
    div.className = 'admin-faq-edit';
    div.innerHTML = `
        <input type="text" class="edit-faq-q" placeholder="質問 (Q)" value="${escapeHTML(q)}">
        <textarea class="edit-faq-a" rows="2" placeholder="回答 (A)">${escapeHTML(a)}</textarea>
        <button type="button" class="btn-danger" onclick="this.parentElement.remove()" style="padding:4px 8px; font-size:0.8rem;">削除</button>
    `;
    faqEditList.appendChild(div);
}

function saveAdminData() {
    const news = document.getElementById('edit-news').value;
    const targetDate = document.getElementById('edit-countdown').value;

    const faqItems = document.querySelectorAll('.admin-faq-edit');
    const faqs = [];
    faqItems.forEach(item => {
        const q = item.querySelector('.edit-faq-q').value.trim();
        const a = item.querySelector('.edit-faq-a').value.trim();
        if (q && a) faqs.push({ q, a });
    });

    localStorage.setItem('ttc_news', news);
    localStorage.setItem('ttc_targetDate', targetDate);
    localStorage.setItem('ttc_faqs', JSON.stringify(faqs));

    alert("設定を保存しました。");
    renderUI();
    closeAdmin();
}

// --- スコアボード＆全画面表示制御 ---
let score1 = 0, score2 = 0;
let game1 = 0, game2 = 0;
let currentServe = 1;
let wakeLock = null;

// 全画面表示切り替え
async function toggleScoreboardFullscreen() {
    const wrapper = document.getElementById('scoreboard-fullscreen-wrapper');
    const btnIcon = document.getElementById('fullscreen-icon');

    if (!document.fullscreenElement && !wrapper.classList.contains('fullscreen-mode')) {
        if (wrapper.requestFullscreen) {
            await wrapper.requestFullscreen();
        }
        wrapper.classList.add('fullscreen-mode');
        btnIcon.innerText = "✕ 全画面解除";
        requestWakeLock();
    } else {
        if (document.exitFullscreen && document.fullscreenElement) {
            await document.exitFullscreen();
        }
        wrapper.classList.remove('fullscreen-mode');
        btnIcon.innerText = "⛶ 全画面表示";
        releaseWakeLock();
    }
}

// Escキーなどで全画面解除された場合の追従処理
document.addEventListener('fullscreenchange', () => {
    const wrapper = document.getElementById('scoreboard-fullscreen-wrapper');
    const btnIcon = document.getElementById('fullscreen-icon');
    if (!document.fullscreenElement) {
        wrapper.classList.remove('fullscreen-mode');
        btnIcon.innerText = "⛶ 全画面表示";
        releaseWakeLock();
    }
});

// 画面自動消灯防止（Wake Lock API）
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log('Wake Lock Error:', err);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

// 点数・サーブ権計算
function changeScore(team, delta) {
    if (team === 1) {
        score1 = Math.max(0, score1 + delta);
    } else {
        score2 = Math.max(0, score2 + delta);
    }

    if ((score1 >= 11 && score1 - score2 >= 2)) {
        game1++;
        resetPoints();
    } else if ((score2 >= 11 && score2 - score1 >= 2)) {
        game2++;
        resetPoints();
    } else {
        updateServe();
    }

    renderScoreboard();
}

function updateServe() {
    const totalPoints = score1 + score2;
    if (score1 >= 10 && score2 >= 10) {
        currentServe = (totalPoints % 2 === 0) ? 1 : 2;
    } else {
        currentServe = (Math.floor(totalPoints / 2) % 2 === 0) ? 1 : 2;
    }
}

function resetPoints() {
    score1 = 0;
    score2 = 0;
    updateServe();
}

function resetScores() {
    score1 = 0;
    score2 = 0;
    game1 = 0;
    game2 = 0;
    currentServe = 1;
    renderScoreboard();
}

function renderScoreboard() {
    document.getElementById('score1').innerText = score1;
    document.getElementById('score2').innerText = score2;
    document.getElementById('game1').innerText = game1;
    document.getElementById('game2').innerText = game2;

    document.getElementById('serve1').style.opacity = (currentServe === 1) ? '1' : '0.1';
    document.getElementById('serve2').style.opacity = (currentServe === 2) ? '1' : '0.1';
}

// --- ミニゲーム ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let ballRadius = 6, x = canvas.width / 2, y = canvas.height - 30;
let dx = 3, dy = -3;
let paddleHeight = 10, paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

function drawTableLines() {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = "orange";
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = "#c90202";
    ctx.fill();
    ctx.closePath();
}

document.addEventListener("mousemove", e => {
    let relativeX = e.clientX - canvas.getBoundingClientRect().left;
    if(relativeX > 0 && relativeX < canvas.width) paddleX = relativeX - paddleWidth/2;
});

// キャンバス上でのタッチのみ操作し、画面全体のスクロール妨害を回避
canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    let relativeX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    if(relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth/2;
    }
}, {passive: false});

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTableLines();
    drawBall();
    drawPaddle();
    
    if(x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx;
    if(y + dy < ballRadius) {
        dy = -dy;
    } else if(y + dy > canvas.height - ballRadius - paddleHeight) {
        if(x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy * 1.05;
            dx *= 1.05;
        } else if (y + dy > canvas.height) {
            x = canvas.width / 2;
            y = canvas.height - 30;
            dx = 3; dy = -3;
        }
    }
    x += dx; y += dy;
    requestAnimationFrame(drawGame);
}

// --- PWA Service Worker 登録 & iOS/Android 判定 ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker: 登録成功', reg))
            .catch(err => console.error('Service Worker: 登録失敗', err));
    });
}

// iOS Safari 判定（ホーム画面未追加時のみ案内表示）
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

if (isIOS && !isStandalone) {
    document.getElementById('ios-install-banner').style.display = 'flex';
}

// 初期化実行
renderUI();
renderScoreboard();
drawGame();
