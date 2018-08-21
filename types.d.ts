import { PolymerElement } from '@polymer/polymer/polymer-element'
import { ApolloClient, ApolloQueryResult } from 'apollo-client'

export type PolymerElement = PolymerElement

export type ApolloQueryResult<T> = ApolloQueryResult<T>

export interface ApolloClient<TCacheShape> extends ApolloClient<TCacheShape> {}
