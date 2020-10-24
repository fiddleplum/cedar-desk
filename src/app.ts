import { Cookies, App, WS } from 'elm-app';

export class CedarDeskApp extends App {
	/** Constructs the app. */
	constructor() {
		super();

		this.element('title', HTMLDivElement).innerHTML = 'CedarDesk';

		try {
			this._ws = new WS('localhost:8081');
		}
		catch (error) {
			throw new Error(`Error connecting to web socket server: ${error.message}`);
		}
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'create user',
		// 		user: 'fiddleplum2',
		// 		password: '1234'
		// 	});
		// }).then((user) => {
		// 	console.log(user);
		// });
		this._ws.getReadyPromise().then(() => {
			return this._ws.send({
				command: 'login',
				user: 'fiddleplum2',
				password: '1234'
			});
		}).then((user) => {
			console.log(user);
		});
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'get',
		// 		table: 'users',
		// 		record: 'fiddleplum'
		// 	});
		// }).then((user) => {
		// 	console.log(user);
		// });
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'set',
		// 		table: 'users',
		// 		records: [['bob', '1234']],
		// 	});
		// }).then((user) => {
		// 	console.log(user);
		// });
	}

	/** Destructs the app. */
	destroy(): void {
		this._ws.close();
	}

	// private _checkLogin(): void {
	// 	this._ws.send({

	// 	}).then((valid) => {
	// 	});
	// }

	private _ws: WS;
}

CedarDeskApp.html = /* html */`
	<div id="logo"><icon src="icon.svg"></icon></div>
	<div id="title"></div>
	<div id="menu"></div>
	<div id="messages"></div>
	<div id="page"></div>
	<div id="toolbar"></div>
	`;

CedarDeskApp.css = /* css */`
	body {
		margin: 0;
		height: 100%;
		background: black;
		color: white;
		display: grid;
		grid-template-rows: 3rem 2rem 1fr 2rem;
		grid-template-columns: 3rem 1fr 1fr;
		grid-template-areas:
			"logo title menu"
			"messages messages messages"
			"page page page"
			"toolbar toolbar toolbar";
	}

	.CedarDeskApp#logo {
		grid-area: logo;
		padding: .5rem;
		line-height: 3rem;
	}

	.CedarDeskApp#title {
		grid-area: title;
		padding: .5rem;
		font-size: 3rem;
		line-height: 1.5rem;
	}

	.CedarDeskApp#menu {
		grid-area: menu;
	}

	.CedarDeskApp#messages {
		grid-area: messages;
		font-size: 1.5rem;
	}

	.CedarDeskApp#page {
		grid-area: page;
	}

	.CedarDeskApp#toolbar {
		grid-area: toolbar;
	}

	svg {
		width: 2rem;
		height: 2rem;
	}
	`;

CedarDeskApp.setAppClass(CedarDeskApp);

CedarDeskApp.register();
