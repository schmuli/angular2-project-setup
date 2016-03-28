import {Component, Injectable} from 'angular2/core';
import * as _ from 'lodash';
import {WijmoService} from './wijmo-service';

@Component({
    selector: 'my-app',
    template: '<div><h1>hello app!</h1><h3>{{stam}}</h3></div>',
    providers:[WijmoService]
})
@Injectable()
export class App {
    public stam: string;
    constructor(wsvc: WijmoService) {
        this.stam = wsvc.getSomething(); //_.repeat('meow',3);
    }
} 
