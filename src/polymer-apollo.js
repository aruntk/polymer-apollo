/* eslint-disable no-param-reassign, func-names, no-console */
import omit from 'lodash.omit';

export class DollarApollo {
  constructor(el) {
    this.el = el;
    this.subscriptions = {};
    this.queries = {};
    el.__apollo_store = {};
  }

  get client() {
    return this.el._apolloClient;
  }

  get query() {
    return this.client.query.bind(this.client);
  }

  watchQuery(options) {
    const el = this.el;
    const observable = this.client.watchQuery(options);
    const _subscribe = observable.subscribe.bind(observable);
    observable.subscribe = (function (opt) {
      const sub = _subscribe(opt);

      const _unsubscribe = sub.unsubscribe.bind(sub);
      sub.unsubscribe = function () {
        _unsubscribe();
        el._apolloSubscriptions = el._apolloSubscriptions.filter(storeSub => storeSub !== sub);
      };

      el._apolloSubscriptions.push(sub);
      return sub;
    });

    return observable;
  }

  subscribe(options) {
    const el = this.el;
    const observable = this.client.subscribe(options);
    const _subscribe = observable.subscribe.bind(observable);
    observable.subscribe = (function (opt) {
      const sub = _subscribe(opt);

      const _unsubscribe = sub.unsubscribe.bind(sub);
      sub.unsubscribe = function () {
        _unsubscribe();
        el._apolloSubscriptions = el._apolloSubscriptions.filter(storeSub => storeSub !== sub);
      };

      el._apolloSubscriptions.push(sub);
      return sub;
    });

    return observable;
  }

  get mutate() {
    return this.client.mutate.bind(this.client);
  }

  processObservers(el) {
    // Create subscription
    const $apollo = this;
    this.el = el;
    for (const i of Object.keys(el.__apollo_store)) {
      const storeEntry = el.__apollo_store[i];
      if (storeEntry.options.skip === undefined) {
        $apollo._subscribeObservers(i, storeEntry);
      }
    }
  }

  _subscribeObservers(key, storeEntry) {
    const el = this.el;
    const $apollo = this;
    const options = storeEntry.options;
    const observer = storeEntry.observer;
    const type = storeEntry.type;
    const loadingKey = options.loadingKey;
    let loadingChangeCb = options.watchLoading;
    this._changeLoader(loadingKey, true, loadingChangeCb);
    if (typeof loadingChangeCb === 'function') {
      loadingChangeCb = loadingChangeCb.bind(el);
    }

    function nextResult({ data }) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);
      $apollo._applyData(data, options.dataKey, key);
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
      if (typeof options.error === 'function') {
        options.error.apply(el, [error]);
      }
    }

    const sub = observer.subscribe({
      next: nextResult,
      error: catchError,
    });

    return sub;
  }

  _applyData(data, key, prop) {
    if (data[key] === undefined) {
      console.error(`Missing "${key}" in GraphQL data`, data);
    } else {
      const storeEntry = this.el.__apollo_store[key];
      if (storeEntry && !storeEntry.firstLoadingDone) {
        this.el.__apollo_store[key].firstLoadingDone = true;
      }
      this.el[prop] = data[key];
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

  _refetch(key, storeEntry) {
    const el = this.el;
    const $apollo = this;
    const options = storeEntry.options;
    const observer = storeEntry.observer;
    const variables = storeEntry.variables;
    const type = storeEntry.type;
    const loadingKey = options.loadingKey;
    let loadingChangeCb = options.watchLoading;
    this._changeLoader(loadingKey, true, loadingChangeCb);
    if (typeof loadingChangeCb === 'function') {
      loadingChangeCb = loadingChangeCb.bind(el);
    }
    function nextResult({ data }) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);
      $apollo._applyData(data, options.dataKey, key);
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

      if (typeof options.error === 'function') {
        options.error.apply(el, [error]);
      }
    }

    observer.refetch(variables, {
      forceFetch: !!options.forceFetch,
    }).then(nextResult, catchError);
  }

  refetch(key) {
    const storeEntry = this.el.__apollo_store[key];
    if (storeEntry) {
      this._refetch(key, storeEntry);
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
      'dataKey',
    ]);
    return apolloOptions;
  }

  _addPolymerObservers(key, options) {
    const el = this.el;
    const $apollo = this;
    if (options.skip !== undefined) {
      const _var = options.skip;

      this._addPolymerObserver(el, _var, (newSkipValue) => {
        const storeEntry = el.__apollo_store[key];
        if (!newSkipValue) {
          storeEntry.options.skip = false;
          if ($apollo.attached) {
            $apollo._subscribeObservers(key, storeEntry);
          }
        } else {
          storeEntry.options.skip = true;
        }
      });

      const prop = Polymer.Base.get(_var, el.properties);
      if (prop !== undefined) {
        // assuming initial value is true if undefined
        options.skip = prop.value === undefined ? true : prop.value;
      } else {
        console.error(`Missing "${_var}" in properties, ignoring skip option`);
        delete options.skip;
      }
    }
    if (options.variables) {
      for (const i of Object.keys(options.variables)) {
        if ({}.hasOwnProperty.call(options.variables, i)) {
          const _var = options.variables[i];
          this._addPolymerObserver(el, _var, (newValue) => {
            const storeEntry = el.__apollo_store[key];
            if (storeEntry && storeEntry.firstLoadingDone) {
              storeEntry.options.variables[i] = newValue;
              $apollo._refetch(key, storeEntry);
            }
          });
          const prop = Polymer.Base.get(_var, el.properties);
          if (prop !== undefined) {
            options.variables[i] = prop.value;
          } else {
            console.error(`Missing "${i}" in properties`);
          }
        }
      }
    }
  }

  _addPolymerObserver(el, variable, observer) {
    const rand = Math.floor(1000000000 + (Math.random() * 9000000000));
    const rId = `__apollo_${rand}`;
    el[rId] = observer;
    el._addComplexObserverEffect(`__apollo_${rand}(${variable})`);
  }

  _processQuery(key, options) {
    const variables = options.variables;
    // Create observer
    const newObserver = this.watchQuery(this._generateApolloOptions(options));
    this.el.__apollo_store[key] = {
      observer: newObserver,
      variables,
      options,
      type: 'query',
    };
    return newObserver;
  }

  processQuery(key, options) {
    if (key && options) {
      const $apollo = this;
      let sub;

      if (!options.dataKey) {
        options.dataKey = key;
      }

      const observer = this._processQuery(key, options, sub);
      this._addPolymerObservers(key, options);
      $apollo.queries[key] = observer;
    }
  }
  _processSubscription(key, options) {
    const variables = options.variables;
    // Create observer
    const newObserver = this.subscribe(this._generateApolloOptions(options));
    this.el.__apollo_store[key] = {
      observer: newObserver,
      variables,
      options,
      type: 'subscription',
    };
    return newObserver;
  }
  processSubscription(key, options) {
    if (key && options) {
      const $apollo = this;

      if (!options.dataKey) {
        options.dataKey = key;
      }

      const observer = this._processSubscription(key, options);
      $apollo.subscriptions[key] = observer;
      this._addPolymerObservers(key, options);
    }
  }
}

export class PolymerApollo {
  constructor(options) {
    this._apolloClient = options.apolloClient;
    this._apolloSubscriptions = [];
    this.properties = {};
  }
  beforeRegister() {
    const apollo = this.apollo;
    this.$apollo = new DollarApollo(this);

    if (apollo) {
      const queries = omit(apollo, [
        'subscribe',
      ]);

      // watchQuery
      for (const key of Object.keys(queries)) {
        this.$apollo.processQuery(key, queries[key]);
      }
      // subscribe
      if (apollo.subscribe) {
        for (const key of Object.keys(apollo.subscribe)) {
          this.$apollo.processSubscription(key, apollo.subscribe[key]);
        }
      }
    }
  }
  attached() {
    this.$apollo.processObservers(this);
    this.$apollo.attached = true;
  }
  detached() {
    this._apolloSubscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this._apolloSubscriptions = null;
    if (this.$apollo) {
      this.$apollo = null;
    }
    this.$apollo.attached = false;
  }
}
