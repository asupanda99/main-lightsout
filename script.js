// --- Game State ---
let size = 5;
let moves = 0;
let playing = false;
let board = []; // 2D array of booleans (true = ON, false = OFF)

// --- Audio Context for simple sounds ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playToggleSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Quick pop sound
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
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C arpeggio
    let startTime = audioCtx.currentTime;
    
    notes.forEach((note, index) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = note;
        
        gainNode.gain.setValueAtTime(0, startTime + index * 0.15);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + index * 0.15 + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + index * 0.15 + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(startTime + index * 0.15);
        oscillator.stop(startTime + index * 0.15 + 0.15);
    });
}

// --- DOM Elements ---
const boardEl = document.getElementById('game-board');
const moveCounterEl = document.getElementById('move-counter');
const winMessageEl = document.getElementById('win-message');
const difficultySelect = document.getElementById('difficulty');
const resetBtn = document.getElementById('reset-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// --- Initialization ---
function init() {
    // Setup Dark Mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.textContent = '☀️';
    }
    
    setupEventListeners();
    startNewGame();
}

function setupEventListeners() {
    resetBtn.addEventListener('click', startNewGame);
    
    difficultySelect.addEventListener('change', (e) => {
        size = parseInt(e.target.value);
        startNewGame();
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

function startNewGame() {
    playing = true;
    moves = 0;
    updateMoveCounter();
    winMessageEl.classList.add('hidden');
    boardEl.classList.remove('hidden');
    
    // Create logical board containing all false initially
    board = Array(size).fill().map(() => Array(size).fill(false));
    
    // Configure CSS Grid layout strictly for dynamic dimension
    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardEl.innerHTML = '';
    
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const light = document.createElement('button');
            light.classList.add('light');
            light.ariaLabel = `Light at row ${r + 1}, column ${c + 1}`;
            light.addEventListener('click', () => handleLightClick(r, c));
            boardEl.appendChild(light);
        }
    }
    
    // Generate solvable random board
    // Randomly click lights backwards starting from solved state
    const clicksToSimulate = size * size * 1.5;
    for (let i = 0; i < clicksToSimulate; i++) {
        const randomRow = Math.floor(Math.random() * size);
        const randomCol = Math.floor(Math.random() * size);
        toggleLights(randomRow, randomCol);
    }
    
    // Failsafe in case the random touches turn off everything
    if (checkWin(false)) {
        toggleLights(0, 0);
    }
    
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
    // Top, bottom, left, right, current
    const directions = [
        [0, 0],   // center
        [-1, 0],  // top
        [1, 0],   // bottom
        [0, -1],  // left
        [0, 1]    // right
    ];
    
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
            if (board[r][c]) {
                lights[index].classList.add('on');
            } else {
                lights[index].classList.remove('on');
            }
        }
    }
}

function updateMoveCounter() {
    moveCounterEl.textContent = moves;
}

function checkWin(endGameIfWon) {
    let allOff = true;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c]) {
                allOff = false;
                break;
            }
        }
        if (!allOff) break;
    }
    
    if (allOff && endGameIfWon) {
        playing = false;
        playWinSound();
        setTimeout(() => {
            boardEl.classList.add('hidden');
            winMessageEl.classList.remove('hidden');
        }, 400); // Small delay to let final CSS animation finish
    }
    
    return allOff;
}

// Start Game on page load
window.addEventListener('load', init);
