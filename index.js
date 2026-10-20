var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "../node_modules/react/cjs/react.production.js"(exports) {
    "use strict";
    var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
    var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    __name(getIteratorFn, "getIteratorFn");
    var ReactNoopUpdateQueue = {
      isMounted: /* @__PURE__ */ __name(function() {
        return false;
      }, "isMounted"),
      enqueueForceUpdate: /* @__PURE__ */ __name(function() {
      }, "enqueueForceUpdate"),
      enqueueReplaceState: /* @__PURE__ */ __name(function() {
      }, "enqueueReplaceState"),
      enqueueSetState: /* @__PURE__ */ __name(function() {
      }, "enqueueSetState")
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    __name(Component, "Component");
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    __name(ComponentDummy, "ComponentDummy");
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    __name(PureComponent, "PureComponent");
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    function noop() {
    }
    __name(noop, "noop");
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props
      };
    }
    __name(ReactElement, "ReactElement");
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    __name(cloneAndReplaceKey, "cloneAndReplaceKey");
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    __name(isValidElement, "isValidElement");
    function escape2(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match2) {
        return escaperLookup[match2];
      });
    }
    __name(escape2, "escape");
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape2("" + element.key) : index.toString(36);
    }
    __name(getElementKey, "getElementKey");
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    __name(resolveThenable, "resolveThenable");
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    __name(mapIntoArray, "mapIntoArray");
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    __name(mapChildren, "mapChildren");
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    __name(lazyInitializer, "lazyInitializer");
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    var Children = {
      map: mapChildren,
      forEach: /* @__PURE__ */ __name(function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      }, "forEach"),
      count: /* @__PURE__ */ __name(function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      }, "count"),
      toArray: /* @__PURE__ */ __name(function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      }, "toArray"),
      only: /* @__PURE__ */ __name(function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }, "only")
    };
    exports.Activity = REACT_ACTIVITY_TYPE;
    exports.Children = Children;
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = {
      __proto__: null,
      c: /* @__PURE__ */ __name(function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }, "c")
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cacheSignal = function() {
      return null;
    };
    exports.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create2, deps) {
      return ReactSharedInternals.H.useEffect(create2, deps);
    };
    exports.useEffectEvent = function(callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports.useImperativeHandle = function(ref, create2, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create2, deps);
    };
    exports.useInsertionEffect = function(create2, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create2, deps);
    };
    exports.useLayoutEffect = function(create2, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create2, deps);
    };
    exports.useMemo = function(create2, deps) {
      return ReactSharedInternals.H.useMemo(create2, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports.version = "19.2.3";
  }
});

// ../node_modules/react/index.js
var require_react = __commonJS({
  "../node_modules/react/index.js"(exports, module) {
    "use strict";
    if (true) {
      module.exports = require_react_production();
    } else {
      module.exports = null;
    }
  }
});

// src/vault.ts
import { DurableObject } from "cloudflare:workers";

// src/shims/expo-sqlite.ts
var storage = null;
function bindStorage(s) {
  storage = s;
}
__name(bindStorage, "bindStorage");
function sql() {
  if (!storage) throw new Error("Database used before the Durable Object bound its storage");
  return storage.sql;
}
__name(sql, "sql");
var bind = /* @__PURE__ */ __name((params) => (params ?? []).map((v) => v === void 0 ? null : typeof v === "boolean" ? v ? 1 : 0 : v), "bind");
var GET_VERSION = /^\s*PRAGMA\s+user_version\s*;?\s*$/i;
var SET_VERSION = /PRAGMA\s+user_version\s*=\s*(\d+)\s*;?/gi;
var JOURNAL = /PRAGMA\s+journal_mode\s*=\s*\w+\s*;?/gi;
function versionTable() {
  sql().exec("CREATE TABLE IF NOT EXISTS _schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)");
}
__name(versionTable, "versionTable");
function readVersion() {
  versionTable();
  return sql().exec("SELECT version FROM _schema_version WHERE id = 1").toArray()[0]?.version ?? 0;
}
__name(readVersion, "readVersion");
function writeVersion(v) {
  versionTable();
  sql().exec("INSERT OR REPLACE INTO _schema_version (id, version) VALUES (1, ?)", v);
}
__name(writeVersion, "writeVersion");
function prepare(source) {
  let rest = source.replace(JOURNAL, "");
  rest = rest.replace(SET_VERSION, (_m, v) => {
    writeVersion(Number(v));
    return "";
  });
  return rest.trim();
}
__name(prepare, "prepare");
var Database = class {
  static {
    __name(this, "Database");
  }
  async execAsync(source) {
    const rest = prepare(source);
    if (rest) sql().exec(rest);
  }
  async getAllAsync(source, params) {
    if (GET_VERSION.test(source)) return [{ user_version: readVersion() }];
    return sql().exec(source, ...bind(params)).toArray();
  }
  async getFirstAsync(source, params) {
    return (await this.getAllAsync(source, params))[0] ?? null;
  }
  async runAsync(source, params) {
    const cursor = sql().exec(source, ...bind(params));
    cursor.toArray();
    return { lastInsertRowId: 0, changes: cursor.rowsWritten };
  }
  /** Rolls back everything `fn` wrote if it throws (nested calls join the outer transaction). */
  async withTransactionAsync(fn) {
    if (!storage) throw new Error("Database used before the Durable Object bound its storage");
    await storage.transaction(async () => {
      await fn();
    });
  }
};
var db = new Database();
async function openDatabaseAsync(_name) {
  return db;
}
__name(openDatabaseAsync, "openDatabaseAsync");

// ../src/modules/shared/db/live.ts
var import_react2 = __toESM(require_react());

// ../node_modules/zustand/esm/vanilla.mjs
var createStoreImpl = /* @__PURE__ */ __name((createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = /* @__PURE__ */ __name((partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  }, "setState");
  const getState = /* @__PURE__ */ __name(() => state, "getState");
  const getInitialState = /* @__PURE__ */ __name(() => initialState, "getInitialState");
  const subscribe = /* @__PURE__ */ __name((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, "subscribe");
  const api = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api);
  return api;
}, "createStoreImpl");
var createStore = /* @__PURE__ */ __name(((createState) => createState ? createStoreImpl(createState) : createStoreImpl), "createStore");

// ../node_modules/zustand/esm/react.mjs
var import_react = __toESM(require_react(), 1);
var identity = /* @__PURE__ */ __name((arg) => arg, "identity");
function useStore(api, selector = identity) {
  const slice = import_react.default.useSyncExternalStore(
    api.subscribe,
    import_react.default.useCallback(() => selector(api.getState()), [api, selector]),
    import_react.default.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  import_react.default.useDebugValue(slice);
  return slice;
}
__name(useStore, "useStore");
var createImpl = /* @__PURE__ */ __name((createState) => {
  const api = createStore(createState);
  const useBoundStore = /* @__PURE__ */ __name((selector) => useStore(api, selector), "useBoundStore");
  Object.assign(useBoundStore, api);
  return useBoundStore;
}, "createImpl");
var create = /* @__PURE__ */ __name(((createState) => createState ? createImpl(createState) : createImpl), "create");

// ../src/modules/shared/db/live.ts
var initial = {
  accounts: 0,
  categories: 0,
  payees: 0,
  payee_aliases: 0,
  transactions: 0,
  inbox_items: 0,
  recurring: 0,
  templates: 0,
  debts: 0,
  fx_rates: 0,
  settings: 0
};
var useVersions = create(() => initial);
function notify(tables) {
  useVersions.setState((s) => {
    const next = { ...s };
    for (const t of tables) next[t] = s[t] + 1;
    return next;
  });
}
__name(notify, "notify");

// ../src/modules/shared/db/syncSchema.ts
var SYNCED_TABLES = {
  accounts: "id",
  categories: "id",
  payees: "id",
  payee_aliases: "raw",
  recurring: "id",
  templates: "id",
  debts: "id",
  transactions: "id",
  inbox_items: "id",
  settings: "key"
};
var SYNCED_TABLE_NAMES = Object.keys(SYNCED_TABLES);
var isSyncedTable = /* @__PURE__ */ __name((t) => typeof t === "string" && Object.prototype.hasOwnProperty.call(SYNCED_TABLES, t), "isSyncedTable");
var SYNCED_SETTINGS = ["baseCurrency", "instapayFee", "mergeWindowMinutes", "timeZone"];
var NOW_MS_SQL = "CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)";
function outboxTriggersSql(tables) {
  const settingsFilter = /* @__PURE__ */ __name((row) => ` AND ${row}.key IN (${SYNCED_SETTINGS.map((k) => `'${k}'`).join(", ")})`, "settingsFilter");
  const record = /* @__PURE__ */ __name((table, pk) => `UPDATE sync_state SET rev = rev + 1;
    INSERT OR REPLACE INTO sync_outbox (seq, tbl, pk, at, origin) SELECT rev, '${table}', ${pk}, ${NOW_MS_SQL}, NULL FROM sync_state;`, "record");
  return Object.entries(tables).map(([table, pk]) => {
    const when = /* @__PURE__ */ __name((row) => `WHEN (SELECT applying FROM sync_state) = 0 AND NOT EXISTS (SELECT 1 FROM sync_incoming WHERE tbl = '${table}' AND pk = ${row}.${pk})${table === "settings" ? settingsFilter(row) : ""}`, "when");
    return `
  CREATE TRIGGER sync_${table}_ins AFTER INSERT ON ${table} ${when("NEW")} BEGIN
    ${record(table, `NEW.${pk}`)}
  END;
  CREATE TRIGGER sync_${table}_upd AFTER UPDATE ON ${table} ${when("NEW")} BEGIN
    ${record(table, `NEW.${pk}`)}
    UPDATE sync_state SET rev = rev + 1 WHERE OLD.${pk} IS NOT NEW.${pk};
    INSERT OR REPLACE INTO sync_outbox (seq, tbl, pk, at, origin)
      SELECT rev, '${table}', OLD.${pk}, ${NOW_MS_SQL}, NULL FROM sync_state WHERE OLD.${pk} IS NOT NEW.${pk};
  END;
  CREATE TRIGGER sync_${table}_del AFTER DELETE ON ${table} ${when("OLD")} BEGIN
    ${record(table, `OLD.${pk}`)}
  END;`;
  }).join("\n");
}
__name(outboxTriggersSql, "outboxTriggersSql");
var SYNC_MIGRATION = `
  CREATE TABLE sync_state (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    applying INTEGER NOT NULL DEFAULT 0,
    rev INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO sync_state (id, applying, rev) VALUES (1, 0, 0);

  CREATE TABLE sync_outbox (
    seq INTEGER PRIMARY KEY NOT NULL,
    tbl TEXT NOT NULL,
    pk TEXT NOT NULL,
    at INTEGER NOT NULL,
    origin TEXT
  );
  CREATE UNIQUE INDEX sync_outbox_row ON sync_outbox(tbl, pk);

  CREATE TABLE sync_incoming (
    tbl TEXT NOT NULL,
    pk TEXT NOT NULL,
    PRIMARY KEY (tbl, pk)
  );
  ${outboxTriggersSql(SYNCED_TABLES)}
`;

// ../src/modules/shared/db/migrations.ts
var migrations = [
  `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL,
    initial_balance INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    default_payment_type TEXT NOT NULL,
    identifiers TEXT NOT NULL DEFAULT '[]',
    bank_balance INTEGER,
    bank_balance_at INTEGER,
    exclude_from_stats INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    nature TEXT NOT NULL DEFAULT 'none',
    system_key TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX categories_parent ON categories(parent_id);

  CREATE TABLE payees (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'merchant',
    default_category_id TEXT,
    default_account_id TEXT,
    auto_confirm INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER
  );
  CREATE UNIQUE INDEX payees_name ON payees(name COLLATE NOCASE);

  CREATE TABLE payee_aliases (
    raw TEXT PRIMARY KEY NOT NULL,
    payee_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX payee_aliases_payee ON payee_aliases(payee_id);

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    to_amount INTEGER,
    category_id TEXT,
    payee_id TEXT,
    payment_type TEXT NOT NULL,
    date INTEGER NOT NULL,
    note TEXT,
    is_instapay INTEGER NOT NULL DEFAULT 0,
    parent_id TEXT,
    nature_override TEXT,
    original_amount INTEGER,
    original_currency TEXT,
    fx_rate REAL,
    base_amount INTEGER NOT NULL,
    recurring_id TEXT,
    debt_id TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_ref TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX tx_date ON transactions(date);
  CREATE INDEX tx_account ON transactions(account_id);
  CREATE INDEX tx_to_account ON transactions(to_account_id);
  CREATE INDEX tx_parent ON transactions(parent_id);
  CREATE INDEX tx_payee ON transactions(payee_id);
  CREATE INDEX tx_debt ON transactions(debt_id);

  CREATE TABLE inbox_items (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    parsed TEXT,
    received_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    recurring_id TEXT,
    dedupe_key TEXT,
    note TEXT,
    resolved_at INTEGER
  );
  CREATE INDEX inbox_status ON inbox_items(status);
  CREATE UNIQUE INDEX inbox_dedupe ON inbox_items(dedupe_key);

  CREATE TABLE recurring (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    account_id TEXT,
    to_account_id TEXT,
    category_id TEXT,
    payee_id TEXT,
    payment_type TEXT,
    note TEXT,
    is_instapay INTEGER NOT NULL DEFAULT 0,
    frequency TEXT NOT NULL,
    interval INTEGER NOT NULL DEFAULT 1,
    start_date INTEGER NOT NULL,
    end_type TEXT NOT NULL DEFAULT 'never',
    end_date INTEGER,
    end_count INTEGER,
    occurrences INTEGER NOT NULL DEFAULT 0,
    next_due INTEGER,
    mode TEXT NOT NULL DEFAULT 'confirm',
    remind_days_before INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    account_id TEXT,
    to_account_id TEXT,
    category_id TEXT,
    payee_id TEXT,
    payment_type TEXT,
    note TEXT,
    is_instapay INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE debts (
    id TEXT PRIMARY KEY NOT NULL,
    direction TEXT NOT NULL,
    payee_id TEXT NOT NULL,
    account_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    date INTEGER NOT NULL,
    due_date INTEGER,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    closed_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE fx_rates (
    day TEXT NOT NULL,
    base TEXT NOT NULL,
    quote TEXT NOT NULL,
    rate REAL NOT NULL,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (day, base, quote)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  SYNC_MIGRATION
];

// ../src/modules/shared/db/client.ts
var DB_NAME = "mula.db";
var dbPromise = null;
async function openAndMigrate() {
  const db2 = await openDatabaseAsync(DB_NAME);
  await db2.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = OFF; PRAGMA recursive_triggers = ON;");
  const row = await db2.getFirstAsync("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  for (let i = current; i < migrations.length; i++) {
    await db2.withTransactionAsync(async () => {
      await db2.execAsync(migrations[i]);
      await db2.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
  return db2;
}
__name(openAndMigrate, "openAndMigrate");
function getDb() {
  if (!dbPromise) dbPromise = openAndMigrate();
  return dbPromise;
}
__name(getDb, "getDb");
async function all(sql2, params = []) {
  const db2 = await getDb();
  return db2.getAllAsync(sql2, params);
}
__name(all, "all");
async function first(sql2, params = []) {
  const db2 = await getDb();
  return await db2.getFirstAsync(sql2, params) ?? null;
}
__name(first, "first");
async function run(sql2, params = []) {
  const db2 = await getDb();
  await db2.runAsync(sql2, params);
}
__name(run, "run");
async function transaction(tables, fn) {
  const db2 = await getDb();
  let result;
  await db2.withTransactionAsync(async () => {
    result = await fn();
  });
  notify(tables);
  return result;
}
__name(transaction, "transaction");
async function write(tables, sql2, params = []) {
  await run(sql2, params);
  notify(tables);
}
__name(write, "write");
var bool = /* @__PURE__ */ __name((v) => v === 1 || v === true, "bool");
var int = /* @__PURE__ */ __name((v) => v ? 1 : 0, "int");

// ../src/modules/shared/settings/settingsStore.ts
var INSTAPAY_DEFAULT_FEE = { percent: 0.1, min: 50, max: 2e3 };
var defaultSettings = {
  appearance: "system",
  baseCurrency: "EGP",
  instapayFee: INSTAPAY_DEFAULT_FEE,
  digestEnabled: true,
  digestHour: 21,
  backupReminderEnabled: true,
  lastBackupAt: null,
  lastAccountId: null,
  onboarded: false,
  mergeWindowMinutes: 10,
  timeZone: null,
  syncRelayUrl: null,
  syncDeviceId: null,
  syncDatasetId: null,
  syncCursor: 0,
  syncLastAt: null,
  syncLastError: null,
  smsCapture: false,
  smsNotify: true,
  smsExtraSenders: []
};
var useSettings = create(() => ({ ...defaultSettings, loaded: false }));
async function loadSettings() {
  const rows = await all("SELECT key, value FROM settings");
  const patch = {};
  for (const r of rows) {
    if (r.key in defaultSettings) {
      try {
        patch[r.key] = JSON.parse(r.value);
      } catch {
      }
    }
  }
  useSettings.setState({ ...defaultSettings, ...patch, loaded: true });
}
__name(loadSettings, "loadSettings");
async function setSetting(key, value) {
  useSettings.setState({ [key]: value });
  await write(["settings"], "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, JSON.stringify(value)]);
}
__name(setSetting, "setSetting");
var getSettings = /* @__PURE__ */ __name(() => useSettings.getState(), "getSettings");

// src/shims/expo-crypto.ts
var randomUUID = /* @__PURE__ */ __name(() => crypto.randomUUID(), "randomUUID");

// ../src/modules/shared/utils/id.ts
function newId() {
  try {
    return randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
__name(newId, "newId");

// ../src/modules/sync/data/syncStore.ts
var CHUNK = 90;
function chunks(list2, size = CHUNK) {
  const out = [];
  for (let i = 0; i < list2.length; i += size) out.push(list2.slice(i, i + size));
  return out;
}
__name(chunks, "chunks");
async function readOutbox(opts) {
  return all("SELECT seq, tbl, pk, at, origin FROM sync_outbox WHERE seq > ? ORDER BY seq LIMIT ?", [opts.after ?? 0, opts.limit]);
}
__name(readOutbox, "readOutbox");
async function outboxEntry(tbl, pk) {
  return first("SELECT seq, tbl, pk, at, origin FROM sync_outbox WHERE tbl = ? AND pk = ?", [tbl, pk]);
}
__name(outboxEntry, "outboxEntry");
async function attachRows(entries) {
  const found = /* @__PURE__ */ new Map();
  for (const table of SYNCED_TABLE_NAMES) {
    const pkCol = SYNCED_TABLES[table];
    const keys = [...new Set(entries.filter((e) => e.tbl === table).map((e) => e.pk))];
    for (const part of chunks(keys)) {
      const rows = await all(`SELECT * FROM ${table} WHERE ${pkCol} IN (${part.map(() => "?").join(",")})`, part);
      for (const r of rows) found.set(`${table}\0${String(r[pkCol])}`, r);
    }
  }
  return entries.map((e) => ({ tbl: e.tbl, pk: e.pk, at: e.at, row: found.get(`${e.tbl}\0${e.pk}`) ?? null }));
}
__name(attachRows, "attachRows");
async function setApplying(on) {
  await run("UPDATE sync_state SET applying = ?", [on ? 1 : 0]);
}
__name(setApplying, "setApplying");
async function nextRev(count = 1) {
  await run("UPDATE sync_state SET rev = rev + ?", [count]);
  return (await first("SELECT rev FROM sync_state")).rev;
}
__name(nextRev, "nextRev");
var columnCache = /* @__PURE__ */ new Map();
async function columnsOf(table) {
  let cols = columnCache.get(table);
  if (!cols) {
    cols = new Set((await all(`PRAGMA table_info(${table})`)).map((c) => c.name));
    columnCache.set(table, cols);
  }
  return cols;
}
__name(columnsOf, "columnsOf");
async function tracked(fn) {
  const was = (await first("SELECT applying FROM sync_state"))?.applying ?? 0;
  if (was) await setApplying(false);
  try {
    await fn();
  } finally {
    if (was) await setApplying(true);
  }
}
__name(tracked, "tracked");
async function makeRoom(change) {
  const { row } = change;
  if (change.tbl === "payees" && typeof row.name === "string") {
    const clash = await first("SELECT id, name FROM payees WHERE name = ? COLLATE NOCASE AND id != ?", [row.name, change.pk]);
    if (!clash) return;
    let n = 2;
    while (await first("SELECT 1 FROM payees WHERE name = ? COLLATE NOCASE", [`${clash.name} (${n})`])) n++;
    await tracked(() => run("UPDATE payees SET name = ? WHERE id = ?", [`${clash.name} (${n})`, clash.id]));
  }
  if (change.tbl === "inbox_items" && typeof row.dedupe_key === "string") {
    const clash = await first("SELECT id FROM inbox_items WHERE dedupe_key = ? AND id != ?", [row.dedupe_key, change.pk]);
    if (!clash) return;
    await tracked(() => run("UPDATE inbox_items SET dedupe_key = dedupe_key || '|dup:' || id WHERE id = ?", [clash.id]));
  }
}
__name(makeRoom, "makeRoom");
async function applyChange(change) {
  if (!isSyncedTable(change.tbl)) return;
  const pkCol = SYNCED_TABLES[change.tbl];
  if (change.tbl === "settings" && !SYNCED_SETTINGS.includes(change.pk)) return;
  if (!change.row) {
    await run(`DELETE FROM ${change.tbl} WHERE ${pkCol} = ?`, [change.pk]);
    return;
  }
  const known = await columnsOf(change.tbl);
  const cols = Object.keys(change.row).filter((c) => known.has(c));
  if (!cols.includes(pkCol)) return;
  await makeRoom(change);
  const updates = cols.filter((c) => c !== pkCol);
  const values = cols.map((c) => change.row[c]);
  await run(
    `INSERT INTO ${change.tbl} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})
     ON CONFLICT(${pkCol}) DO ${updates.length ? `UPDATE SET ${updates.map((c) => `${c} = excluded.${c}`).join(", ")}` : "NOTHING"}`,
    values
  );
}
__name(applyChange, "applyChange");
function validChanges(input, max) {
  if (!Array.isArray(input) || input.length > max) return null;
  const out = [];
  for (const c of input) {
    if (!c || typeof c !== "object") return null;
    const { tbl, pk, at, row } = c;
    if (!isSyncedTable(tbl) || typeof pk !== "string" || !pk || typeof at !== "number" || !Number.isFinite(at)) return null;
    if (row !== null && (typeof row !== "object" || Array.isArray(row))) return null;
    if (row) {
      for (const v of Object.values(row)) {
        if (v !== null && typeof v !== "string" && typeof v !== "number") return null;
      }
      if (String(row[SYNCED_TABLES[tbl]]) !== pk) return null;
    }
    out.push({ tbl, pk, at, row: row ?? null });
  }
  return out;
}
__name(validChanges, "validChanges");

// src/changes.ts
var KEEP_CHANGES = 300;
async function jsonOf(table, alias) {
  const cols = [...await columnsOf(table)];
  return `json_object(${cols.map((c) => `'${c}', ${alias}.${c}`).join(", ")})`;
}
__name(jsonOf, "jsonOf");
async function installServerSchema() {
  await run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS claude_changes (
    id TEXT PRIMARY KEY NOT NULL, at INTEGER NOT NULL, tool TEXT NOT NULL, summary TEXT NOT NULL,
    rows INTEGER NOT NULL DEFAULT 0, undone_at INTEGER)`);
  await run("CREATE INDEX IF NOT EXISTS claude_changes_at ON claude_changes(at)");
  await run(`CREATE TABLE IF NOT EXISTS claude_change_rows (
    change_id TEXT NOT NULL, tbl TEXT NOT NULL, pk TEXT NOT NULL, before TEXT, after TEXT,
    PRIMARY KEY (change_id, tbl, pk))`);
  await run("CREATE TABLE IF NOT EXISTS undo_ctx (id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1), change_id TEXT)");
  await run("INSERT OR IGNORE INTO undo_ctx (id, change_id) VALUES (1, NULL)");
  await run("UPDATE undo_ctx SET change_id = NULL WHERE change_id IS NOT NULL");
  await run("UPDATE sync_state SET applying = 0 WHERE applying != 0");
  const parts = [];
  for (const table of SYNCED_TABLE_NAMES) parts.push(`${table}:${[...await columnsOf(table)].join(",")}`);
  const signature = parts.join("|");
  const saved = await first("SELECT value FROM meta WHERE key = 'undo_triggers'");
  if (saved?.value === signature) return;
  for (const table of SYNCED_TABLE_NAMES) {
    const pk = SYNCED_TABLES[table];
    const when = "WHEN (SELECT change_id FROM undo_ctx) IS NOT NULL";
    const capture = /* @__PURE__ */ __name((row, before) => `INSERT OR IGNORE INTO claude_change_rows (change_id, tbl, pk, before) VALUES ((SELECT change_id FROM undo_ctx), '${table}', ${row}.${pk}, ${before});`, "capture");
    for (const name of ["bu", "bd", "ai"]) await run(`DROP TRIGGER IF EXISTS undo_${table}_${name}`);
    await run(`CREATE TRIGGER undo_${table}_bu BEFORE UPDATE ON ${table} ${when} BEGIN ${capture("OLD", await jsonOf(table, "OLD"))} END`);
    await run(`CREATE TRIGGER undo_${table}_bd BEFORE DELETE ON ${table} ${when} BEGIN ${capture("OLD", await jsonOf(table, "OLD"))} END`);
    await run(`CREATE TRIGGER undo_${table}_ai AFTER INSERT ON ${table} ${when} BEGIN ${capture("NEW", "NULL")} END`);
  }
  await run("INSERT OR REPLACE INTO meta (key, value) VALUES ('undo_triggers', ?)", [signature]);
}
__name(installServerSchema, "installServerSchema");
async function rowJson(table, pk) {
  const r = await first(`SELECT ${await jsonOf(table, "t")} AS j FROM ${table} t WHERE t.${SYNCED_TABLES[table]} = ?`, [pk]);
  return r?.j ?? null;
}
__name(rowJson, "rowJson");
async function recordChange(tool, fn) {
  const id = newId();
  let out;
  await transaction([], async () => {
    await run("UPDATE undo_ctx SET change_id = ?", [id]);
    const { value, summary } = await fn();
    await run("UPDATE undo_ctx SET change_id = NULL");
    const tables = await all("SELECT tbl, COUNT(*) AS n FROM claude_change_rows WHERE change_id = ? GROUP BY tbl", [id]);
    const rows = tables.reduce((s, t) => s + t.n, 0);
    if (rows) {
      for (const { tbl } of tables) {
        await run(
          `UPDATE claude_change_rows SET after = (SELECT ${await jsonOf(tbl, "t")} FROM ${tbl} t WHERE t.${SYNCED_TABLES[tbl]} = claude_change_rows.pk)
           WHERE change_id = ? AND tbl = ?`,
          [id, tbl]
        );
      }
      await run("INSERT INTO claude_changes (id, at, tool, summary, rows) VALUES (?, ?, ?, ?, ?)", [id, Date.now(), tool, summary.slice(0, 300), rows]);
    }
    out = { value, changeId: rows ? id : null };
  });
  if (out.changeId) await prune();
  return out;
}
__name(recordChange, "recordChange");
async function prune() {
  const old = await all("SELECT id FROM claude_changes ORDER BY at DESC LIMIT -1 OFFSET ?", [KEEP_CHANGES]);
  for (const { id } of old) {
    await run("DELETE FROM claude_change_rows WHERE change_id = ?", [id]);
    await run("DELETE FROM claude_changes WHERE id = ?", [id]);
  }
}
__name(prune, "prune");
async function listActivity(limit = 50) {
  const rows = await all("SELECT * FROM claude_changes ORDER BY at DESC LIMIT ?", [Math.min(Math.max(1, limit), 300)]);
  return rows.map((r) => ({ id: r.id, at: r.at, tool: r.tool, summary: r.summary, rows: r.rows, undoneAt: r.undone_at }));
}
__name(listActivity, "listActivity");
var UndoError = class extends Error {
  static {
    __name(this, "UndoError");
  }
};
async function undoChange(id) {
  const change = await first("SELECT * FROM claude_changes WHERE id = ?", [id]);
  if (!change) throw new UndoError("There is no change with that id (it may be too old to undo).");
  if (change.undone_at) throw new UndoError("That change was already undone.");
  const rows = await all(
    "SELECT tbl, pk, before, after FROM claude_change_rows WHERE change_id = ?",
    [id]
  );
  let restored = 0;
  let skipped = 0;
  await transaction([], async () => {
    for (const r of rows) {
      if (!Object.prototype.hasOwnProperty.call(SYNCED_TABLES, r.tbl)) continue;
      if (await rowJson(r.tbl, r.pk) !== r.after) {
        skipped++;
        continue;
      }
      const pkCol = SYNCED_TABLES[r.tbl];
      if (r.before == null) {
        await run(`DELETE FROM ${r.tbl} WHERE ${pkCol} = ?`, [r.pk]);
      } else {
        const known = await columnsOf(r.tbl);
        const data = JSON.parse(r.before);
        const cols = Object.keys(data).filter((c) => known.has(c));
        await run(
          `INSERT OR REPLACE INTO ${r.tbl} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
          cols.map((c) => data[c])
        );
      }
      restored++;
    }
    await run("UPDATE claude_changes SET undone_at = ? WHERE id = ?", [Date.now(), id]);
  });
  return { restored, skipped, summary: change.summary };
}
__name(undoChange, "undoChange");

// ../src/modules/accounts/data/accountsRepo.ts
function rowToAccount(r) {
  let identifiers = [];
  try {
    identifiers = JSON.parse(r.identifiers);
  } catch {
    identifiers = [];
  }
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    currency: r.currency,
    initialBalance: r.initial_balance,
    color: r.color,
    icon: r.icon,
    defaultPaymentType: r.default_payment_type,
    identifiers,
    bankBalance: r.bank_balance,
    bankBalanceAt: r.bank_balance_at,
    excludeFromStats: bool(r.exclude_from_stats),
    archived: bool(r.archived),
    sortOrder: r.sort_order,
    createdAt: r.created_at
  };
}
__name(rowToAccount, "rowToAccount");
async function listAccounts(includeArchived = false) {
  const rows = await all(
    `SELECT * FROM accounts ${includeArchived ? "" : "WHERE archived = 0"} ORDER BY sort_order, created_at`
  );
  return rows.map(rowToAccount);
}
__name(listAccounts, "listAccounts");
async function getAccount(id) {
  const r = await first("SELECT * FROM accounts WHERE id = ?", [id]);
  return r ? rowToAccount(r) : null;
}
__name(getAccount, "getAccount");
async function saveAccount(input) {
  const id = input.id ?? newId();
  const existing = input.id ? await getAccount(input.id) : null;
  const sortRow = await first("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM accounts");
  await write(
    ["accounts"],
    `INSERT OR REPLACE INTO accounts
      (id, name, type, currency, initial_balance, color, icon, default_payment_type, identifiers,
       bank_balance, bank_balance_at, exclude_from_stats, archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.type,
      input.currency,
      input.initialBalance,
      input.color,
      input.icon,
      input.defaultPaymentType,
      JSON.stringify(input.identifiers.map((s) => s.trim()).filter(Boolean)),
      existing?.bankBalance ?? null,
      existing?.bankBalanceAt ?? null,
      int(input.excludeFromStats),
      int(input.archived),
      input.sortOrder ?? existing?.sortOrder ?? sortRow?.n ?? 0,
      existing?.createdAt ?? Date.now()
    ]
  );
  return id;
}
__name(saveAccount, "saveAccount");
async function deleteAccount(id) {
  await transaction(["accounts", "transactions"], async () => {
    await run("DELETE FROM transactions WHERE account_id = ? OR to_account_id = ?", [id, id]);
    await run("DELETE FROM accounts WHERE id = ?", [id]);
  });
}
__name(deleteAccount, "deleteAccount");
async function findAccountByIdentifier(last4) {
  if (!last4) return null;
  const accounts = await listAccounts(true);
  return accounts.find((a) => a.identifiers.some((i) => i.endsWith(last4) || last4.endsWith(i))) ?? null;
}
__name(findAccountByIdentifier, "findAccountByIdentifier");
async function findAccountByHint(hint) {
  const h = hint?.trim().toLowerCase();
  if (!h) return null;
  const accounts = await listAccounts();
  return accounts.find((a) => a.identifiers.some((i) => i.trim().toLowerCase() === h)) ?? accounts.find((a) => a.name.trim().toLowerCase() === h) ?? accounts.find((a) => a.name.trim().length >= 3 && h.includes(a.name.trim().toLowerCase())) ?? null;
}
__name(findAccountByHint, "findAccountByHint");
async function getBalances() {
  const rows = await all(
    `SELECT a.id,
       a.initial_balance
       + COALESCE((SELECT SUM(CASE t.type WHEN 'income' THEN t.amount ELSE -t.amount END)
                   FROM transactions t WHERE t.account_id = a.id), 0)
       + COALESCE((SELECT SUM(t.to_amount) FROM transactions t
                   WHERE t.type = 'transfer' AND t.to_account_id = a.id), 0) AS balance
     FROM accounts a`
  );
  const out = {};
  for (const r of rows) out[r.id] = r.balance;
  return out;
}
__name(getBalances, "getBalances");

// ../src/modules/categories/data/categoriesRepo.ts
var toCategory = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  parentId: r.parent_id,
  name: r.name,
  kind: r.kind,
  icon: r.icon,
  color: r.color,
  nature: r.nature,
  systemKey: r.system_key,
  archived: bool(r.archived),
  sortOrder: r.sort_order
}), "toCategory");
async function listCategories(includeArchived = false) {
  const rows = await all(
    `SELECT * FROM categories ${includeArchived ? "" : "WHERE archived = 0"} ORDER BY sort_order, name`
  );
  return rows.map(toCategory);
}
__name(listCategories, "listCategories");
async function getCategory(id) {
  const r = await first("SELECT * FROM categories WHERE id = ?", [id]);
  return r ? toCategory(r) : null;
}
__name(getCategory, "getCategory");
async function saveCategory(input) {
  const id = input.id ?? newId();
  const existing = input.id ? await getCategory(input.id) : null;
  const order = await first(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories WHERE parent_id IS ?",
    [input.parentId]
  );
  await write(
    ["categories"],
    `INSERT OR REPLACE INTO categories (id, parent_id, name, kind, icon, color, nature, system_key, archived, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.parentId,
      input.name.trim(),
      input.kind,
      input.icon,
      input.color,
      input.nature,
      existing?.systemKey ?? null,
      int(existing?.archived ?? false),
      existing?.sortOrder ?? order?.n ?? 0
    ]
  );
  return id;
}
__name(saveCategory, "saveCategory");
async function setCategoryArchived(id, archived) {
  await write(["categories"], "UPDATE categories SET archived = ? WHERE id = ? OR parent_id = ?", [int(archived), id, id]);
}
__name(setCategoryArchived, "setCategoryArchived");
async function setCategoryNature(id, nature) {
  await write(["categories"], "UPDATE categories SET nature = ? WHERE id = ?", [nature, id]);
}
__name(setCategoryNature, "setCategoryNature");
async function restoreCategory(id) {
  const cat = await getCategory(id);
  if (!cat) return;
  await transaction(["categories"], async () => {
    await run("UPDATE categories SET archived = 0 WHERE id = ? OR parent_id = ?", [id, id]);
    if (cat.parentId) await run("UPDATE categories SET archived = 0 WHERE id = ?", [cat.parentId]);
  });
}
__name(restoreCategory, "restoreCategory");
async function findCategoryByHint(hint, kind) {
  const parts = (hint ?? "").split(/›|>|\//).map((p) => p.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return null;
  const name = parts[parts.length - 1];
  const parentName = parts.length > 1 ? parts[0] : null;
  const all2 = (await listCategories()).filter((c) => c.kind === kind);
  const byId = new Map(all2.map((c) => [c.id, c]));
  const named = all2.filter((c) => c.name.toLowerCase() === name);
  const inParent = parentName ? named.find((c) => c.parentId && byId.get(c.parentId)?.name.toLowerCase() === parentName) : void 0;
  return inParent ?? named.find((c) => c.parentId) ?? named[0] ?? (name.length >= 3 ? all2.find((c) => c.name.toLowerCase().includes(name) || name.includes(c.name.toLowerCase())) : void 0) ?? null;
}
__name(findCategoryByHint, "findCategoryByHint");

// ../src/modules/shared/utils/text.ts
function normalizeRaw(raw) {
  return raw.replace(/[^A-Za-z0-9؀-ۿ &'.-]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}
__name(normalizeRaw, "normalizeRaw");

// ../src/modules/payees/data/payeesRepo.ts
var toPayee = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  defaultCategoryId: r.default_category_id,
  defaultAccountId: r.default_account_id,
  autoConfirm: bool(r.auto_confirm),
  note: r.note,
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at
}), "toPayee");
async function listPayees() {
  const rows = await all("SELECT * FROM payees ORDER BY COALESCE(last_used_at, created_at) DESC");
  return rows.map(toPayee);
}
__name(listPayees, "listPayees");
async function getPayee(id) {
  const r = await first("SELECT * FROM payees WHERE id = ?", [id]);
  return r ? toPayee(r) : null;
}
__name(getPayee, "getPayee");
async function findPayeeByName(name) {
  const r = await first("SELECT * FROM payees WHERE name = ? COLLATE NOCASE", [name.trim()]);
  return r ? toPayee(r) : null;
}
__name(findPayeeByName, "findPayeeByName");
async function findOrCreatePayee(name, kind = "merchant") {
  const existing = await findPayeeByName(name);
  if (existing) return existing;
  const id = newId();
  const now = Date.now();
  await write(
    ["payees"],
    "INSERT INTO payees (id, name, kind, auto_confirm, created_at) VALUES (?, ?, ?, 0, ?)",
    [id, name.trim(), kind, now]
  );
  return await getPayee(id);
}
__name(findOrCreatePayee, "findOrCreatePayee");
async function updatePayee(p) {
  await write(
    ["payees"],
    `UPDATE payees SET name = ?, kind = ?, default_category_id = ?, default_account_id = ?, auto_confirm = ?, note = ? WHERE id = ?`,
    [p.name.trim(), p.kind, p.defaultCategoryId, p.defaultAccountId, int(p.autoConfirm), p.note, p.id]
  );
}
__name(updatePayee, "updatePayee");
async function learnFromUse(payeeId, categoryId, accountId) {
  await write(
    ["payees"],
    `UPDATE payees SET last_used_at = ?,
       default_category_id = COALESCE(?, default_category_id),
       default_account_id = COALESCE(?, default_account_id)
     WHERE id = ?`,
    [Date.now(), categoryId, accountId, payeeId]
  );
}
__name(learnFromUse, "learnFromUse");
async function deletePayee(id) {
  await transaction(["payees", "payee_aliases", "transactions", "templates", "recurring"], async () => {
    await run("UPDATE transactions SET payee_id = NULL WHERE payee_id = ?", [id]);
    await run("UPDATE templates SET payee_id = NULL WHERE payee_id = ?", [id]);
    await run("UPDATE recurring SET payee_id = NULL WHERE payee_id = ?", [id]);
    await run("DELETE FROM payee_aliases WHERE payee_id = ?", [id]);
    await run("DELETE FROM payees WHERE id = ?", [id]);
  });
}
__name(deletePayee, "deletePayee");
async function mergePayees(fromId, intoId) {
  if (fromId === intoId) return;
  await transaction(["payees", "payee_aliases", "transactions", "debts", "templates", "recurring"], async () => {
    await run("UPDATE transactions SET payee_id = ? WHERE payee_id = ?", [intoId, fromId]);
    await run("UPDATE payee_aliases SET payee_id = ? WHERE payee_id = ?", [intoId, fromId]);
    await run("UPDATE debts SET payee_id = ? WHERE payee_id = ?", [intoId, fromId]);
    await run("UPDATE templates SET payee_id = ? WHERE payee_id = ?", [intoId, fromId]);
    await run("UPDATE recurring SET payee_id = ? WHERE payee_id = ?", [intoId, fromId]);
    await run("DELETE FROM payees WHERE id = ?", [fromId]);
  });
}
__name(mergePayees, "mergePayees");
async function resolveAlias(raw) {
  if (!raw) return null;
  const key = normalizeRaw(raw);
  if (!key) return null;
  const r = await first(
    "SELECT p.* FROM payee_aliases a JOIN payees p ON p.id = a.payee_id WHERE a.raw = ?",
    [key]
  );
  return r ? toPayee(r) : null;
}
__name(resolveAlias, "resolveAlias");
async function setAlias(raw, payeeId, opts = {}) {
  const key = normalizeRaw(raw);
  if (!key) return;
  await transaction(["payee_aliases", "payees", "transactions"], async () => {
    const prev = await first("SELECT payee_id FROM payee_aliases WHERE raw = ?", [key]);
    await run("INSERT OR REPLACE INTO payee_aliases (raw, payee_id, created_at) VALUES (?, ?, ?)", [key, payeeId, Date.now()]);
    if (opts.relabelPast && prev && prev.payee_id !== payeeId) {
      await run("UPDATE transactions SET payee_id = ? WHERE payee_id = ?", [payeeId, prev.payee_id]);
      const left = await first(
        `SELECT (SELECT COUNT(*) FROM transactions WHERE payee_id = ?) + (SELECT COUNT(*) FROM payee_aliases WHERE payee_id = ?)
           + (SELECT COUNT(*) FROM debts WHERE payee_id = ?) AS n`,
        [prev.payee_id, prev.payee_id, prev.payee_id]
      );
      if (!left?.n) await run("DELETE FROM payees WHERE id = ?", [prev.payee_id]);
    }
  });
}
__name(setAlias, "setAlias");
async function removeAlias(raw) {
  await write(["payee_aliases"], "DELETE FROM payee_aliases WHERE raw = ?", [normalizeRaw(raw)]);
}
__name(removeAlias, "removeAlias");

// ../src/modules/shared/utils/money.ts
var toMinor = /* @__PURE__ */ __name((major2) => Math.round(major2 * 100), "toMinor");
var toMajor = /* @__PURE__ */ __name((minor) => minor / 100, "toMajor");
var CURRENCIES = ["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD", "QAR", "TRY", "INR", "CAD", "AUD", "CHF", "JPY", "CNY"];

// src/dates.ts
var formatters = /* @__PURE__ */ new Map();
function formatter(tz) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short"
    });
    formatters.set(tz, f);
  }
  return f;
}
__name(formatter, "formatter");
function validZone(tz) {
  if (!tz) return "UTC";
  try {
    formatter(tz);
    return tz;
  } catch {
    return "UTC";
  }
}
__name(validZone, "validZone");
var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function localParts(at, tz) {
  const parts = {};
  for (const p of formatter(tz).formatToParts(new Date(at))) parts[p.type] = p.value;
  return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, mi: +parts.minute, s: +parts.second, weekday: WEEKDAYS.indexOf(parts.weekday) };
}
__name(localParts, "localParts");
function offsetAt(at, tz) {
  const p = localParts(at, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(at / 1e3) * 1e3;
}
__name(offsetAt, "offsetAt");
function fromLocal(tz, y, m, d, h = 0, mi = 0, s = 0, ms = 0) {
  const guess = Date.UTC(y, m - 1, d, h, mi, s, ms);
  const first2 = guess - offsetAt(guess, tz);
  const second = guess - offsetAt(first2, tz);
  return second;
}
__name(fromLocal, "fromLocal");
var pad = /* @__PURE__ */ __name((n) => String(n).padStart(2, "0"), "pad");
function formatLocal(at, tz) {
  const p = localParts(at, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`;
}
__name(formatLocal, "formatLocal");
function formatDay(at, tz) {
  const p = localParts(at, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}
__name(formatDay, "formatDay");
var DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
var LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
function parseMoment(input, tz, edge = "noon") {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string" || !input.trim()) return null;
  const text2 = input.trim();
  const day = DATE_ONLY.exec(text2);
  if (day) {
    const [y, m, d] = [+day[1], +day[2], +day[3]];
    if (edge === "start") return fromLocal(tz, y, m, d);
    if (edge === "end") return fromLocal(tz, y, m, d, 23, 59, 59, 999);
    return fromLocal(tz, y, m, d, 12);
  }
  const local = LOCAL_DATETIME.exec(text2);
  if (local) return fromLocal(tz, +local[1], +local[2], +local[3], +local[4], +local[5], local[6] ? +local[6] : 0);
  const t = Date.parse(text2);
  return Number.isFinite(t) ? t : null;
}
__name(parseMoment, "parseMoment");
var PERIODS = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "last_30_days", "last_90_days", "this_year", "last_year", "all_time"];
function resolvePeriod(args, tz, now = Date.now()) {
  const p = localParts(now, tz);
  const startOfDay2 = /* @__PURE__ */ __name((y, m, d) => fromLocal(tz, y, m, d), "startOfDay");
  const endOfDay2 = /* @__PURE__ */ __name((y, m, d) => fromLocal(tz, y, m, d, 23, 59, 59, 999), "endOfDay");
  const fromArg = args.from != null ? parseMoment(args.from, tz, "start") : null;
  const toArg = args.to != null ? parseMoment(args.to, tz, "end") : null;
  if (args.from != null && fromArg == null) return { error: "from must be a date like 2026-10-01" };
  if (args.to != null && toArg == null) return { error: "to must be a date like 2026-10-31" };
  if (fromArg != null || toArg != null) {
    return { from: fromArg ?? 0, to: toArg ?? now, label: `${fromArg != null ? formatDay(fromArg, tz) : "the start"} to ${toArg != null ? formatDay(toArg, tz) : "now"}` };
  }
  const period = typeof args.period === "string" ? args.period : "this_month";
  const dayMs = 864e5;
  switch (period) {
    case "today":
      return { from: startOfDay2(p.y, p.m, p.d), to: endOfDay2(p.y, p.m, p.d), label: "today" };
    case "yesterday": {
      const y = localParts(now - dayMs, tz);
      return { from: startOfDay2(y.y, y.m, y.d), to: endOfDay2(y.y, y.m, y.d), label: "yesterday" };
    }
    case "this_week":
    case "last_week": {
      const back = (p.weekday + 6) % 7;
      const monday = localParts(now - back * dayMs, tz);
      const start = startOfDay2(monday.y, monday.m, monday.d);
      if (period === "this_week") return { from: start, to: now, label: "this week" };
      const prev = localParts(start - 7 * dayMs + 36e5 * 12, tz);
      return { from: startOfDay2(prev.y, prev.m, prev.d), to: start - 1, label: "last week" };
    }
    case "this_month":
      return { from: startOfDay2(p.y, p.m, 1), to: now, label: "this month" };
    case "last_month": {
      const y = p.m === 1 ? p.y - 1 : p.y;
      const m = p.m === 1 ? 12 : p.m - 1;
      return { from: startOfDay2(y, m, 1), to: startOfDay2(p.y, p.m, 1) - 1, label: "last month" };
    }
    case "last_30_days":
      return { from: now - 30 * dayMs, to: now, label: "the last 30 days" };
    case "last_90_days":
      return { from: now - 90 * dayMs, to: now, label: "the last 90 days" };
    case "this_year":
      return { from: startOfDay2(p.y, 1, 1), to: now, label: "this year" };
    case "last_year":
      return { from: startOfDay2(p.y - 1, 1, 1), to: startOfDay2(p.y, 1, 1) - 1, label: "last year" };
    case "all_time":
      return { from: 0, to: now, label: "all time" };
    default:
      return { error: `period must be one of ${PERIODS.join(", ")}` };
  }
}
__name(resolvePeriod, "resolvePeriod");

// src/tools/shared.ts
var InputError = class extends Error {
  static {
    __name(this, "InputError");
  }
};
var ok = /* @__PURE__ */ __name((body) => ({ content: [{ type: "text", text: typeof body === "string" ? body : JSON.stringify(body) }] }), "ok");
function text(v, field, max = 200) {
  if (v === void 0 || v === null || v === "") return null;
  if (typeof v !== "string") throw new InputError(`${field} must be text`);
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}
__name(text, "text");
function flag(v, field) {
  if (v === void 0 || v === null) return null;
  if (typeof v !== "boolean") throw new InputError(`${field} must be true or false`);
  return v;
}
__name(flag, "flag");
function amountIn(v, field, opts = {}) {
  if (v === void 0 || v === null || v === "") return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/,/g, "")) : NaN;
  if (!Number.isFinite(n) || n < 0 || !opts.allowZero && n === 0) throw new InputError(`${field} must be a positive number`);
  if (n > 1e10) throw new InputError(`${field} is too large`);
  return toMinor(n);
}
__name(amountIn, "amountIn");
function oneOf(v, field, values) {
  if (v === void 0 || v === null || v === "") return null;
  if (typeof v !== "string" || !values.includes(v)) throw new InputError(`${field} must be one of ${values.join(", ")}`);
  return v;
}
__name(oneOf, "oneOf");
function currencyIn(v, field = "currency") {
  const c = text(v, field, 10)?.toUpperCase() ?? null;
  if (c && !/^[A-Z]{3}$/.test(c)) throw new InputError(`${field} must be a 3-letter code like EGP or USD`);
  return c;
}
__name(currencyIn, "currencyIn");
function list(v, field, max) {
  if (!Array.isArray(v) || !v.length) throw new InputError(`${field} must be a non-empty list`);
  if (v.length > max) throw new InputError(`${field} can have at most ${max} items per call`);
  return v.map((x, i) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) throw new InputError(`${field}[${i}] must be an object`);
    return x;
  });
}
__name(list, "list");
var TX_TYPES = ["expense", "income", "transfer"];
var PAYMENT_TYPES = ["cash", "debit_card", "credit_card", "apple_pay", "instapay", "bank_transfer", "mobile_wallet", "web_payment", "voucher"];
var NATURES = ["need", "want", "saving", "none"];
async function loadLookups() {
  const [accounts, categories, payees] = await Promise.all([listAccounts(true), listCategories(true), listPayees()]);
  const s = getSettings();
  return {
    tz: validZone(s.timeZone),
    base: s.baseCurrency,
    accounts,
    accountById: new Map(accounts.map((a) => [a.id, a])),
    categories,
    categoryById: new Map(categories.map((c) => [c.id, c])),
    payees,
    payeeById: new Map(payees.map((p) => [p.id, p]))
  };
}
__name(loadLookups, "loadLookups");
function categoryPath(id, lk) {
  if (!id) return null;
  const c = lk.categoryById.get(id);
  if (!c) return null;
  const parent = c.parentId ? lk.categoryById.get(c.parentId) : null;
  return parent ? `${parent.name} \u203A ${c.name}` : c.name;
}
__name(categoryPath, "categoryPath");
var norm = /* @__PURE__ */ __name((s) => s.trim().toLowerCase(), "norm");
function resolveAccount(v, lk, field = "account") {
  const key = text(v, field);
  if (!key) return null;
  const byId = lk.accountById.get(key);
  if (byId) return byId;
  const live = lk.accounts.filter((a) => !a.archived);
  const exact = lk.accounts.filter((a) => norm(a.name) === norm(key));
  const exactLive = exact.filter((a) => !a.archived);
  if (exactLive.length === 1) return exactLive[0];
  if (exact.length === 1) return exact[0];
  const partial = live.filter((a) => norm(a.name).includes(norm(key)) || norm(key).includes(norm(a.name)));
  if (partial.length === 1) return partial[0];
  throw new InputError(`No single account matches "${key}". Accounts: ${live.map((a) => `${a.name} (${a.currency}, id ${a.id})`).join("; ")}`);
}
__name(resolveAccount, "resolveAccount");
async function resolveCategory(v, kind, lk, field = "category") {
  const key = text(v, field);
  if (!key) return null;
  const byId = lk.categoryById.get(key);
  if (byId) return byId;
  const found = await findCategoryByHint(key, kind);
  if (found) return found;
  throw new InputError(`No ${kind} category matches "${key}". Call get_catalog for the category names and ids.`);
}
__name(resolveCategory, "resolveCategory");
async function resolvePayee(v, lk, opts, field = "payee") {
  const key = text(v, field);
  if (!key) return null;
  const byId = lk.payeeById.get(key);
  if (byId) return byId;
  const byName = await findPayeeByName(key);
  if (byName) return byName;
  if (!opts.create) throw new InputError(`No payee is called "${key}"`);
  const created = await findOrCreatePayee(key, opts.kind ?? "merchant");
  lk.payees.push(created);
  lk.payeeById.set(created.id, created);
  return created;
}
__name(resolvePayee, "resolvePayee");
function momentIn(v, lk, field, edge = "noon") {
  if (v === void 0 || v === null || v === "") return null;
  const t = parseMoment(v, lk.tz, edge);
  if (t == null) throw new InputError(`${field} must be a date like 2026-10-16, a local time like 2026-10-16 13:30, or ISO 8601`);
  return t;
}
__name(momentIn, "momentIn");
var major = /* @__PURE__ */ __name((minor) => minor == null ? null : Math.round(toMajor(minor) * 100) / 100, "major");
function txOut(t, lk) {
  const account = lk.accountById.get(t.accountId);
  return {
    id: t.id,
    date: formatLocal(t.date, lk.tz),
    type: t.type,
    amount: major(t.amount),
    currency: t.currency,
    ...t.currency !== lk.base ? { [`in_${lk.base.toLowerCase()}`]: major(t.baseAmount) } : {},
    account: account?.name ?? t.accountId,
    ...t.toAccountId ? { to_account: lk.accountById.get(t.toAccountId)?.name ?? t.toAccountId, to_amount: major(t.toAmount) } : {},
    ...t.categoryId ? { category: categoryPath(t.categoryId, lk) } : {},
    ...t.payeeId ? { payee: lk.payeeById.get(t.payeeId)?.name ?? t.payeeId } : {},
    ...t.note ? { note: t.note } : {},
    payment: t.paymentType,
    ...t.isInstapay ? { instapay: true } : {},
    ...t.feeTotal ? { fee: major(t.feeTotal) } : {},
    ...t.natureOverride ? { nature: t.natureOverride } : {},
    ...t.originalCurrency ? { entered_as: `${t.originalCurrency} ${major(t.originalAmount)}` } : {},
    ...t.debtId ? { debt_id: t.debtId } : {},
    ...t.recurringId ? { planned_payment_id: t.recurringId } : {},
    ...t.parentId ? { fee_of: t.parentId } : {},
    source: t.source
  };
}
__name(txOut, "txOut");
async function balancesOut(lk) {
  const balances = await getBalances();
  return lk.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: major(balances[a.id] ?? 0),
    ...a.bankBalance != null && a.bankBalanceAt ? { bank_reported: { balance: major(a.bankBalance), at: formatLocal(a.bankBalanceAt, lk.tz) } } : {},
    ...a.identifiers.length ? { card_digits: a.identifiers } : {},
    ...a.excludeFromStats ? { excluded_from_stats: true } : {},
    ...a.archived ? { archived: true } : {}
  }));
}
__name(balancesOut, "balancesOut");

// ../node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInWeek = 6048e5;
var millisecondsInDay = 864e5;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = /* @__PURE__ */ Symbol.for("constructDateFrom");

// ../node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}
__name(constructFrom, "constructFrom");

// ../node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}
__name(toDate, "toDate");

// ../node_modules/date-fns/addDays.js
function addDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount)) return constructFrom(options?.in || date, NaN);
  if (!amount) return _date;
  _date.setDate(_date.getDate() + amount);
  return _date;
}
__name(addDays, "addDays");

// ../node_modules/date-fns/addMonths.js
function addMonths(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount)) return constructFrom(options?.in || date, NaN);
  if (!amount) {
    return _date;
  }
  const dayOfMonth = _date.getDate();
  const endOfDesiredMonth = constructFrom(options?.in || date, _date.getTime());
  endOfDesiredMonth.setMonth(_date.getMonth() + amount + 1, 0);
  const daysInMonth = endOfDesiredMonth.getDate();
  if (dayOfMonth >= daysInMonth) {
    return endOfDesiredMonth;
  } else {
    _date.setFullYear(
      endOfDesiredMonth.getFullYear(),
      endOfDesiredMonth.getMonth(),
      dayOfMonth
    );
    return _date;
  }
}
__name(addMonths, "addMonths");

// ../node_modules/date-fns/_lib/defaultOptions.js
var defaultOptions = {};
function getDefaultOptions() {
  return defaultOptions;
}
__name(getDefaultOptions, "getDefaultOptions");

// ../node_modules/date-fns/startOfWeek.js
function startOfWeek(date, options) {
  const defaultOptions2 = getDefaultOptions();
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions2.weekStartsOn ?? defaultOptions2.locale?.options?.weekStartsOn ?? 0;
  const _date = toDate(date, options?.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  _date.setDate(_date.getDate() - diff);
  _date.setHours(0, 0, 0, 0);
  return _date;
}
__name(startOfWeek, "startOfWeek");

// ../node_modules/date-fns/startOfISOWeek.js
function startOfISOWeek(date, options) {
  return startOfWeek(date, { ...options, weekStartsOn: 1 });
}
__name(startOfISOWeek, "startOfISOWeek");

// ../node_modules/date-fns/getISOWeekYear.js
function getISOWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const fourthOfJanuaryOfNextYear = constructFrom(_date, 0);
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear);
  const fourthOfJanuaryOfThisYear = constructFrom(_date, 0);
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear);
  if (_date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (_date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
}
__name(getISOWeekYear, "getISOWeekYear");

// ../node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds.js
function getTimezoneOffsetInMilliseconds(date) {
  const _date = toDate(date);
  const utcDate = new Date(
    Date.UTC(
      _date.getFullYear(),
      _date.getMonth(),
      _date.getDate(),
      _date.getHours(),
      _date.getMinutes(),
      _date.getSeconds(),
      _date.getMilliseconds()
    )
  );
  utcDate.setUTCFullYear(_date.getFullYear());
  return +date - +utcDate;
}
__name(getTimezoneOffsetInMilliseconds, "getTimezoneOffsetInMilliseconds");

// ../node_modules/date-fns/_lib/normalizeDates.js
function normalizeDates(context, ...dates) {
  const normalize = constructFrom.bind(
    null,
    context || dates.find((date) => typeof date === "object")
  );
  return dates.map(normalize);
}
__name(normalizeDates, "normalizeDates");

// ../node_modules/date-fns/startOfDay.js
function startOfDay(date, options) {
  const _date = toDate(date, options?.in);
  _date.setHours(0, 0, 0, 0);
  return _date;
}
__name(startOfDay, "startOfDay");

// ../node_modules/date-fns/differenceInCalendarDays.js
function differenceInCalendarDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  const laterStartOfDay = startOfDay(laterDate_);
  const earlierStartOfDay = startOfDay(earlierDate_);
  const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
  const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
  return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
}
__name(differenceInCalendarDays, "differenceInCalendarDays");

// ../node_modules/date-fns/startOfISOWeekYear.js
function startOfISOWeekYear(date, options) {
  const year = getISOWeekYear(date, options);
  const fourthOfJanuary = constructFrom(options?.in || date, 0);
  fourthOfJanuary.setFullYear(year, 0, 4);
  fourthOfJanuary.setHours(0, 0, 0, 0);
  return startOfISOWeek(fourthOfJanuary);
}
__name(startOfISOWeekYear, "startOfISOWeekYear");

// ../node_modules/date-fns/addWeeks.js
function addWeeks(date, amount, options) {
  return addDays(date, amount * 7, options);
}
__name(addWeeks, "addWeeks");

// ../node_modules/date-fns/addYears.js
function addYears(date, amount, options) {
  return addMonths(date, amount * 12, options);
}
__name(addYears, "addYears");

// ../node_modules/date-fns/isDate.js
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}
__name(isDate, "isDate");

// ../node_modules/date-fns/isValid.js
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}
__name(isValid, "isValid");

// ../node_modules/date-fns/startOfYear.js
function startOfYear(date, options) {
  const date_ = toDate(date, options?.in);
  date_.setFullYear(date_.getFullYear(), 0, 1);
  date_.setHours(0, 0, 0, 0);
  return date_;
}
__name(startOfYear, "startOfYear");

// ../node_modules/date-fns/locale/en-US/_lib/formatDistance.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = /* @__PURE__ */ __name((token2, count, options) => {
  let result;
  const tokenValue = formatDistanceLocale[token2];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options?.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
}, "formatDistance");

// ../node_modules/date-fns/locale/_lib/buildFormatLongFn.js
function buildFormatLongFn(args) {
  return (options = {}) => {
    const width = options.width ? String(options.width) : args.defaultWidth;
    const format2 = args.formats[width] || args.formats[args.defaultWidth];
    return format2;
  };
}
__name(buildFormatLongFn, "buildFormatLongFn");

// ../node_modules/date-fns/locale/en-US/_lib/formatLong.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};

// ../node_modules/date-fns/locale/en-US/_lib/formatRelative.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = /* @__PURE__ */ __name((token2, _date, _baseDate, _options) => formatRelativeLocale[token2], "formatRelative");

// ../node_modules/date-fns/locale/_lib/buildLocalizeFn.js
function buildLocalizeFn(args) {
  return (value, options) => {
    const context = options?.context ? String(options.context) : "standalone";
    let valuesArray;
    if (context === "formatting" && args.formattingValues) {
      const defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      const width = options?.width ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      const defaultWidth = args.defaultWidth;
      const width = options?.width ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[width] || args.values[defaultWidth];
    }
    const index = args.argumentCallback ? args.argumentCallback(value) : value;
    return valuesArray[index];
  };
}
__name(buildLocalizeFn, "buildLocalizeFn");

// ../node_modules/date-fns/locale/en-US/_lib/localize.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  abbreviated: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  wide: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]
};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = /* @__PURE__ */ __name((dirtyNumber, _options) => {
  const number = Number(dirtyNumber);
  const rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
    }
  }
  return number + "th";
}, "ordinalNumber");
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: /* @__PURE__ */ __name((quarter) => quarter - 1, "argumentCallback")
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};

// ../node_modules/date-fns/locale/_lib/buildMatchFn.js
function buildMatchFn(args) {
  return (string, options = {}) => {
    const width = options.width;
    const matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    const matchResult = string.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    const matchedString = matchResult[0];
    const parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    const key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, (pattern) => pattern.test(matchedString)) : (
      // [TODO] -- I challenge you to fix the type
      findKey(parsePatterns, (pattern) => pattern.test(matchedString))
    );
    let value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? (
      // [TODO] -- I challenge you to fix the type
      options.valueCallback(value)
    ) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}
__name(buildMatchFn, "buildMatchFn");
function findKey(object, predicate) {
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) {
      return key;
    }
  }
  return void 0;
}
__name(findKey, "findKey");
function findIndex(array, predicate) {
  for (let key = 0; key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return void 0;
}
__name(findIndex, "findIndex");

// ../node_modules/date-fns/locale/_lib/buildMatchPatternFn.js
function buildMatchPatternFn(args) {
  return (string, options = {}) => {
    const matchResult = string.match(args.matchPattern);
    if (!matchResult) return null;
    const matchedString = matchResult[0];
    const parseResult = string.match(args.parsePattern);
    if (!parseResult) return null;
    let value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}
__name(buildMatchPatternFn, "buildMatchPatternFn");

// ../node_modules/date-fns/locale/en-US/_lib/match.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};
var parseMonthPatterns = {
  narrow: [
    /^j/i,
    /^f/i,
    /^m/i,
    /^a/i,
    /^m/i,
    /^j/i,
    /^j/i,
    /^a/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ],
  any: [
    /^ja/i,
    /^f/i,
    /^mar/i,
    /^ap/i,
    /^may/i,
    /^jun/i,
    /^jul/i,
    /^au/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ]
};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: /* @__PURE__ */ __name((value) => parseInt(value, 10), "valueCallback")
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: /* @__PURE__ */ __name((index) => index + 1, "valueCallback")
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};

// ../node_modules/date-fns/locale/en-US.js
var enUS = {
  code: "en-US",
  formatDistance,
  formatLong,
  formatRelative,
  localize,
  match,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};

// ../node_modules/date-fns/getDayOfYear.js
function getDayOfYear(date, options) {
  const _date = toDate(date, options?.in);
  const diff = differenceInCalendarDays(_date, startOfYear(_date));
  const dayOfYear = diff + 1;
  return dayOfYear;
}
__name(getDayOfYear, "getDayOfYear");

// ../node_modules/date-fns/getISOWeek.js
function getISOWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfISOWeek(_date) - +startOfISOWeekYear(_date);
  return Math.round(diff / millisecondsInWeek) + 1;
}
__name(getISOWeek, "getISOWeek");

// ../node_modules/date-fns/getWeekYear.js
function getWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const firstWeekOfNextYear = constructFrom(options?.in || date, 0);
  firstWeekOfNextYear.setFullYear(year + 1, 0, firstWeekContainsDate);
  firstWeekOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfWeek(firstWeekOfNextYear, options);
  const firstWeekOfThisYear = constructFrom(options?.in || date, 0);
  firstWeekOfThisYear.setFullYear(year, 0, firstWeekContainsDate);
  firstWeekOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfWeek(firstWeekOfThisYear, options);
  if (+_date >= +startOfNextYear) {
    return year + 1;
  } else if (+_date >= +startOfThisYear) {
    return year;
  } else {
    return year - 1;
  }
}
__name(getWeekYear, "getWeekYear");

// ../node_modules/date-fns/startOfWeekYear.js
function startOfWeekYear(date, options) {
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const year = getWeekYear(date, options);
  const firstWeek = constructFrom(options?.in || date, 0);
  firstWeek.setFullYear(year, 0, firstWeekContainsDate);
  firstWeek.setHours(0, 0, 0, 0);
  const _date = startOfWeek(firstWeek, options);
  return _date;
}
__name(startOfWeekYear, "startOfWeekYear");

// ../node_modules/date-fns/getWeek.js
function getWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfWeek(_date, options) - +startOfWeekYear(_date, options);
  return Math.round(diff / millisecondsInWeek) + 1;
}
__name(getWeek, "getWeek");

// ../node_modules/date-fns/_lib/addLeadingZeros.js
function addLeadingZeros(number, targetLength) {
  const sign = number < 0 ? "-" : "";
  const output = Math.abs(number).toString().padStart(targetLength, "0");
  return sign + output;
}
__name(addLeadingZeros, "addLeadingZeros");

// ../node_modules/date-fns/_lib/format/lightFormatters.js
var lightFormatters = {
  // Year
  y(date, token2) {
    const signedYear = date.getFullYear();
    const year = signedYear > 0 ? signedYear : 1 - signedYear;
    return addLeadingZeros(token2 === "yy" ? year % 100 : year, token2.length);
  },
  // Month
  M(date, token2) {
    const month = date.getMonth();
    return token2 === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
  },
  // Day of the month
  d(date, token2) {
    return addLeadingZeros(date.getDate(), token2.length);
  },
  // AM or PM
  a(date, token2) {
    const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
    switch (token2) {
      case "a":
      case "aa":
        return dayPeriodEnumValue.toUpperCase();
      case "aaa":
        return dayPeriodEnumValue;
      case "aaaaa":
        return dayPeriodEnumValue[0];
      case "aaaa":
      default:
        return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
    }
  },
  // Hour [1-12]
  h(date, token2) {
    return addLeadingZeros(date.getHours() % 12 || 12, token2.length);
  },
  // Hour [0-23]
  H(date, token2) {
    return addLeadingZeros(date.getHours(), token2.length);
  },
  // Minute
  m(date, token2) {
    return addLeadingZeros(date.getMinutes(), token2.length);
  },
  // Second
  s(date, token2) {
    return addLeadingZeros(date.getSeconds(), token2.length);
  },
  // Fraction of second
  S(date, token2) {
    const numberOfDigits = token2.length;
    const milliseconds = date.getMilliseconds();
    const fractionalSeconds = Math.trunc(
      milliseconds * Math.pow(10, numberOfDigits - 3)
    );
    return addLeadingZeros(fractionalSeconds, token2.length);
  }
};

// ../node_modules/date-fns/_lib/format/formatters.js
var dayPeriodEnum = {
  am: "am",
  pm: "pm",
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night"
};
var formatters2 = {
  // Era
  G: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const era = date.getFullYear() > 0 ? 1 : 0;
    switch (token2) {
      // AD, BC
      case "G":
      case "GG":
      case "GGG":
        return localize2.era(era, { width: "abbreviated" });
      // A, B
      case "GGGGG":
        return localize2.era(era, { width: "narrow" });
      // Anno Domini, Before Christ
      case "GGGG":
      default:
        return localize2.era(era, { width: "wide" });
    }
  }, "G"),
  // Year
  y: /* @__PURE__ */ __name(function(date, token2, localize2) {
    if (token2 === "yo") {
      const signedYear = date.getFullYear();
      const year = signedYear > 0 ? signedYear : 1 - signedYear;
      return localize2.ordinalNumber(year, { unit: "year" });
    }
    return lightFormatters.y(date, token2);
  }, "y"),
  // Local week-numbering year
  Y: /* @__PURE__ */ __name(function(date, token2, localize2, options) {
    const signedWeekYear = getWeekYear(date, options);
    const weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
    if (token2 === "YY") {
      const twoDigitYear = weekYear % 100;
      return addLeadingZeros(twoDigitYear, 2);
    }
    if (token2 === "Yo") {
      return localize2.ordinalNumber(weekYear, { unit: "year" });
    }
    return addLeadingZeros(weekYear, token2.length);
  }, "Y"),
  // ISO week-numbering year
  R: /* @__PURE__ */ __name(function(date, token2) {
    const isoWeekYear = getISOWeekYear(date);
    return addLeadingZeros(isoWeekYear, token2.length);
  }, "R"),
  // Extended year. This is a single number designating the year of this calendar system.
  // The main difference between `y` and `u` localizers are B.C. years:
  // | Year | `y` | `u` |
  // |------|-----|-----|
  // | AC 1 |   1 |   1 |
  // | BC 1 |   1 |   0 |
  // | BC 2 |   2 |  -1 |
  // Also `yy` always returns the last two digits of a year,
  // while `uu` pads single digit years to 2 characters and returns other years unchanged.
  u: /* @__PURE__ */ __name(function(date, token2) {
    const year = date.getFullYear();
    return addLeadingZeros(year, token2.length);
  }, "u"),
  // Quarter
  Q: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token2) {
      // 1, 2, 3, 4
      case "Q":
        return String(quarter);
      // 01, 02, 03, 04
      case "QQ":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "Qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      // Q1, Q2, Q3, Q4
      case "QQQ":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "formatting"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "QQQQQ":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "formatting"
        });
      // 1st quarter, 2nd quarter, ...
      case "QQQQ":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "formatting"
        });
    }
  }, "Q"),
  // Stand-alone quarter
  q: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token2) {
      // 1, 2, 3, 4
      case "q":
        return String(quarter);
      // 01, 02, 03, 04
      case "qq":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      // Q1, Q2, Q3, Q4
      case "qqq":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "standalone"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "qqqqq":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "standalone"
        });
      // 1st quarter, 2nd quarter, ...
      case "qqqq":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "standalone"
        });
    }
  }, "q"),
  // Month
  M: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const month = date.getMonth();
    switch (token2) {
      case "M":
      case "MM":
        return lightFormatters.M(date, token2);
      // 1st, 2nd, ..., 12th
      case "Mo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      // Jan, Feb, ..., Dec
      case "MMM":
        return localize2.month(month, {
          width: "abbreviated",
          context: "formatting"
        });
      // J, F, ..., D
      case "MMMMM":
        return localize2.month(month, {
          width: "narrow",
          context: "formatting"
        });
      // January, February, ..., December
      case "MMMM":
      default:
        return localize2.month(month, { width: "wide", context: "formatting" });
    }
  }, "M"),
  // Stand-alone month
  L: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const month = date.getMonth();
    switch (token2) {
      // 1, 2, ..., 12
      case "L":
        return String(month + 1);
      // 01, 02, ..., 12
      case "LL":
        return addLeadingZeros(month + 1, 2);
      // 1st, 2nd, ..., 12th
      case "Lo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      // Jan, Feb, ..., Dec
      case "LLL":
        return localize2.month(month, {
          width: "abbreviated",
          context: "standalone"
        });
      // J, F, ..., D
      case "LLLLL":
        return localize2.month(month, {
          width: "narrow",
          context: "standalone"
        });
      // January, February, ..., December
      case "LLLL":
      default:
        return localize2.month(month, { width: "wide", context: "standalone" });
    }
  }, "L"),
  // Local week of year
  w: /* @__PURE__ */ __name(function(date, token2, localize2, options) {
    const week = getWeek(date, options);
    if (token2 === "wo") {
      return localize2.ordinalNumber(week, { unit: "week" });
    }
    return addLeadingZeros(week, token2.length);
  }, "w"),
  // ISO week of year
  I: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const isoWeek = getISOWeek(date);
    if (token2 === "Io") {
      return localize2.ordinalNumber(isoWeek, { unit: "week" });
    }
    return addLeadingZeros(isoWeek, token2.length);
  }, "I"),
  // Day of the month
  d: /* @__PURE__ */ __name(function(date, token2, localize2) {
    if (token2 === "do") {
      return localize2.ordinalNumber(date.getDate(), { unit: "date" });
    }
    return lightFormatters.d(date, token2);
  }, "d"),
  // Day of year
  D: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const dayOfYear = getDayOfYear(date);
    if (token2 === "Do") {
      return localize2.ordinalNumber(dayOfYear, { unit: "dayOfYear" });
    }
    return addLeadingZeros(dayOfYear, token2.length);
  }, "D"),
  // Day of week
  E: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const dayOfWeek = date.getDay();
    switch (token2) {
      // Tue
      case "E":
      case "EE":
      case "EEE":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "EEEEE":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "EEEEEE":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "EEEE":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  }, "E"),
  // Local day of week
  e: /* @__PURE__ */ __name(function(date, token2, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token2) {
      // Numerical value (Nth day of week with current locale or weekStartsOn)
      case "e":
        return String(localDayOfWeek);
      // Padded numerical value
      case "ee":
        return addLeadingZeros(localDayOfWeek, 2);
      // 1st, 2nd, ..., 7th
      case "eo":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "eee":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "eeeee":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "eeeeee":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "eeee":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  }, "e"),
  // Stand-alone local day of week
  c: /* @__PURE__ */ __name(function(date, token2, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token2) {
      // Numerical value (same as in `e`)
      case "c":
        return String(localDayOfWeek);
      // Padded numerical value
      case "cc":
        return addLeadingZeros(localDayOfWeek, token2.length);
      // 1st, 2nd, ..., 7th
      case "co":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "ccc":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "standalone"
        });
      // T
      case "ccccc":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "standalone"
        });
      // Tu
      case "cccccc":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "standalone"
        });
      // Tuesday
      case "cccc":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "standalone"
        });
    }
  }, "c"),
  // ISO day of week
  i: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    switch (token2) {
      // 2
      case "i":
        return String(isoDayOfWeek);
      // 02
      case "ii":
        return addLeadingZeros(isoDayOfWeek, token2.length);
      // 2nd
      case "io":
        return localize2.ordinalNumber(isoDayOfWeek, { unit: "day" });
      // Tue
      case "iii":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "iiiii":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "iiiiii":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "iiii":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  }, "i"),
  // AM or PM
  a: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const hours = date.getHours();
    const dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    switch (token2) {
      case "a":
      case "aa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "aaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "aaaaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "aaaa":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  }, "a"),
  // AM, PM, midnight, noon
  b: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours === 12) {
      dayPeriodEnumValue = dayPeriodEnum.noon;
    } else if (hours === 0) {
      dayPeriodEnumValue = dayPeriodEnum.midnight;
    } else {
      dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    }
    switch (token2) {
      case "b":
      case "bb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "bbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "bbbbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "bbbb":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  }, "b"),
  // in the morning, in the afternoon, in the evening, at night
  B: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours >= 17) {
      dayPeriodEnumValue = dayPeriodEnum.evening;
    } else if (hours >= 12) {
      dayPeriodEnumValue = dayPeriodEnum.afternoon;
    } else if (hours >= 4) {
      dayPeriodEnumValue = dayPeriodEnum.morning;
    } else {
      dayPeriodEnumValue = dayPeriodEnum.night;
    }
    switch (token2) {
      case "B":
      case "BB":
      case "BBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "BBBBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "BBBB":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  }, "B"),
  // Hour [1-12]
  h: /* @__PURE__ */ __name(function(date, token2, localize2) {
    if (token2 === "ho") {
      let hours = date.getHours() % 12;
      if (hours === 0) hours = 12;
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return lightFormatters.h(date, token2);
  }, "h"),
  // Hour [0-23]
  H: /* @__PURE__ */ __name(function(date, token2, localize2) {
    if (token2 === "Ho") {
      return localize2.ordinalNumber(date.getHours(), { unit: "hour" });
    }
    return lightFormatters.H(date, token2);
  }, "H"),
  // Hour [0-11]
  K: /* @__PURE__ */ __name(function(date, token2, localize2) {
    const hours = date.getHours() % 12;
    if (token2 === "Ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token2.length);
  }, "K"),
  // Hour [1-24]
  k: /* @__PURE__ */ __name(function(date, token2, localize2) {
    let hours = date.getHours();
    if (hours === 0) hours = 24;
    if (token2 === "ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token2.length);
  }, "k"),
  // Minute
  m: /* @__PURE__ */ __name(function(date, token2, localize2) {
    if (token2 === "mo") {
      return localize2.ordinalNumber(date.getMinutes(), { unit: "minute" });
    }
    return lightFormatters.m(date, token2);
  }, "m"),
  // Second
  s: /* @__PURE__ */ __name(function(date, token2, localize2) {
    if (token2 === "so") {
      return localize2.ordinalNumber(date.getSeconds(), { unit: "second" });
    }
    return lightFormatters.s(date, token2);
  }, "s"),
  // Fraction of second
  S: /* @__PURE__ */ __name(function(date, token2) {
    return lightFormatters.S(date, token2);
  }, "S"),
  // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
  X: /* @__PURE__ */ __name(function(date, token2, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    if (timezoneOffset === 0) {
      return "Z";
    }
    switch (token2) {
      // Hours and optional minutes
      case "X":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XX`
      case "XXXX":
      case "XX":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XXX`
      case "XXXXX":
      case "XXX":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  }, "X"),
  // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
  x: /* @__PURE__ */ __name(function(date, token2, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token2) {
      // Hours and optional minutes
      case "x":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xx`
      case "xxxx":
      case "xx":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xxx`
      case "xxxxx":
      case "xxx":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  }, "x"),
  // Timezone (GMT)
  O: /* @__PURE__ */ __name(function(date, token2, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token2) {
      // Short
      case "O":
      case "OO":
      case "OOO":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "OOOO":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  }, "O"),
  // Timezone (specific non-location)
  z: /* @__PURE__ */ __name(function(date, token2, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token2) {
      // Short
      case "z":
      case "zz":
      case "zzz":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "zzzz":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  }, "z"),
  // Seconds timestamp
  t: /* @__PURE__ */ __name(function(date, token2, _localize) {
    const timestamp = Math.trunc(+date / 1e3);
    return addLeadingZeros(timestamp, token2.length);
  }, "t"),
  // Milliseconds timestamp
  T: /* @__PURE__ */ __name(function(date, token2, _localize) {
    return addLeadingZeros(+date, token2.length);
  }, "T")
};
function formatTimezoneShort(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = Math.trunc(absOffset / 60);
  const minutes = absOffset % 60;
  if (minutes === 0) {
    return sign + String(hours);
  }
  return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
}
__name(formatTimezoneShort, "formatTimezoneShort");
function formatTimezoneWithOptionalMinutes(offset, delimiter) {
  if (offset % 60 === 0) {
    const sign = offset > 0 ? "-" : "+";
    return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
  }
  return formatTimezone(offset, delimiter);
}
__name(formatTimezoneWithOptionalMinutes, "formatTimezoneWithOptionalMinutes");
function formatTimezone(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = addLeadingZeros(Math.trunc(absOffset / 60), 2);
  const minutes = addLeadingZeros(absOffset % 60, 2);
  return sign + hours + delimiter + minutes;
}
__name(formatTimezone, "formatTimezone");

// ../node_modules/date-fns/_lib/format/longFormatters.js
var dateLongFormatter = /* @__PURE__ */ __name((pattern, formatLong2) => {
  switch (pattern) {
    case "P":
      return formatLong2.date({ width: "short" });
    case "PP":
      return formatLong2.date({ width: "medium" });
    case "PPP":
      return formatLong2.date({ width: "long" });
    case "PPPP":
    default:
      return formatLong2.date({ width: "full" });
  }
}, "dateLongFormatter");
var timeLongFormatter = /* @__PURE__ */ __name((pattern, formatLong2) => {
  switch (pattern) {
    case "p":
      return formatLong2.time({ width: "short" });
    case "pp":
      return formatLong2.time({ width: "medium" });
    case "ppp":
      return formatLong2.time({ width: "long" });
    case "pppp":
    default:
      return formatLong2.time({ width: "full" });
  }
}, "timeLongFormatter");
var dateTimeLongFormatter = /* @__PURE__ */ __name((pattern, formatLong2) => {
  const matchResult = pattern.match(/(P+)(p+)?/) || [];
  const datePattern = matchResult[1];
  const timePattern = matchResult[2];
  if (!timePattern) {
    return dateLongFormatter(pattern, formatLong2);
  }
  let dateTimeFormat;
  switch (datePattern) {
    case "P":
      dateTimeFormat = formatLong2.dateTime({ width: "short" });
      break;
    case "PP":
      dateTimeFormat = formatLong2.dateTime({ width: "medium" });
      break;
    case "PPP":
      dateTimeFormat = formatLong2.dateTime({ width: "long" });
      break;
    case "PPPP":
    default:
      dateTimeFormat = formatLong2.dateTime({ width: "full" });
      break;
  }
  return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong2)).replace("{{time}}", timeLongFormatter(timePattern, formatLong2));
}, "dateTimeLongFormatter");
var longFormatters = {
  p: timeLongFormatter,
  P: dateTimeLongFormatter
};

// ../node_modules/date-fns/_lib/protectedTokens.js
var dayOfYearTokenRE = /^D+$/;
var weekYearTokenRE = /^Y+$/;
var throwTokens = ["D", "DD", "YY", "YYYY"];
function isProtectedDayOfYearToken(token2) {
  return dayOfYearTokenRE.test(token2);
}
__name(isProtectedDayOfYearToken, "isProtectedDayOfYearToken");
function isProtectedWeekYearToken(token2) {
  return weekYearTokenRE.test(token2);
}
__name(isProtectedWeekYearToken, "isProtectedWeekYearToken");
function warnOrThrowProtectedError(token2, format2, input) {
  const _message = message(token2, format2, input);
  console.warn(_message);
  if (throwTokens.includes(token2)) throw new RangeError(_message);
}
__name(warnOrThrowProtectedError, "warnOrThrowProtectedError");
function message(token2, format2, input) {
  const subject = token2[0] === "Y" ? "years" : "days of the month";
  return `Use \`${token2.toLowerCase()}\` instead of \`${token2}\` (in \`${format2}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`;
}
__name(message, "message");

// ../node_modules/date-fns/format.js
var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
var escapedStringRegExp = /^'([^]*?)'?$/;
var doubleQuoteRegExp = /''/g;
var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
function format(date, formatStr, options) {
  const defaultOptions2 = getDefaultOptions();
  const locale = options?.locale ?? defaultOptions2.locale ?? enUS;
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions2.weekStartsOn ?? defaultOptions2.locale?.options?.weekStartsOn ?? 0;
  const originalDate = toDate(date, options?.in);
  if (!isValid(originalDate)) {
    throw new RangeError("Invalid time value");
  }
  let parts = formatStr.match(longFormattingTokensRegExp).map((substring) => {
    const firstCharacter = substring[0];
    if (firstCharacter === "p" || firstCharacter === "P") {
      const longFormatter = longFormatters[firstCharacter];
      return longFormatter(substring, locale.formatLong);
    }
    return substring;
  }).join("").match(formattingTokensRegExp).map((substring) => {
    if (substring === "''") {
      return { isToken: false, value: "'" };
    }
    const firstCharacter = substring[0];
    if (firstCharacter === "'") {
      return { isToken: false, value: cleanEscapedString(substring) };
    }
    if (formatters2[firstCharacter]) {
      return { isToken: true, value: substring };
    }
    if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
      throw new RangeError(
        "Format string contains an unescaped latin alphabet character `" + firstCharacter + "`"
      );
    }
    return { isToken: false, value: substring };
  });
  if (locale.localize.preprocessor) {
    parts = locale.localize.preprocessor(originalDate, parts);
  }
  const formatterOptions = {
    firstWeekContainsDate,
    weekStartsOn,
    locale
  };
  return parts.map((part) => {
    if (!part.isToken) return part.value;
    const token2 = part.value;
    if (!options?.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token2) || !options?.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token2)) {
      warnOrThrowProtectedError(token2, formatStr, String(date));
    }
    const formatter2 = formatters2[token2[0]];
    return formatter2(originalDate, token2, locale.localize, formatterOptions);
  }).join("");
}
__name(format, "format");
function cleanEscapedString(input) {
  const matched = input.match(escapedStringRegExp);
  if (!matched) {
    return input;
  }
  return matched[1].replace(doubleQuoteRegExp, "'");
}
__name(cleanEscapedString, "cleanEscapedString");

// ../src/modules/shared/utils/dates.ts
var isoDay = /* @__PURE__ */ __name((ts) => format(ts, "yyyy-MM-dd"), "isoDay");

// ../src/modules/integrations/utils/fx.ts
var SOURCES = {
  jsdelivr: /* @__PURE__ */ __name((base, day) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day}/v1/currencies/${base.toLowerCase()}.json`, "jsdelivr"),
  pages: /* @__PURE__ */ __name((base, day) => `https://${day === "latest" ? "latest" : day}.currency-api.pages.dev/v1/currencies/${base.toLowerCase()}.json`, "pages"),
  erApi: /* @__PURE__ */ __name((base) => `https://open.er-api.com/v6/latest/${base.toUpperCase()}`, "erApi")
};
var WANTED = new Set(CURRENCIES);
async function fetchJson(url, timeoutMs = 8e3) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
__name(fetchJson, "fetchJson");
async function fetchRates(base, day) {
  const lower = base.toLowerCase();
  for (const url of [SOURCES.jsdelivr(base, day), SOURCES.pages(base, day)]) {
    try {
      const json3 = await fetchJson(url);
      const table = json3[lower];
      if (table && typeof json3.date === "string") {
        const rates = {};
        for (const [k, v] of Object.entries(table)) if (WANTED.has(k.toUpperCase())) rates[k.toUpperCase()] = v;
        return { day: json3.date, rates };
      }
    } catch {
    }
  }
  if (day === "latest") {
    try {
      const json3 = await fetchJson(SOURCES.erApi(base));
      if (json3.result === "success" && json3.rates) {
        const rates = {};
        for (const [k, v] of Object.entries(json3.rates)) if (WANTED.has(k)) rates[k] = v;
        return { day: isoDay((json3.time_last_update_unix ?? Date.now() / 1e3) * 1e3), rates };
      }
    } catch {
    }
  }
  return null;
}
__name(fetchRates, "fetchRates");
async function storeRates(day, base, rates) {
  const now = Date.now();
  for (const [quote, rate] of Object.entries(rates)) {
    if (quote === base || !(rate > 0)) continue;
    await run("INSERT OR REPLACE INTO fx_rates (day, base, quote, rate, fetched_at) VALUES (?, ?, ?, ?, ?)", [day, base, quote, rate, now]);
  }
  notify(["fx_rates"]);
}
__name(storeRates, "storeRates");
async function cached(from, to, day) {
  const direct = await first("SELECT rate FROM fx_rates WHERE day = ? AND base = ? AND quote = ?", [day, from, to]);
  if (direct) return direct.rate;
  const inverse = await first("SELECT rate FROM fx_rates WHERE day = ? AND base = ? AND quote = ?", [day, to, from]);
  return inverse ? 1 / inverse.rate : null;
}
__name(cached, "cached");
async function nearestCached(from, to, day) {
  const rows = await all(
    `SELECT base, rate, day FROM fx_rates WHERE (base = ? AND quote = ?) OR (base = ? AND quote = ?)
     ORDER BY ABS(julianday(day) - julianday(?)) ASC LIMIT 1`,
    [from, to, to, from, day]
  );
  const r = rows[0];
  if (!r) return null;
  return r.base === from ? r.rate : 1 / r.rate;
}
__name(nearestCached, "nearestCached");
var inflight = /* @__PURE__ */ new Map();
async function fetchAndCache(from, to, day, today) {
  const fetched = await fetchRates(from, day === today ? "latest" : day);
  if (!fetched) return null;
  await storeRates(day === today ? today : fetched.day, from, fetched.rates);
  return fetched.rates[to] ?? null;
}
__name(fetchAndCache, "fetchAndCache");
function getRate(from, to, ts = Date.now()) {
  if (from === to) return Promise.resolve(1);
  const today = isoDay(Date.now());
  const day = isoDay(Math.min(ts, Date.now()));
  const key = `${from}-${to}-${day}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    const hit = await cached(from, to, day);
    if (hit) return hit;
    const near = await nearestCached(from, to, day);
    if (near) {
      void fetchAndCache(from, to, day, today).catch(() => void 0);
      return near;
    }
    return await fetchAndCache(from, to, day, today) ?? null;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
__name(getRate, "getRate");
async function convert(minor, from, to, ts) {
  const rate = await getRate(from, to, ts);
  if (rate == null) return null;
  return { amount: Math.round(minor * rate), rate };
}
__name(convert, "convert");

// ../src/modules/shared/db/seeds/categories.ts
var CATEGORY_TREE = [
  {
    key: "food",
    name: "Food & Drinks",
    icon: "utensils",
    color: "#D0533F",
    kind: "expense",
    subs: [
      ["food.cafe", "Bar, cafe", "coffee", "want"],
      ["food.groceries", "Groceries", "shopping-basket", "need"],
      ["food.restaurant", "Restaurant, fast-food", "pizza", "want"]
    ]
  },
  {
    key: "shopping",
    name: "Shopping",
    icon: "shopping-bag",
    color: "#3E8FB0",
    kind: "expense",
    subs: [
      ["shopping.clothes", "Clothes & shoes", "shirt", "want"],
      ["shopping.pharmacy", "Drug-store, chemist", "pill", "need"],
      ["shopping.electronics", "Electronics, accessories", "smartphone", "want"],
      ["shopping.freetime", "Free time", "gamepad-2", "want"],
      ["shopping.gifts", "Gifts, joy", "gift", "want"],
      ["shopping.beauty", "Health and beauty", "sparkles", "want"],
      ["shopping.home", "Home, garden", "sofa", "want"],
      ["shopping.jewels", "Jewels, accessories", "gem", "want"],
      ["shopping.kids", "Kids", "baby", "need"],
      ["shopping.pets", "Pets, animals", "paw-print", "need"],
      ["shopping.stationery", "Stationery, tools", "pencil-ruler", "need"]
    ]
  },
  {
    key: "housing",
    name: "Housing",
    icon: "house",
    color: "#C77D16",
    kind: "expense",
    subs: [
      ["housing.utilities", "Energy, utilities", "zap", "need"],
      ["housing.maintenance", "Maintenance, repairs", "wrench", "need"],
      ["housing.mortgage", "Mortgage", "landmark", "need"],
      ["housing.insurance", "Property insurance", "shield", "need"],
      ["housing.rent", "Rent", "key-round", "need"],
      ["housing.services", "Services", "concierge-bell", "need"]
    ]
  },
  {
    key: "transport",
    name: "Transportation",
    icon: "bus",
    color: "#5B6B7F",
    kind: "expense",
    subs: [
      ["transport.business", "Business trips", "briefcase", "need"],
      ["transport.longdistance", "Long distance", "plane", "want"],
      ["transport.public", "Public transport", "train-front", "need"],
      ["transport.taxi", "Taxi", "car-taxi-front", "need"]
    ]
  },
  {
    key: "vehicle",
    name: "Vehicle",
    icon: "car",
    color: "#7C5CC4",
    kind: "expense",
    subs: [
      ["vehicle.fuel", "Fuel", "fuel", "need"],
      ["vehicle.leasing", "Leasing", "signature", "need"],
      ["vehicle.parking", "Parking", "square-parking", "need"],
      ["vehicle.rentals", "Rentals", "car-front", "want"],
      ["vehicle.insurance", "Vehicle insurance", "shield-check", "need"],
      ["vehicle.maintenance", "Vehicle maintenance", "cog", "need"]
    ]
  },
  {
    key: "life",
    name: "Life & Entertainment",
    icon: "party-popper",
    color: "#1F8A70",
    kind: "expense",
    subs: [
      ["life.fitness", "Active sport, fitness", "dumbbell", "want"],
      ["life.alcohol", "Alcohol, tobacco", "wine", "want"],
      ["life.subscriptions", "Books, audio, subscriptions", "book-open", "want"],
      ["life.charity", "Charity, gifts", "hand-heart", "want"],
      ["life.events", "Culture, sport events", "ticket", "want"],
      ["life.education", "Education, development", "graduation-cap", "need"],
      ["life.health", "Health care, doctor", "stethoscope", "need"],
      ["life.hobbies", "Hobbies", "palette", "want"],
      ["life.holiday", "Holiday, trips, hotels", "luggage", "want"],
      ["life.lifeevents", "Life events", "cake", "want"],
      ["life.gambling", "Lottery, gambling", "dices", "want"],
      ["life.streaming", "TV, Streaming", "tv", "want"],
      ["life.wellness", "Wellness, beauty", "flower-2", "want"]
    ]
  },
  {
    key: "comms",
    name: "Communication, PC",
    icon: "monitor-smartphone",
    color: "#2F6FD0",
    kind: "expense",
    subs: [
      ["comms.internet", "Internet", "wifi", "need"],
      ["comms.phone", "Phone, cell phone", "phone", "need"],
      ["comms.postal", "Postal services", "mail", "need"],
      ["comms.software", "Software, apps, games", "app-window", "want"]
    ]
  },
  {
    key: "financial",
    name: "Financial expenses",
    icon: "receipt",
    color: "#4B7A86",
    kind: "expense",
    subs: [
      ["financial.advisory", "Advisory", "messages-square", "need"],
      ["financial.fees", "Charges, Fees", "badge-percent", "need"],
      ["financial.childsupport", "Child Support", "baby", "need"],
      ["financial.fines", "Fines", "gavel", "need"],
      ["financial.insurances", "Insurances", "shield", "need"],
      ["financial.loan", "Loan, interests", "banknote", "need"],
      ["financial.taxes", "Taxes", "landmark", "need"]
    ]
  },
  {
    key: "investments",
    name: "Investments",
    icon: "trending-up",
    color: "#B4417A",
    kind: "expense",
    subs: [
      ["investments.collections", "Collections", "library", "saving"],
      ["investments.financial", "Financial investments", "chart-line", "saving"],
      ["investments.realty", "Realty", "building", "saving"],
      ["investments.savings", "Savings", "piggy-bank", "saving"],
      ["investments.vehicles", "Vehicles, chattels", "car", "saving"]
    ]
  },
  {
    key: "income",
    name: "Income",
    icon: "wallet",
    color: "#2E7D57",
    kind: "income",
    subs: [
      ["income.checks", "Checks, coupons", "ticket-percent", "none"],
      ["income.childsupport", "Child Support", "baby", "none"],
      ["income.grants", "Dues & grants", "hand-coins", "none"],
      ["income.gifts", "Gifts", "gift", "none"],
      ["income.interest", "Interests, dividends", "percent", "none"],
      ["income.lending", "Lending, renting", "handshake", "none"],
      ["income.gambling", "Lottery, gambling", "dices", "none"],
      ["income.refunds", "Refunds (tax, purchase)", "undo-2", "none"],
      ["income.rental", "Rental income", "house", "none"],
      ["income.sale", "Sale", "tag", "none"],
      ["income.wage", "Wage, invoices", "briefcase-business", "none"]
    ]
  },
  {
    key: "others",
    name: "Others",
    icon: "shapes",
    color: "#8A8A8F",
    kind: "expense",
    subs: [["others.missing", "Missing", "circle-question-mark", "none"]]
  }
];
var catId = /* @__PURE__ */ __name((key) => `cat_${key}`, "catId");
var SYSTEM_CATEGORIES = {
  fees: catId("financial.fees"),
  refunds: catId("income.refunds"),
  missing: catId("others.missing"),
  taxi: catId("transport.taxi"),
  groceries: catId("food.groceries"),
  restaurant: catId("food.restaurant"),
  cafe: catId("food.cafe"),
  wage: catId("income.wage"),
  gifts: catId("income.gifts"),
  others: catId("others")
};

// ../src/modules/transactions/data/transactionsRepo.ts
var rowToTx = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  type: r.type,
  amount: r.amount,
  currency: r.currency,
  accountId: r.account_id,
  toAccountId: r.to_account_id,
  toAmount: r.to_amount,
  categoryId: r.category_id,
  payeeId: r.payee_id,
  paymentType: r.payment_type,
  date: r.date,
  note: r.note,
  isInstapay: bool(r.is_instapay),
  parentId: r.parent_id,
  natureOverride: r.nature_override,
  originalAmount: r.original_amount,
  originalCurrency: r.original_currency,
  fxRate: r.fx_rate,
  baseAmount: r.base_amount,
  recurringId: r.recurring_id,
  debtId: r.debt_id,
  source: r.source,
  sourceRef: r.source_ref,
  createdAt: r.created_at,
  updatedAt: r.updated_at
}), "rowToTx");
async function toBase(amount, currency, date) {
  const base = getSettings().baseCurrency;
  if (currency === base) return amount;
  const rate = await getRate(currency, base, date);
  return rate == null ? amount : Math.round(amount * rate);
}
__name(toBase, "toBase");
async function insertRow(id, t, currency, baseAmount, parentId, now) {
  await run(
    `INSERT INTO transactions
      (id, type, amount, currency, account_id, to_account_id, to_amount, category_id, payee_id, payment_type, date, note,
       is_instapay, parent_id, nature_override, original_amount, original_currency, fx_rate, base_amount,
       recurring_id, debt_id, source, source_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      t.type,
      Math.abs(t.amount),
      currency,
      t.accountId,
      t.type === "transfer" ? t.toAccountId ?? null : null,
      t.type === "transfer" ? Math.abs(t.toAmount ?? t.amount) : null,
      t.type === "transfer" ? null : t.categoryId ?? null,
      t.payeeId ?? null,
      t.paymentType,
      t.date,
      t.note?.trim() || null,
      int(Boolean(t.isInstapay)),
      parentId,
      t.natureOverride ?? null,
      t.original?.amount ?? null,
      t.original?.currency ?? null,
      t.original?.rate ?? null,
      baseAmount,
      t.recurringId ?? null,
      t.debtId ?? null,
      t.source ?? "manual",
      t.sourceRef ?? null,
      now,
      now
    ]
  );
}
__name(insertRow, "insertRow");
async function writeFee(parentId, t, currency, now) {
  const fee = t.fee ?? 0;
  if (fee <= 0) return;
  const feeInput = {
    type: "expense",
    amount: fee,
    accountId: t.accountId,
    categoryId: SYSTEM_CATEGORIES.fees,
    paymentType: t.paymentType,
    date: t.date,
    note: t.isInstapay ? "InstaPay fee" : "Fee",
    isInstapay: t.isInstapay,
    source: t.source,
    debtId: null
  };
  await insertRow(newId(), feeInput, currency, await toBase(fee, currency, t.date), parentId, now);
}
__name(writeFee, "writeFee");
async function createTransaction(t) {
  const account = await getAccount(t.accountId);
  if (!account) throw new Error("Account not found");
  const id = newId();
  const now = Date.now();
  const base = await toBase(Math.abs(t.amount), account.currency, t.date);
  await transaction(["transactions", "payees"], async () => {
    await insertRow(id, t, account.currency, base, null, now);
    await writeFee(id, t, account.currency, now);
  });
  if (t.payeeId) await learnFromUse(t.payeeId, t.type === "transfer" ? null : t.categoryId ?? null, t.accountId);
  if (t.source === "manual" || !t.source) void setSetting("lastAccountId", t.accountId);
  return id;
}
__name(createTransaction, "createTransaction");
async function updateTransaction(id, t) {
  const account = await getAccount(t.accountId);
  if (!account) throw new Error("Account not found");
  const existing = await getTransaction(id);
  const now = Date.now();
  const base = await toBase(Math.abs(t.amount), account.currency, t.date);
  await transaction(["transactions", "payees"], async () => {
    await run("DELETE FROM transactions WHERE parent_id = ?", [id]);
    await run("DELETE FROM transactions WHERE id = ?", [id]);
    await insertRow(id, { ...t, source: existing?.source ?? t.source, sourceRef: existing?.sourceRef ?? t.sourceRef }, account.currency, base, null, now);
    if (existing) await run("UPDATE transactions SET created_at = ? WHERE id = ?", [existing.createdAt, id]);
    await writeFee(id, t, account.currency, now);
  });
  if (t.payeeId) await learnFromUse(t.payeeId, t.type === "transfer" ? null : t.categoryId ?? null, t.accountId);
}
__name(updateTransaction, "updateTransaction");
async function deleteTransaction(id) {
  const existing = await getTransaction(id);
  await transaction(["transactions", "inbox_items"], async () => {
    await run("DELETE FROM transactions WHERE parent_id = ? OR id = ?", [id, id]);
    await run("UPDATE inbox_items SET status = 'pending', transaction_id = NULL, resolved_at = NULL WHERE transaction_id = ?", [id]);
  });
  return existing;
}
__name(deleteTransaction, "deleteTransaction");
async function getTransaction(id) {
  const r = await first("SELECT * FROM transactions WHERE id = ?", [id]);
  return r ? rowToTx(r) : null;
}
__name(getTransaction, "getTransaction");
async function getFeeTotal(id) {
  const r = await first("SELECT COALESCE(SUM(amount), 0) AS n FROM transactions WHERE parent_id = ?", [id]);
  return r?.n ?? 0;
}
__name(getFeeTotal, "getFeeTotal");
function filterSql(f) {
  const where = ["t.parent_id IS NULL"];
  const params = [];
  if (f.accountId) {
    where.push("(t.account_id = ? OR t.to_account_id = ?)");
    params.push(f.accountId, f.accountId);
  }
  if (f.categoryIds?.length) {
    where.push(`t.category_id IN (${f.categoryIds.map(() => "?").join(",")})`);
    params.push(...f.categoryIds);
  }
  if (f.payeeId) {
    where.push("t.payee_id = ?");
    params.push(f.payeeId);
  }
  if (f.debtId) {
    where.push("t.debt_id = ?");
    params.push(f.debtId);
  }
  if (f.types?.length) {
    where.push(`t.type IN (${f.types.map(() => "?").join(",")})`);
    params.push(...f.types);
  }
  if (f.from != null) {
    where.push("t.date >= ?");
    params.push(f.from);
  }
  if (f.to != null) {
    where.push("t.date <= ?");
    params.push(f.to);
  }
  if (f.search?.trim()) {
    const q = `%${f.search.trim()}%`;
    where.push(`(t.note LIKE ? OR p.name LIKE ? OR c.name LIKE ? OR CAST(t.amount / 100.0 AS TEXT) LIKE ?)`);
    params.push(q, q, q, q);
  }
  return [where.join(" AND "), params];
}
__name(filterSql, "filterSql");
async function listTransactions(f = {}) {
  const [where, params] = filterSql(f);
  const rows = await all(
    `SELECT t.*, (SELECT COALESCE(SUM(x.amount), 0) FROM transactions x WHERE x.parent_id = t.id) AS fee_total
     FROM transactions t
     LEFT JOIN payees p ON p.id = t.payee_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${where}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ?`,
    [...params, f.limit ?? 500]
  );
  return rows.map((r) => ({ ...rowToTx(r), feeTotal: r.fee_total }));
}
__name(listTransactions, "listTransactions");
async function listForStats(from, to) {
  const rows = await all("SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date", [from, to]);
  return rows.map(rowToTx);
}
__name(listForStats, "listForStats");

// ../src/modules/transactions/utils/instapay.ts
function instapayFee(amount, rule) {
  if (amount <= 0) return 0;
  const raw = Math.round(Math.abs(amount) * rule.percent / 100);
  return Math.min(rule.max, Math.max(rule.min, raw));
}
__name(instapayFee, "instapayFee");

// ../src/modules/debts/data/debtsRepo.ts
var toDebt = /* @__PURE__ */ __name((r) => {
  const repaid = r.repaid ?? 0;
  return {
    id: r.id,
    direction: r.direction,
    payeeId: r.payee_id,
    accountId: r.account_id,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    dueDate: r.due_date,
    note: r.note,
    status: r.status,
    closedAt: r.closed_at,
    createdAt: r.created_at,
    repaid,
    remaining: Math.max(0, r.amount - repaid),
    payeeName: r.payee_name ?? ""
  };
}, "toDebt");
var SELECT = `
  SELECT d.*, p.name AS payee_name,
    COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.debt_id = d.id AND t.parent_id IS NULL
      AND t.type = CASE d.direction WHEN 'lent' THEN 'income' ELSE 'expense' END), 0) AS repaid
  FROM debts d LEFT JOIN payees p ON p.id = d.payee_id`;
async function listDebts() {
  const rows = await all(`${SELECT} ORDER BY d.status = 'closed', COALESCE(d.due_date, 9e15), d.date DESC`);
  return rows.map(toDebt);
}
__name(listDebts, "listDebts");
async function getDebt(id) {
  const r = await first(`${SELECT} WHERE d.id = ?`, [id]);
  return r ? toDebt(r) : null;
}
__name(getDebt, "getDebt");
async function openDebtsForPayee(payeeId) {
  const rows = await all(`${SELECT} WHERE d.payee_id = ? AND d.status = 'open' ORDER BY d.date`, [payeeId]);
  return rows.map(toDebt);
}
__name(openDebtsForPayee, "openDebtsForPayee");
async function saveDebt(input, opts = {}) {
  const id = input.id ?? newId();
  const existing = input.id ? await getDebt(input.id) : null;
  await write(
    ["debts"],
    `INSERT OR REPLACE INTO debts (id, direction, payee_id, account_id, amount, currency, date, due_date, note, status, closed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.direction,
      input.payeeId,
      input.accountId,
      input.amount,
      input.currency,
      input.date,
      input.dueDate,
      input.note?.trim() || null,
      existing?.status ?? "open",
      existing?.closedAt ?? null,
      existing?.createdAt ?? Date.now()
    ]
  );
  if (!existing && opts.recordMovement && input.accountId) {
    await createTransaction({
      type: input.direction === "lent" ? "expense" : "income",
      amount: input.amount,
      accountId: input.accountId,
      payeeId: input.payeeId,
      paymentType: opts.instapay ? "instapay" : opts.paymentType ?? "cash",
      date: input.date,
      note: input.note ?? (input.direction === "lent" ? "Lent" : "Borrowed"),
      debtId: id,
      isInstapay: Boolean(opts.instapay),
      fee: opts.instapay && input.direction === "lent" ? instapayFee(input.amount, getSettings().instapayFee) : null
    });
  }
  return id;
}
__name(saveDebt, "saveDebt");
async function addRepayment(debtId, r) {
  const debt = await getDebt(debtId);
  if (!debt) throw new Error("Debt not found");
  await createTransaction({
    type: debt.direction === "lent" ? "income" : "expense",
    amount: r.amount,
    accountId: r.accountId,
    payeeId: debt.payeeId,
    paymentType: r.paymentType,
    date: r.date,
    note: r.note ?? "Repayment",
    debtId,
    fee: r.fee ?? null,
    isInstapay: r.isInstapay
  });
  const after = await getDebt(debtId);
  if (after && after.remaining <= 0) await setDebtStatus(debtId, "closed");
}
__name(addRepayment, "addRepayment");
async function setDebtStatus(id, status2) {
  await write(["debts"], "UPDATE debts SET status = ?, closed_at = ? WHERE id = ?", [status2, status2 === "closed" ? Date.now() : null, id]);
}
__name(setDebtStatus, "setDebtStatus");
async function deleteDebt(id, opts) {
  await transaction(["debts", "transactions"], async () => {
    if (opts.deleteTransactions) {
      await run("DELETE FROM transactions WHERE parent_id IN (SELECT id FROM transactions WHERE debt_id = ?)", [id]);
      await run("DELETE FROM transactions WHERE debt_id = ?", [id]);
    } else {
      await run("UPDATE transactions SET debt_id = NULL WHERE debt_id = ?", [id]);
    }
    await run("DELETE FROM debts WHERE id = ?", [id]);
  });
}
__name(deleteDebt, "deleteDebt");

// ../src/modules/recurring/utils/recurrence.ts
function occurrenceAt(rule, n) {
  const step = n * Math.max(1, rule.interval);
  const s = rule.startDate;
  switch (rule.frequency) {
    case "daily":
      return addDays(s, step).getTime();
    case "weekly":
      return addWeeks(s, step).getTime();
    case "monthly":
      return addMonths(s, step).getTime();
    case "yearly":
      return addYears(s, step).getTime();
  }
}
__name(occurrenceAt, "occurrenceAt");
function isWithinEnd(rule, n) {
  if (rule.endType === "count") return n < (rule.endCount ?? 0);
  if (rule.endType === "until") return occurrenceAt(rule, n) <= (rule.endDate ?? 0);
  return true;
}
__name(isWithinEnd, "isWithinEnd");
function nextDue(rule, done) {
  return isWithinEnd(rule, done) ? occurrenceAt(rule, done) : null;
}
__name(nextDue, "nextDue");
function dueIndexes(rule, done, now, cap = 120) {
  const out = [];
  for (let n = done; out.length < cap && isWithinEnd(rule, n) && occurrenceAt(rule, n) <= now; n++) out.push(n);
  return out;
}
__name(dueIndexes, "dueIndexes");
function upcomingDates(rule, done, from, to, cap = 12) {
  const out = [];
  for (let n = done; out.length < cap && isWithinEnd(rule, n); n++) {
    const d = occurrenceAt(rule, n);
    if (d > to) break;
    if (d >= from) out.push(d);
  }
  return out;
}
__name(upcomingDates, "upcomingDates");

// ../src/modules/recurring/data/recurringRepo.ts
var toRecurring = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  amount: r.amount,
  currency: r.currency,
  accountId: r.account_id,
  toAccountId: r.to_account_id,
  categoryId: r.category_id,
  payeeId: r.payee_id,
  paymentType: r.payment_type,
  note: r.note,
  isInstapay: bool(r.is_instapay),
  frequency: r.frequency,
  interval: r.interval,
  startDate: r.start_date,
  endType: r.end_type,
  endDate: r.end_date,
  endCount: r.end_count,
  occurrences: r.occurrences,
  nextDue: r.next_due,
  mode: r.mode,
  remindDaysBefore: r.remind_days_before,
  active: bool(r.active),
  createdAt: r.created_at
}), "toRecurring");
async function listRecurring() {
  const rows = await all("SELECT * FROM recurring ORDER BY active DESC, COALESCE(next_due, 9e15), name");
  return rows.map(toRecurring);
}
__name(listRecurring, "listRecurring");
async function getRecurring(id) {
  const r = await first("SELECT * FROM recurring WHERE id = ?", [id]);
  return r ? toRecurring(r) : null;
}
__name(getRecurring, "getRecurring");
async function saveRecurring(input) {
  const id = input.id ?? newId();
  const existing = input.id ? await getRecurring(input.id) : null;
  const scheduleChanged = !existing || existing.startDate !== input.startDate || existing.frequency !== input.frequency || existing.interval !== input.interval;
  const occurrences = scheduleChanged ? 0 : existing.occurrences;
  const due = nextDue(input, occurrences);
  await write(
    ["recurring"],
    `INSERT OR REPLACE INTO recurring
      (id, name, type, amount, currency, account_id, to_account_id, category_id, payee_id, payment_type, note, is_instapay,
       frequency, interval, start_date, end_type, end_date, end_count, occurrences, next_due, mode, remind_days_before, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.type,
      input.amount,
      input.currency,
      input.accountId,
      input.toAccountId,
      input.categoryId,
      input.payeeId,
      input.paymentType,
      input.note,
      int(input.isInstapay),
      input.frequency,
      Math.max(1, input.interval),
      input.startDate,
      input.endType,
      input.endDate,
      input.endCount,
      occurrences,
      due,
      input.mode,
      input.remindDaysBefore,
      int(input.active),
      existing?.createdAt ?? Date.now()
    ]
  );
  return id;
}
__name(saveRecurring, "saveRecurring");
async function deleteRecurring(id) {
  await transaction(["recurring", "inbox_items"], async () => {
    await run("DELETE FROM inbox_items WHERE recurring_id = ? AND status = 'pending'", [id]);
    await run("DELETE FROM recurring WHERE id = ?", [id]);
  });
}
__name(deleteRecurring, "deleteRecurring");
async function setRecurringActive(id, active) {
  await write(["recurring"], "UPDATE recurring SET active = ? WHERE id = ?", [int(active), id]);
}
__name(setRecurringActive, "setRecurringActive");
async function bookingAmounts(r, from, to, date) {
  const charged = r.amount ?? 0;
  const chargeCcy = r.currency ?? from.currency;
  let amount = charged;
  let original = null;
  if (chargeCcy !== from.currency) {
    const c = await convert(charged, chargeCcy, from.currency, date);
    if (!c) return null;
    amount = c.amount;
    original = { amount: charged, currency: chargeCcy, rate: c.rate };
  }
  let toAmount = null;
  if (r.type === "transfer" && to) {
    if (to.currency === from.currency) toAmount = amount;
    else if (to.currency === chargeCcy) toAmount = charged;
    else {
      const c = await convert(amount, from.currency, to.currency, date);
      if (!c) return null;
      toAmount = c.amount;
    }
  }
  return { amount, original, toAmount };
}
__name(bookingAmounts, "bookingAmounts");
async function listUpcoming(days = 30, now = Date.now()) {
  const to = now + days * 864e5;
  const out = [];
  for (const r of await listRecurring()) {
    if (!r.active) continue;
    for (const date of upcomingDates(r, r.occurrences, now - 864e5, to, 3)) out.push({ recurring: r, date });
  }
  return out.sort((a, b) => a.date - b.date);
}
__name(listUpcoming, "listUpcoming");
async function matchRecurring(m, accountId, at) {
  const window2 = 3 * 864e5;
  for (const r of await listRecurring()) {
    if (!r.active || !r.amount) continue;
    if (accountId && r.accountId && r.accountId !== accountId) continue;
    const ccy = r.currency ?? m.booked.currency;
    const amount = ccy === m.charged.currency ? m.charged.amount : ccy === m.booked.currency ? m.booked.amount : null;
    if (amount == null || Math.abs(r.amount - amount) > Math.max(100, r.amount * 0.01)) continue;
    const near = [r.nextDue, r.occurrences > 0 ? nextDue(r, r.occurrences - 1) : null].some((d) => d != null && Math.abs(d - at) <= window2);
    if (near) return r;
  }
  return null;
}
__name(matchRecurring, "matchRecurring");
async function skipMissedRecurring(id, now = Date.now()) {
  const r = await getRecurring(id);
  if (!r) return 0;
  const missed = dueIndexes(r, r.occurrences, now);
  if (!missed.length) return 0;
  const done = r.occurrences + missed.length;
  await write(["recurring"], "UPDATE recurring SET occurrences = ?, next_due = ? WHERE id = ?", [done, nextDue(r, done), id]);
  return missed.length;
}
__name(skipMissedRecurring, "skipMissedRecurring");

// ../src/modules/banks/utils/patterns.ts
var NUM = "([\\d\u0660-\u0669,]+(?:\\.\\d+)?)";
var CCY = "([A-Z]{3})";
var ENDING = "(?:\u0627\u0644\u0645\u0646\u062A\u0647\u064A(?:\u0629)?\\s*\u0628\\S*|#)";
var LAST4 = "\\**\\s*\\**(\\d{3,4})";
var DMY2 = "(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2})";
var DMY4 = "(\\d{1,2})-(\\d{1,2})-(\\d{4})";
var HM = "(\\d{1,2}):(\\d{2})";
var BALANCE = `\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0627\u062D\\s*(?:${CCY}\\s*${NUM}|${NUM}\\s*${CCY})`;
var re = /* @__PURE__ */ __name((s) => new RegExp(s, "s"), "re");
function toMinorText(s) {
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}
__name(toMinorText, "toMinorText");
function clean(s) {
  if (!s) return null;
  const v = s.replace(/\s+/g, " ").trim();
  return v.length ? v : null;
}
__name(clean, "clean");
function dt2(m, i) {
  const [d, mo, y, h, mi] = [m[i], m[i + 1], m[i + 2], m[i + 3], m[i + 4]].map(Number);
  return new Date(2e3 + y, mo - 1, d, h, mi).getTime();
}
__name(dt2, "dt2");
function dt4(m, i) {
  const [d, mo, y, h, mi] = [m[i], m[i + 1], m[i + 2], m[i + 3], m[i + 4]].map(Number);
  return new Date(y, mo - 1, d, h, mi).getTime();
}
__name(dt4, "dt4");
function dateOnly(d, mo, y) {
  return new Date(y, mo - 1, d, 12, 0).getTime();
}
__name(dateOnly, "dateOnly");
function balance(m, i) {
  const ccy = m[i] ?? m[i + 3];
  const num = m[i + 1] ?? m[i + 2];
  return { balance: toMinorText(num), balanceCurrency: ccy ?? null };
}
__name(balance, "balance");

// ../src/modules/banks/definitions/cib.ts
var CIB = {
  id: "cib",
  name: "CIB",
  country: "EG",
  senders: ["CIB", "CIB OTP", "CIB VOUCHER", "CIBEG", "CIB EG"],
  templates: [
    {
      // يرجى العلم انه تم تنفيذ تحويل لحظي بمبلغ 750.00 جم من حسابك المنتهي بـ ****9001 برقم مرجعي a1b2c3d4 بتاريخ 20-08-2026 17:10
      kind: "instapay_out",
      regex: re(`\u062A\u062D\u0648\u064A\u0644 \u0644\u062D\u0638\u064A \u0628\u0645\u0628\u0644\u063A\\s*${NUM}\\s*\u062C\u0645\\s*\u0645\u0646 \u062D\u0633\u0627\u0628\u0643\\s*${ENDING}\\s*${LAST4}.*?\u0628\u0631\u0642\u0645 \u0645\u0631\u062C\u0639\u064A\\s*([A-Za-z0-9]+).*?\u0628\u062A\u0627\u0631\u064A\u062E\\s*${DMY4}\\s+${HM}`),
      map: /* @__PURE__ */ __name((m) => ({ amountText: m[1], ccy: "EGP", last4: m[2], reference: m[3], occurredAt: dt4(m, 4) }), "map")
    },
    {
      // … بمبلغ 120.00 جم إلى حسابك المنتهي بـ ****9001 من NOUR TEST PERSON برقم مرجعي b2c3d4e5 بتاريخ 20-08-2026 22:26
      kind: "instapay_in",
      regex: re(
        `\u062A\u062D\u0648\u064A\u0644 \u0644\u062D\u0638\u064A \u0628\u0645\u0628\u0644\u063A\\s*${NUM}\\s*\u062C\u0645\\s*(?:\u0625\u0644\u0649|\u0627\u0644\u0649|\u0625\u0644\u064A)\\s*\u062D\u0633\u0627\u0628\u0643\\s*${ENDING}\\s*${LAST4}\\s*(?:\u0645\u0646\\s+(.+?)\\s+)?\u0628\u0631\u0642\u0645 \u0645\u0631\u062C\u0639\u064A\\s*([A-Za-z0-9]+).*?\u0628\u062A\u0627\u0631\u064A\u062E\\s*${DMY4}\\s+${HM}`
      ),
      map: /* @__PURE__ */ __name((m) => ({ amountText: m[1], ccy: "EGP", last4: m[2], counterparty: clean(m[3]), reference: m[4], occurredAt: dt4(m, 5) }), "map")
    },
    {
      // تم خصم EGP 123.45  من بطاقة الخصم المباشر # **9002 باستخدام Apple Pay عند  Talabat في  20/08/26 22:31الرصيد المتاح  EGP1234.56.
      kind: "applepay_purchase",
      regex: re(`\u062A\u0645 \u062E\u0635\u0645\\s+${CCY}\\s*${NUM}\\s+\u0645\u0646 \u0628\u0637\u0627\u0642\u0629.*?${LAST4}\\s*\u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 Apple Pay\\s+\u0639\u0646\u062F\\s+(.+?)\\s+\u0641\u064A\\s+${DMY2}\\s+${HM}\\s*(?:${BALANCE})?`),
      map: /* @__PURE__ */ __name((m) => ({ ccy: m[1], amountText: m[2], last4: m[3], counterparty: clean(m[4]), occurredAt: dt2(m, 5), ...balance(m, 10) }), "map")
    },
    {
      // تم خصم مبلغ  EGP 234.56 من بطاقة الخصم المباشر المنتهية بـ **9002 عند Uber في 18/08/26 10:31 ، الرصيد المتاح 98.76 EGP
      kind: "card_purchase",
      regex: re(`\u062A\u0645 \u062E\u0635\u0645 \u0645\u0628\u0644\u063A\\s+${CCY}\\s*${NUM}\\s+\u0645\u0646 \u0628\u0637\u0627\u0642\u0629.*?${LAST4}\\s+\u0639\u0646\u062F\\s+(.+?)\\s+\u0641\u064A\\s+${DMY2}\\s+${HM}\\s*[\u060C,]?\\s*(?:${BALANCE})?`),
      map: /* @__PURE__ */ __name((m) => ({ ccy: m[1], amountText: m[2], last4: m[3], counterparty: clean(m[4]), occurredAt: dt2(m, 5), ...balance(m, 10) }), "map")
    },
    {
      // تم سحب مبلغ  EGP 500.00  من بطاقة الخصم المباشر المنتهية بـ **9002 من   SAMPLE ATM في 11/07/26 15:51 ، الرصيد المتاح EGP 765.43
      kind: "atm_withdrawal",
      regex: re(`\u062A\u0645 \u0633\u062D\u0628 \u0645\u0628\u0644\u063A\\s+${CCY}\\s*${NUM}\\s+\u0645\u0646 \u0628\u0637\u0627\u0642\u0629.*?${LAST4}\\s+\u0645\u0646\\s+(.+?)\\s+\u0641\u064A\\s+${DMY2}\\s+${HM}\\s*[\u060C,]?\\s*(?:${BALANCE})?`),
      map: /* @__PURE__ */ __name((m) => ({ ccy: m[1], amountText: m[2], last4: m[3], counterparty: clean(m[4]), occurredAt: dt2(m, 5), ...balance(m, 10) }), "map")
    },
    {
      // تم إيداع مبلغ 600.00 EGP  في CIB Example Branch في بطاقتك المنتهية بـ **9002 بتاريخ 21/02/26 01:54 ،الرصيد المتاح 4321.09 EGP
      kind: "cash_deposit",
      regex: re(`\u062A\u0645 (?:\u0625\u064A\u062F\u0627\u0639|\u0627\u064A\u062F\u0627\u0639) \u0645\u0628\u0644\u063A\\s*${NUM}\\s*${CCY}\\s+\u0641\u064A\\s+(.+?)\\s+\u0641\u064A \u0628\u0637\u0627\u0642\u062A\u0643.*?${LAST4}\\s+\u0628\u062A\u0627\u0631\u064A\u062E\\s+${DMY2}\\s+${HM}\\s*[\u060C,]?\\s*(?:${BALANCE})?`),
      map: /* @__PURE__ */ __name((m) => ({ amountText: m[1], ccy: m[2], counterparty: clean(m[3]), last4: m[4], occurredAt: dt2(m, 5), ...balance(m, 10) }), "map")
    },
    {
      // تم اضافة المعاملة من Uber بقيمة 5.00 EGP إلى بطاقتك المنتهية بـ **9002 . الرصيد المتاح EGP 338.33
      kind: "refund",
      regex: re(`\u062A\u0645 (?:\u0627\u0636\u0627\u0641\u0629|\u0625\u0636\u0627\u0641\u0629) \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0645\u0646\\s+(.+?)\\s+\u0628\u0642\u064A\u0645\u0629\\s*${NUM}\\s*${CCY}\\s+(?:\u0625\u0644\u0649|\u0627\u0644\u0649|\u0639\u0644\u0649)\\s+\u0628\u0637\u0627\u0642\u062A\\S*.*?${LAST4}\\s*\\.?\\s*(?:${BALANCE})?`),
      map: /* @__PURE__ */ __name((m) => ({ counterparty: clean(m[1]), amountText: m[2], ccy: m[3], last4: m[4], ...balance(m, 5) }), "map")
    },
    {
      // تم اضافة المعاملة الخاصة بـ SAMPLE MARKETPLACE ONLINE 00X على بطاقتكم المنتهية بـ 9002 بقيمة EGP 210.00 بتاريخ 10-08-2026
      kind: "refund",
      regex: re(`\u062A\u0645 (?:\u0627\u0636\u0627\u0641\u0629|\u0625\u0636\u0627\u0641\u0629) \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\\S*\\s+(.+?)\\s+\u0639\u0644\u0649 \u0628\u0637\u0627\u0642\u062A\\S*\\s*${ENDING}\\s*${LAST4}\\s+\u0628\u0642\u064A\u0645\u0629\\s+${CCY}\\s*${NUM}(?:\\s+\u0628\u062A\u0627\u0631\u064A\u062E\\s+${DMY4})?`),
      map: /* @__PURE__ */ __name((m) => ({ counterparty: clean(m[1]), last4: m[2], ccy: m[3], amountText: m[4], occurredAt: m[5] ? dateOnly(+m[5], +m[6], +m[7]) : null }), "map")
    },
    {
      // تم اضافة المعاملة الخاصة بـ Breadfast على بطاقة# **9002 باستخدام Apple Pay بقيمة 187.65 EGP بتاريخ 17/07/26 الرصيدالمتاح EGP 876.54
      kind: "refund",
      regex: re(
        `\u062A\u0645 (?:\u0627\u0636\u0627\u0641\u0629|\u0625\u0636\u0627\u0641\u0629) \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\\S*\\s+(.+?)\\s+\u0639\u0644\u0649 \u0628\u0637\u0627\u0642\u0629\\S*\\s*${LAST4}\\s*\u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 Apple Pay\\s+\u0628\u0642\u064A\u0645\u0629\\s*${NUM}\\s*${CCY}(?:\\s+\u0628\u062A\u0627\u0631\u064A\u062E\\s+${DMY2})?\\s*(?:\u0627\u0644\u0631\u0635\u064A\u062F\\s*\u0627\u0644\u0645\u062A\u0627\u062D\\s*${CCY}\\s*${NUM})?`
      ),
      map: /* @__PURE__ */ __name((m) => ({
        counterparty: clean(m[1]),
        last4: m[2],
        amountText: m[3],
        ccy: m[4],
        occurredAt: m[5] ? dateOnly(+m[5], +m[6], 2e3 + +m[7]) : null,
        balance: toMinorText(m[9]),
        balanceCurrency: m[8] ?? null
      }), "map")
    }
  ],
  ignore: [
    { reason: "declined", regex: /تم رفض المعاملة/ },
    { reason: "otp", regex: /الرقم السري المتغير|كلمة المرور/ },
    { reason: "info", regex: /قسيمة|نقطة BONUS/i }
  ],
  // Word stems that between them appear in every CIB money message (cards, Apple Pay, ATM,
  // refunds, deposits: بطاقة / بطاقتك; InstaPay: حسابك). Other texts that match are dropped by the parser.
  shortcutKeywords: [
    { word: "\u0628\u0637\u0627\u0642", label: "Cards", testID: "copy-keyword-card" },
    { word: "\u062D\u0633\u0627\u0628", label: "InstaPay", testID: "copy-keyword-instapay" }
  ],
  example: "\u062A\u0645 \u062E\u0635\u0645 \u0645\u0628\u0644\u063A  EGP 123.45 \u0645\u0646 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u062E\u0635\u0645 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u0628\u0640 **9002 \u0639\u0646\u062F Talabat \u0641\u064A 20/08/26 22:31 \u060C \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0627\u062D 1,234.56 EGP",
  notes: "Outgoing InstaPay alerts name neither the recipient nor the fee; incoming ones name the sender."
};

// ../src/modules/banks/definitions/generic.ts
var GENERIC = {
  id: "generic",
  name: "Other banks",
  country: "",
  senders: [],
  templates: [
    {
      kind: "card_purchase",
      regex: /(?:charged|debited|purchase of|used for)[^\d]{0,40}?([A-Z]{3})\s*([\d,]+(?:\.\d+)?).*?(?:ending|\*\*)\s*\**(\d{4}).*?\bat\s+(.+?)(?:\s+on\s+|\.|,|$)/is,
      map: /* @__PURE__ */ __name((m) => ({ ccy: m[1].toUpperCase(), amountText: m[2], last4: m[3], counterparty: clean(m[4]) }), "map")
    },
    {
      kind: "instapay_out",
      regex: /(?:instant transfer|instapay|IPN)[^\d]{0,60}?(?:EGP|LE)\s*([\d,]+(?:\.\d+)?).*?(?:from your account|debited).*?(\d{4})/is,
      map: /* @__PURE__ */ __name((m) => ({ ccy: "EGP", amountText: m[1], last4: m[2] }), "map")
    },
    {
      kind: "instapay_in",
      regex: /(?:instant transfer|instapay|IPN)[^\d]{0,60}?(?:EGP|LE)\s*([\d,]+(?:\.\d+)?).*?(?:to your account|credited).*?(\d{4})(?:.*?from\s+([A-Z][A-Z .'-]+?)(?:\s+ref|\s+on|\.|,|$))?/is,
      map: /* @__PURE__ */ __name((m) => ({ ccy: "EGP", amountText: m[1], last4: m[2], counterparty: clean(m[3]) }), "map")
    }
  ],
  ignore: [
    { reason: "declined", regex: /declined|was rejected/i },
    { reason: "otp", regex: /One Time Password|\bOTP\b|Activation Code|IPN PIN|token/i },
    { reason: "info", regex: /voucher/i }
  ],
  shortcutKeywords: [],
  example: "Purchase of EGP 123.45 with your card ending 9002 at SAMPLE MARKET on 20/08/26."
};

// ../src/modules/banks/index.ts
var BANKS = [CIB, GENERIC];
var SUPPORTED_BANKS = BANKS.filter((b) => b.senders.length > 0);
var SUPPORTED_BANK_NAMES = joinNames(SUPPORTED_BANKS.map((b) => b.name));
var BANK_SENDERS = BANKS.flatMap((b) => b.senders);
function joinNames(names) {
  if (names.length <= 1) return names[0] ?? "your bank";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
__name(joinNames, "joinNames");

// ../src/modules/inbox/utils/parser.ts
var isOutflow = /* @__PURE__ */ __name((k) => k === "card_purchase" || k === "applepay_purchase" || k === "instapay_out" || k === "atm_withdrawal" || k === "unknown_debit", "isOutflow");
var SMS_KIND_LABEL = {
  card_purchase: "Card payment",
  applepay_purchase: "Apple Pay",
  instapay_out: "InstaPay sent",
  instapay_in: "InstaPay received",
  atm_withdrawal: "ATM withdrawal",
  cash_deposit: "Cash deposit",
  refund: "Refund",
  unknown_debit: "Money out",
  unknown_credit: "Money in"
};
var GATEWAYS = /^(?:PAYMOBS?|PAYTABS|GEIDEAE?|KASHIER|ACCEPT|EASYKASH|OPAY|PAYSKY|FAWRYPAY|PAY\s?MOB)\s+/i;
function suggestPayeeName(raw) {
  let s = raw.replace(/\s+/g, " ").trim().replace(GATEWAYS, "");
  s = s.split(" ").filter((tok, i, arr) => !(i > 0 && i === arr.length - 1 && /\d{3,}|^\d+[A-Z]*$/i.test(tok))).join(" ").replace(/\s+\d{3,}\b.*$/, "").trim();
  if (!s) s = raw.trim();
  const isAllCaps = s === s.toUpperCase() && /[A-Z]/.test(s);
  return isAllCaps ? s.toLowerCase().replace(/(^|[\s(/&-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase()) : s;
}
__name(suggestPayeeName, "suggestPayeeName");

// ../src/modules/inbox/data/inboxRepo.ts
var toItem = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  source: r.source,
  rawText: r.raw_text,
  parsed: r.parsed ? JSON.parse(r.parsed) : null,
  receivedAt: r.received_at,
  status: r.status,
  transactionId: r.transaction_id,
  recurringId: r.recurring_id,
  note: r.note,
  resolvedAt: r.resolved_at
}), "toItem");
async function listInbox(status2 = "pending", limit = 300) {
  const rows = await all(
    `SELECT * FROM inbox_items ${status2 === "all" ? "" : "WHERE status = ?"} ORDER BY received_at DESC LIMIT ?`,
    status2 === "all" ? [limit] : [status2, limit]
  );
  return rows.map(toItem);
}
__name(listInbox, "listInbox");
async function getInboxItem(id) {
  const r = await first("SELECT * FROM inbox_items WHERE id = ?", [id]);
  return r ? toItem(r) : null;
}
__name(getInboxItem, "getInboxItem");
async function pendingSummary() {
  const r = await first(
    "SELECT COUNT(*) AS n, MIN(received_at) AS oldest FROM inbox_items WHERE status = 'pending'"
  );
  return { count: r?.n ?? 0, oldest: r?.oldest ?? null };
}
__name(pendingSummary, "pendingSummary");
var paymentFor = {
  card_purchase: "debit_card",
  applepay_purchase: "apple_pay",
  instapay_out: "instapay",
  instapay_in: "instapay",
  atm_withdrawal: "cash",
  cash_deposit: "cash",
  refund: "debit_card",
  unknown_debit: "debit_card",
  unknown_credit: "bank_transfer"
};
async function buildSuggestion(item) {
  if (item.source === "recurring" && item.recurringId) return recurringSuggestion(item);
  const p = item.parsed;
  const accounts = await listAccounts();
  const base = {
    item,
    draft: { type: "expense", amount: 0, paymentType: "debit_card", date: item.receivedAt, source: "sms", sourceRef: item.id },
    account: null,
    toAccount: null,
    payee: null,
    rawName: null,
    suggestedName: null,
    needsPayee: false,
    original: null,
    unconverted: null,
    possibleDuplicate: null,
    recurringMatch: null,
    openDebts: [],
    ready: false
  };
  if (!p) return base;
  const account = await findAccountByIdentifier(p.last4) ?? await findAccountByHint(p.accountHint) ?? (accounts.length === 1 ? accounts[0] : null);
  const date = p.occurredAt ?? item.receivedAt;
  const out = isOutflow(p.kind);
  let type = out ? "expense" : "income";
  let toAccount = null;
  let fromCash = null;
  const cash = accounts.find((a) => a.type === "cash" && a.currency === (account?.currency ?? p.currency)) ?? null;
  if (p.kind === "atm_withdrawal" && cash && account) {
    type = "transfer";
    toAccount = cash;
  }
  if (p.kind === "cash_deposit" && cash && account) {
    type = "transfer";
    fromCash = cash;
    toAccount = account;
  }
  if (p.toAccountHint) {
    const to = await findAccountByHint(p.toAccountHint);
    if (to && to.id !== account?.id) {
      type = "transfer";
      toAccount = to;
    }
  }
  let amount = p.amount;
  let original = null;
  const accountCcy = account?.currency ?? p.currency;
  if (account && p.currency !== account.currency) {
    const c = await convert(p.amount, p.currency, account.currency, date);
    if (c) {
      amount = c.amount;
      original = { amount: p.amount, currency: p.currency, rate: c.rate };
    }
  }
  const rawName = p.kind === "atm_withdrawal" || p.kind === "cash_deposit" ? null : p.counterparty;
  const payee = await resolveAlias(rawName);
  const suggestedName = rawName && !payee ? p.kind === "instapay_in" ? suggestPayeeName(rawName) : suggestPayeeName(rawName) : null;
  let categoryId = payee?.defaultCategoryId ?? null;
  if (p.categoryHint && type !== "transfer") categoryId = (await findCategoryByHint(p.categoryHint, type === "income" ? "income" : "expense"))?.id ?? categoryId;
  if (!categoryId && p.kind === "refund") categoryId = SYSTEM_CATEGORIES.refunds;
  if (type === "transfer") categoryId = null;
  const fee = p.kind === "instapay_out" ? instapayFee(amount, getSettings().instapayFee) : null;
  const sourceAccount = fromCash ?? account;
  const draft = {
    type,
    amount,
    accountId: sourceAccount?.id,
    toAccountId: toAccount?.id ?? null,
    toAmount: type === "transfer" ? amount : null,
    categoryId,
    payeeId: payee?.id ?? null,
    paymentType: paymentFor[p.kind],
    date,
    isInstapay: p.kind === "instapay_out" || p.kind === "instapay_in",
    fee,
    original,
    note: p.note ?? null,
    source: item.source === "applepay" ? "applepay" : item.source === "claude" ? "claude" : "sms",
    sourceRef: item.id
  };
  const possibleDuplicate = sourceAccount ? await findPossibleDuplicate(sourceAccount.id, amount, date, type, original) : null;
  const recurringMatch = out ? await matchRecurring(
    { charged: { amount: p.amount, currency: p.currency }, booked: { amount, currency: original ? accountCcy : p.currency } },
    sourceAccount?.id ?? null,
    date
  ) : null;
  const openDebts = payee ? await openDebtsForPayee(payee.id) : [];
  const hasWho = Boolean(payee || suggestedName) || type === "transfer";
  const ready = Boolean(sourceAccount) && (type === "transfer" ? Boolean(toAccount) : Boolean(categoryId)) && hasWho && accountCcy != null;
  return {
    ...base,
    draft,
    account: sourceAccount,
    toAccount,
    payee,
    rawName,
    suggestedName,
    needsPayee: p.kind === "instapay_out" && !payee,
    original,
    possibleDuplicate,
    recurringMatch,
    openDebts,
    ready
  };
}
__name(buildSuggestion, "buildSuggestion");
async function recurringSuggestion(item) {
  const r = await getRecurring(item.recurringId);
  const accounts = await listAccounts();
  const account = accounts.find((a) => a.id === r?.accountId) ?? null;
  const toAccount = accounts.find((a) => a.id === r?.toAccountId) ?? null;
  const date = item.receivedAt;
  const booked = r && account && r.amount ? await bookingAmounts(r, account, toAccount, date) : null;
  const unconverted = r?.amount && account && !booked ? { amount: r.amount, currency: r.currency ?? account.currency } : null;
  const amount = booked?.amount ?? (unconverted ? 0 : r?.amount ?? 0);
  const original = booked?.original ?? null;
  const type = r?.type ?? "expense";
  return {
    item,
    draft: {
      type,
      amount,
      accountId: account?.id,
      toAccountId: toAccount?.id ?? null,
      toAmount: type === "transfer" ? booked?.toAmount ?? amount : null,
      categoryId: r?.categoryId ?? null,
      payeeId: r?.payeeId ?? null,
      paymentType: r?.paymentType ?? "bank_transfer",
      date,
      note: r?.note ?? r?.name ?? null,
      isInstapay: r?.isInstapay ?? false,
      fee: r?.isInstapay && type !== "income" ? instapayFee(amount, getSettings().instapayFee) : null,
      original,
      recurringId: r?.id ?? null,
      source: "recurring",
      sourceRef: item.id
    },
    account,
    toAccount,
    payee: null,
    rawName: null,
    suggestedName: null,
    needsPayee: false,
    original,
    unconverted,
    possibleDuplicate: account && amount ? await findPossibleDuplicate(account.id, amount, date, type, original) : null,
    recurringMatch: r,
    openDebts: [],
    ready: Boolean(account && amount && (type === "transfer" ? toAccount : r?.categoryId))
  };
}
__name(recurringSuggestion, "recurringSuggestion");
async function findPossibleDuplicate(accountId, amount, date, type, original) {
  const window2 = 3 * 36e5;
  const candidates = await listTransactions({ accountId, from: date - window2, to: date + window2, types: [type], limit: 20 });
  const same = /* @__PURE__ */ __name((t) => t.amount === amount || original != null && t.originalAmount === original.amount && t.originalCurrency === original.currency, "same");
  return candidates.find((t) => same(t) && (t.source === "manual" || t.source === "recurring")) ?? null;
}
__name(findPossibleDuplicate, "findPossibleDuplicate");
async function confirmItem(itemId, input, opts = {}) {
  const item = await getInboxItem(itemId);
  const txId = await createTransaction({
    ...input,
    source: input.source ?? (item?.source === "applepay" ? "applepay" : item?.source === "recurring" ? "recurring" : "sms"),
    sourceRef: itemId,
    recurringId: input.recurringId ?? item?.recurringId ?? null
  });
  if (opts.alias) await setAlias(opts.alias.raw, opts.alias.payeeId, { relabelPast: opts.alias.relabelPast });
  await write(
    ["inbox_items"],
    "UPDATE inbox_items SET status = 'confirmed', transaction_id = ?, resolved_at = ? WHERE id = ?",
    [txId, Date.now(), itemId]
  );
  return txId;
}
__name(confirmItem, "confirmItem");
async function linkToExisting(itemId, transactionId) {
  await write(
    ["inbox_items"],
    "UPDATE inbox_items SET status = 'merged', transaction_id = ?, note = 'Linked to an existing record', resolved_at = ? WHERE id = ?",
    [transactionId, Date.now(), itemId]
  );
}
__name(linkToExisting, "linkToExisting");
async function dismissItem(itemId, note = null) {
  await write(["inbox_items"], "UPDATE inbox_items SET status = 'dismissed', note = COALESCE(?, note), resolved_at = ? WHERE id = ?", [note, Date.now(), itemId]);
}
__name(dismissItem, "dismissItem");
async function restoreItem(itemId) {
  await write(["inbox_items"], "UPDATE inbox_items SET status = 'pending', transaction_id = NULL, resolved_at = NULL WHERE id = ?", [itemId]);
}
__name(restoreItem, "restoreItem");

// ../src/modules/insights/data/insightsData.ts
async function loadStats(from, to, accountId) {
  const [txs, categories, accounts] = await Promise.all([listForStats(from, to), listCategories(true), listAccounts(true)]);
  const filtered = accountId ? txs.filter((t) => t.accountId === accountId) : txs;
  return {
    txs: filtered,
    accounts,
    ctx: {
      categories: new Map(categories.map((c) => [c.id, c])),
      excludedAccounts: new Set(accounts.filter((a) => a.excludeFromStats).map((a) => a.id))
    }
  };
}
__name(loadStats, "loadStats");

// ../src/modules/insights/utils/aggregations.ts
var isSpend = /* @__PURE__ */ __name((t, ctx) => t.type === "expense" && !t.debtId && !ctx.excludedAccounts.has(t.accountId), "isSpend");
var isEarn = /* @__PURE__ */ __name((t, ctx) => t.type === "income" && !t.debtId && !ctx.excludedAccounts.has(t.accountId), "isEarn");
function natureOf(t, ctx) {
  if (t.natureOverride) return t.natureOverride;
  const cat = t.categoryId ? ctx.categories.get(t.categoryId) : void 0;
  if (!cat) return "none";
  if (cat.nature !== "none" || !cat.parentId) return cat.nature;
  return ctx.categories.get(cat.parentId)?.nature ?? "none";
}
__name(natureOf, "natureOf");
function totals(txs, ctx) {
  let spent = 0;
  let earned = 0;
  let count = 0;
  for (const t of txs) {
    if (isSpend(t, ctx)) {
      spent += t.baseAmount;
      if (!t.parentId) count++;
    } else if (isEarn(t, ctx)) {
      earned += t.baseAmount;
      count++;
    }
  }
  return { spent, earned, net: earned - spent, count };
}
__name(totals, "totals");
function natureSplit(txs, ctx) {
  const out = { need: 0, want: 0, saving: 0, none: 0 };
  for (const t of txs) if (isSpend(t, ctx)) out[natureOf(t, ctx)] += t.baseAmount;
  return out;
}
__name(natureSplit, "natureSplit");

// ../src/modules/templates/data/templatesRepo.ts
var toTemplate = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  amount: r.amount,
  currency: r.currency,
  accountId: r.account_id,
  toAccountId: r.to_account_id,
  categoryId: r.category_id,
  payeeId: r.payee_id,
  paymentType: r.payment_type,
  note: r.note,
  isInstapay: bool(r.is_instapay),
  sortOrder: r.sort_order,
  createdAt: r.created_at
}), "toTemplate");
async function listTemplates() {
  const rows = await all("SELECT * FROM templates ORDER BY sort_order, name");
  return rows.map(toTemplate);
}
__name(listTemplates, "listTemplates");
async function getTemplate(id) {
  const r = await first("SELECT * FROM templates WHERE id = ?", [id]);
  return r ? toTemplate(r) : null;
}
__name(getTemplate, "getTemplate");
async function saveTemplate(t) {
  const id = t.id ?? newId();
  const existing = t.id ? await getTemplate(t.id) : null;
  const order = await first("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM templates");
  await write(
    ["templates"],
    `INSERT OR REPLACE INTO templates
      (id, name, type, amount, currency, account_id, to_account_id, category_id, payee_id, payment_type, note, is_instapay, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      t.name.trim(),
      t.type,
      t.amount,
      t.currency,
      t.accountId,
      t.toAccountId,
      t.categoryId,
      t.payeeId,
      t.paymentType,
      t.note,
      int(t.isInstapay),
      existing?.sortOrder ?? order?.n ?? 0,
      existing?.createdAt ?? Date.now()
    ]
  );
  return id;
}
__name(saveTemplate, "saveTemplate");
async function deleteTemplate(id) {
  await write(["templates"], "DELETE FROM templates WHERE id = ?", [id]);
}
__name(deleteTemplate, "deleteTemplate");

// src/sync.ts
var SyncError = class extends Error {
  constructor(status2, code, message2) {
    super(message2);
    this.status = status2;
    this.code = code;
  }
  status;
  code;
  static {
    __name(this, "SyncError");
  }
};
async function getMeta(key) {
  return (await first("SELECT value FROM meta WHERE key = ?", [key]))?.value ?? null;
}
__name(getMeta, "getMeta");
async function setMeta(key, value) {
  await run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [key, value]);
}
__name(setMeta, "setMeta");
async function datasetId() {
  const id = await getMeta("dataset_id");
  if (id) return id;
  const fresh = crypto.randomUUID();
  await setMeta("dataset_id", fresh);
  return fresh;
}
__name(datasetId, "datasetId");
async function cloudCounts() {
  const r = await first(
    `SELECT (SELECT COUNT(*) FROM accounts) AS accounts,
            (SELECT COUNT(*) FROM transactions WHERE parent_id IS NULL) AS transactions,
            (SELECT COUNT(*) FROM payees) AS payees,
            (SELECT COUNT(*) FROM inbox_items WHERE status = 'pending') AS inbox`
  );
  return r ?? { accounts: 0, transactions: 0, payees: 0, inbox: 0 };
}
__name(cloudCounts, "cloudCounts");
async function isEmpty() {
  const r = await first("SELECT (SELECT COUNT(*) FROM accounts) + (SELECT COUNT(*) FROM categories) + (SELECT COUNT(*) FROM transactions) AS n");
  return !r?.n;
}
__name(isEmpty, "isEmpty");
async function status() {
  const rev = (await first("SELECT rev FROM sync_state"))?.rev ?? 0;
  return { datasetId: await datasetId(), rev, empty: await isEmpty(), counts: await cloudCounts(), schemaVersion: migrations.length };
}
__name(status, "status");
var MAX_PUSH = 1e3;
var MAX_PULL = 1e3;
async function push(body) {
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId.slice(0, 100) : "";
  if (!deviceId) throw new SyncError(400, "bad_request", "deviceId is missing");
  if (body?.datasetId !== await datasetId()) throw new SyncError(409, "dataset_changed", "The cloud copy was replaced since this device last synced.");
  const changes = validChanges(body?.changes, MAX_PUSH);
  if (!changes) throw new SyncError(400, "bad_request", "changes are malformed");
  let applied = 0;
  let skipped = 0;
  await transaction([], async () => {
    await setApplying(true);
    let rev2 = await nextRev(changes.length) - changes.length;
    for (const change of changes) {
      const existing = await outboxEntry(change.tbl, change.pk);
      if (existing && existing.origin !== deviceId && existing.at > change.at) {
        await run("UPDATE sync_outbox SET seq = ? WHERE seq = ?", [await nextRev(), existing.seq]);
        skipped++;
        continue;
      }
      try {
        await applyChange(change);
      } catch (e) {
        console.warn("push: skipped a record", change.tbl, change.pk, e);
        skipped++;
        continue;
      }
      await run("INSERT OR REPLACE INTO sync_outbox (seq, tbl, pk, at, origin) VALUES (?, ?, ?, ?, ?)", [++rev2, change.tbl, change.pk, change.at, deviceId]);
      applied++;
    }
    await setApplying(false);
  });
  if (changes.some((c) => c.tbl === "settings")) await loadSettings();
  await setMeta("last_push_at", String(Date.now()));
  const rev = (await first("SELECT rev FROM sync_state"))?.rev ?? 0;
  return { applied, skipped, rev };
}
__name(push, "push");
async function pull(since, deviceId, limit) {
  const size = Math.min(Math.max(1, limit || 500), MAX_PULL);
  const scanned = await readOutbox({ after: Math.max(0, since || 0), limit: size });
  const visible = scanned.filter((e) => e.origin !== deviceId);
  return {
    changes: await attachRows(visible),
    next: scanned.length ? scanned[scanned.length - 1].seq : Math.max(0, since || 0),
    more: scanned.length === size,
    fromClaude: visible.filter((e) => e.origin == null).length
  };
}
__name(pull, "pull");
async function reset() {
  await transaction([], async () => {
    await setApplying(true);
    for (const table of SYNCED_TABLE_NAMES) await run(`DELETE FROM ${table}`);
    await run("DELETE FROM sync_outbox");
    await run("DELETE FROM claude_change_rows");
    await run("DELETE FROM claude_changes");
    await setApplying(false);
  });
  await setMeta("dataset_id", crypto.randomUUID());
  await run("DELETE FROM meta WHERE key = 'last_push_at'");
  await loadSettings();
  return status();
}
__name(reset, "reset");

// src/tools/read.ts
var READ_ONLY = { readOnlyHint: true, openWorldHint: false };
var periodProps = {
  period: { type: "string", enum: [...PERIODS], description: "A named period in the user\u2019s time zone. Ignored when from/to are given. Default this_month." },
  from: { type: "string", description: "Start date, e.g. 2026-10-01 (inclusive, the user\u2019s time zone)" },
  to: { type: "string", description: "End date, e.g. 2026-10-31 (inclusive)" }
};
function periodOf(args, lk) {
  const p = resolvePeriod(args, lk.tz);
  if ("error" in p) throw new InputError(p.error);
  return p;
}
__name(periodOf, "periodOf");
function categoryIds(id, lk, withChildren) {
  return withChildren ? [id, ...lk.categories.filter((c) => c.parentId === id).map((c) => c.id)] : [id];
}
__name(categoryIds, "categoryIds");
async function phoneSyncedAt(lk) {
  const at = Number(await getMeta("last_push_at"));
  return at ? formatLocal(at, lk.tz) : null;
}
__name(phoneSyncedAt, "phoneSyncedAt");
var readTools = [
  {
    name: "get_overview",
    title: "Money overview",
    description: "Start here. Balances per account, this month and last month (spent, earned, needs vs wants), the review inbox, planned payments in the next 14 days and open debts. Amounts are in major units; totals are in the base currency.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
    async run() {
      const lk = await loadLookups();
      const thisMonth = periodOf({ period: "this_month" }, lk);
      const lastMonth = periodOf({ period: "last_month" }, lk);
      const summary = /* @__PURE__ */ __name(async (from, to) => {
        const s = await loadStats(from, to);
        const t = totals(s.txs, s.ctx);
        const n = natureSplit(s.txs, s.ctx);
        return { spent: major(t.spent), earned: major(t.earned), net: major(t.net), records: t.count, needs: major(n.need), wants: major(n.want), savings: major(n.saving), unclassified: major(n.none) };
      }, "summary");
      const pending = await pendingSummary();
      const upcoming = (await listUpcoming(14)).slice(0, 20).map((u) => ({
        id: u.recurring.id,
        name: u.recurring.name,
        date: formatDay(u.date, lk.tz),
        type: u.recurring.type,
        amount: major(u.recurring.amount),
        currency: u.recurring.currency,
        mode: u.recurring.mode === "auto" ? "logged automatically" : "asks to confirm"
      }));
      const debts = (await listDebts()).filter((d) => d.status === "open");
      const owed = /* @__PURE__ */ __name((dir) => debts.filter((d) => d.direction === dir).reduce((m, d) => ({ ...m, [d.currency]: (m[d.currency] ?? 0) + (major(d.remaining) ?? 0) }), {}), "owed");
      const accounts = (await balancesOut(lk)).filter((a) => !a.archived);
      return ok({
        base_currency: lk.base,
        time_zone: lk.tz,
        now: formatLocal(Date.now(), lk.tz),
        phone_last_synced: await phoneSyncedAt(lk),
        accounts,
        this_month: await summary(thisMonth.from, thisMonth.to),
        last_month: await summary(lastMonth.from, lastMonth.to),
        review_inbox: { waiting: pending.count, oldest: pending.oldest ? formatLocal(pending.oldest, lk.tz) : null },
        upcoming_planned_payments: upcoming,
        debts: { open: debts.length, owed_to_me: owed("lent"), i_owe: owed("borrowed") }
      });
    }
  },
  {
    name: "get_catalog",
    title: "Accounts, categories, payees and templates",
    description: "Every account, category (with its parent and need/want nature), payee (with defaults and the bank names that map to it) and template, with ids to use in other tools.",
    inputSchema: {
      type: "object",
      properties: { include_archived: { type: "boolean", description: "Also list archived accounts and categories" } },
      additionalProperties: false
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const archived = flag(args.include_archived, "include_archived") ?? false;
      const aliases = await all("SELECT raw, payee_id FROM payee_aliases");
      const aliasMap = /* @__PURE__ */ new Map();
      for (const a of aliases) aliasMap.set(a.payee_id, [...aliasMap.get(a.payee_id) ?? [], a.raw]);
      const templates = await listTemplates();
      return ok({
        base_currency: lk.base,
        accounts: (await balancesOut(lk)).filter((a) => archived || !a.archived),
        categories: lk.categories.filter((c) => archived || !c.archived).map((c) => ({
          id: c.id,
          name: c.name,
          ...c.parentId ? { parent: lk.categoryById.get(c.parentId)?.name ?? c.parentId } : {},
          kind: c.kind,
          ...c.nature !== "none" ? { nature: c.nature } : {},
          ...c.archived ? { archived: true } : {}
        })),
        payees: lk.payees.map((p) => ({
          id: p.id,
          name: p.name,
          kind: p.kind,
          ...p.defaultCategoryId ? { usual_category: categoryPath(p.defaultCategoryId, lk) } : {},
          ...p.defaultAccountId ? { usual_account: lk.accountById.get(p.defaultAccountId)?.name } : {},
          ...p.autoConfirm ? { auto_confirm: true } : {},
          ...aliasMap.get(p.id)?.length ? { bank_names: aliasMap.get(p.id) } : {},
          ...p.note ? { note: p.note } : {}
        })),
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          amount: major(t.amount),
          account: t.accountId ? lk.accountById.get(t.accountId)?.name : null,
          category: categoryPath(t.categoryId, lk),
          payee: t.payeeId ? lk.payeeById.get(t.payeeId)?.name : null
        }))
      });
    }
  },
  {
    name: "find_transactions",
    title: "Find transactions",
    description: 'Searches records (newest first) with totals. Filters combine. Fee rows are folded into their record as "fee". Use the returned ids with update_transactions or delete_transactions.',
    inputSchema: {
      type: "object",
      properties: {
        ...periodProps,
        period: { ...periodProps.period, description: "Named period; default all_time when no from/to is given." },
        account: { type: "string", description: "Account name or id" },
        category: { type: "string", description: 'Category name, "Parent \u203A Child" or id' },
        include_subcategories: { type: "boolean", description: "With category: include its subcategories (default true)" },
        uncategorized: { type: "boolean", description: "Only expenses/income without a category" },
        payee: { type: "string", description: "Payee name or id" },
        type: { type: "string", enum: [...TX_TYPES] },
        search: { type: "string", description: "Text in the note, payee or category name" },
        min_amount: { type: "number", description: "In the record\u2019s own currency" },
        max_amount: { type: "number" },
        source: { type: "string", enum: ["manual", "sms", "applepay", "claude", "import", "recurring"] },
        ids: { type: "array", items: { type: "string" }, maxItems: 100, description: "Fetch these records" },
        sort: { type: "string", enum: ["newest", "oldest", "largest"] },
        limit: { type: "integer", minimum: 1, maximum: 500, description: "Default 100" },
        offset: { type: "integer", minimum: 0 }
      },
      additionalProperties: false
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const where = ["t.parent_id IS NULL"];
      const params = [];
      const ids = Array.isArray(args.ids) ? args.ids.filter((x) => typeof x === "string").slice(0, 100) : [];
      if (ids.length) {
        where.push(`t.id IN (${ids.map(() => "?").join(",")})`);
        params.push(...ids);
      } else {
        const p = periodOf({ period: args.period ?? (args.from || args.to ? void 0 : "all_time"), from: args.from, to: args.to }, lk);
        where.push("t.date >= ? AND t.date <= ?");
        params.push(p.from, p.to);
      }
      const account = resolveAccount(args.account, lk);
      if (account) {
        where.push("(t.account_id = ? OR t.to_account_id = ?)");
        params.push(account.id, account.id);
      }
      const type = oneOf(args.type, "type", TX_TYPES);
      if (type) {
        where.push("t.type = ?");
        params.push(type);
      }
      if (args.category) {
        const kind = type === "income" ? "income" : "expense";
        let cat = await resolveCategory(args.category, kind, lk).catch(() => null);
        if (!cat && !type) cat = await resolveCategory(args.category, "income", lk);
        if (!cat) throw new InputError(`No category matches "${String(args.category)}"`);
        const set = categoryIds(cat.id, lk, flag(args.include_subcategories, "include_subcategories") ?? true);
        where.push(`t.category_id IN (${set.map(() => "?").join(",")})`);
        params.push(...set);
      }
      if (flag(args.uncategorized, "uncategorized")) where.push("t.category_id IS NULL AND t.type != 'transfer'");
      const payeeKey = text(args.payee, "payee");
      if (payeeKey) {
        const payee = lk.payeeById.get(payeeKey) ?? lk.payees.find((p) => p.name.toLowerCase() === payeeKey.toLowerCase());
        if (!payee) return ok({ count: 0, transactions: [], note: `No payee is called "${payeeKey}"; try search instead.` });
        where.push("t.payee_id = ?");
        params.push(payee.id);
      }
      const search = text(args.search, "search");
      if (search) {
        where.push("(t.note LIKE ? OR p.name LIKE ? OR c.name LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      const min = amountIn(args.min_amount, "min_amount", { allowZero: true });
      const max = amountIn(args.max_amount, "max_amount", { allowZero: true });
      if (min != null) {
        where.push("t.amount >= ?");
        params.push(min);
      }
      if (max != null) {
        where.push("t.amount <= ?");
        params.push(max);
      }
      const source = text(args.source, "source");
      if (source) {
        where.push("t.source = ?");
        params.push(source);
      }
      const sort = oneOf(args.sort, "sort", ["newest", "oldest", "largest"]) ?? "newest";
      const order = sort === "oldest" ? "t.date ASC" : sort === "largest" ? "t.base_amount DESC" : "t.date DESC, t.created_at DESC";
      const limit = Math.min(500, Math.max(1, Number(args.limit) || 100));
      const offset = Math.max(0, Number(args.offset) || 0);
      const from = "FROM transactions t LEFT JOIN payees p ON p.id = t.payee_id LEFT JOIN categories c ON c.id = t.category_id";
      const sql2 = where.join(" AND ");
      const rows = await all(
        `SELECT t.*, (SELECT COALESCE(SUM(x.amount), 0) FROM transactions x WHERE x.parent_id = t.id) AS fee_total ${from} WHERE ${sql2} ORDER BY ${order} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const sums = await all(
        `SELECT COUNT(*) AS n,
           COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.base_amount END), 0) AS spent,
           COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.base_amount END), 0) AS earned
         ${from} WHERE ${sql2}`,
        params
      );
      return ok({
        count: sums[0]?.n ?? 0,
        [`expenses_total_${lk.base.toLowerCase()}`]: major(sums[0]?.spent ?? 0),
        [`income_total_${lk.base.toLowerCase()}`]: major(sums[0]?.earned ?? 0),
        showing: `${rows.length} from ${offset + 1}`,
        transactions: rows.map((r) => txOut({ ...rowToTx(r), feeTotal: r.fee_total }, lk))
      });
    }
  },
  {
    name: "spending_report",
    title: "Spending or income report",
    description: 'Totals for a period grouped by category, subcategory, payee, account, month, week, day, weekday, hour or nature (need/want/saving). Counts like Mula\u2019s Insights: transfers and debt movements are excluded, fees count as spending, accounts marked "exclude from stats" are left out. Amounts are in the base currency.',
    inputSchema: {
      type: "object",
      properties: {
        ...periodProps,
        group_by: { type: "string", enum: ["category", "subcategory", "payee", "account", "month", "week", "day", "weekday", "hour", "nature"], description: "Default category" },
        type: { type: "string", enum: ["expense", "income"], description: "Default expense" },
        account: { type: "string" },
        category: { type: "string", description: "Only this category (and its subcategories)" },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Largest groups to return (default 20); time groupings return all" }
      },
      additionalProperties: false
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const p = periodOf(args, lk);
      const type = oneOf(args.type, "type", ["expense", "income"]) ?? "expense";
      const groupBy = oneOf(args.group_by, "group_by", ["category", "subcategory", "payee", "account", "month", "week", "day", "weekday", "hour", "nature"]) ?? "category";
      const account = resolveAccount(args.account, lk);
      const cat = args.category ? await resolveCategory(args.category, type, lk) : null;
      const catSet = cat ? new Set(categoryIds(cat.id, lk, true)) : null;
      const stats = await loadStats(p.from, p.to, account?.id ?? null);
      const counted = stats.txs.filter((t) => (type === "expense" ? isSpend(t, stats.ctx) : isEarn(t, stats.ctx)) && (!catSet || t.categoryId != null && catSet.has(t.categoryId)));
      const WEEKDAYS2 = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const keyOf = /* @__PURE__ */ __name((t) => {
        switch (groupBy) {
          case "category": {
            const c = t.categoryId ? lk.categoryById.get(t.categoryId) : null;
            const top = c?.parentId ? lk.categoryById.get(c.parentId) : c;
            return top?.name ?? "Uncategorized";
          }
          case "subcategory":
            return categoryPath(t.categoryId, lk) ?? "Uncategorized";
          case "payee":
            return t.payeeId ? lk.payeeById.get(t.payeeId)?.name ?? "Unknown payee" : t.parentId ? "Fees" : "No payee";
          case "account":
            return lk.accountById.get(t.accountId)?.name ?? t.accountId;
          case "month":
            return formatDay(t.date, lk.tz).slice(0, 7);
          case "week": {
            const d = localParts(t.date, lk.tz);
            const back = (d.weekday + 6) % 7;
            return `week of ${formatDay(t.date - back * 864e5, lk.tz)}`;
          }
          case "day":
            return formatDay(t.date, lk.tz);
          case "weekday":
            return WEEKDAYS2[localParts(t.date, lk.tz).weekday];
          case "hour":
            return `${String(localParts(t.date, lk.tz).h).padStart(2, "0")}:00`;
          case "nature":
            return natureOf(t, stats.ctx);
        }
      }, "keyOf");
      const groups = /* @__PURE__ */ new Map();
      let total = 0;
      for (const t of counted) {
        const g = groups.get(keyOf(t)) ?? { amount: 0, count: 0 };
        g.amount += t.baseAmount;
        if (!t.parentId) g.count++;
        groups.set(keyOf(t), g);
        total += t.baseAmount;
      }
      const timeline = ["month", "week", "day", "hour"].includes(groupBy);
      let out = [...groups.entries()].map(([label, g]) => ({ label, amount: major(g.amount), records: g.count, share: total ? Math.round(g.amount / total * 1e3) / 10 : 0 }));
      out = timeline ? out.sort((a, b) => a.label.localeCompare(b.label)) : out.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
      if (!timeline) out = out.slice(0, Math.min(100, Math.max(1, Number(args.limit) || 20)));
      return ok({
        period: p.label,
        from: formatDay(p.from || 0, lk.tz),
        to: formatDay(p.to, lk.tz),
        type,
        currency: lk.base,
        total: major(total),
        records: counted.filter((t) => !t.parentId).length,
        groups: out
      });
    }
  },
  {
    name: "run_query",
    title: "Read-only SQL",
    description: "Runs one read-only SQLite SELECT on Mula\u2019s database for questions the other tools can\u2019t answer. Results are capped at 500 rows. Amounts are integers in minor units (divide by 100); dates are milliseconds since the epoch (UTC; the user\u2019s zone is in get_overview). Tables: transactions(id, type expense|income|transfer, amount, currency, account_id, to_account_id, to_amount, category_id, payee_id, payment_type, date, note, is_instapay, parent_id (set on fee rows), nature_override, original_amount, original_currency, fx_rate, base_amount (in the base currency), recurring_id, debt_id, source, created_at, updated_at); accounts(id, name, type, currency, initial_balance, identifiers JSON, bank_balance, archived, exclude_from_stats); categories(id, parent_id, name, kind, nature, archived); payees(id, name, kind, default_category_id, default_account_id, auto_confirm); payee_aliases(raw, payee_id); inbox_items(id, source, raw_text, parsed JSON, received_at, status pending|confirmed|dismissed|merged, transaction_id); recurring(...); templates(...); debts(...).",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "One SELECT (or WITH \u2026 SELECT) statement; use ? for parameters" },
        params: { type: "array", items: { type: ["string", "number", "null"] }, maxItems: 50 }
      },
      required: ["sql"],
      additionalProperties: false
    },
    annotations: READ_ONLY,
    async run(args, ctx) {
      const sql2 = text(args.sql, "sql", 2e4);
      if (!sql2) throw new InputError("sql is required");
      const body = sql2.replace(/;\s*$/, "");
      if (body.includes(";")) throw new InputError("Send one statement at a time");
      if (!/^\s*(select|with)\b/i.test(body)) throw new InputError("Only SELECT queries are allowed here; use the other tools to change data");
      if (/\b(oauth_\w+|_schema_version|undo_ctx|claude_change_rows)\b/i.test(body)) throw new InputError("Those tables are internal to the relay");
      const params = Array.isArray(args.params) ? args.params : [];
      const rows = ctx.query(body, params);
      return ok({ rows: rows.slice(0, 500), ...rows.length > 500 ? { truncated: true, total_rows: rows.length } : {} });
    }
  },
  {
    name: "list_review_inbox",
    title: "Review inbox",
    description: "Bank messages, Apple Pay payments and planned payments waiting for review, newest first, each with what Mula would file it as (account, category, payee, possible duplicate). Resolve them with review_inbox.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100, description: "Default 30" } },
      additionalProperties: false
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const items = await listInbox("pending", Math.min(100, Math.max(1, Number(args.limit) || 30)));
      const out = [];
      for (const item of items) {
        const s = await buildSuggestion(item);
        out.push({
          id: item.id,
          received: formatLocal(item.receivedAt, lk.tz),
          source: item.source,
          ...item.parsed ? { kind: SMS_KIND_LABEL[item.parsed.kind] ?? item.parsed.kind } : {},
          message: item.rawText.slice(0, 400),
          ...item.parsed?.counterparty ? { bank_name: item.parsed.counterparty } : {},
          suggestion: {
            type: s.draft.type,
            amount: major(s.draft.amount),
            currency: s.account?.currency ?? item.parsed?.currency ?? lk.base,
            date: formatLocal(s.draft.date, lk.tz),
            account: s.account?.name ?? null,
            ...s.toAccount ? { to_account: s.toAccount.name } : {},
            category: categoryPath(s.draft.categoryId ?? null, lk),
            payee: s.payee?.name ?? s.suggestedName ?? null,
            ...s.needsPayee ? { needs_payee: "InstaPay messages don\u2019t say who received the money" } : {},
            ...s.draft.fee ? { fee: major(s.draft.fee) } : {},
            ...s.original ? { charged: { amount: major(s.original.amount), currency: s.original.currency, rate: s.original.rate } } : {},
            ...s.unconverted ? { needs_exchange_rate: { amount: major(s.unconverted.amount), currency: s.unconverted.currency, note: "No rate yet: pass amount in the account\u2019s currency to confirm" } } : {},
            ready_to_confirm: s.ready
          },
          ...s.possibleDuplicate ? { possible_duplicate: txOut(s.possibleDuplicate, lk) } : {},
          ...s.recurringMatch ? { looks_like_planned_payment: s.recurringMatch.name } : {},
          ...s.openDebts.length ? { open_debts_with_this_person: s.openDebts.map((d) => ({ id: d.id, direction: d.direction, remaining: major(d.remaining) })) } : {}
        });
      }
      const pending = await pendingSummary();
      return ok({ waiting: pending.count, items: out });
    }
  },
  {
    name: "list_planned_payments",
    title: "Planned payments and templates",
    description: "Recurring (planned) payments with their schedule, what is due in the next 30 days, and saved templates.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
    async run() {
      const lk = await loadLookups();
      const recurring = await listRecurring();
      const upcoming = await listUpcoming(30);
      const templates = await listTemplates();
      return ok({
        planned_payments: recurring.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          amount: major(r.amount),
          currency: r.currency,
          account: r.accountId ? lk.accountById.get(r.accountId)?.name : null,
          ...r.toAccountId ? { to_account: lk.accountById.get(r.toAccountId)?.name } : {},
          category: categoryPath(r.categoryId, lk),
          payee: r.payeeId ? lk.payeeById.get(r.payeeId)?.name : null,
          every: `${r.interval > 1 ? `${r.interval} ` : ""}${r.frequency}`,
          starts: formatDay(r.startDate, lk.tz),
          ends: r.endType === "never" ? "never" : r.endType === "until" && r.endDate ? `on ${formatDay(r.endDate, lk.tz)}` : `after ${r.endCount} times`,
          next_due: r.nextDue ? formatDay(r.nextDue, lk.tz) : null,
          done: r.occurrences,
          mode: r.mode === "auto" ? "logged automatically" : "asks to confirm",
          active: r.active,
          ...r.isInstapay ? { instapay: true } : {},
          ...r.note ? { note: r.note } : {}
        })),
        next_30_days: upcoming.map((u) => ({
          id: u.recurring.id,
          name: u.recurring.name,
          date: formatDay(u.date, lk.tz),
          amount: major(u.recurring.amount),
          currency: u.recurring.currency
        })),
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          amount: major(t.amount),
          currency: t.currency,
          account: t.accountId ? lk.accountById.get(t.accountId)?.name : null,
          category: categoryPath(t.categoryId, lk),
          payee: t.payeeId ? lk.payeeById.get(t.payeeId)?.name : null,
          ...t.isInstapay ? { instapay: true } : {}
        }))
      });
    }
  },
  {
    name: "list_debts",
    title: "Debts",
    description: "Money lent and borrowed, per person, with how much has been repaid.",
    inputSchema: {
      type: "object",
      properties: { include_closed: { type: "boolean", description: "Also list settled debts" } },
      additionalProperties: false
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const debts = (await listDebts()).filter((d) => flag(args.include_closed, "include_closed") ? true : d.status === "open");
      return ok({
        debts: debts.map((d) => ({
          id: d.id,
          direction: d.direction === "lent" ? "I lent" : "I borrowed",
          person: d.payeeName,
          amount: major(d.amount),
          currency: d.currency,
          repaid: major(d.repaid),
          remaining: major(d.remaining),
          date: formatDay(d.date, lk.tz),
          ...d.dueDate ? { due: formatDay(d.dueDate, lk.tz) } : {},
          ...d.accountId ? { account: lk.accountById.get(d.accountId)?.name } : {},
          ...d.note ? { note: d.note } : {},
          status: d.status
        }))
      });
    }
  },
  {
    name: "list_claude_changes",
    title: "What Claude changed",
    description: "Your recent changes to Mula (newest first), with ids for undo_claude_change.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100 } },
      additionalProperties: false
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const activity = await listActivity(Number(args.limit) || 20);
      return ok({
        changes: activity.map((a) => ({ id: a.id, at: formatLocal(a.at, lk.tz), tool: a.tool, summary: a.summary, records: a.rows, ...a.undoneAt ? { undone: formatLocal(a.undoneAt, lk.tz) } : {} }))
      });
    }
  }
];

// ../src/modules/accounts/utils/accountMeta.ts
var ACCOUNT_TYPES = [
  { value: "bank", label: "Bank account", icon: "landmark", payment: "debit_card" },
  { value: "card", label: "Credit card", icon: "credit-card", payment: "credit_card" },
  { value: "cash", label: "Cash", icon: "banknote", payment: "cash" },
  { value: "wallet", label: "Mobile wallet", icon: "wallet", payment: "mobile_wallet" },
  { value: "savings", label: "Savings", icon: "piggy-bank", payment: "bank_transfer" },
  { value: "other", label: "Other", icon: "coins", payment: "cash" }
];
var ACCOUNT_COLORS = ["#2F45D0", "#1F8A70", "#C77D16", "#B4417A", "#5B6B7F", "#7C5CC4", "#D0533F", "#3E8FB0"];
var accountTypeMeta = /* @__PURE__ */ __name((t) => ACCOUNT_TYPES.find((x) => x.value === t) ?? ACCOUNT_TYPES[0], "accountTypeMeta");

// ../src/modules/categories/utils/categoryMeta.ts
var CATEGORY_COLORS = Array.from(new Set(CATEGORY_TREE.map((g) => g.color)));
var SYSTEM_IDS = new Set(Object.values(SYSTEM_CATEGORIES));
var isSystemCategory = /* @__PURE__ */ __name((id) => SYSTEM_IDS.has(id), "isSystemCategory");

// src/tools/write.ts
var WRITES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
var DESTRUCTIVE = { ...WRITES, destructiveHint: true };
async function changed(tool, fn) {
  const { value, changeId } = await recordChange(tool, fn);
  return ok({ ...value, ...changeId ? { change_id: changeId, undo: "undo_claude_change with this change_id reverses it" } : { note: "Nothing changed" } });
}
__name(changed, "changed");
var plural = /* @__PURE__ */ __name((n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`, "plural");
var txFields = {
  type: { type: "string", enum: [...TX_TYPES], description: "Default expense" },
  amount: { type: "number", exclusiveMinimum: 0, description: "Positive, in major units (45.5)" },
  currency: { type: "string", description: "If not the account\u2019s currency, Mula converts at that day\u2019s rate and keeps the original" },
  account: { type: "string", description: "Account name or id. Default: the payee\u2019s usual account, else the last one used" },
  to_account: { type: "string", description: "Transfers: the receiving account" },
  to_amount: { type: "number", description: "Transfers between currencies: the amount that arrived" },
  category: { type: "string", description: 'Category name, "Parent \u203A Child" or id. Default: the payee\u2019s usual category' },
  payee: { type: "string", description: "Shop or person (name or id); new names become new payees" },
  payee_kind: { type: "string", enum: ["merchant", "person"], description: "For a new payee; default merchant" },
  date: { type: "string", description: '2026-10-16, "2026-10-16 13:30" (user\u2019s time zone) or ISO 8601. Default now' },
  note: { type: "string" },
  payment_type: { type: "string", enum: [...PAYMENT_TYPES], description: "Default: the account\u2019s usual one" },
  instapay: { type: "boolean", description: "Sent or received with InstaPay; outgoing ones get the InstaPay fee" },
  fee: { type: "number", minimum: 0, description: "A fee to book as its own expense (overrides the InstaPay fee; 0 for none)" },
  nature: { type: "string", enum: [...NATURES], description: "Override need/want for this record" }
};
async function buildTx(item, lk, existing) {
  const type = oneOf(item.type, "type", TX_TYPES) ?? existing?.type ?? "expense";
  const payee = item.payee === null ? null : await resolvePayee(item.payee, lk, { create: true, kind: oneOf(item.payee_kind, "payee_kind", ["merchant", "person"]) ?? "merchant" }) ?? (existing?.payeeId ? lk.payeeById.get(existing.payeeId) ?? null : null);
  let account = resolveAccount(item.account, lk);
  if (!account && existing) account = lk.accountById.get(existing.accountId) ?? null;
  if (!account && payee?.defaultAccountId) account = lk.accountById.get(payee.defaultAccountId) ?? null;
  const last = getSettings().lastAccountId;
  if (!account && last) account = lk.accountById.get(last) ?? null;
  const live = lk.accounts.filter((a) => !a.archived);
  if (!account && live.length === 1) account = live[0];
  if (!account) throw new InputError(`Which account? ${live.map((a) => a.name).join(", ")}`);
  const date = momentIn(item.date, lk, "date") ?? existing?.date ?? Date.now();
  const typed = amountIn(item.amount, "amount");
  const currency = currencyIn(item.currency);
  let amount = typed ?? existing?.amount ?? null;
  let original = existing && typed == null && existing.originalAmount != null && existing.originalCurrency && existing.fxRate != null ? { amount: existing.originalAmount, currency: existing.originalCurrency, rate: existing.fxRate } : null;
  if (amount == null) throw new InputError("amount is required");
  if (typed != null && currency && currency !== account.currency) {
    const c = await convert(typed, currency, account.currency, date);
    if (!c) throw new InputError(`No ${currency}\u2192${account.currency} rate is available for that date; give the amount in ${account.currency}`);
    amount = c.amount;
    original = { amount: typed, currency, rate: c.rate };
  } else if (typed != null) {
    original = null;
  }
  if (existing && typed == null && item.account && existing.currency !== account.currency) {
    throw new InputError(`${account.name} is in ${account.currency}; also give the amount in ${account.currency}`);
  }
  let toAccount = null;
  let toAmount = null;
  if (type === "transfer") {
    toAccount = resolveAccount(item.to_account, lk, "to_account") ?? (existing?.toAccountId ? lk.accountById.get(existing.toAccountId) ?? null : null);
    if (!toAccount) throw new InputError("A transfer needs to_account");
    if (toAccount.id === account.id) throw new InputError("to_account must be a different account");
    toAmount = amountIn(item.to_amount, "to_amount") ?? (typed == null ? existing?.toAmount ?? null : null);
    if (toAmount == null) {
      if (toAccount.currency === account.currency) toAmount = amount;
      else {
        const c = await convert(amount, account.currency, toAccount.currency, date);
        if (!c) throw new InputError(`No ${account.currency}\u2192${toAccount.currency} rate; give to_amount`);
        toAmount = c.amount;
      }
    }
  }
  let categoryId = null;
  if (type !== "transfer") {
    const kind = type === "income" ? "income" : "expense";
    const cat = await resolveCategory(item.category, kind, lk);
    const keep = existing && existing.type === type && existing.categoryId ? existing.categoryId : null;
    categoryId = cat?.id ?? keep ?? payee?.defaultCategoryId ?? null;
    if (categoryId && lk.categoryById.get(categoryId)?.kind !== kind) categoryId = cat?.id ?? null;
    if (!categoryId) {
      if (kind === "expense") categoryId = SYSTEM_CATEGORIES.missing;
      else throw new InputError('Income needs a category (e.g. "Wage, invoices"); see get_catalog');
    }
  }
  const instapay = flag(item.instapay, "instapay") ?? existing?.isInstapay ?? false;
  const paymentType = oneOf(item.payment_type, "payment_type", PAYMENT_TYPES) ?? (flag(item.instapay, "instapay") ? "instapay" : existing?.paymentType ?? account.defaultPaymentType);
  const feeArg = amountIn(item.fee, "fee", { allowZero: true });
  const feeBasisChanged = !existing || amount !== existing.amount || instapay !== existing.isInstapay;
  const fee = feeArg != null ? feeArg : instapay && type !== "income" ? feeBasisChanged ? instapayFee(amount, getSettings().instapayFee) : existing?.feeTotal ?? 0 : !instapay && existing?.isInstapay ? 0 : existing?.feeTotal ?? 0;
  const note = item.note === null ? null : text(item.note, "note", 1e3) ?? existing?.note ?? null;
  const natureArg = oneOf(item.nature, "nature", NATURES);
  return {
    type,
    amount,
    accountId: account.id,
    toAccountId: toAccount?.id ?? null,
    toAmount,
    categoryId,
    payeeId: payee?.id ?? null,
    paymentType,
    date,
    note,
    isInstapay: instapay,
    fee: fee || null,
    natureOverride: natureArg === "none" ? null : natureArg ?? existing?.natureOverride ?? null,
    original,
    recurringId: existing?.recurringId ?? null,
    debtId: existing?.debtId ?? null,
    source: existing?.source ?? "claude",
    sourceRef: existing?.sourceRef ?? null
  };
}
__name(buildTx, "buildTx");
async function existingTx(id) {
  if (typeof id !== "string" || !id) throw new InputError("id is required");
  const t = await getTransaction(id);
  if (!t) throw new InputError(`No transaction has id ${id}`);
  if (t.parentId) throw new InputError(`${id} is the fee of ${t.parentId}; change that record instead (its fee field)`);
  return { ...t, feeTotal: await getFeeTotal(id) };
}
__name(existingTx, "existingTx");
var transactionTools = [
  {
    name: "add_transactions",
    title: "Add transactions",
    description: "Adds expenses, income or transfers (up to 100 per call) straight into Mula. Use names from get_catalog; without a category, an expense goes to Others \u203A Missing. InstaPay transfers out get the InstaPay fee automatically.",
    inputSchema: {
      type: "object",
      properties: {
        transactions: { type: "array", minItems: 1, maxItems: 100, items: { type: "object", properties: txFields, required: ["amount"], additionalProperties: false } }
      },
      required: ["transactions"],
      additionalProperties: false
    },
    annotations: WRITES,
    async run(args) {
      const lk = await loadLookups();
      const items = list(args.transactions, "transactions", 100);
      return changed("add_transactions", async () => {
        const inputs = [];
        for (const [i, item] of items.entries()) {
          try {
            inputs.push(await buildTx(item, lk, null));
          } catch (e) {
            throw new InputError(`transactions[${i}]: ${e.message}`);
          }
        }
        const added = [];
        for (const input of inputs) {
          const id = await createTransaction(input);
          added.push(txOut({ ...await getTransaction(id), feeTotal: input.fee ?? 0 }, lk));
        }
        return { value: { added }, summary: added.length === 1 ? `Added ${describe(added[0])}` : `Added ${plural(added.length, "transaction")}` };
      });
    }
  },
  {
    name: "update_transactions",
    title: "Edit transactions",
    description: "Changes existing records (up to 200 per call, e.g. re-categorize every Uber ride). Give each record\u2019s id and only the fields to change; use null for note or payee to clear them. Changing an InstaPay amount recalculates its fee.",
    inputSchema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          minItems: 1,
          maxItems: 200,
          items: {
            type: "object",
            properties: { id: { type: "string" }, ...txFields, note: { type: ["string", "null"] }, payee: { type: ["string", "null"] } },
            required: ["id"],
            additionalProperties: false
          }
        }
      },
      required: ["updates"],
      additionalProperties: false
    },
    annotations: WRITES,
    async run(args) {
      const lk = await loadLookups();
      const items = list(args.updates, "updates", 200);
      return changed("update_transactions", async () => {
        const plans = [];
        for (const [i, item] of items.entries()) {
          try {
            const existing = await existingTx(item.id);
            plans.push({ id: existing.id, input: await buildTx(item, lk, existing) });
          } catch (e) {
            throw new InputError(`updates[${i}]: ${e.message}`);
          }
        }
        const updated = [];
        for (const p of plans) {
          await updateTransaction(p.id, p.input);
          updated.push(txOut({ ...await getTransaction(p.id), feeTotal: await getFeeTotal(p.id) }, lk));
        }
        return { value: { updated }, summary: updated.length === 1 ? `Edited ${describe(updated[0])}` : `Edited ${plural(updated.length, "transaction")}` };
      });
    }
  },
  {
    name: "delete_transactions",
    title: "Delete transactions",
    description: "Deletes records by id (with their fees). Bank messages that produced them go back to the review inbox.",
    inputSchema: {
      type: "object",
      properties: { ids: { type: "array", minItems: 1, maxItems: 200, items: { type: "string" } } },
      required: ["ids"],
      additionalProperties: false
    },
    annotations: DESTRUCTIVE,
    async run(args) {
      const lk = await loadLookups();
      const ids = Array.isArray(args.ids) ? [...new Set(args.ids.filter((x) => typeof x === "string"))] : [];
      if (!ids.length || ids.length > 200) throw new InputError("ids must list 1 to 200 transaction ids");
      return changed("delete_transactions", async () => {
        const found = [];
        for (const id of ids) {
          const t = await getTransaction(id);
          if (!t) throw new InputError(`No transaction has id ${id}`);
          found.push(t);
        }
        for (const t of found) await deleteTransaction(t.id);
        const out = found.map((t) => txOut(t, lk));
        return { value: { deleted: out }, summary: out.length === 1 ? `Deleted ${describe(out[0])}` : `Deleted ${plural(out.length, "transaction")}` };
      });
    }
  }
];
function describe(t) {
  const who = t.payee ? ` at ${t.payee}` : t.to_account ? ` to ${t.to_account}` : "";
  return `${t.type} ${t.currency} ${t.amount}${who} (${t.date.slice(0, 10)})`;
}
__name(describe, "describe");
var reviewTool = {
  name: "review_inbox",
  title: "Resolve review items",
  description: "Confirms, dismisses or links items from list_review_inbox (up to 100 per call). Confirm files the suggestion, with any fields you override (same fields as add_transactions); outgoing InstaPay needs a payee. A new name for a bank name is remembered for next time unless remember_name is false. Link marks an item as already recorded by an existing transaction.",
  inputSchema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: 100,
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            action: { type: "string", enum: ["confirm", "dismiss", "link", "restore"] },
            link_to: { type: "string", description: "For link: the transaction id that already covers it" },
            remember_name: { type: "boolean", description: "Map the bank\u2019s name to the payee for next time (default true)" },
            reason: { type: "string", description: "For dismiss: why (kept as a note)" },
            ...txFields
          },
          required: ["id", "action"],
          additionalProperties: false
        }
      }
    },
    required: ["items"],
    additionalProperties: false
  },
  annotations: WRITES,
  async run(args) {
    const lk = await loadLookups();
    const items = list(args.items, "items", 100);
    return changed("review_inbox", async () => {
      const results = [];
      let confirmed = 0;
      let dismissed = 0;
      for (const [i, item] of items.entries()) {
        const where = `items[${i}]`;
        const inbox = typeof item.id === "string" ? await getInboxItem(item.id) : null;
        if (!inbox) throw new InputError(`${where}: no inbox item has id ${String(item.id)}`);
        const action = oneOf(item.action, "action", ["confirm", "dismiss", "link", "restore"]);
        if (action === "restore") {
          await restoreItem(inbox.id);
          results.push({ id: inbox.id, restored: true });
          continue;
        }
        if (inbox.status !== "pending") throw new InputError(`${where}: that item is already ${inbox.status}`);
        if (action === "dismiss") {
          await dismissItem(inbox.id, text(item.reason, "reason", 200) ?? "Dismissed by Claude");
          results.push({ id: inbox.id, dismissed: true });
          dismissed++;
          continue;
        }
        if (action === "link") {
          const target = typeof item.link_to === "string" ? await getTransaction(item.link_to) : null;
          if (!target) throw new InputError(`${where}: link_to must be an existing transaction id`);
          await linkToExisting(inbox.id, target.id);
          results.push({ id: inbox.id, linked_to: target.id });
          continue;
        }
        const s = await buildSuggestion(inbox);
        if (s.unconverted && item.amount == null) {
          const acc = s.account?.currency ?? "the account\u2019s currency";
          throw new InputError(`${where}: no ${s.unconverted.currency} to ${acc} exchange rate yet; pass amount (in ${acc}), or amount with currency`);
        }
        const isPerson = inbox.parsed?.kind === "instapay_in" || inbox.parsed?.kind === "instapay_out";
        const payeeName = item.payee ?? (s.payee ? s.payee.id : s.suggestedName);
        const draft = { ...s.draft, payeeId: null, categoryId: s.draft.categoryId ?? null };
        let input;
        try {
          input = await buildTx(
            { ...item, payee: payeeName ?? void 0, payee_kind: item.payee_kind ?? (isPerson ? "person" : "merchant"), account: item.account ?? s.account?.id ?? void 0, to_account: item.to_account ?? s.toAccount?.id ?? void 0 },
            lk,
            { ...draftAsTx(draft, s.account?.currency ?? lk.base), feeTotal: s.draft.fee ?? 0 }
          );
        } catch (e) {
          throw new InputError(`${where}: ${e.message}`);
        }
        if (s.needsPayee && !input.payeeId) throw new InputError(`${where}: who received this InstaPay transfer? Pass payee.`);
        if (input.type !== "transfer" && input.categoryId === SYSTEM_CATEGORIES.missing && !item.category) {
          throw new InputError(`${where}: pick a category (Mula has no usual category for this payee)`);
        }
        const remember = flag(item.remember_name, "remember_name") ?? true;
        const alias = remember && s.rawName && input.payeeId && input.payeeId !== s.payee?.id ? { raw: s.rawName, payeeId: input.payeeId } : null;
        const txId = await confirmItem(inbox.id, { ...input, source: s.draft.source, sourceRef: inbox.id }, { alias });
        results.push({ id: inbox.id, confirmed: txOut({ ...await getTransaction(txId), feeTotal: await getFeeTotal(txId) }, lk) });
        confirmed++;
      }
      const parts = [confirmed ? `confirmed ${confirmed}` : "", dismissed ? `dismissed ${dismissed}` : ""].filter(Boolean);
      return { value: { results }, summary: `Review inbox: ${parts.join(", ") || `${results.length} updated`}` };
    });
  }
};
function draftAsTx(d, currency) {
  return {
    id: "",
    type: d.type,
    amount: d.amount,
    currency,
    accountId: d.accountId ?? "",
    toAccountId: d.toAccountId ?? null,
    toAmount: d.toAmount ?? null,
    categoryId: d.categoryId ?? null,
    payeeId: d.payeeId ?? null,
    paymentType: d.paymentType,
    date: d.date,
    note: d.note ?? null,
    isInstapay: Boolean(d.isInstapay),
    parentId: null,
    natureOverride: d.natureOverride ?? null,
    originalAmount: d.original?.amount ?? null,
    originalCurrency: d.original?.currency ?? null,
    fxRate: d.original?.rate ?? null,
    baseAmount: d.amount,
    recurringId: d.recurringId ?? null,
    debtId: d.debtId ?? null,
    source: d.source ?? "sms",
    sourceRef: d.sourceRef ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
__name(draftAsTx, "draftAsTx");
var ACCOUNT_TYPES2 = ["bank", "card", "cash", "wallet", "savings", "other"];
var accountsTool = {
  name: "manage_accounts",
  title: "Manage accounts",
  description: "Creates, edits, archives or deletes an account. Deleting also deletes every transaction on it (archive keeps them). card_digits are the last digits of cards and accounts that bank messages mention, used to route them.",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["create", "update", "archive", "unarchive", "delete"] },
      account: { type: "string", description: "For update/archive/unarchive/delete: name or id" },
      name: { type: "string" },
      type: { type: "string", enum: [...ACCOUNT_TYPES2] },
      currency: { type: "string", description: "Only when creating" },
      starting_balance: { type: "number", description: "Balance before the first record (can be negative)" },
      default_payment_type: { type: "string", enum: [...PAYMENT_TYPES] },
      card_digits: { type: "array", items: { type: "string" }, maxItems: 10 },
      exclude_from_stats: { type: "boolean" }
    },
    required: ["action"],
    additionalProperties: false
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, "action", ["create", "update", "archive", "unarchive", "delete"]);
    const startingBalance = /* @__PURE__ */ __name(() => {
      if (args.starting_balance === void 0 || args.starting_balance === null) return null;
      const n = Number(args.starting_balance);
      if (!Number.isFinite(n)) throw new InputError("starting_balance must be a number");
      return Math.round(n * 100);
    }, "startingBalance");
    const digits = Array.isArray(args.card_digits) ? args.card_digits.map((d) => String(d).replace(/\D/g, "")).filter(Boolean) : null;
    if (action === "create") {
      const name = text(args.name, "name", 60);
      if (!name) throw new InputError("name is required");
      const type2 = oneOf(args.type, "type", ACCOUNT_TYPES2) ?? "bank";
      const meta = accountTypeMeta(type2);
      const input2 = {
        name,
        type: type2,
        currency: currencyIn(args.currency) ?? lk.base,
        initialBalance: startingBalance() ?? 0,
        color: ACCOUNT_COLORS[lk.accounts.length % ACCOUNT_COLORS.length],
        icon: meta.icon,
        defaultPaymentType: oneOf(args.default_payment_type, "default_payment_type", PAYMENT_TYPES) ?? meta.payment,
        identifiers: digits ?? [],
        excludeFromStats: flag(args.exclude_from_stats, "exclude_from_stats") ?? false,
        archived: false
      };
      return changed("manage_accounts", async () => {
        const id = await saveAccount(input2);
        return { value: { created: { id, name, type: type2, currency: input2.currency } }, summary: `Created account ${name}` };
      });
    }
    const account = resolveAccount(args.account, lk);
    if (!account) throw new InputError("account is required");
    if (action === "delete") {
      const n = (await first("SELECT COUNT(*) AS n FROM transactions WHERE account_id = ? OR to_account_id = ?", [account.id, account.id]))?.n ?? 0;
      return changed("manage_accounts", async () => {
        await deleteAccount(account.id);
        return { value: { deleted: account.name, transactions_deleted: n }, summary: `Deleted account ${account.name} and ${plural(n, "record")}` };
      });
    }
    if (args.currency && currencyIn(args.currency) !== account.currency) throw new InputError("An account\u2019s currency can\u2019t change; create a new account instead");
    const type = oneOf(args.type, "type", ACCOUNT_TYPES2) ?? account.type;
    const input = {
      ...account,
      name: text(args.name, "name", 60) ?? account.name,
      type,
      initialBalance: startingBalance() ?? account.initialBalance,
      icon: type !== account.type ? accountTypeMeta(type).icon : account.icon,
      defaultPaymentType: oneOf(args.default_payment_type, "default_payment_type", PAYMENT_TYPES) ?? account.defaultPaymentType,
      identifiers: digits ?? account.identifiers,
      excludeFromStats: flag(args.exclude_from_stats, "exclude_from_stats") ?? account.excludeFromStats,
      archived: action === "archive" ? true : action === "unarchive" ? false : account.archived
    };
    return changed("manage_accounts", async () => {
      await saveAccount(input);
      const after = await getAccount(account.id);
      const verb = action === "archive" ? "Archived" : action === "unarchive" ? "Unarchived" : "Edited";
      return { value: { account: { id: account.id, name: after?.name, archived: after?.archived } }, summary: `${verb} account ${after?.name ?? account.name}` };
    });
  }
};
var categoriesTool = {
  name: "manage_categories",
  title: "Manage categories",
  description: "Creates or edits a category or subcategory, archives or restores it, or sets whether it is a need, want or saving. A subcategory takes its group\u2019s kind and color. Icons are lucide names, e.g. coffee, utensils, car, house, shopping-bag, gift, plane, tag.",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["create", "update", "archive", "unarchive"] },
      category: { type: "string", description: 'For update/archive/unarchive: name, "Parent \u203A Child" or id' },
      kind: { type: "string", enum: ["expense", "income"], description: "Default expense" },
      name: { type: "string" },
      parent: { type: "string", description: "Make it a subcategory of this group (name or id)" },
      nature: { type: "string", enum: [...NATURES] },
      icon: { type: "string" }
    },
    required: ["action"],
    additionalProperties: false
  },
  annotations: WRITES,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, "action", ["create", "update", "archive", "unarchive"]);
    const kind = oneOf(args.kind, "kind", ["expense", "income"]) ?? "expense";
    const parentOf = /* @__PURE__ */ __name(async (k) => {
      if (!args.parent) return null;
      const p = await resolveCategory(args.parent, k, lk, "parent");
      if (p?.parentId) throw new InputError("parent must be a top-level category (groups only go one level deep)");
      return p;
    }, "parentOf");
    if (action === "create") {
      const name = text(args.name, "name", 60);
      if (!name) throw new InputError("name is required");
      const parent2 = await parentOf(kind);
      const nature2 = oneOf(args.nature, "nature", NATURES) ?? "none";
      return changed("manage_categories", async () => {
        const id = await saveCategory({
          parentId: parent2?.id ?? null,
          name,
          kind: parent2?.kind ?? kind,
          icon: text(args.icon, "icon", 40) ?? parent2?.icon ?? "tag",
          color: parent2?.color ?? CATEGORY_COLORS[lk.categories.filter((c) => !c.parentId).length % CATEGORY_COLORS.length],
          nature: nature2
        });
        return { value: { created: { id, path: parent2 ? `${parent2.name} \u203A ${name}` : name } }, summary: `Created category ${parent2 ? `${parent2.name} \u203A ` : ""}${name}` };
      });
    }
    let cat = await resolveCategory(args.category, kind, lk).catch(() => null);
    if (!cat && !args.kind) cat = await resolveCategory(args.category, "income", lk);
    if (!cat) throw new InputError("category is required");
    const target = cat;
    const path = categoryPath(target.id, lk) ?? target.name;
    if (action === "archive" || action === "unarchive") {
      if (action === "archive" && isSystemCategory(target.id)) throw new InputError(`${path} is used by Mula itself and can\u2019t be archived`);
      return changed("manage_categories", async () => {
        if (action === "archive") await setCategoryArchived(target.id, true);
        else await restoreCategory(target.id);
        return { value: { [action === "archive" ? "archived" : "restored"]: path }, summary: `${action === "archive" ? "Archived" : "Restored"} category ${path}` };
      });
    }
    const parent = args.parent ? await parentOf(target.kind) : target.parentId ? lk.categoryById.get(target.parentId) ?? null : null;
    if (parent?.id === target.id) throw new InputError("A category can\u2019t be its own parent");
    if (args.parent && lk.categories.some((c) => c.parentId === target.id)) throw new InputError(`${path} has subcategories, so it has to stay a group`);
    const nature = oneOf(args.nature, "nature", NATURES);
    return changed("manage_categories", async () => {
      if (args.name || args.parent || args.icon) {
        await saveCategory({
          id: target.id,
          parentId: parent?.id ?? null,
          name: text(args.name, "name", 60) ?? target.name,
          kind: target.kind,
          icon: text(args.icon, "icon", 40) ?? target.icon,
          color: parent?.color ?? target.color,
          nature: nature ?? target.nature
        });
      } else if (nature) {
        await setCategoryNature(target.id, nature);
      }
      return { value: { updated: target.id }, summary: `Edited category ${path}` };
    });
  }
};
var payeesTool = {
  name: "manage_payees",
  title: "Manage payees",
  description: 'Creates, renames or edits a payee (usual category and account, auto-confirm), merges duplicates, deletes one, or maps a bank\u2019s raw name (e.g. "PAYMOB Sample Coffee Co") to a payee so future messages are recognized. relabel_past also moves records filed under the payee that name used to map to.',
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["create", "update", "merge", "delete", "add_bank_name", "remove_bank_name"] },
      payee: { type: "string", description: "Name or id (for create: the new name)" },
      name: { type: "string", description: "For update: a new name" },
      kind: { type: "string", enum: ["merchant", "person"] },
      usual_category: { type: ["string", "null"] },
      usual_account: { type: ["string", "null"] },
      auto_confirm: { type: "boolean", description: "Bank messages from this payee skip review" },
      note: { type: ["string", "null"] },
      into: { type: "string", description: "For merge: the payee to keep" },
      bank_name: { type: "string", description: "For add_bank_name/remove_bank_name" },
      relabel_past: { type: "boolean" }
    },
    required: ["action"],
    additionalProperties: false
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, "action", ["create", "update", "merge", "delete", "add_bank_name", "remove_bank_name"]);
    if (action === "remove_bank_name") {
      const raw = text(args.bank_name, "bank_name", 120);
      if (!raw) throw new InputError("bank_name is required");
      return changed("manage_payees", async () => {
        await removeAlias(raw);
        return { value: { removed: raw }, summary: `Forgot bank name ${raw}` };
      });
    }
    const usual = /* @__PURE__ */ __name(async (p) => ({
      defaultCategoryId: args.usual_category === null ? null : args.usual_category ? (await resolveCategory(args.usual_category, "expense", lk).catch(() => null) ?? await resolveCategory(args.usual_category, "income", lk)).id : p.defaultCategoryId,
      defaultAccountId: args.usual_account === null ? null : args.usual_account ? resolveAccount(args.usual_account, lk, "usual_account").id : p.defaultAccountId
    }), "usual");
    if (action === "create") {
      const name2 = text(args.payee, "payee", 80);
      if (!name2) throw new InputError("payee (the name) is required");
      if (await findPayeeByName(name2)) throw new InputError(`${name2} already exists; use update`);
      const defaults2 = await usual({ defaultCategoryId: null, defaultAccountId: null });
      return changed("manage_payees", async () => {
        const p = await resolvePayee(name2, lk, { create: true, kind: oneOf(args.kind, "kind", ["merchant", "person"]) ?? "merchant" });
        await updatePayee({ id: p.id, name: p.name, kind: p.kind, ...defaults2, autoConfirm: flag(args.auto_confirm, "auto_confirm") ?? false, note: text(args.note, "note", 300) });
        return { value: { created: { id: p.id, name: p.name } }, summary: `Created payee ${p.name}` };
      });
    }
    const payee = await resolvePayee(args.payee, lk, { create: false });
    if (!payee) throw new InputError("payee is required");
    if (action === "merge") {
      const into = await resolvePayee(args.into, lk, { create: false }, "into");
      if (!into) throw new InputError("into is required");
      if (into.id === payee.id) throw new InputError("Those are the same payee");
      return changed("manage_payees", async () => {
        await mergePayees(payee.id, into.id);
        return { value: { merged: payee.name, into: into.name }, summary: `Merged ${payee.name} into ${into.name}` };
      });
    }
    if (action === "delete") {
      return changed("manage_payees", async () => {
        await deletePayee(payee.id);
        return { value: { deleted: payee.name }, summary: `Deleted payee ${payee.name} (records kept without a payee)` };
      });
    }
    if (action === "add_bank_name") {
      const raw = text(args.bank_name, "bank_name", 120);
      if (!raw) throw new InputError("bank_name is required");
      return changed("manage_payees", async () => {
        await setAlias(raw, payee.id, { relabelPast: flag(args.relabel_past, "relabel_past") ?? false });
        return { value: { bank_name: raw, payee: payee.name }, summary: `"${raw}" now means ${payee.name}` };
      });
    }
    const name = text(args.name, "name", 80) ?? payee.name;
    const clash = name.toLowerCase() !== payee.name.toLowerCase() ? await findPayeeByName(name) : null;
    if (clash) throw new InputError(`${clash.name} already exists; merge into it instead`);
    const defaults = await usual(payee);
    return changed("manage_payees", async () => {
      await updatePayee({
        id: payee.id,
        name,
        kind: oneOf(args.kind, "kind", ["merchant", "person"]) ?? payee.kind,
        ...defaults,
        autoConfirm: flag(args.auto_confirm, "auto_confirm") ?? payee.autoConfirm,
        note: args.note === null ? null : text(args.note, "note", 300) ?? payee.note
      });
      return { value: { updated: { id: payee.id, name } }, summary: name !== payee.name ? `Renamed ${payee.name} to ${name}` : `Edited payee ${name}` };
    });
  }
};
var FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];
var ENDS = ["never", "until", "count"];
var plannedTool = {
  name: "manage_planned_payments",
  title: "Manage planned payments and templates",
  description: 'Planned (recurring) payments: create, update, pause, resume, delete. Mula on the phone logs them when due ("auto") or asks first ("confirm", the default). A start date in the past does not log the missed dates unless log_missed is true. Templates: create_template, update_template, delete_template.',
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["create", "update", "pause", "resume", "delete", "create_template", "update_template", "delete_template"] },
      id: { type: "string", description: "For everything except create/create_template" },
      name: { type: "string" },
      type: { type: "string", enum: [...TX_TYPES] },
      amount: { type: "number", exclusiveMinimum: 0 },
      currency: {
        type: "string",
        description: "Currency the amount is charged in, e.g. EGP for a subscription billed in pounds on a USD card. Default: the account\u2019s. Converted to the account\u2019s currency at the rate of each payment date when it is logged."
      },
      account: { type: "string" },
      to_account: { type: "string" },
      category: { type: "string" },
      payee: { type: "string" },
      payment_type: { type: "string", enum: [...PAYMENT_TYPES] },
      instapay: { type: "boolean" },
      note: { type: ["string", "null"] },
      frequency: { type: "string", enum: [...FREQUENCIES] },
      interval: { type: "integer", minimum: 1, maximum: 365, description: "Every N periods (default 1)" },
      start_date: { type: "string", description: "First due date, e.g. 2026-11-01" },
      ends: { type: "string", enum: [...ENDS] },
      end_date: { type: "string" },
      end_count: { type: "integer", minimum: 1 },
      mode: { type: "string", enum: ["auto", "confirm"] },
      remind_days_before: { type: "integer", minimum: 0, maximum: 30 },
      log_missed: { type: "boolean", description: "create/resume: also log dates that are already past" }
    },
    required: ["action"],
    additionalProperties: false
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, "action", ["create", "update", "pause", "resume", "delete", "create_template", "update_template", "delete_template"]);
    if (!action) throw new InputError("action is required");
    const logMissed = flag(args.log_missed, "log_missed") ?? false;
    const preset = /* @__PURE__ */ __name(async (prev) => {
      const type = oneOf(args.type, "type", TX_TYPES) ?? prev?.type ?? "expense";
      const account = resolveAccount(args.account, lk) ?? (prev?.accountId ? lk.accountById.get(prev.accountId) ?? null : null);
      const toAccount = type === "transfer" ? resolveAccount(args.to_account, lk, "to_account") ?? (prev?.toAccountId ? lk.accountById.get(prev.toAccountId) ?? null : null) : null;
      const cat = type === "transfer" ? null : await resolveCategory(args.category, type === "income" ? "income" : "expense", lk);
      const payee = await resolvePayee(args.payee, lk, { create: true }) ?? (prev?.payeeId ? lk.payeeById.get(prev.payeeId) ?? null : null);
      const isInstapay = flag(args.instapay, "instapay") ?? prev?.isInstapay ?? false;
      const typed = currencyIn(args.currency);
      if (typed && !CURRENCIES.includes(typed)) throw new InputError(`currency must be one of ${CURRENCIES.join(", ")}`);
      const prevAccount = prev?.accountId ? lk.accountById.get(prev.accountId) ?? null : null;
      const kept = prev?.currency && prev.currency !== prevAccount?.currency ? prev.currency : null;
      return {
        type,
        amount: amountIn(args.amount, "amount") ?? prev?.amount ?? null,
        // InstaPay is EGP-only, so it always uses the account's currency.
        currency: isInstapay ? account?.currency ?? lk.base : typed ?? kept ?? account?.currency ?? prev?.currency ?? lk.base,
        accountId: account?.id ?? null,
        toAccountId: toAccount?.id ?? null,
        categoryId: type === "transfer" ? null : cat?.id ?? (prev?.type === type ? prev.categoryId : null) ?? payee?.defaultCategoryId ?? null,
        payeeId: payee?.id ?? null,
        paymentType: oneOf(args.payment_type, "payment_type", PAYMENT_TYPES) ?? (flag(args.instapay, "instapay") ? "instapay" : prev?.paymentType ?? account?.defaultPaymentType ?? null),
        note: args.note === null ? null : text(args.note, "note", 500) ?? prev?.note ?? null,
        isInstapay
      };
    }, "preset");
    if (action === "create_template" || action === "update_template" || action === "delete_template") {
      const existing2 = action === "create_template" ? null : await getTemplate(String(args.id ?? ""));
      if (action !== "create_template" && !existing2) throw new InputError("id must be a template id (see list_planned_payments)");
      return changed("manage_planned_payments", async () => {
        if (action === "delete_template") {
          await deleteTemplate(existing2.id);
          return { value: { deleted_template: existing2.name }, summary: `Deleted template ${existing2.name}` };
        }
        const name = text(args.name, "name", 60) ?? existing2?.name;
        if (!name) throw new InputError("A template needs a name");
        const input = { ...await preset(existing2), id: existing2?.id, name };
        const id = await saveTemplate(input);
        return { value: { template: { id, name } }, summary: `${existing2 ? "Edited" : "Created"} template ${name}` };
      });
    }
    const existing = action === "create" ? null : await getRecurring(String(args.id ?? ""));
    if (action !== "create" && !existing) throw new InputError("id must be a planned payment id (see list_planned_payments)");
    return changed("manage_planned_payments", async () => {
      if (action === "delete") {
        await deleteRecurring(existing.id);
        return { value: { deleted: existing.name }, summary: `Deleted planned payment ${existing.name}` };
      }
      if (action === "pause" || action === "resume") {
        await setRecurringActive(existing.id, action === "resume");
        const skipped2 = action === "resume" && !logMissed ? await skipMissedRecurring(existing.id) : 0;
        return {
          value: { [action === "pause" ? "paused" : "resumed"]: existing.name, ...skipped2 ? { skipped_missed_dates: skipped2 } : {} },
          summary: `${action === "pause" ? "Paused" : "Resumed"} ${existing.name}`
        };
      }
      const fields = await preset(existing);
      const name = text(args.name, "name", 60) ?? existing?.name ?? (fields.payeeId ? lk.payeeById.get(fields.payeeId)?.name : null);
      if (!name) throw new InputError("A planned payment needs a name");
      if (!fields.accountId) throw new InputError("account is required");
      if (!fields.amount) throw new InputError("amount is required");
      if (fields.type === "transfer" && !fields.toAccountId) throw new InputError("A transfer needs to_account");
      if (fields.type !== "transfer" && !fields.categoryId) throw new InputError("category is required");
      const ends = oneOf(args.ends, "ends", ENDS) ?? existing?.endType ?? "never";
      const input = {
        ...fields,
        id: existing?.id,
        name,
        frequency: oneOf(args.frequency, "frequency", FREQUENCIES) ?? existing?.frequency ?? "monthly",
        interval: args.interval != null ? Math.max(1, Math.round(Number(args.interval))) : existing?.interval ?? 1,
        startDate: momentIn(args.start_date, lk, "start_date", "noon") ?? existing?.startDate ?? Date.now(),
        endType: ends,
        endDate: ends === "until" ? momentIn(args.end_date, lk, "end_date", "end") ?? existing?.endDate ?? null : null,
        endCount: ends === "count" ? args.end_count != null ? Math.max(1, Math.round(Number(args.end_count))) : existing?.endCount ?? null : null,
        mode: oneOf(args.mode, "mode", ["auto", "confirm"]) ?? existing?.mode ?? "confirm",
        remindDaysBefore: args.remind_days_before != null ? Math.round(Number(args.remind_days_before)) : existing?.remindDaysBefore ?? 1,
        active: existing?.active ?? true
      };
      if (input.endType === "until" && !input.endDate) throw new InputError('ends "until" needs end_date');
      if (input.endType === "count" && !input.endCount) throw new InputError('ends "count" needs end_count');
      const id = await saveRecurring(input);
      const skipped = logMissed ? 0 : await skipMissedRecurring(id);
      const after = await getRecurring(id);
      return {
        value: {
          planned_payment: { id, name, next_due: after?.nextDue ? formatLocal(after.nextDue, lk.tz).slice(0, 10) : null },
          ...skipped ? { skipped_past_dates: skipped } : {}
        },
        summary: `${existing ? "Edited" : "Created"} planned payment ${name}`
      };
    });
  }
};
var debtsTool = {
  name: "manage_debts",
  title: "Manage debts",
  description: "Records money lent or borrowed (with the money leaving or arriving on an account, unless record_movement is false), records a repayment, closes, reopens, edits or deletes a debt. Debt movements never count as spending or income. Lending over InstaPay books the fee as spending.",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["create", "repay", "close", "reopen", "update", "delete"] },
      id: { type: "string", description: "For everything except create" },
      direction: { type: "string", enum: ["lent", "borrowed"] },
      person: { type: "string", description: "Name or payee id" },
      amount: { type: "number", exclusiveMinimum: 0 },
      currency: { type: "string" },
      account: { type: "string" },
      date: { type: "string" },
      due_date: { type: ["string", "null"] },
      note: { type: ["string", "null"] },
      record_movement: { type: "boolean", description: "create: also book the money on the account (default true when an account is given)" },
      instapay: { type: "boolean" },
      payment_type: { type: "string", enum: [...PAYMENT_TYPES] },
      delete_transactions: { type: "boolean", description: "delete: also delete the loan and repayment records (default false keeps them, unlinked)" }
    },
    required: ["action"],
    additionalProperties: false
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, "action", ["create", "repay", "close", "reopen", "update", "delete"]);
    if (action === "create") {
      const direction = oneOf(args.direction, "direction", ["lent", "borrowed"]);
      if (!direction) throw new InputError("direction (lent or borrowed) is required");
      const amount = amountIn(args.amount, "amount");
      if (!amount) throw new InputError("amount is required");
      const account = resolveAccount(args.account, lk);
      const instapay = flag(args.instapay, "instapay") ?? false;
      const date = momentIn(args.date, lk, "date") ?? Date.now();
      const due = momentIn(args.due_date, lk, "due_date", "end");
      const personName = text(args.person, "person", 80);
      if (!personName) throw new InputError("person is required");
      return changed("manage_debts", async () => {
        const person = await resolvePayee(personName, lk, { create: true, kind: "person" });
        const id = await saveDebt(
          { direction, payeeId: person.id, accountId: account?.id ?? null, amount, currency: account?.currency ?? currencyIn(args.currency) ?? lk.base, date, dueDate: due, note: text(args.note, "note", 300) },
          { recordMovement: (flag(args.record_movement, "record_movement") ?? true) && Boolean(account), instapay, paymentType: oneOf(args.payment_type, "payment_type", PAYMENT_TYPES) ?? account?.defaultPaymentType }
        );
        return { value: { debt: { id, direction, person: person.name, amount: major(amount) } }, summary: `${direction === "lent" ? "Lent" : "Borrowed"} ${major(amount)} ${direction === "lent" ? "to" : "from"} ${person.name}` };
      });
    }
    const debt = await getDebt(String(args.id ?? ""));
    if (!debt) throw new InputError("id must be a debt id (see list_debts)");
    if (action === "repay") {
      const amount = amountIn(args.amount, "amount");
      if (!amount) throw new InputError("amount is required");
      const account = resolveAccount(args.account, lk) ?? (debt.accountId ? lk.accountById.get(debt.accountId) ?? null : null);
      if (!account) throw new InputError("account is required");
      const instapay = flag(args.instapay, "instapay") ?? false;
      return changed("manage_debts", async () => {
        await addRepayment(debt.id, {
          amount,
          accountId: account.id,
          date: momentIn(args.date, lk, "date") ?? Date.now(),
          paymentType: oneOf(args.payment_type, "payment_type", PAYMENT_TYPES) ?? (instapay ? "instapay" : account.defaultPaymentType),
          note: text(args.note, "note", 300),
          isInstapay: instapay,
          fee: instapay && debt.direction === "borrowed" ? instapayFee(amount, getSettings().instapayFee) : null
        });
        const after = await getDebt(debt.id);
        return { value: { debt: debt.id, remaining: major(after?.remaining), status: after?.status }, summary: `Repayment of ${major(amount)} on ${debt.payeeName}\u2019s debt` };
      });
    }
    if (action === "close" || action === "reopen") {
      return changed("manage_debts", async () => {
        await setDebtStatus(debt.id, action === "close" ? "closed" : "open");
        return { value: { debt: debt.id, status: action === "close" ? "closed" : "open" }, summary: `${action === "close" ? "Closed" : "Reopened"} the debt with ${debt.payeeName}` };
      });
    }
    if (action === "delete") {
      const withRecords = flag(args.delete_transactions, "delete_transactions") ?? false;
      return changed("manage_debts", async () => {
        await deleteDebt(debt.id, { deleteTransactions: withRecords });
        return { value: { deleted: debt.id }, summary: `Deleted the debt with ${debt.payeeName}` };
      });
    }
    return changed("manage_debts", async () => {
      const person = args.person ? await resolvePayee(args.person, lk, { create: true, kind: "person" }) : null;
      await saveDebt({
        id: debt.id,
        direction: oneOf(args.direction, "direction", ["lent", "borrowed"]) ?? debt.direction,
        payeeId: person?.id ?? debt.payeeId,
        accountId: args.account ? resolveAccount(args.account, lk).id : debt.accountId,
        amount: amountIn(args.amount, "amount") ?? debt.amount,
        currency: debt.currency,
        date: momentIn(args.date, lk, "date") ?? debt.date,
        dueDate: args.due_date === null ? null : momentIn(args.due_date, lk, "due_date", "end") ?? debt.dueDate,
        note: args.note === null ? null : text(args.note, "note", 300) ?? debt.note
      });
      return { value: { updated: debt.id }, summary: `Edited the debt with ${person?.name ?? debt.payeeName}` };
    });
  }
};
var settingsTool = {
  name: "update_settings",
  title: "Update Mula settings",
  description: "Changes the InstaPay fee rule (percent of the amount, with a minimum and maximum) or how close in time an Apple Pay entry must be to its bank message to be merged.",
  inputSchema: {
    type: "object",
    properties: {
      instapay_fee_percent: { type: "number", minimum: 0, maximum: 10 },
      instapay_fee_min: { type: "number", minimum: 0 },
      instapay_fee_max: { type: "number", minimum: 0 },
      merge_window_minutes: { type: "integer", minimum: 1, maximum: 120 }
    },
    additionalProperties: false
  },
  annotations: WRITES,
  async run(args) {
    const s = getSettings();
    const percent = args.instapay_fee_percent != null ? Number(args.instapay_fee_percent) : s.instapayFee.percent;
    if (!Number.isFinite(percent) || percent < 0 || percent > 10) throw new InputError("instapay_fee_percent must be between 0 and 10");
    const rule = {
      percent,
      min: amountIn(args.instapay_fee_min, "instapay_fee_min", { allowZero: true }) ?? s.instapayFee.min,
      max: amountIn(args.instapay_fee_max, "instapay_fee_max", { allowZero: true }) ?? s.instapayFee.max
    };
    if (rule.max < rule.min) throw new InputError("instapay_fee_max must be at least instapay_fee_min");
    const window2 = args.merge_window_minutes != null ? Math.round(Number(args.merge_window_minutes)) : s.mergeWindowMinutes;
    const feeChanged = args.instapay_fee_percent != null || args.instapay_fee_min != null || args.instapay_fee_max != null;
    return changed("update_settings", async () => {
      if (feeChanged) await setSetting("instapayFee", rule);
      if (window2 !== s.mergeWindowMinutes) await setSetting("mergeWindowMinutes", window2);
      return {
        value: { instapay_fee: { percent: rule.percent, min: major(rule.min), max: major(rule.max) }, merge_window_minutes: window2 },
        summary: `Settings: InstaPay fee ${rule.percent}% (${major(rule.min)}\u2013${major(rule.max)}), merge window ${window2} min`
      };
    });
  }
};
var undoTool = {
  name: "undo_claude_change",
  title: "Undo a change",
  description: "Reverses one of your earlier changes (ids from list_claude_changes or a tool result). Records edited again since then are left alone.",
  inputSchema: { type: "object", properties: { change_id: { type: "string" } }, required: ["change_id"], additionalProperties: false },
  annotations: DESTRUCTIVE,
  async run(args) {
    const id = text(args.change_id, "change_id", 100);
    if (!id) throw new InputError("change_id is required");
    const r = await undoChange(id);
    return ok({ undone: r.summary, records_restored: r.restored, ...r.skipped ? { left_alone: r.skipped, why: "changed again after your edit" } : {} });
  }
};
var writeTools = [...transactionTools, reviewTool, accountsTool, categoriesTool, payeesTool, plannedTool, debtsTool, settingsTool, undoTool];

// src/mcp.ts
var PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
var INSTRUCTIONS = "Mula is the user\u2019s personal budgeting app; this connector reads and changes its data directly. Start with get_overview, and use get_catalog for the exact account, category and payee names and ids. Amounts are in major units (45.5, not 4550) and dates in the user\u2019s time zone. Changes take effect immediately and reach the phone the next time Mula syncs; every change can be undone (list_claude_changes, undo_claude_change, or Automation \u203A Claude in the app). Tell the user what you changed, and confirm with them before deleting records or changing many records at once if their request was ambiguous. The data is as of the phone\u2019s last sync (phone_last_synced in get_overview).";
var TOOLS = [...readTools, ...writeTools];
var BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
var rpcResult = /* @__PURE__ */ __name((id, result) => ({ jsonrpc: "2.0", id, result }), "rpcResult");
var rpcError = /* @__PURE__ */ __name((id, code, message2) => ({ jsonrpc: "2.0", id, error: { code, message: message2 } }), "rpcError");
async function handleMcp(request, ctx, beforeTool) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }
  const messages = Array.isArray(body) ? body : [body];
  const responses = [];
  for (const message2 of messages) {
    const response = await handleMessage(message2, ctx, beforeTool);
    if (response) responses.push(response);
  }
  if (!responses.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}
__name(handleMcp, "handleMcp");
async function handleMessage(m, ctx, beforeTool) {
  if (!m || typeof m !== "object" || m.jsonrpc !== "2.0") return rpcError(null, -32600, "Invalid request");
  const isRequest = typeof m.method === "string" && m.id !== void 0 && m.id !== null;
  if (!isRequest) return null;
  const params = m.params && typeof m.params === "object" ? m.params : {};
  switch (m.method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return rpcResult(m.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "mula", title: "Mula", version: "2.0.0" },
        instructions: INSTRUCTIONS
      });
    }
    case "ping":
      return rpcResult(m.id, {});
    case "tools/list":
      return rpcResult(m.id, { tools: TOOLS.map(({ run: _run, ...t }) => t) });
    case "tools/call": {
      const tool = BY_NAME.get(String(params.name ?? ""));
      if (!tool) return rpcResult(m.id, failure(`Unknown tool: ${String(params.name)}`));
      const args = params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? params.arguments : {};
      await beforeTool();
      return rpcResult(m.id, await callTool(tool, args, ctx));
    }
    default:
      return rpcError(m.id, -32601, `Method not found: ${String(m.method)}`);
  }
}
__name(handleMessage, "handleMessage");
var failure = /* @__PURE__ */ __name((message2) => ({ content: [{ type: "text", text: message2 }], isError: true }), "failure");
async function callTool(tool, args, ctx) {
  try {
    return await tool.run(args, ctx);
  } catch (e) {
    if (e instanceof InputError || e instanceof UndoError) return failure(`${e.message} (nothing was changed)`);
    console.error("tool failed", tool.name, e);
    return failure(`Mula couldn\u2019t do that: ${e instanceof Error ? e.message : String(e)} (nothing was changed)`);
  }
}
__name(callTool, "callTool");

// src/oauth.ts
var ACCESS_TTL = 60 * 60 * 1e3;
var REFRESH_TTL = 30 * 24 * 60 * 60 * 1e3;
var CODE_TTL = 2 * 60 * 1e3;
var REQUEST_TTL = 15 * 60 * 1e3;
var MAX_CLIENTS = 50;
var MAX_FAILURES_PER_HOUR = 10;
var MAX_REGISTRATIONS_PER_HOUR = 20;
var MAX_OPEN_SIGN_INS = 30;
var SCOPE = "mula";
async function installOAuthSchema() {
  await run(`CREATE TABLE IF NOT EXISTS oauth_clients (
    id TEXT PRIMARY KEY NOT NULL, name TEXT, redirect_uris TEXT NOT NULL, created_at INTEGER NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS oauth_grants (
    hash TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, client_id TEXT NOT NULL, data TEXT, expires_at INTEGER NOT NULL)`);
  await run("CREATE TABLE IF NOT EXISTS oauth_failures (at INTEGER NOT NULL)");
}
__name(installOAuthSchema, "installOAuthSchema");
var b64url = /* @__PURE__ */ __name((bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64url");
var randomToken = /* @__PURE__ */ __name((bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes))), "randomToken");
async function sha256(text2) {
  return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text2)));
}
__name(sha256, "sha256");
async function sameSecret(given, expected, minLength = 8) {
  if (!expected || expected.length < minLength || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(given)), crypto.subtle.digest("SHA-256", enc.encode(expected))]);
  return crypto.subtle.timingSafeEqual(a, b);
}
__name(sameSecret, "sameSecret");
var json = /* @__PURE__ */ __name((body, status2 = 200, headers = {}) => new Response(JSON.stringify(body), { status: status2, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } }), "json");
var oauthError = /* @__PURE__ */ __name((error, description, status2 = 400) => json({ error, error_description: description }, status2), "oauthError");
function protectedResourceMetadata(origin) {
  return json({
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Mula"
  });
}
__name(protectedResourceMetadata, "protectedResourceMetadata");
function authorizationServerMetadata(origin) {
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [SCOPE, "offline_access"]
  });
}
__name(authorizationServerMetadata, "authorizationServerMetadata");
function unauthorized(origin, invalidToken) {
  const challenge = `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="${SCOPE}"${invalidToken ? ', error="invalid_token"' : ""}`;
  return json({ error: "unauthorized", message: "Sign in to Mula first." }, 401, { "WWW-Authenticate": challenge });
}
__name(unauthorized, "unauthorized");
var HOSTED_CALLBACKS = /* @__PURE__ */ new Set(["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"]);
function allowedRedirect(uri) {
  if (HOSTED_CALLBACKS.has(uri)) return true;
  try {
    const u = new URL(uri);
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1") && !u.username && !u.password;
  } catch {
    return false;
  }
}
__name(allowedRedirect, "allowedRedirect");
function redirectMatches(registered, uri) {
  if (registered.includes(uri)) return true;
  try {
    const u = new URL(uri);
    if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return false;
    return registered.some((r) => {
      const v = new URL(r);
      return v.protocol === u.protocol && v.hostname === u.hostname && v.pathname === u.pathname;
    });
  } catch {
    return false;
  }
}
__name(redirectMatches, "redirectMatches");
async function getClient(id) {
  const r = await first("SELECT * FROM oauth_clients WHERE id = ?", [id]);
  return r ? { id: r.id, name: r.name, redirectUris: JSON.parse(r.redirect_uris) } : null;
}
__name(getClient, "getClient");
async function register(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return oauthError("invalid_client_metadata", "Send the registration as JSON");
  }
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u) => typeof u === "string") : [];
  if (!uris.length || uris.length > 10) return oauthError("invalid_redirect_uri", "redirect_uris is required");
  const bad = uris.find((u) => !allowedRedirect(u));
  if (bad) return oauthError("invalid_redirect_uri", `This relay only signs in Claude; ${bad} is not one of Claude's callback addresses`);
  if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") {
    return oauthError("invalid_client_metadata", 'Only public clients (token_endpoint_auth_method "none") are supported');
  }
  const now = Date.now();
  const recent = (await first("SELECT COUNT(*) AS n FROM oauth_clients WHERE created_at > ?", [now - 36e5]))?.n ?? 0;
  if (recent >= MAX_REGISTRATIONS_PER_HOUR) return oauthError("temporarily_unavailable", "Too many registrations; try again in an hour", 429);
  const id = randomToken(16);
  const name = typeof body.client_name === "string" ? body.client_name.slice(0, 80) : null;
  await run("INSERT INTO oauth_clients (id, name, redirect_uris, created_at) VALUES (?, ?, ?, ?)", [id, name, JSON.stringify(uris), now]);
  await run("DELETE FROM oauth_clients WHERE id IN (SELECT id FROM oauth_clients ORDER BY created_at DESC LIMIT -1 OFFSET ?)", [MAX_CLIENTS]);
  return json(
    {
      client_id: id,
      client_id_issued_at: Math.floor(now / 1e3),
      client_name: name ?? void 0,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    },
    201
  );
}
__name(register, "register");
var escape = /* @__PURE__ */ __name((s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "escape");
function page(title, body, status2 = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><style>
:root{color-scheme:light dark;--bg:#F6F5F1;--ink:#16161A;--muted:#6B6B70;--line:#DDDBD4;--accent:#2F45D0;--danger:#C2412D}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--ink:#F2F1EC;--muted:#9A9AA0;--line:#2A2A2E;--accent:#7F90FF;--danger:#FF7A66}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,system-ui,sans-serif;padding:32px 16px}
main{max-width:420px;margin:0 auto}h1{font-size:24px;line-height:1.25;margin:0 0 12px}p{color:var(--muted);margin:0 0 16px}
ul{color:var(--muted);padding-left:20px;margin:0 0 20px}label{display:block;font-weight:600;margin:0 0 6px}
input{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink)}
.row{display:flex;gap:10px;margin-top:16px}button{flex:1;font:inherit;font-weight:600;padding:12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink)}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}.err{color:var(--danger);font-weight:600}.mark{width:44px;height:44px;border-radius:11px;background:linear-gradient(160deg,#3B56EA,#2235B4);margin-bottom:20px}
</style></head><body><main><div class="mark" aria-hidden="true"></div>${body}</main></body></html>`;
  return new Response(html, {
    status: status2,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://claude.ai https://claude.com http://localhost:* http://127.0.0.1:*; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer"
    }
  });
}
__name(page, "page");
function redirectWith(uri, params) {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: u.toString(), "Cache-Control": "no-store" } });
}
__name(redirectWith, "redirectWith");
function consentPage(requestId, client, redirectUri, error) {
  const who = client.name ? escape(client.name) : "Claude";
  const host = escape(new URL(redirectUri).host);
  return page(
    "Allow Claude to use Mula?",
    `<h1>Allow ${who} to use Mula?</h1>
<p>${who} (returning to <strong>${host}</strong>) will be able to read and change everything in your Mula cloud copy:</p>
<ul><li>transactions, accounts, categories and payees</li><li>planned payments, templates and debts</li><li>your review inbox, including bank message text</li></ul>
<p>Changes show up on your phone the next time Mula syncs, and you can undo them in Mula under Automation \u203A Claude.</p>
<form method="post" action="/authorize"><input type="hidden" name="request" value="${escape(requestId)}">
<label for="password">Relay password</label><input id="password" name="password" type="password" autocomplete="current-password" autofocus>
${error ? `<p class="err" role="alert">${escape(error)}</p>` : ""}
<div class="row"><button type="submit" name="action" value="deny">Deny</button><button class="primary" type="submit" name="action" value="allow">Allow</button></div></form>`
  );
}
__name(consentPage, "consentPage");
async function authorizePage(url, ownerPassword) {
  if (!ownerPassword || ownerPassword.length < 8) {
    return page("Relay not ready", "<h1>Set a password first</h1><p>This relay has no OWNER_PASSWORD yet (at least 8 characters). Add it as a secret and deploy again; see docs/cloud-and-claude.md in the Mula repository.</p>", 503);
  }
  const q = url.searchParams;
  const client = await getClient(q.get("client_id") ?? "");
  const redirectUri = q.get("redirect_uri") ?? "";
  if (!client || !redirectMatches(client.redirectUris, redirectUri)) {
    return page("Sign-in link not valid", "<h1>This sign-in link isn\u2019t valid</h1><p>Remove the Mula connector in Claude and add it again.</p>", 400);
  }
  const state = q.get("state");
  if (q.get("response_type") !== "code") return redirectWith(redirectUri, { error: "unsupported_response_type", state });
  const challenge = q.get("code_challenge") ?? "";
  if (!challenge || q.get("code_challenge_method") !== "S256") {
    return redirectWith(redirectUri, { error: "invalid_request", error_description: "PKCE with S256 is required", state });
  }
  const open = (await first("SELECT COUNT(*) AS n FROM oauth_grants WHERE kind = 'request' AND expires_at > ?", [Date.now()]))?.n ?? 0;
  if (open >= MAX_OPEN_SIGN_INS) return page("Too many sign-ins", "<h1>Too many sign-ins at once</h1><p>Try again in 15 minutes.</p>", 429);
  const requestId = randomToken();
  const data = { clientId: client.id, redirectUri, state, challenge, scope: SCOPE };
  await run("INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)", [
    await sha256(requestId),
    "request",
    client.id,
    JSON.stringify(data),
    Date.now() + REQUEST_TTL
  ]);
  return consentPage(requestId, client, redirectUri, null);
}
__name(authorizePage, "authorizePage");
async function recentFailures() {
  await run("DELETE FROM oauth_failures WHERE at < ?", [Date.now() - 36e5]);
  return (await first("SELECT COUNT(*) AS n FROM oauth_failures"))?.n ?? 0;
}
__name(recentFailures, "recentFailures");
async function authorizeSubmit(request, ownerPassword, origin) {
  const form = await readForm(request);
  const requestId = form.request ?? "";
  const hash = await sha256(requestId);
  const row = await first("SELECT data, expires_at FROM oauth_grants WHERE hash = ? AND kind = 'request'", [hash]);
  if (!row || row.expires_at < Date.now()) {
    return page("Sign-in expired", "<h1>This sign-in expired</h1><p>Go back to Claude and connect Mula again.</p>", 400);
  }
  const req = JSON.parse(row.data);
  const client = await getClient(req.clientId);
  if (!client) return page("Sign-in link not valid", "<h1>This sign-in link isn\u2019t valid</h1><p>Remove the Mula connector in Claude and add it again.</p>", 400);
  if (form.action !== "allow") {
    await run("DELETE FROM oauth_grants WHERE hash = ?", [hash]);
    return redirectWith(req.redirectUri, { error: "access_denied", state: req.state, iss: origin });
  }
  if (await recentFailures() >= MAX_FAILURES_PER_HOUR) {
    return consentPage(requestId, client, req.redirectUri, "Too many wrong passwords. Try again in an hour.");
  }
  if (!await sameSecret(form.password ?? "", ownerPassword)) {
    await run("INSERT INTO oauth_failures (at) VALUES (?)", [Date.now()]);
    return consentPage(requestId, client, req.redirectUri, "That password isn\u2019t right.");
  }
  await run("DELETE FROM oauth_grants WHERE hash = ?", [hash]);
  const code = randomToken();
  await run("INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)", [
    await sha256(code),
    "code",
    client.id,
    JSON.stringify(req),
    Date.now() + CODE_TTL
  ]);
  return redirectWith(req.redirectUri, { code, state: req.state, iss: origin });
}
__name(authorizeSubmit, "authorizeSubmit");
async function issueTokens(clientId, family) {
  const now = Date.now();
  await run("DELETE FROM oauth_grants WHERE expires_at < ?", [now]);
  const access = randomToken();
  const refresh = randomToken();
  await run("INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)", [await sha256(access), "access", clientId, JSON.stringify({ family }), now + ACCESS_TTL]);
  await run("INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)", [await sha256(refresh), "refresh", clientId, JSON.stringify({ family }), now + REFRESH_TTL]);
  return json({ access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL / 1e3, refresh_token: refresh, scope: SCOPE });
}
__name(issueTokens, "issueTokens");
async function readForm(request) {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? "")]));
  }
  const text2 = await request.text();
  return Object.fromEntries(new URLSearchParams(text2));
}
__name(readForm, "readForm");
async function token(request) {
  const p = await readForm(request);
  const client = p.client_id ? await getClient(p.client_id) : null;
  if (!client) return oauthError("invalid_client", "Unknown client; register again", 401);
  if (p.grant_type === "authorization_code") {
    const hash = await sha256(p.code ?? "");
    const row = await first("SELECT client_id, data, expires_at FROM oauth_grants WHERE hash = ? AND kind = 'code'", [hash]);
    if (row) await run("DELETE FROM oauth_grants WHERE hash = ?", [hash]);
    if (!row || row.expires_at < Date.now() || row.client_id !== client.id) return oauthError("invalid_grant", "The code is invalid or expired");
    const req = JSON.parse(row.data);
    if (p.redirect_uri && p.redirect_uri !== req.redirectUri) return oauthError("invalid_grant", "redirect_uri does not match");
    if (!p.code_verifier || await sha256(p.code_verifier) !== req.challenge) return oauthError("invalid_grant", "PKCE verification failed");
    return issueTokens(client.id, randomToken(12));
  }
  if (p.grant_type === "refresh_token") {
    const hash = await sha256(p.refresh_token ?? "");
    const row = await first("SELECT client_id, data, expires_at FROM oauth_grants WHERE hash = ? AND kind = 'refresh'", [hash]);
    if (!row || row.expires_at < Date.now() || row.client_id !== client.id) return oauthError("invalid_grant", "The refresh token is invalid or expired");
    await run("DELETE FROM oauth_grants WHERE hash = ?", [hash]);
    const { family } = JSON.parse(row.data ?? "{}");
    return issueTokens(client.id, family ?? randomToken(12));
  }
  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}
__name(token, "token");
async function validAccessToken(authorization) {
  const raw = (authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!raw) return false;
  const row = await first("SELECT expires_at FROM oauth_grants WHERE hash = ? AND kind = 'access'", [await sha256(raw)]);
  return Boolean(row && row.expires_at > Date.now());
}
__name(validAccessToken, "validAccessToken");
async function revokeAll() {
  const n = (await first("SELECT COUNT(*) AS n FROM oauth_grants WHERE kind IN ('access', 'refresh')"))?.n ?? 0;
  await run("DELETE FROM oauth_grants");
  await run("DELETE FROM oauth_clients");
  await run("DELETE FROM oauth_failures");
  return n;
}
__name(revokeAll, "revokeAll");
async function connectedClients() {
  const rows = await all("SELECT COUNT(DISTINCT client_id) AS n FROM oauth_grants WHERE kind = 'refresh' AND expires_at > ?", [Date.now()]);
  return rows[0]?.n ?? 0;
}
__name(connectedClients, "connectedClients");

// src/vault.ts
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate",
  "Access-Control-Max-Age": "86400"
};
var json2 = /* @__PURE__ */ __name((body, status2 = 200) => new Response(JSON.stringify(body), { status: status2, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }), "json");
var Vault = class extends DurableObject {
  static {
    __name(this, "Vault");
  }
  /** Requests run one at a time, so a sync never interleaves with a tool call. */
  queue = Promise.resolve();
  constructor(ctx, env) {
    super(ctx, env);
    bindStorage(ctx.storage);
    void ctx.blockConcurrencyWhile(async () => {
      await getDb();
      await installServerSchema();
      await installOAuthSchema();
      await loadSettings();
    });
  }
  serial(fn) {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => void 0);
    return next;
  }
  async fetch(request) {
    const response = await this.serial(() => this.route(request)).catch((e) => {
      console.error("request failed", e);
      return json2({ error: "internal", message: "The relay hit an error" }, 500);
    });
    const url = new URL(request.url);
    if (url.pathname.startsWith("/sync/") || url.pathname.startsWith("/.well-known/") || url.pathname.startsWith("/oauth/") || url.pathname === "/mcp") {
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  }
  /** Read-only SQL for Claude's run_query: anything that writes is rolled back. */
  readOnlyQuery = /* @__PURE__ */ __name((query, params) => {
    let rows = [];
    try {
      this.ctx.storage.transactionSync(() => {
        const cursor = this.ctx.storage.sql.exec(query, ...params);
        rows = cursor.toArray();
        if (cursor.rowsWritten > 0) throw new ReadOnlyViolation();
      });
    } catch (e) {
      if (e instanceof ReadOnlyViolation) throw new InputError("run_query is read-only; that statement tried to write (it was rolled back)");
      throw new InputError(`SQL error: ${e instanceof Error ? e.message : String(e)}`);
    }
    return rows;
  }, "readOnlyQuery");
  async route(request) {
    const url = new URL(request.url);
    const origin = url.origin;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method;
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (path === "/" || path === "/health") return json2({ ok: true, service: "mula-relay" });
    if (path === "/.well-known/oauth-protected-resource" || path === "/.well-known/oauth-protected-resource/mcp") return protectedResourceMetadata(origin);
    if (path === "/.well-known/oauth-authorization-server" || path === "/.well-known/openid-configuration") return authorizationServerMetadata(origin);
    if (path === "/oauth/register" && method === "POST") return register(request);
    if (path === "/authorize" && method === "GET") return authorizePage(url, this.env.OWNER_PASSWORD);
    if (path === "/authorize" && method === "POST") return authorizeSubmit(request, this.env.OWNER_PASSWORD, origin);
    if (path === "/oauth/token" && method === "POST") return token(request);
    if (path === "/mcp") {
      const auth = request.headers.get("authorization");
      if (!await validAccessToken(auth)) return unauthorized(origin, Boolean(auth));
      if (method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
      return handleMcp(request, { query: this.readOnlyQuery }, () => loadSettings());
    }
    if (path.startsWith("/sync/")) {
      const token2 = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!await sameSecret(token2, this.env.APP_TOKEN, 16)) return json2({ error: "unauthorized", message: "Wrong app token" }, 401);
      try {
        return await this.syncRoute(path, method, request, url);
      } catch (e) {
        if (e instanceof SyncError) return json2({ error: e.code, message: e.message }, e.status);
        if (e instanceof UndoError) return json2({ error: "undo_failed", message: e.message }, 400);
        throw e;
      }
    }
    return new Response("Not found", { status: 404 });
  }
  async syncRoute(path, method, request, url) {
    const body = /* @__PURE__ */ __name(async () => await request.json().catch(() => null), "body");
    if (path === "/sync/status" && method === "GET") return json2({ ...await status(), claudeConnected: await connectedClients() > 0 });
    if (path === "/sync/push" && method === "POST") return json2(await push(await body()));
    if (path === "/sync/pull" && method === "GET") {
      const q = url.searchParams;
      return json2(await pull(Number(q.get("since") ?? 0), q.get("device") ?? "", Number(q.get("limit") ?? 500)));
    }
    if (path === "/sync/reset" && method === "POST") return json2(await reset());
    if (path === "/sync/activity" && method === "GET") return json2({ activity: await listActivity(Number(url.searchParams.get("limit") ?? 50)) });
    if (path === "/sync/undo" && method === "POST") {
      const id = (await body())?.id;
      if (typeof id !== "string") throw new SyncError(400, "bad_request", "id is required");
      return json2(await undoChange(id));
    }
    if (path === "/sync/sign-out-claude" && method === "POST") return json2({ revoked: await revokeAll() });
    return json2({ error: "not_found", message: "Unknown sync endpoint" }, 404);
  }
};
var ReadOnlyViolation = class extends Error {
  static {
    __name(this, "ReadOnlyViolation");
  }
};

// src/index.ts
var index_default = {
  async fetch(request, env) {
    const body = request.method === "GET" || request.method === "HEAD" ? void 0 : await request.arrayBuffer();
    const forwarded = new Request(request.url, { method: request.method, headers: request.headers, body, redirect: "manual" });
    return env.VAULT.get(env.VAULT.idFromName("mula")).fetch(forwarded);
  }
};
export {
  Vault,
  index_default as default
};
/*! Bundled license information:

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=index.js.map
