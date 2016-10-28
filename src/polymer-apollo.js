import omit from 'lodash.omit';
import map from 'lodash.map';
function deepFind(obj, path) {
  let paths = path.split('.'),
    current = obj,
    i;

  for (i = 0; i < paths.length; ++i) {
    if (current[paths[i]] == undefined) {
      return undefined;
    } else {
      current = current[paths[i]];
    }
  }
  return current;
}
export class PolymerApollo {
  constructor(options){
    this._apolloClient = options.apolloClient;
    this._apolloSubscriptions = [];
    this.properties = {};
  }
  beforeRegister(){
    let apollo = this.apollo;
    this.$apollo = new DollarApollo(this);

    if (apollo) {
      const queries = omit(apollo, [
        'subscribe',
      ]);

      // watchQuery
      for (let key in queries) {
        this.$apollo.process(key, queries[key]);

      }

      // subscribe
      if (apollo.subscribe) {
        // TODO
      }
    }

  }

  attached(){
    let apollo = this.apollo;

    this.$apollo.processObservers(this);
  }
  detached(){
    this._apolloSubscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this._apolloSubscriptions = null;
    if (this.$apollo) {
      this.$apollo = null;
    }

  }
}

class DollarApollo {
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
    observable.subscribe = (function(options) {
      let sub = _subscribe(options);
      el._apolloSubscriptions.push(sub);
      return sub;
    }).bind(observable);
    return observable;
  }

  get mutate() {
    return this.client.mutate;
  }
  processObservers (el) {
    // Create subscription
    const $apollo = this;
this.el = el;
    for(let i in el.__apollo_store){
      const obj = el.__apollo_store[i];
      $apollo._subscribeObservers(i,obj.options,obj.observer);

    }
  }
  _subscribeObservers(key,options,observer){
    let firstLoadingDone = false;
    const el = this.el;
    let loadingKey = options.loadingKey;
    let loadingChangeCb = options.watchLoading;
    this._changeLoader(loadingKey,true,loadingChangeCb);
    if (typeof loadingChangeCb === 'function') {
      loadingChangeCb = loadingChangeCb.bind(el);
    }
    const sub = observer.subscribe({
      next: nextResult,
      error: catchError
    });
    const $apollo = this;
    function nextResult({ data }) {
      $apollo._changeLoader(loadingKey,false,loadingChangeCb);
      $apollo._applyData(data,key);
    }
    function catchError(error) {
      $apollo._changeLoader(loadingKey,false,loadingChangeCb);

      if (error.graphQLErrors && error.graphQLErrors.length !== 0) {
        console.error(`GraphQL execution errors for query ${key}`);
        for (let e of error.graphQLErrors) {
          console.error(e);
        }
      } else if (error.networkError) {
        console.error(`Error sending the query ${key}`, error.networkError);
      } else {
        console.error(error);
      }

      if (typeof options.error === 'function') {
        options.error(error);
      }
    }


  }

  _applyData(data,key) {
    if (data[key] === undefined) {
      console.error(`Missing "${key}" in properties`, data);
    } else {
      this.el[key] = data[key];
    }
  }

  _changeLoader(loadingKey,value,loadingChangeCb) {
    if (loadingKey) {
      this.el[loadingKey] = value;
    }

    if (loadingChangeCb) {
      loadingChangeCb(value);
    }
  }
  _refetch(key,options,variables,observer){
    const  el = this.el;
    let loadingKey = options.loadingKey;
    let loadingChangeCb = options.watchLoading;
    this._changeLoader(loadingKey,true,loadingChangeCb);
    if (typeof loadingChangeCb === 'function') {
      loadingChangeCb = loadingChangeCb.bind(el);
    }

    observer.refetch(variables, {
      forceFetch: !!options.forceFetch
    }).then(nextResult,catchError);
    const $apollo = this;
    function nextResult({ data }) {
      $apollo._changeLoader(loadingKey,false,loadingChangeCb);
      $apollo._applyData(data,key);
    }
    function catchError(error) {
      $apollo._changeLoader(loadingKey,false,loadingChangeCb);

      if (error.graphQLErrors && error.graphQLErrors.length !== 0) {
        console.error(`GraphQL execution errors for query ${key}`);
        for (let e of error.graphQLErrors) {
          console.error(e);
        }
      } else if (error.networkError) {
        console.error(`Error sending the query ${key}`, error.networkError);
      } else {
        console.error(error);
      }

      if (typeof options.error === 'function') {
        options.error(error);
      }
    }
  }
  _processVariables(key,options,sub,observer){
    let variables = options.variables;
    if (options.forceFetch && observer) {
      // Refresh query
      this._refetch(key,options,variables,observer);
    } else {
      if (sub) {
        sub.unsubscribe();
      }

      // Create observer
      observer = this.watchQuery(this._generateApolloOptions(options));
      this.el.__apollo_store[key] = {observer,variables,options};

    }
    return observer;
  }
  refetch(key){
    const obj = this.el.__apollo_store[key];
    this._refetch(key,obj.options,obj.variables,obj.observer);
  }
  _generateApolloOptions(options) {
    const apolloOptions = omit(options, [
      'error',
      'loadingKey',
      'watchLoading',
    ]);
    return apolloOptions;
  }
  process(key, options) {
    const el = this.el;
    const $apollo = this;
    let query, observer, sub;
    // Simple query
    if (!options.query) {
      query = options;
    }

    observer = this._processVariables(key,options,sub,observer);

    for(let i in options.variables){
      let _var = options.variables[i];
      const rand = Math.floor(1000000000 + Math.random() * 9000000000);
      const r_id = `__apollo_${rand}`;
      el[r_id] = function(newValue){
        options.variables[i] = newValue;
        $apollo._refetch(key,options,options.variables,observer);
      };
      el.observers = el.observers || [];
      el.observers.push(`__apollo_${rand}(${_var})`);
      const prop = deepFind(el.properties,_var);
      //if(prop !== undefined){
      _var = prop; 
      //}
      //else{
      //console.error(`Missing "${i}" in properties`);
      //}
      options.variables[i] = _var;
    }

  }
}

