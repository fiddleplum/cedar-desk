import { CedarDeskApp } from 'app';
import { SimpleApp, Component, Cookies } from 'elm-app';

export class LoginPage extends SimpleApp.Page {
	constructor(params: Component.Params) {
		super(params);

	}

	private _login(): void {
		const user = this.element('user', HTMLInputElement).value;
		const password = this.element('password', HTMLInputElement).value;

		(this.app as CedarDeskApp).ws.send({
			command: 'login',
			user,
			password
		}).then((response) => {
			const session = response.session;
			if (typeof session === 'string') {
				Cookies.set('user', user, 3600 * 24 * 7);
				Cookies.set('session', session, 3600 * 24 * 7);
				const prevPage = this.app.router.getValue('prevPage');
				this.app.router.replaceQuery({
					page: prevPage !== undefined ? prevPage : '',
					prevPage: ''
				}, true);
				location.reload();
			}
			else {
				this.app.setMessage('Server error, please try again.');
			}
		}).catch(() => {
			this.app.setMessage('Invalid username or password.');
		});
	}
}

LoginPage.html = /* html */`
	<p>Welcome! Please login.</p>
	<p><label for="username">Username:</label><input id="user" name="user" type="text"></input></p>
	<p><label for="password">Password:</label><input id="password" name="password" type="password"></input></p>
	<p><button id="submit" onclick="{$_login$}">Login</button></p>
	`;

LoginPage.css = /* css */`
	.LoginPage label {
		width: 5rem;
	}
	.LoginPage input {
		width: 6rem;
	}
	.LoginPage button {
		width: 11rem;
	}
	@media only screen and (max-width: 25rem) {
		.LoginPage label {
			width: 50%;
		}
		.LoginPage input {
			width: 50%;
		}
		.LoginPage button {
			width: 100%;
		}
	}
	`;

LoginPage.register();
