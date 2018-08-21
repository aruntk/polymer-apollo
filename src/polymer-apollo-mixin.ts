import clone from 'lodash.clone';
import PolymerApollo from './polymer-apollo';
import { PolymerElement, ApolloClient, ApolloQueryResult } from '../types';

export interface ApolloMixinOptions<TCacheShape> {
  apolloClient: ApolloClient<TCacheShape>
}

export interface GraphQLOptions {
  variables?: {
    [variableName: string]: string | number
  }
  skip?: boolean
  forceFetch?: boolean
  onReady?: boolean
  loadingKey?: string
  error?: (error: Error) => void
  success?: <T>(result: ApolloQueryResult<T>) => void
  watchLoading?: (isLoading: boolean) => void
}

export interface GraphQLRequest extends GraphQLOptions {
  query?: any
  mutation?: any
  options?: string | GraphQLOptions
}

const PolymerApolloMixin = (
  { apolloClient }: ApolloMixinOptions<{}>,
  superClass: new () => PolymerElement,
) => class extends superClass {
  public _apolloClient: ApolloClient<{}> = apolloClient;
  public $apollo = new PolymerApollo(this, this._apolloClient);
  // TODO: Append types
  public apollo?: {
    [requestName: string]: GraphQLRequest
  }

  public constructor() {
    super();
    const apollo = this.apollo;
    if (apollo) {
      this.$apollo.createApolloOptions(apollo);
    }
  }

  public connectedCallback() {
    const apollo = this.apollo;
    this.$apollo = clone(this.$apollo);
    if (apollo) {
      this.$apollo.attached = true;
      this.$apollo.init(this);
    }
    super.connectedCallback();
    if (apollo) {
      this.$apollo.start(this);
    }
  }

  public disconnectedCallback() {
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

export default PolymerApolloMixin;
