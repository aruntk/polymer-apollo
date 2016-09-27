import _ from 'lodash';
function deepFind(obj, path) {
  var paths = path.split('.')
    , current = obj
    , i;

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
      const queries = _.omit(apollo, [
        'subscribe',
      ]);

      // watchQuery
      for (let key in queries) {
        this.$apollo.option(key, queries[key]);

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
    el._apolloObservers = [];
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
    _.map(el._apolloObservers,({key,observer,options,variables})=>{
      $apollo._subscribeObservers(key,observer,options,variables,el);
    }); 
  }
  _subscribeObservers(key,observer,options,variables,el){
    let firstLoadingDone = false;

    let loadingKey = options.loadingKey;
    let loadingChangeCb = options.watchLoading;
    applyLoadingModifier(1);
    if (typeof loadingChangeCb === 'function') {
      loadingChangeCb = loadingChangeCb.bind(el);
    }
    const sub = observer.subscribe({
      next: nextResult,
      error: catchError
    });
    function nextResult({ data }) {
      applyData(data);
    }

    function applyData(data) {
      loadingDone();
      if (data[key] === undefined) {
        console.error(`Missing "${key}" in properties`, data);
      } else {
        el[key] = data[key];
      }
    }

    function catchError(error) {
      loadingDone();

      if (error.graphQLErrors && error.graphQLErrors.length !== 0) {
        console.error(`GraphQL execution errors for query ${query}`);
        for (let e of error.graphQLErrors) {
          console.error(e);
        }
      } else if (error.networkError) {
        console.error(`Error sending the query ${query}`, error.networkError);
      } else {
        console.error(error);
      }

      if (typeof options.error === 'function') {
        options.error(error);
      }
    }
    function applyLoadingModifier(value) {
      if (loadingKey) {
        el[loadingKey] += value;
      }

      if (loadingChangeCb) {
        loadingChangeCb(value === 1, value);
      }
    }

    function loadingDone() {
      if (!firstLoadingDone) {
        applyLoadingModifier(-1);
        firstLoadingDone = true;
      }
    }



  }

  option(key, options) {
    const el = this.el;
    const $apollo = this;

    let query, observer, sub;

    // Simple query
    if (!options.query) {
      query = options;
    }
    function generateApolloOptions(variables) {
      const apolloOptions = _.omit(options, [
        'variables',
        'error',
        'loadingKey',
        'watchLoading',
      ]);
      apolloOptions.variables = variables;
      return apolloOptions;
    }

    function q(variables) {
      if (options.forceFetch && observer) {
        // Refresh query
        observer.refetch(variables, {
          forceFetch: !!options.forceFetch
        });
      } else {
        if (sub) {
          sub.unsubscribe();
        }

        // Create observer
        observer = $apollo.watchQuery(generateApolloOptions(variables));
        el._apolloObservers.push({key:key,observer:observer,variables:variables,options:options});

      }
    }
    for(let i in options.variables){
      let _var = options.variables[i];
      const rand = Math.floor(1000000000 + Math.random() * 9000000000);
      const r_id = `__apollo_${rand}`;
      el[r_id] = (newValue)=>{
        const opt = options;
        opt.variables[i] = newValue;
        q(opt.variables);
      }
      el.observers = el.observers || [];
      el.observers.push(`__apollo_${rand}(${_var})`);
      const prop = deepFind(el.properties,_var);
      if(prop === undefined){
        _var = prop.value; 
      }
      else{
        console.error(`Missing "${i}" in properties`);
      }
      options.variables[i] = _var;
    }
    q(options.variables);

  }
}

