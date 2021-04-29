import { Page } from 'page';
import { Cookies, ElmForm } from 'elm-app';

export class LoginPage extends Page {
	private async _login(): Promise<void> {
		// Get the form.
		const form = this.component('form', ElmForm);

		// Clear the message and disable the login button.
		form.setMessage('');
		form.setEnabled(false);

		const values = form.getValues();

		// Get the inputs.
		const user = values.get('user') as string;
		const password = values.get('password') as string;

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
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}
}

LoginPage.html = /* html */`
	<div>
		<ElmForm id="form">
			<h1>Please Login</h1>
			<p>Username:</p>
			<entry name="user" type="text" width="8rem;"></entry>
			<p>Password:</p>
			<entry name="password" type="password" width="8rem;"></entry>
			<entry name="submit" type="submit" action="_login">Login</entry>
		</ElmForm>
		<p class="message"></p>
	</div>
	`;

LoginPage.css = /* css */`
	.LoginPage .message:empty {
		opacity: 0;
	}
	.LoginPage .message {
		opacity: 1;
		transition: opacity .125s;
	}
	`;

LoginPage.register();
