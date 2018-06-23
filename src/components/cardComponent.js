import xs from 'xstream';
import {div, p, ul, button, li, h} from '@cycle/dom';

function CardComponent(sources){
    

    const vtree$ = xs.of(
        p('Test')
    )
    const sinks = {
        DOM: vtree$,
      }
    return sinks
}