import { Page } from 'page';
import { Component } from 'elm-app';

export class UserSettingsPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('User Settings');
	}

	private async _changePassword(): Promise<void> {
		// Get the inputs.
		const oldPassword = this.element('old-password', HTMLInputElement).value;
		const newPassword = this.element('new-password', HTMLInputElement).value;
		const newPasswordAgain = this.element('new-password-again', HTMLInputElement).value;

		if (newPassword !== newPasswordAgain) {
			this.element('change-password-message', HTMLParagraphElement).innerHTML = 'Your new password and retyped password do not match.';
			return;
		}

		// Clear the message and disable the login button.
		this.element('change-password-message', HTMLParagraphElement).innerHTML = '';
		this.element('change-password-submit', HTMLButtonElement).disabled = true;

		try {
			// Send the changePassword command.
			await this.app.ws.send({
				module: 'users',
				command: 'changePassword',
				params: {
					oldPassword,
					newPassword
				}
			}) as string;

			// Print a message.
			this.element('change-password-message', HTMLParagraphElement).innerHTML = 'Your password has been changed.';

			// Clear the form.
			this.element('old-password', HTMLInputElement).value = '';
			this.element('new-password', HTMLInputElement).value = '';
			this.element('new-password-again', HTMLInputElement).value = '';
		}
		catch (error) {
			this.element('change-password-message', HTMLParagraphElement).innerHTML = (error as Error).message + '';
		}
		this.element('change-password-submit', HTMLButtonElement).disabled = false;
	}

	private async _deleteUser(): Promise<void> {
		// Get the inputs.
		const password = this.element('password', HTMLInputElement).value;
		const verify = this.element('verify', HTMLInputElement).value;

		if (verify !== 'DELETE') {
			this.element('delete-user-message', HTMLParagraphElement).innerHTML = 'Please enter DELETE to confirm.';
			return;
		}

		// Clear the message and disable the login button.
		this.element('delete-user-message', HTMLParagraphElement).innerHTML = '';
		this.element('delete-user-submit', HTMLButtonElement).disabled = true;

		try {
			// Send the changePassword command.
			await this.app.ws.send({
				module: 'users',
				command: 'deleteUser',
				params: {
					password
				}
			}) as string;

			// Reload the screen, which will send the user the the login screen,
			// since no valid user is logged in.
			location.reload();
		}
		catch (error) {
			this.element('delete-user-message', HTMLParagraphElement).innerHTML = (error as Error).message + '';
		}
		this.element('delete-user-submit', HTMLButtonElement).disabled = false;
	}

	private _goToApp(component: Component): void {
		this.app.router.pushQuery({
			page: component.id
		}, false);
	}
}

UserSettingsPage.html = /* html */`
	<div>
		<div class="section">
			<h1>Change Your Password</h1>
			<p><label for="old-password">Old Password:</label><input id="old-password" name="old-password" type="password"></input></p>
			<p><label for="new-password">New Password:</label><input id="new-password" name="new-password" type="password"></input></p>
			<p><label for="new-password-again">Enter It Again:</label><input id="new-password-again" name="new-password-again" type="password"></input></p>
			<p><button id="change-password-submit" class="submit" onclick="_changePassword">Change Password</button></p>
			<p id="change-password-message"></p>
		</div>
		<div class="section">
			<h1>Delete Your Account</h1>
			<p>NOTE: ALL INFORMATION WILL BE PERMANENTLY DELETED!</p>
			<p><label for="password">Password:</label><input id="password" name="password" type="password"></input></p>
			<p><label for="verify">Type DELETE:</label><input id="verify" name="verify" type="text"></input></p>
			<p><button id="delete-user-submit" class="submit" onclick="_deleteUser">Delete Account</button></p>
			<p id="delete-user-message"></p>
		</div>
	</div>
	`;

UserSettingsPage.css = /* css */`
	.UserSettingsPage {
		width: 100%;
		max-width: 20rem;
		margin: 0 auto;
	}
	.UserSettingsPage .section {
		margin-top: 2rem;
	}
	.UserSettingsPage .section:first-child {
		margin-top: 0;
	}
	.UserSettingsPage label {
		width: 7rem;
	}
	.UserSettingsPage input {
		width: calc(100% - 7rem);
	}
	.UserSettingsPage .submit {
		width: 100%;
	}
	.UserSettingsPage #message:empty {
		opacity: 0;
	}
	.UserSettingsPage #message {
		opacity: 1;
		transition: opacity .125s;
	}
`;

UserSettingsPage.register();
