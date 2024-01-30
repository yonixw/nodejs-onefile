/*
████████ ██ ███    ███ ███████ ██████      ██    ██    ██████  
   ██    ██ ████  ████ ██      ██   ██     ██    ██         ██ 
   ██    ██ ██ ████ ██ █████   ██████      ██    ██     █████  
   ██    ██ ██  ██  ██ ██      ██   ██      ██  ██     ██      
   ██    ██ ██      ██ ███████ ██   ██       ████   ██ ███████ 
            From: https://github.com/yonixw/nodejs-onefile

Simple timer script to run on windows, because chrome tabs and windows apps are now behind so
    many gatekeepers (permission, background priority etc.) that a simple beep script has emerged the best!

How to use:
- Save to file on disk
- Create shortcut to: `node.exe win-console-timer.js` with the correct path to node and the script.
- Click the shortcut when you want to set a timer
*/

const readline = require("readline");
const bellSound = () => {
    console.log('\u0007'); console.log("BEEP!");
}

const play = (i) => {
    if (i == 0) return;
    bellSound();
    setTimeout(play, 1000, i - 1)
}

const dateAdd = (_date, addMin) => {
    const date = new Date(_date)
    date.setMinutes(date.getMinutes() + addMin);
    return date;
}

async function startTimer() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const async_q = (q) => new Promise((ok, _) => { rl.question(q, ok); })

    const now = new Date();
    console.log("Date now: " + now)

    let deltaMin = parseInt(await async_q("\tHow much to wait (MIN)? ") || "0");
    let waitingAdditions = true;

    while (waitingAdditions) {
        console.log("\tAlert date: " + dateAdd(now, deltaMin))

        let latestDelta = parseInt(await async_q("\tHow much to wait (MIN)? [0 To Set] ") || "0")
        deltaMin += latestDelta;

        if (latestDelta == 0) {
            waitingAdditions = false;
        }
    }

    const finalDate = dateAdd(now, deltaMin);
    setTimeout(play, finalDate.getTime() - Date.now(), 10)
    console.log("Alert SET! in " + finalDate)

    rl.close();
}

startTimer().
    then(() => console.log("[SETUP DONE]")).
    catch((e) => console.error("[SETUP ERR]", e))

