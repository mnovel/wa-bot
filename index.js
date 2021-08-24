const {
    create,
    Client
} = require('@open-wa/wa-automate');
const options = require('./options')
const HandleMsg = require('./HandleMassage');


const start = (pell = new Client) => {

    pell.onStateChanged(state => {
        console.log('statechanged', state)
        if (state === "CONFLICT" || state === "UNLAUNCHED") pell.forceRefocus();
        if (state === 'UNPAIRED') console.log('LOGGED OUT!!!!')
    });

    pell.onMessage(async message => {
        HandleMsg(pell, message);
    });

    pell.onAddedToGroup(async (chat) => {
        const groups = await pell.getAllGroups()

        await pell.simulateTyping(chat.id, true).then(async () => {
            await pell.sendText(chat.id, `Hai minna~, Im Pell Bot. To find out the commands on this bot type `)
        })
    })

    pell.onIncomingCall(async call=>{
        await pell.sendText(call.peerJid,'Sorry I cannot accept calls')
        .then(async () => {
            await pell.contactBlock(call.peerJid)
        })
    });
}

create(options(true, start))
    .then(start)
    .catch((err) => new Error(err))