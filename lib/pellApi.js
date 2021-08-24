const axios = require('axios')

const api1 = 'https://backend-ihsandevs.herokuapp.com/api/'
const api2 = 'https://hadi-api.herokuapp.com/api/'
const api3 = 'https://freerestapi-backend-py.herokuapp.com/'
const api4 = 'https://mhankbarbar.herokuapp.com/api/'

const tulis = async (teks) => new Promise((resolve, reject) => {
    axios.get(`${api1}Nulis?text=${encodeURIComponent(teks)}`)
        .then((res) => {
            resolve(`${res.data.result.path}`)
        })
        .catch((err) => {
            reject(err)
        })
})

const tulis2 = async (teks) => new Promise((resolve, reject) => {
    axios.get(`${api3}nulis?text=${encodeURIComponent(teks)}`)
        .then((res) => {
            resolve(`${res.data.result}`)
        })
        .catch((err) => {
            reject(err)
        })
})

const shortUrl = async (url) => new Promise((resolve, reject) => {
    axios.get(`${api2}bitly?url=${url}`)
        .then((res) => {
            if (res.data.status == false)
                return resolve(`${res.data.error}`)
            resolve(`${res.data.result}`)
        })
        .catch((err) => {
            reject(err)
        })
})

const chord = async (judul) => new Promise((resolve, reject) => {
    axios.get(`${api4}chord?q=${encodeURIComponent(judul)}`)
        .then((res) => {
            resolve(`${res.data.result}`)
        })
        .catch((err) => {
            reject(err)
        })
})



module.exports = {
    tulis,
    tulis2,
    shortUrl,
    chord
}