(async () => {
    let isRunning = false;
    let isMinimized = false;
    let activeWorkers = 0;

    // Remove existing instance if it exists
    if (document.getElementById('socolata-quest-master')) {
        document.getElementById('socolata-quest-master').remove();
    }
    
    const style = document.createElement('style');
    style.id = 'socolata-v3-0-style';
    style.innerHTML = `
        #socolata-quest-master {
            position: fixed; top: 100px; left: 100px; z-index: 999999;
            background: #2f3136; color: white; border-radius: 12px; 
            border: 1px solid #5865f2; font-family: 'gg sans', sans-serif; 
            width: 400px; height: 550px; display: flex; flex-direction: column;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); resize: both; overflow: hidden;
            min-width: 320px; min-height: 300px;
        }
        #socolata-quest-master.minimized {
            width: 240px !important; height: 40px !important; 
            border-radius: 8px; resize: none; min-height: 40px !important;
        }
        .gui-header { 
            font-size: 13px; font-weight: bold; background: #5865f2; 
            padding: 10px 15px; display: flex; justify-content: space-between; 
            align-items: center; cursor: move; flex-shrink: 0; height: 40px; 
            box-sizing: border-box; 
        }
        .header-btns button { 
            background: none; border: none; color: white; font-size: 18px; 
            cursor: pointer; margin-left: 5px; line-height: 1; 
        }
        
        #socolata-body { 
            padding: 15px; flex-grow: 1; display: flex; 
            flex-direction: column; gap: 12px; overflow: hidden; 
        }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }
        .stat-card { 
            background: #202225; padding: 10px; border-radius: 6px; 
            border: 1px solid #444; text-align: center; 
        }
        .stat-label { 
            font-size: 9px; color: #b9bbbe; text-transform: uppercase; 
            display: block; 
        }
        .stat-value { font-size: 16px; font-weight: bold; color: #5865f2; }
        
        .progress-container { 
            background: #444; border-radius: 10px; height: 24px; 
            overflow: hidden; border: 1px solid #222; position: relative; 
            flex-shrink: 0; 
        }
        #soco-progress-bar { 
            height: 100%; width: 0%; background: #43b581; 
            transition: width 0.3s ease; 
        }
        #soco-progress-text { 
            position: absolute; width: 100%; text-align: center; 
            font-size: 12px; font-weight: bold; line-height: 24px; 
            color: white; z-index: 2; 
        }
        
        .gui-button { 
            width: 100%; padding: 12px; border: none; border-radius: 5px; 
            cursor: pointer; font-weight: bold; text-transform: uppercase; 
            font-size: 11px; transition: 0.2s; flex-shrink: 0; 
        }
        .btn-run { background: #43b581; color: white; }
        .btn-run:disabled { 
            background: #4f545c; cursor: not-allowed; 
            opacity: 0.6; color: #b9bbbe; 
        }
        .btn-stop { background: #f04747; color: white; }
        
        .console-wrapper { 
            flex-grow: 1; display: flex; flex-direction: column; 
            background: #000; border-radius: 6px; border: 1px solid #333; 
            overflow: hidden; position: relative; 
        }
        .console-toolbar { 
            background: #18191c; padding: 4px 8px; display: flex; 
            justify-content: flex-end; border-bottom: 1px solid #333; 
        }
        .btn-clear { 
            background: transparent; border: 1px solid #444; color: #b9bbbe; 
            font-size: 9px; padding: 2px 6px; border-radius: 3px; cursor: pointer; 
        }
        .btn-clear:hover { background: #444; color: white; }

        .gui-console { 
            flex-grow: 1; padding: 12px; overflow-y: auto; 
            color: #43b581; font-family: 'Consolas', monospace; font-size: 12px; 
            white-space: pre-wrap; word-break: break-all; line-height: 1.5;
        }
    `;
    document.head.appendChild(style);

    const gui = document.createElement('div');
    gui.id = 'socolata-quest-master';
    gui.innerHTML = `
        <div class="gui-header" id="socolata-drag">
            <span>SOCOLATA QUEST MASTER V3.0</span>
            <div class="header-btns">
                <button id="soco-min">_</button>
                <button id="socolata-close">×</button>
            </div>
        </div>
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
            <div class="console-wrapper">
                <div class="console-toolbar"><button id="soco-clear" class="btn-clear">CLEAR LOGS</button></div>
                <div id="soco-log" class="gui-console">Engine ready.</div>
            </div>
        </div>
    `;
    document.body.appendChild(gui);

    const log = (msg, color = "#43b581") => { 
        const l = document.getElementById('soco-log'); 
        if(l) { 
            const entry = document.createElement('div');
            entry.style.color = color;
            entry.style.borderLeft = `3px solid ${color}`;
            entry.style.paddingLeft = "8px";
            entry.style.marginBottom = "4px";
            entry.innerHTML = `> ${msg}`;
            l.appendChild(entry);
            l.scrollTop = l.scrollHeight; 
        } 
    };

    const getDiscordModules = () => {
        try {
            let wp = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]); 
            webpackChunkdiscord_app.pop();
            const findM = (f) => Object.values(wp.c).find(x => x?.exports?.Z && f(x.exports.Z))?.exports.Z || 
                               Object.values(wp.c).find(x => x?.exports?.ZP && f(x.exports.ZP))?.exports.ZP;
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
        if (activeQuests.length === 0) return log("No accepted quests found.", "#faa61a");

        isRunning = true;
        document.getElementById('soco-run').disabled = true; 
        log("Engine started.");

        const handleQuest = async (q) => {
            activeWorkers++;
            const tasks = q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks;
            const tKey = Object.keys(tasks)[0];
            const target = tasks[tKey].target;
            
            try {
                while (isRunning) {
                    const current = QuestsStore.getQuest(q.id);
                    if (!current || current.userStatus?.completedAt) break;
                    
                    const isVid = tKey.includes("VIDEO");
                    const val = current.userStatus?.progress?.[tKey]?.value || 0;
                    if (val >= target) break;

                    await api.post({
                        url: `/quests/${q.id}/${isVid ? 'video-progress' : 'heartbeat'}`,
                        body: isVid ? { timestamp: Math.min(target, val + 15) } : { stream_key: 'call:0:0', terminal: false }
                    }).catch(() => null); 
                    
                    await new Promise(r => setTimeout(r, isVid ? 1500 : 10000));
                    if (!isRunning) break; 
                    updateStats();
                }
                
                if (isRunning) log(`Completed: ${q.config.messages.questName.substring(0,15)}...`);
            } finally {
                activeWorkers--;
            }
        };

        await Promise.all(activeQuests.map(q => handleQuest(q)));
        
        if (isRunning) {
            log("All work finished!", "#43b581");
            isRunning = false;
            document.getElementById('soco-run').disabled = false;
        }
    };

    // UI Logic
    document.getElementById('soco-clear').onclick = () => { 
        document.getElementById('soco-log').innerHTML = ''; 
    };
    document.getElementById('soco-min').onclick = () => {
        isMinimized = !isMinimized;
        gui.classList.toggle('minimized', isMinimized);
        document.getElementById('socolata-body').style.display = isMinimized ? 'none' : 'flex';
        document.getElementById('soco-min').innerText = isMinimized ? '□' : '_';
    };

    document.getElementById('soco-run').onclick = runEngine;
    document.getElementById('soco-stop').onclick = async () => { 
        if (!isRunning) return;
        isRunning = false; 
        log("Stopping... waiting for sync.", "#faa61a");
        while (activeWorkers > 0) await new Promise(r => setTimeout(r, 100));
        log("STOPPED.", "#f04747"); 
        document.getElementById('soco-run').disabled = false;
    };

    document.getElementById('socolata-close').onclick = () => { 
        isRunning = false; 
        gui.remove(); 
    };

    let offset = [0,0], isDown = false;
    document.getElementById('socolata-drag').onmousedown = (e) => { 
        isDown = true; 
        offset = [gui.offsetLeft - e.clientX, gui.offsetTop - e.clientY]; 
    };
    document.onmouseup = () => isDown = false;
    document.onmousemove = (e) => { 
        if (isDown) { 
            gui.style.left = (e.clientX + offset[0]) + 'px'; 
            gui.style.top = (e.clientY + offset[1]) + 'px'; 
        } 
    };

    setInterval(updateStats, 3000);
    updateStats();
})();

