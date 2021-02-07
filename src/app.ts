import { SimpleApp, Cookies, WS, JSONType, download, isIn } from 'elm-app';
import { LoginPage } from 'pages/login_page';
import { MainPage } from 'pages/main_page';

export class CedarDeskApp extends SimpleApp {
	/** Constructs the app. */
	constructor() {
		super();

		this.initialize();
	}

	private async initialize(): Promise<void> {
		// Set the title.
		this.setTitle('Cedar Desk');

		// Register all of the pages.
		this.registerPage('', MainPage);
		this.registerPage('login', LoginPage);

		// this.insertHtml(this.element('page', HTMLDivElement), null, '<MessagePage message="Hello"></MessagePage>');

		// Load the config.
		try {
			const configJSON = await download('config.json', 'json');
			if (configJSON !== null && typeof configJSON === 'object' && !Array.isArray(configJSON)) {
				let key: keyof typeof configJSON;
				for (key in configJSON) {
					const value = configJSON[key] as any;
					if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
						this._config.set(key, value);
					}
				}
			}
		}
		catch { /* do nothing. */ }

		// Connect to the web server.
		const serverURL = this._config.get('serverURL');
		if (typeof serverURL !== 'string' || serverURL === '') {
			this.setMessage('The config.json must have a "serverURL" attribute where the web socket can connect to.');
			return;
		}

		// Connect to the server.
		try {
			await this._ws.connect(serverURL);
		}
		catch {
			this.setMessage('Could not connect to server.');
			return;
		}

		// Check if there is a session cookie.
		const user = Cookies.get('user');
		const session = Cookies.get('session');
		console.log(user, session);
		// If so, try to authenticate with the server.
		if (user !== undefined && session !== undefined) {
			await this._ws.send({
				command: 'authenticate',
				user,
				session });
		}
		else {
			const prevPage = this.router.getValue('page');
			this.router.pushQuery({
				page: 'login',
				prevPage: prevPage !== undefined ? prevPage : ''
			}, true);
		}

		this.router.processURL();






		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'create user',
		// 		user: 'fiddleplum2',
		// 		password: '1234'
		// 	});
		// }).then((user) => {
		// 	console.log(user);
		// });
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'login',
		// 		user: 'fiddleplum2',
		// 		password: '1234'
		// 	});
		// }).then((response) => {
		// 	console.log(response);
		// 	const session = response.session;
		// 	if (typeof session === 'string') {
		// 		Cookies.set('session', session, 3600 * 24 * 7);
		// 	}
		// });
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'get',
		// 		table: 'users',
		// 		record: 'fiddleplum',
		// 		session: Cookies.get('session')
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
		if (this._ws !== undefined) {
			this._ws.close();
		}
		super.destroy();
	}

	/** Gets the websocket. */
	get ws(): WS {
		return this._ws;
	}

	/** The config. */
	private _config: Map<string, string | number | boolean> = new Map();

	/** The websocket. */
	private _ws: WS = new WS();
}

// CedarDeskApp.html = /* html */`
// 	<div id="header">
// 		<icon src="icon.svg"></icon>
// 		<span id="title"></span>
// 	</div>
// 	<div id="page"></div>
// 	<div id="messages">message</div>
// 	<div id="toolbar"></div>
// 	`;

CedarDeskApp.css = /* css */`
	:root {
		--bg: #ccddff;
		--border: #aabbff;
		--fg: #000000;
	}

	body {
		font-size: 2rem;
		line-height: 2rem;
	}

	p:first-child {
		margin-top: 0;
	}

	p {
		margin: 1rem 0 0 0;
		max-width: 100%;
	}

	label {
		display: inline-block;
		height: 2rem;
	}

	button, input {
		border: 0;
		border-radius: .25rem;
		padding: .25rem;
		max-width: 100%;
		background: var(--bg);
		color: var(--fg);
		font-size: 2rem;
		line-height: 2.5rem;
		height: 3rem;
	}

	// body {
	// 	margin: 0;
	// 	height: 100%;
	// 	background: white;
	// 	color: black;
	// 	display: grid;
	// 	grid-template-rows: calc(2.5rem + 1px) 1fr calc(2.5rem + 1px);
	// 	grid-template-areas: 
	// 		"header"
	// 		"page"
	// 		"footer"
	// }

	// .CedarDeskApp#header {
	// 	grid-area: header;
	// 	background: var(--bg);
	// 	border-bottom: 1px solid var(--border);
	// 	padding: .25rem;
	// }

	// .CedarDeskApp#header svg {
	// 	width: auto;
	// 	height: calc(100%);
	// }

	// .CedarDeskApp #title {
	// 	vertical-align: baseline;
	// 	display: inline-block;
	// 	padding-left: .25rem;
	// 	font-size: 2rem;
	// 	line-height: 2rem;
	// }

	// .CedarDeskApp#page {
	// 	grid-area: page;
	// }

	// .CedarDeskApp#messages {
	// 	grid-area: page;
	// 	max-height: 1.5rem;
	// }

	// .CedarDeskApp#toolbar {
	// 	grid-area: footer;
	// 	background: var(--bg);
	// 	border-top: 1px solid var(--border);
	// }
	`;

CedarDeskApp.setAppClass();

CedarDeskApp.register();
