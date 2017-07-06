/* eslint-disable no-param-reassign, func-names, no-console */
import omit from 'lodash.omit';
import clone from 'lodash.clone';

export class DollarApollo {
  constructor(el) {
    this.el = el;
    this.subscriptions = {};
    this.queries = {};
    this._query = {};
    this._subscription = {};
    this.attached = false;
  }

  get client() {
    return this.el._apolloClient;
  }

  get query() {
    return this.client.query.bind(this.client);
  }

  get mutate() {
    return this.client.mutate.bind(this.client);
  }

  watchQuery(options, key) {
    const observable = this.client.watchQuery(options);
    return this._processObservable(observable, key, 'query');
  }

  subscribe(options, key) {
    const observable = this.client.subscribe(options);
    return this._processObservable(observable, key, 'subscription');
  }

  _processObservable(observable, key, type) {
    const self = this;
    const _subscribe = observable.subscribe.bind(observable);
    observable.subscribe = (function (opt) {
      const sub = _subscribe(opt);

      const _unsubscribe = sub.unsubscribe.bind(sub);
      sub.unsubscribe = function () {
        _unsubscribe();
        self[`_${type}`][key].sub = null;
      };
      self[`_${type}`][key].sub = sub;
      return sub;
    });
    return observable;
  }

  _getSubscribeCallbacks(key, type) {
    const el = this.el;
    const $apollo = this;
    const entry = this[`_${type}`][key];
    const loadingKey = entry.loadingKey;
    const loadingChangeCb = entry.watchLoading;
    this._changeLoader(loadingKey, true, loadingChangeCb);

    function nextResult(result) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);
      $apollo._applyData(result.data);
      if (typeof entry.success === 'function') {
        entry.success.call(el, result);
      }
    }

    function catchError(error) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);
      if (error.graphQLErrors && error.graphQLErrors.length !== 0) {
        console.error(`GraphQL execution errors for ${type} ${key}`);
        for (const e of error.graphQLErrors) {
          console.error(e);
        }
      } else if (error.networkError) {
        console.error(`Error sending the ${type} ${key}`, error.networkError);
      } else {
        console.error(error);
      }
      if (typeof entry.error === 'function') {
        entry.error.call(el, error);
      }
    }

    return { next: nextResult, error: catchError };
  }

  _subscribeObservable(key, observable, type) {
    const opt = this._getSubscribeCallbacks(key, type);
    const sub = observable.subscribe(opt);
    return sub;
  }

  _applyData(data) {
    if (data) {
      for (const key of Object.keys(data)) {
        this.el.set([key], data[key]);
      }
    }
  }

  _changeLoader(loadingKey, value, loadingChangeCb) {
    if (loadingKey) {
      this.el[loadingKey] = value;
    }

    if (loadingChangeCb) {
      loadingChangeCb(value);
    }
  }

  _refetch(key, entry) {
    const options = entry._options;
    const observable = entry.observable;
    const variables = options.variables;
    const opt = this._getSubscribeCallbacks(key, 'query');
    if (observable) {
      observable.refetch(variables, {
        forceFetch: !!options.forceFetch,
      }).then(opt.next, opt.error);
    }
  }

  refetch(key) {
    const entry = this._query[key];
    if (entry) {
      this._refetch(key, entry);
    } else {
      console.error(`Unable to find a query with key : ${key}`);
    }
  }

  _generateApolloOptions(options) {
    const apolloOptions = omit(options, [
      'error',
      'loadingKey',
      'watchLoading',
      'skip',
      '_options',
      'options',
      'result',
    ]);
    return apolloOptions;
  }

  createApolloOptions(apollo) {
    if (apollo) {
      const queries = omit(apollo, [
        'subscribe',
        'onReady',
      ]);
      this._query = queries || {};
      this._subscription = apollo.subscribe || {};
      for (const key of Object.keys(this._query)) {
        this._createOptionsProp(key, 'query');
      }
      for (const key of Object.keys(this._subscription)) {
        this._createOptionsProp(key, 'subscription');
      }
    }
  }

  _createOptionsProp(key, type) {
    const options = this[`_${type}`][key].options;
    const rnd = Math.floor(1000000000 + (Math.random() * 9000000000));
    var rId = `__apollo_${rnd}`;
    this[`_${type}`][key]._key = rnd;
  }

  init(el) {
    this.el = el;
    for (const key of Object.keys(this._query)) {
      this._processOptions(key, 'query');
    }
    for (const key of Object.keys(this._subscription)) {
      this._processOptions(key, 'subscription');
    }
  }

  start(el) {
    for (const key of Object.keys(this._query)) {
      const entry = this._query[key];
      const options = entry._options || el[entry.options];
      this._polymerChange('query', key, options);
    }
    for (const key of Object.keys(this._subscription)) {
      const entry = this._subscription[key];
      const options = entry._options || el[entry.options];
      this._polymerChange('subscription', key, options);
    }
  }

  _processOptions(key, type) {
    const entry = this[`_${type}`][key];
    const rId = `__apollo_${entry._key}`;
    if (!this.el[`${rId}_callback`]) {
      if (typeof entry.options === 'string') {
        this._createPolymerObserver(rId, key, type);
      } else {
        entry._options = entry.options || { skip: false };
      }
      this[`_${type}`][key] = entry;
    }
  }

  _createPolymerObserver(rId, key, type) {
    const $apollo = this;
    // unique id for observer callback
    const cbId = `${rId}_callback`;
    this.el[cbId] = (n) => {
      $apollo._polymerChange(type, key, n);
    };
    this.el._createPropertyObserver(this[`_${type}`][key].options, cbId);
  }

  _polymerChange(type, key, options = {}) {
    if (this.attached) {
      const entry = this[`_${type}`][key];
      entry._options = options;
      const _observable = entry.observable;
      const skip = !!options.skip;
      const _sub = entry.sub;
      if (skip) {
        if (_sub) {
          _sub.unsubscribe();
          delete entry.sub;
        }
      } else if (_sub) {
        _observable.setOptions(options);
      } else {
        const processArg = Object.assign({}, entry, options);

        const { sub, observable } = this[`${type}Process`](key, processArg);
        entry.sub = sub;
        entry.observable = observable;
      }
      this[`_${type}`][key] = entry;
    }
  }

  queryProcess(key, options) {
    if (key && options) {
      // Create observer
      const observable = this.watchQuery(this._generateApolloOptions(options), key);
      this.queries[key] = observable;
      options.observable = observable;
      // subscribe observable
      const sub = this._subscribeObservable(key, observable, 'query');
      return { sub, observable };
    }
    return null;
  }

  subscriptionProcess(key, options) {
    if (key && options) {
      // Create observable
      const observable = this.subscribe(this._generateApolloOptions(options), key);
      this.subscriptions[key] = observable;
      options.observable = observable;
      this._subscription[key] = options;
      // subscribe observable
      const sub = this._subscribeObservable(key, observable, 'subscription');
      return { sub, observable };
    }
    return null;
  }

  unsubscribe(key, type) {
    const entry = this[`_${type}`][key];
    const sub = entry.sub;
    sub.unsubscribe();
    this[`${type}`][key] = omit(entry, 'sub');
  }
}
export const PolymerApolloMixin = (options, superclass) => class extends superclass {
  constructor() {
    super();
    this._apolloClient = options.apolloClient;
    this.$apollo = new DollarApollo(this);
    const apollo = this.apollo;
    if (apollo) {
      this.$apollo.createApolloOptions(apollo);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    const apollo = this.apollo;
    this.$apollo = clone(this.$apollo);
    if (apollo) {
      this.$apollo.attached = true;
      this.$apollo.init(this);
    }
  }

  ready() {
    super.ready();
    const apollo = this.apollo;
    if (apollo) {
      this.$apollo.attached = true;
      this.$apollo.start(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const apollo = this.apollo;
    if (apollo && !this.apollo.onReady) {
      this.$apollo.attached = false;
      const $apollo = this.$apollo;
      for (const key of Object.keys($apollo._query)) {
        $apollo.unsubscribe(key, 'query');
      }
      for (const key of Object.keys($apollo._subscription)) {
        $apollo.unsubscribe(key, 'subscription');
      }
    }
  }
}
