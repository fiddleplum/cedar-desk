import { Page } from 'page';
import { Component, ElmForm } from 'elm-app';

export class AdminPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Admin');

		// Get the list of users.
		await this._getUserList();
	}

	/** Gets the list of users. */
	private async _getUserList(): Promise<void> {
		// Get the list of users.
		const users = await this.app.ws.send({
			module: 'users',
			command: 'listUsers'
		}) as string[];
		const userListElem = this.query('.user-list', HTMLUListElement)!;
		userListElem.innerHTML = '';
		for (const user of users) {
			this.insertHtml(`<li>${user}</li>`, userListElem, undefined);
		}
	}

	private async _changePassword(): Promise<void> {
		// Get the inputs.
		const form = this.component('change-password-form', ElmForm);
		const values = form.getValues();
		const user = values.get('user');
		const newPassword = values.get('newPassword');

		// Clear the message and disable the submit button.
		form.setMessage('');
		form.setEnabled(false);

		try {
			// Send the command.
			await this.app.ws.send({
				module: 'users',
				command: 'changePasswordAdmin',
				params: {
					user,
					newPassword
				}
			}) as string;

			// Print a message.
			form.setMessage('The password has been changed.');

			// Clear the form.
			form.setValues(new Map(Object.entries({
				user: '',
				newPassword: ''
			})));
		}
		catch (error) {
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}

	private async _createUser(): Promise<void> {
		// Get the inputs.
		const form = this.component('create-user-form', ElmForm);
		const values = form.getValues();
		const user = values.get('user');
		const password = values.get('password');
		const groups = (values.get('groups') as string).split(',');

		// Trim the groups.
		for (let i = 0; i < groups.length; i++) {
			groups[i] = groups[i].trim();
		}

		// Clear the message and disable the submit button.
		form.setMessage('');
		form.setEnabled(false);

		try {
			// Send the command.
			await this.app.ws.send({
				module: 'users',
				command: 'createUserAdmin',
				params: {
					user,
					password,
					groups
				}
			});

			// Print a message.
			form.setMessage('The user has been created.');

			// Clear the form.
			form.setValues(new Map(Object.entries({
				user: '',
				password: '',
				groups: ''
			})));

			// Update the list of users.
			await this._getUserList();
		}
		catch (error) {
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}

	private async _deleteUser(): Promise<void> {
		// Get the inputs.
		const form = this.component('delete-user-form', ElmForm);
		const values = form.getValues();
		const user = values.get('user');
		const verify = values.get('verify');

		if (verify !== 'DELETE') {
			form.setMessage('Please enter DELETE to confirm.');
			return;
		}

		// Clear the message and disable the submit button.
		form.setMessage('');
		form.setEnabled(false);

		try {
			// Send the command.
			await this.app.ws.send({
				module: 'users',
				command: 'deleteUserAdmin',
				params: {
					user
				}
			}) as string;

			// Print a message.
			form.setMessage('The user account has been deleted.');

			// Clear the form.
			form.setValues(new Map(Object.entries({
				user: '',
				verify: ''
			})));

			// Update the list of users.
			await this._getUserList();
		}
		catch (error) {
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}

	private _goToApp(component: Component): void {
		this.app.router.pushQuery({
			page: component.id
		}, false);
	}
}

AdminPage.html = /* html */`
	<div>
		<section>
			<h1>List of Users</h1>
			<ul class="user-list">
			</ul>
		</section>
		<section>
			<h1>Change A User's Password</h1>
			<ElmForm id="change-password-form">
				<entry name="user" type="text" width="8rem">User</entry>
				<entry name="newPassword" type="password" width="8rem">New Password</entry>
				<entry name="submit" type="submit" action="_changePassword">Change Password</entry>
			</ElmForm>
		</section>
		<section>
			<h1>Create A New User</h1>
			<ElmForm id="create-user-form">
				<entry name="user" type="text" width="8rem">User</entry>
				<entry name="password" type="password" width="8rem">Password</entry>
				<entry name="groups" type="text" width="12rem">Groups (comma separated)</entry>
				<entry name="submit" type="submit" action="_createUser">Create User</entry>
			</ElmForm>
		</section>
		<section>
			<h1>Delete A User's Account</h1>
			<p>NOTE: ALL INFORMATION WILL BE PERMANENTLY DELETED!</p>
			<ElmForm id="delete-user-form">
				<entry name="user" type="text" width="8rem">User</entry>
				<entry name="verify" type="text" width="8rem">Type DELETE to verify that you want to delete the account.</entry>
				<entry name="submit" type="submit" action="_deleteUser">Delete Account</entry>
			</ElmForm>
		</section>
	</div>
	`;

AdminPage.css = /* css */`
	.AdminPage {
		padding: .25rem;
	}
`;

AdminPage.register();
