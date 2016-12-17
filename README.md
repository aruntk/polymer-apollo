# Polymer-Apollo

[![npm](https://img.shields.io/npm/v/polymer-apollo.svg) ![npm](https://img.shields.io/npm/dm/polymer-apollo.svg)](https://www.npmjs.com/package/vue-apollo)

[Polymer](https://www.polymer-project.org) [apollo](http://www.apollostack.com/) integration.

[GitHunt-Polymer](https://github.com/aruntk/GitHunt-Polymer) - An example of a client-side app built with Polymer and Apollo Client.

[Polymer Apollo Frontpage App](https://github.com/aruntk/polymer-apollo-frontpage) - Polymer Apollo Hello World app

[Polymer Apollo Meteor App](https://github.com/aruntk/polymer-apollo-meteor-demo) - Github api app using polymer-apollo meteor and [synthesis](https://github.com/meteorwebcomponents/synthesis)

## Table of contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage in components](#usage-in-components)
- [Queries](#queries)
  - [Simple query](#simple-query)
  - [Query with parameters](#query-with-parameters)
  - [Advanced options](#advanced-options)
  - [Refetch Query Example](#refetch-query)
  - [Skip Query Example](#skip-query-example)
  - [Reactive Query Example](#reactive-query-example)
- [Fragments](#fragments)
- [Mutations](#mutations)
- [Subscriptions](#subscriptions)
- [Pagination with `fetchMore`](#pagination-with-fetchmore)

## Installation

    npm install --save polymer-apollo apollo-client

## Usage

### Configuration

```js
//config.js
import ApolloClient, { createNetworkInterface, addTypename } from './apollo-client';
import { PolymerApollo } from 'polymer-apollo';

// Create the apollo client
const apolloClient = new ApolloClient({
  networkInterface: createNetworkInterface({
    uri: 'http://localhost:8080/graphql',
    transportBatching: true,
  }),
  queryTransformer: addTypename,
});

//create a new polymer behavior from PolymerApollo class.
export const PolymerApolloBehavior = new PolymerApollo({apolloClient})
```

### Usage in components

Add the created behavior in your element's behaviors array

To declare apollo queries in your polymer component, add an `apollo` object :

```js
//my-element.js
import { PolymerApolloBehavior } from "./config.js";
Polymer({
    is:"my-element",
    behaviors:[ PolymerApolloBehavior ],
    apollo: {
        // Apollo specific options
    },
    ...
});
```

You can access the [apollo-client](http://dev.apollodata.com/core/apollo-client-api.html) instance with `this.$apollo.client` in all your polymer components.

### Queries

In the `apollo` object, add an attribute for each property you want to feed with the result of an Apollo query.

#### Simple query

Use `gql` to write your GraphQL queries:

```js
import gql from 'graphql-tag';
```

Put the [gql](http://docs.apollostack.com/apollo-client/core.html#gql) query directly as the value:

```js
apollo: {
  // Simple query that will update the 'hello' polymer property
  hello: gql`{hello}`,
},
```

Don't forget to initialize your property in your polymer component:

```js
//my-element.js
...
properties : {
    // Initialize your apollo data
    hello: String,
},
...
```

Server-side, add the corresponding schema and resolver:

```js
export const schema = `
type Query {
  hello: String
}

schema {
  query: Query
}
`;

export const resolvers = {
  Query: {
    hello(root, args, context) {
      return "Hello world!";
    },
  },
};
```

For more info, visit the [apollo doc](http://dev.apollodata.com/tools/).

You can then use your property as usual in your polymer component:

```html
<!--my-element.js-->
<dom-module id="my-element">
<template>
  <div class="apollo">
    <h3>Hello</h3>
    <p>
      {{hello}}
    </p>
  </div>
</template>
</dom-module>
```

#### Query with parameters

You can add variables (read parameters) to your `gql` query by declaring `query` and `variables` in an object:

Options can be computed properties or static.

eg 
```js
...
apollo: {
  query1: {
    query: someQuery,
    options: 'computedFn(prop1, prop2)',
  }
},
computedFn: function(prop1, prop2) {
  return { variables: { var1: prop1, var2: prop2 + 10 } };
},
...
```
. In this graphql variables var1 and var2 change when the polymer properties prop1 and prop2 change (similar to computed feature);

```js
// Apollo-specific options
apollo: {
  // Query with parameters
  ping: {
    // gql query
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    options: 'computedFn(prop1)',
  },
},
computedFn: function(prop1, prop2) {
  return { variables: { message: `${prop1} ping...`} };
},
```

In the above example you can use the apollo `watchQuery` options in the property ping or in the computed function return, like:
 - `forceFetch`
 - `fragments`
 - `returnPartialData`
 - `pollInterval`
 - ...

See the [apollo doc](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.watchQuery) for more details.

For example, you could add the `forceFetch` apollo option like this:

```js
apollo: {
  // Query with parameters
  pingQuery: {
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    options: 'computedFn(prop1, prop2)',
    // Additional options here. static.
    forceFetch: true,
  },
},
computedFn: function(prop1, prop2) {
  // Additional options if added here becomes reactive
  return {
  variables: {
    message: prop1,
  },
    skip: prop2,
  };
},
```

Don't forget to initialize your property in your polymer component.

```js
//my-element.js
...
properties {
    // Initialize your apollo data
    ping: String,
},
...
```

Server-side, add the corresponding schema and resolver:

```js
export const schema = `
type Query {
  ping(message: String!): String
}

schema {
  query: Query
}
`;

export const resolvers = {
  Query: {
    ping(root, { message }, context) {
      return `Answering ${message}`;
    },
  },
};
```

And then use it in your polymer component:

```html
<dom-module id="my-element">
<template>
  <div class="apollo">
    <h3>Ping</h3>
    <p>
      {{ping}}
    </p>
  </div>
</template>
</dom-module>
```
#### options

Options can be added in two ways - computed and static.

computed eg.

```js
apollo: {
  // Query with parameters
  ping: {
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    options: 'computedFn(prop1,prop2)',
    // Additional options here. static.
    forceFetch: true,
  },
},
computedFn: function(prop1, prop2) {
  // Additional options if added here becomes reactive
  return {
  variables: {
    message: prop1,
  },
    skip: prop2,
  };
},
```

static eg.

```js
apollo: {
  // Query with parameters
  ping: {
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    options: {
      variables: {
        message: 'hai',
      },
      skip: true,
    },
    },
    // Additional options here. static. you can add skip here also
    forceFetch: true,
  },
},
```

#### Advanced Options

##### Options

You can add these to options/directly to the ping property in the above example if you dont want them to be polymer reactive.

- `skip` Used to set the state of the query subscribtion. Check example below.
- `loadingKey` will update the component data property you pass as the value. You should initialize this property to `false` in properties. When the query is loading, this property will be set to `true` and as soon as it no longer is, the property will be set to `false`.

##### Hooks

These are the available advanced options you can use:
- `error(error)` is a hook called when there are errors, `error` being an Apollo error object with either a `graphQLErrors` property or a `networkError` property.
- `success(result)` is a hook called when query/subscription returns successfully. Note. result = { data, loading, networkStatus}
- `watchLoading(isLoading)` is a hook called when the loading state of the query changes.


```js
// Apollo-specific options
apollo: {
  // Advanced query with parameters
  pingMessage: {
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    // Reactive parameters
    options: 'computedFn(prop1, prop2)',

    // Loading state
    // loadingKey is the name of the data property
    // that will be unset when the query is loading
    // and set when it no longer is.
    loadingKey: 'loadingQueriesCount',
    // Error handling
    error(error) {
      console.error('We\'ve got an error!', error);
    },
    success(result) {
      console.error('Success.!', result); // result is of the format { data, loading, networkStatus };
    },
    // watchLoading will be called whenever the loading state changes
    watchLoading(isLoading) {
      // isLoading is a boolean
    },
  },
},
computedFn: function(prop1, prop2) {
  return { variables: { message: `${prop1} ping...`}, skip: prop2 };
},
```

### Refetch Query

Use $`apollo.refetch(key);`

```html
<paper-icon-button on-tap="refetchTags" icon="refresh"></paper-icon-button>
```

```js
// Apollo-specific options
apollo: {
  // 'tags' property of your polymer element
  tags: {
    query: gql`query tagList {
      tags {
        id,
        label
      }
    }`,
  },
},
refetchTags(){
   this.$apollo.refetch("tags");
}
```

### Reactive Query Example

Here is a reactive query example using polling:

```js
// Apollo-specific options
apollo: {
  // 'tags' property of your polymer element
  tags: {
    query: gql`query tagList {
      tags {
        id,
        label
      }
    }`,
    options: 'computedFn(prop1, prop2)',
  },
},
computedFn: function(prop1, prop2) {
  return {
    variables: { var1: prop1 },
    pollInterval: prop2, // ms
  };
},
```

Here is how the server-side looks like:

```js
export const schema = `
type Tag {
  id: Int
  label: String
}

type Query {
  tags: [Tag]
}

schema {
  query: Query
}
`;

// Fake word generator
import casual from 'casual';

// Let's generate some tags
var id = 0;
var tags = [];
for (let i = 0; i < 42; i++) {
  addTag(casual.word);
}

function addTag(label) {
  let t = {
    id: id++,
    label,
  };
  tags.push(t);
  return t;
}

export const resolvers = {
  Query: {
    tags(root, args, context) {
      return tags;
    },
  },
};
```
### Skip query example

```js
properties: {
  ...

  isNotAuth: {
    type: Boolean,
    value: true
  }
},

...

// Apollo-specific options
apollo: {
  // 'tags' property of your polymer element
  tags: {
    query: gql`query tagList {
      tags {
        id,
        label
      }
    }`,
    options: 'computedFn(prop1, prop2)',
  },
},
computedFn: function(prop1, prop2) {
  return {
    variables: { var1: prop1 },
    skip: prop2, // Boolean
  };
},

### fragments


```js
import gql from 'graphql-tag';

const fragment = gql`fragment CommonFields on tags {
  id,
  label
}`;
```

Embed the fragment in your query document directly with:

```js
import gql from 'graphql-tag';
// Apollo-specific options
apollo: {
  // 'tags' property of your polymer element
  tags: {
    query: gql`query tagList {
      tags: tags(rate: 0) {
        ...CommonFields
      },
      besttags: tags(rate: 10) {
        ...CommonFields
      }
    }
    ${fragment}`
  },
},
```

### Mutations

Mutations are queries that changes your data state on your apollo server. For more info, visit the [apollo doc](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.mutate).

```js
  addTag() {
    // We save the user input in case of an error
    const newTag = this.newTag;
    // We clear it early to give the UI a snappy feel
    this.newTag = '';
    // Call to the graphql mutation
    this.$apollo.mutate({
      // Query
      mutation: gql`mutation ($label: String!) {
        addTag(label: $label) {
          id
          label
        }
      }`,
      // Parameters
      variables: {
        label: newTag,
      },
      // Update the cache with the result
      // 'tagList' is the name of the query declared before
      // that will be updated with the optimistic response
      // and the result of the mutation
      updateQueries: {
        tagList: (previousQueryResult, { mutationResult }) => {
          // We incorporate any received result (either optimistic or real)
          // into the 'tagList' query we set up earlier
          return {
            tags: [...previousQueryResult.tags, mutationResult.data.addTag],
          };
        },
      },
      // Optimistic UI
      // Will be treated as a 'fake' result as soon as the request is made
      // so that the UI can react quickly and the user be happy
      optimisticResponse: {
        __typename: 'Mutation',
        addTag: {
          __typename: 'Tag',
          id: -1,
          label: newTag,
        },
      },
    }).then((data) => {
      // Result
      console.log(data);
    }).catch((error) => {
      // Error
      console.error(error);
      // We restore the initial user input
      this.set("newTag",newTag);
    });
  },
},
```

Server-side:

```js
export const schema = `
type Tag {
  id: Int
  label: String
}

type Query {
  tags: [Tag]
}

type Mutation {
  addTag(label: String!): Tag
}

schema {
  query: Query
  mutation: Mutation
}
`;

// Fake word generator
import faker from 'faker';

// Let's generate some tags
var id = 0;
var tags = [];
for (let i = 0; i < 42; i++) {
  addTag(faker.random.word());
}

function addTag(label) {
  let t = {
    id: id++,
    label,
  };
  tags.push(t);
  return t;
}

export const resolvers = {
  Query: {
    tags(root, args, context) {
      return tags;
    },
  },
  Mutation: {
    addTag(root, { label }, context) {
      console.log(`adding tag '${label}'`);
      return addTag(label);
    },
  },
};
```
## Subscriptions

To make enable the websocket-based subscription, a bit of additional setup is required:

```javascript
import ApolloClient, { createNetworkInterface } from 'apollo-client';
// New Imports
import { Client } from 'subscriptions-transport-ws';
import { PolymerApollo } from 'polymer-apollo';
import { print } from 'graphql-tag/printer';

// quick way to add the subscribe and unsubscribe functions to the network interface
const addGraphQLSubscriptions = (networkInterface, wsClient) => Object.assign(networkInterface, {
  subscribe: (request, handler) => wsClient.subscribe({
    query: print(request.query),
    variables: request.variables,
  }, handler),
  unsubscribe: (id) => {
    wsClient.unsubscribe(id);
  },
});

// Create the network interface
const networkInterface = createNetworkInterface({
  uri: 'http://localhost:3000/graphql',
  transportBatching: true,
});

// Create the subscription websocket client
const wsClient = new Client('ws://localhost:3030');

// Extend the network interface with the subscription client
const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
  networkInterface,
  wsClient,
);

// Create the apollo client with the new network interface
const apolloClient = new ApolloClient({
  networkInterface: networkInterfaceWithSubscriptions,
});

//create a new polymer behavior from PolymerApollo class.
export const PolymerApolloBehavior = new PolymerApollo({apolloClient})

// Your app is now subscription-ready!


```

Use the `$apollo.subscribe()` method to subscribe to a GraphQL subscription that will get killed automatically when the component is detached. To disable this feature set onReady = true. :

```javascript
attached() {
  const subQuery = gql`subscription tags($type: String!) {
    tagAdded(type: $type) {
      id
      label
      type
    }
  }`;

  const observer = this.$apollo.subscribe({
    query: subQuery,
    variables: {
      type: 'City',
    },
  });

  observer.subscribe({
    next(data) {
      console.log(data);
    },
    error(error) {
      console.error(error);
    },
  });
},
```

You can declare subscriptions in the `apollo` option with the `subscribe` keyword:

```javascript
apollo: {
  // Subscriptions
  subscribe: {
    // When a tag is added
    tags: {
      query: gql`subscription tags($type: String!) {
        tagAdded(type: $type) {
          id
          label
          type
        }
      }`,
      options: 'getCity(city)',
      // Reactive variables

      // Result hook
      result(data) {
        console.log(data);
        // Let's update the local data
        this.tags.push(data.tagAdded);
      },
    },
  },
},
getCity(city) {
    return {
      variables: {
        // This works just like regular queries
        // and will re-subscribe with the right variables
        // each time the values change
        type: city,
      },
    };
},
```

You can then access the subscription `ObservableQuery` object with `this.$apollo.subscriptions.<name>`.

## Pagination with `fetchMore`

Use the `fetchMore()` method on the query:

```javascript
<template>
  <div>
    <h2>Pagination</h2>
    <div class="tag-list" hidden="{{!tagsPage}}">
      <template is="dom-repeat" items="[[tagsPage.tags]]" as="tag">
        <div class="tag-list-item">
          {{ tag.id }} - {{ tag.label }} - {{ tag.type }}
        </div>
      </template>
      <div class="actions">
        <paper-button hidden="{{!showMoreEnabled}}" on-tap="showMore">Show more</paper-button>
      </div>
    </div>
  </div>
</template>

<script>
import gql from 'graphql-tag';

Polymer({
  is: 'example-element',
  properties: {
    page: {
      type: Number,
      value: 0,
    },
    pageSize: {
      type: Number,
      value: 10,
    },
    showMoreEnabled: {
      type: Number,
      value: true,
    },
  },
  apollo: {
    // Pages
    tagsPage: {
      // GraphQL Query
      query: gql`query tagsPage ($page: Int!, $pageSize: Int!) {
        tagsPage(page: $page, size: $pageSize) {
          tags {
            id
            label
            type
          }
          hasMore
        }
      }`,
      options: {
        // Initial variables
        variables: {
          page: 'page',
          pageSize: 'pageSize',
        },
      },

    },
  },
  showMore() {
    this.page ++;
    // Fetch more data and transform the original result
    this.$apollo.queries.tagsPage.fetchMore({
      // New variables
      variables: {
        page: this.page,
        pageSize: 20,
      },
      // Transform the previous result with new data
      updateQuery: (previousResult, { fetchMoreResult }) => {
        const newTags = fetchMoreResult.data.tagsPage.tags;
        const hasMore = fetchMoreResult.data.tagsPage.hasMore;

        this.showMoreEnabled = hasMore;

        return {
          tagsPage: {
            // Merging the tag list
            tags: [...previousResult.tagsPage.tags, ...newTags],
            hasMore,
          },
        };
      },
    });
  },
};
</script>
```

Similar to fetchMore the following methods can be used. for queries $apollo.queries[name] for subscriptions $apollo.subscriptions[name]

* refetch()
* fetchMore()
* updateQuery()
* startPolling()
* stopPolling()
* subscribeToMore()
* currentResult()
* variables : an object containing variables used to get this result.
* loading : boolean, useful if you set notifyOnNetworkStatusChange to true in query options.
* networkStatus : the status of the request ,useful if you set notifyOnNetworkStatusChange to true in query options

---

Contributors

Anthony Hinsinger ([@atoy40](https://github.com/atoy40))

Arun Kumar T K ([@aruntk](https://github.com/aruntk))

