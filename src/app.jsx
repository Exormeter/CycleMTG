import xs from 'xstream';
import gql from 'graphql-tag';
import {div, p, ul, button, input, span, select, option} from '@cycle/dom';
import {StateSource, makeCollection} from 'cycle-onionify';
import Item from './components/Item'
import isolate from '@cycle/isolate';
const uuidv4 = require('uuid/v4');

const fetchCards = gql`
  query ($cmc: Int, $rarity: String){
    cards (cmc: $cmc, rarity: $rarity){
      cmc
      name
      type
      text
    }
  }`

function view(listVNode$) {
  return listVNode$.map(ulVNode =>
    div([
      span('Manakosten: '),
      input('.inputCMC', {attrs: {type: 'text'}}),
      select('.inputRarity', [option({attrs: {value: "Rare"}}, "Rare"), option({attrs: {value: "Uncommon"}}, "Uncommon"), option({attrs: {value: "Common"}}, "Common")]),
      input('.filterWhite', {attrs: {type: 'checkbox'}}), 'Weiß',
      input('.filterBlack', {attrs: {type: 'checkbox'}}), 'Schwarz',
      input('.filterBlue', {attrs: {type: 'checkbox'}}), 'Blau',
      input('.filterGreen', {attrs: {type: 'checkbox'}}), 'Grün',
      input('.filterRed', {attrs: {type: 'checkbox'}}), 'Rot',
      ulVNode
    ])
  );
}

function model(actions) {
  const initReducer$ = xs.of(function initReducer(State) {
    return {
      list: [],
    };
  });

  const addReducer$ = actions
  .map(content => function addReducer(prevState) {
    return {
      list: content
    };
  });

  return xs.merge(initReducer$, addReducer$);
}
  


function intent(domSource) {
    const queryCMC$ = domSource.select('.inputCMC').events('keyup').map((ev) => {
      return {cmc: parseInt(ev.target.value)}
    })

    const queryRarity$ = domSource.select('.inputRarity').events('input').map(ev =>{
      return {rarity: ev.target.value}
    })

    return{
      query$: xs.merge(queryCMC$, queryRarity$).fold((query, current) =>{
        if(current.cmc != undefined){
          query.variables.cmc = current.cmc;
        }
        else if(current.rarity != ""){
          query.variables.rarity = current.rarity;
        }
        return query
      }
        , {query: fetchCards, variables: {cmc: -1, rarity:""}, category: 'cards'})
      .filter(query => query.variables.cmc !== -1)
      .debug()
    }
}

export function App (sources) {

  const data$ = sources.Apollo.select('cards')
    .flatten()
    .map(data => {
      return data.map(card => {
        return {
          card,
          key: uuidv4()
        }
      })
    });

  const List = makeCollection({
    item: Item,
    itemKey: s => s.key,
    itemScope: key => key,
    collectSinks: instances => ({
      DOM: instances.pickCombine('DOM')
        .map((itemVNodes) => ul(itemVNodes)),
      onion: instances.pickMerge('onion'),
      HTTP: instances.pickMerge('HTTP')
    })
  });
  
  const listSinks = isolate(List, 'list')(sources)
  const action$ = intent(sources.DOM);
  const parentReducer$ = model(data$);
  const listReducer$ = listSinks.onion;
  const listHTTP$ = listSinks.HTTP;
  const reducer$ = xs.merge(parentReducer$, listReducer$);
  const vDom$ = view(listSinks.DOM)


  const sinks = {
    DOM: vDom$,
    HTTP: listHTTP$,
    Apollo: action$.query$,
    onion: reducer$
  }
  return sinks
}
