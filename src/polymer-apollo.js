/* eslint-disable no-param-reassign, func-names, no-console */
import omit from 'lodash.omit';

function deepFind(obj, path) {
  const paths = path.split('.');
  let current = obj;
  let i;

  for (i = 0; i < paths.length; i += 1) {
    if (current[paths[i]] === undefined) {
      return undefined;
    }
    current = current[paths[i]];
  }
  return current;
}

export class DollarApollo {
  constructor(el) {
    this.el = el;
    this.querySubscriptions = {};
    el.__apollo_store = {};
  }

  get client() {
    return this.el._apolloClient;
  }

  get query() {
    return this.client.query;
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

  get mutate() {
    return this.client.mutate;
  }

  processObservers(el) {
    // Create subscription
    const $apollo = this;
    this.el = el;
    for (const i of Object.keys(el.__apollo_store)) {
      const obj = el.__apollo_store[i];
      if (obj.options.skip === undefined) {
        $apollo._subscribeObservers(i, obj.options, obj.observer);
      }
    }
  }

  _subscribeObservers(key, options, observer) {
    const el = this.el;
    const $apollo = this;
    const loadingKey = options.loadingKey;
    let loadingChangeCb = options.watchLoading;
    this._changeLoader(loadingKey, true, loadingChangeCb);
    if (typeof loadingChangeCb === 'function') {
      loadingChangeCb = loadingChangeCb.bind(el);
    }

    function nextResult({ data }) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);
      $apollo._applyData(data, key);
    }

    function catchError(error) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);
      if (error.graphQLErrors && error.graphQLErrors.length !== 0) {
        console.error(`GraphQL execution errors for query ${key}`);
        for (const e of error.graphQLErrors) {
          console.error(e);
        }
      } else if (error.networkError) {
        console.error(`Error sending the query ${key}`, error.networkError);
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

  _applyData(data, key) {
    if (data[key] === undefined) {
      console.error(`Missing "${key}" in properties`, data);
    } else {
      const storeEntry = this.el.__apollo_store[key];
      if (storeEntry && !storeEntry.firstLoadingDone) {
        this.el.__apollo_store[key].firstLoadingDone = true;
      }
      this.el[key] = data[key];
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

  _refetch(key, options, variables, observer) {
    const el = this.el;
    const $apollo = this;
    const loadingKey = options.loadingKey;
    let loadingChangeCb = options.watchLoading;
    this._changeLoader(loadingKey, true, loadingChangeCb);
    if (typeof loadingChangeCb === 'function') {
      loadingChangeCb = loadingChangeCb.bind(el);
    }
    function nextResult({ data }) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);
      $apollo._applyData(data, key);
    }
    function catchError(error) {
      $apollo._changeLoader(loadingKey, false, loadingChangeCb);

      if (error.graphQLErrors && error.graphQLErrors.length !== 0) {
        console.error(`GraphQL execution errors for query ${key}`);
        for (const e of error.graphQLErrors) {
          console.error(e);
        }
      } else if (error.networkError) {
        console.error(`Error sending the query ${key}`, error.networkError);
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

  _processVariables(key, options, sub, observer) {
    const variables = options.variables;
    if (options.forceFetch && observer) {
      // Refresh query
      this._refetch(key, options, variables, observer);
      return observer;
    }
    if (sub) {
      sub.unsubscribe();
    }

    // Create observer
    const newObserver = this.watchQuery(this._generateApolloOptions(options));
    this.el.__apollo_store[key] = { observer: newObserver, variables, options };
    return newObserver;
  }

  refetch(key) {
    const obj = this.el.__apollo_store[key];
    this._refetch(key, obj.options, obj.variables, obj.observer);
  }

  _generateApolloOptions(options) {
    const apolloOptions = omit(options, [
      'error',
      'loadingKey',
      'watchLoading',
      'skip',
    ]);
    return apolloOptions;
  }

  _addPolymerObserver(el, variable, observer) {
    const rand = Math.floor(1000000000 + (Math.random() * 9000000000));
    const rId = `__apollo_${rand}`;
    el[rId] = observer;
    el.observers = el.observers || [];
    el.observers.push(`__apollo_${rand}(${variable})`);
  }

  process(key, options) {
    if (key && options) {
      const el = this.el;
      const $apollo = this;
      let sub;

      const observer = this._processVariables(key, options, sub);

      if (options.skip !== undefined) {
        const _var = options.skip;

        this._addPolymerObserver(el, _var, (newSkipValue) => {
          const storeEntry = el.__apollo_store[key];
          if (!newSkipValue) {
            storeEntry.options.skip = false;
            sub = $apollo._subscribeObservers(key, storeEntry.options, storeEntry.observer);
          } else {
            storeEntry.options.skip = true;
            if (sub) {
              sub.unsubscribe();
              sub = null;
            }
          }
        });

        const prop = deepFind(el.properties, _var);
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
                options.variables[i] = newValue;
                $apollo._refetch(key, options, options.variables, observer);
              }
            });
            const prop = deepFind(el.properties, _var);
            if (prop !== undefined) {
              options.variables[i] = prop.value;
            } else {
              console.error(`Missing "${i}" in properties`);
            }
          }
        }
      }
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
        this.$apollo.process(key, queries[key]);
      }
      // subscribe
      if (apollo.subscribe) {
        // TODO
      }
    }
  }
  attached() {
    this.$apollo.processObservers(this);
  }
  detached() {
    this._apolloSubscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this._apolloSubscriptions = null;
    if (this.$apollo) {
      this.$apollo = null;
    }
  }
}

