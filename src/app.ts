import { download } from 'pine-lib';
import { SimpleApp, Cookies, WS, Icon } from 'elm-app';
import { Page } from 'page';

import { UserSettingsPage } from 'pages/user-settings-page';
import { MainPage } from 'pages/main-page';
import { LoginPage } from 'pages/login-page';
import { TasksPage } from 'pages/tasks-page';
import { SunAlarmPage } from 'pages/sun-alarm-page';
import { AdminPage } from 'pages/admin-page';
import { SunAlarmAddEditPage } from 'pages/sun-alarm-add-edit-page';

export class CedarDeskApp extends SimpleApp {
	/** Constructs the app. */
	constructor() {
		super();

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
				// If we were at the login page, go to the main page.
				if (this.router.getValue('page') === 'login') {
					this.router.replaceQuery({
						page: ''
					}, true);
				}
				// Show the menu button.
				this.element('menu-button', HTMLButtonElement).classList.remove('hidden');

				const groups = await this._ws.send({
					module: 'users',
					command: 'getGroups'
				}) as string[];
				if (groups.includes('admins')) {
					this.insertHtml(this.element('menu', HTMLElement), this.element('logout', HTMLElement), `<button id="admin" onclick="_goToPage">Admin</button>`);
				}
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
		// const statusIcon = this.component('status', Icon);
		// statusIcon.src = `assets/icons/${name}.svg`;
	}

	private _goToPage(event: Event): void {
		if (event.target !== null) {
			this.element('menu', HTMLDivElement).classList.add('hidden');
			this.router.pushQuery({
				page: (event.target as HTMLButtonElement).id
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

	private _logout(): void {
		Cookies.set('user', '', 0);
		Cookies.set('session', '', 0);
		location.reload();
	}

	private _openMenu(): void {
		this.element('menu', HTMLDivElement).classList.toggle('hidden');
	}

	/** The config. */
	private _config: Map<string, string | number | boolean> = new Map();

	/** The websocket. */
	private _ws: WS = new WS();
}

CedarDeskApp.html = /* html */`
	<body>
		<div id="header">
			<icon id="logo" src="assets/icons/logo.svg" alt=""></icon>
			<span id="title"></span>
			<button id="menu-button" class="hidden" onclick="_openMenu"><icon src="assets/icons/menu.svg" alt="menu"></icon></button>
			<div id="menu" class="hidden">
				<button id="sun-alarm" onclick="_goToPage">Sun Alarm</button>
				<button id="account" onclick="_goToPage">User Settings</button>
				<button id="logout" onclick="_logout">Log Out</button>
			</div>
		</div>
		<div id="page"></div>
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
		font-size: 24px;
		line-height: 36px;
		font-family: 'Helvetica';
	}
	* {
		transition-property: transform, padding, opacity, background, color, fill;
		transition-duration: .25s;
		transition-timing-function: ease-out;
	}
	.CedarDeskApp {
		margin: 0;
		width: 100%;
		min-height: 100vh;
		display: grid;
		grid-template-rows: 2.5rem 1fr 3rem;
		grid-template-areas: "header" "page";
		background: var(--color6);
	}
	.CedarDeskApp #header {
		grid-area: header;
		position: relative;
		display: grid;
		grid-template-columns: 2.5rem 1fr 2.5rem;
		grid-template-areas: "logo" "title" "status";
		background: var(--color1);
		color: var(--color4);
		fill: var(--color4);
	}
	.CedarDeskApp #header #logo {
		margin: .25rem;
		width: 2rem;
		height: 2rem;
	}
	.CedarDeskApp #header #title {
		margin: .25rem;
		font-size: 1.5rem;
		line-height: 2rem;
		text-align: center;
	}
	.CedarDeskApp #header #menu-button {
		margin: .25rem;
		width: 2rem;
		height: 2rem;
		padding: 0;
	}
	.CedarDeskApp #header #menu-button svg {
		width: 1.5rem;
		height: 1.5rem;
	}
	.CedarDeskApp #menu {
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
	.CedarDeskApp #menu button {
		display: block;
		margin: .25rem 0 0 0;
		width: 100%;
	}
	.CedarDeskApp #menu button:first-child {
		margin-top: 0;
	}
	.CedarDeskApp #menu button:hover {
		background: var(--color3);
		color: var(--color5);
	}
	.CedarDeskApp #menu.hidden {
		background: var(--color1);
		color: var(--color1);
	}
	.CedarDeskApp #page {
		grid-area: page;
		margin: 0 auto;
		width: 100%;
		max-width: 20rem;
		position: relative;
		background: var(--color6);
		padding: .5rem;
		color: var(--color1);
		fill: var(--color1);
	}
	.CedarDeskApp #page.fadeOut {
		opacity: 0;
	}
	.CedarDeskApp #page.fadeIn {
		opacity: 1;
	}
	h1 {
		font-size: 1.5rem;
		margin: 2rem 0 0 0;
		font-weight: normal;
	}
	h2 {
		font-size: 1.25rem;
		margin: .25rem 0 0 0;
		font-weight: normal;
	}
	p, ul, ol {
		margin: .5rem 0 0 0;
		max-width: 100%;
		font-size: 1rem;
		line-height: 1.125rem;
	}
	.ElmForm {
		margin: .5rem 0 0 0;
	}
	.ElmForm .entry {
		display: inline-block;
		margin: .25rem .5rem .5rem 0;
	}
	.ElmForm .entry.choice label {
		margin-right: .5rem;
	}
	button.submit {
		margin-top: .5rem;
	}
	h1:first-child, h2:first-child, p:first-child {
		margin-top: 0;
	}
	button, input, select, input[type=checkbox] + label, input[type=radio] + label {
		display: inline-block;
		border-radius: .25rem;
		outline: 0;
		padding: 0 .5rem;
		max-width: 100%;
		background: var(--color5);
		border: 1px solid var(--color1);
		color: var(--color1);
		fill: var(--color1);
		font-size: 1rem;
		line-height: calc(1.5rem - 2px);
		height: 1.5rem;
	}
	input[type=checkbox], input[type=radio] {
		display: none;
	}
	input[type=checkbox]:checked + label, input[type=radio]:checked + label {
		background: var(--color3);
		transform: scale(1.1);
	}
	button:disabled, input:disabled, input[type=checkbox]:disabled + label, input[type=radio]:disabled + label {
		color: var(--color3);
	}
	input:focus {
		box-shadow: 0 0 .0625em .0625em var(--border);
	}
	.hidden {
		padding: 0rem;
		transform: scaleY(0);
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
