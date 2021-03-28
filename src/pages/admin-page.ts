import { Page } from 'page';
import { Component } from 'elm-app';

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
			command: 'listUsersAdmin'
		}) as string[];
		this.element('user-list', HTMLUListElement).innerHTML = '';
		for (const user of users) {
			this.insertHtml(this.element('user-list', HTMLUListElement), null, `<li>${user}</li>`);
		}
	}

	private async _changePassword(): Promise<void> {
		// Get the inputs.
		const user = this.element('change-password-user', HTMLInputElement).value;
		const newPassword = this.element('change-password-new-password', HTMLInputElement).value;

		// Clear the message and disable the submit button.
		this.element('change-password-message', HTMLParagraphElement).innerHTML = '';
		this.element('change-password-submit', HTMLButtonElement).disabled = true;

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
			this.element('change-password-message', HTMLParagraphElement).innerHTML = 'The password has been changed.';

			// Clear the form.
			this.element('change-password-user', HTMLInputElement).value = '';
			this.element('change-password-new-password', HTMLInputElement).value = '';
		}
		catch (error) {
			this.element('change-password-message', HTMLParagraphElement).innerHTML = (error as Error).message + '';
		}
		this.element('change-password-submit', HTMLButtonElement).disabled = false;
	}

	private async _createUser(): Promise<void> {
		// Get the inputs.
		const user = this.element('create-user-user', HTMLInputElement).value;
		const password = this.element('create-user-password', HTMLInputElement).value;
		const groups = this.element('create-user-groups', HTMLInputElement).value.split(',');

		// Trim the groups.
		for (let i = 0; i < groups.length; i++) {
			groups[i] = groups[i].trim();
		}

		// Clear the message and disable the submit button.
		this.element('create-user-message', HTMLParagraphElement).innerHTML = '';
		this.element('create-user-submit', HTMLButtonElement).disabled = true;

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
			this.element('create-user-message', HTMLParagraphElement).innerHTML = 'The user has been created.';

			// Clear the form.
			this.element('create-user-user', HTMLInputElement).value = '';
			this.element('create-user-password', HTMLInputElement).value = '';
			this.element('create-user-groups', HTMLInputElement).value = '';

			// Update the list of users.
			await this._getUserList();
		}
		catch (error) {
			this.element('create-user-message', HTMLParagraphElement).innerHTML = (error as Error).message + '';
		}
		this.element('create-user-submit', HTMLButtonElement).disabled = false;
	}

	private async _deleteUser(): Promise<void> {
		// Get the inputs.
		const user = this.element('delete-user-user', HTMLInputElement).value;
		const verify = this.element('delete-user-verify', HTMLInputElement).value;

		if (verify !== 'DELETE') {
			this.element('delete-user-message', HTMLParagraphElement).innerHTML = 'Please enter DELETE to confirm.';
			return;
		}

		// Clear the message and disable the login button.
		this.element('delete-user-message', HTMLParagraphElement).innerHTML = '';
		this.element('delete-user-submit', HTMLButtonElement).disabled = true;

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
			this.element('delete-user-message', HTMLParagraphElement).innerHTML = 'The user account has been deleted.';

			// Clear the form.
			this.element('delete-user-user', HTMLInputElement).value = '';
			this.element('delete-user-verify', HTMLInputElement).value = '';

			// Update the list of users.
			await this._getUserList();
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

AdminPage.html = /* html */`
	<div>
		<div class="section">
			<h1>List of Users</h1>
			<ul id="user-list">
			</ul>
		</div>
		<div class="section">
			<h1>Change A User's Password</h1>
			<p><label for="change-password-user">User:</label><input id="change-password-user" type="text"></input></p>
			<p><label for="change-password-new-password">Password:</label><input id="change-password-new-password" type="password"></input></p>
			<p><button id="change-password-submit" class="submit" onclick="_changePassword">Change Password</button></p>
			<p id="change-password-message"></p>
		</div>
		<div class="section">
			<h1>Create A New User</h1>
			<p><label for="create-user-user">User:</label><input id="create-user-user" type="text"></input></p>
			<p><label for="create-user-password">Password:</label><input id="create-user-password" type="password"></input></p>
			<p><label for="create-user-groups">Groups:</label><input id="create-user-groups" type="text"></input></p>
			<p><button id="create-user-submit" class="submit" onclick="_createUser">Create User</button></p>
			<p id="create-user-message"></p>
		</div>
		<div class="section">
			<h1>Delete A User's Account</h1>
			<p>NOTE: ALL INFORMATION WILL BE PERMANENTLY DELETED!</p>
			<p><label for="delete-user-user">User:</label><input id="delete-user-user" type="text"></input></p>
			<p><label for="delete-user-verify">Type DELETE:</label><input id="delete-user-verify" type="text"></input></p>
			<p><button id="delete-user-submit" class="submit" onclick="_deleteUser">Delete Account</button></p>
			<p id="delete-user-message"></p>
		</div>
	</div>
	`;

AdminPage.css = /* css */`
	.AdminPage {
		width: 100%;
		max-width: 20rem;
		margin: 0 auto;
	}
	.AdminPage .section {
		margin-top: 2rem;
	}
	.AdminPage .section:first-child {
		margin-top: 0;
	}
	.AdminPage label {
		width: 7rem;
	}
	.AdminPage input {
		width: calc(100% - 7rem);
	}
	.AdminPage .submit {
		width: 100%;
	}
	.AdminPage #message:empty {
		opacity: 0;
	}
	.AdminPage #message {
		opacity: 1;
		transition: opacity .125s;
	}
`;

AdminPage.register();
