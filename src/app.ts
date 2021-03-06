import { download, JSONObject } from 'pine-lib';
import { SimpleApp, Cookies, FullSize, WS } from 'elm-app';
import { Page } from 'page';

import { UserSettingsPage } from 'pages/user-settings-page';
import { MainPage } from 'pages/main-page';
import { LoginPage } from 'pages/login-page';
import { TasksPage } from 'pages/tasks-page';
import { SunAlarmPage } from 'pages/sun-alarm-page';
import { AdminPage } from 'pages/admin-page';
import { SunAlarmAddEditPage } from 'pages/sun-alarm-add-edit-page';
import { CheckListPage } from 'pages/check-list-page';
import { CheckListEditPage } from 'pages/check-list-edit-page';

export class CedarDeskApp extends SimpleApp {
	/** Constructs the app. */
	constructor() {
		super();

		// Initialize everything else.
		this.initialize();
	}

	/** Initializes the asynchronous parts of the app. */
	async initialize(): Promise<void> {
		// Make the app always full size.
		FullSize.init();

		// Set the title.
		this.setTitleHTML('Cedar Desk');

		// Register all of the pages.
		this.registerPage('', MainPage);
		this.registerPage('admin', AdminPage);
		this.registerPage('account', UserSettingsPage);
		this.registerPage('login', LoginPage);
		this.registerPage('tasks', TasksPage);
		this.registerPage('sun-alarm', SunAlarmPage);
		this.registerPage('sun-alarm-add-edit', SunAlarmAddEditPage);
		this.registerPage('check-list', CheckListPage);
		this.registerPage('check-list-edit', CheckListEditPage);

		await this.loadConfig();
		await this.connectToServer();
		this.router.processURL();
	}

	/** Loads the config. */
	async loadConfig(): Promise<void> {
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
	}

	/** Connects the the web server. */
	async connectToServer(): Promise<void> {
		this.query('.connecting-panel', HTMLElement)!.classList.add('visible');
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
		this.query('.connecting-panel', HTMLElement)!.classList.remove('visible');

		// Register as a websocket handler.
		this._ws.registerHandler('users', this._responseHandler.bind(this));

		// Authenticate the user or go to the login page.
		this._user = Cookies.get('user');
		const session = Cookies.get('session');
		// If so, try to authenticate with the server.
		if (this._user !== undefined && session !== undefined) {
			this.setStatus('waiting', 'Logging In');
			try {
				await this._ws.send({
					module: 'users',
					command: 'authenticate',
					params: {
						user: this._user,
						session: session
					}});
				this.setStatus('ready', 'Logged in.');
				// If we were at the login page, go to the main page.
				if (this.router.getValue('page') === 'login') {
					this.router.replaceQuery({
						page: ''
					}, true);
				}
				// Show the menu button.
				this.root.querySelector('.menu-button')!.classList.remove('hidden');

				const groups = await this._ws.send({
					module: 'users',
					command: 'getGroups'
				}) as string[];
				if (groups.includes('admins')) {
					const html = `<button class="button" data-page="admin" onclick="_goToPage">Admin</button>`;
					this.insertHtml(html, this.query('.menu', Element)!, this.query('.logout', Element), this);
				}
			}
			catch (e) {
				console.log(e);
				this.setStatus('error', 'Error logging in.');
				this._goToLoginPage();
			}
		}
		else {
			this.setStatus('ready', 'No authentication, going to login page.');
			this._goToLoginPage();
		}

		// Call this same function if there is a disconnect.
		this._ws.setCloseCallback(this.connectToServer.bind(this));
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

	/** Gets the user. */
	get user(): string | undefined {
		return this._user;
	}

	/** When a command is received from the server. */
	private _responseHandler(response: JSONObject): void {
		const command = response.command;
		// The user logged out somewhere else, so log out here.
		if (command === 'logout') {
			// Clear the cookies.
			Cookies.set('user', '', 0);
			Cookies.set('session', '', 0);
			// Reload the page.
			location.reload();
		}
	}

	/** Gets the page element. */
	protected getPageElement(): HTMLElement {
		return this.query('.page', HTMLElement)!;
	}

	/** Callback when a new page is shown. */
	protected onNewPage(page: SimpleApp.Page): void {
		console.log(`Opening page ${page.constructor.name}.`);
		(page as Page).setApp(this);
		(page as Page).initialize();
	}

	/** Sets the title HTML. */
	setTitleHTML(html: string): void {
		const titleElem = this.query('.title', HTMLSpanElement)!;
		titleElem.innerHTML = html;
	}

	/** Sets the menu HTML. */
	setMenu(html: string): void {
		this.insertHtml(html, this.query('.menu', HTMLSpanElement)!, undefined);
	}

	/** Sets the status icon. */
	setStatus(_name: string, message: string): void {
		console.log(`Status: ${message}`);
	}

	private _goToPage(event: Event): void {
		if (event.target !== null) {
			this.query('.menu', HTMLDivElement)!.classList.add('hidden');
			this.router.pushQuery({
				page: (event.target as HTMLButtonElement).getAttribute('data-page')!
			}, true);
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

	/** Logs the user out. */
	private async _logout(): Promise<void> {
		// Clear the cookies.
		Cookies.set('user', '', 0);
		Cookies.set('session', '', 0);
		// Send a logout command to the server.
		// This will clear all sessions from any other logins of the same user.
		await this._ws.send({
			module: 'users',
			command: 'logout'
		});
		location.reload();
	}

	private _openMenu(): void {
		this.query('.menu', HTMLDivElement)!.classList.toggle('hidden');
	}

	/** The config. */
	private _config: Map<string, string | number | boolean> = new Map();

	/** The websocket. */
	private _ws: WS = new WS();

	/** The user, once they are logged in. */
	private _user: string | undefined;
}

CedarDeskApp.html = /* html */`
	<body>
		<div class="header">
			<icon class="logo" src="assets/icons/logo.svg" alt=""></icon>
			<span class="title"></span>
			<button class="button menu-button hidden" onclick="_openMenu"><icon src="assets/icons/menu.svg" alt="menu"></icon></button>
			<div class="menu hidden">
				<button class="button" data-page="check-list" onclick="_goToPage">Check Lists</button>
				<!--<button data-page="sun-alarm" onclick="_goToPage">Sun Alarm</button>-->
				<button class="button" data-page="account" onclick="_goToPage">User Settings</button>
				<button class="logout button" onclick="_logout">Log Out</button>
			</div>
		</div>
		<div class="page"></div>
		<div class="connecting-panel panel">
			<div>Connecting...</div>
		</div>
	</body>
	`;

CedarDeskApp.css = /* css */`
	:root {
		--color1: #134D39;
		--color2: #1C7153;
		--color3: #25946E;
		--color4: #2EB888;
		--color5: #37DCA2;
		--color6: #40FFBD;
		font-size: 20px;
		line-height: 1.25rem;
		font-family: 'Helvetica';
	}
	.CedarDeskApp {
		margin: 0;
		width: 100%;
		display: grid;
		grid-template-rows: 2.5rem 1fr;
		background: var(--color6);
	}
	.CedarDeskApp .header {
		position: relative;
		display: grid;
		grid-template-columns: 2.5rem 1fr 2.5rem;
		grid-template-areas: "logo" "title" "status";
		background: var(--color1);
		color: var(--color5);
		fill: var(--color5);
	}
	.CedarDeskApp .header .logo {
		margin: .25rem;
		width: 2rem;
		height: 2rem;
	}
	.CedarDeskApp .header .title {
		margin: .25rem;
		font-size: 1.5rem;
		line-height: 2rem;
		text-align: center;
	}
	.CedarDeskApp .header .menu-button {
		margin: .25rem;
		width: 2rem;
		height: 2rem;
		padding: 0;
	}
	.CedarDeskApp .header .menu-button svg {
		width: 1.5rem;
		height: 1.5rem;
	}
	.CedarDeskApp .menu {
		position: absolute;
		width: 100%;
		max-width: 20rem;
		right: 0;
		top: 2.5rem;
		z-index: 1;
		border-bottom-left-radius: .25rem;
		padding: .25rem;
		text-align: center;
		background: var(--color2);
		color: var(--color5);
		fill: var(--color5);
		font-size: 1.25rem;
		line-height: 1.5rem;
		transform-origin: 0 0;
		overflow: hidden;
	}
	.CedarDeskApp .menu button {
		display: block;
		margin: .25rem 0 0 0;
		width: 100%;
	}
	.CedarDeskApp .menu button:first-child {
		margin-top: 0;
	}
	.CedarDeskApp .menu button:hover {
		background: var(--color3);
		color: var(--color5);
	}
	.CedarDeskApp .menu.hidden {
		background: var(--color1);
		color: var(--color1);
		padding: 0rem;
		transform: scaleY(0);
	}
	.CedarDeskApp .page {
		position: relative;
		background: var(--color6);
		color: var(--color1);
		overflow: auto;
	}
	.CedarDeskApp .page.fadeOut {
		opacity: 0;
	}
	.CedarDeskApp .page.fadeIn {
		opacity: 1;
	}
	.CedarDeskApp .connecting-panel {
		display: none;
		justify-content: center;
		align-items: center;
		opacity: 0.8;
		font-size: 2rem;
	}
	.CedarDeskApp .connecting-panel.visible {
		display: flex;
	}
	section {
		background: var(--color5);
		border-radius: .25rem;
		padding: .25rem;
	}
	section + section {
		margin-top: .25rem;
	}
	section .button, section .input {
		background: var(--color4);
	}
	.popup {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		padding: .25rem;
		background: var(--color4);
		border-radius: .25rem;
	}
	.panel {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		padding: .25rem;
		background: var(--color6);
		overflow: auto;
	}
	.panel > :last-child {
		margin-bottom: .25rem;
	}
	h1 {
		font-size: 1.25rem;
		margin: .5 0 .5rem 0;
		font-weight: normal;
	}
	h2 {
		font-size: 1.25rem;
		margin: .25rem 0 .25rem 0;
		font-weight: normal;
	}
	p, ul, ol {
		margin: .5rem 0 0 0;
		max-width: 100%;
		font-size: 1rem;
		line-height: 1.125rem;
	}
	h1:first-child, h2:first-child, p:first-child, ul:first-child, ol:first-child {
		margin-top: 0;
	}
	.entry p {
		margin: 0;
	}

	.ElmForm p {
		margin-top: 1rem;
	}
	.ElmForm .entry.text, .ElmForm .entry.password {
		margin: 1rem 0;
	}
	.ElmForm .entry.text label, .ElmForm .entry.password label {
		display: block;
	}
	.ElmForm .entry + .entry {
		margin-top: 1rem;
	}
	.ElmForm .entry.toggle, .ElmForm .entry .choice {
		margin-right: .5rem;
	}
	.ElmForm .entry.toggle input:checked + label, .ElmForm .entry .choice input:checked + label {
		background: var(--color4);
	}
	.ElmForm .entry + .message, .ElmForm .message + .submit {
		margin: 1.5rem 0 0 0;
	}

	/* Give the nice rounded background for all form elements and buttons. */
	.button, .input {
		display: inline-block;
		border: 0;
		border-radius: .25rem;
		outline: 0;
		background: var(--color5);
		color: var(--color1);
		padding: .25rem;
		font-family: inherit;
		font-size: 1rem;
		line-height: 1rem;
	}
	/* Make icon buttons have no padding, since the svg fills it all up. */
	.button.svg {
		padding: 0;
	}
	/* Hide the actual checkbox and radio inputs. */
	input[type="checkbox"], input[type="radio"] {
		opacity: 0;
		z-index: -1;
		position: absolute;
	}
	/* Make all svgs small enough to be in square buttons. */
	button svg, label input[type="checkbox"] ~ svg, label input[type="radio"] ~ svg {
		width: 1.5rem;
		height: 1.5rem;
		fill: var(--color1);
		stroke: var(--color1);
	}
	/* Make unchecked checkboxes have no check. */
	label input[type="checkbox"] ~ svg {
		opacity: 25%;
		transform: scale(.75);
		transition: opacity .25s, transform .25s;
	}
	/* Make checked checkboxes have a check. */
	label input[type="checkbox"]:checked ~ svg {
		opacity: 100%;
		transform: scale(1);
	}

	button:disabled, input:disabled, input[type=checkbox]:disabled + label, input[type=radio]:disabled + label {
		color: var(--color3);
	}
	input:focus {
		box-shadow: 0 0 .0625em .0625em var(--border);
	}
	.popup1 {
		margin-top: .5rem;
		border-radius: .5rem;
		background: var(--color5);
		padding: .5rem;
	}
	.popup2 {
		margin-top: .5rem;
		border-radius: .5rem;
		background: var(--color4);
		padding: .5rem;
	}
	.fullwidth { 
		width: 100%;
		margin-left: 0;
		margin-right: 0;
	}
	`;

CedarDeskApp.setAppClass();

CedarDeskApp.register();
