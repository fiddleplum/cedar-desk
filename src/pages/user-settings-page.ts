import { Page } from 'page';
import { Component, ElmForm } from 'elm-app';

export class UserSettingsPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('User Settings');
	}

	private async _changePassword(): Promise<void> {
		// Get the inputs.
		const form = this.component('change-password-form', ElmForm);
		const values = form.getValues();
		const oldPassword = values.get('old-password');
		const newPassword = values.get('new-password');
		const newPasswordAgain = values.get('new-password-again');

		// Check if the new passwords match.
		if (newPassword !== newPasswordAgain) {
			form.setMessage('Your new password and retyped password do not match.');
			return;
		}

		// Clear the message and disable the form.
		form.setMessage('');
		form.setEnabled(false);

		// Send the command.
		try {
			await this.app.ws.send({
				module: 'users',
				command: 'changePassword',
				params: {
					oldPassword,
					newPassword
				}
			}) as string;

			// Print a message.
			form.setMessage('Your password has been changed.');

			// Clear the form.
			form.setValues(new Map(Object.entries({
				'old-password': '',
				'new-password': '',
				'new-password-again': ''
			})));
		}
		catch (error) {
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}

	private async _deleteUser(): Promise<void> {
		// Get the inputs.
		const form = this.component('delete-account-form', ElmForm);
		const values = form.getValues();
		const password = values.get('password');
		const verify = values.get('verify');

		// Verify that DELETE was input.
		if (verify !== 'DELETE') {
			form.setMessage('Please enter DELETE to confirm.');
			return;
		}

		// Clear the message and disable the submit button.
		form.setMessage('');
		form.setEnabled(false);

		// Send the command.
		try {
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
			form.setMessage((error as Error).message + '');
			form.setEnabled(true);
		}
	}

	private _goToApp(component: Component): void {
		this.app.router.pushQuery({
			page: component.id
		}, false);
	}
}

UserSettingsPage.html = /* html */`
	<div>
		<h1>Change Your Password</h1>
		<ElmForm id="change-password-form">
			<p>Old Password:</p>
			<entry name="old-password" type="password" width="8rem"></entry>
			<p>New Password:</p>
			<entry name="new-password" type="password" width="8rem"></entry>
			<p>Enter It Again:</p>
			<entry name="new-password-again" type="password" width="8rem"></entry>
			<entry type="submit" action="_changePassword">Change Password</entry>
		</ElmForm>
		<h1>Delete Your Account</h1>
		<p>NOTE: ALL INFORMATION WILL BE PERMANENTLY DELETED!</p>
		<ElmForm id="delete-account-form">
			<p>Password:</p>
			<entry name="password" type="password" width="8rem"></entry>
			<p>Type DELETE to verify that you want to delete your account.</p>
			<entry name="verify" type="text" width="8rem"></entry>
			<entry type="submit" action="_deleteUser">Delete Account</entry>
		</ElmForm>
	</div>
	`;

UserSettingsPage.css = /* css */`
	.UserSettingsPage {
		padding: .5rem;
	}
`;

UserSettingsPage.register();
