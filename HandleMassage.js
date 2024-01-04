const {
    decryptMedia
} = require('@open-wa/wa-automate')
const fs = require('fs-extra')
const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
const {
    exec
} = require('child_process')
const {
    removeBackgroundFromImageBase64
} = require('remove.bg')


const setting = JSON.parse(fs.readFileSync('./settings/settings.json'))
const banned = JSON.parse(fs.readFileSync('./settings/banned.json'))

let {
    ownerNumber,
    groupLimit,
    memberLimit,
    prefix,
    apiNoBg
} = setting

const {
    msgFilter,
    color,
    processTime,
    isUrl,
    download
} = require('./utils')

const {
    menuId,
    pellapi
} = require('./lib')


module.exports = HandleMsg = async (pell, message) => {
    try {
        const {
            type,
            id,
            from,
            t,
            sender,
            author,
            isGroupMsg,
            chat,
            chatId,
            caption,
            isMedia,
            mimetype,
            quotedMsg,
            quotedMsgObj,
            mentionedJidList
        } = message
        let {
            body
        } = message
        var {
            name,
            formattedTitle
        } = chat
        let {
            pushname,
            verifiedName,
            formattedName
        } = sender
        const pengirim = sender.id
        const isOwnerBot = ownerNumber.includes(pengirim)
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'
        const botNumber = await pell.getHostNumber() + '@c.us'
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await pell.getGroupAdmins(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(pengirim) || false
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false

        body = (type === 'chat' && body.startsWith(prefix)) ? body : ((type === 'image' && caption || type === 'video' && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const args = body.trim().split(/ +/).slice(1)
        const chats = (type === 'chat') ? body : (type === 'image' || type === 'video') ? caption : ''
        const url = args.length !== 0 ? args[0] : ''
        const uaOverride = process.env.UserAgent

        const isBanned = banned.includes(pengirim)
        const isCmd = body.startsWith(prefix)

        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) {
            return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
        }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) {
            return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle))
        }

        if (isCmd && !isGroupMsg) {
            console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
        }
        if (isCmd && isGroupMsg) {
            console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle))
        }

        if (isBanned) {
            return console.log(color('[BAN]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
        }

        switch (command) {
            case 'menu':
            case 'help':
                await pell.sendText(from, menuId.textMenu(pushname))
                    .then(() => ((isGroupMsg) && (isGroupAdmins)) ? pell.sendText(from, `Menu Admin Grup: *${prefix}menuadmin*`) : null)
                break;
            case 'menuadmin':
                await pell.sendText(from, menuId.textAdmin())
                    .then(() => ((isGroupMsg) && (isGroupAdmins)) ? pell.sendText(from, `Menu Admin Grup: *${prefix}menuadmin*`) : null)
                break;
            case 'ping':
                await pell.sendText(from, `Pong!!!!\nSpeed: ${processTime(t, moment())} _Second_`)
                break;
                // Creator Menu
            case 'sticker':
            case 'stiker':
                if ((isMedia || isQuotedImage) && args.length === 0) {
                    const encryptMedia = isQuotedImage ? quotedMsg : message
                    const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                    const mediaData = await decryptMedia(encryptMedia, uaOverride)
                    const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                    pell.sendImageAsSticker(from, imageBase64)
                        .then(() => {
                            pell.reply(from, 'Ini stiker anda')
                            console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                        })
                } else if (args[0] === 'nobg') {
                    if (isMedia || isQuotedImage) {
                        try {
                            var mediaData = await decryptMedia(message, uaOverride)
                            var imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                            var base64img = imageBase64
                            var outFile = './media/noBg.png'
                            // kamu dapat mengambil api key dari website remove.bg dan ubahnya difolder settings/api.json
                            var result = await removeBackgroundFromImageBase64({
                                base64img,
                                apiKey: apiNoBg,
                                size: 'auto',
                                type: 'auto',
                                outFile
                            })
                            await fs.writeFile(outFile, result.base64img)
                            await pell.sendImageAsSticker(from, `data:${mimetype};base64,${result.base64img}`)
                        } catch (err) {
                            console.log(err)
                            await pell.reply(from, 'Maaf batas penggunaan hari ini sudah mencapai maksimal', id)
                        }
                    }
                } else if (args.length === 1) {
                    if (!isUrl(url)) {
                        await pell.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id)
                    }
                    pell.sendStickerfromUrl(from, url).then((r) => (!r && r !== undefined) ?
                        pell.sendText(from, 'Maaf, link yang kamu kirim tidak memuat gambar.') :
                        pell.reply(from, 'Ini stiker anda')).then(() => console.log(`Sticker Processed for ${processTime(t, moment())} Second`))
                } else {
                    await pell.reply(from, `Tidak ada gambar! Untuk menggunakan ${prefix}sticker\n\n\nKirim gambar dengan caption\n${prefix}sticker <biasa>\n${prefix}sticker nobg <tanpa background>\n\natau Kirim pesan dengan\n${prefix}sticker <link_gambar>`, id)
                }
                break;
            case 'stikertoimg':
            case 'stickertoimg':
            case 'stimg':
                if (quotedMsg && quotedMsg.type == 'sticker') {
                    const mediaData = await decryptMedia(quotedMsg)
                    pell.reply(from, `Sedang di proses! Silahkan tunggu sebentar...`, id)
                    const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                    await pell.sendFile(from, imageBase64, 'imgsticker.jpg', 'Berhasil convert Sticker to Image!', id)
                        .then(() => {
                            console.log(`Sticker to Image Processed for ${processTime(t, moment())} Seconds`)
                        })
                } else if (!quotedMsg) {
                    pell.reply(from, `Format salah, silahkan tag sticker yang ingin dijadikan gambar!`, id)
                } else return pell.reply(from, `Format salah, silahkan tag sticker yang ingin dijadikan gambar!`, id)
                break;
            case 'stickergif':
            case 'stikergif':
                if (isMedia || isQuotedVideo) {
                    if (mimetype === 'video/mp4' && message.duration < 10 || mimetype === 'image/gif' && message.duration < 10) {
                        var mediaData = await decryptMedia(message, uaOverride)
                        pell.reply(from, '[WAIT] Sedang di proses⏳ silahkan tunggu ± 1 min!', id)
                        var filename = `./media/stickergif.${mimetype.split('/')[1]}`
                        await fs.writeFileSync(filename, mediaData)
                        await exec(`gify ${filename} ./media/stickergf.gif --fps=30 --scale=240:240`, async function (error, stdout, stderr) {
                            var gif = await fs.readFileSync('./media/stickergf.gif', {
                                encoding: "base64"
                            })
                            await pell.sendImageAsSticker(from, `data:image/gif;base64,${gif.toString('base64')}`)
                                .catch(() => {
                                    pell.reply(from, 'Maaf filenya terlalu besar!', id)
                                })
                        })
                    } else {
                        pell.reply(from, `[❗] Kirim gif dengan caption *${prefix}stickergif* max 10 sec!`, id)
                    }
                } else {
                    pell.reply(from, `[❗] Kirim gif dengan caption *${prefix}stickergif*`, id)
                }
                break
            case 'stikergiphy':
            case 'stickergiphy':
                if (args.length !== 1) return pell.reply(from, `Maaf, format pesan salah.\nKetik pesan dengan ${prefix}stickergiphy <link_giphy>`, id)
                const isGiphy = url.match(new RegExp(/https?:\/\/(www\.)?giphy.com/, 'gi'))
                const isMediaGiphy = url.match(new RegExp(/https?:\/\/media.giphy.com\/media/, 'gi'))
                if (isGiphy) {
                    const getGiphyCode = url.match(new RegExp(/(\/|\-)(?:.(?!(\/|\-)))+$/, 'gi'))
                    if (!getGiphyCode) {
                        return pell.reply(from, 'Gagal mengambil kode giphy', id)
                    }
                    const giphyCode = getGiphyCode[0].replace(/[-\/]/gi, '')
                    const smallGifUrl = 'https://media.giphy.com/media/' + giphyCode + '/giphy-downsized.gif'
                    pell.sendGiphyAsSticker(from, smallGifUrl).then(() => {
                        pell.reply(from, 'Here\'s your sticker')
                        console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                    }).catch((err) => console.log(err))
                } else if (isMediaGiphy) {
                    const gifUrl = url.match(new RegExp(/(giphy|source).(gif|mp4)/, 'gi'))
                    if (!gifUrl) {
                        return pell.reply(from, 'Gagal mengambil kode giphy', id)
                    }
                    const smallGifUrl = url.replace(gifUrl[0], 'giphy-downsized.gif')
                    pell.sendGiphyAsSticker(from, smallGifUrl)
                        .then(() => {
                            pell.reply(from, 'Here\'s your sticker')
                            console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                        })
                        .catch(() => {
                            pell.reply(from, `Ada yang error!`, id)
                        })
                } else {
                    await pell.reply(from, 'Maaf, command sticker giphy hanya bisa menggunakan link dari giphy.  [Giphy Only]', id)
                }
                break

                // Admin Group Menu
            case 'grouplink':
                if (!isBotGroupAdmins) return pell.reply(from, 'Perintah ini hanya bisa di gunakan ketika bot menjadi admin', id)
                if (isGroupMsg) {
                    const inviteLink = await pell.getGroupInviteLink(groupId);
                    pell.sendLinkWithAutoPreview(from, inviteLink, `\nLink group *${name}* Gunakan *${prefix}revoke* untuk mereset Link group`)
                } else {
                    pell.reply(from, 'Perintah ini hanya bisa di gunakan dalam group!', id)
                }
                break;
            case "revoke":
                if (!isBotGroupAdmins) return pell.reply(from, 'Perintah ini hanya bisa di gunakan ketika bot menjadi admin', id)
                if (isBotGroupAdmins) {
                    pell
                        .revokeGroupInviteLink(from)
                        .then((res) => {
                            pell.reply(from, `Berhasil Revoke Grup Link gunakan *${prefix}grouplink* untuk mendapatkan group invite link yang terbaru`, id);
                        })
                        .catch((err) => {
                            console.log(`[ERR] ${err}`);
                        });
                }
                break;
            case 'add':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                if (!isBotGroupAdmins) return pell.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                if (args.length !== 1) return pell.reply(from, `Untuk menggunakan ${prefix}add\nPenggunaan: ${prefix}add <nomor>\ncontoh: ${prefix}add 628xxx`, id)
                try {
                    await pell.addParticipant(from, `${args[0]}@c.us`)
                } catch {
                    pell.reply(from, 'Tidak dapat menambahkan target', id)
                }
                break
            case 'kick':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                if (!isBotGroupAdmins) return pell.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                if (mentionedJidList.length === 0) return pell.reply(from, 'Maaf, format pesan salah.\nSilahkan tag satu atau lebih orang yang akan dikeluarkan', id)
                if (mentionedJidList[0] === botNumber) return await pell.reply(from, 'Maaf, format pesan salah.\nTidak dapat mengeluarkan akun bot sendiri', id)
                await pell.sendTextWithMentions(from, `Request diterima, mengeluarkan:\n${mentionedJidList.map(x => `@${x.replace('@c.us', '')}`).join('\n')}`)
                for (let i = 0; i < mentionedJidList.length; i++) {
                    if (groupAdmins.includes(mentionedJidList[i])) return await pell.sendText(from, 'Gagal, kamu tidak bisa mengeluarkan admin grup.')
                    await pell.removeParticipant(groupId, mentionedJidList[i])
                }
                break
            case 'promote':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                if (!isBotGroupAdmins) return pell.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                if (mentionedJidList.length !== 1) return pell.reply(from, 'Maaf, hanya bisa mempromote 1 user', id)
                if (groupAdmins.includes(mentionedJidList[0])) return await pell.reply(from, 'Maaf, user tersebut sudah menjadi admin.', id)
                if (mentionedJidList[0] === botNumber) return await pell.reply(from, 'Maaf, format pesan salah.\nTidak dapat mempromote akun bot sendiri', id)
                await pell.promoteParticipant(groupId, mentionedJidList[0])
                await pell.sendTextWithMentions(from, `Request diterima, menambahkan @${mentionedJidList[0].replace('@c.us', '')} sebagai admin.`)
                break
            case 'demote':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                if (!isBotGroupAdmins) return pell.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                if (mentionedJidList.length !== 1) return pell.reply(from, 'Maaf, hanya bisa mendemote 1 user', id)
                if (!groupAdmins.includes(mentionedJidList[0])) return await pell.reply(from, 'Maaf, user tersebut belum menjadi admin.', id)
                if (mentionedJidList[0] === botNumber) return await pell.reply(from, 'Maaf, format pesan salah.\nTidak dapat mendemote akun bot sendiri', id)
                await pell.demoteParticipant(groupId, mentionedJidList[0])
                await pell.sendTextWithMentions(from, `Request diterima, menghapus jabatan @${mentionedJidList[0].replace('@c.us', '')}.`)
                break
            case 'join':
                if (args.length == 0) return pell.reply(from, `Jika kalian ingin mengundang bot kegroup silahkan invite atau dengan\nketik ${prefix}join [link group]`, id)
                let linkgrup = body.slice(6)
                let islink = linkgrup.match(/(https:\/\/chat.whatsapp.com)/gi)
                let chekgrup = await pell.inviteInfo(linkgrup)
                if (!islink) return pell.reply(from, 'Maaf link group-nya salah! silahkan kirim link yang benar', id)
                if (isOwnerBot) {
                    await pell.joinGroupViaLink(linkgrup)
                        .then(async () => {
                            await pell.sendText(from, 'Berhasil join grup via link!')
                            await pell.sendText(chekgrup.id, `Hai minna~, Im pell Bot. To find out the commands on this Bot type ${prefix}menu`)
                        })
                } else {
                    let cgrup = await pell.getAllGroups()
                    if (cgrup.length > groupLimit) return pell.reply(from, `Sorry, the group on this bot is full\nMax Group is: ${groupLimit}`, id)
                    if (cgrup.size < memberLimit) return pell.reply(from, `Sorry, Bot wil not join if the group members do not exceed ${memberLimit} people`, id)
                    await pell.joinGroupViaLink(linkgrup)
                        .then(async () => {
                            await pell.reply(from, 'Berhasil join grup via link!', id)
                        })
                        .catch(() => {
                            pell.reply(from, 'Gagal!', id)
                        })
                }
                break
            case 'bye':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                pell.sendText(from, 'Good bye... ( ⇀‸↼‶ )').then(() => pell.leaveGroup(groupId))
                break
            case 'del':
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                if (!quotedMsg) return pell.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}del`, id)
                if (!quotedMsgObj.fromMe) return pell.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}del`, id)
                pell.deleteMessage(quotedMsgObj.chatId, quotedMsgObj.id, false)
                break
            case 'tagall':
            case 'everyone':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                const groupMem = await pell.getGroupMembers(groupId)
                let hehex = '╔══✪〘 Mention All 〙✪══\n'
                for (let i = 0; i < groupMem.length; i++) {
                    hehex += '╠➥'
                    hehex += ` @${groupMem[i].id.replace(/@c.us/g, '')}\n`
                }
                hehex += '╚═〘 *P E L L  B O T* 〙'
                await pell.sendTextWithMentions(from, hehex)
                break
            case 'mutegrup':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                if (!isBotGroupAdmins) return pell.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                if (args.length !== 1) return pell.reply(from, `Untuk mengubah settingan group chat agar hanya admin saja yang bisa chat\n\nPenggunaan:\n${prefix}mutegrup on --aktifkan\n${prefix}mutegrup off --nonaktifkan`, id)
                if (args[0] == 'on') {
                    pell.setGroupToAdminsOnly(groupId, true).then(() => pell.sendText(from, 'Berhasil mengubah agar hanya admin yang dapat chat!'))
                } else if (args[0] == 'off') {
                    pell.setGroupToAdminsOnly(groupId, false).then(() => pell.sendText(from, 'Berhasil mengubah agar semua anggota dapat chat!'))
                } else {
                    pell.reply(from, `Untuk mengubah settingan group chat agar hanya admin saja yang bisa chat\n\nPenggunaan:\n${prefix}mutegrup on --aktifkan\n${prefix}mutegrup off --nonaktifkan`, id)
                }
                break
            case 'setprofile':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                if (!isGroupAdmins) return pell.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
                if (!isBotGroupAdmins) return pell.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                if (isMedia && type == 'image' || isQuotedImage) {
                    const dataMedia = isQuotedImage ? quotedMsg : message
                    const _mimetype = dataMedia.mimetype
                    const mediaData = await decryptMedia(dataMedia, uaOverride)
                    const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                    await pell.setGroupIcon(groupId, imageBase64)
                } else if (args.length === 1) {
                    if (!isUrl(url)) {
                        await pell.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id)
                    }
                    pell.setGroupIconByUrl(groupId, url).then((r) => (!r && r !== undefined) ?
                        pell.reply(from, 'Maaf, link yang kamu kirim tidak memuat gambar.', id) :
                        pell.reply(from, 'Berhasil mengubah profile group', id))
                } else {
                    pell.reply(from, `Commands ini digunakan untuk mengganti icon/profile group chat\n\n\nPenggunaan:\n1. Silahkan kirim/reply sebuah gambar dengan caption ${prefix}setprofile\n\n2. Silahkan ketik ${prefix}setprofile linkImage`)
                }
                break
            case 'kickall':
                if (!isGroupMsg) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
                let isOwner = chat.groupMetadata.owner == pengirim
                if (!isOwner) return pell.reply(from, 'Maaf, perintah ini hanya dapat dipakai oleh owner grup!', id)
                if (!isBotGroupAdmins) return pell.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
                const allMem = await pell.getGroupMembers(groupId)
                for (let i = 0; i < allMem.length; i++) {
                    if (groupAdmins.includes(allMem[i].id)) {

                    } else {
                        await pell.removeParticipant(groupId, allMem[i].id)
                    }
                }
                pell.reply(from, 'Success kick all member', id)
                break

                // Owner Bot Menu
            case 'bc':
                if (!isOwnerBot) return pell.reply(from, 'Perintah ini hanya untuk Owner bot!', id)
                if (args.length == 0) return pell.reply(from, `Untuk broadcast ke semua chat ketik:\n${prefix}bc [isi chat]`)
                let msg = body.slice(4)
                const chatz = await pell.getAllChatIds()
                for (let idk of chatz) {
                    var cvk = await pell.getChatById(idk)
                    if (!cvk.isReadOnly) pell.sendText(idk, `${msg}`)
                    if (cvk.isReadOnly) pell.sendText(idk, `${msg}`)
                }
                pell.reply(from, 'Broadcast Berhasil!', id)
                break
            case 'leaveall':
                if (!isOwnerBot) return pell.reply(from, 'Perintah ini hanya untuk Owner bot', id)
                const allChatz = await pell.getAllChatIds()
                const allGroupz = await pell.getAllGroups()
                for (let gclist of allGroupz) {
                    await pell.sendText(gclist.contact.id, `Maaf bot sedang pembersihan, total chat aktif : ${allChatz.length}`)
                    await pell.leaveGroup(gclist.contact.id)
                    await pell.deleteChat(gclist.contact.id)
                }
                pell.reply(from, 'Berhasil keluar semua grup!', id)
                break
            case 'clearall':
                if (!isOwnerBot) return pell.reply(from, 'Perintah ini hanya untuk Owner bot', id)
                const allChatx = await pell.getAllChats()
                for (let dchat of allChatx) {
                    await pell.deleteChat(dchat.id)
                }
                pell.reply(from, 'Berhasil membersihkan chat!', id)
                break
            case 'ban':
                if (!isOwnerBot) return pell.reply(from, 'Perintah ini hanya untuk Owner bot!', id)
                if (args.length == 0) return pell.reply(from, `Untuk banned seseorang agar tidak bisa menggunakan commands\n\nCaranya ketik: \n${prefix}ban add 628xx --untuk mengaktifkan\n${prefix}ban del 628xx --untuk nonaktifkan\n\ncara cepat ban banyak digrup ketik:\n${prefix}ban @tag @tag @tag`, id)
                if (args[0] == 'add') {
                    banned.push(args[1] + '@c.us')
                    fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                    pell.reply(from, 'Berhasil banned target!')
                } else
                if (args[0] == 'del') {
                    let xnxx = banned.indexOf(args[1] + '@c.us')
                    banned.splice(xnxx, 1)
                    fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                    pell.reply(from, 'Berhasil unbanned target!')
                } else {
                    for (let i = 0; i < mentionedJidList.length; i++) {
                        banned.push(mentionedJidList[i])
                        fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                        pell.reply(from, 'Berhasil banned target!', id)
                    }
                }
                break
            case 'botstat': 
                const loadedMsg = await pell.getAmountOfLoadedMessages()
                const chatIds = await pell.getAllChatIds()
                const groups = await pell.getAllGroups()
                pell.sendText(from, `Status :\n- *${loadedMsg}* Loaded Messages\n- *${groups.length}* Group Chats\n- *${chatIds.length - groups.length}* Personal Chats\n- *${chatIds.length}* Total Chats`)
                break


            case 'nulis':
                if (args.length == 0) return pell.reply(from, `Membuat bot menulis teks yang dikirim menjadi gambar\nPemakaian: ${prefix}nulis [teks]\n\ncontoh: ${prefix}nulis i love you 3000`, id)
                const nulisq2 = body.slice(7)
                const nulisp2 = await pellapi.tulis(nulisq2)
                await pell.sendImage(from, `${nulisp2}`, '', 'Nih...', id)
                    .catch(() => {
                        pell.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'nulis2':
                if (args.length == 0) return pell.reply(from, `Membuat bot menulis teks yang dikirim menjadi gambar\nPemakaian: ${prefix}nulis2 [teks]\n\ncontoh: ${prefix}nulis i love you 3000`, id)
                const nulisq = body.slice(8)
                const nulisp = await pellapi.tulis2(nulisq)
                await pell.sendImage(from, `${nulisp}`, '', 'Nih...', id)
                    .catch(() => {
                        pell.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'shortlink':
                if (args.length == 0)
                    return pell.reply(from, `Membuat bot short link\nPemakaian: ${prefix}shortlink [url]\n\ncontoh: ${prefix}shortlink https://google.com`, id)
                const url = body.slice(11)
                if (!isUrl(url))
                    return pell.reply(from, `Membuat bot short link\nPemakaian: ${prefix}shortlink [url]\n\ncontoh: ${prefix}shortlink https://google.com`, id)
                const resLink = await pellapi.shortUrl(url)
                pell.sendText(from, resLink, id)
                break
            case 'chord':
                if (args.length == 0)
                    return pell.reply(from, `Untuk mencari lirik dan chord dari sebuah lagu\n\nPemakaian: ${prefix}chord [judul]\n\ncontoh: ${prefix}chord aku bukan boneka`, id)
                const chord = body.slice(7)
                const resChort = await pellapi.chord(chord);
                pell.sendText(from, resChort, id)
                break
        }

    } catch (err) {
        console.log('Error => ', err)
    }
}