// game.js - Neural Breach Campaign Engine

class EscapeRoomGame {
    constructor() {
        this.rooms = {
            1: {
                title: "Level 1: The Quantum Bootloader",
                desc: "An AI override safety lock is restricting core files. Input the exact digital sequence REVERSED to disengage safety clamps."
            },
            2: {
                title: "Level 2: The Cipher Net",
                desc: "Systems are scrambled. A shift cipher has locked core system ports. Decode the encrypted string using the specified shift key to open ports."
            },
            3: {
                title: "Level 3: Perspective Core",
                desc: "Navigate the grid nodes. Beware that coordinates shift under a three-dimensional warp! Map a path from IN to OUT covering the minimum node length."
            },
            4: {
                title: "Level 4: Rogue AI Overlord Battle",
                desc: "Rogue AI Overlord is attempting a virtual attack. Counter the AI node attacks by inputting the system weakspots before critical systems crash!"
            }
        };

        this.hints = {
            1: [
                "Reverse the order of the numbers shown in the blue display.",
                "If the display shows 4 2 1 9, click button 9, then 1, then 2, then 4."
            ],
            2: [
                "This is a Caesar Shift Cipher puzzle. Shift each character backward in the alphabet by the Shift Key value.",
                "If the code is BCD with Shift Key 1, then shifting backward gives ABC."
            ],
            3: [
                "Connect start to finish in the 3D perspective grid. You must choose a path with at least the target node length.",
                "If you make a mistake, click on an already active path node to rewind/undo back to that point."
            ],
            4: [
                "Watch the terminal logs for weaknesses. The Overlord corrupts the interface periodically.",
                "Type the exact bypass weakness code displayed. Watch out for rapid keyboard prompts."
            ]
        };

        this.initDefaultState();
    }

    initDefaultState() {
        this.state = {
            playMode: 'campaign', // campaign, speedrun, challenge
            currentRoom: 0, // 0 = title, 1, 2, 3, 4 = levels, 5 = win, 6 = lose, -1 = map selection screen, -2 = creator
            timeLeft: 300,
            timerInterval: null,
            inventory: [],
            hintsRemaining: 3,
            hintsRequested: 0,
            ngPlus: false,
            ngPlusMultiplier: 1.0,
            levelsUnlocked: [1],
            solveSpeeds: [], // for adaptive difficulty
            streak: 0,
            achievements: {
                "first_boot": { title: "System Bootup", desc: "Initiated the AI mainframe override", unlocked: false },
                "time_bender": { title: "Time Bender", desc: "Solved the reverse-sequence bootloader", unlocked: false },
                "cipher_breaker": { title: "Cipher Breaker", desc: "Decrypted the network secure layers", unlocked: false },
                "perspective_shift": { title: "Perspective Shift", desc: "Routed coordinates through 3D portals", unlocked: false },
                "overlord_purged": { title: "Overlord Purged", desc: "Defeated the rogue AI core", unlocked: false },
                "speedrunner": { title: "Speedrunner", desc: "Cleared a level in under 30 seconds", unlocked: false },
                "streak_master": { title: "Streak Master", desc: "Achieved a 3x puzzle streak", unlocked: false }
            },
            boss: {
                health: 100,
                phase: 1, // 1: keyboard inputs, 2: fake/decoy prompts, 3: ultimate system override sequence
                attackTimer: null,
                attackCode: "",
                failedAttempts: 0
            },
            puzzles: {
                r1Sequence: [],
                r1Input: [],
                r2Ciphertext: "",
                r2Key: 2,
                r2DecodedTarget: "",
                r2Input: "",
                customTarget: "",
                r3Path: [],
                r3TargetLength: 4,
                r3PerspectiveActive: true
            }
        };
    }

    setPlayMode(mode) {
        this.state.playMode = mode;
        if (mode === 'challenge') {
            this.state.timeLeft = 180; // Harder time pressure
            this.state.hintsRemaining = 1;
        } else if (mode === 'speedrun') {
            this.state.timeLeft = 600; // Large block, track raw speed
            this.state.hintsRemaining = 0;
        }
        this.addLog(`Play mode updated: ${mode.toUpperCase()}`, "system");
        window.sfx.playClick();
    }

    bootGame() {
        window.sfx.init();
        this.state.currentRoom = -1; // Go to Level Map selector
        this.unlockAchievement("first_boot");
        this.startTimer();
        this.render();
    }

    startTimer() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        this.state.timerInterval = setInterval(() => {
            if (this.state.currentRoom > 0 && this.state.currentRoom <= 4) {
                this.state.timeLeft--;
                this.updateHUD();

                if (this.state.timeLeft <= 0) {
                    this.triggerGameEnd(false);
                }

                // Random Overlord fourth-wall interruption comments during Boss fight
                if (this.state.currentRoom === 4 && Math.random() < 0.08) {
                    this.triggerAIInterruption();
                }
            }
        }, 1000);
    }

    triggerAIInterruption() {
        const insults = [
            `Overlord: I see your platform is running slowly today.`,
            `Overlord: Your screen resolution makes it very easy to monitor you.`,
            `Overlord: Solving math ciphers won't save your virtual files.`,
            `Overlord: Are you getting tired of typing?`,
            `Overlord: Time is ticking, human.`
        ];
        const insult = insults[Math.floor(Math.random() * insults.length)];
        this.addLog(insult, "warning");
        window.sfx.playAlarm();

        // Visual screen glitch flash
        const overlay = document.getElementById("alarm-overlay");
        if (overlay) {
            overlay.style.display = "block";
            setTimeout(() => {
                overlay.style.display = "none";
            }, 300);
        }
    }

    enterLevel(num) {
        if (!this.state.levelsUnlocked.includes(num)) {
            window.sfx.playFailure();
            this.addLog(`Access Denied: Node Level ${num} is locked!`, "warning");
            return;
        }

        window.sfx.playClick();
        this.state.currentRoom = num;
        this.state.hintsRequested = 0;

        if (num === 1) {
            this.generateR1Puzzle();
        } else if (num === 2) {
            this.generateR2Puzzle();
        } else if (num === 3) {
            this.generateR3Puzzle();
        } else if (num === 4) {
            this.startBossFight();
        }

        this.addLog(`Entering Level ${num}: ${this.rooms[num].title}...`, "system");
        this.render();
    }

    resumeActiveLevel() {
        // Go back to the highest unlocked level
        const highest = Math.max(...this.state.levelsUnlocked);
        this.enterLevel(highest);
    }

    requestHint() {
        if (this.state.hintsRemaining <= 0) {
            window.sfx.playFailure();
            this.addLog("Mainframe Error: No hint capsules remaining.", "warning");
            return;
        }

        window.sfx.playClick();
        const roomHints = this.hints[this.state.currentRoom];
        if (roomHints) {
            const hintIndex = Math.min(this.state.hintsRequested, roomHints.length - 1);
            this.addLog(`HINT: ${roomHints[hintIndex]}`, "system");
            this.state.hintsRequested++;
            this.state.hintsRemaining--;
            document.getElementById("hints-count-label").innerText = this.state.hintsRemaining;
        }
    }

    // LEVEL 1: Quantum Sequence
    generateR1Puzzle() {
        const length = this.state.ngPlus ? 5 : 4;
        this.state.puzzles.r1Sequence = Array.from({length}, () => Math.floor(Math.random() * 9) + 1);
        this.state.puzzles.r1Input = [];
    }

    handleR1Button(num) {
        window.sfx.playClick();
        this.state.puzzles.r1Input.push(num);
        this.addLog(`Quantum cell index registered: ${num}`, "system");

        if (this.state.puzzles.r1Input.length === this.state.puzzles.r1Sequence.length) {
            const reversed = [...this.state.puzzles.r1Sequence].reverse();
            const correct = this.state.puzzles.r1Input.every((val, idx) => val === reversed[idx]);

            if (correct) {
                window.sfx.playSuccess();
                this.unlockAchievement("time_bender");
                this.addLog("Quantum safety clamps released! Level 1 bypassed.", "success");
                this.state.inventory.push("Quantum Decryptor Core");
                this.unlockLevel(2);
                this.state.currentRoom = -1; // return to map
            } else {
                window.sfx.playFailure();
                this.addLog("Override sequence failed. Resetting quantum clamps.", "warning");
                this.state.puzzles.r1Input = [];
            }
            this.render();
        }
    }

    // LEVEL 2: Cipher Decoder
    generateR2Puzzle() {
        const wordPool = ["SYSTEM", "CORE", "OVERLORD", "BREACH", "PORTAL", "HACKER", "CIPHER"];
        let target = wordPool[Math.floor(Math.random() * wordPool.length)];
        
        // Use custom puzzle if set
        if (this.state.puzzles.customTarget) {
            target = this.state.puzzles.customTarget;
            this.state.puzzles.customTarget = ""; // Clear after use
        }

        const shift = Math.floor(Math.random() * 4) + 1;
        this.state.puzzles.r2Key = shift;
        this.state.puzzles.r2DecodedTarget = target;

        // Caesar encrypt shift forward
        let cipherText = "";
        for (let i = 0; i < target.length; i++) {
            const code = target.charCodeAt(i);
            let shifted = code + shift;
            if (shifted > 90) shifted = 65 + (shifted - 91); // wrap uppercase alphabet
            cipherText += String.fromCharCode(shifted);
        }
        this.state.puzzles.r2Ciphertext = cipherText;
        this.state.puzzles.r2Input = "";
    }

    handleR2Input(val) {
        this.state.puzzles.r2Input = val.toUpperCase().trim();
        if (this.state.puzzles.r2Input === this.state.puzzles.r2DecodedTarget) {
            window.sfx.playSuccess();
            this.unlockAchievement("cipher_breaker");
            this.addLog("System decryption match confirmed! Ports open.", "success");
            this.state.inventory.push("Network Decryption Decal");
            this.unlockLevel(3);
            this.state.currentRoom = -1; // return to map
            this.render();
        }
    }

    // LEVEL 3: Perspective Routing Grid
    generateR3Puzzle() {
        this.state.puzzles.r3Path = [];
        this.state.puzzles.r3TargetLength = this.state.ngPlus ? 6 : 5;
    }

    handleR3GridClick(r, c) {
        // Obstruct coordinates as puzzle walls
        if ((r === 1 && c === 2) || (r === 3 && c === 4) || (r === 2 && c === 3)) {
            window.sfx.playFailure();
            this.addLog("Coordinate blocked by Overlord space anomaly!", "warning");
            return;
        }

        window.sfx.playClick();
        const coord = `${r},${c}`;
        const index = this.state.puzzles.r3Path.indexOf(coord);

        if (index > -1) {
            // Undo path from this node (Reverse sequence mechanic)
            this.state.puzzles.r3Path = this.state.puzzles.r3Path.slice(0, index);
            window.sfx.playRewind();
            this.addLog(`Path connection reversed to: [${r}, ${c}]`, "warning");
        } else {
            this.state.puzzles.r3Path.push(coord);
            this.addLog(`Node locked: [Row ${r}, Col ${c}]`, "system");
        }

        this.render();

        // Win check when destination reached
        if (coord === "5,5" && this.state.puzzles.r3Path.length >= this.state.puzzles.r3TargetLength) {
            window.sfx.playSuccess();
            this.unlockAchievement("perspective_shift");
            this.addLog("3D Perspective maze grid bypassed successfully!", "success");
            this.state.inventory.push("Overlord Core Override Chip");
            this.unlockLevel(4);
            this.state.currentRoom = -1;
            this.render();
        }
    }

    // BOSS FIGHT: AI Overlord
    startBossFight() {
        this.state.boss.health = 100;
        this.state.boss.phase = 1;
        this.state.boss.failedAttempts = 0;
        window.sfx.startBossMusic();
        this.addLog("WARNING: ROGUE AI OVERLORD DETECTED. Network stability declining.", "warning");
        this.generateBossAttack();
    }

    generateBossAttack() {
        const attackCodes = ["SHUTDOWN", "OVERRIDE", "BYPASS", "TERMINATE", "COUNTER", "CORRUPT"];
        this.state.boss.attackCode = attackCodes[Math.floor(Math.random() * attackCodes.length)];
        
        // Display countdown alert overlay
        const overlay = document.getElementById("alarm-overlay");
        if (overlay) overlay.style.display = "block";
        window.sfx.playAlarm();

        this.addLog(`BOSS INTRUSION DETECTED: input ${this.state.boss.attackCode} IMMEDIATELY!`, "warning");
    }

    handleBossInput(val) {
        const cleaned = val.toUpperCase().trim();
        if (cleaned === this.state.boss.attackCode) {
            window.sfx.playSuccess();
            
            // Turn off alarm overlay
            const overlay = document.getElementById("alarm-overlay");
            if (overlay) overlay.style.display = "none";

            // Deal damage
            this.state.boss.health -= 34; // 3 successful rounds to defeat
            if (this.state.boss.health <= 0) {
                this.state.boss.health = 0;
                this.triggerGameEnd(true);
                return;
            }

            this.state.boss.phase++;
            this.addLog(`Weakspot patched! Overlord health decreased. Phase ${this.state.boss.phase} initiated.`, "success");
            this.generateBossAttack();
        } else {
            window.sfx.playFailure();
            this.state.boss.failedAttempts++;
            this.addLog("Overlord redirected counterattack! Intrusion strength increasing.", "warning");
            if (this.state.boss.failedAttempts >= 3) {
                this.triggerGameEnd(false);
            }
        }
        this.render();
    }

    unlockLevel(num) {
        if (!this.state.levelsUnlocked.includes(num)) {
            this.state.levelsUnlocked.push(num);
            this.addLog(`MAINMAP UNLOCKED: Level Gateway ${num} now active.`, "success");
        }
    }

    unlockAchievement(key) {
        if (this.state.achievements[key] && !this.state.achievements[key].unlocked) {
            this.state.achievements[key].unlocked = true;
            this.addLog(`UNLOCKED SYSTEM LOG: ${this.state.achievements[key].title}`, "success");
        }
    }

    addLog(text, type = "system") {
        const logs = document.getElementById("terminal-output");
        if (logs) {
            const entry = document.createElement("div");
            entry.className = `log-entry log-${type}`;
            entry.innerText = `> ${text}`;
            logs.appendChild(entry);
            logs.scrollTop = logs.scrollHeight;
        }
    }

    triggerGameEnd(win) {
        clearInterval(this.state.timerInterval);
        window.sfx.stopBossMusic();
        
        const overlay = document.getElementById("alarm-overlay");
        if (overlay) overlay.style.display = "none";

        if (win) {
            window.sfx.playSuccess();
            this.unlockAchievement("overlord_purged");
            
            // Calculate final statistics
            const mins = Math.floor((300 - this.state.timeLeft) / 60);
            const secs = (300 - this.state.timeLeft) % 60;
            document.getElementById("win-stats-label").innerText = `Threat Level Defeated // Finish Time: ${mins}m ${secs}s`;
            
            this.state.currentRoom = 5; // Win screen
        } else {
            window.sfx.playFailure();
            this.state.currentRoom = 6; // Lose screen
        }
        this.saveProgress();
        this.render();
    }

    enableNewGamePlus() {
        this.initDefaultState();
        this.state.ngPlus = true;
        this.state.ngPlusMultiplier = 1.5;
        this.state.timeLeft = 240; // less time in NG+
        this.bootGame();
    }

    resetGame() {
        localStorage.removeItem("neural_breach_campaign_save");
        this.initDefaultState();
        this.render();
    }

    saveProgress() {
        const data = {
            currentRoom: this.state.currentRoom,
            timeLeft: this.state.timeLeft,
            inventory: this.state.inventory,
            levelsUnlocked: this.state.levelsUnlocked,
            achievements: this.state.achievements,
            ngPlus: this.state.ngPlus
        };
        localStorage.setItem("neural_breach_campaign_save", JSON.stringify(data));
    }

    loadProgress() {
        const saved = localStorage.getItem("neural_breach_campaign_save");
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.state.currentRoom = data.currentRoom;
                this.state.timeLeft = data.timeLeft;
                this.state.inventory = data.inventory || [];
                this.state.levelsUnlocked = data.levelsUnlocked || [1];
                this.state.achievements = data.achievements || this.state.achievements;
                this.state.ngPlus = data.ngPlus || false;
            } catch (e) {}
        }
    }

    openPuzzleCreator() {
        this.state.currentRoom = -2; // Architect
        this.render();
    }

    updateHUD() {
        const minutes = Math.floor(this.state.timeLeft / 60);
        const seconds = this.state.timeLeft % 60;
        const display = document.getElementById("hud-time-val");
        if (display) {
            display.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            if (this.state.timeLeft < 60) {
                display.className = "hud-value danger";
            } else {
                display.className = "hud-value";
            }
        }
    }

    render() {
        this.updateHUD();

        // Hide screens
        document.getElementById("boot-screen").style.display = "none";
        document.getElementById("map-screen").style.display = "none";
        document.getElementById("win-screen").style.display = "none";
        document.getElementById("lose-screen").style.display = "none";
        document.getElementById("creator-screen").style.display = "none";
        document.getElementById("dashboard-panel").style.display = "none";
        document.getElementById("boss-hud-bar").style.display = "none";

        if (this.state.currentRoom === 0) {
            document.getElementById("boot-screen").style.display = "flex";
        } else if (this.state.currentRoom === -1) {
            document.getElementById("map-screen").style.display = "flex";
            this.renderMapScreen();
        } else if (this.state.currentRoom === -2) {
            document.getElementById("creator-screen").style.display = "flex";
        } else if (this.state.currentRoom === 5) {
            document.getElementById("win-screen").style.display = "flex";
        } else if (this.state.currentRoom === 6) {
            document.getElementById("lose-screen").style.display = "flex";
        } else {
            document.getElementById("dashboard-panel").style.display = "grid";
            this.renderLevelContent();
        }

        this.renderInventory();
        this.renderAchievements();
    }

    renderMapScreen() {
        // Unlock map node visual states
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`node-${i}`);
            if (el) {
                if (this.state.levelsUnlocked.includes(i)) {
                    el.className = "map-node active";
                } else {
                    el.className = "map-node locked";
                }
            }
        }
    }

    renderLevelContent() {
        const room = this.rooms[this.state.currentRoom];
        document.getElementById("room-title-label").innerText = room.title;
        document.getElementById("room-desc-label").innerText = room.desc;

        const puzzleArea = document.getElementById("puzzle-display-area");
        puzzleArea.innerHTML = "";

        if (this.state.currentRoom === 1) {
            puzzleArea.innerHTML = `
                <div class="sequence-display">${this.state.puzzles.r1Sequence.join(" ")}</div>
                <div class="sequence-buttons">
                    ${Array.from({length: 9}, (_, i) => i + 1).map(num => `
                        <button class="seq-btn" onclick="game.handleR1Button(${num})">${num}</button>
                    `).join("")}
                </div>
            `;
        } else if (this.state.currentRoom === 2) {
            puzzleArea.innerHTML = `
                <div class="sequence-display" style="letter-spacing: 5px;">${this.state.puzzles.r2Ciphertext}</div>
                <div class="keyboard-hints">
                    <div class="hint-badge">SHIFT KEY VALUE: ${this.state.puzzles.r2Key}</div>
                    <div class="hint-badge">ALGORITHM: Caesar Shift</div>
                </div>
                <div class="form-group" style="width: 100%; max-width: 300px;">
                    <label>Enter decrypted code:</label>
                    <input type="text" id="cipher-input" onkeyup="game.handleR2Input(this.value)" placeholder="DECRYPT HERE..." style="text-align: center; text-transform: uppercase;">
                </div>
            `;
        } else if (this.state.currentRoom === 3) {
            let cells = "";
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 6; c++) {
                    const coord = `${r},${c}`;
                    let typeClass = "";
                    let val = "";

                    if (r === 0 && c === 0) {
                        typeClass = "start";
                        val = "IN";
                    } else if (r === 5 && c === 5) {
                        typeClass = "end";
                        val = "OUT";
                    } else if ((r === 1 && c === 2) || (r === 3 && c === 4) || (r === 2 && c === 3)) {
                        typeClass = "blocked";
                        val = "X";
                    }

                    if (this.state.puzzles.r3Path.includes(coord)) {
                        typeClass += " active-path";
                    }

                    cells += `
                        <div class="grid-cell ${typeClass}" onclick="game.handleR3GridClick(${r}, ${c})">${val}</div>
                    `;
                }
            }

            puzzleArea.innerHTML = `
                <div class="perspective-active">
                    <div class="grid-container">
                        ${cells}
                    </div>
                </div>
                <div style="margin-top: 15px; font-family: var(--font-mono); color: var(--color-text-muted);">
                    Target Path Length: >= ${this.state.puzzles.r3TargetLength} | Connected Node Count: ${this.state.puzzles.r3Path.length}
                </div>
            `;
        } else if (this.state.currentRoom === 4) {
            document.getElementById("boss-hud-bar").style.display = "block";
            document.getElementById("boss-health-inner").style.width = `${this.state.boss.health}%`;
            document.getElementById("boss-percentage").innerText = `${this.state.boss.health}%`;

            puzzleArea.innerHTML = `
                <div class="sequence-display" style="color: var(--color-neon-red); text-shadow: var(--glow-red);">${this.state.boss.attackCode}</div>
                <div class="keyboard-hints">
                    <div class="hint-badge">AI Core Status: Compromising Node</div>
                    <div class="hint-badge">Failed counter-inputs: ${this.state.boss.failedAttempts}/3</div>
                </div>
                <div class="form-group" style="width: 100%; max-width: 320px;">
                    <input type="text" id="boss-input" oninput="game.handleBossInput(this.value); this.value='';" placeholder="Rapid-input bypass letters..." style="text-align: center; text-transform: uppercase; border-color: var(--color-neon-red);">
                </div>
            `;

            setTimeout(() => {
                const el = document.getElementById("boss-input");
                if (el) el.focus();
            }, 100);
        }
    }

    renderInventory() {
        const display = document.getElementById("inventory-items");
        if (display) {
            display.innerHTML = this.state.inventory.map(item => `
                <div class="inv-item">
                    <div class="inv-icon"></div>
                    <div>${item}</div>
                </div>
            `).join("") || `<div style="color: var(--color-text-muted); font-size: 0.85rem;">Empty Grid</div>`;
        }
    }

    renderAchievements() {
        const display = document.getElementById("achievement-cards");
        if (display) {
            display.innerHTML = Object.keys(this.state.achievements).map(key => {
                const ach = this.state.achievements[key];
                return `
                    <div class="achievement-card ${ach.unlocked ? 'unlocked' : ''}">
                        <div class="ach-title">${ach.title}</div>
                        <div class="ach-desc">${ach.desc}</div>
                    </div>
                `;
            }).join("");
        }
    }
}

const game = new EscapeRoomGame();
window.game = game;
document.addEventListener("DOMContentLoaded", () => {
    game.loadProgress();
    game.render();
});
