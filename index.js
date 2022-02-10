const utils = require('./utils')
const crypt = require('./crypt')
const puppeteer = require('puppeteer')
const log = require('npmlog')
const Command = require('./src/command')
const fs = require('fs')

// Load dotenv config
require('dotenv').config()

const sessionPath = `${process.cwd()}/session`

// Parts of the application
const eventListeners = []
const eventMiddlewares = []
const commandMiddlewares = []
const commands = []
let appOptions = {}

const globalOptions = {
  selfListen: true,
  listenEvents: true,
  listenTyping: false,
  updatePresence: false,
  forceLogin: true,
  autoMarkDelivery: true,
  autoMarkRead: false,
  autoReconnect: true,
  logRecordSize: 100,
  online: true,
  emitReady: false,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/600.3.18 (KHTML, like Gecko) Version/8.0.3 Safari/600.3.18',
}

const setOptions = (globalOptions, options) => {
  Object.keys(options).map(function (key) {
    switch (key) {
      case 'online':
        globalOptions.online = Boolean(options.online)
        break
      case 'logLevel':
        log.level = options.logLevel
        globalOptions.logLevel = options.logLevel
        break
      case 'logRecordSize':
        log.maxRecordSize = options.logRecordSize
        globalOptions.logRecordSize = options.logRecordSize
        break
      case 'selfListen':
        globalOptions.selfListen = Boolean(options.selfListen)
        break
      case 'listenEvents':
        globalOptions.listenEvents = Boolean(options.listenEvents)
        break
      case 'pageID':
        globalOptions.pageID = options.pageID.toString()
        break
      case 'updatePresence':
        globalOptions.updatePresence = Boolean(options.updatePresence)
        break
      case 'userAgent':
        globalOptions.userAgent = options.userAgent
        break
      case 'autoMarkDelivery':
        globalOptions.autoMarkDelivery = Boolean(options.autoMarkDelivery)
        break
      case 'autoMarkRead':
        globalOptions.autoMarkRead = Boolean(options.autoMarkRead)
        break
      case 'listenTyping':
        globalOptions.listenTyping = Boolean(options.listenTyping)
        break
      case 'proxy':
        if (typeof options.proxy != 'string') {
          delete globalOptions.proxy
          utils.setProxy()
        } else {
          globalOptions.proxy = options.proxy
          utils.setProxy(globalOptions.proxy)
        }
        break
      case 'autoReconnect':
        globalOptions.autoReconnect = Boolean(options.autoReconnect)
        break
      case 'emitReady':
        globalOptions.emitReady = Boolean(options.emitReady)
        break
      default:
        log.warn('Option', 'Unrecognized option given to setOptions: ' + key)
        break
    }
  })
}

const buildAPI = (globalOptions, html, jar) => {
  // Check if the cookies is valid and can be run
  const maybeCookie = jar
    .getCookies('https://www.facebook.com')
    .filter(function (val) {
      return val.cookieString().split('=')[0] === 'c_user'
    })

  if (maybeCookie.length === 0) {
    throw {
      error:
        'Error while authenticating. This can be caused by getting blocked by Facebook for logging in from an unknown location or session state is expired.',
    }
  }

  if (html.indexOf('/checkpoint/block/?next') > -1) {
    log.warn(
      'login',
      'Checkpoint detected. Please log in with a browser to verify, make sure that you logged in this from trusted proxies or ip.'
    )
  }

  const userID = maybeCookie[0].cookieString().split('=')[1].toString()
  log.info('login', `Logged in as ${userID}`)

  const clientID = ((Math.random() * 2147483648) | 0).toString(16)

  const oldFBMQTTMatch = html.match(
    /irisSeqID:"(.+?)",appID:219994525426954,endpoint:"(.+?)"/
  )
  let mqttEndpoint = null
  let region = null
  let irisSeqID = null
  let noMqttData = null

  if (oldFBMQTTMatch) {
    irisSeqID = oldFBMQTTMatch[1]
    mqttEndpoint = oldFBMQTTMatch[2]
    region = new URL(mqttEndpoint).searchParams.get('region').toUpperCase()
    log.info('login', `Account has been fetch from region: ${region}`)
  } else {
    const newFBMQTTMatch = html.match(
      /{"app_id":"219994525426954","endpoint":"(.+?)","iris_seq_id":"(.+?)"}/
    )
    if (newFBMQTTMatch) {
      irisSeqID = newFBMQTTMatch[2]
      mqttEndpoint = newFBMQTTMatch[1].replace(/\\\//g, '/')
      region = new URL(mqttEndpoint).searchParams.get('region').toUpperCase()
      log.info('login', `Got this account's message region: ${region}`)
    } else {
      const legacyFBMQTTMatch = html.match(
        /(\["MqttWebConfig",\[\],{fbid:")(.+?)(",appID:219994525426954,endpoint:")(.+?)(",pollingEndpoint:")(.+?)(3790])/
      )
      if (legacyFBMQTTMatch) {
        mqttEndpoint = legacyFBMQTTMatch[4]
        region = new URL(mqttEndpoint).searchParams.get('region').toUpperCase()
        log.warn('login', `Cannot get sequence ID...`)
        log.info('login', `Account has been fetch from region: ${region}`)
        log.info(
          'login',
          `[Unused] Polling endpoint: ${legacyFBMQTTMatch[6]}, Note: Legacy FBMQTT Does not work, you must authenticate again to make it work.`
        )
      } else {
        log.warn(
          'login',
          'Cannot get MQTT region & sequence ID, please authenticate again.'
        )
        noMqttData = html
      }
    }
  }

  // All data available to api functions
  const ctx = {
    userID: userID,
    jar: jar,
    clientID: clientID,
    globalOptions: globalOptions,
    loggedIn: true,
    access_token: 'NONE',
    clientMutationId: 0,
    mqttClient: undefined,
    lastSeqId: irisSeqID,
    syncToken: undefined,
    mqttEndpoint,
    region,
    firstListen: true,
  }

  const api = {
    setOptions: setOptions.bind(null, globalOptions),
    getAppState: function getAppState() {
      return utils.getAppState(jar)
    },
  }

  if (noMqttData) {
    api['htmlData'] = noMqttData
  }

  const apiFuncNames = [
    'addExternalModule',
    'addUserToGroup',
    'changeAdminStatus',
    'changeArchivedStatus',
    'changeBio',
    'changeBlockedStatus',
    'changeGroupImage',
    'changeNickname',
    'changeThreadColor',
    'changeThreadEmoji',
    'createNewGroup',
    'createPoll',
    'deleteMessage',
    'deleteThread',
    'forwardAttachment',
    'getCurrentUserID',
    'getEmojiUrl',
    'getFriendsList',
    'getThreadHistory',
    'getThreadInfo',
    'getThreadList',
    'getThreadPictures',
    'getUserID',
    'getUserInfo',
    'handleMessageRequest',
    'listenMqtt',
    'logout',
    'markAsDelivered',
    'markAsRead',
    'markAsReadAll',
    'markAsSeen',
    'muteThread',
    'removeUserFromGroup',
    'resolvePhotoUrl',
    'searchForThread',
    'sendMessage',
    'sendTypingIndicator',
    'setMessageReaction',
    'setTitle',
    'threadColors',
    'unsendMessage',
    'httpGet',
    'httpPost',
  ]

  const defaultFuncs = utils.makeDefaults(html, userID, ctx)

  // Load all api functions in a loop
  apiFuncNames.map(function (v) {
    api[v] = require('./src/' + v)(defaultFuncs, api, ctx)
  })

  // listen doesn't work anymore so we use listenMqtt to handle the event listening
  api.listen = api.listenMqtt

  return [ctx, defaultFuncs, api]
}

const start = (credentials, options, callback) => {
  if (
    utils.getType(options) === 'Function' ||
    utils.getType(options) === 'AsyncFunction'
  ) {
    callback = options
    options = {}
  }

  setOptions(globalOptions, options)

  let returnPromise
  let prCallback

  if (
    utils.getType(callback) !== 'Function' &&
    utils.getType(callback) !== 'AsyncFunction'
  ) {
    let rejectFunc = null
    let resolveFunc = null
    returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve
      rejectFunc = reject
    })
    prCallback = function (error, api) {
      if (error) {
        return rejectFunc(error)
      }
      return resolveFunc(api)
    }
    callback = prCallback
  }

  const jar = utils.getJar()

  if (!credentials.state) {
    throw {
      error:
        'Error while authenticating. Please make sure that login state is not expired.',
    }
  }

  credentials.state.forEach(function (c) {
    const str =
      c.key +
      '=' +
      c.value +
      '; expires=' +
      c.expires +
      '; domain=' +
      c.domain +
      '; path=' +
      c.path +
      ';'
    jar.setCookie(str, 'http://' + c.domain)
  })

  utils
    .get('https://www.facebook.com/', jar, null, globalOptions, { noRef: true })
    .then(utils.saveCookies(jar))
    .then((res) => {
      const reg = /<meta http-equiv="refresh" content="0;url=([^"]+)[^>]+>/i
      const redirect = reg.exec(res.body)
      if (redirect && redirect[1]) {
        return utils
          .get(redirect[1], jar, null, globalOptions)
          .then(utils.saveCookies(jar))
      }
      return res
    })
    .then(function (res) {
      const stuff = buildAPI(globalOptions, res.body, jar)
      const ctx = stuff[0]
      const _defaultFuncs = stuff[1]
      const api = stuff[2]
      return { ctx, _defaultFuncs, api, res }
    })
    .then(async ({ ctx, _defaultFuncs, api, oldRes }) => {
      if (globalOptions.pageID) {
        return utils
          .get(
            'https://www.facebook.com/' +
              ctx.globalOptions.pageID +
              '/messages/?section=messages&subsection=inbox',
            ctx.jar,
            null,
            globalOptions
          )
          .then(function (resData) {
            const url = utils
              .getFrom(
                resData.body,
                'window.location.replace("https:\\/\\/www.facebook.com\\',
                '");'
              )
              .split('\\')
              .join('')
              .substring(0, url.length - 1)

            const res = utils.get(
              'https://www.facebook.com' + url,
              ctx.jar,
              null,
              globalOptions
            )

            return { res, ctx, api, _defaultFuncs }
          })
      }
      return { res: oldRes, ctx, api, _defaultFuncs }
    })
    .then(function (data) {
      log.info('login', 'Done logging in.')
      return callback(null, data.api)
    })
    .catch(function (e) {
      log.error('login', e.error || e)
      callback(e)
    })

  return returnPromise
}

const getSession = (useKey = false) => {
  try {
    if (!fs.existsSync(sessionPath)) {
      throw new Error()
    }
    const session = fs.readFileSync(sessionPath, { encoding: 'utf8' })

    if (!useKey) {
      return JSON.parse(crypt.decrypt(session)).map(({ key, ...rest }) => ({
        name: key,
        ...rest,
      }))
    }

    return JSON.parse(crypt.decrypt(session))
  } catch (e) {
    throw new Error('Cookies parse error, make sure that cookies is valid.')
  }
}

const setSession = (cookies) => {
  try {
    fs.writeFileSync(
      sessionPath,
      crypt.encrypt(JSON.stringify(cookies)),
      'utf8'
    )
  } catch (e) {
    throw new Error('Error while saving session state, please try again.')
  }
}

const isCookiesValid = async (browser) => {
  try {
    const session = getSession()
    const page = await browser.newPage()
    await page.setCookie(...session)
    await page.goto('https://mbasic.facebook.com')

    log.info('login', 'Checking if the session is not expired.')

    const isLoggedIn = await page.$('#mbasic-composer-form')

    if (!isLoggedIn) {
      log.error('login', 'Session is expired.')
      return false
    }

    return page
  } catch (err) {
    return false
  }
}

const authenticate = async ({ username, password }) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
    })

    log.info('fetch', 'Emulating facebook login.')

    const pageValidator = await isCookiesValid(browser)

    if (pageValidator) {
      const cookies = (await pageValidator.cookies()).map(
        ({ name: key, ...rest }) => ({
          key,
          ...rest,
        })
      )

      log.info('login', 'Getting new refresh session token.')

      setSession(cookies)

      await browser.close()

      return
    }

    const page = await browser.newPage()
    await page.goto('https://mbasic.facebook.com')

    await page.type('input[name="email"]', username)
    await page.type('input[name="pass"]', password)
    await page.click('input[name="login"]')

    const url = page.url()

    log.info('login', 'Authenticating facebook session.')

    if (!url.includes('login/save-device/?login_source')) {
      await browser.close()

      throw new Error(
        'Invalid username or password, please try again.\nNote: please disable your two factor authentication.'
      )
    }

    // Hacky part to fetch the fresh cookies
    await page.goto('https://mbasic.facebook.com')

    const cookies = (await page.cookies()).map(({ name: key, ...rest }) => ({
      key,
      ...rest,
    }))

    log.info('login', 'Saving session into encrypted file.')

    setSession(cookies)

    await browser.close()
  } catch (err) {
    log.error(
      'login',
      'Error while launching emulated browser, please try again later.'
    )
    process.exit()
  }
}

const startService = async (options) => {
  if (!process.env.EMAIL || !process.env.PASSWORD) {
    throw new Error(
      'No credential provider in environment variables or in the .env file.'
    )
  }

  await authenticate({
    username: process.env.EMAIL,
    password: process.env.PASSWORD,
  })

  const state = getSession(true)

  log.info('login', 'Starting service.')

  await start({ state }, options, (err, api) => {
    if (err) return log.error('error', err)

    utils.runEventListener(eventListeners, 'init', api)

    const interval = 18000000
    // Run every 5 hrs again and again
    // No need cron for this.
    setInterval(() => {
      process.on('exit', () => {
        utils.runEventListener(eventListeners, 'restarting', api)
      })
      // Fire process exit so this will be shutdown the script
      process.exit()
    }, interval)

    const parseCommands = commands.map((e) => e.parse())

    api.listen((err, event) => {
      if (err) {
        utils.runEventListener(eventListeners, 'listeningError', api)
        console.log(err)
        return err
      }

      eventListeners.forEach((listener) => {
        const eventCallback = () => {
          return async (event, api, option) => {
            return listener.callback(event, api, option)
          }
        }

        const type = listener.name

        if (
          type === '*' ||
          type
            .split('|')
            .find((e) => e.toLowerCase().trim().includes(event.type))
        ) {
          utils.pipeline([...eventMiddlewares, eventCallback], event, api, {
            ...listener.args,
            ...appOptions,
          })
        }
      })

      parseCommands.forEach((command) => {
        const commandCallback = () => {
          return async (matches, event, api, option) => {
            return command.callback(matches, event, api, option)
          }
        }

        if (
          typeof command.callback === 'function' &&
          event.body !== undefined
        ) {
          const prefix = event.body.substring(0, 1)
          const commandPrefix = command.prefix
            ? command.prefix
            : appOptions.prefix === undefined
            ? command.options.prefix === undefined
              ? '/'
              : command.options.prefix
            : appOptions.prefix

          const handleMatches =
            appOptions.handleMatches === undefined
              ? command.options.handleMatches === undefined
                ? false
                : command.options.handleMatches
              : appOptions.handleMatches

          if (command.name === undefined) {
            throw new Error(
              'No command name found, make sure you add command name.'
            )
          }

          const pos = event.body.indexOf(' ')

          let name

          if (pos === -1) {
            name = event.body.substring(1).trim()
          } else {
            name = event.body.substring(1, pos).trim()
          }

          const bodyPos = (prefix + name).length

          const body = event.body.substring(bodyPos + 1).trim()
          const pattern = command.pattern ? command.pattern.pattern : ''

          const re = new RegExp(pattern, 'gim')
          const matches = utils.multilineRegex(re, body)

          const patternMatched =
            command.pattern === null
              ? true
              : matches.length !== 0 && body.length !== 0

          if (
            ((name === command.name || command.alias.includes(name)) &&
              prefix === commandPrefix &&
              patternMatched) ||
            handleMatches
          ) {
            const commandMatches = command.pattern
              ? command.pattern.matches
              : null

            const filteredMatches = matches.slice(1)
            let patternMatches = {}

            filteredMatches.forEach((match, index) => {
              if (
                Array.isArray(commandMatches) &&
                commandMatches[index] !== undefined
              ) {
                patternMatches = {
                  ...patternMatches,
                  [commandMatches[index]]: match,
                }
              } else {
                patternMatches = {
                  ...patternMatches,
                  [`match_${index + 1}`]: match,
                }
              }
            })

            utils.pipeline(
              [...commandMiddlewares, ...command.middlewares, commandCallback],
              patternMatches,
              event,
              api,
              {
                ...appOptions,
                ...command.options,
                prefix: commandPrefix,
                handleMatches,
                usage: command.usage,
                name: command.name,
                description: command.description,
                middlewares: [...commandMiddlewares, ...command.middlewares],
                pattern: command.pattern ? command.pattern : null,
                aliases: command.alias,
                body,
              }
            )
          }
        }
      })
    })
  })
}

const init = (options = {}) => {
  Object.keys(options)
    .filter((x) => !Object.keys(globalOptions).includes(x))
    .forEach((keys) => {
      if (options[keys] !== undefined) {
        appOptions = { ...appOptions, [`${keys}`]: options[keys] }
      }
    })

  let globalOption = {}

  Object.keys(globalOptions)
    .filter((x) => Object.keys(options).includes(x))
    .forEach((keys) => {
      if (options[keys] !== undefined) {
        globalOption = { ...globalOption, [`${keys}`]: options[keys] }
      }
    })

  startService(globalOption)
}

const on = (name, listener, ...args) =>
  eventListeners.push({ name, callback: listener, args })

const addEventMiddleware = (...middleware) =>
  eventMiddlewares.push(...middleware)

const addCommandMiddleware = (...middleware) =>
  commandMiddlewares.push(...middleware)

const add = (command) => {
  const instance = new Command(command)
  commands.push(instance)
  return instance
}

module.exports = {
  init,
  on,
  add,
  addEventMiddleware,
  addCommandMiddleware,
}
