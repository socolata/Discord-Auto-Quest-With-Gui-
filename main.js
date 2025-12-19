(async () => {
    let isRunning = false;
    let isMinimized = false;

    if (document.getElementById('socolata-quest-master')) document.getElementById('socolata-quest-master').remove();
    
    const style = document.createElement('style');
    style.id = 'socolata-v3-0-style';
    style.innerHTML = `
        #socolata-quest-master {
            position: fixed; top: 100px; left: 100px; z-index: 999999;
            background: #2f3136; color: white; border-radius: 12px; 
            border: 1px solid #5865f2; font-family: 'gg sans', sans-serif; 
            width: 380px; height: 350px; display: flex; flex-direction: column;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); resize: both; overflow: auto;
        }
        #socolata-quest-master.minimized {
            width: 55px !important; height: 55px !important; border-radius: 50%;
            cursor: pointer; justify-content: center; align-items: center; resize: none; overflow: hidden;
            background: #5865f2; border: 2px solid white;
        }
        .gui-header { font-size: 13px; font-weight: bold; background: #5865f2; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; cursor: move; flex-shrink: 0; }
        .header-btns button { background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: 5px; }
        #socolata-body { padding: 15px; flex-grow: 1; display: flex; flex-direction: column; gap: 10px; }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .stat-card { background: #202225; padding: 10px; border-radius: 6px; border: 1px solid #444; text-align: center; }
        .stat-label { font-size: 9px; color: #b9bbbe; text-transform: uppercase; display: block; }
        .stat-value { font-size: 16px; font-weight: bold; color: #5865f2; }
        
        .progress-container { background: #444; border-radius: 10px; height: 20px; overflow: hidden; border: 1px solid #222; position: relative; margin: 5px 0; }
        #soco-progress-bar { height: 100%; width: 0%; background: #43b581; transition: width 0.3s ease; }
        #soco-progress-text { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: bold; line-height: 20px; color: white; z-index: 2; }
        
        .gui-button { width: 100%; padding: 12px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; text-transform: uppercase; font-size: 11px; transition: 0.2s; }
        .btn-run { background: #43b581; color: white; }
        .btn-run:disabled { background: #4f545c; cursor: not-allowed; opacity: 0.6; color: #b9bbbe; }
        .btn-stop { background: #f04747; color: white; margin-top: 5px; }
        
        .gui-console { background: #000; color: #43b581; font-family: monospace; font-size: 10px; padding: 8px; border-radius: 5px; flex-grow: 1; overflow-y: auto; border: 1px solid #333; margin-top: 5px; }
        .gui-console a { color: #faa61a; text-decoration: underline; font-weight: bold; }
        #min-icon { display: none; font-size: 24px; font-weight: bold; color: white; }
    `;
    document.head.appendChild(style);

    const gui = document.createElement('div');
    gui.id = 'socolata-quest-master';
    gui.innerHTML = `
        <div class="gui-header" id="socolata-drag">
            <span>SOCOLATA QUEST MASTER | V3.0</span>
            <div class="header-btns"><button id="soco-min">_</button><button id="socolata-close">×</button></div>
        </div>
        <div id="min-icon">S</div>
        <div id="socolata-body">
            <div class="stats-grid">
                <div class="stat-card"><span class="stat-label">Accepted</span><span class="stat-value" id="soco-rem">0</span></div>
                <div class="stat-card"><span class="stat-label">Completed</span><span class="stat-value" id="soco-comp">0</span></div>
            </div>
            <div class="progress-container">
                <div id="soco-progress-text">0%</div>
                <div id="soco-progress-bar"></div>
            </div>
            <button id="soco-run" class="gui-button btn-run">Complete All Accepted Quests</button>
            <button id="soco-stop" class="gui-button btn-stop">Emergency Stop</button>
            <div id="soco-log" class="gui-console">V3.0: Engine ready. Desktop Check Active.</div>
        </div>
    `;
    document.body.appendChild(gui);

    const log = (msg, color = "#43b581") => { 
        const l = document.getElementById('soco-log'); 
        if(l) { 
            const entry = document.createElement('div');
            entry.style.color = color;
            entry.innerHTML = `> ${msg}`;
            l.appendChild(entry);
            l.scrollTop = l.scrollHeight; 
        } 
    };

    const getDiscordModules = () => {
        try {
            let wp = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]); webpackChunkdiscord_app.pop();
            const findM = (f) => Object.values(wp.c).find(x => x?.exports?.Z && f(x.exports.Z))?.exports.Z || Object.values(wp.c).find(x => x?.exports?.ZP && f(x.exports.ZP))?.exports.ZP;
            return {
                QuestsStore: findM(m => m.__proto__?.getQuest),
                api: Object.values(wp.c).find(x => x?.exports?.tn?.post)?.exports.tn
            };
        } catch (e) { return { QuestsStore: null, api: null }; }
    };

    const updateStats = () => {
        const { QuestsStore } = getDiscordModules();
        if(!QuestsStore) return;
        const all = [...QuestsStore.quests.values()];
        const active = all.filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt);
        document.getElementById('soco-rem').innerText = active.length;
        document.getElementById('soco-comp').innerText = all.filter(x => x.userStatus?.completedAt).length;
        let totalCurr = 0, totalTarget = 0;
        active.forEach(q => {
            const tasks = q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks;
            if(!tasks) return;
            const tk = Object.keys(tasks)[0];
            totalCurr += (q.userStatus?.progress?.[tk]?.value || 0);
            totalTarget += tasks[tk].target;
        });
        const percent = totalTarget > 0 ? Math.floor((totalCurr / totalTarget) * 100) : 0;
        document.getElementById('soco-progress-bar').style.width = percent + '%';
        document.getElementById('soco-progress-text').innerText = percent + '%';
    };

    const runEngine = async () => {
        if (isRunning) return;
        const { QuestsStore, api } = getDiscordModules();
        if(!QuestsStore || !api) return log("Sync error.", "#f04747");

        const activeQuests = [...QuestsStore.quests.values()].filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt);
        
        if (activeQuests.length === 0) {
            log("ERROR: You don't have accepted quests!", "#f04747");
            return;
        }

        const isWeb = !window.DiscordNative;
        const gameTasks = activeQuests.filter(q => {
            const tasks = q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks;
            const tKey = Object.keys(tasks)[0];
            return !tKey.toLowerCase().includes("video");
        });

        if (isWeb && gameTasks.length > 0) {
            log("ERROR: Game tasks can only be completed via the Discord App!", "#f04747");
            log(`Download: <a href="https://discord.com/download" target="_blank">Discord App</a>`, "#faa61a");
            if (gameTasks.length === activeQuests.length) return;
            log("Skipping game tasks, running video quests...");
        }

        isRunning = true;
        const btnRun = document.getElementById('soco-run');
        btnRun.disabled = true; 

        const handleQuest = async (q) => {
            const tasks = q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks;
            const tKey = Object.keys(tasks)[0];
            if (isWeb && !tKey.toLowerCase().includes("video")) return; 

            const target = tasks[tKey].target;
            while (isRunning) {
                const current = QuestsStore.getQuest(q.id);
                if (!current || current.userStatus?.completedAt) break;
                let val = current.userStatus?.progress?.[tKey]?.value || 0;
                if (val >= target) break;
                try {
                    const isVid = tKey.includes("VIDEO");
                    const res = await api.post({
                        url: `/quests/${q.id}/${isVid ? 'video-progress' : 'heartbeat'}`,
                        body: isVid ? { timestamp: Math.min(target, val + 15) } : { stream_key: 'call:0:0', terminal: false }
                    });
                    if (res.status === 429) { await new Promise(r => setTimeout(r, 6000)); continue; }
                    await new Promise(r => setTimeout(r, isVid ? 1500 : 10000));
                    updateStats();
                } catch (e) { await new Promise(r => setTimeout(r, 5000)); }
            }
            log(`Finished: ${q.config.messages.questName.substring(0,15)}`);
        };

        const targetsToProcess = isWeb ? activeQuests.filter(q => Object.keys(q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks)[0].toLowerCase().includes("video")) : activeQuests;
        await Promise.all(targetsToProcess.map(q => handleQuest(q)));
        
        isRunning = false;
        btnRun.disabled = false;
        log("Execution complete.");
    };

    // UI Controls
    document.getElementById('soco-min').onclick = () => {
        isMinimized = !isMinimized;
        gui.classList.toggle('minimized', isMinimized);
        document.getElementById('socolata-body').style.display = isMinimized ? 'none' : 'flex';
        document.getElementById('min-icon').style.display = isMinimized ? 'block' : 'none';
    };
    document.getElementById('soco-run').onclick = runEngine;
    document.getElementById('soco-stop').onclick = () => { 
        isRunning = false; 
        document.getElementById('soco-run').disabled = false; 
        log("Stopped. UI Unlocked.", "#f04747"); 
    };
    document.getElementById('socolata-close').onclick = () => { isRunning = false; gui.remove(); };

    let offset = [0,0], isDown = false;
    document.getElementById('socolata-drag').onmousedown = (e) => { isDown = true; offset = [gui.offsetLeft - e.clientX, gui.offsetTop - e.clientY]; };
    document.onmouseup = () => isDown = false;
    document.onmousemove = (e) => { if (isDown) { gui.style.left = (e.clientX + offset[0]) + 'px'; gui.style.top = (e.clientY + offset[1]) + 'px'; } };

    setInterval(updateStats, 3000);
    updateStats();
})();
