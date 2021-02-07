import { SimpleApp, Component, Cookies } from 'elm-app';

export class MainPage extends SimpleApp.Page {
	constructor(params: Component.Params) {
		super(params);

	}
}

MainPage.html = /* html */`
	`;

MainPage.css = /* css */`
	label {
		display: inline-block;
		width: 5em;
	}
	input {
		display: inline-block;
		width: 6em;
	}
	`;

MainPage.register();
