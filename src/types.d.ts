import { PolymerElement } from '@polymer/polymer/polymer-element'
import { ApolloClient, ApolloQueryResult } from 'apollo-client'

export type PolymerElement = typeof PolymerElement

export type ApolloQueryResult<T> = ApolloQueryResult<T>

export interface ApolloClient<TCacheShape> extends ApolloClient<TCacheShape> {}

export interface ApolloElement<TCacheShape> extends PolymerElement {
  _apolloClient: ApolloClient<TCacheShape>
}
