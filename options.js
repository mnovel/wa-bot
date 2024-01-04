module.exports = options = (headless, start) => {
    const options = {
        sessionId: 'PELL',
        headless: headless,
        qrTimeout: 0,
        multiDevice: true,
        authTimeout: 0,
        restartOnCrash: start,
        cacheEnabled: false,
        useChrome: true,
        killProcessOnBrowserClose: true,
        throwErrorOnTosBlock: false,
    }
    return options
}