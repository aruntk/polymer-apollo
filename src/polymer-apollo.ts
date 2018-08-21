import omit from 'lodash.omit';
import { PolymerElement, ApolloClient } from '../types';

export default class PolymerApollo {
  private subscriptions = {};
  private queries = {};
  public _query = {};
  public _subscription = {};
  public attached = false;

  public constructor(
    private element: PolymerElement,
    private client: ApolloClient<{}>,
  ) { }

  public get query() {
    return this.client.query.bind(this.client);
  }

  public get mutate() {
    return this.client.mutate.bind(this.client);
  }

  public watchQuery(options, key) {
    const observable = this.client.watchQuery(options);
    return this._processObservable(observable, key, 'query');
  }

  public subscribe(options, key) {
    const observable = this.client.subscribe(options);
    return this._processObservable(observable, key, 'subscription');
  }

  private _processObservable(observable, key, type) {
    const self = this,
      _subscribe = observable.subscribe.bind(observable);
    observable.subscribe = (function (opt) {
      const sub = _subscribe(opt),
        _unsubscribe = sub.unsubscribe.bind(sub);

      sub.unsubscribe = function () {
        _unsubscribe();
        self[`_${type}`][key].sub = null;
      };
      self[`_${type}`][key].sub = sub;
      return sub;
    });
    return observable;
  }

  private _getSubscribeCallbacks(key, type) {
    const el = this.element,
      $apollo = this,
      entry = this[`_${type}`][key],
      loadingKey = entry.loadingKey,
      loadingChangeCb = entry.watchLoading;
    this._changeLoader(loadingKey, true, loadingChangeCb);

    return {
      next(result) {
        $apollo._changeLoader(loadingKey, false, loadingChangeCb);
        $apollo._applyData(result.data);
        if (typeof entry.success === 'function') {
          entry.success.call(el, result);
        }
      },
      error(error) {
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
      },
    };
  }

  private _subscribeObservable(key, observable, type) {
    const opt = this._getSubscribeCallbacks(key, type),
      sub = observable.subscribe(opt);
    return sub;
  }

  private _applyData(data) {
    if (!data) return;
    for (const key of Object.keys(data)) {
      this.element.set([key], data[key]);
    }
  }

  private _changeLoader(loadingKey, value, loadingChangeCb) {
    if (loadingKey) {
      this.element[loadingKey] = value;
    }

    if (loadingChangeCb) {
      loadingChangeCb(value);
    }
  }

  private _refetch(key, entry) {
    const options = entry._options,
      observable = entry.observable,
      variables = options.variables,
      opt = this._getSubscribeCallbacks(key, 'query');
    if (!observable) return;

    observable.refetch(variables, {
      forceFetch: !!options.forceFetch,
    }).then(opt.next, opt.error);
  }

  public refetch(key) {
    const entry = this._query[key];
    if (entry) {
      this._refetch(key, entry);
    } else {
      console.error(`Unable to find a query with key : ${key}`);
    }
  }

  private _generateApolloOptions(options) {
    return omit(options, [
      'error',
      'loadingKey',
      'watchLoading',
      'skip',
      '_options',
      'options',
      'result',
    ]);
  }

  public createApolloOptions(apollo) {
    if (!apollo) return;
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

  private _createOptionsProp(key, type) {
    const options = this[`_${type}`][key].options,
      rnd = Math.floor(1000000000 + (Math.random() * 9000000000)),
      rId = `__apollo_${rnd}`;
    this[`_${type}`][key]._key = rnd;
  }

  public init(el) {
    this.element = el;
    for (const key of Object.keys(this._query)) {
      this._processOptions(key, 'query');
    }
    for (const key of Object.keys(this._subscription)) {
      this._processOptions(key, 'subscription');
    }
  }

  public start(el) {
    for (const key of Object.keys(this._query)) {
      const entry = this._query[key],
        options = entry._options || el[entry.options];
      if (entry.skip !== true) {
        this._polymerChange('query', key, options);
      }
    }
    for (const key of Object.keys(this._subscription)) {
      const entry = this._subscription[key],
        options = entry._options || el[entry.options];
      if (entry.skip !== true) {
        this._polymerChange('subscription', key, options);
      }
    }
  }

  private _processOptions(key, type) {
    const entry = this[`_${type}`][key],
      rId = `__apollo_${entry._key}`;
    if (!this.element[`${rId}_callback`]) {
      if (typeof entry.options === 'string') {
        this._createPolymerObserver(rId, key, type);
      } else {
        entry._options = entry.options || { skip: false };
      }
      this[`_${type}`][key] = entry;
    }
  }

  private _createPolymerObserver(rId, key, type) {
    const $apollo = this;
    // unique id for observer callback
    const options = this[`_${type}`][key].options;
    if (!(typeof options === 'string')) return;
    const cbId = `${rId}_callback`,
      propId = `${rId}_prop`;
    this.element[cbId] = (opt) => {
      $apollo._polymerChange(type, key, opt);
    };
    this.element._createComputedProperty(propId, options);
    this.element._createPropertyObserver(propId, cbId);
  }

  private _polymerChange(type, key, options: { skip?: boolean } = {}) {
    if (!this.attached) return;
    const entry = this[`_${type}`][key];
    entry._options = options;
    const _observable = entry.observable,
      skip = !!options.skip,
      _sub = entry.sub;
    if (skip && _sub) {
      _sub.unsubscribe();
      delete entry.sub;
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

  public queryProcess(key, options) {
    if (!(key && options)) return null;
    // Create observer
    const observable = this.watchQuery(this._generateApolloOptions(options), key);
    this.queries[key] = observable;
    options.observable = observable;
    // subscribe observable
    const sub = this._subscribeObservable(key, observable, 'query');
    return { sub, observable };
  }

  public subscriptionProcess(key, options) {
    if (!(key && options)) return null;
    // Create observable
    const observable = this.subscribe(this._generateApolloOptions(options), key);
    this.subscriptions[key] = observable;
    options.observable = observable;
    this._subscription[key] = options;
    // subscribe observable
    const sub = this._subscribeObservable(key, observable, 'subscription');
    return { sub, observable };
  }

  public unsubscribe(key, type) {
    const entry = this[`_${type}`][key],
      sub = entry.sub;
    sub.unsubscribe();
    this[`${type}`][key] = omit(entry, 'sub');
  }
}
