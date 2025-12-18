(async () => {
    // --- Styled CSS Console Credit ---
    console.log("%c credit to socolata ", 
        "font-size: 24px; font-weight: bold; color: white; background-color: #6495ed; padding: 10px; border-radius: 5px;"
    );
    // ---------------------------------
    
    // =======================================================
    //  AGGRESSIVE SPEED & RELIABILITY CONFIGURATIONS
    // =======================================================
    const VIDEO_JUMP_SPEED = 7; 
    const VIDEO_INTERVAL = 0.1; 
    const ACTIVITY_HEARTBEAT_INTERVAL = 10; 
    
    // *Note: Rate Limit wait time (HTTP 429) is read dynamically from Discord's "retry_after" field.
    
    delete window.$;
    let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
    webpackChunkdiscord_app.pop();

    let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata).exports.Z;
    let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames).exports.ZP;
    let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest).exports.Z;
    let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent).exports.Z;
    let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel).exports.ZP;
    let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue).exports.Z;
    let api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get).exports.tn;

    const isApp = typeof DiscordNative !== "undefined";
    const pid = Math.floor(Math.random() * 30000) + 1000;

    // Styled completion log function
    const logCompletion = (name) => {
        console.log(`%c✅ Quest Completed! (${name})`, "font-size: 20px; color: #4CAF50; font-weight: bold; padding: 5px; border: 1px solid #4CAF50;");
    };
    
    // Find all active and unfinished quests
    const activeQuests = [...QuestsStore.quests.values()].filter(x => 
        x.id !== "1248385850622869556" && 
        x.userStatus?.enrolledAt && 
        !x.userStatus?.completedAt && 
        new Date(x.config.expiresAt).getTime() > Date.now()
    );
    
    if (activeQuests.length === 0) {
        const existingQuest = [...QuestsStore.quests.values()].find(x => x.id !== "1248385850622869556" && new Date(x.config.expiresAt).getTime() > Date.now());
        if (existingQuest && existingQuest.userStatus?.completedAt) {
            console.log("ℹ️ The existing quest is already completed.");
        } else {
            console.log("❌ No active or unfinished quests found.");
        }
        return;
    }
    
    console.log(` Found ${activeQuests.length} active quests. Starting parallel execution...`);
    
    // =======================================================
    //  FUNCTION TO HANDLE EACH QUEST TYPE
    // =======================================================
    const handleQuest = async (quest) => {
        const applicationId = quest.config.application.id;
        const applicationName = quest.config.application.name;
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
        const secondsNeeded = taskConfig.tasks[taskName].target;
        let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        let progress = secondsDone;
        
        console.log(`[${questName}] Starting quest type: ${taskName}. Seconds remaining: ${secondsNeeded - secondsDone}.`);

        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const maxFuture = 10;
            const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
            let completed = false;
            
            while(progress < secondsNeeded) {
                const maxAllowed = Math.floor((Date.now() - enrolledAt)/1000) + maxFuture;
                const diff = maxAllowed - secondsDone;
                const timestamp = secondsDone + VIDEO_JUMP_SPEED;
                
                if(diff >= VIDEO_JUMP_SPEED) {
                    try {
                        const res = await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}});
                        
                        // *** Dynamic Rate Limit Handling (429) ***
                        if (res.status === 429) { 
                            const retryAfter = res.body?.retry_after ?? 5;
                            console.warn(`[${questName}] ⚠️ Rate Limit hit (Video). Waiting ${retryAfter.toFixed(2)}s (Dynamic).`);
                            await new Promise(resolve => setTimeout(resolve, (retryAfter + 0.5) * 1000)); // Added 0.5s buffer
                            continue;
                        }
                        if(res.status >= 400) throw new Error(`API Error ${res.status}`);
                        
                        completed = res.body.completed_at != null;
                        secondsDone = Math.min(secondsNeeded, timestamp);
                        progress = secondsDone;
                        console.log(`[${questName}] Video progress: ${progress}/${secondsNeeded}`);
                    } catch (e) {
                         // Catch general network/API errors (non-429)
                         console.error(`[${questName}] ❌ API/Network error during video update. Waiting 5 seconds to retry.`, e);
                         await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                         continue;
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, VIDEO_INTERVAL * 1000));
            }
            
            if(!completed) {
                try {
                    await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: secondsNeeded}});
                } catch(e) {
                     console.error(`[${questName}] ❌ Error sending final video completion update.`, e);
                }
            }
            logCompletion(questName);
            return; 
            
        } else if (taskName === "PLAY_ACTIVITY") {
            const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
            const streamKey = `call:${channelId}:1`;
            
            while(progress < secondsNeeded) {
                try {
                    let res = await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: false}});
                    
                    // *** Dynamic Rate Limit Handling (429) ***
                    if (res.status === 429) { 
                        const retryAfter = res.body?.retry_after ?? 5;
                        console.warn(`[${questName}] ⚠️ Rate Limit hit (Activity). Waiting ${retryAfter.toFixed(2)}s (Dynamic).`);
                        await new Promise(resolve => setTimeout(resolve, (retryAfter + 0.5) * 1000));
                        continue;
                    }
                    if(res.status >= 400) throw new Error(`API Error ${res.status}`);
                    
                    progress = res.body.progress.PLAY_ACTIVITY.value;
                    console.log(`[${questName}] Activity progress: ${progress}/${secondsNeeded}`);
                } catch (e) {
                     console.error(`[${questName}] ❌ API/Network error during Heartbeat. Waiting 10 seconds to retry.`, e);
                     await new Promise(resolve => setTimeout(resolve, 10 * 1000));
                }
                
                await new Promise(resolve => setTimeout(resolve, ACTIVITY_HEARTBEAT_INTERVAL * 1000)); 
            }
            
            try {
                await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: true}});
            } catch (e) {
                 console.error(`[${questName}] ❌ Error sending final Heartbeat terminal call.`, e);
            }
            
            logCompletion(questName);
            return; 
        
        } else if (taskName === "PLAY_ON_DESKTOP" || taskName === "STREAM_ON_DESKTOP") {
            if(!isApp) {
                console.log(`[${questName}] ❌ Desktop quests cannot run in the browser!`);
                return;
            }
            
            // Only one Desktop/Stream quest can run at a time according to Discord's logic
            const realFunc = taskName === "STREAM_ON_DESKTOP" ? ApplicationStreamingStore.getStreamerActiveStreamMetadata : RunningGameStore.getRunningGames;
            const realGetGameForPID = RunningGameStore.getGameForPID;
            
            console.log(`[${questName}] ⚠️ Starting ${taskName} spoofing. This quest updates every ~1 minute.`);
            
            if (taskName === "PLAY_ON_DESKTOP") {
                const res = await api.get({url: `/applications/public?application_ids=${applicationId}`});
                const appData = res.body[0];
                const exeName = appData.executables.find(x => x.os === "win32").name.replace(">","");
                
                const fakeGame = {
                    cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                    exeName,
                    exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                    hidden: false,
                    isLauncher: false,
                    id: applicationId,
                    name: appData.name,
                    pid: pid,
                    pidPath: [pid],
                    processName: appData.name,
                    start: Date.now(),
                };
                const realGames = RunningGameStore.getRunningGames();
                const fakeGames = [fakeGame];
                
                RunningGameStore.getRunningGames = () => fakeGames;
                RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
                FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames});
            } else { 
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                    id: applicationId,
                    pid,
                    sourceName: null
                });
            }

            return new Promise(resolve => {
                let listener = data => {
                    const progressType = taskName === "PLAY_ON_DESKTOP" ? "PLAY_ON_DESKTOP" : "STREAM_ON_DESKTOP";
                    let currentProgress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress[progressType].value);
                    console.log(`[${questName}] Progress: ${currentProgress}/${secondsNeeded}`);
                    
                    if(currentProgress >= secondsNeeded) {
                        logCompletion(questName);
                        
                        // Clean up the spoofing
                        if (taskName === "PLAY_ON_DESKTOP") {
                            RunningGameStore.getRunningGames = realFunc;
                            RunningGameStore.getGameForPID = realGetGameForPID;
                            FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [{pid}], added: [], games: []});
                        } else {
                            ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                        }
                        
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);
                        resolve(); 
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);
                
                if (taskName === "STREAM_ON_DESKTOP") {
                     console.log(`[${questName}] ℹ️ You must start streaming any window in a voice channel for the quest to progress.`);
                }
            });
        }
    };
    
    // =======================================================
    //  EXECUTE QUESTS
    // =======================================================
    
    // 1. Desktop Quest: Find the first one (only one can run)
    const desktopQuest = activeQuests.find(q => q.config.taskConfigV2?.tasks?.PLAY_ON_DESKTOP || q.config.taskConfigV2?.tasks?.STREAM_ON_DESKTOP);
    
    // 2. Concurrent Quests: All Video and Activity quests
    const concurrentQuests = activeQuests.filter(q => q !== desktopQuest);
    
    const tasksToRun = [];

    if (desktopQuest) {
        tasksToRun.push(handleQuest(desktopQuest));
    }
    
    concurrentQuests.forEach(quest => {
        tasksToRun.push(handleQuest(quest));
    });

    try {
        await Promise.all(tasksToRun);
        console.log(" All scrip-handled active quests have finished.");
    } catch (error) {
        console.error("⛔️ A critical failure occurred during parallel execution. Please check logs for specific errors.", error);
    }
})();