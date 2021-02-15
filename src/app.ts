import { SimpleApp, Cookies, WS, download } from 'elm-app';
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
		this.setTitleHTML('Cedar Desk');

		// Register all of the pages.
		this.registerPage('', MainPage);
		this.registerPage('login', LoginPage);

		// Load the config.
		try {
			this.setMessage('Loading Configuration');
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
		this.setMessage('Connecting to Server');
		const serverURL = this._config.get('serverURL');
		if (typeof serverURL !== 'string' || serverURL === '') {
			this.setMessage('The config.json must have a "serverURL" attribute where the web socket can connect to.');
			return;
		}
		try {
			await this._ws.connect(serverURL);
		}
		catch {
			this.setMessage('Could not connect to server.');
			return;
		}

		// Authenticate the user or go to the login page.
		const user = Cookies.get('user');
		const session = Cookies.get('session');
		// If so, try to authenticate with the server.
		if (user !== undefined && session !== undefined) {
			this.setMessage('Logging In');
			try {
				await this._ws.send({
					command: 'authenticate',
					user,
					session });
				this.setMenu('<button onclick="{$_logout$}">Log Out</button>');
			}
			catch {
				this._goToLoginPage();
			}
		}
		else {
			this._goToLoginPage();
		}

		this.router.processURL();
	}

	/** Destructs the app. */
	destroy(): void {
		if (this._ws !== undefined) {
			this._ws.close();
		}
	}

	/** Gets the websocket. */
	get ws(): WS {
		return this._ws;
	}

	/** Shows a message to the user. */
	protected showMessage(messageHtml: string): void {
		this.setHtml(this.element('message', Element), messageHtml);
	}

	/** Gets the page element. */
	protected getPageElement(): HTMLElement {
		return this.element('page', HTMLElement);
	}

	/** Sets the title HTML. */
	setTitleHTML(html: string): void {
		const titleElem = this.element('title', HTMLSpanElement).querySelector('a')!;
		titleElem.innerHTML = html;
	}

	/** Sets the menu HTML. */
	setMenu(html: string): void {
		this.insertHtml(this.element('menu', HTMLSpanElement), null, html);
	}

	/** Sets the message HTML. */
	setMessage(message: string): void {
		const messageElem = this.element('message', HTMLDivElement);
		if (message !== '') {
			console.log(message);
			messageElem.innerHTML = message;
			messageElem.classList.add('active');
		}
		else {
			messageElem.innerHTML = '';
			messageElem.classList.remove('active');
		}
	}

	/** Goes to the login page. Keeps the previous page. */
	private _goToLoginPage(): void {
		Cookies.set('user', '', 0);
		Cookies.set('session', '', 0);
		const prevPage = this.router.getValue('page');
		this.router.replaceQuery({
			page: 'login',
			prevPage: prevPage !== undefined ? prevPage : ''
		}, true);
	}

	private _logout(): void {
		Cookies.set('user', '', 0);
		Cookies.set('session', '', 0);
		location.reload();
	}

	/** The config. */
	private _config: Map<string, string | number | boolean> = new Map();

	/** The websocket. */
	private _ws: WS = new WS();
}

CedarDeskApp.html = /* html */`
	<div id="header">
		<icon src="icon.svg"></icon>
		<span id="title"></span>
	</div>
	<div id="page"></div>
	<div id="message">message</div>
	<div id="toolbar"></div>
	`;

CedarDeskApp.css = /* css */`
	:root {
		--bg: #ccddff;
		--border: #aabbff;
		--fg: #000000;
		font-size: 2rem;
	}
	body {
		margin: 0;
		width: 100%;
		min-height: 100vh;
		display: grid;
		grid-template-rows: 2rem 1fr 2rem 2rem;
		grid-template-areas: "header" "page" "message" "footer";
	}
	.SimpleApp#headerArea {
		grid-area: header;
		background: var(--bg);
	}
	.SimpleApp#headerArea #header {
		padding: 0.5rem;
	}
	.SimpleApp#headerArea #title a {
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}
	.SimpleApp#headerArea #title a:hover {
		text-decoration: underline;
	}
	.SimpleApp#headerArea #menu {
		float: right;
	}
	.SimpleApp#page {
		grid-area: page;
		position: relative;
		padding: .5rem;
	}
	.SimpleApp#page.fadeOut {
		opacity: 0;
		transition: opacity .125s;
	}
	.SimpleApp#page.fadeIn {
		opacity: 1;
		transition: opacity .125s;
	}
	.SimpleApp#messageArea {
		grid-area: message;
		background: var(--bg);
	}
	.SimpleApp#messageArea #message {
		padding: 0 .5rem;
		height: 0;
		opacity: 0;
		transition: opacity .5s, height .5s, margin .5s;
		font-size: 1rem;
	}
	.SimpleApp#messageArea #message.active {
		height: inherit;
		opacity: 100%;
		padding: .5rem;
	}
	.SimpleApp#messageArea #message a {
		color: inherit;
		text-decoration: none;
	}
	.SimpleApp#footerArea {
		grid-area: footer;
		background: var(--bg);
	}
	.SimpleApp#footerArea #footer {
		padding: 0 .5rem;
	}
	.pageWidth {
		margin: 0 auto;
		width: 100%;
		min-width: 10rem;
		max-width: 25rem;
	}

	body {
		font-size: 1rem;
		line-height: 1rem;
	}

	#page p:first-child {
		margin-top: 0;
	}

	#page p {
		margin: 1rem 0 0 0;
		max-width: 100%;
	}

	#page label {
		display: inline-block;
		height: 1rem;
	}

	#page button, input {
		display: inline-block;
		border: 0;
		border-radius: .25rem;
		outline: 0;
		padding: .25rem .5rem;
		max-width: 100%;
		background: var(--bg);
		color: var(--fg);
		font-size: inherit;
		line-height: 1.5rem;
		height: 2rem;
	}

	#page input:focus {
		box-shadow: 0 0 .125em .125em var(--border);
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
