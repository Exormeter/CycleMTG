import {run} from '@cycle/run'
import {makeDOMDriver} from '@cycle/dom'
import {makeHTTPDriver} from '@cycle/http'
import {makeApolloDriver} from 'cycle-apollo'
import ApolloClient, {createNetworkInterface} from 'apollo-client'
import onionify from 'cycle-onionify';

import {App} from './app'

const main = onionify(App)



const networkInterface = createNetworkInterface({
  uri: "https://alluring-saguaro-38302.herokuapp.com/graphql"
});


const client = new ApolloClient({ networkInterface });

const drivers = {
  DOM: makeDOMDriver('#root'),
  Apollo: makeApolloDriver(client),
  HTTP: makeHTTPDriver()
};

run(main, drivers)



