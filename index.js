const axios = require('axios')
const fs = require('fs')
const path = require('path')
const moment = require('moment')
const { convertArrayToCSV } = require('convert-array-to-csv');
const xlsx = require('xlsx')

let userAction = process.argv
userAction.shift()
userAction.shift()

fs.exists('output', exist => {
    if (!exist) {
        fs.mkdirSync('output')
    }
})

const type = userAction[0].toLocaleUpperCase()


const fetchHistoricalData = async (symbol, series, startDate, endDate) => {

    try {
        let symb = symbol.toLowerCase()
        symb = symb.replace('&', '%26')
        const url = `https://www.nseindia.com/api/historical/cm/equity?symbol=${symb}&series=["${series}"]&from=${startDate}&to=${endDate}`
        let cumData = []
        let data = await axios.get(url)
        let symbolArrayData = []
        data.data.data.map(values => {
            let symbolJsonData = {
                symbol: values.CH_SYMBOL,
                date: values.mTIMESTAMP,
                series: values.CH_SERIES,
                open: values.CH_OPENING_PRICE,
                high: values.CH_TRADE_HIGH_PRICE,
                low: values.CH_TRADE_LOW_PRICE,
                close: values.CH_CLOSING_PRICE,
                ltp: values.CH_LAST_TRADED_PRICE,
                previousClose: values.CH_PREVIOUS_CLS_PRICE,
                Week52High: values.CH_52WEEK_HIGH_PRICE,
                Week52Low: values.CH_52WEEK_LOW_PRICE,
                vwap: values.VWAP,
                tradeQty: values.CH_TOT_TRADED_QTY,
                tradeVal: values.CH_TOT_TRADED_VAL,
                totalTrades: values.CH_TOTAL_TRADES,
            }
            symbolArrayData.push(symbolJsonData)
        })

        return symbolArrayData

    } catch (err) {
        console.log(err.response.data.message)
        // setTimeout(() => fetchHistoricalData(symbol, series, startDate, endDate), 5000)
    }
}

const get1stHistoricalData = async (symbol) => {

    const toDate = moment().format('DD-MM-yyyy')
    const fromDate = moment().subtract(100, 'days').format('DD-MM-yyyy')

    let getSymbolInfo = await getSymbolData(symbol)
    let seriesses = getSymbolInfo.info.activeSeries

    if (seriesses.length > 0) {
        seriesses.map(series => {
            fetchHistoricalData(symbol, series, fromDate, toDate)
                .then(data => getFinalData(symbol, series, data))

        })
    } else {
        console.log('--------------------------------------------')
        console.log(`|  No Active Series Found for "${symbol}"  |`)
        console.log('--------------------------------------------')
    }
}

const getFinalData = async (symbol, series, cumData) => {

    let lastDate = cumData[cumData.length - 1].date
    const toDate = moment(new Date(lastDate).getTime()).subtract(1, 'days').format('DD-MM-yyyy')
    const fromDate = moment(new Date(lastDate).getTime()).subtract(100, 'days').format('DD-MM-yyyy')

    console.log(`"${symbol}" Data Fetched upto ${cumData[cumData.length - 1].date}`)
    let data = await fetchHistoricalData(symbol, series, fromDate, toDate)

    cumData = cumData.concat(data)

    if (data.length > 2) {
        setTimeout(() => getFinalData(symbol, series, cumData), 1000)
    } else {
        let newWb = xlsx.utils.book_new()
        let newWs = xlsx.utils.json_to_sheet(cumData)
        xlsx.utils.book_append_sheet(newWb, newWs, 'Historical data')
        xlsx.writeFile(newWb, path.join(__dirname, `./output/${symbol}.xlsx`))
    }

}


const getSymbolData = async (symbol) => {
    let symb = (symbol).toUpperCase()

    symb = symb.replace('&', '%26')
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${symb}`

    try {
        let data = await axios.get(url)
        return data.data

    } catch (err) {
        console.log(err)
    }

}

const findSymbol = async (text) => {
    const name = text.toLocaleUpperCase()
    const data = await axios.get(`https://www.nseindia.com/api/search/autocomplete?q=${name}`)
    data.data.symbols.map(results => {
        console.log(`${results.symbol} => ${results.activeSeries} => ${results.symbol_info}`)
    })
}

if (type == 'HISTORICALDATA') {
    const symbols = userAction[1].toUpperCase()
    symbols.split(',').map(symbol => get1stHistoricalData(symbol))

} else if (type == 'FINDSYMBOL') {
    const text = userAction[1].toUpperCase()
    findSymbol(text)
} else if (type == 'HELP') {
    console.log('To Find Symbols   =>   e.g. node index.js findsymbol bank')
    console.log('For Historical Data   =>   e.g. node index.js historicaldata sbin...,abb,...itc')
} else if (type == 'FROMSOURCE') {
    fs.readFile(path.join(__dirname, `./source/symbols.csv`), (err, data) => {
        let symbols = data.toString().split('\r\n')
        symbols.pop()
        symbols.map(symbol => get1stHistoricalData(symbol.trim()))
    })
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