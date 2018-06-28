import xs, {Stream, MemoryStream} from 'xstream';
import {li, span, VNode, DOMSource, tbody, table, tr, td, img, p, button} from '@cycle/dom';
import {StateSource} from 'cycle-onionify';
import flattenSequentially from 'xstream/extra/flattenConcurrently';


export default function Item(sources) {
  const state$ = sources.onion.state$;

  const imageStream$ = state$.map(state =>{
    return {
      url: 'https://api.scryfall.com/cards/named?fuzzy=' + state.card.name,
      category: 'image',
      method: 'GET'
    }
  })

  const vdom$ = sources.HTTP.select('image').flatten().map(res =>{
        return res.body
    }).map(card =>{
      return table('.card', {attrs:{ width: 700, height: 250}}, [
        tbody([tr('cardItem', [
          td('leftCol', [img({ attrs:{src: card.image_uris.small}})]),
          td('middleCol',[
            p('.cardName', card.name), 
            p('.cardText',  card.oracle_text),
            p('.cardFlavor', card.flavor_text),
            button('.delete', 'Delete')
          ]),
          td('rightCol', [img({ attrs:{src: 'https://img.scryfall.com/sets/bbd.svg?1528689600', height: "42", width: "42"}})])
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
    HTTP: imageStream$
  };
}