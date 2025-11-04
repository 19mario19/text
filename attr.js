const PREFIX = "ATTR-JS"

let globalLogger = true

const log = globalLogger
  ? console.log.bind(
      console,
      `%c[${PREFIX}]`,
      "color: yellow; font-weight: bold",
    )
  : () => {}

const err = globalLogger
  ? console.error.bind(
      console,
      `%c[${PREFIX}]`,
      "color: red; font-weight: bold",
    )
  : () => {}

const ATTR = {
  TOGGLE: "toggle",
  ON: "on",
  LOAD: "load",
  LANGUAGE: "tl",
  SET_LANGUAGE: "sl",
  X_DATA: "x-data",
}

window.addEventListener("DOMContentLoaded", () => {
  init()
  // end
})

function init() {
  initCoreAttr()
  renderTargetLanguage()
  setLanguage()
  initXData()
  initComponents()
}

function renderTargetLanguage() {
  let elements = document.querySelectorAll(`[${ATTR.LANGUAGE}]`)
  const currentLang = document.documentElement.lang

  Array.from(elements).forEach((element) => {
    const attr = element.getAttribute(ATTR.LANGUAGE)

    if (attr !== currentLang) {
      element.style.display = "none"
    } else {
      element.style.display = "block"
    }
  })
}

function setLanguage() {
  let elements = document.querySelectorAll(`[${ATTR.SET_LANGUAGE}]`)

  elements.forEach((element) => {
    const attr = element.getAttribute(ATTR.SET_LANGUAGE)
    // log(attr, "lang")
    element.addEventListener("click", () => {
      document.documentElement.lang = attr
      renderTargetLanguage()
    })
  })
}

function parseString(string) {
  if (string === null) return null
  if (string === undefined) return undefined
  if (string === "true") return true
  if (string === "false") return false
  if (!isNaN(Number(string))) return Number(string)
  if (string[0] === "'" && string[string.length - 1] === "'")
    return string.split("").slice(1, -1).join("")

  throw new Error("Boolean or Number only")
}

const COREATTR = ["toggle", "add", "remove"]
const CORE = COREATTR.map((el) => `[${el}]`).join()
function initCoreAttr() {
  const attrs = document.querySelectorAll(CORE)
  Array.from(attrs).forEach((element) => {
    const eventType = element.getAttribute(ATTR.ON) || "click"
    const load = element.getAttribute(ATTR.LOAD) || "false"
    const loadBool = parseString(load)
    const string = element.getAttribute(...COREATTR)

    let instances
    let parsedInstancies = []
    if (string.includes(";")) {
      instances = string.split(";").map((el) => el.trim())
    } else {
      instances = [string]
    }

    let type, targets, style, values

    instances.forEach((string) => {
      const array = string.split(":")

      if (array[0] === "style") {
        ;[type, targets, style, values] = array
      } else {
        ;[type, targets, values] = array
      }

      // log(type, targets, style, values)

      const targetNames = targets.split(",").map((el) => el.trim())

      const targetElemnts = []

      targetNames.forEach((target) => {
        if (target === "self") {
          targetElemnts.push(element)
        } else {
          const tmp = document.querySelectorAll(target)
          if (tmp) {
            Array.from(tmp).forEach((el) => targetElemnts.push(el))
            // targetElemnts.push(tmp)
          }
        }
      })

      parsedInstancies.push({ type, targetElemnts, values, style })
    })

    let index = -1

    function execParsed() {
      parsedInstancies.forEach(({ type, targetElemnts, values, style }, i) => {
        if (i > 0) index -= i
        const array = values.split(",").map((el) => el.trim())
        let toggle = false
        let toToggle = null
        if (array.length === 1) {
          toggle = true
          toToggle = array[0]
        } else if (array.length > 1) {
          if (index < array.length - 1) {
            index++
          } else {
            index = 0
          }
        }
        switch (type) {
          case "class": {
            targetElemnts.forEach((target) => {
              if (toggle) {
                target.classList.toggle(toToggle)
              } else {
                target.classList.remove(...array)
                target.classList.add(array[index])
              }
            })

            break
          }
          case "text": {
            targetElemnts.forEach((target) => {
              if (toggle) {
                if (target.textContent === toToggle) {
                  target.textContent = ""
                } else {
                  target.textContent = toToggle
                }
              } else {
                target.textContent = ""
                target.textContent = array[index]
              }
            })
            break
          }
          case "style": {
            let cssStyleProperty = style

            targetElemnts.forEach((target) => {
              if (toggle) {
                if (target.style[cssStyleProperty] === toToggle) {
                  target.style[cssStyleProperty] = ""
                } else {
                  target.style[cssStyleProperty] = toToggle
                }
              } else {
                target.style[cssStyleProperty] = ""
                target.style[cssStyleProperty] = array[index]
              }
            })
            break
          }
          default:
            throw new Error("Currently available are class, text and style")
        }
      })
    }

    element.addEventListener(eventType, () => {
      execParsed()
    })

    if (loadBool) execParsed()
  })
}

function stringToObject(string) {
  return new Function("$", `return ${string}`)
}

function stringToExpression(string) {
  return new Function("state", `with(state){return ${string}}`)
}
function stringToEvaluate(string) {
  return new Function("state", `with(state) { ${string} }`)
}

function initXGetters(element, watcher) {
  const getters = element.querySelectorAll("[x-watch]")
  getters.forEach((getter) => {
    const prop = getter.getAttribute("x-watch")

    watcher.getNestedPropValue(prop, (currentValue) => {
      getter.textContent = currentValue
    })
  })
}

function initXTexts(element, watcher, scope) {
  /**
   * Adding :src, :style, :class, :disabled
   */

  const attrNames = ["src", "style", "class", "disabled"]
  const stringToFind = attrNames.map((el) => `[${CSS.escape(`:${el}`)}]`)
  const elements = element.querySelectorAll(stringToFind)
  if (elements.length > 0) {
    elements.forEach((el) => {
      attrNames.forEach((atr) => {
        const attr = el.getAttribute(`:${atr}`)
        if (!attr) return
        // log("attribute", attr)

        let dependencies = getDependencies(attr, scope)

        const fn = stringToExpression(attr)
        dependencies.forEach((item) => {
          watcher.getNestedPropValue(item, () => {
            if (atr === "src") {
              el.src = fn(scope)
            }
            if (atr === "style") {
              // el.src = fn(scope)
            }
            if (atr === "class") {
              el.className = ""
              el.classList.add(fn(scope))
            }
            if (atr === "disabled") {
              el.disabled = fn(scope)
            }
          })
        })
      })
    })
  }

  const texts = element.querySelectorAll("[x-text]")
  texts.forEach((text) => {
    const expr = text.getAttribute("x-text")

    let dependencies = getDependencies(expr, scope)

    const fn = stringToExpression(expr)
    dependencies.forEach((item) => {
      watcher.getNestedPropValue(item, () => {
        text.textContent = fn(scope)
      })
    })

    // text.textContent = fn(scope)
  })
}

function initXSetters(element, watcher, scope, isArray, eventType) {
  const setters = element.querySelectorAll("[x-set]")
  setters.forEach((setter) => {
    const attr = setter.getAttribute("x-set")
    const { instancies } = spanMultipleInstancies(attr)

    instancies.forEach((instance) => {
      const [prop, value] = splitByFirst(instance)

      const fn = stringToExpression(value)

      const isPropArray = isArray.includes(prop)

      setter.addEventListener(eventType, () => {
        watcher.batchedSetProp(prop, fn(scope), isPropArray)
      })
    })
  })
}

function initXHistory(element, watcher, eventType) {
  const undos = element.querySelectorAll("[x-undo]")
  undos.forEach((item) => {
    const prop = item.getAttribute("x-undo")
    const { instancies } = spanMultipleInstancies(prop)
    instancies.forEach((instance) => {
      item.addEventListener(eventType, () => {
        watcher.undo(instance)
      })
    })
  })
  const redos = element.querySelectorAll("[x-redo]")
  redos.forEach((item) => {
    const prop = item.getAttribute("x-redo")
    const { instancies } = spanMultipleInstancies(prop)
    instancies.forEach((instance) => {
      item.addEventListener(eventType, () => {
        watcher.redo(instance)
      })
    })
  })
}

function initXBind(element, watcher) {
  const bindings = element.querySelectorAll("[x-bind]")
  bindings.forEach((item) => {
    const prop = item.getAttribute("x-bind")

    watcher.getNestedPropValue(prop, (currentValue) => {
      item.value = currentValue
    })

    item.addEventListener("input", (e) => {
      watcher.batchedSetProp(prop, e.target.value)
    })
  })
}

function initXShow(element, watcher, scope) {
  const shows = element.querySelectorAll("[x-show]")
  shows.forEach((show) => {
    const condition = show.getAttribute("x-show")

    const fn = stringToExpression(condition)

    let dependencies = getDependencies(condition, scope)
    dependencies.forEach((item) => {
      watcher.getNestedPropValue(item, () => {
        if (!fn(scope)) {
          show.style.display = "none"
        } else {
          show.style.display = ""
        }
      })
    })
  })
}

function initXLoop(element, watcher, scope) {
  const forloop = element.querySelectorAll("[x-for]")
  forloop.forEach((loop) => {
    const attr = loop.getAttribute("x-for")
    const items = attr.trim()

    const templateId = loop.getAttribute("x-component")
    if (templateId) {
      const templateFragment = document.querySelector(`[id="${templateId}"]`)
      if (!templateFragment) {
        log(`Could not find template with id: ${templateId}`)
        return
      }

      // log(templateFragment)

      const attrStagger = parseString(
        templateFragment.getAttribute("animate.stagger"),
      )

      // initial render
      let timeout
      for (let i = 0; i < scope[items].length; i++) {
        const item = scope[items][i]
        // log(item)
        const comp = new Component(templateFragment, item, loop)
        if (!attrStagger) {
          comp.create()
        } else if (!isNaN(Number(attrStagger))) {
          timeout = setTimeout(() => {
            comp.create()
          }, attrStagger * i)
        }
      }
      clearTimeout(timeout)

      let snapshot = [...scope[items]]
      watcher.getNestedPropValue(items, (newState) => {
        const loopManager = new LoopManager(templateFragment, loop)
        loopManager.render(snapshot, newState)

        snapshot = [...newState]
      })
    }
  })
}

function initComponents() {
  const templates = document.querySelectorAll("[component]")
  templates.forEach((template) => {
    const templateId = template.getAttribute("component")
    if (templateId) {
      const templateFragment = document.querySelector(`[id="${templateId}"]`)
      // log("fragment: ", templateFragment.innerHTML)
      if (!templateFragment) {
        log(`Could not find template with id: ${templateId}`)
        return
      }

      const defaults = stringToObject(templateFragment.getAttribute("x-data"))()
      const providedArgs = template.getAttribute("args")
        ? stringToObject(template.getAttribute("args"))()
        : {}

      const args = { ...defaults, ...providedArgs }

      const config = { history: null, historyLimit: null, safeUndoRedo: null }

      // for (let at of template.attributes) {
      //   log("attribute: ", at, template.getAttribute(at.name))
      // }

      config.history = parseString(template.getAttribute("history"))
      config.historyLimit = parseString(template.getAttribute("history-limit"))
      config.safeUndoRedo = parseString(template.getAttribute("history-safe"))

      const comp = new Component(templateFragment, args, template, config)
      comp.create()
    }
  })
}

function splitByFirst(string, delimitator = "=") {
  const delimitatorIndex = string.indexOf(delimitator)
  return [
    string.slice(0, delimitatorIndex).trim(),
    string.slice(delimitatorIndex + 1).trim(),
  ]
}

function initXComputed(parent = document, watcher, scope) {
  const elements = parent.querySelectorAll("[x-computed]")
  elements.forEach((element) => {
    const attribute = element.getAttribute("x-computed").trim()
    log(attribute)

    const { instancies } = spanMultipleInstancies(attribute)
    log(instancies)
    instancies.forEach((instance) => {
      const [computed, attr] = splitByFirst(instance)
      scope[computed] = ""
      const dependencies = getDependencies(attr, watcher.obj)

      const fn = stringToExpression(attr)

      dependencies.forEach((dependency) => {
        watcher.getNestedPropValue(dependency, () => {
          const recomputedValue = fn(watcher.obj)
          watcher.setNestedProp(computed, recomputedValue)
          log(scope)
        })
      })

      // on init, we already do it with get
      // watcher.setNestedProp(computed, recomputedValue)
    })
  })
}

/**
 * Handle event modifiers applied to an event and its target element.
 *
 * Processes an array of modifier tokens (e.g. "prevent", "stop") and applies the
 * corresponding event behavior:
 *  - "prevent": calls e.preventDefault()
 *  - "stop": calls e.stopPropagation()
 *
 * @param {Event} e - The Event object provided by addEventListener.
 * @param {HTMLElement} element - The target HTMLElement the event is attached to.
 * @param {string[]} modifiers - Array of modifier strings (e.g. ["prevent", "stop"]).
 * @returns {void}
 */
function handleModifiers(e, element, modifiers) {
  for (const modifier of modifiers) {
    switch (modifier) {
      case "prevent":
        e.preventDefault()
        break

      case "stop":
        e.stopPropagation()
        break

      case "outside": {
        if (e.target === element) return false
        break
      }

      case "self":
        if (e.target !== element) return false
        break

      case "ctrl":
        if (!e.ctrlKey) return false
        break

      case "shift":
        if (!e.shiftKey) return false
        break

      case "alt":
        if (!e.altKey) return false
        break

      case "meta":
        if (!e.metaKey) return false
        break

      case "a":
      case "b":
      case "c":
      case "d":
      case "e":
      case "f":
      case "g":
      case "h":
      case "i":
      case "j":
      case "k":
      case "l":
      case "m":
      case "n":
      case "o":
      case "p":
      case "q":
      case "r":
      case "s":
      case "t":
      case "u":
      case "v":
      case "w":
      case "x":
      case "y":
      case "z":
        if (e.key.toLowerCase() !== modifier) return false
        break

      case "enter":
        if (e.key !== "Enter") return false
        break

      case "escape":
        if (e.key !== "Escape" && e.key !== "Esc") return false
        break

      case "space":
        if (e.key !== " ") return false
        break

      case "tab":
        if (e.key !== "Tab") return false
        break

      case "delete":
        if (e.key !== "Delete" && e.key !== "Backspace") return false
        break

      case "up":
        if (e.key !== "ArrowUp") return false
        break

      case "down":
        if (e.key !== "ArrowDown") return false
        break

      case "left":
        if (e.key !== "ArrowLeft") return false
        break

      case "right":
        if (e.key !== "ArrowRight") return false
        break

      case "once":
      case "capture":
      case "passive":
      case "window":
      case "document":
        break

      default:
        console.warn(`[ATTR-JS] Unknown modifier: "${modifier}"`)
    }
  }
  return true
}

async function fetchData(url, config = {}) {
  try {
    const res = await fetch(url, config)
    if (!res.ok) throw Error("Could not fetch")
    const json = await res.json()
    return json
  } catch (e) {
    log(e)
  }
}

function initXRefs(parent = document) {
  const refs = {}

  const elements = parent.querySelectorAll("[x-ref]")
  elements.forEach((element) => {
    const attr = element.getAttribute("x-ref")
    if (refs[attr]) {
      console.warn(`This ref=[${attr}] is already used.`)
      return
    }
    refs[attr] = element
  })

  log("refs: ", refs)
  return refs
}

function initXAction(parent = document, watcher, scope) {
  const refs = initXRefs(parent)

  const allElements = parent.querySelectorAll("*")

  allElements.forEach((element) => {
    let attachEventOn = element
    const elementScope = {
      ...scope,
      $element: element,
      $state: watcher.obj,
      $id: watcher.obj.id,
      $set: (prop, value) => {
        watcher.batchedSetProp(prop, value)
      },
      $fetch: async (prop, url) => {
        watcher.batchedSetProp(prop, await fetchData(url))
      },
      $nextTick: (cb) => {
        queueMicrotask(() => cb())
      },
      $refs: refs,
    }

    for (let attribute of element.attributes) {
      if (attribute.name.startsWith("@")) {
        const parts = attribute.name.split(".")
        const event = parts[0].slice(1)
        const exec = element.getAttribute(attribute.name)
        const modifiers = parts.length > 1 ? parts.slice(1) : []

        const fn = stringToEvaluate(exec)

        if (event === "load") {
          fn(elementScope)
        } else {
          const options = {
            capture: false,
            once: false,
            passive: false,
          }

          if (modifiers.includes("capture")) options.capture = true
          if (modifiers.includes("once")) options.once = true
          if (modifiers.includes("passive")) options.passive = true
          if (modifiers.includes("window") || modifiers.includes("outside"))
            attachEventOn = window
          if (modifiers.includes("document")) attachEventOn = document

          attachEventOn.addEventListener(
            event,
            (e) => {
              const eventScope = {
                ...elementScope,
                $event: e,
              }

              const shouldExecute = handleModifiers(e, element, modifiers)
              if (!shouldExecute) return

              fn(eventScope)
            },
            options,
          )
        }
      }
    }
  })
}

class StoreManager {
  constructor(localStorage = null) {
    if (localStorage !== null) {
      // logic here
    } else {
      this.stores = new Map()
    }
  }

  createStore(name, object) {
    const storeName = `$${name}`
    try {
      if (this.stores.has(storeName)) {
        throw new Error(`This name: [${storeName}] is already used.`)
      }
      const watcher = new Watcher(object)
      const newStore = new Store(storeName, watcher)
      this.stores.set(storeName, watcher)

      return newStore
    } catch (error) {
      err(error)
    }
  }

  getStoreByName(storeName) {
    return this.stores.get(storeName)
  }

  removeStore(storeName) {
    if (this.stores.has(storeName)) this.stores.delete(storeName)
  }

  toString() {
    log("Stores stringyfied: ", JSON.stringify(Object.fromEntries(this.stores)))
  }
}

class Store {
  constructor(name, object) {
    this.name = name
    this.object = object
  }

  // create() {}
}

// const store = new StoreManager()
// store.createStore("alina", { name: "Alina" })
// log(store.getStoreByName("$alina"))
// store.toString()

const GlobalStore = new StoreManager()

function initXStore(parent = document) {
  const data = parent.getAttribute("x-data")
  const attr = parent.getAttribute("store-name")

  if (data && attr) {
    const fn = stringToObject(data)
    GlobalStore.createStore(attr, fn())
    GlobalStore.toString()
  }
}

const ScopeRegistry = {}

function initXData(parent = document, outerScope = {}) {
  const elements = Array.from(parent.querySelectorAll("[x-data]")).filter(
    (el) => {
      let p = el.parentElement
      while (p && p !== parent && p !== document.documentElement) {
        if (p.hasAttribute("x-data")) return false
        p = p.parentElement
      }
      return true
    },
  )

  elements.forEach((element) => {
    const scopeName = element.getAttribute("scope-name")

    const attrHistory = parseString(element.getAttribute("history"))
    const historyLimit =
      parseString(element.getAttribute("history-limit")) || 10
    const safeUndoRedo = parseString(element.getAttribute("history-safe"))
    const eventType = element.getAttribute(ATTR.ON) || "click"

    const evalContext = {
      $parent: outerScope,
      ...ScopeRegistry,
    }

    let scope = stringToObject2(element.getAttribute("x-data"))(evalContext)

    if (scopeName) {
      const registryName = `$${scopeName}`
      ScopeRegistry[registryName] = scope
    }

    if (Object.keys(outerScope).length > 0) {
      scope.$parent = outerScope
    }

    const refs = initXRefs(element)
    scope = {
      ...scope,
      ...ScopeRegistry,
      $refs: refs,
    }
    log("scope", scope)

    const isArray = []
    for (let prop in scope) {
      if (scope[prop] instanceof Array) {
        isArray.push(prop)
        scope[prop] = addIdsToList(scope[prop])
      }
    }

    initXStore(element)

    const watcher = new Watcher(scope, attrHistory, historyLimit, safeUndoRedo)

    initXComputed(element, watcher, scope)

    initXGetters(element, watcher)
    initXTexts(element, watcher, scope)
    initXBind(element, watcher)
    initXSetters(element, watcher, scope, isArray, eventType)
    initXShow(element, watcher, scope)
    initXLoop(element, watcher, scope)
    initXAction(element, watcher, scope, eventType)
    if (attrHistory) initXHistory(element, watcher, eventType)

    initXData(element, scope)
  })
}

const HOOK_TYPE = {
  BEFORE_MOUNT: "@before-mount",
  AFTER_MOUNT: "@after-mount",
  BEFORE_UPDATE: "@before-update",
  AFTER_UPDATE: "@after-update",
  BEFORE_DESTROY: "@before-destroy",
  AFTER_DESTROY: "@after-destroy",
}

function initXHooks(parent) {
  // can be used within components only
  const registerHooks = {}

  const hookArray = Object.values(HOOK_TYPE)
  for (let hook of hookArray) {
    registerHooks[hook] = []
  }

  for (let hook of hookArray) {
    const attr = parent.getAttribute(hook)
    if (!attr) continue
    registerHooks[hook].push(attr)
  }

  return registerHooks
}

const components = new Map()

class Component {
  constructor(
    template,
    props,
    appendTo = document.body,
    config = { history: null, historyLimit: null, safeUndoRedo: null },
  ) {
    this.config = config
    this.template = template
    this.node = null
    this.props = props
    this.appendTo = appendTo
    this.state = {}
    this.watcher = null
    this.animate = null
    this.currentAnimation = null
    this.eventType = "click"

    this.hooks = {
      [HOOK_TYPE.BEFORE_MOUNT]: [],
      [HOOK_TYPE.AFTER_MOUNT]: [],
      [HOOK_TYPE.BEFORE_UPDATE]: [],
      [HOOK_TYPE.AFTER_UPDATE]: [],
      [HOOK_TYPE.BEFORE_DESTROY]: [],
      [HOOK_TYPE.AFTER_DESTROY]: [],
    }

    // init
    this.initState()
    // this.initWatcher()
  }

  callHookSubs(type) {
    const context = {
      $element: this.node,
      $state: this.state,
      $props: this.props,
      $id: this.state.id,
      $set: (prop, value) => {
        this.setState(prop, value)
      }, // all below are being tested now
      $fetch: async (prop, url) => {
        this.setState(prop, await fetchData(url))
      },
      $destroy: this.destroy,
      $nextTick: (cb) => {
        queueMicrotask(cb())
      },
    }

    this.hooks[type].forEach((cb) => cb(context))
  }

  subToHook(type, cb) {
    if (this.hooks[type]) {
      this.hooks[type].push(cb)
    } else {
      throw new Error(`Unknown hook: ${type}`)
    }
  }

  initState() {
    const hasXData = this.template.getAttribute("x-data")

    if (hasXData) {
      const defaults = stringToObject(hasXData)

      this.state = { ...defaults, ...this.props }
    } else {
      this.state = { ...this.props }
    }
  }
  initWatcher() {
    let attrHistory, historyLimit, safeUndoRedo
    attrHistory =
      this.config.history ?? parseString(this.template.getAttribute("history"))

    historyLimit =
      this.config.historyLimit ??
      parseString(this.template.getAttribute("history-limit")) ??
      10

    safeUndoRedo =
      this.config.safeUndoRedo ??
      parseString(this.template.getAttribute("history-safe")) ??
      true

    this.eventType = this.node.getAttribute(ATTR.ON) || "click"

    this.watcher = new Watcher(
      this.state,
      attrHistory,
      historyLimit,
      safeUndoRedo,
    )
  }

  create(toIndex = null) {
    const fragment = this.template.content.cloneNode(true)
    this.node = fragment.children[0]
    this.initWatcher() // must be initializated after this.node is created

    let id
    if (this.state.id !== undefined) {
      id = this.state.id
      this.node.dataset.id = id
    } else if (this.state.id === undefined) {
      id = idGen.genNextId()
      this.state.id = id
    }

    components.set(id, this)

    const hasXData = this.template.getAttribute("x-data")

    if (hasXData) {
      initXGetters(this.node, this.watcher)
      initXTexts(this.node, this.watcher, this.state)
      initXComputed(this.node, this.watcher)

      initXBind(this.node, this.watcher)
      initXSetters(this.node, this.watcher, this.state, [], this.eventType)
      initXHistory(this.node, this.watcher, this.eventType)
      initXShow(this.node, this.watcher, this.state)

      initXLoop(this.node, this.watcher, this.state)

      const registerHooks = initXHooks(this.node)
      for (let [hook, attr] of Object.entries(registerHooks)) {
        if (registerHooks[hook].length > 0) {
          const fn = stringToEvaluate(attr)
          this.subToHook(hook, fn)
        }
      }

      initXAction(this.node, this.watcher, this.state, this.eventType)
    } else {
      // non reactive
      const propElements = this.node.querySelectorAll("[x-prop]")
      for (let prop of propElements) {
        const attr = prop.getAttribute("x-prop")
        prop.textContent = this.state[attr]

        this.watcher.getProp(attr, (newState) => {
          prop.textContent = newState
        })
      }
    }

    const refElement = this.appendTo.children[toIndex] || null

    if (refElement === this.node) return

    this.callHookSubs(HOOK_TYPE.BEFORE_MOUNT)

    this.appendTo.insertBefore(this.node, refElement)

    const animateAttribute = this.template.getAttribute("animate.enter")
    if (animateAttribute) {
      let animationName, duration
      if (animateAttribute.includes(".")) {
        ;[animationName, duration] = animateAttribute.split(".")
      } else {
        animationName = animateAttribute
      }

      if (!ANIMATIONS[animationName]) log(`${animationName} not found`)

      const modifications = {
        timing: {
          duration: Number(duration),
        },
      }

      let _animation = {
        ...ANIMATIONS[animationName](),
      }
      if (duration) {
        _animation = { ..._animation, ...modifications }
      }

      this.animate = new Animate(_animation)

      this.currentAnimation = this.animate.run(this.node)

      this.callHookSubs(HOOK_TYPE.AFTER_MOUNT)
    } else {
      this.callHookSubs(HOOK_TYPE.AFTER_MOUNT)
    }
  }

  destroy() {
    this.callHookSubs(HOOK_TYPE.BEFORE_DESTROY)

    const animateAttribute = this.template.getAttribute("animate.exit")

    if (animateAttribute) {
      let animationName, duration
      if (animateAttribute.includes(".")) {
        ;[animationName, duration] = animateAttribute.split(".")
      } else {
        animationName = animateAttribute
      }

      if (!ANIMATIONS[animationName]) log(`${animationName} not found`)

      const modifications = {
        timing: {
          duration: Number(duration),
        },
      }

      let _animation = {
        ...ANIMATIONS[animationName](),
      }
      if (duration) {
        _animation = { ..._animation, ...modifications }
      }

      this.animate = new Animate(_animation)

      const animation = this.animate.run(this.node)
      animation.finished.then(() => {
        this.node.remove()
        this.cleanup()
        this.callHookSubs(HOOK_TYPE.AFTER_DESTROY)
      })
    } else {
      this.node.remove()
      this.cleanup()
      this.callHookSubs(HOOK_TYPE.AFTER_DESTROY)
    }
  }

  setState(prop, newState) {
    this.callHookSubs(HOOK_TYPE.BEFORE_UPDATE)
    this.watcher.setNestedProp(prop, newState)
    this.callHookSubs(HOOK_TYPE.AFTER_UPDATE)
  }

  cleanup() {
    if (this.currentAnimation) {
      this.currentAnimation.cancel()
      this.currentAnimation = null
    }

    if (this.watcher && this.watcher.sub) {
      for (let prop in this.watcher.sub) {
        this.watcher.sub[prop] = []
      }
      this.watcher.sub = {}
    }

    if (this.node) {
      const setters = this.node.querySelectorAll("[x-set]")
      setters.forEach((setter) => {
        const clone = setter.cloneNode(true)
        setter.parentNode.replaceChild(clone, setter)
      })

      const bindings = this.node.querySelectorAll("[x-bind]")
      bindings.forEach((binding) => {
        const clone = binding.cloneNode(true)
        binding.parentNode.replaceChild(clone, binding)
      })
    }

    this.watcher = null
    this.animate = null
    this.state = null
    this.node = null
  }
}

class LoopManager {
  constructor(template, appendTo) {
    this.template = template
    this.appendTo = appendTo
  }

  create(data, index = null) {
    const comp = new Component(this.template, data, this.appendTo)
    // components.set(data.id, comp)
    comp.create(index)
  }
  move(id, index) {
    const component = components.get(id).node
    const parent = this.appendTo
    const refChild = parent.children[index] || null
    if (component === refChild) return
    parent.insertBefore(component, refChild)
  }
  remove(id) {
    if (components.has(id)) {
      const component = components.get(id)
      component.destroy()
      components.delete(id)
    }
  }

  render(oldList, newList) {
    const instructions = diffing(oldList, newList)
    const toRender = instructions.toRender()

    toRender.toRemove.forEach((el) => {
      const [id, from] = el
      this.remove(id)
    })
    toRender.toAdd.forEach((el) => {
      const [data, to] = el
      this.create(data, to)
    })

    // log(Array.from(toRender.toAdd).length)
    // const array = Array.from(toRender.toAdd)
    // for (let i = 0; i < array.length - 1; i++) {
    //   const el = array[i]
    //   const [data, to] = el

    //   let timeout

    //   timeout = setTimeout(() => {
    //     this.create(data, to)
    //   }, 1000 * i)
    // }

    const moves = Array.from(toRender.toMove)

    const movingForward = moves.filter(([id, from, to]) => from < to)
    const movingBackward = moves.filter(([id, from, to]) => from > to)

    movingForward.sort((a, b) => b[1] - a[1])
    movingBackward.sort((a, b) => a[2] - b[2])

    const orderedMoves = [...movingBackward, ...movingForward]

    orderedMoves.forEach((el) => {
      const [id, from, to] = el
      const node = components.get(id).node
      const parent = this.appendTo
      let refChild = parent.children[to] || null

      if (from < to) {
        refChild = refChild.nextSibling
      }

      if (node !== refChild) {
        flip(parent, node, refChild)
      }
    })
  }
}

function flip(parent, el, ref = null) {
  const first = el.getBoundingClientRect()
  parent.insertBefore(el, ref)

  log("element moving: ", el)
  log("to ref element position: ", ref)
  const last = el.getBoundingClientRect()
  // delta
  const dx = first.left - last.left
  const dy = first.top - last.top

  el.style.transform = `translate(${dx}px, ${dy}px)`

  // el.getBoundingClientRect() // force reflow !

  const animate = new Animate({
    keyframes: [
      {
        transform: `translate(${dx}px, ${dy}px)`,
        zIndex: 10,
      },
      {
        transform: `translate(0,0) rotate(5deg)`,
      },
      {
        transform: `translate(0,0) rotate(0deg)`,
      },
    ],
    timing: {
      duration: 1000,
      easing: "ease-out",
    },
  })

  const animation = animate.run(el)

  animation.finished.then(() => {
    el.style.transform = ""
    el.style.zIndex = 0
  })
}

const ANIMATIONS = {
  // Fade
  fadeIn: (duration = 300, iterations = 1, fill = "forwards") => ({
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    timing: { duration, iterations, fill },
  }),

  fadeOut: (duration = 300, iterations = 1, fill = "forwards") => ({
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    timing: { duration, iterations, fill },
  }),

  // Slide
  slideInUp: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    from = 30,
    initialOpacity = 0,
  ) => ({
    keyframes: [
      { transform: `translateY(${from}px)`, opacity: initialOpacity },
      { transform: "translateY(0)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  slideInDown: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    from = -30,
    initialOpacity = 0,
  ) => ({
    keyframes: [
      { transform: `translateY(${from}px)`, opacity: initialOpacity },
      { transform: "translateY(0)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  slideInLeft: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    from = -30,
    initialOpacity = 0,
  ) => ({
    keyframes: [
      { transform: `translateX(${from}px)`, opacity: initialOpacity },
      { transform: "translateX(0)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  slideInRight: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    from = 30,
    initialOpacity = 0,
  ) => ({
    keyframes: [
      { transform: `translateX(${from}px)`, opacity: initialOpacity },
      { transform: "translateX(0)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  slideOutUp: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    to = -30,
    finalOpacity = 0,
  ) => ({
    keyframes: [
      { transform: "translateY(0)", opacity: 1 },
      { transform: `translateY(${to}px)`, opacity: finalOpacity },
    ],
    timing: { duration, iterations, fill },
  }),

  slideOutDown: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    to = 30,
    finalOpacity = 0,
  ) => ({
    keyframes: [
      { transform: "translateY(0)", opacity: 1 },
      { transform: `translateY(${to}px)`, opacity: finalOpacity },
    ],
    timing: { duration, iterations, fill },
  }),

  slideOutLeft: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    to = -30,
    finalOpacity = 0,
  ) => ({
    keyframes: [
      { transform: "translateX(0)", opacity: 1 },
      { transform: `translateX(${to}px)`, opacity: finalOpacity },
    ],
    timing: { duration, iterations, fill },
  }),

  slideOutRight: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    to = 30,
    finalOpacity = 0,
  ) => ({
    keyframes: [
      { transform: "translateX(0)", opacity: 1 },
      { transform: `translateX(${to}px)`, opacity: finalOpacity },
    ],
    timing: { duration, iterations, fill },
  }),

  // Scale
  scaleIn: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    fromScale = 0.7,
    initialOpacity = 0,
  ) => ({
    keyframes: [
      { transform: `scale(${fromScale})`, opacity: initialOpacity },
      { transform: "scale(1)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  scaleOut: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    toScale = 0.7,
    finalOpacity = 0,
  ) => ({
    keyframes: [
      { transform: "scale(1)", opacity: 1 },
      { transform: `scale(${toScale})`, opacity: finalOpacity },
    ],
    timing: { duration, iterations, fill },
  }),

  zoomIn: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    fromScale = 0,
    initialOpacity = 0,
  ) => ({
    keyframes: [
      { transform: `scale(${fromScale})`, opacity: initialOpacity },
      { transform: "scale(1)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  zoomOut: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    toScale = 0,
    finalOpacity = 0,
  ) => ({
    keyframes: [
      { transform: "scale(1)", opacity: 1 },
      { transform: `scale(${toScale})`, opacity: finalOpacity },
    ],
    timing: { duration, iterations, fill },
  }),

  // Rotate
  rotateClockWise: (
    duration = 1000,
    iterations = 1,
    fill = "forwards",
    degrees = 360,
  ) => ({
    keyframes: [
      { transform: "rotate(0)" },
      { transform: `rotate(${degrees}deg)` },
    ],
    timing: { duration, iterations, fill },
  }),

  rotateCounterClockWise: (
    duration = 1000,
    iterations = 1,
    fill = "forwards",
    degrees = -360,
  ) => ({
    keyframes: [
      { transform: "rotate(0)" },
      { transform: `rotate(${degrees}deg)` },
    ],
    timing: { duration, iterations, fill },
  }),

  rotateInDownLeft: (
    duration = 300,
    iterations = 1,
    fill = "forwards",
    fromDegrees = -45,
    initialOpacity = 0,
  ) => ({
    keyframes: [
      {
        transform: `rotate(${fromDegrees}deg)`,
        opacity: initialOpacity,
        transformOrigin: "left bottom",
      },
      { transform: "rotate(0)", opacity: 1, transformOrigin: "left bottom" },
    ],
    timing: { duration, iterations, fill },
  }),

  // Bounce
  bounceIn: (duration = 600, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "scale(0.3)", opacity: 0, offset: 0 },
      { transform: "scale(1.1)", offset: 0.5 },
      { transform: "scale(0.9)", offset: 0.7 },
      { transform: "scale(1.03)", offset: 0.85 },
      { transform: "scale(0.97)", offset: 0.95 },
      { transform: "scale(1)", opacity: 1, offset: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  bounceOut: (duration = 600, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "scale(1)", opacity: 1, offset: 0 },
      { transform: "scale(0.95)", offset: 0.2 },
      { transform: "scale(1.1)", offset: 0.5 },
      { transform: "scale(1.1)", offset: 0.55 },
      { transform: "scale(0.3)", opacity: 0, offset: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  // Flip
  flipInX: (duration = 600, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "perspective(400px) rotateX(90deg)", opacity: 0 },
      { transform: "perspective(400px) rotateX(-20deg)" },
      { transform: "perspective(400px) rotateX(10deg)" },
      { transform: "perspective(400px) rotateX(-5deg)" },
      { transform: "perspective(400px) rotateX(0)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  flipOutX: (duration = 400, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "perspective(400px) rotateX(0)", opacity: 1 },
      { transform: "perspective(400px) rotateX(70deg)", opacity: 0 },
    ],
    timing: { duration, iterations, fill },
  }),

  flipInY: (duration = 600, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "perspective(400px) rotateY(90deg)", opacity: 0 },
      { transform: "perspective(400px) rotateY(-20deg)" },
      { transform: "perspective(400px) rotateY(10deg)" },
      { transform: "perspective(400px) rotateY(-5deg)" },
      { transform: "perspective(400px) rotateY(0)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  flipOutY: (duration = 400, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "perspective(400px) rotateY(0)", opacity: 1 },
      { transform: "perspective(400px) rotateY(70deg)", opacity: 0 },
    ],
    timing: { duration, iterations, fill },
  }),

  // Elastic
  elasticIn: (duration = 800, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "scale(0)", opacity: 0, offset: 0 },
      { transform: "scale(1.25) rotate(5deg)", offset: 0.4 },
      { transform: "scale(0.75) rotate(-3deg)", offset: 0.6 },
      { transform: "scale(1.15) rotate(2deg)", offset: 0.8 },
      { transform: "scale(1)", opacity: 1, offset: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  elasticOut: (duration = 800, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "scale(1)", opacity: 1, offset: 0 },
      { transform: "scale(1.15) rotate(-2deg)", offset: 0.2 },
      { transform: "scale(0.75) rotate(3deg)", offset: 0.4 },
      { transform: "scale(1.25) rotate(-5deg)", offset: 0.6 },
      { transform: "scale(0)", opacity: 0, offset: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  // Shake
  shake: (
    duration = 500,
    iterations = 1,
    fill = "forwards",
    intensity = 10,
  ) => ({
    keyframes: [
      { transform: "translateX(0)" },
      { transform: `translateX(-${intensity}px)` },
      { transform: `translateX(${intensity}px)` },
      { transform: `translateX(-${intensity}px)` },
      { transform: `translateX(${intensity}px)` },
      { transform: `translateX(-${intensity}px)` },
      { transform: "translateX(0)" },
    ],
    timing: { duration, iterations, fill },
  }),

  // Wobble
  wobble: (duration = 1000, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "translateX(0) rotate(0)" },
      { transform: "translateX(-25%) rotate(-5deg)" },
      { transform: "translateX(20%) rotate(3deg)" },
      { transform: "translateX(-15%) rotate(-3deg)" },
      { transform: "translateX(10%) rotate(2deg)" },
      { transform: "translateX(-5%) rotate(-1deg)" },
      { transform: "translateX(0) rotate(0)" },
    ],
    timing: { duration, iterations, fill },
  }),

  // Swing
  swing: (duration = 1000, iterations = 1, fill = "forwards") => ({
    keyframes: [
      { transform: "rotate(0)" },
      { transform: "rotate(15deg)" },
      { transform: "rotate(-10deg)" },
      { transform: "rotate(5deg)" },
      { transform: "rotate(-5deg)" },
      { transform: "rotate(0)" },
    ],
    timing: { duration, iterations, fill },
  }),

  // Pulse
  pulse: (duration = 500, iterations = 1, fill = "forwards", scale = 1.05) => ({
    keyframes: [
      { transform: "scale(1)" },
      { transform: `scale(${scale})` },
      { transform: "scale(1)" },
    ],
    timing: { duration, iterations, fill },
  }),

  // Back In (overshoots then settles)
  backInUp: (
    duration = 600,
    iterations = 1,
    fill = "forwards",
    from = 100,
  ) => ({
    keyframes: [
      { transform: `translateY(${from}px) scale(0.7)`, opacity: 0 },
      { transform: "translateY(-20px) scale(1.05)" },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  backInDown: (
    duration = 600,
    iterations = 1,
    fill = "forwards",
    from = -100,
  ) => ({
    keyframes: [
      { transform: `translateY(${from}px) scale(0.7)`, opacity: 0 },
      { transform: "translateY(20px) scale(1.05)" },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ],
    timing: { duration, iterations, fill },
  }),

  backOutUp: (
    duration = 600,
    iterations = 1,
    fill = "forwards",
    to = -100,
  ) => ({
    keyframes: [
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { transform: "translateY(20px) scale(1.05)" },
      { transform: `translateY(${to}px) scale(0.7)`, opacity: 0 },
    ],
    timing: { duration, iterations, fill },
  }),

  backOutDown: (
    duration = 600,
    iterations = 1,
    fill = "forwards",
    to = 100,
  ) => ({
    keyframes: [
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { transform: "translateY(-20px) scale(1.05)" },
      { transform: `translateY(${to}px) scale(0.7)`, opacity: 0 },
    ],
    timing: { duration, iterations, fill },
  }),
}

class Animate {
  constructor(animationCallback) {
    this.animationCallback = animationCallback

    this.keyframes = animationCallback.keyframes
    this.timing = animationCallback.timing
  }
  run(node) {
    return node.animate(this.keyframes, this.timing)
  }
}

class Watcher {
  constructor(
    obj,
    enableHistory = true,
    historyLimit = Infinity,
    safeUndoRedo = true,
  ) {
    this.enableHistory = enableHistory
    this.obj = obj
    this.sub = {}
    if (this.enableHistory) {
      this.history = {}
      this.historyLimit = historyLimit
      this.safeUndoRedo = safeUndoRedo
      this.cursor = {}
      this.initHistory()
    }

    this.set = new Set()
    this.flag = false
  }

  batching(fn) {
    this.set.add(fn)
    if (!this.flag) {
      this.flag = true
      queueMicrotask(() => {
        const snapshot = Array.from(this.set)
        // log("snapshot", snapshot)
        this.set.clear()

        for (let cb of snapshot) cb()
        this.flag = false
      })
    }
  }
  // history
  initHistory() {
    for (let key in this.obj) {
      this.history[key] = this.history[key] || []
      this.history[key].push(this.obj[key])
      this.cursor[key] = this.history[key].length - 1
    }
  }
  getHistory(prop = null) {
    if (this.history !== null) {
      if (prop !== null && this.history[prop]) {
        return this.history[prop]
      }
      return this.history
    }
  }
  undo(prop) {
    if (!this.enableHistory) {
      console.warn(
        "Enable history attribute [history=true] on the x-data element",
      )
      return
    }

    this.cursor[prop]--
    if (this.cursor[prop] < 0) {
      if (this.safeUndoRedo) {
        this.cursor[prop] = 0
      } else {
        this.cursor[prop] = this.history[prop].length - 1
      }
    }
    this.obj[prop] = this.history[prop][this.cursor[prop]]
    ;(this.sub[prop] || []).forEach((cb) => cb(this.obj[prop]))

    return this.obj[prop]
  }
  redo(prop) {
    if (!this.enableHistory) {
      console.warn(
        "Enable history attribute [history=true] on the x-data element",
      )
      return
    }
    this.cursor[prop]++
    if (this.cursor[prop] > this.history[prop].length - 1) {
      if (this.safeUndoRedo) {
        this.cursor[prop] = this.history[prop].length - 1
      } else {
        this.cursor[prop] = 0
      }
    }
    this.obj[prop] = this.history[prop][this.cursor[prop]]
    ;(this.sub[prop] || []).forEach((cb) => cb(this.obj[prop]))

    return this.obj[prop]
  }
  // getters and setters
  getNestedPropValue(expression, cb = null) {
    expression = expression.trim()
    const [object, lastKey] = getNestedProp(this.obj, expression)
    // we subscribe for further changed
    if (cb !== null) {
      this.sub[expression] = this.sub[expression] || []
      this.sub[expression].push(cb)

      // call on init
      cb(object[lastKey])
    }

    log(`Getting prop:[${expression}]=${object[lastKey]}`)
    return object[lastKey]
  }
  getSubs(expression) {
    return this.sub[expression]
  }
  setNestedProp(expression, value) {
    log(`Setting prop:[${expression}]=${value}`)
    expression = expression.trim()
    const [object, lastKey] = getNestedProp(this.obj, expression)

    const oldValue = object[lastKey]
    if (oldValue !== value) object[lastKey] = value

    if (this.enableHistory) {
      this.history[expression] = this.history[expression] || []
      if (this.history[expression].length > this.historyLimit) {
        this.history[expression] = this.history[expression].slice(1)
      }
      this.history[expression].push(value)

      this.cursor[expression] = this.history[expression].length - 1
    }
    ;(this.sub[expression] || []).forEach((cb) => cb(value))
  }

  batchedSetProp(prop, value, isPropArray = null) {
    this.batching(() => {
      if (isPropArray && Array.isArray(value)) {
        value = value.map((el) => {
          if (el.id === undefined) {
            let newEl = {
              id: idGen.genNextId(),
              ...el,
            }
            return newEl
          }
          return el
        })
      }
      this.setNestedProp(prop, value)
    })
  }
}
// BATCHING
const set = new Set()
let flag = false
function batching(fn) {
  // log("new fn ", fn)
  set.add(fn)
  if (!flag) {
    flag = true
    Promise.resolve().then(() => {
      // it goes intro microtask for later ???
      // log("promise is being resolved")

      const snapshot = Array.from(set)
      set.clear()
      for (let cb of snapshot) cb()
      flag = false
    })
  }
}
function idGenerator() {
  let id = 0

  return {
    get id() {
      return id
    },
    genNextId() {
      return id++
    },
  }
}
const idGen = idGenerator()
function addIdsToList(list) {
  return (Array.from(list) || []).map((object) => {
    return {
      id: idGen.genNextId(),
      ...object,
    }
  })
}

const TYPE = {
  ADDED: "ADDED",
  MOVED: "MOVED",
  REMOVED: "REMOVED",
  UNCHANGED: "UNCHANGED",
}

class Instruction {
  constructor(object, type = null, from = null, to = null) {
    this.object = object
    this.type = type
    this.from = from
    this.to = to
  }
}

function newInstruction(object, type = null, from = null, to = null) {
  return new Instruction(object, type, from, to)
}

class Instructions {
  constructor(list = []) {
    this.list = list || []
  }

  add(item) {
    this.list.push(item)
  }

  get List() {
    return this.list
  }

  toRender() {
    let ids = {
      toRender: new Set(),
      toRemove: new Set(),
      toMove: new Set(),
      toAdd: new Set(), // needs gen id
      unchanged: new Set(),
    }
    for (let item of this.list) {
      switch (item.type) {
        case TYPE.MOVED: {
          ids.toMove.add([item.object.id, item.from, item.to])
          break
        }
        case TYPE.ADDED: {
          ids.toAdd.add([item.object, item.to])
          break
        }
        case TYPE.REMOVED: {
          ids.toRemove.add([item.object.id, item.from])
          break
        }
        case TYPE.UNCHANGED: {
          ids.unchanged.add(item.object.id)
          break
        }
        default:
          throw new Error("No operation")
      }
    }

    return ids
  }
}
const instructions = new Instructions()

function diffing(oldArray, newArray) {
  const instructions = new Instructions()

  const oldMap = new Map()
  oldArray.forEach((el, index) => oldMap.set(el.id, index)) // id -> index

  // filter same elements
  const existing = []
  for (let i = 0; i < newArray.length; i++) {
    const item = newArray[i]

    if (oldMap.get(item.id) !== undefined) {
      existing.push({
        item,
        oldIndex: oldMap.get(item.id),
        newIndex: i,
        id: item.id,
      })
    }
  }

  let lists = {}
  let idGen = idGenerator()

  let currId = idGen.genNextId()
  lists[currId] = []
  for (let i = 0; i < existing.length; i++) {
    const prev = existing[i - 1]
    const current = existing[i]
    if (i == 0) lists[currId].push(current)

    if (prev) {
      if (current.oldIndex > prev.oldIndex) {
        lists[currId].push(current)
      } else {
        currId = idGen.genNextId()
        lists[currId] = [current]
      }
    }
  }

  let lengths = Object.keys(lists).map((el) => {
    return { id: el, len: lists[el].length }
  })

  let lis = null

  for (let obj of lengths) {
    if (lis === null) {
      lis = obj
    } else {
      if (obj.len > lis.len) {
        lis = obj
      }
    }
  }

  const longest = new Set(lists[lis.id].map((i) => i.id))

  for (let obj of existing) {
    if (longest.has(obj.id)) {
      instructions.add(
        newInstruction(obj, TYPE.UNCHANGED, obj.oldIndex, obj.newIndex),
      )
    } else {
      instructions.add(
        newInstruction(obj, TYPE.MOVED, obj.oldIndex, obj.newIndex),
      )
    }
  }

  const oldM = new Map()
  const newM = new Map()

  oldArray.forEach((el, index) => oldM.set(el.id, { el, index }))
  newArray.forEach((el, index) => newM.set(el.id, { el, index }))

  for (let obj of oldArray) {
    if (!newM.get(obj.id)) {
      instructions.add(
        newInstruction(obj, TYPE.REMOVED, oldM.get(obj.id).index, null),
      )
    }
  }

  for (let obj of newArray) {
    if (!oldM.get(obj.id)) {
      instructions.add(
        newInstruction(obj, TYPE.ADDED, null, newM.get(obj.id).index),
      )
    }
  }

  instructions.List.sort((a, b) => a.to > b.to)

  return instructions
}
/**
 * Retrieves the parent object and the last property key from a dot-separated expression within a given scope.
 *
 * @param {Object} scope - The root object to traverse.
 * @param {string} expression - Dot-separated string representing the property path (e.g., "a.b.c").
 * @returns {[Object, string]} A tuple where the first element is the parent object of the last property, and the second is the last property key.
 */
function getNestedProp(scope, expression) {
  const array = expression.split(".").map((el) => el.trim())
  const lastKey = array.pop()

  let current = scope
  for (let key of array) {
    if (!current[key]) current[key] = {}
    current = current[key]
  }

  return [current, lastKey]
}

function getDependencies(expression, scope) {
  const dependencies = new Set()
  const regex = /\b[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*\b/g
  const matches = expression.match(regex)

  if (!matches) return []

  const variables = matches.filter(
    (v) => !Number.isFinite(+v) && !["true", "false", "null"].includes(v),
  )

  variables.forEach((dep) => {
    const parts = dep.split(".")

    // Skip if the last part is a known method name
    const lastPart = parts[parts.length - 1]
    if (
      [
        "filter",
        "map",
        "reduce",
        "forEach",
        "find",
        "some",
        "every",
        "includes",
        "join",
        "slice",
        "splice",
        "push",
        "pop",
        "shift",
        "unshift",
        "sort",
        "reverse",
      ].includes(lastPart)
    ) {
      return
    }

    const [parent, key] = getNestedProp(scope, dep)
    if (parent[key] !== undefined) {
      dependencies.add(dep)
    }
  })

  return Array.from(dependencies)
}

function spanMultipleInstancies(expression, delimitator = ";") {
  let multiple = false
  const instancies = expression.split(delimitator).map((el) => el.trim())
  const length = instancies.length
  if (length > 1) multiple = true
  return { instancies, length, multiple }
}

const stringToObject2 = (expr) =>
  new Function("$scope", `with($scope) { return (${expr}) }`)
