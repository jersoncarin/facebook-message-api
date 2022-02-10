'use strict'

const utils = require('../utils')
const log = require('npmlog')

module.exports = function (defaultFuncs, api, ctx) {
  return function unsendMessage(postID, type, callback) {
    let resolveFunc = function () {}
    let rejectFunc = function () {}
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve
      rejectFunc = reject
    })

    if (!callback) {
      callback = function (err, friendList) {
        if (err) {
          return rejectFunc(err)
        }
        resolveFunc(friendList)
      }
    }

    const map = {
      like: 1,
      heart: 2,
      wow: 3,
      haha: 4,
      sad: 7,
      angry: 8,
    }
    if (typeof type != 'number') {
      type = map[type.toLocaleLowerCase()]
      if (!type) {
        type = 1
      }
    }
    const form = {
      av: ctx.userID,
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'UFI2FeedbackReactMutation',
      //This doc_id is valid as of January 17th, 2020
      doc_id: '2580813318646067',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '7',
          actor_id: ctx.userID,
          feedback_reaction: type,
        },
        useDefaultActor: true,
      }),
    }

    defaultFuncs
      .post('https://www.facebook.com/api/graphql/', ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (resData) {
        if (resData.error) {
          throw resData
        }

        return callback()
      })
      .catch(function (err) {
        log.error('setPostReaction', err)
        return callback(err)
      })

    return returnPromise
  }
}
