import { ShowHide, DragList, ElmForm } from 'elm-app';
import { Page } from 'page';
import { CheckListListData, CheckListData } from 'types/check-list';

export class CheckListPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Check-Lists');

		// Populate the check-list list.
		this._populateCheckListList();
	}

	private _populateCheckListList(): void {
		// Get the check-list list.
		this.app.ws.send({
			module: 'check-list',
			command: 'listCheckLists'
		}).then((checkListListData: CheckListListData) => {
			// Add the HTML as a draggable list.
			let html = '<DragList onAfterRelease="_onDragListAfterRelease">';
			for (const checkListListItem of checkListListData) {
				html += /* html */`
					<div data-id="${checkListListItem.id}">
						<button class="grab icon"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
						<button class="list" onclick="_viewCheckList|${checkListListItem.id}">${checkListListItem.title}</button>
						<button class="delete icon" onclick="_openRemoveCheckListPanel|${checkListListItem.id}"><icon src="assets/icons/close.svg" alt="delete"></icon></button>
					</div>`;
			}
			html += '</DragList>';
			const checkListsElem = this.query('.check-lists', Element)!;
			this.setHtml(html, checkListsElem, this);
		});
	}

	/** Called when the drag list of check-lists has reinserted a list item. */
	private _onDragListAfterRelease(_dragList: DragList, _event: string, elem: HTMLElement, before: HTMLElement | undefined, _changed: boolean): void {
		this.app.ws.send({
			module: 'check-list',
			command: 'reinsertCheckList',
			params: {
				id: elem.getAttribute('data-id')!,
				beforeId: before !== undefined ? before.getAttribute('data-id')! : undefined
			}
		});
	}

	/** Opens a panel. */
	private _openAddCheckListPanel(): void {
		// Get the shared users.
		this.app.ws.send({
			module: 'users',
			command: 'listUsers'
		}).then((users: string[]) => {
			// Get the panel.
			const panel = this.query(`.add-check-list-panel`, HTMLElement)!;
			// Show the panel.
			ShowHide.show(panel);
			// Setup the shared users elements.
			const form = this.component('add-check-list-form', ElmForm);
			for (const user of users) {
				form.insertEntries(`<entry name="user-${user}" type="toggle">${user}</entry>`, 'submit');
			}
		});
	}

	private _openRemoveCheckListPanel(id: string): void {
		this.app.ws.send({
			module: 'check-list',
			command: 'getCheckList',
			params: {
				id: id
			}
		}).then((checkListData: CheckListData) => {
			// Get the panel.
			const panel = this.query('.remove-check-list-panel', HTMLElement)!;
			// Show the panel.
			ShowHide.show(panel);
			// Set the check-list title.
			const titleElem = panel.querySelector('.title')!;
			titleElem.innerHTML = checkListData.title;
			// Set the check-list id.
			const idElem = panel.querySelector('.id') as HTMLInputElement;
			idElem.value = id;
			// Toggle the permanently delete message, if needed.
			const warning = panel.querySelector('.warning') as HTMLElement;
			if (checkListData.users.length === 1) {
				warning.style.display = 'block';
			}
			else {
				warning.style.display = 'none';
			}
		});
	}

	private _viewCheckList(id: string): void {
		this.app.router.pushQuery({
			page: 'check-list-edit',
			id: id
		}, true);
	}

	/** Closes a panel. */
	private _closePanel(className: string): void {
		ShowHide.hide(this.query(`.${className}`, HTMLElement)!);
	}

	private _toggleEditCheckListButtons(): void {
		const buttons = this.root.querySelectorAll('.grab, .delete') as NodeListOf<HTMLButtonElement>;
		for (const button of buttons) {
			button.style.display = button.style.display === 'block' ? 'none' : 'block';
		}
	}

	private async _addCheckList(): Promise<void> {
		// Get the inputs.
		const form = this.component('add-check-list-form', ElmForm);
		const values = form.getValues();
		const title = values.get('title') as string;
		const removeOnCheck = values.get('removeOnCheck') as string;
		const users: string[] = [];
		for (const [name, value] of values) {
			if (name.startsWith('user-') && value === true) {
				users.push(name.substring('user-'.length));
			}
		}

		// Clear the message and disable the submit button.
		form.setMessage('');
		form.setEnabled(false);

		try {
			// Send the command.
			await this.app.ws.send({
				module: 'check-list',
				command: 'addCheckList',
				params: {
					title: title,
					removeOnCheck: removeOnCheck === 'yes',
					users: users
				}
			});

			this._closePanel('add-check-list-panel');
			this._populateCheckListList();
		}
		catch (error) {
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}

	private async _removeCheckList(): Promise<void> {
		// Get the inputs.
		const form = this.component('add-check-list-form', ElmForm);
		const values = form.getValues();
		const id = values.get('id') as string;

		// Clear the message and disable the submit button.
		form.setMessage('');
		form.setEnabled(false);

		try {
			// Send the command.
			await this.app.ws.send({
				module: 'check-list',
				command: 'removeCheckList',
				params: {
					id: id
				}
			});

			this._closePanel('remove-check-list-panel');
			this._populateCheckListList();
		}
		catch (error) {
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}
}

CheckListPage.html = /* html */`
	<div>
		<section class="check-lists">
		</section>
		<div class="toolbar">
			<button onclick="_toggleEditCheckListButtons"><icon src="assets/icons/wrench.svg" alt="Edit check-list list"></icon></button>
			<button onclick="_openAddCheckListPanel"><icon src="assets/icons/plus.svg" alt="Add check list"></icon></button>
		</div>
		<div class="add-check-list-panel panel" style="display: none;">
			<button class="close icon" onclick="_closePanel|add-check-list-panel"><icon src="assets/icons/close.svg" alt="Close"></icon></button>
			<h1>New Check-List</h1>
			<ElmForm id="add-check-list-form">
				<entry name="title" type="text" width="10rem">Title</entry>
				<p>Should checking an item remove it?</p>
				<entry name="removeOnCheck" type="choice">
					<choice value="no">No</choice>
					<choice value="yes">Yes</choice>
				</entry>
				<p>Shared Users</p>
				<entry name="submit" type="submit" action="_addCheckList">Create</entry>
			</ElmForm>
		</div>
		<div class="remove-check-list-panel panel" style="display: none;">
			<button class="close icon" onclick="_closePanel|remove-check-list-panel"><icon src="assets/icons/close.svg" alt="Close"></icon></button>
			<h1>Remove</h1>
			<ElmForm id="remove-check-list-form">
				<input class="id" name="id" type="text" style="display: none;"></input>
				<p>Are you sure you want to remove this check-list?</p>
				<p class="title" style="font-weight: bold;"></p>
				<p class="warning" style="display: none;">This check-list is shared with no one else and so it will be permanently deleted.</p>
				<entry name="submit" type="submit" action="_removeCheckList">Remove</entry>
			</ElmForm>
		</div>
	</div>
	`;

CheckListPage.css = /* css */`
	.CheckListPage {
		display: grid;
		grid-template-rows: 1fr 2.5rem;
		height: 100%;
	}
	.CheckListPage section {
		margin: .25rem;
		overflow-y: auto;
	}
	.CheckListPage .DragList {
		height: 100%;
	}
	.CheckListPage .check-lists div {
		margin-bottom: .25rem;
		text-align: center;
		line-height: 2rem;
	}
	.CheckListPage .check-lists div > button.grab {
		float: left;
		display: none;
	}
	.CheckListPage .check-lists div > button.delete {
		float: right;
		display: none;
	}
	.CheckListPage .toolbar {
		background: var(--color1);
		color: var(--color4);
		fill: var(--color4);
		text-align: right;
		padding: .25rem;
	}
	.CheckListPage .toolbar button {
		margin-right: .25rem;
		width: 2rem;
		height: 2rem;
		padding: 0;
	}
	.CheckListPage .toolbar button:last-child {
		margin-right: 0;
	}
	.CheckListPage .toolbar button:active {
		background: var(--color3);
	}
	.CheckListPage .panel button.close {
		float: right;
	}
	`;

CheckListPage.register();
