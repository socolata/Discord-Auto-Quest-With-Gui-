(async () => {
    let isRunning = false;
    let isMinimized = false;

    // --- GUI CSS ---
    const style = document.createElement('style');
    style.id = 'socolata-quest-styles';
    style.innerHTML = `
        #socolata-quest-master {
            position: fixed; top: 100px; left: 100px; z-index: 10000;
            background: #2f3136; color: white; border-radius: 12px; 
            border: 1px solid #5865f2; font-family: 'gg sans', sans-serif; 
            width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.9);
            user-select: none;
        }
        .gui-header { 
            font-size: 13px; font-weight: bold; background: #5865f2; 
            padding: 10px 15px; border-radius: 10px 10px 0 0; 
            display: flex; justify-content: space-between; align-items: center; cursor: move; 
        }
        .header-controls { display: flex; gap: 12px; }
        .win-btn { background: none; border: none; color: white; font-size: 18px; cursor: pointer; }
        .win-btn:hover { color: #faa61a; }
        
        #socolata-body { padding: 15px; background: #2f3136; border-radius: 0 0 12px 12px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .stat-card { background: #202225; padding: 8px; border-radius: 6px; border: 1px solid #444; text-align: center; }
        .stat-label { font-size: 9px; color: #b9bbbe; text-transform: uppercase; display: block; }
        .stat-value { font-size: 14px; font-weight: bold; color: #faa61a; }

        .gui-button { 
            width: 100%; padding: 12px; margin: 5px 0; border: none; 
            border-radius: 5px; cursor: pointer; font-weight: bold; text-transform: uppercase; font-size: 12px;
        }
        .btn-run { background: #43b581; color: white; }
        .btn-stop { background: #f04747; color: white; }

        .gui-console { 
            background: #000; color: #43b581; font-family: monospace; 
            font-size: 10px; padding: 10px; border-radius: 5px; 
            height: 140px; overflow-y: auto; margin-top: 10px; border: 1px solid #333;
        }
        .footer-brand { font-size: 9px; text-align: center; margin-top: 8px; color: #72767d; font-style: italic; }
    `;
    document.head.appendChild(style);

    // --- GUI Structure ---
    const gui = document.createElement('div');
    gui.id = 'socolata-quest-master';
    gui.innerHTML = `
        <div class="gui-header" id="socolata-drag">
            <span>SOCOLATA QUEST MASTER</span>
            <div class="header-controls">
                <button class="win-btn" id="socolata-min">_</button>
                <button class="win-btn" id="socolata-close">×</button>
            </div>
        </div>
        <div id="socolata-body">
            <div class="stats-grid">
                <div class="stat-card"><span class="stat-label">Time Remaining</span><span class="stat-value" id="soco-timer">--:--</span></div>
                <div class="stat-card"><span class="stat-label">Potential Orbs</span><span class="stat-value" id="soco-orbs">0</span></div>
                <div class="stat-card"><span class="stat-label">Completed</span><span class="stat-value" id="soco-comp">0</span></div>
                <div class="stat-card"><span class="stat-label">Pending</span><span class="stat-value" id="soco-rem">0</span></div>
            </div>
            <button id="soco-run" class="gui-button btn-run">Initialize Engine</button>
            <button id="soco-stop" class="gui-button btn-stop">Emergency Stop</button>
            <div id="soco-log" class="gui-console">Authorized access only. Ready.</div>
            <div class="footer-brand">Powered by Socolata Logic</div>
        </div>
    `;
    document.body.appendChild(gui);

    const log = (msg, col = "#43b581") => {
        const l = document.getElementById('soco-log');
        if (l) {
            l.innerHTML += `<div>> <span style="color:${col}">${msg}</span></div>`;
            l.scrollTop = l.scrollHeight;
        }
    };

    // --- Controls & Dragging ---
    document.getElementById('socolata-min').onclick = () => {
        isMinimized = !isMinimized;
        document.getElementById('socolata-body').style.display = isMinimized ? 'none' : 'block';
        gui.style.width = isMinimized ? '220px' : '380px';
    };
    document.getElementById('socolata-close').onclick = () => { isRunning = false; gui.remove(); style.remove(); };
    document.getElementById('soco-stop').onclick = () => { isRunning = false; log("Process Terminated.", "#f04747"); };

    let offset = [0,0], isDown = false;
    document.getElementById('socolata-drag').onmousedown = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDown = true; offset = [gui.offsetLeft - e.clientX, gui.offsetTop - e.clientY];
    };
    document.onmouseup = () => isDown = false;
    document.onmousemove = (e) => { if (isDown) { gui.style.left = (e.clientX + offset[0]) + 'px'; gui.style.top = (e.clientY + offset[1]) + 'px'; } };

    // --- Core Engine ---
    const runEngine = async () => {
        if (isRunning) return;
        isRunning = true;
        log("Socolata Engine Initializing...");

        try {
            let wp = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]); webpackChunkdiscord_app.pop();
            const findM = (f) => Object.values(wp.c).find(x => x?.exports?.Z && f(x.exports.Z))?.exports.Z || Object.values(wp.c).find(x => x?.exports?.ZP && f(x.exports.ZP))?.exports.ZP;
            let QuestsStore = findM(m => m.__proto__?.getQuest);
            let api = Object.values(wp.c).find(x => x?.exports?.tn?.post)?.exports.tn;

            const allQuests = [...QuestsStore.quests.values()];
            const targets = allQuests.filter(x => !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now());
            
            document.getElementById('soco-rem').innerText = targets.length;
            document.getElementById('soco-comp').innerText = allQuests.filter(x => x.userStatus?.completedAt).length;
            
            let potentialOrbs = 0;
            targets.forEach(q => {
                const orbReward = q.config.rewardsConfig?.rewards?.find(r => r.skuId === "1258133503027974246");
                if (orbReward) potentialOrbs += orbReward.amount;
            });
            document.getElementById('soco-orbs').innerText = potentialOrbs;

            if (targets.length === 0) { log("No active targets detected.", "#faa61a"); isRunning = false; return; }

            const updateTimer = (seconds) => {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                document.getElementById('soco-timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
            };

            const handleQuest = async (q) => {
                const name = q.config.messages.questName;
                if (!q.userStatus?.enrolledAt) await api.post({ url: `/quests/${q.id}/enroll` });

                const taskKey = q.config.taskConfigV2 ? Object.keys(q.config.taskConfigV2.tasks)[0] : Object.keys(q.config.taskConfig.tasks)[0];
                const target = (q.config.taskConfigV2 || q.config.taskConfig).tasks[taskKey].target;
                let current = q.userStatus?.progress?.[taskKey]?.value || 0;

                while (current < target && isRunning) {
                    const isVideo = taskKey.includes("VIDEO");
                    const res = await api.post({
                        url: `/quests/${q.id}/${isVideo ? 'video-progress' : 'heartbeat'}`,
                        body: isVideo ? { timestamp: Math.min(target, current + 15) } : { stream_key: 'call:0:0', terminal: false }
                    });

                    if (res.status === 429) {
                        const wait = (res.body.retry_after || 5) + 1;
                        log(`Rate limit - Resting ${wait}s`, "#faa61a");
                        await new Promise(r => setTimeout(r, wait * 1000));
                        continue;
                    }

                    current = isVideo ? Math.min(target, current + 15) : res.body.progress[taskKey].value;
                    let remainingSteps = (target - current) / (isVideo ? 15 : 1); 
                    updateTimer(Math.floor(remainingSteps * (isVideo ? 0.6 : 10)));

                    log(`${name}: ${Math.floor((current/target)*100)}%`);
                    await new Promise(r => setTimeout(r, isVideo ? 600 : 10000));
                }
                
                if (isRunning) {
                    document.getElementById('soco-comp').innerText = parseInt(document.getElementById('soco-comp').innerText) + 1;
                    document.getElementById('soco-rem').innerText = parseInt(document.getElementById('soco-rem').innerText) - 1;
                    log(`Target Neutralized: ${name}`, "#5865f2");
                }
            };

            await Promise.all(targets.map(q => handleQuest(q)));
            log("All operations successful!", "#faa61a");
            document.getElementById('soco-timer').innerText = "00:00";
        } catch (e) { log("System Error: " + e.message, "#f04747"); }
        isRunning = false;
    };

    document.getElementById('soco-run').onclick = runEngine;
})();
