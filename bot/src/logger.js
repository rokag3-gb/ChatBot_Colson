const winston = require('winston')
const WinstonDaily = require('winston-daily-rotate-file')

const { combine, timestamp, printf, colorize } = winston.format

const logDir = 'logs'

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
}
winston.addColors(colors)

const level = () => {
  const env = process.env.NODE_ENV || 'development'
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : 'http'
}

// Log Format
const logFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message} \n Error Stack: ${info.stack}`
    }
    return `${info.timestamp} ${info.level}: ${info.message}`
  })
)

// 콘솔에 찍힐 때는 색깔을 구변해서 로깅해주자.
const consoleOpts = {
  handleExceptions: true,
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' })
  )
}

const transports = [
  new winston.transports.Console(consoleOpts),
  new WinstonDaily({
    level: 'info',
    datePattern: 'YYYY-MM-DD',
    dirname: logDir,
    filename: 'info.%DATE%.log',
    maxFiles: 30,
    zippedArchive: true
  }),
  new WinstonDaily({
    level: 'error',
    datePattern: 'YYYY-MM-DD',
    dirname: logDir,
    filename: 'error.%DATE%.log',
    maxFiles: 30,
    zippedArchive: true
  }),
]

const Logger = winston.createLogger({
  level: level(),
  format: logFormat,
  levels,
  transports
})

module.exports = Logger