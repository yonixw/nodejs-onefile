const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const bellSound = () => console.log('\u0007')

const play = (i) => { if (i == 0) return; bellSound; setTimeout(play, 1000, i - 1) }

rl.question("How long (min) ?", function (min) {
    setTimeout(play, min * 60 * 1000, 10)
    rl.close();
});