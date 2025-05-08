import {
  Component,
  Deferred,
  ErrorFactory,
  FirebaseApp,
  FirebaseApps,
  FirebaseError,
  Logger,
  VERSION,
  _getProvider,
  _isFirebaseServerApp,
  _registerComponent,
  base64,
  getApp,
  getGlobal,
  getModularInstance,
  isIndexedDBAvailable,
  registerVersion,
  ɵAngularFireSchedulers,
  ɵgetAllInstancesOf,
  ɵgetDefaultInstanceOf,
  ɵzoneWrap
} from "./chunk-QAN5GSKL.js";
import "./chunk-VMFTUNLC.js";
import {
  InjectionToken,
  Injector,
  NgModule,
  NgZone,
  Optional,
  PLATFORM_ID,
  __async,
  __asyncGenerator,
  __await,
  concatMap,
  distinct,
  from,
  makeEnvironmentProviders,
  setClassMetadata,
  timer,
  ɵɵdefineInjector,
  ɵɵdefineNgModule
} from "./chunk-55PARKLV.js";

// node_modules/@firebase/app-check/dist/esm/index.esm2017.js
var APP_CHECK_STATES = /* @__PURE__ */ new Map();
var DEFAULT_STATE = {
  activated: false,
  tokenObservers: []
};
var DEBUG_STATE = {
  initialized: false,
  enabled: false
};
function getStateReference(app) {
  return APP_CHECK_STATES.get(app) || Object.assign({}, DEFAULT_STATE);
}
function setInitialState(app, state) {
  APP_CHECK_STATES.set(app, state);
  return APP_CHECK_STATES.get(app);
}
function getDebugState() {
  return DEBUG_STATE;
}
var BASE_ENDPOINT = "https://content-firebaseappcheck.googleapis.com/v1";
var EXCHANGE_DEBUG_TOKEN_METHOD = "exchangeDebugToken";
var TOKEN_REFRESH_TIME = {
  /**
   * The offset time before token natural expiration to run the refresh.
   * This is currently 5 minutes.
   */
  OFFSET_DURATION: 5 * 60 * 1e3,
  /**
   * This is the first retrial wait after an error. This is currently
   * 30 seconds.
   */
  RETRIAL_MIN_WAIT: 30 * 1e3,
  /**
   * This is the maximum retrial wait, currently 16 minutes.
   */
  RETRIAL_MAX_WAIT: 16 * 60 * 1e3
};
var ONE_DAY = 24 * 60 * 60 * 1e3;
var Refresher = class {
  constructor(operation, retryPolicy, getWaitDuration, lowerBound, upperBound) {
    this.operation = operation;
    this.retryPolicy = retryPolicy;
    this.getWaitDuration = getWaitDuration;
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
    this.pending = null;
    this.nextErrorWaitInterval = lowerBound;
    if (lowerBound > upperBound) {
      throw new Error("Proactive refresh lower bound greater than upper bound!");
    }
  }
  start() {
    this.nextErrorWaitInterval = this.lowerBound;
    this.process(true).catch(() => {
    });
  }
  stop() {
    if (this.pending) {
      this.pending.reject("cancelled");
      this.pending = null;
    }
  }
  isRunning() {
    return !!this.pending;
  }
  process(hasSucceeded) {
    return __async(this, null, function* () {
      this.stop();
      try {
        this.pending = new Deferred();
        this.pending.promise.catch((_e) => {
        });
        yield sleep(this.getNextRun(hasSucceeded));
        this.pending.resolve();
        yield this.pending.promise;
        this.pending = new Deferred();
        this.pending.promise.catch((_e) => {
        });
        yield this.operation();
        this.pending.resolve();
        yield this.pending.promise;
        this.process(true).catch(() => {
        });
      } catch (error) {
        if (this.retryPolicy(error)) {
          this.process(false).catch(() => {
          });
        } else {
          this.stop();
        }
      }
    });
  }
  getNextRun(hasSucceeded) {
    if (hasSucceeded) {
      this.nextErrorWaitInterval = this.lowerBound;
      return this.getWaitDuration();
    } else {
      const currentErrorWaitInterval = this.nextErrorWaitInterval;
      this.nextErrorWaitInterval *= 2;
      if (this.nextErrorWaitInterval > this.upperBound) {
        this.nextErrorWaitInterval = this.upperBound;
      }
      return currentErrorWaitInterval;
    }
  }
};
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
var ERRORS = {
  [
    "already-initialized"
    /* AppCheckError.ALREADY_INITIALIZED */
  ]: "You have already called initializeAppCheck() for FirebaseApp {$appName} with different options. To avoid this error, call initializeAppCheck() with the same options as when it was originally called. This will return the already initialized instance.",
  [
    "use-before-activation"
    /* AppCheckError.USE_BEFORE_ACTIVATION */
  ]: "App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. Call initializeAppCheck() before instantiating other Firebase services.",
  [
    "fetch-network-error"
    /* AppCheckError.FETCH_NETWORK_ERROR */
  ]: "Fetch failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.",
  [
    "fetch-parse-error"
    /* AppCheckError.FETCH_PARSE_ERROR */
  ]: "Fetch client could not parse response. Original error: {$originalErrorMessage}.",
  [
    "fetch-status-error"
    /* AppCheckError.FETCH_STATUS_ERROR */
  ]: "Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.",
  [
    "storage-open"
    /* AppCheckError.STORAGE_OPEN */
  ]: "Error thrown when opening storage. Original error: {$originalErrorMessage}.",
  [
    "storage-get"
    /* AppCheckError.STORAGE_GET */
  ]: "Error thrown when reading from storage. Original error: {$originalErrorMessage}.",
  [
    "storage-set"
    /* AppCheckError.STORAGE_WRITE */
  ]: "Error thrown when writing to storage. Original error: {$originalErrorMessage}.",
  [
    "recaptcha-error"
    /* AppCheckError.RECAPTCHA_ERROR */
  ]: "ReCAPTCHA error.",
  [
    "throttled"
    /* AppCheckError.THROTTLED */
  ]: `Requests throttled due to {$httpStatus} error. Attempts allowed again after {$time}`
};
var ERROR_FACTORY = new ErrorFactory("appCheck", "AppCheck", ERRORS);
function ensureActivated(app) {
  if (!getStateReference(app).activated) {
    throw ERROR_FACTORY.create("use-before-activation", {
      appName: app.name
    });
  }
}
function exchangeToken(_0, _1) {
  return __async(this, arguments, function* ({
    url,
    body
  }, heartbeatServiceProvider) {
    const headers = {
      "Content-Type": "application/json"
    };
    const heartbeatService = heartbeatServiceProvider.getImmediate({
      optional: true
    });
    if (heartbeatService) {
      const heartbeatsHeader = yield heartbeatService.getHeartbeatsHeader();
      if (heartbeatsHeader) {
        headers["X-Firebase-Client"] = heartbeatsHeader;
      }
    }
    const options = {
      method: "POST",
      body: JSON.stringify(body),
      headers
    };
    let response;
    try {
      response = yield fetch(url, options);
    } catch (originalError) {
      throw ERROR_FACTORY.create("fetch-network-error", {
        originalErrorMessage: originalError === null || originalError === void 0 ? void 0 : originalError.message
      });
    }
    if (response.status !== 200) {
      throw ERROR_FACTORY.create("fetch-status-error", {
        httpStatus: response.status
      });
    }
    let responseBody;
    try {
      responseBody = yield response.json();
    } catch (originalError) {
      throw ERROR_FACTORY.create("fetch-parse-error", {
        originalErrorMessage: originalError === null || originalError === void 0 ? void 0 : originalError.message
      });
    }
    const match = responseBody.ttl.match(/^([\d.]+)(s)$/);
    if (!match || !match[2] || isNaN(Number(match[1]))) {
      throw ERROR_FACTORY.create("fetch-parse-error", {
        originalErrorMessage: `ttl field (timeToLive) is not in standard Protobuf Duration format: ${responseBody.ttl}`
      });
    }
    const timeToLiveAsNumber = Number(match[1]) * 1e3;
    const now = Date.now();
    return {
      token: responseBody.token,
      expireTimeMillis: now + timeToLiveAsNumber,
      issuedAtTimeMillis: now
    };
  });
}
function getExchangeDebugTokenRequest(app, debugToken) {
  const {
    projectId,
    appId,
    apiKey
  } = app.options;
  return {
    url: `${BASE_ENDPOINT}/projects/${projectId}/apps/${appId}:${EXCHANGE_DEBUG_TOKEN_METHOD}?key=${apiKey}`,
    body: {
      // eslint-disable-next-line
      debug_token: debugToken
    }
  };
}
var DB_NAME = "firebase-app-check-database";
var DB_VERSION = 1;
var STORE_NAME = "firebase-app-check-store";
var DEBUG_TOKEN_KEY = "debug-token";
var dbPromise = null;
function getDBPromise() {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        var _a;
        reject(ERROR_FACTORY.create("storage-open", {
          originalErrorMessage: (_a = event.target.error) === null || _a === void 0 ? void 0 : _a.message
        }));
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        switch (event.oldVersion) {
          case 0:
            db.createObjectStore(STORE_NAME, {
              keyPath: "compositeKey"
            });
        }
      };
    } catch (e) {
      reject(ERROR_FACTORY.create("storage-open", {
        originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
      }));
    }
  });
  return dbPromise;
}
function readTokenFromIndexedDB(app) {
  return read(computeKey(app));
}
function writeTokenToIndexedDB(app, token) {
  return write(computeKey(app), token);
}
function writeDebugTokenToIndexedDB(token) {
  return write(DEBUG_TOKEN_KEY, token);
}
function readDebugTokenFromIndexedDB() {
  return read(DEBUG_TOKEN_KEY);
}
function write(key, value) {
  return __async(this, null, function* () {
    const db = yield getDBPromise();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      compositeKey: key,
      value
    });
    return new Promise((resolve, reject) => {
      request.onsuccess = (_event) => {
        resolve();
      };
      transaction.onerror = (event) => {
        var _a;
        reject(ERROR_FACTORY.create("storage-set", {
          originalErrorMessage: (_a = event.target.error) === null || _a === void 0 ? void 0 : _a.message
        }));
      };
    });
  });
}
function read(key) {
  return __async(this, null, function* () {
    const db = yield getDBPromise();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result) {
          resolve(result.value);
        } else {
          resolve(void 0);
        }
      };
      transaction.onerror = (event) => {
        var _a;
        reject(ERROR_FACTORY.create("storage-get", {
          originalErrorMessage: (_a = event.target.error) === null || _a === void 0 ? void 0 : _a.message
        }));
      };
    });
  });
}
function computeKey(app) {
  return `${app.options.appId}-${app.name}`;
}
var logger = new Logger("@firebase/app-check");
function readTokenFromStorage(app) {
  return __async(this, null, function* () {
    if (isIndexedDBAvailable()) {
      let token = void 0;
      try {
        token = yield readTokenFromIndexedDB(app);
      } catch (e) {
        logger.warn(`Failed to read token from IndexedDB. Error: ${e}`);
      }
      return token;
    }
    return void 0;
  });
}
function writeTokenToStorage(app, token) {
  if (isIndexedDBAvailable()) {
    return writeTokenToIndexedDB(app, token).catch((e) => {
      logger.warn(`Failed to write token to IndexedDB. Error: ${e}`);
    });
  }
  return Promise.resolve();
}
function readOrCreateDebugTokenFromStorage() {
  return __async(this, null, function* () {
    let existingDebugToken = void 0;
    try {
      existingDebugToken = yield readDebugTokenFromIndexedDB();
    } catch (_e) {
    }
    if (!existingDebugToken) {
      const newToken = crypto.randomUUID();
      writeDebugTokenToIndexedDB(newToken).catch((e) => logger.warn(`Failed to persist debug token to IndexedDB. Error: ${e}`));
      return newToken;
    } else {
      return existingDebugToken;
    }
  });
}
function isDebugMode() {
  const debugState = getDebugState();
  return debugState.enabled;
}
function getDebugToken() {
  return __async(this, null, function* () {
    const state = getDebugState();
    if (state.enabled && state.token) {
      return state.token.promise;
    } else {
      throw Error(`
            Can't get debug token in production mode.
        `);
    }
  });
}
function initializeDebugMode() {
  const globals = getGlobal();
  const debugState = getDebugState();
  debugState.initialized = true;
  if (typeof globals.FIREBASE_APPCHECK_DEBUG_TOKEN !== "string" && globals.FIREBASE_APPCHECK_DEBUG_TOKEN !== true) {
    return;
  }
  debugState.enabled = true;
  const deferredToken = new Deferred();
  debugState.token = deferredToken;
  if (typeof globals.FIREBASE_APPCHECK_DEBUG_TOKEN === "string") {
    deferredToken.resolve(globals.FIREBASE_APPCHECK_DEBUG_TOKEN);
  } else {
    deferredToken.resolve(readOrCreateDebugTokenFromStorage());
  }
}
var defaultTokenErrorData = {
  error: "UNKNOWN_ERROR"
};
function formatDummyToken(tokenErrorData) {
  return base64.encodeString(
    JSON.stringify(tokenErrorData),
    /* webSafe= */
    false
  );
}
function getToken$2(appCheck, forceRefresh = false) {
  return __async(this, null, function* () {
    const app = appCheck.app;
    ensureActivated(app);
    const state = getStateReference(app);
    let token = state.token;
    let error = void 0;
    if (token && !isValid(token)) {
      state.token = void 0;
      token = void 0;
    }
    if (!token) {
      const cachedToken = yield state.cachedTokenPromise;
      if (cachedToken) {
        if (isValid(cachedToken)) {
          token = cachedToken;
        } else {
          yield writeTokenToStorage(app, void 0);
        }
      }
    }
    if (!forceRefresh && token && isValid(token)) {
      return {
        token: token.token
      };
    }
    let shouldCallListeners = false;
    if (isDebugMode()) {
      if (!state.exchangeTokenPromise) {
        state.exchangeTokenPromise = exchangeToken(getExchangeDebugTokenRequest(app, yield getDebugToken()), appCheck.heartbeatServiceProvider).finally(() => {
          state.exchangeTokenPromise = void 0;
        });
        shouldCallListeners = true;
      }
      const tokenFromDebugExchange = yield state.exchangeTokenPromise;
      yield writeTokenToStorage(app, tokenFromDebugExchange);
      state.token = tokenFromDebugExchange;
      return {
        token: tokenFromDebugExchange.token
      };
    }
    try {
      if (!state.exchangeTokenPromise) {
        state.exchangeTokenPromise = state.provider.getToken().finally(() => {
          state.exchangeTokenPromise = void 0;
        });
        shouldCallListeners = true;
      }
      token = yield getStateReference(app).exchangeTokenPromise;
    } catch (e) {
      if (e.code === `appCheck/${"throttled"}`) {
        logger.warn(e.message);
      } else {
        logger.error(e);
      }
      error = e;
    }
    let interopTokenResult;
    if (!token) {
      interopTokenResult = makeDummyTokenResult(error);
    } else if (error) {
      if (isValid(token)) {
        interopTokenResult = {
          token: token.token,
          internalError: error
        };
      } else {
        interopTokenResult = makeDummyTokenResult(error);
      }
    } else {
      interopTokenResult = {
        token: token.token
      };
      state.token = token;
      yield writeTokenToStorage(app, token);
    }
    if (shouldCallListeners) {
      notifyTokenListeners(app, interopTokenResult);
    }
    return interopTokenResult;
  });
}
function getLimitedUseToken$1(appCheck) {
  return __async(this, null, function* () {
    const app = appCheck.app;
    ensureActivated(app);
    const {
      provider
    } = getStateReference(app);
    if (isDebugMode()) {
      const debugToken = yield getDebugToken();
      const {
        token
      } = yield exchangeToken(getExchangeDebugTokenRequest(app, debugToken), appCheck.heartbeatServiceProvider);
      return {
        token
      };
    } else {
      const {
        token
      } = yield provider.getToken();
      return {
        token
      };
    }
  });
}
function addTokenListener(appCheck, type, listener, onError) {
  const {
    app
  } = appCheck;
  const state = getStateReference(app);
  const tokenObserver = {
    next: listener,
    error: onError,
    type
  };
  state.tokenObservers = [...state.tokenObservers, tokenObserver];
  if (state.token && isValid(state.token)) {
    const validToken = state.token;
    Promise.resolve().then(() => {
      listener({
        token: validToken.token
      });
      initTokenRefresher(appCheck);
    }).catch(() => {
    });
  }
  void state.cachedTokenPromise.then(() => initTokenRefresher(appCheck));
}
function removeTokenListener(app, listener) {
  const state = getStateReference(app);
  const newObservers = state.tokenObservers.filter((tokenObserver) => tokenObserver.next !== listener);
  if (newObservers.length === 0 && state.tokenRefresher && state.tokenRefresher.isRunning()) {
    state.tokenRefresher.stop();
  }
  state.tokenObservers = newObservers;
}
function initTokenRefresher(appCheck) {
  const {
    app
  } = appCheck;
  const state = getStateReference(app);
  let refresher = state.tokenRefresher;
  if (!refresher) {
    refresher = createTokenRefresher(appCheck);
    state.tokenRefresher = refresher;
  }
  if (!refresher.isRunning() && state.isTokenAutoRefreshEnabled) {
    refresher.start();
  }
}
function createTokenRefresher(appCheck) {
  const {
    app
  } = appCheck;
  return new Refresher(
    // Keep in mind when this fails for any reason other than the ones
    // for which we should retry, it will effectively stop the proactive refresh.
    () => __async(this, null, function* () {
      const state = getStateReference(app);
      let result;
      if (!state.token) {
        result = yield getToken$2(appCheck);
      } else {
        result = yield getToken$2(appCheck, true);
      }
      if (result.error) {
        throw result.error;
      }
      if (result.internalError) {
        throw result.internalError;
      }
    }),
    () => {
      return true;
    },
    () => {
      const state = getStateReference(app);
      if (state.token) {
        let nextRefreshTimeMillis = state.token.issuedAtTimeMillis + (state.token.expireTimeMillis - state.token.issuedAtTimeMillis) * 0.5 + 5 * 60 * 1e3;
        const latestAllowableRefresh = state.token.expireTimeMillis - 5 * 60 * 1e3;
        nextRefreshTimeMillis = Math.min(nextRefreshTimeMillis, latestAllowableRefresh);
        return Math.max(0, nextRefreshTimeMillis - Date.now());
      } else {
        return 0;
      }
    },
    TOKEN_REFRESH_TIME.RETRIAL_MIN_WAIT,
    TOKEN_REFRESH_TIME.RETRIAL_MAX_WAIT
  );
}
function notifyTokenListeners(app, token) {
  const observers = getStateReference(app).tokenObservers;
  for (const observer of observers) {
    try {
      if (observer.type === "EXTERNAL" && token.error != null) {
        observer.error(token.error);
      } else {
        observer.next(token);
      }
    } catch (e) {
    }
  }
}
function isValid(token) {
  return token.expireTimeMillis - Date.now() > 0;
}
function makeDummyTokenResult(error) {
  return {
    token: formatDummyToken(defaultTokenErrorData),
    error
  };
}
var AppCheckService = class {
  constructor(app, heartbeatServiceProvider) {
    this.app = app;
    this.heartbeatServiceProvider = heartbeatServiceProvider;
  }
  _delete() {
    const {
      tokenObservers
    } = getStateReference(this.app);
    for (const tokenObserver of tokenObservers) {
      removeTokenListener(this.app, tokenObserver.next);
    }
    return Promise.resolve();
  }
};
function factory(app, heartbeatServiceProvider) {
  return new AppCheckService(app, heartbeatServiceProvider);
}
function internalFactory(appCheck) {
  return {
    getToken: (forceRefresh) => getToken$2(appCheck, forceRefresh),
    getLimitedUseToken: () => getLimitedUseToken$1(appCheck),
    addTokenListener: (listener) => addTokenListener(appCheck, "INTERNAL", listener),
    removeTokenListener: (listener) => removeTokenListener(appCheck.app, listener)
  };
}
var name = "@firebase/app-check";
var version = "0.8.11";
function initializeAppCheck(app = getApp(), options) {
  app = getModularInstance(app);
  const provider = _getProvider(app, "app-check");
  if (!getDebugState().initialized) {
    initializeDebugMode();
  }
  if (isDebugMode()) {
    void getDebugToken().then((token) => (
      // Not using logger because I don't think we ever want this accidentally hidden.
      console.log(`App Check debug token: ${token}. You will need to add it to your app's App Check settings in the Firebase console for it to work.`)
    ));
  }
  if (provider.isInitialized()) {
    const existingInstance = provider.getImmediate();
    const initialOptions = provider.getOptions();
    if (initialOptions.isTokenAutoRefreshEnabled === options.isTokenAutoRefreshEnabled && initialOptions.provider.isEqual(options.provider)) {
      return existingInstance;
    } else {
      throw ERROR_FACTORY.create("already-initialized", {
        appName: app.name
      });
    }
  }
  const appCheck = provider.initialize({
    options
  });
  _activate(app, options.provider, options.isTokenAutoRefreshEnabled);
  if (getStateReference(app).isTokenAutoRefreshEnabled) {
    addTokenListener(appCheck, "INTERNAL", () => {
    });
  }
  return appCheck;
}
function _activate(app, provider, isTokenAutoRefreshEnabled) {
  const state = setInitialState(app, Object.assign({}, DEFAULT_STATE));
  state.activated = true;
  state.provider = provider;
  state.cachedTokenPromise = readTokenFromStorage(app).then((cachedToken) => {
    if (cachedToken && isValid(cachedToken)) {
      state.token = cachedToken;
      notifyTokenListeners(app, {
        token: cachedToken.token
      });
    }
    return cachedToken;
  });
  state.isTokenAutoRefreshEnabled = isTokenAutoRefreshEnabled === void 0 ? app.automaticDataCollectionEnabled : isTokenAutoRefreshEnabled;
  state.provider.initialize(app);
}
function setTokenAutoRefreshEnabled(appCheckInstance, isTokenAutoRefreshEnabled) {
  const app = appCheckInstance.app;
  const state = getStateReference(app);
  if (state.tokenRefresher) {
    if (isTokenAutoRefreshEnabled === true) {
      state.tokenRefresher.start();
    } else {
      state.tokenRefresher.stop();
    }
  }
  state.isTokenAutoRefreshEnabled = isTokenAutoRefreshEnabled;
}
function getToken(appCheckInstance, forceRefresh) {
  return __async(this, null, function* () {
    const result = yield getToken$2(appCheckInstance, forceRefresh);
    if (result.error) {
      throw result.error;
    }
    return {
      token: result.token
    };
  });
}
function getLimitedUseToken(appCheckInstance) {
  return getLimitedUseToken$1(appCheckInstance);
}
function onTokenChanged(appCheckInstance, onNextOrObserver, onError, onCompletion) {
  let nextFn = () => {
  };
  let errorFn = () => {
  };
  if (onNextOrObserver.next != null) {
    nextFn = onNextOrObserver.next.bind(onNextOrObserver);
  } else {
    nextFn = onNextOrObserver;
  }
  if (onNextOrObserver.error != null) {
    errorFn = onNextOrObserver.error.bind(onNextOrObserver);
  } else if (onError) {
    errorFn = onError;
  }
  addTokenListener(appCheckInstance, "EXTERNAL", nextFn, errorFn);
  return () => removeTokenListener(appCheckInstance.app, nextFn);
}
var APP_CHECK_NAME = "app-check";
var APP_CHECK_NAME_INTERNAL = "app-check-internal";
function registerAppCheck() {
  _registerComponent(new Component(
    APP_CHECK_NAME,
    (container) => {
      const app = container.getProvider("app").getImmediate();
      const heartbeatServiceProvider = container.getProvider("heartbeat");
      return factory(app, heartbeatServiceProvider);
    },
    "PUBLIC"
    /* ComponentType.PUBLIC */
  ).setInstantiationMode(
    "EXPLICIT"
    /* InstantiationMode.EXPLICIT */
  ).setInstanceCreatedCallback((container, _identifier, _appcheckService) => {
    container.getProvider(APP_CHECK_NAME_INTERNAL).initialize();
  }));
  _registerComponent(new Component(
    APP_CHECK_NAME_INTERNAL,
    (container) => {
      const appCheck = container.getProvider("app-check").getImmediate();
      return internalFactory(appCheck);
    },
    "PUBLIC"
    /* ComponentType.PUBLIC */
  ).setInstantiationMode(
    "EXPLICIT"
    /* InstantiationMode.EXPLICIT */
  ));
  registerVersion(name, version);
}
registerAppCheck();

// node_modules/@angular/fire/fesm2022/angular-fire-app-check.mjs
var APP_CHECK_PROVIDER_NAME = "app-check";
var AppCheck = class {
  constructor(appCheck) {
    return appCheck;
  }
};
var AppCheckInstances = class {
  constructor() {
    return ɵgetAllInstancesOf(APP_CHECK_PROVIDER_NAME);
  }
};
var appCheckInstance$ = timer(0, 300).pipe(concatMap(() => from(ɵgetAllInstancesOf(APP_CHECK_PROVIDER_NAME))), distinct());
var PROVIDED_APP_CHECK_INSTANCES = new InjectionToken("angularfire2.app-check-instances");
function defaultAppCheckInstanceFactory(provided, defaultApp) {
  const defaultAppCheck = ɵgetDefaultInstanceOf(APP_CHECK_PROVIDER_NAME, provided, defaultApp);
  return defaultAppCheck && new AppCheck(defaultAppCheck);
}
var LOCALHOSTS = ["localhost", "0.0.0.0", "127.0.0.1"];
var isLocalhost = typeof window !== "undefined" && LOCALHOSTS.includes(window.location.hostname);
var APP_CHECK_INSTANCES_PROVIDER = {
  provide: AppCheckInstances,
  deps: [[new Optional(), PROVIDED_APP_CHECK_INSTANCES]]
};
var DEFAULT_APP_CHECK_INSTANCE_PROVIDER = {
  provide: AppCheck,
  useFactory: defaultAppCheckInstanceFactory,
  deps: [[new Optional(), PROVIDED_APP_CHECK_INSTANCES], FirebaseApp, PLATFORM_ID]
};
var AppCheckModule = class _AppCheckModule {
  constructor() {
    registerVersion("angularfire", VERSION.full, "app-check");
  }
  static ɵfac = function AppCheckModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AppCheckModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _AppCheckModule
  });
  static ɵinj = ɵɵdefineInjector({
    providers: [DEFAULT_APP_CHECK_INSTANCE_PROVIDER, APP_CHECK_INSTANCES_PROVIDER]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AppCheckModule, [{
    type: NgModule,
    args: [{
      providers: [DEFAULT_APP_CHECK_INSTANCE_PROVIDER, APP_CHECK_INSTANCES_PROVIDER]
    }]
  }], () => [], null);
})();
var getLimitedUseToken2 = ɵzoneWrap(getLimitedUseToken, true, 2);
var getToken2 = ɵzoneWrap(getToken, true);
var initializeAppCheck2 = ɵzoneWrap(initializeAppCheck, true);
var onTokenChanged2 = ɵzoneWrap(onTokenChanged, true);
var setTokenAutoRefreshEnabled2 = ɵzoneWrap(setTokenAutoRefreshEnabled, true);

// node_modules/@firebase/vertexai/dist/esm/index.esm2017.js
var name2 = "@firebase/vertexai";
var version2 = "1.0.4";
var VERTEX_TYPE = "vertexAI";
var DEFAULT_LOCATION = "us-central1";
var DEFAULT_BASE_URL = "https://firebasevertexai.googleapis.com";
var DEFAULT_API_VERSION = "v1beta";
var PACKAGE_VERSION = version2;
var LANGUAGE_TAG = "gl-js";
var DEFAULT_FETCH_TIMEOUT_MS = 180 * 1e3;
var VertexAIService = class {
  constructor(app, authProvider, appCheckProvider, options) {
    var _a;
    this.app = app;
    this.options = options;
    const appCheck = appCheckProvider === null || appCheckProvider === void 0 ? void 0 : appCheckProvider.getImmediate({
      optional: true
    });
    const auth = authProvider === null || authProvider === void 0 ? void 0 : authProvider.getImmediate({
      optional: true
    });
    this.auth = auth || null;
    this.appCheck = appCheck || null;
    this.location = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.location) || DEFAULT_LOCATION;
  }
  _delete() {
    return Promise.resolve();
  }
};
var VertexAIError = class _VertexAIError extends FirebaseError {
  /**
   * Constructs a new instance of the `VertexAIError` class.
   *
   * @param code - The error code from <code>{@link VertexAIErrorCode}</code>.
   * @param message - A human-readable message describing the error.
   * @param customErrorData - Optional error data.
   */
  constructor(code, message, customErrorData) {
    const service = VERTEX_TYPE;
    const serviceName = "VertexAI";
    const fullCode = `${service}/${code}`;
    const fullMessage = `${serviceName}: ${message} (${fullCode})`;
    super(code, fullMessage);
    this.code = code;
    this.customErrorData = customErrorData;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _VertexAIError);
    }
    Object.setPrototypeOf(this, _VertexAIError.prototype);
    this.toString = () => fullMessage;
  }
};
var logger2 = new Logger("@firebase/vertexai");
var Task;
(function(Task2) {
  Task2["GENERATE_CONTENT"] = "generateContent";
  Task2["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
  Task2["COUNT_TOKENS"] = "countTokens";
})(Task || (Task = {}));
var RequestUrl = class {
  constructor(model, task, apiSettings, stream, requestOptions) {
    this.model = model;
    this.task = task;
    this.apiSettings = apiSettings;
    this.stream = stream;
    this.requestOptions = requestOptions;
  }
  toString() {
    var _a;
    const apiVersion = DEFAULT_API_VERSION;
    const baseUrl = ((_a = this.requestOptions) === null || _a === void 0 ? void 0 : _a.baseUrl) || DEFAULT_BASE_URL;
    let url = `${baseUrl}/${apiVersion}`;
    url += `/projects/${this.apiSettings.project}`;
    url += `/locations/${this.apiSettings.location}`;
    url += `/${this.model}`;
    url += `:${this.task}`;
    if (this.stream) {
      url += "?alt=sse";
    }
    return url;
  }
  /**
   * If the model needs to be passed to the backend, it needs to
   * include project and location path.
   */
  get fullModelString() {
    let modelString = `projects/${this.apiSettings.project}`;
    modelString += `/locations/${this.apiSettings.location}`;
    modelString += `/${this.model}`;
    return modelString;
  }
};
function getClientHeaders() {
  const loggingTags = [];
  loggingTags.push(`${LANGUAGE_TAG}/${PACKAGE_VERSION}`);
  loggingTags.push(`fire/${PACKAGE_VERSION}`);
  return loggingTags.join(" ");
}
function getHeaders(url) {
  return __async(this, null, function* () {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("x-goog-api-client", getClientHeaders());
    headers.append("x-goog-api-key", url.apiSettings.apiKey);
    if (url.apiSettings.getAppCheckToken) {
      const appCheckToken = yield url.apiSettings.getAppCheckToken();
      if (appCheckToken) {
        headers.append("X-Firebase-AppCheck", appCheckToken.token);
        if (appCheckToken.error) {
          logger2.warn(`Unable to obtain a valid App Check token: ${appCheckToken.error.message}`);
        }
      }
    }
    if (url.apiSettings.getAuthToken) {
      const authToken = yield url.apiSettings.getAuthToken();
      if (authToken) {
        headers.append("Authorization", `Firebase ${authToken.accessToken}`);
      }
    }
    return headers;
  });
}
function constructRequest(model, task, apiSettings, stream, body, requestOptions) {
  return __async(this, null, function* () {
    const url = new RequestUrl(model, task, apiSettings, stream, requestOptions);
    return {
      url: url.toString(),
      fetchOptions: {
        method: "POST",
        headers: yield getHeaders(url),
        body
      }
    };
  });
}
function makeRequest(model, task, apiSettings, stream, body, requestOptions) {
  return __async(this, null, function* () {
    const url = new RequestUrl(model, task, apiSettings, stream, requestOptions);
    let response;
    let fetchTimeoutId;
    try {
      const request = yield constructRequest(model, task, apiSettings, stream, body, requestOptions);
      const timeoutMillis = (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) != null && requestOptions.timeout >= 0 ? requestOptions.timeout : DEFAULT_FETCH_TIMEOUT_MS;
      const abortController = new AbortController();
      fetchTimeoutId = setTimeout(() => abortController.abort(), timeoutMillis);
      request.fetchOptions.signal = abortController.signal;
      response = yield fetch(request.url, request.fetchOptions);
      if (!response.ok) {
        let message = "";
        let errorDetails;
        try {
          const json = yield response.json();
          message = json.error.message;
          if (json.error.details) {
            message += ` ${JSON.stringify(json.error.details)}`;
            errorDetails = json.error.details;
          }
        } catch (e) {
        }
        if (response.status === 403 && errorDetails.some((detail) => detail.reason === "SERVICE_DISABLED") && errorDetails.some((detail) => {
          var _a, _b;
          return (_b = (_a = detail.links) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.description.includes("Google developers console API activation");
        })) {
          throw new VertexAIError("api-not-enabled", `The Vertex AI in Firebase SDK requires the Vertex AI in Firebase API ('firebasevertexai.googleapis.com') to be enabled in your Firebase project. Enable this API by visiting the Firebase Console at https://console.firebase.google.com/project/${url.apiSettings.project}/genai/ and clicking "Get started". If you enabled this API recently, wait a few minutes for the action to propagate to our systems and then retry.`, {
            status: response.status,
            statusText: response.statusText,
            errorDetails
          });
        }
        throw new VertexAIError("fetch-error", `Error fetching from ${url}: [${response.status} ${response.statusText}] ${message}`, {
          status: response.status,
          statusText: response.statusText,
          errorDetails
        });
      }
    } catch (e) {
      let err = e;
      if (e.code !== "fetch-error" && e.code !== "api-not-enabled" && e instanceof Error) {
        err = new VertexAIError("error", `Error fetching from ${url.toString()}: ${e.message}`);
        err.stack = e.stack;
      }
      throw err;
    } finally {
      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
      }
    }
    return response;
  });
}
var POSSIBLE_ROLES = ["user", "model", "function", "system"];
var HarmCategory;
(function(HarmCategory2) {
  HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
  HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  HarmCategory2["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
  HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
})(HarmCategory || (HarmCategory = {}));
var HarmBlockThreshold;
(function(HarmBlockThreshold2) {
  HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
  HarmBlockThreshold2["BLOCK_NONE"] = "BLOCK_NONE";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
var HarmBlockMethod;
(function(HarmBlockMethod2) {
  HarmBlockMethod2["SEVERITY"] = "SEVERITY";
  HarmBlockMethod2["PROBABILITY"] = "PROBABILITY";
})(HarmBlockMethod || (HarmBlockMethod = {}));
var HarmProbability;
(function(HarmProbability2) {
  HarmProbability2["NEGLIGIBLE"] = "NEGLIGIBLE";
  HarmProbability2["LOW"] = "LOW";
  HarmProbability2["MEDIUM"] = "MEDIUM";
  HarmProbability2["HIGH"] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
var HarmSeverity;
(function(HarmSeverity2) {
  HarmSeverity2["HARM_SEVERITY_NEGLIGIBLE"] = "HARM_SEVERITY_NEGLIGIBLE";
  HarmSeverity2["HARM_SEVERITY_LOW"] = "HARM_SEVERITY_LOW";
  HarmSeverity2["HARM_SEVERITY_MEDIUM"] = "HARM_SEVERITY_MEDIUM";
  HarmSeverity2["HARM_SEVERITY_HIGH"] = "HARM_SEVERITY_HIGH";
})(HarmSeverity || (HarmSeverity = {}));
var BlockReason;
(function(BlockReason2) {
  BlockReason2["SAFETY"] = "SAFETY";
  BlockReason2["OTHER"] = "OTHER";
})(BlockReason || (BlockReason = {}));
var FinishReason;
(function(FinishReason2) {
  FinishReason2["STOP"] = "STOP";
  FinishReason2["MAX_TOKENS"] = "MAX_TOKENS";
  FinishReason2["SAFETY"] = "SAFETY";
  FinishReason2["RECITATION"] = "RECITATION";
  FinishReason2["OTHER"] = "OTHER";
})(FinishReason || (FinishReason = {}));
var FunctionCallingMode;
(function(FunctionCallingMode2) {
  FunctionCallingMode2["AUTO"] = "AUTO";
  FunctionCallingMode2["ANY"] = "ANY";
  FunctionCallingMode2["NONE"] = "NONE";
})(FunctionCallingMode || (FunctionCallingMode = {}));
var SchemaType;
(function(SchemaType2) {
  SchemaType2["STRING"] = "string";
  SchemaType2["NUMBER"] = "number";
  SchemaType2["INTEGER"] = "integer";
  SchemaType2["BOOLEAN"] = "boolean";
  SchemaType2["ARRAY"] = "array";
  SchemaType2["OBJECT"] = "object";
})(SchemaType || (SchemaType = {}));
function createEnhancedContentResponse(response) {
  if (response.candidates && !response.candidates[0].hasOwnProperty("index")) {
    response.candidates[0].index = 0;
  }
  const responseWithHelpers = addHelpers(response);
  return responseWithHelpers;
}
function addHelpers(response) {
  response.text = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        logger2.warn(`This response had ${response.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new VertexAIError("response-error", `Response error: ${formatBlockErrorMessage(response)}. Response body stored in error.response`, {
          response
        });
      }
      return getText(response);
    } else if (response.promptFeedback) {
      throw new VertexAIError("response-error", `Text not available. ${formatBlockErrorMessage(response)}`, {
        response
      });
    }
    return "";
  };
  response.functionCalls = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        logger2.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new VertexAIError("response-error", `Response error: ${formatBlockErrorMessage(response)}. Response body stored in error.response`, {
          response
        });
      }
      return getFunctionCalls(response);
    } else if (response.promptFeedback) {
      throw new VertexAIError("response-error", `Function call not available. ${formatBlockErrorMessage(response)}`, {
        response
      });
    }
    return void 0;
  };
  return response;
}
function getText(response) {
  var _a, _b, _c, _d;
  const textStrings = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.text) {
        textStrings.push(part.text);
      }
    }
  }
  if (textStrings.length > 0) {
    return textStrings.join("");
  } else {
    return "";
  }
}
function getFunctionCalls(response) {
  var _a, _b, _c, _d;
  const functionCalls = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }
  }
  if (functionCalls.length > 0) {
    return functionCalls;
  } else {
    return void 0;
  }
}
var badFinishReasons = [FinishReason.RECITATION, FinishReason.SAFETY];
function hadBadFinishReason(candidate) {
  return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason);
}
function formatBlockErrorMessage(response) {
  var _a, _b, _c;
  let message = "";
  if ((!response.candidates || response.candidates.length === 0) && response.promptFeedback) {
    message += "Response was blocked";
    if ((_a = response.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason) {
      message += ` due to ${response.promptFeedback.blockReason}`;
    }
    if ((_b = response.promptFeedback) === null || _b === void 0 ? void 0 : _b.blockReasonMessage) {
      message += `: ${response.promptFeedback.blockReasonMessage}`;
    }
  } else if ((_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) {
    const firstCandidate = response.candidates[0];
    if (hadBadFinishReason(firstCandidate)) {
      message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
      if (firstCandidate.finishMessage) {
        message += `: ${firstCandidate.finishMessage}`;
      }
    }
  }
  return message;
}
var responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
function processStream(response) {
  const inputStream = response.body.pipeThrough(new TextDecoderStream("utf8", {
    fatal: true
  }));
  const responseStream = getResponseStream(inputStream);
  const [stream1, stream2] = responseStream.tee();
  return {
    stream: generateResponseSequence(stream1),
    response: getResponsePromise(stream2)
  };
}
function getResponsePromise(stream) {
  return __async(this, null, function* () {
    const allResponses = [];
    const reader = stream.getReader();
    while (true) {
      const {
        done,
        value
      } = yield reader.read();
      if (done) {
        const enhancedResponse = createEnhancedContentResponse(aggregateResponses(allResponses));
        return enhancedResponse;
      }
      allResponses.push(value);
    }
  });
}
function generateResponseSequence(stream) {
  return __asyncGenerator(this, arguments, function* generateResponseSequence_1() {
    const reader = stream.getReader();
    while (true) {
      const {
        value,
        done
      } = yield __await(reader.read());
      if (done) {
        break;
      }
      const enhancedResponse = createEnhancedContentResponse(value);
      yield yield __await(enhancedResponse);
    }
  });
}
function getResponseStream(inputStream) {
  const reader = inputStream.getReader();
  const stream = new ReadableStream({
    start(controller) {
      let currentText = "";
      return pump();
      function pump() {
        return reader.read().then(({
          value,
          done
        }) => {
          if (done) {
            if (currentText.trim()) {
              controller.error(new VertexAIError("parse-failed", "Failed to parse stream"));
              return;
            }
            controller.close();
            return;
          }
          currentText += value;
          let match = currentText.match(responseLineRE);
          let parsedResponse;
          while (match) {
            try {
              parsedResponse = JSON.parse(match[1]);
            } catch (e) {
              controller.error(new VertexAIError("parse-failed", `Error parsing JSON response: "${match[1]}`));
              return;
            }
            controller.enqueue(parsedResponse);
            currentText = currentText.substring(match[0].length);
            match = currentText.match(responseLineRE);
          }
          return pump();
        });
      }
    }
  });
  return stream;
}
function aggregateResponses(responses) {
  const lastResponse = responses[responses.length - 1];
  const aggregatedResponse = {
    promptFeedback: lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.promptFeedback
  };
  for (const response of responses) {
    if (response.candidates) {
      for (const candidate of response.candidates) {
        const i = candidate.index || 0;
        if (!aggregatedResponse.candidates) {
          aggregatedResponse.candidates = [];
        }
        if (!aggregatedResponse.candidates[i]) {
          aggregatedResponse.candidates[i] = {
            index: candidate.index
          };
        }
        aggregatedResponse.candidates[i].citationMetadata = candidate.citationMetadata;
        aggregatedResponse.candidates[i].finishReason = candidate.finishReason;
        aggregatedResponse.candidates[i].finishMessage = candidate.finishMessage;
        aggregatedResponse.candidates[i].safetyRatings = candidate.safetyRatings;
        if (candidate.content && candidate.content.parts) {
          if (!aggregatedResponse.candidates[i].content) {
            aggregatedResponse.candidates[i].content = {
              role: candidate.content.role || "user",
              parts: []
            };
          }
          const newPart = {};
          for (const part of candidate.content.parts) {
            if (part.text) {
              newPart.text = part.text;
            }
            if (part.functionCall) {
              newPart.functionCall = part.functionCall;
            }
            if (Object.keys(newPart).length === 0) {
              newPart.text = "";
            }
            aggregatedResponse.candidates[i].content.parts.push(newPart);
          }
        }
      }
    }
  }
  return aggregatedResponse;
}
function generateContentStream(apiSettings, model, params, requestOptions) {
  return __async(this, null, function* () {
    const response = yield makeRequest(
      model,
      Task.STREAM_GENERATE_CONTENT,
      apiSettings,
      /* stream */
      true,
      JSON.stringify(params),
      requestOptions
    );
    return processStream(response);
  });
}
function generateContent(apiSettings, model, params, requestOptions) {
  return __async(this, null, function* () {
    const response = yield makeRequest(
      model,
      Task.GENERATE_CONTENT,
      apiSettings,
      /* stream */
      false,
      JSON.stringify(params),
      requestOptions
    );
    const responseJson = yield response.json();
    const enhancedResponse = createEnhancedContentResponse(responseJson);
    return {
      response: enhancedResponse
    };
  });
}
function formatSystemInstruction(input) {
  if (input == null) {
    return void 0;
  } else if (typeof input === "string") {
    return {
      role: "system",
      parts: [{
        text: input
      }]
    };
  } else if (input.text) {
    return {
      role: "system",
      parts: [input]
    };
  } else if (input.parts) {
    if (!input.role) {
      return {
        role: "system",
        parts: input.parts
      };
    } else {
      return input;
    }
  }
}
function formatNewContent(request) {
  let newParts = [];
  if (typeof request === "string") {
    newParts = [{
      text: request
    }];
  } else {
    for (const partOrString of request) {
      if (typeof partOrString === "string") {
        newParts.push({
          text: partOrString
        });
      } else {
        newParts.push(partOrString);
      }
    }
  }
  return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}
function assignRoleToPartsAndValidateSendMessageRequest(parts) {
  const userContent = {
    role: "user",
    parts: []
  };
  const functionContent = {
    role: "function",
    parts: []
  };
  let hasUserContent = false;
  let hasFunctionContent = false;
  for (const part of parts) {
    if ("functionResponse" in part) {
      functionContent.parts.push(part);
      hasFunctionContent = true;
    } else {
      userContent.parts.push(part);
      hasUserContent = true;
    }
  }
  if (hasUserContent && hasFunctionContent) {
    throw new VertexAIError("invalid-content", "Within a single message, FunctionResponse cannot be mixed with other type of Part in the request for sending chat message.");
  }
  if (!hasUserContent && !hasFunctionContent) {
    throw new VertexAIError("invalid-content", "No Content is provided for sending chat message.");
  }
  if (hasUserContent) {
    return userContent;
  }
  return functionContent;
}
function formatGenerateContentInput(params) {
  let formattedRequest;
  if (params.contents) {
    formattedRequest = params;
  } else {
    const content = formatNewContent(params);
    formattedRequest = {
      contents: [content]
    };
  }
  if (params.systemInstruction) {
    formattedRequest.systemInstruction = formatSystemInstruction(params.systemInstruction);
  }
  return formattedRequest;
}
var VALID_PART_FIELDS = ["text", "inlineData", "functionCall", "functionResponse"];
var VALID_PARTS_PER_ROLE = {
  user: ["text", "inlineData"],
  function: ["functionResponse"],
  model: ["text", "functionCall"],
  // System instructions shouldn't be in history anyway.
  system: ["text"]
};
var VALID_PREVIOUS_CONTENT_ROLES = {
  user: ["model"],
  function: ["model"],
  model: ["user", "function"],
  // System instructions shouldn't be in history.
  system: []
};
function validateChatHistory(history) {
  let prevContent = null;
  for (const currContent of history) {
    const {
      role,
      parts
    } = currContent;
    if (!prevContent && role !== "user") {
      throw new VertexAIError("invalid-content", `First Content should be with role 'user', got ${role}`);
    }
    if (!POSSIBLE_ROLES.includes(role)) {
      throw new VertexAIError("invalid-content", `Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(POSSIBLE_ROLES)}`);
    }
    if (!Array.isArray(parts)) {
      throw new VertexAIError("invalid-content", `Content should have 'parts' but property with an array of Parts`);
    }
    if (parts.length === 0) {
      throw new VertexAIError("invalid-content", `Each Content should have at least one part`);
    }
    const countFields = {
      text: 0,
      inlineData: 0,
      functionCall: 0,
      functionResponse: 0
    };
    for (const part of parts) {
      for (const key of VALID_PART_FIELDS) {
        if (key in part) {
          countFields[key] += 1;
        }
      }
    }
    const validParts = VALID_PARTS_PER_ROLE[role];
    for (const key of VALID_PART_FIELDS) {
      if (!validParts.includes(key) && countFields[key] > 0) {
        throw new VertexAIError("invalid-content", `Content with role '${role}' can't contain '${key}' part`);
      }
    }
    if (prevContent) {
      const validPreviousContentRoles = VALID_PREVIOUS_CONTENT_ROLES[role];
      if (!validPreviousContentRoles.includes(prevContent.role)) {
        throw new VertexAIError("invalid-content", `Content with role '${role} can't follow '${prevContent.role}'. Valid previous roles: ${JSON.stringify(VALID_PREVIOUS_CONTENT_ROLES)}`);
      }
    }
    prevContent = currContent;
  }
}
var SILENT_ERROR = "SILENT_ERROR";
var ChatSession = class {
  constructor(apiSettings, model, params, requestOptions) {
    this.model = model;
    this.params = params;
    this.requestOptions = requestOptions;
    this._history = [];
    this._sendPromise = Promise.resolve();
    this._apiSettings = apiSettings;
    if (params === null || params === void 0 ? void 0 : params.history) {
      validateChatHistory(params.history);
      this._history = params.history;
    }
  }
  /**
   * Gets the chat history so far. Blocked prompts are not added to history.
   * Neither blocked candidates nor the prompts that generated them are added
   * to history.
   */
  getHistory() {
    return __async(this, null, function* () {
      yield this._sendPromise;
      return this._history;
    });
  }
  /**
   * Sends a chat message and receives a non-streaming
   * <code>{@link GenerateContentResult}</code>
   */
  sendMessage(request) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      yield this._sendPromise;
      const newContent = formatNewContent(request);
      const generateContentRequest = {
        safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
        generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
        tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
        toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
        systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
        contents: [...this._history, newContent]
      };
      let finalResult = {};
      this._sendPromise = this._sendPromise.then(() => generateContent(this._apiSettings, this.model, generateContentRequest, this.requestOptions)).then((result) => {
        var _a2, _b2;
        if (result.response.candidates && result.response.candidates.length > 0) {
          this._history.push(newContent);
          const responseContent = {
            parts: ((_a2 = result.response.candidates) === null || _a2 === void 0 ? void 0 : _a2[0].content.parts) || [],
            // Response seems to come back without a role set.
            role: ((_b2 = result.response.candidates) === null || _b2 === void 0 ? void 0 : _b2[0].content.role) || "model"
          };
          this._history.push(responseContent);
        } else {
          const blockErrorMessage = formatBlockErrorMessage(result.response);
          if (blockErrorMessage) {
            logger2.warn(`sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
          }
        }
        finalResult = result;
      });
      yield this._sendPromise;
      return finalResult;
    });
  }
  /**
   * Sends a chat message and receives the response as a
   * <code>{@link GenerateContentStreamResult}</code> containing an iterable stream
   * and a response promise.
   */
  sendMessageStream(request) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      yield this._sendPromise;
      const newContent = formatNewContent(request);
      const generateContentRequest = {
        safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
        generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
        tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
        toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
        systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
        contents: [...this._history, newContent]
      };
      const streamPromise = generateContentStream(this._apiSettings, this.model, generateContentRequest, this.requestOptions);
      this._sendPromise = this._sendPromise.then(() => streamPromise).catch((_ignored) => {
        throw new Error(SILENT_ERROR);
      }).then((streamResult) => streamResult.response).then((response) => {
        if (response.candidates && response.candidates.length > 0) {
          this._history.push(newContent);
          const responseContent = Object.assign({}, response.candidates[0].content);
          if (!responseContent.role) {
            responseContent.role = "model";
          }
          this._history.push(responseContent);
        } else {
          const blockErrorMessage = formatBlockErrorMessage(response);
          if (blockErrorMessage) {
            logger2.warn(`sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
          }
        }
      }).catch((e) => {
        if (e.message !== SILENT_ERROR) {
          logger2.error(e);
        }
      });
      return streamPromise;
    });
  }
};
function countTokens(apiSettings, model, params, requestOptions) {
  return __async(this, null, function* () {
    const response = yield makeRequest(model, Task.COUNT_TOKENS, apiSettings, false, JSON.stringify(params), requestOptions);
    return response.json();
  });
}
var GenerativeModel = class {
  constructor(vertexAI, modelParams, requestOptions) {
    var _a, _b, _c, _d;
    if (!((_b = (_a = vertexAI.app) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.apiKey)) {
      throw new VertexAIError("no-api-key", `The "apiKey" field is empty in the local Firebase config. Firebase VertexAI requires this field to contain a valid API key.`);
    } else if (!((_d = (_c = vertexAI.app) === null || _c === void 0 ? void 0 : _c.options) === null || _d === void 0 ? void 0 : _d.projectId)) {
      throw new VertexAIError("no-project-id", `The "projectId" field is empty in the local Firebase config. Firebase VertexAI requires this field to contain a valid project ID.`);
    } else {
      this._apiSettings = {
        apiKey: vertexAI.app.options.apiKey,
        project: vertexAI.app.options.projectId,
        location: vertexAI.location
      };
      if (_isFirebaseServerApp(vertexAI.app) && vertexAI.app.settings.appCheckToken) {
        const token = vertexAI.app.settings.appCheckToken;
        this._apiSettings.getAppCheckToken = () => {
          return Promise.resolve({
            token
          });
        };
      } else if (vertexAI.appCheck) {
        this._apiSettings.getAppCheckToken = () => vertexAI.appCheck.getToken();
      }
      if (vertexAI.auth) {
        this._apiSettings.getAuthToken = () => vertexAI.auth.getToken();
      }
    }
    if (modelParams.model.includes("/")) {
      if (modelParams.model.startsWith("models/")) {
        this.model = `publishers/google/${modelParams.model}`;
      } else {
        this.model = modelParams.model;
      }
    } else {
      this.model = `publishers/google/models/${modelParams.model}`;
    }
    this.generationConfig = modelParams.generationConfig || {};
    this.safetySettings = modelParams.safetySettings || [];
    this.tools = modelParams.tools;
    this.toolConfig = modelParams.toolConfig;
    this.systemInstruction = formatSystemInstruction(modelParams.systemInstruction);
    this.requestOptions = requestOptions || {};
  }
  /**
   * Makes a single non-streaming call to the model
   * and returns an object containing a single <code>{@link GenerateContentResponse}</code>.
   */
  generateContent(request) {
    return __async(this, null, function* () {
      const formattedParams = formatGenerateContentInput(request);
      return generateContent(this._apiSettings, this.model, Object.assign({
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction
      }, formattedParams), this.requestOptions);
    });
  }
  /**
   * Makes a single streaming call to the model
   * and returns an object containing an iterable stream that iterates
   * over all chunks in the streaming response as well as
   * a promise that returns the final aggregated response.
   */
  generateContentStream(request) {
    return __async(this, null, function* () {
      const formattedParams = formatGenerateContentInput(request);
      return generateContentStream(this._apiSettings, this.model, Object.assign({
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction
      }, formattedParams), this.requestOptions);
    });
  }
  /**
   * Gets a new <code>{@link ChatSession}</code> instance which can be used for
   * multi-turn chats.
   */
  startChat(startChatParams) {
    return new ChatSession(this._apiSettings, this.model, Object.assign({
      tools: this.tools,
      toolConfig: this.toolConfig,
      systemInstruction: this.systemInstruction
    }, startChatParams), this.requestOptions);
  }
  /**
   * Counts the tokens in the provided request.
   */
  countTokens(request) {
    return __async(this, null, function* () {
      const formattedParams = formatGenerateContentInput(request);
      return countTokens(this._apiSettings, this.model, formattedParams);
    });
  }
};
var Schema = class {
  constructor(schemaParams) {
    for (const paramKey in schemaParams) {
      this[paramKey] = schemaParams[paramKey];
    }
    this.type = schemaParams.type;
    this.nullable = schemaParams.hasOwnProperty("nullable") ? !!schemaParams.nullable : false;
  }
  /**
   * Defines how this Schema should be serialized as JSON.
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior
   * @internal
   */
  toJSON() {
    const obj = {
      type: this.type
    };
    for (const prop in this) {
      if (this.hasOwnProperty(prop) && this[prop] !== void 0) {
        if (prop !== "required" || this.type === SchemaType.OBJECT) {
          obj[prop] = this[prop];
        }
      }
    }
    return obj;
  }
  static array(arrayParams) {
    return new ArraySchema(arrayParams, arrayParams.items);
  }
  static object(objectParams) {
    return new ObjectSchema(objectParams, objectParams.properties, objectParams.optionalProperties);
  }
  // eslint-disable-next-line id-blacklist
  static string(stringParams) {
    return new StringSchema(stringParams);
  }
  static enumString(stringParams) {
    return new StringSchema(stringParams, stringParams.enum);
  }
  static integer(integerParams) {
    return new IntegerSchema(integerParams);
  }
  // eslint-disable-next-line id-blacklist
  static number(numberParams) {
    return new NumberSchema(numberParams);
  }
  // eslint-disable-next-line id-blacklist
  static boolean(booleanParams) {
    return new BooleanSchema(booleanParams);
  }
};
var IntegerSchema = class extends Schema {
  constructor(schemaParams) {
    super(Object.assign({
      type: SchemaType.INTEGER
    }, schemaParams));
  }
};
var NumberSchema = class extends Schema {
  constructor(schemaParams) {
    super(Object.assign({
      type: SchemaType.NUMBER
    }, schemaParams));
  }
};
var BooleanSchema = class extends Schema {
  constructor(schemaParams) {
    super(Object.assign({
      type: SchemaType.BOOLEAN
    }, schemaParams));
  }
};
var StringSchema = class extends Schema {
  constructor(schemaParams, enumValues) {
    super(Object.assign({
      type: SchemaType.STRING
    }, schemaParams));
    this.enum = enumValues;
  }
  /**
   * @internal
   */
  toJSON() {
    const obj = super.toJSON();
    if (this.enum) {
      obj["enum"] = this.enum;
    }
    return obj;
  }
};
var ArraySchema = class extends Schema {
  constructor(schemaParams, items) {
    super(Object.assign({
      type: SchemaType.ARRAY
    }, schemaParams));
    this.items = items;
  }
  /**
   * @internal
   */
  toJSON() {
    const obj = super.toJSON();
    obj.items = this.items.toJSON();
    return obj;
  }
};
var ObjectSchema = class extends Schema {
  constructor(schemaParams, properties, optionalProperties = []) {
    super(Object.assign({
      type: SchemaType.OBJECT
    }, schemaParams));
    this.properties = properties;
    this.optionalProperties = optionalProperties;
  }
  /**
   * @internal
   */
  toJSON() {
    const obj = super.toJSON();
    obj.properties = Object.assign({}, this.properties);
    const required = [];
    if (this.optionalProperties) {
      for (const propertyKey of this.optionalProperties) {
        if (!this.properties.hasOwnProperty(propertyKey)) {
          throw new VertexAIError("invalid-schema", `Property "${propertyKey}" specified in "optionalProperties" does not exist.`);
        }
      }
    }
    for (const propertyKey in this.properties) {
      if (this.properties.hasOwnProperty(propertyKey)) {
        obj.properties[propertyKey] = this.properties[propertyKey].toJSON();
        if (!this.optionalProperties.includes(propertyKey)) {
          required.push(propertyKey);
        }
      }
    }
    if (required.length > 0) {
      obj.required = required;
    }
    delete obj.optionalProperties;
    return obj;
  }
};
function getVertexAI(app = getApp(), options) {
  app = getModularInstance(app);
  const vertexProvider = _getProvider(app, VERTEX_TYPE);
  return vertexProvider.getImmediate({
    identifier: (options === null || options === void 0 ? void 0 : options.location) || DEFAULT_LOCATION
  });
}
function getGenerativeModel(vertexAI, modelParams, requestOptions) {
  if (!modelParams.model) {
    throw new VertexAIError("no-model", `Must provide a model name. Example: getGenerativeModel({ model: 'my-model-name' })`);
  }
  return new GenerativeModel(vertexAI, modelParams, requestOptions);
}
function registerVertex() {
  _registerComponent(new Component(
    VERTEX_TYPE,
    (container, {
      instanceIdentifier: location
    }) => {
      const app = container.getProvider("app").getImmediate();
      const auth = container.getProvider("auth-internal");
      const appCheckProvider = container.getProvider("app-check-internal");
      return new VertexAIService(app, auth, appCheckProvider, {
        location
      });
    },
    "PUBLIC"
    /* ComponentType.PUBLIC */
  ).setMultipleInstances(true));
  registerVersion(name2, version2);
  registerVersion(name2, version2, "esm2017");
}
registerVertex();

// node_modules/@angular/fire/fesm2022/angular-fire-vertexai.mjs
var VertexAI = class {
  constructor(vertexai) {
    return vertexai;
  }
};
var VERTEX_AI_PROVIDER_NAME = "vertexai";
var VertexAIInstances = class {
  constructor() {
    return ɵgetAllInstancesOf(VERTEX_AI_PROVIDER_NAME);
  }
};
var vertexAIInstance$ = timer(0, 300).pipe(concatMap(() => from(ɵgetAllInstancesOf(VERTEX_AI_PROVIDER_NAME))), distinct());
var PROVIDED_VERTEX_AI_INSTANCES = new InjectionToken("angularfire2.vertexai-instances");
function defaultVertexAIInstanceFactory(provided, defaultApp) {
  const defaultVertexAI = ɵgetDefaultInstanceOf(VERTEX_AI_PROVIDER_NAME, provided, defaultApp);
  return defaultVertexAI && new VertexAI(defaultVertexAI);
}
function vertexAIInstanceFactory(fn) {
  return (zone, injector) => {
    const vertexAI = zone.runOutsideAngular(() => fn(injector));
    return new VertexAI(vertexAI);
  };
}
var VERTEX_AI_INSTANCES_PROVIDER = {
  provide: VertexAIInstances,
  deps: [[new Optional(), PROVIDED_VERTEX_AI_INSTANCES]]
};
var DEFAULT_VERTEX_AI_INSTANCE_PROVIDER = {
  provide: VertexAI,
  useFactory: defaultVertexAIInstanceFactory,
  deps: [[new Optional(), PROVIDED_VERTEX_AI_INSTANCES], FirebaseApp]
};
var VertexAIModule = class _VertexAIModule {
  constructor() {
    registerVersion("angularfire", VERSION.full, "vertexai");
  }
  static ɵfac = function VertexAIModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VertexAIModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _VertexAIModule
  });
  static ɵinj = ɵɵdefineInjector({
    providers: [DEFAULT_VERTEX_AI_INSTANCE_PROVIDER, VERTEX_AI_INSTANCES_PROVIDER]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VertexAIModule, [{
    type: NgModule,
    args: [{
      providers: [DEFAULT_VERTEX_AI_INSTANCE_PROVIDER, VERTEX_AI_INSTANCES_PROVIDER]
    }]
  }], () => [], null);
})();
function provideVertexAI(fn, ...deps) {
  registerVersion("angularfire", VERSION.full, "vertexai");
  return makeEnvironmentProviders([DEFAULT_VERTEX_AI_INSTANCE_PROVIDER, VERTEX_AI_INSTANCES_PROVIDER, {
    provide: PROVIDED_VERTEX_AI_INSTANCES,
    useFactory: vertexAIInstanceFactory(fn),
    multi: true,
    deps: [NgZone, Injector, ɵAngularFireSchedulers, FirebaseApps, [new Optional(), AppCheckInstances], ...deps]
  }]);
}
var getGenerativeModel2 = ɵzoneWrap(getGenerativeModel, true);
var getVertexAI2 = ɵzoneWrap(getVertexAI, true);
export {
  ArraySchema,
  BlockReason,
  BooleanSchema,
  ChatSession,
  FinishReason,
  FunctionCallingMode,
  GenerativeModel,
  HarmBlockMethod,
  HarmBlockThreshold,
  HarmCategory,
  HarmProbability,
  HarmSeverity,
  IntegerSchema,
  NumberSchema,
  ObjectSchema,
  POSSIBLE_ROLES,
  Schema,
  SchemaType,
  StringSchema,
  VertexAI,
  VertexAIError,
  VertexAIInstances,
  VertexAIModule,
  getGenerativeModel2 as getGenerativeModel,
  getVertexAI2 as getVertexAI,
  provideVertexAI,
  vertexAIInstance$
};
/*! Bundled license information:

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/vertexai/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
//# sourceMappingURL=@angular_fire_vertexai.js.map
