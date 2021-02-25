import { SimpleApp, Component, Cookies } from 'elm-app';
import { Page } from 'page';

export class MainPage extends Page {
}

MainPage.html = /* html */`
	<div>
	</div>
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
