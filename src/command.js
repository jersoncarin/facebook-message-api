class Command {
  constructor(command) {
    this.command = command
    this.options = {}
    this.name = null
    this.description = null
    this.prefix = null
    this.middlewares = []
    this.pattern = null
    this.alias = []
    this.usage = null
  }

  addOption(option) {
    this.options = option
    return this
  }

  addName(name) {
    this.name = name
    return this
  }

  addDescription(desc) {
    this.description = desc
    return this
  }

  withPrefix(prefix) {
    this.prefix = prefix
    return this
  }

  addUsage(usage) {
    this.usage = usage
    return this
  }

  addMiddleware(...middleware) {
    this.middlewares.push(...middleware)
    return this
  }

  addPattern(pattern, matches = null) {
    this.pattern = { pattern, matches }
    return this
  }

  addAlias(alias) {
    this.alias.push(alias)
    return this
  }

  pipe(callback) {
    return callback(this)
  }

  parse() {
    return {
      callback: this.command,
      options: this.options,
      name: this.name,
      description: this.description,
      middlewares: this.middlewares,
      alias: this.alias,
      pattern: this.pattern,
      prefix: this.prefix,
      usage: this.usage,
    }
  }
}

module.exports = Command
