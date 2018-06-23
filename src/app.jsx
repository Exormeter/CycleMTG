import xs from 'xstream';
import flattenSequentially from 'xstream/extra/flattenConcurrently';
import delay from 'xstream/extra/delay';
import gql from 'graphql-tag';
import {div, p, ul, button, li, h, img, input, span} from '@cycle/dom';
import {StateSource, makeCollection} from 'cycle-onionify';
import Item from './components/Item'
import isolate from '@cycle/isolate';
import { compose } from 'redux';

const fetchCards = gql`
  query ($cmc: Int){
    cards (cmc: $cmc){
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
      list: prevState.list.concat({content, key: String(Date.now())}),
    };
  });

  return xs.merge(initReducer$, addReducer$);
}
  
  

function intent(domSource) {
  return {
    cardStream$: domSource.select('.inputCMC').events('keyup').map((ev) => {
      const cmc = ev.target.value;
      return {
        query: fetchCards,
        variables: { cmc: cmc }, 
        category: 'cards'
      };
    })
  };
}

export function App (sources) {

  const data$ = sources.Apollo.select('cards')
    .flatten();


  const cards$ = data$.map( data =>{
    return xs.fromArray(data);
  }).compose(flattenSequentially).compose(delay(100)).map( card =>{
    return card;
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
  const parentReducer$ = model(cards$);
  const listReducer$ = listSinks.onion;
  const listHTTP$ = listSinks.HTTP;
  const reducer$ = xs.merge(parentReducer$, listReducer$);
  const vDom$ = view(listSinks.DOM)


  const sinks = {
    DOM: vDom$,
    HTTP: listHTTP$,
    Apollo: action$.cardStream$,
    onion: reducer$
  }
  return sinks
}
