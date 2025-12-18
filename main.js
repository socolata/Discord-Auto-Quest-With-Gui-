(async () => {
    let isRunning = false;
    let isMinimized = false;

    if (document.getElementById('socolata-quest-master')) document.getElementById('socolata-quest-master').remove();
    
    const style = document.createElement('style');
    style.id = 'socolata-v2-english-style';
    style.innerHTML = `
        #socolata-quest-master {
            position: fixed; top: 100px; left: 100px; z-index: 999999;
            background: #2f3136; color: white; border-radius: 12px; 
            border: 1px solid #5865f2; font-family: 'gg sans', sans-serif; 
            width: 380px; height: 350px; min-width: 280px; min-height: 250px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); 
            display: flex; flex-direction: column;
            resize: both; overflow: auto;
        }
        #socolata-quest-master.minimized {
            width: 55px !important; height: 55px !important; border-radius: 50%;
            cursor: pointer; justify-content: center; align-items: center; resize: none; overflow: hidden;
            background: #5865f2; border: 2px solid white;
        }
        .gui-header { font-size: 13px; font-weight: bold; background: #5865f2; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; cursor: move; flex-shrink: 0; position: sticky; top: 0; }
        .header-btns button { background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: 5px; }
        #socolata-body { padding: 15px; flex-grow: 1; display: flex; flex-direction: column; gap: 12px; }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .stat-card { background: #202225; padding: 10px; border-radius: 6px; border: 1px solid #444; text-align: center; }
        .stat-label { font-size: 9px; color: #b9bbbe; text-transform: uppercase; display: block; }
        .stat-value { font-size: 16px; font-weight: bold; color: #faa61a; }
        
        .progress-container { background: #444; border-radius: 10px; height: 14px; overflow: hidden; border: 1px solid #222; margin: 5px 0; position: relative; }
        #soco-progress-bar { 
            height: 100%; width: 0%; 
            transition: width 0.5s ease, background-color 1s ease; 
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        
        .finished-pulse { animation: pulse-green 2s infinite; }
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(67, 181, 129, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(67, 181, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(67, 181, 129, 0); }
        }

        .gui-button { width: 100%; padding: 12px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; text-transform: uppercase; font-size: 11px; transition: 0.3s; }
        .btn-run { background: #43b581; color: white; }
        .btn-run:hover { background: #3ca374; }
        .btn-stop { background: #f04747; color: white; margin-top: 5px; }
        
        .gui-console { background: #000; color: #43b581; font-family: monospace; font-size: 10px; padding: 8px; border-radius: 5px; flex-grow: 1; overflow-y: auto; border: 1px solid #333; margin-top: 5px; }
        #min-icon { display: none; font-size: 24px; font-weight: bold; color: white; }
    `;
    document.head.appendChild(style);

    const gui = document.createElement('div');
    gui.id = 'socolata-quest-master';
    gui.innerHTML = `
        <div class="gui-header" id="socolata-drag">
            <span id="h-title">SOCOLATA V2</span>
            <div class="header-btns"><button id="soco-min" title="Minimize">_</button><button id="socolata-close" title="Close">×</button></div>
        </div>
        <div id="min-icon">S</div>
        <div id="socolata-body">
            <div class="stats-grid">
                <div class="stat-card"><span class="stat-label">Accepted</span><span class="stat-value" id="soco-rem">0</span></div>
                <div class="stat-card"><span class="stat-label">Completed</span><span class="stat-value" id="soco-comp">0</span></div>
            </div>
            
            <div style="text-align:center; font-size: 11px; color:#b9bbbe; font-weight:bold; letter-spacing: 0.5px;" id="soco-task-name">SYSTEM READY</div>
            <div class="progress-container"><div id="soco-progress-bar"></div></div>
            
            <div class="stat-card" style="width:100%; box-sizing:border-box;"><span class="stat-label">Potential Orbs</span><span class="stat-value" id="soco-orbs">0</span></div>
            
            <button id="soco-run" class="gui-button btn-run">Engage Max Velocity</button>
            <button id="soco-stop" class="gui-button btn-stop">Emergency Stop</button>
            <div id="soco-log" class="gui-console">V2 Chroma Engine Active. Awaiting command...</div>
        </div>
    `;
    document.body.appendChild(gui);

    const log = (msg) => { const l = document.getElementById('soco-log'); if(l) { l.innerHTML += `<div>> ${msg}</div>`; l.scrollTop = l.scrollHeight; } };

    const getProgressColor = (percent) => {
        if (percent < 30) return "#f04747";
        if (percent < 70) return "#faa61a";
        return "#43b581";
    };

    document.getElementById('soco-min').onclick = (e) => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        gui.classList.toggle('minimized', isMinimized);
        document.getElementById('socolata-body').style.display = isMinimized ? 'none' : 'flex';
        document.getElementById('h-title').style.display = isMinimized ? 'none' : 'block';
        document.getElementById('min-icon').style.display = isMinimized ? 'block' : 'none';
    };

    gui.onclick = () => { if(isMinimized) document.getElementById('soco-min').click(); };

    let offset = [0,0], isDown = false;
    document.getElementById('socolata-drag').onmousedown = (e) => { if(isMinimized) return; isDown = true; offset = [gui.offsetLeft - e.clientX, gui.offsetTop - e.clientY]; };
    document.onmouseup = () => isDown = false;
    document.onmousemove = (e) => { if (isDown) { gui.style.left = (e.clientX + offset[0]) + 'px'; gui.style.top = (e.clientY + offset[1]) + 'px'; } };

    const runEngine = async () => {
        if (isRunning) return;
        isRunning = true;
        document.getElementById('soco-run').disabled = true;
        document.getElementById('soco-progress-bar').classList.remove('finished-pulse');

        try {
            let wp = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]); webpackChunkdiscord_app.pop();
            const findM = (f) => Object.values(wp.c).find(x => x?.exports?.Z && f(x.exports.Z))?.exports.Z || Object.values(wp.c).find(x => x?.exports?.ZP && f(x.exports.ZP))?.exports.ZP;
            let QuestsStore = findM(m => m.__proto__?.getQuest);
            let api = Object.values(wp.c).find(x => x?.exports?.tn?.post)?.exports.tn;

            const updateStats = () => {
                const all = [...QuestsStore.quests.values()];
                const active = all.filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt);
                document.getElementById('soco-rem').innerText = active.length;
                document.getElementById('soco-comp').innerText = all.filter(x => x.userStatus?.completedAt).length;
                
                let orbs = 0;
                active.forEach(q => orbs += (q.config.rewardsConfig?.rewards?.find(r => r.skuId === "1258133503027974246")?.amount || 0));
                document.getElementById('soco-orbs').innerText = orbs;

                let totalCurr = 0, totalTarget = 0;
                active.forEach(q => {
                    const tk = Object.keys(q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks)[0];
                    totalCurr += (q.userStatus?.progress?.[tk]?.value || 0);
                    totalTarget += (q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks)[tk].target;
                });
                
                const percent = totalTarget > 0 ? (totalCurr / totalTarget) * 100 : 0;
                const bar = document.getElementById('soco-progress-bar');
                bar.style.width = percent + '%';
                bar.style.backgroundColor = getProgressColor(percent);
                if(percent >= 100) bar.classList.add('finished-pulse');
            };

            const handleQuest = async (q) => {
                const name = q.config.messages.questName;
                const tKey = Object.keys(q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks)[0];
                const target = (q.config.taskConfigV2?.tasks || q.config.taskConfig?.tasks)[tKey].target;

                while (isRunning) {
                    const current = QuestsStore.getQuest(q.id);
                    let val = current?.userStatus?.progress?.[tKey]?.value || 0;
                    if (!current || current.userStatus?.completedAt || val >= target) break;

                    try {
                        const isVid = tKey.includes("VIDEO");
                        await api.post({
                            url: `/quests/${q.id}/${isVid ? 'video-progress' : 'heartbeat'}`,
                            body: isVid ? { timestamp: Math.min(target, val + 15) } : { stream_key: 'call:0:0', terminal: false }
                        });
                        await new Promise(r => setTimeout(r, isVid ? 1300 : 10000));
                        updateStats();
                    } catch (e) { await new Promise(r => setTimeout(r, 5000)); }
                }
                log(`Neutralized: ${name.substring(0,15)}...`);
            };

            const targets = [...QuestsStore.quests.values()].filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt);
            if(targets.length > 0) {
                log(`V2 Parallel Strike: ${targets.length} targets.`);
                document.getElementById('soco-task-name').innerText = "STRIKE IN PROGRESS";
                document.getElementById('soco-task-name').style.color = "#faa61a";
                await Promise.all(targets.map(q => handleQuest(q)));
                document.getElementById('soco-task-name').innerText = "MISSION ACCOMPLISHED";
                document.getElementById('soco-task-name').style.color = "#43b581";
                log("CLEAN SWEEP COMPLETE.");
            } else { 
                log("No active targets found."); 
                document.getElementById('soco-task-name').innerText = "NO TARGETS";
            }

        } catch (e) { log("Fatal Error: System Interrupted."); }
        isRunning = false;
        document.getElementById('soco-run').disabled = false;
    };

    document.getElementById('soco-run').onclick = runEngine;
    document.getElementById('soco-stop').onclick = () => { isRunning = false; log("FORCED STOP."); };
    document.getElementById('socolata-close').onclick = () => { isRunning = false; gui.remove(); };
    
    // Initial Sync (English Logs)
    setTimeout(() => {
        try {
            let wp = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]); webpackChunkdiscord_app.pop();
            const findM = (f) => Object.values(wp.c).find(x => x?.exports?.Z && f(x.exports.Z))?.exports.Z || Object.values(wp.c).find(x => x?.exports?.ZP && f(x.exports.ZP))?.exports.ZP;
            let QuestsStore = findM(m => m.__proto__?.getQuest);
            const all = [...QuestsStore.quests.values()];
            document.getElementById('soco-rem').innerText = all.filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt).length;
            document.getElementById('soco-comp').innerText = all.filter(x => x.userStatus?.completedAt).length;
            let orbs = 0;
            all.filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt).forEach(q => orbs += (q.config.rewardsConfig?.rewards?.find(r => r.skuId === "1258133503027974246")?.amount || 0));
            document.getElementById('soco-orbs').innerText = orbs;
            log("System Check: All modules loaded.");
        } catch(e) { log("System Check: Module loading failed."); }
    }, 1000);
})();
