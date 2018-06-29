import xs, {Stream, MemoryStream} from 'xstream';
import {li, span, VNode, DOMSource, tbody, table, tr, td, img, p, button} from '@cycle/dom';


export default function Item(sources) {
  const state$ = sources.onion.state$;

  const imageStream$ = state$.map(state =>{
    return {
      url: 'https://api.scryfall.com/cards/named?fuzzy=' + state.card.name,
      category: 'image',
      method: 'GET'
    }
  });

  const symbolStream$ = sources.HTTP.select('image').flatten().map(res =>{
    return {
      url: "https://api.scryfall.com/sets/" + res.body.set,
      category: 'symbol',
      method: 'GET'
    }
  });

  const HTTPStream$ = xs.merge(symbolStream$, imageStream$);

  const modelStream$ = xs.combine(sources.HTTP.select('image').flatten().map(res => res.body),
                                  sources.HTTP.select('symbol').flatten().map(res => res.body));

  const vdom$ = modelStream$.map(([card, symbol]) =>{
    return table('.card', {attrs:{ width: 700, height: 250}}, [
      tbody([tr('cardItem', [
        td('leftCol', [img({ attrs:{src: card.image_uris.small}})]),
        td('middleCol',[
          p('.cardName', card.name), 
          p('.cardText',  card.oracle_text),
          p('.cardFlavor', card.flavor_text),
          button('.delete', 'Delete')
        ]),
        td('rightCol', [img({ attrs:{src: symbol.icon_svg_uri, height: "42", width: "42"}})])
      ])])
    ])
  });



  const deleteReducer$ = sources.DOM
  .select('.delete').events('click')
  .mapTo(function removeReducer(prevState) {
    return void 0;
  });

  const trimReducer$ = sources.DOM
  .select('.trim').events('click')
  .mapTo(function trimReducer(prevState) {
    return {
      ...prevState,
      content: prevState.content.slice(0, -1),
    };
  });

  const reducer$ = xs.merge(deleteReducer$, trimReducer$);

  return {
    DOM: vdom$,
    onion: reducer$,
    HTTP: HTTPStream$
  };
}