# Polymer-Apollo

[Polymer](https://www.polymer-project.org) [apollo](http://www.apollostack.com/) integration.

[Polymer Apollo Frontpage App](https://github.com/aruntk/polymer-apollo-frontpage)

[Polymer Apollo Meteor App](https://github.com/aruntk/polymer-apollo-meteor-demo)


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
- [Mutations](#mutations)

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

Variable values are paths to Polymer element properties.

eg `variables:{limit:"route.limit"}` . In this graphql variable limit changes when the polymer property route.limit changes (similar to observer);

```js
// Apollo-specific options
apollo: {
  // Query with parameters
  ping: {
    // gql query
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    // Reactive parameters
    variables: {
      message: 'property.path',
    },
  },
},
```

You can use the apollo `watchQuery` options in the object, like:
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
  ping: {
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    variables: {
      message: 'property.path'
    },
    // Additional options here
    forceFetch: true,
  },
},
```

Don't forget to initialize your property in your polymer component:

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
#### Advanced options

These are the available advanced options you can use:
- `error(error)` is a hook called when there are errors, `error` being an Apollo error object with either a `graphQLErrors` property or a `networkError` property.
- `loadingKey` will update the component data property you pass as the value. You should initialize this property to `false` in properties. When the query is loading, this property will be set to `true` and as soon as it no longer is, the property will be set to `false`.
- `watchLoading(isLoading)` is a hook called when the loading state of the query changes.
- `skip` can be a path to a Polymer element boolean property used to set the state of the query subscribtion. Check example below.


```js
// Apollo-specific options
apollo: {
  // Advanced query with parameters
  pingMessage: {
    query: gql`query PingMessage($message: String!) {
      ping(message: $message)
    }`,
    // Reactive parameters
    variables: {
      // observes propery changes
      message: "propety.path",
    },
    // Error handling
    error(error) {
      console.error('We\'ve got an error!', error);
    },
    // Loading state
    // loadingKey is the name of the data property
    // that will be incremented when the query is loading
    // and decremented when it no longer is.
    loadingKey: 'loadingQueriesCount',
    // watchLoading will be called whenever the loading state changes
    watchLoading(isLoading) {
      // isLoading is a boolean
      // countModifier is either 1 or -1
    },
  },
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
    pollInterval: 300, // ms
  },
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
    skip: 'isNotAuth', // ms
  },
},

listeners: {
  'auth-changed': '_onAuthChanged'
},

_onAuthChanged: function(e) {
  this.isNotAuth = !e.detail.userid;
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

---

Created by Arun Kumar T K (@aruntk)

Inspired by Guillaume Chau's [vue-apollo](https://github.com/Akryum/vue-apollo) project
