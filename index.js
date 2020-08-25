const axios = require('axios')
const fs = require('fs')
const moment = require('moment')
const { convertArrayToCSV } = require('convert-array-to-csv');

let userAction = process.argv
userAction.shift()
userAction.shift()

const type = userAction[0].toLocaleUpperCase()
const symbol = userAction[1].toUpperCase()

const fetchHistoricalData = async (symbol, series, startDate, endDate) => {

    try {
        let symb = symbol.toLowerCase()
        symb = symb.replace('&', '%26')
        const url = `https://www.nseindia.com/api/historical/cm/equity?symbol=${symb}&series=["${series}"]&from=${startDate}&to=${endDate}`
        let cumData = []
        let data = await axios.get(url)

        return data.data.data

    } catch (err) {
        console.log(err.response.data.message)
        // setTimeout(() => fetchHistoricalData(symbol, series, startDate, endDate), 5000)
    }
}

const get1stHistoricalData = (symbol, series) => {

    const toDate = moment().format('DD-MM-yyyy')
    const fromDate = moment().subtract(100, 'days').format('DD-MM-yyyy')

    fetchHistoricalData(symbol, series, fromDate, toDate)
        .then(data => {
            getFinalData(symbol, series, data)
        })
}

const getFinalData = (symbol, series, cumData) => {

    let lastDate = cumData[cumData.length - 1].mTIMESTAMP
    const toDate = moment(new Date(lastDate).getTime()).subtract(1, 'days').format('DD-MM-yyyy')
    const fromDate = moment(new Date(lastDate).getTime()).subtract(100, 'days').format('DD-MM-yyyy')

    console.log(`"${symbol}" Data Fetched upto ${cumData[cumData.length - 1].mTIMESTAMP}`)
    fetchHistoricalData(symbol, series, fromDate, toDate)
        .then(data => {
            cumData = cumData.concat(data)
            if (data.length > 2) {
                getFinalData(symbol, series, cumData)
            } else {
                const csvData = convertArrayToCSV(cumData);
                fs.writeFileSync(`./output/${symbol}-historical-data.csv`, csvData)
            }
        })

}


const getSymbolSeries = async (symbol) => {
    let symb = (symbol).toUpperCase()

    symb = symb.replace('&', '%26')
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${symb}`

    try {
        let data = await axios.get(url)
        return data.data.metadata.series

    } catch (err) {
        console.log(err)
    }

}

if (type == 'HISTORICALDATA') {
    getSymbolSeries(symbol)
        .then(series => get1stHistoricalData(symbol, series))
}

const convertDateToTimeStamp = (date) => {
    let newDate = new Date(date).getTime()
    return newDate
}


const timeStamptoDate = (time) => {

    let d = new Date(time)
    let day = d.getDate()
    let mon = d.getMonth()
    let year = d.getFullYear()

    var monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    let date = `${day}-${monthNames[mon]}-${year}`
    return date
}

const sanitizeInputs = (value) => {
    value = parseFloat(value)
    if (isNaN(value)) { return 0 } else { return value }
}