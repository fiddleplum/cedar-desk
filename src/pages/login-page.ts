import { Page } from 'page';
import { Cookies } from 'elm-app';

export class LoginPage extends Page {
	private async _login(): Promise<void> {
		// Clear the message and disable the login button.
		this.showMessage('');
		this.element('submit', HTMLButtonElement).disabled = true;

		// Get the inputs.
		const user = this.element('user', HTMLInputElement).value;
		const password = this.element('password', HTMLInputElement).value;

		// Send the login command.
		try {
			// Try to login and get the session id.
			const session = await this.app.ws.send({
				module: 'users',
				command: 'login',
				params: {
					user,
					password
				}
			}) as string;

			// Set the cookies.
			Cookies.set('user', user, 3600 * 24 * 7);
			Cookies.set('session', session, 3600 * 24 * 7);

			// Update the route.
			const prevPage = this.app.router.getValue('prevPage');
			this.app.router.replaceQuery({
				page: prevPage !== undefined ? prevPage : '',
				prevPage: ''
			}, true);
			location.reload();
		}
		catch (error) {
			this.showMessage((error as Error).message + '');
		}
		this.element('submit', HTMLButtonElement).disabled = false;
	}

	/** Shows a message below the form. */
	showMessage(message: string): void {
		this.element('message', HTMLParagraphElement).innerHTML = message;
	}
}

LoginPage.html = /* html */`
	<div>
		<h1>Please Login</h1>
		<p><label for="username">Username:</label><input id="user" type="text"></input></p>
		<p><label for="password">Password:</label><input id="password" type="password"></input></p>
		<p><button id="submit" onclick="_login">Login</button></p>
		<p id="message"></p>
	</div>
	`;

LoginPage.css = /* css */`
	.LoginPage {
		width: 100%;
		max-width: 15rem;
		margin: 0 auto;
	}
	.LoginPage label {
		width: 5rem;
	}
	.LoginPage input {
		width: calc(100% - 5rem);
	}
	.LoginPage #submit {
		width: 100%;
	}
	.LoginPage #message:empty {
		opacity: 0;
	}
	.LoginPage #message {
		opacity: 1;
		transition: opacity .125s;
	}
	`;

LoginPage.register();
