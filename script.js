// --- Game State & Multiplayer Variables ---
let size = 5;
let moves = 0;
let playing = false;
let board = []; 

// Multiplayer state
const TURN_TIME_SECONDS = 180; // 3 minutes per player
let currentPlayer = 1;
let p1Score = 0;
let p2Score = 0;
let timeLeft = TURN_TIME_SECONDS;
let timerInterval = null;

// Audio Context 
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playToggleSound() {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400 + Math.random() * 200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

function playWinSound() {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    let startTime = audioCtx.currentTime;
    notes.forEach((note, index) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.value = note;
        gainNode.gain.setValueAtTime(0, startTime + index * 0.10);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + index * 0.10 + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + index * 0.10 + 0.15);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(startTime + index * 0.10);
        oscillator.stop(startTime + index * 0.10 + 0.15);
    });
}

// --- DOM Elements ---
const boardEl = document.getElementById('game-board');
const moveCounterEl = document.getElementById('move-counter');
const winMessageEl = document.getElementById('win-message');
const turnOverlayEl = document.getElementById('turn-overlay');
const difficultySelect = document.getElementById('difficulty');
const resetBtn = document.getElementById('reset-btn');
const startTurnBtn = document.getElementById('start-turn-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');

const p1ScoreEl = document.getElementById('p1-score');
const p2ScoreEl = document.getElementById('p2-score');
const p1BoxEl = document.getElementById('p1-box');
const p2BoxEl = document.getElementById('p2-box');
const timeLeftEl = document.getElementById('time-left');

// --- Initialization ---
function init() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.textContent = '☀️';
    }
    setupEventListeners();
}

function setupEventListeners() {
    resetBtn.addEventListener('click', () => { location.reload(); });
    startTurnBtn.addEventListener('click', startActiveTurn);
    
    difficultySelect.addEventListener('change', (e) => {
        size = parseInt(e.target.value);
        if(playing) generateBoardUI(); // Just change UI if already playing
    });
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        darkModeToggle.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.textContent = '☀️';
    }
}

// Generates a random color for the ON lights safely
function shiftPalette() {
    const hue = Math.floor(Math.random() * 360);
    document.documentElement.style.setProperty('--light-on', `hsl(${hue}, 100%, 50%)`);
    document.documentElement.style.setProperty('--light-on-glow', `hsla(${hue}, 100%, 50%, 0.6)`);
}

function updateScoreUI() {
    p1ScoreEl.textContent = p1Score;
    p2ScoreEl.textContent = p2Score;
    
    if (currentPlayer === 1) {
        p1BoxEl.classList.add('active-player');
        p2BoxEl.classList.remove('active-player');
    } else {
        p2BoxEl.classList.add('active-player');
        p1BoxEl.classList.remove('active-player');
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Starts the timer and the gameplay for the current player
function startActiveTurn() {
    turnOverlayEl.classList.add('hidden');
    winMessageEl.classList.add('hidden');
    resetBtn.classList.remove('hidden');
    
    timeLeft = TURN_TIME_SECONDS;
    timeLeftEl.textContent = formatTime(timeLeft);
    updateScoreUI();
    
    // Start interval
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftEl.textContent = formatTime(timeLeft);
        
        if (timeLeft <= 0) {
            handleTurnEnd();
        }
    }, 1000);
    
    playing = true;
    generateBoardUI();
}

function handleTurnEnd() {
    clearInterval(timerInterval);
    playing = false;
    boardEl.classList.add('hidden');
    
    if (currentPlayer === 1) {
        currentPlayer = 2;
        turnOverlayEl.classList.remove('hidden');
        document.getElementById('turn-text').textContent = "Player 2 Ready";
        updateScoreUI();
    } else {
        // Match over
        winMessageEl.classList.remove('hidden');
        resetBtn.classList.add('hidden');
        document.getElementById('winner-text').textContent = "Match Over!";
        
        let subtext = "";
        if (p1Score > p2Score) subtext = `Player 1 wins! (${p1Score} to ${p2Score})`;
        else if (p2Score > p1Score) subtext = `Player 2 wins! (${p2Score} to ${p1Score})`;
        else subtext = `It's a Tie! (${p1Score} points each)`;
        
        document.getElementById('winner-subtext').textContent = subtext;
        
        const playAgainBtn = document.createElement('button');
        playAgainBtn.className = "btn primary-btn mt-main";
        playAgainBtn.textContent = "Play Again";
        playAgainBtn.onclick = () => location.reload();
        
        // Remove old button if exists so we don't duplicate
        const oldBtn = winMessageEl.querySelector('button');
        if(oldBtn) oldBtn.remove();
        
        winMessageEl.appendChild(playAgainBtn);
    }
}

function generateBoardUI() {
    moves = 0;
    updateMoveCounter();
    boardEl.classList.remove('hidden');
    
    board = Array(size).fill().map(() => Array(size).fill(false));
    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardEl.innerHTML = '';
    
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const light = document.createElement('button');
            light.classList.add('light');
            light.ariaLabel = `Light ${r + 1}, ${c + 1}`;
            light.addEventListener('click', () => handleLightClick(r, c));
            boardEl.appendChild(light);
        }
    }
    
    // Generate solvable board
    const clicksToSimulate = size * size * 1.5;
    for (let i = 0; i < clicksToSimulate; i++) {
        toggleLights(Math.floor(Math.random() * size), Math.floor(Math.random() * size));
    }
    
    if (checkWin(false)) toggleLights(0, 0);
    renderBoard();
}

function handleLightClick(r, c) {
    if (!playing) return;
    playToggleSound();
    toggleLights(r, c);
    
    moves++;
    updateMoveCounter();
    renderBoard();
    
    checkWin(true);
}

function toggleLights(r, c) {
    const directions = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
    directions.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            board[nr][nc] = !board[nr][nc];
        }
    });
}

function renderBoard() {
    const lights = boardEl.children;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const index = r * size + c;
            if (board[r][c]) lights[index].classList.add('on');
            else lights[index].classList.remove('on');
        }
    }
}

function updateMoveCounter() {
    moveCounterEl.textContent = moves;
}

function checkWin(grantPoints) {
    let allOff = true;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c]) { allOff = false; break; }
        }
    }
    
    if (allOff && grantPoints) {
        playWinSound();
        shiftPalette(); // Change colors!
        
        if (currentPlayer === 1) p1Score++;
        else p2Score++;
        
        updateScoreUI();
        
        // Brief delay before immediately popping the next board
        playing = false; // pause interaction temporarily
        setTimeout(() => {
            if(timeLeft > 0) {
                playing = true;
                generateBoardUI();
            }
        }, 500); 
    }
    
    return allOff;
}

window.addEventListener('load', init);
