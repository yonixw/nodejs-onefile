const { exec } = require('child_process')

const execLive = (command) => {
    return new Promise((ok, bad) => {
        const process = exec(command)

        process.stdout.on('data', (data) => {
            console.log('[stdout]: ' + data.toString())
        })

        process.stderr.on('data', (data) => {
            console.log('[stderr]: ' + data.toString())
        })

        process.on('exit', (code) => {
            console.log('[process] exited with code ' + code.toString())
            ok(code)
        })

        process.on('error', (e) => {
            bad(e)
        })
    })
}