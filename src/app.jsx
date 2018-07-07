import xs from 'xstream';
import gql from 'graphql-tag';
import {div, p, ul, button, input, span, select, option, label} from '@cycle/dom';
import { makeCollection} from 'cycle-onionify';
import Item from './components/Item'
import isolate from '@cycle/isolate';
const uuidv4 = require('uuid/v4');

const fetchCards = gql`
  query ($cmc: Int, $rarity: String, $colors: [String], $types: String){
    cards (cmc: $cmc, rarity: $rarity, colors: $colors, types: $types){
      cmc
      name
      type
      text
      colors
    }
  }
`

function view(listVNode$) {
  return listVNode$.map(ulVNode =>
    div([
      div([
        label({style: {"margin-right": '23px', "font-family": "Open Sans"}}, 'Manacosts:'),
        input('.inputCMC', {attrs: {type: 'text'}}),
      ]),
      div([
        label({style: {"margin-right": '60px', "font-family": "Open Sans"}}, 'Rarity:'),
        select('.inputRarity', [option({attrs: {value: ""}}, "All"), option({attrs: {value: "Mythic Rare"}}, "Mythic"),option({attrs: {value: "Rare"}}, "Rare"), option({attrs: {value: "Uncommon"}}, "Uncommon"), option({attrs: {value: "Common"}}, "Common")]),
      ]),
      div([
        label({style: {"margin-right": '67px', "font-family": "Open Sans"}}, 'Type:'),
        select('.inputType', [option({attrs: {value: ""}}, "All"), option({attrs: {value: "Creature"}}, "Creature"),option({attrs: {value: "Planeswalker"}}, "Planeswalker"), option({attrs: {value: "Enchantment"}}, "Enchantment"), option({attrs: {value: "Artifact"}}, "Artifact"), option({attrs: {value: "Instant"}}, "Instant"), option({attrs: {value: "Sorcery"}}, "Sorcery")]),
      ]),
      div([
        span({style: {"font-family": "Open Sans"}},'Color: '),
        input('.filterWhite', {attrs: {type: 'checkbox'}, style: {"font-family": "Open Sans"}}), 'Weiß',
        
        input('.filterBlack', {attrs: {type: 'checkbox'}, style: {"font-family": "Open Sans"}}), 'Schwarz',
        
        input('.filterBlue', {attrs: {type: 'checkbox'}, style: {"font-family": "Open Sans"}}), 'Blau',
        
        input('.filterGreen', {attrs: {type: 'checkbox'}, style: {"font-family": "Open Sans"}}), 'Grün',
       
        input('.filterRed', {attrs: {type: 'checkbox'}, style: {"font-family": "Open Sans"}}), 'Rot',
      ]),
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
      return {
        cmc: parseInt(ev.target.value),
        value: "cmc"
      }
    })

    const queryRarity$ = domSource.select('.inputRarity').events('input').map(ev =>{
      return {
        rarity: ev.target.value,
        value: "rarity"
      }
    })

    const queryBlack$ = domSource.select('.filterBlack').events('change').map(ev => {
      return {
        color: "Black",
        value: "color"
      }
    })

    const queryWhite$ = domSource.select('.filterWhite').events('change').map(ev => {
      return {
        color: "White",
        value: "color"
      }
    })

    const queryBlue$ = domSource.select('.filterBlue').events('change').map(ev => {
      return {
        color: "Blue",
        value: "color"
      }
    })

    const queryRed$ = domSource.select('.filterRed').events('change').map(ev => {
      return {
        color: "Red",
        value: "color"
      }
    })

    const queryGreen$ = domSource.select('.filterGreen').events('change').map(ev => {
      return {
        color: "Green",
        value: "color"
      }
    })

    const queryType$ = domSource.select('.inputType').events('input').map(ev =>{
      return {
        types: ev.target.value,
        value: "type"
      }
    })

    return{
      query$: xs.merge(queryType$, queryCMC$, queryRarity$, queryBlack$, queryBlue$, queryGreen$, queryRed$, queryWhite$).fold((query, current) =>{
        switch(current.value){
          case "cmc":
            query.variables.cmc = current.cmc;
            break;
          
          case "rarity":
            query.variables.rarity = current.rarity;
            break;
          
          case "type":
            query.variables.types = current.types;
            break;

          case "color":
            let index = query.variables.colors.findIndex((color) => color == current.color);
            if( index !== -1){
              query.variables.colors = query.variables.colors.filter(((color) => color != current.color))
            }
            else{
              query.variables.colors.push(current.color);
            }
            break;
        }
        return query
      }, {query: fetchCards, variables: {cmc: undefined, rarity:"", colors: [], types: ""}, category: 'cards'})
      .drop(1)
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
