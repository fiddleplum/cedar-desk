import { download } from 'pine-lib';
import { SimpleApp, Cookies, WS, Icon } from 'elm-app';
import { Page } from 'page';
import { MainPage } from 'pages/main_page';
import { LoginPage } from 'pages/login_page';
import { TasksPage } from 'pages/tasks_page';
import { SunAlarmPage } from 'pages/sun_alarm_page';

export class CedarDeskApp extends SimpleApp {
	/** Constructs the app. */
	constructor() {
		super();

		// Set the title.
		this.setTitleHTML('Cedar Desk');

		// Register all of the pages.
		this.registerPage('', MainPage);
		this.registerPage('login', LoginPage);
		this.registerPage('tasks', TasksPage);
		this.registerPage('sun_alarm', SunAlarmPage);

		// Initialize everything else.
		this.initialize();
	}

	async initialize(): Promise<void> {
		// Load the config.
		try {
			this.setStatus('waiting', 'Loading configuration.');
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
			this.setStatus('ready', 'Loaded configuration.');
		}
		catch { /* do nothing. */ }

		// Connect to the web server.
		this.setStatus('waiting', 'Connecting to server.');
		const serverURL = this._config.get('serverURL');
		if (typeof serverURL !== 'string' || serverURL === '') {
			this.setStatus('error', 'The config.json must have a "serverURL" attribute where the web socket can connect to.');
			return;
		}
		try {
			await this._ws.connect(serverURL);
			this.setStatus('ready', 'Connected to server.');
		}
		catch {
			this.setStatus('error', 'Could not connect to server.');
			return;
		}

		// Authenticate the user or go to the login page.
		const user = Cookies.get('user');
		const session = Cookies.get('session');
		// If so, try to authenticate with the server.
		if (user !== undefined && session !== undefined) {
			this.setStatus('waiting', 'Logging In');
			try {
				await this._ws.send({
					module: 'users',
					command: 'authenticate',
					params: {
						user,
						session
					}});
				this.setStatus('ready', 'Logged in.');
				// this.setMenu('<button onclick="{$_logout$}">Log Out</button>');
			}
			catch {
				this.setStatus('error', 'Error logging in.');
				this._goToLoginPage();
			}
		}
		else {
			this.setStatus('ready', 'No authentication, going to login page.');
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

	/** Gets the page element. */
	protected getPageElement(): HTMLElement {
		return this.element('page', HTMLElement);
	}

	/** Callback when a new page is shown. */
	protected onNewPage(page: SimpleApp.Page): void {
		console.log(`Opening page ${page.constructor.name}.`);
		(page as Page).setApp(this);
		(page as Page).initialize();
	}

	/** Sets the title HTML. */
	setTitleHTML(html: string): void {
		const titleElem = this.element('title', HTMLSpanElement);
		titleElem.innerHTML = html;
	}

	/** Sets the menu HTML. */
	setMenu(html: string): void {
		this.insertHtml(this.element('menu', HTMLSpanElement), null, html);
	}

	/** Sets the status icon. */
	setStatus(name: string, message: string): void {
		console.log(`Status: ${message}`);
		const statusIcon = this.component('status', Icon);
		statusIcon.src = `assets/icons/${name}.svg`;
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
	<body>
		<div id="header">
			<icon id="logo" src="assets/icons/logo.svg"></icon>
			<span id="title"></span>
			<icon id="status"></icon>
		</div>
		<div id="page"></div>
		<div id="toolbar"></div>
	</body>
	`;

CedarDeskApp.css = /* css */`
	:root {
		--bg: #ccddff;
		--bg-light: #ddeeff;
		--border: #aabbff;
		--fg: #000000;
		font-size: 24px;
	}
	.SimpleApp {
		margin: 0;
		width: 100%;
		min-height: 100vh;
		display: grid;
		grid-template-rows: 3rem 1fr 3rem;
		grid-template-areas: "header" "page" "toolbar";
	}
	.SimpleApp #header {
		grid-area: header;
		background: var(--bg);
		display: grid;
		grid-template-columns: 3rem 1fr 3rem;
		grid-template-areas: "logo" "title" "status";
	}
	.SimpleApp #header #logo {
		margin: .5rem;
	}
	.SimpleApp #header #title {
		font-size: 1.5rem;
		line-height: 3rem;
		text-align: center;
	}
	.SimpleApp #header #status {
		margin: .5rem;
	}
	.SimpleApp #toolbar {
		grid-area: toolbar;
		background: var(--bg);
		padding: 0 .25rem;
	}
	.SimpleApp #page {
		grid-area: page;
		position: relative;
		padding: .5rem;
	}
	.SimpleApp #page.fadeOut {
		opacity: 0;
		transition: opacity .125s;
	}
	.SimpleApp #page.fadeIn {
		opacity: 1;
		transition: opacity .125s;
	}
	#page p:first-child {
		margin-top: 0;
	}
	#page p {
		margin: .5rem 0 0 0;
		max-width: 100%;
	}
	#page label {
		display: inline-block;
		height: .5rem;
	}
	#page button, input {
		display: inline-block;
		border: 0;
		border-radius: .125rem;
		outline: 0;
		padding: .125rem .25rem;
		max-width: 100%;
		background: var(--bg);
		color: var(--fg);
		font-size: inherit;
		line-height: 0.75rem;
		height: 2rem;
	}
	#page button:disabled, input:disabled {
		background: var(--bg-light);
		color: var(--bg);
	}
	#page input:focus {
		box-shadow: 0 0 .0625em .0625em var(--border);
	}
	.pageWidth {
		margin: 0 auto;
		width: 100%;
		min-width: 5rem;
		max-width: 12.5rem;
	}
	.Icon {
		width: 2rem;
		height: 2rem;
		fill: green;
	}
	`;

CedarDeskApp.setAppClass();

CedarDeskApp.register();
